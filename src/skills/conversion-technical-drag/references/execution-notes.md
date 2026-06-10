# Execution notes — Noibu MCP wrapper constraints, subagent pattern, measured costs

Operational knowledge from live runs (2026-06), covering only what `querying-noibu-data` doesn't document. The MCP evolves — re-verify on failure rather than assuming permanence — but each item below cost a failed round-trip (~2–3k tokens) to discover, so check here first.

## Wrapper constraints (empirically verified 2026-06-09)

- `COUNT_DISTINCT` is documented in the tool description but **rejected** by the API (`ExplorationsMeasureFunction` validation error). Verified working: `COUNT`, `SUM`, `MEDIAN`, `QUANTILE_75` (not exhaustive — the routing skill's page-visits reference also documents `QUANTILES`). Consequence: no session-level dedup at page grain — use visit-weighted conversion (`SUM(CHECKOUT_COMPLETED) / COUNT(PAGE_VISIT_ID)`) and say so.
- `orderBy` placement and row caps are as `querying-noibu-data` documents (REQUIRED, inside `queryInput` alongside `measures`/`groupBy`/`filters`/`limit`; 100 session / 1500 page-visit rows). The undocumented consequence: without an effective `orderBy`, any result with `hasMore: true` is an arbitrary row subset — never treat a truncated grouped result as a top-N ranking; verify candidate URLs against a known list. (The 2026-06-09 runs hit a legacy surface — top-level string-typed `measures`/`filters`, `flatLimit` max 100, no `orderBy`; if a server rejects `queryInput`, you're on that surface and every truncated result is arbitrary.)
- Filter `fieldName`s beyond the documented list work: `VISUAL_ERROR_COUNT` and `LCP` filter correctly (e.g. `LCP GREATER_THAN "4000"`, comparison values as strings). `ERROR_COUNT` does **not** exist — there is no queryable per-visit JS/HTTP error flag; the error cohort must be triangulated (see occurrence cross-check below).
- Null-LCP visits are pervasive: 27–44% of visits on every PDP measured, uniform across pages — a platform-level instrumentation artifact (cached loads, back-nav, bots), not a per-page signal. This is why the aggressive sensitivity case overstates the technical picture rather than being a co-equal estimate — and it is not even a guaranteed upper bound: a null cohort that out-converts clean (cached loads, back-nav by purchasers) contributes a negative term and drops the "aggressive" case below the conservative one (methodology §4).
- **`URL IS_ANY_OF [...paths]` validates — always batch multi-page sweeps.** One grouped query covers N pages (groupBy URL); 4 queries (baseline / poor-LCP / errors / device-split) covered 10 PDPs vs 30–40 calls under the per-page pattern. The verbose measures/filters JSON is the dominant request cost and is repeated verbatim per call; measured: calls ~6× down (32→5), result tokens ~2× down, end-to-end 45.5k→37.4k tokens for the same 10 pages, with request-side savings larger still.
- More working surface beyond the tool description's field list: `INP` filters (`GREATER_THAN "500"`); `SESSION_UTM_SOURCE` as groupBy (traffic-quality splits; also documented in the routing skill's page-visits reference); multi-field groupBy (`"BROWSER,DEVICE_TYPE"`, `"URL,DEVICE_TYPE"`).
- **Zero-count groups are silently dropped** from grouped results (an error-cohort query over 10 URLs returned 1 row, not 10). Impute zeros for missing groups — absence means zero, not no-data.
- **`PREDEFINED` CVR measure is unreliable in grouped queries with URL filters.** `{"predefined":{"measure":"CONVERSION_RATE",...}}` returns 0% for all cohorts on some pages when the query combines a URL equality filter with `groupBy` (e.g. `groupBy: "OS"` + `filters: URL EQUALS "/products/x"`). The failure is silent — valid-looking rows come back with 0 conversion everywhere, even for pages with confirmed non-zero CVR. **Always use aggregate measures instead:** `SUM(CHECKOUT_COMPLETED)` + `COUNT(PAGE_VISIT_ID)` as two separate entries in `measures`, then compute the rate in Python. Observed on roughly half of runs; other pages succeeded with the identical pattern — page/data-dependent, not universal.
- **URL variants — use CONTAINS on the slug/SKU fragment, not EQUALS.** PDPs surface under multiple paths (`/products/<slug>`, `/collections/<name>/products/<slug>`, locale prefixes like `/es/…`). `URL EQUALS "/products/<slug>"` silently undercounts a page's traffic and can hide variant-specific defects (product-analysis interprets "high errors on one URL variant" as a possible ATC-blocking JS error). Runs that used EQUALS produced lower-bound visit counts; filter `URL CONTAINS "<slug-fragment>"` and report the variant breakdown.
- **CONTAINS vs IS_ANY_OF — resolution rule** (they are mutually exclusive in one query): **sweeps batch with `IS_ANY_OF` on exact paths** (accept lower-bound counts, caveat them); **the single-target deep-dive uses `CONTAINS` on the slug fragment** with a variant breakdown. Don't agonize per run — this is the policy.
- `VISUAL_ERROR_COUNT EQUALS "0"` validates (not just GREATER_THAN/LESSER_THAN) — but prefer deriving clean cohorts by subtraction anyway (methodology §3b rule 4).
- **`noibu_get_error_trends` is verbose**: daily resolution returns ~60+ rows (~2.5k tokens) per issue. You usually only need the window total for the occurrence-vs-ARL cross-check — sum it and move on; don't pull trends for more than the 1–2 issues that actually implicate the target page.

## Checkout-group runs (handoff from checkout-analysis)

Express checkout (Apple Pay / Shop Pay) bypasses the standard checkout pages — depth-4 sessions can exceed depth-3 and many converters never visit checkout URLs at all — so checkout page-visit cohorts describe the standard flow only and clean rates understate true completion. Use the checkout group's own pooled clean rates for the benchmark (never another group's), and treat session-grain funnel-depth counts as shortfall context (expected ≈ depth-2+ sessions × benchmark completion rate), never as inputs to the visit-grain loss terms.

## Occurrence-volume vs ARL cross-check

When an error's metadata appears to implicate the target page (`occurrenceDetails` naming the URL, `safari_only`/`mobile_only` insights matching the page's dominant segment), pull `noibu_get_error_trends` for the issue over the analysis window **before** weighting it in the narrative. A projection-heavy issue can be occurrence-light: one issue carried an ARL projection ≈ $146k yet occurred ~7 times in 30 days site-wide — incapable of explaining a 342-visit zero-conversion cohort. Occurrence data overrides the projection.

## Subagent execution pattern

Per-page sweeps parallelize cleanly into one general-purpose subagent. What makes it work:

1. Pass **constants in the prompt**: domain UUID, window, cross-page segment baselines, group clean rates, and the full wrapper-constraint list above. The agent should never re-derive or re-discover these. Have it read the `querying-noibu-data` skill before querying.
2. Fixed query plan per page — 3 queries (baseline / poor-perf / errors) for the quick variant, 4 (+ measured-clean, deriving null-LCP by subtraction) for the full sensitivity variant. Pre-supply the URL list.
3. **All arithmetic in Python via bash**, per the skill principle. The agent returns one compact table, not raw rows.

Measured costs (Sonnet subagent):

| Run | Pages | Queries/page | Tool calls | Tokens | Duration | Tokens/page |
|---|---|---|---|---|---|---|
| Per-page sweep (3 queries/page) | 10 | 3 | 32 | 45,499 | 3.8 min | ~4,550 |
| Full validation (4-cohort, dual denominators, per-page) | 20 | 4 | 82 | 84,651 | 8.8 min | ~4,233 |
| Replication sweep (**IS_ANY_OF batched**) | 10 | 0.4 (4 total) | 5 | 37,393 | 2.7 min | ~3,740 all-in, **~155 result-tokens/page** |

Raw data returned is only ~1–2.5k chars/page; >90% of token cost is protocol overhead (per-call boilerplate + reasoning). **Batching with `URL IS_ANY_OF` is now the mandatory pattern** — measured ~6× fewer calls and ~2× fewer result tokens, with request-side savings larger still. A server-side cohort-matrix MCP endpoint (N URLs → per URL×device×browser cohort cells in one call, ~30–50 tokens/page) remains the ask for 100-page sweeps; until it exists, batched-subagent is the cost floor.
