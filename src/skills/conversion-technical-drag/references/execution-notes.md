# Execution notes — Noibu MCP wrapper constraints, subagent pattern, measured costs

Operational knowledge from live runs (2026-06), covering only what `querying-noibu-data` doesn't document. The MCP evolves — re-verify on failure rather than assuming permanence — but each item below cost a failed round-trip (~2–3k tokens) to discover, so check here first.

## Wrapper constraints (empirically verified 2026-06-09)

- Filter `fieldName`s beyond the documented list work: `VISUAL_ERROR_COUNT` and `LCP` filter correctly (e.g. `LCP GREATER_THAN "4000"`, comparison values as strings). `ERROR_COUNT` does **not** exist — there is no queryable per-visit JS/HTTP error flag; the error cohort must be triangulated (see occurrence cross-check below).
- Null-LCP visits are pervasive: 27–44% of visits on every PDP measured, uniform across pages — a platform-level instrumentation artifact (cached loads, back-nav, bots), not a per-page signal. This is why the aggressive sensitivity case overstates the technical picture rather than being a co-equal estimate — and it is not even a guaranteed upper bound: a null cohort that out-converts clean (cached loads, back-nav by purchasers) contributes a negative term and drops the "aggressive" case below the conservative one (methodology §4).
- **`URL IS_ANY_OF [...paths]` validates — always batch multi-page sweeps.** One grouped query covers N pages (groupBy URL); 4 queries (baseline / poor-LCP / errors / device-split) covered 10 PDPs vs 30–40 calls under the per-page pattern. The verbose measures/filters JSON is the dominant request cost and is repeated verbatim per call; measured: calls ~6× down (32→5), result tokens ~2× down, end-to-end 45.5k→37.4k tokens for the same 10 pages, with request-side savings larger still.
- More working surface beyond the tool description's field list: `INP` filters (`GREATER_THAN "500"`); `SESSION_UTM_SOURCE` as groupBy (traffic-quality splits; also documented in the routing skill's page-visits reference); multi-field groupBy (`"BROWSER,DEVICE_TYPE"`, `"URL,DEVICE_TYPE"`).
- **Zero-count groups are silently dropped** from grouped results (an error-cohort query over 10 URLs returned 1 row, not 10). Impute zeros for missing groups — absence means zero, not no-data.
- **URL variants — use CONTAINS on the slug/SKU fragment, not EQUALS.** PDPs surface under multiple paths (`/products/<slug>`, `/collections/<name>/products/<slug>`, locale prefixes like `/es/…`). `URL EQUALS "/products/<slug>"` silently undercounts a page's traffic and can hide variant-specific defects (product-analysis interprets "high errors on one URL variant" as a possible ATC-blocking JS error). Runs that used EQUALS produced lower-bound visit counts; filter `URL CONTAINS "<slug-fragment>"` and report the variant breakdown.
- **CONTAINS vs IS_ANY_OF — resolution rule** (each filter entry takes one operator; mixing operators across filters in one query is allowed): **sweeps batch with `IS_ANY_OF` on exact paths** (accept lower-bound counts, caveat them); **the single-target deep-dive uses `CONTAINS` on the slug fragment** with a variant breakdown. Don't agonize per run — this is the policy.
- `VISUAL_ERROR_COUNT EQUALS "0"` validates (not just GREATER_THAN/LESSER_THAN) — but prefer deriving clean cohorts by subtraction anyway (methodology §3b rule 4).
- **`noibu_get_error_trends` is verbose**: it has no resolution knob — the server buckets by `timePeriod` and returns one row per issue per interval (a month-long window is many rows, ~2.5k tokens/issue). You usually only need the window total for the occurrence-vs-ARL cross-check — sum it and move on; don't pull trends for more than the 1–2 issues that actually implicate the target page.

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

Raw data returned is only ~1–2.5k chars/page; >90% of token cost is protocol overhead (per-call boilerplate + reasoning).
