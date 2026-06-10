---
name: conversion-technical-drag
description: "Determine whether poor conversion on a page or page-group is driven by TECHNICAL issues (errors, slow performance) versus NON-TECHNICAL ones (price, demand, content, intent, mobile UX) by computing a conversion technical drag factor from Noibu data. Use when you want to know if poor conversion is technical or not, whether errors and performance explain a conversion gap, the technical drag factor for a page, technical vs non-technical conversion loss, or whether fixing bugs would move conversion. Do NOT use for catalog-level discovery or single-product diagnostics ('which products underperform', 'why isn't my polo converting' → product-analysis; use this skill only when the question is explicitly technical vs non-technical), known tech signals needing root-cause ('why is LCP poor on X' → tech-diagnosis), or open-ended revenue hunting ('where am I losing money' → find-opportunities)."
---

# Conversion Technical Drag Analysis

Decide whether poor conversion on a Noibu page or page-group lives in what engineering can fix (errors, Core Web Vitals) or what it can't (price, demand, content, shopper intent, mobile experience). Output: a **technical drag factor (DF)** — conversion loss from technical degradation as a ratio to everything else — with interpretation and caveats. Read `references/methodology.md` before computing — this body is the workflow skeleton.

---

## Principles

- **All arithmetic in code, never by hand** — cohort sums, weighted benchmarks, and the DF ratio are error-prone mentally.
- **Compute cohorts WITHIN a segment.** Mix confounding — crediting a device-mix artifact to technical issues — is the biggest trap. Compare inside one device (ideally one browser) at a time; see Step 3.
- **Drag is conversion-weighted; severity is revenue-weighted.** A low DF can coexist with high-severity bugs worth fixing — always cross-check the error data (Step 6).
- **Report directionally, not as truth** — cohort assignment is non-random (caveat 2).
- **Be honest about sparsity** — prefer page-group or product-type grain (caveat 3) unless one page truly carries the volume.
- **Don't hardcode tool names or query shapes.** Describe the data needed; the `querying-noibu-data` routing skill maps intent to current `noibu_*` tools and field semantics. The MCP evolves.

---

## Tools

All Noibu data comes through the Noibu MCP. **Read the `querying-noibu-data` skill before issuing any query** — it owns query mechanics and field semantics; this skill doesn't restate them. In clients that defer tool schemas (Claude Code, Cowork), also load these tools by name first:

- **`noibu_get_domain`** — domain name → UUID (skip if a UUID was given; `noibu_list_domains` on a miss).
- **`noibu_get_page_visits`** — the workhorse: visits, `VISUAL_ERROR_COUNT`, `LCP` (and other vitals), `CHECKOUT_COMPLETED`, by device and browser. **Multi-page sweeps: always batch `URL IS_ANY_OF [...paths]` + `groupBy URL`** — 4 grouped queries cover N pages; never loop per page (~6–10× more calls, ~2× more result tokens; see `references/execution-notes.md`).
- **`noibu_search_sessions`** — session-level conversion and AOV for cross-checks and revenue framing.
- **`noibu_search_errors`** — browser-pinned root causes and `revLost` projections (Step 6).

The **Shopify MCP** supplies the merchandising context (price, stock, content) Noibu can't see — used in Step 7 when the verdict is non-technical.

---

## Process

Track these steps in a task/todo tool if available; otherwise proceed in order.

### Step 1 — Resolve domain and pick the target

Resolve the domain UUID. Take the page/page-group the user named, or find the worst performers: group page visits by URL with `conversions = SUM(CHECKOUT_COMPLETED)`, `visits = COUNT(PAGE_VISIT_ID)`, rank by conversion rate, take the bottom quartile **among pages with meaningful traffic** (drop near-zero-visit URLs — their rates are noise). Default window: 30 days. For "the most significant" single target, rank bottom-quartile candidates by **absolute shortfall** ≈ `visits × (group benchmark − page CVR)` — rate alone over-selects tiny pages, traffic alone mediocre ones.

### Step 2 — Define cohorts per page visit

Bucket every in-scope visit into exactly one cohort. Default "poor" LCP threshold: 4000ms (the Core Web Vitals "poor" boundary).

| Cohort | Definition |
|---|---|
| Errors | `VISUAL_ERROR_COUNT > 0` |
| Poor-perf | `VISUAL_ERROR_COUNT = 0` AND `LCP > 4000ms` |
| Clean | `VISUAL_ERROR_COUNT = 0` AND `LCP ≤ 4000ms` |
| Null-LCP | everything else — LCP unmeasured (fast bounces, instrumentation gaps) |

The technical bucket is a floor — see caveat 5; state it in every report.

**Null-LCP is ambiguous — handle it explicitly.** Report it separately and run the DF both ways — excluded from the technical bucket (conservative case) and counted as technical (aggressive case); the honest answer is the range between them.

### Step 3 — Segment before you compare (critical)

Recompute the Step 2 cohorts **inside each device** (desktop, mobile) and, volume permitting, each browser. Non-negotiable: a whole-population clean-vs-degraded comparison silently bakes in device mix. The benchmark and every Step 4 loss term are computed within-segment, then summed.

### Step 4 — Compute the technical drag factor

Benchmark `T` = best clean conversion rate, typically desktop-clean — conversion with nothing technically wrong. Summing within segments:

- **Technical loss** = Σ over degraded cohorts of `degraded_visits × (clean_rate − degraded_rate)`, using the *same-segment* clean rate.
- **Total shortfall** = `T × total_visits − total_conversions`.
- **Non-technical loss** = `total_shortfall − technical_loss`.
- **DF** = `technical_loss / non_technical_loss`. DF > 1 → technical dominates; DF < 1 → non-technical. Also report the 0–1 share `technical_loss / total_shortfall`.

Do this in code, for both null-LCP cases (Step 2). When a degraded cohort has zero conversions (common per-page), also compute the prior-smoothed loss term (methodology §5a) and report both — the raw term is then an upper-bound artifact. Apply the **normative fallback and stability rules in methodology §3b** (sparse clean cohorts, group-grain T, DF suppression on unstable denominators) — never improvise fallback rates; improvised fallbacks are the documented cause of non-reproducible per-page DFs.

### Step 5 — Interpret

State the verdict — technical-dominant, non-technical-dominant, or mixed/ambiguous (conservative and aggressive cases straddle the line) — based on the **mix-adjusted share** (methodology §3a): on a mobile-heavy store the ceiling DF is dominated by the structural device-mix gap and reads non-technical almost regardless of the page's actual state, so the ceiling number frames strategy distance, not the verdict. State the asymmetry: selection bias inflates the technical side — a non-technical verdict is robust; a technical-dominant one is a hypothesis to confirm via the tech-diagnosis handoff (methodology §3). Translate to plain language ("technical fixes recover ~3% of the gap; ~97% is something measured errors and speed don't explain").

### Step 6 — Cross-check severity (the key nuance)

A low DF does not mean "no bugs worth fixing": drag is conversion-weighted; individual bugs are revenue-weighted and can concentrate on valuable sessions. Before finalizing:

- Pull `noibu_search_errors` for the scope; review `revLost` projections and per-issue severity.
- **Check occurrence volume against the projection.** For any issue implicating the target page (URL in `occurrenceDetails`, insights matching its dominant segment), pull `noibu_get_error_trends` over the window first: a large ARL projection with a handful of occurrences cannot be a material drag contributor — occurrence data overrides the projection (`references/execution-notes.md`).
- Sanity-check per-visit penalties: clean visits typically convert ~**1.8–2.1×** poor-vitals and ~**5–9×** error visits (rough priors, not validated bands; the one pooled measurement — 1.88× measured-clean vs poor — is consistent; methodology §5). If wildly off, re-check split, segmentation, and sample size before trusting the DF — deviation prompts investigation, it isn't proof of a bug.
- Report concentrated high-severity issues alongside the DF even when non-technical dominates: "Strategy points at [non-technical lever], but issue #X still projects $Y lost on a small slice of high-intent sessions — fix it regardless."

### Step 7 — When non-technical dominates, find the lever

Name the likely lever. Use the Shopify MCP (`get-product`, `get-inventory-levels`) to check price vs comparable items, inventory/variant availability, and content/review depth — but **first verify the connected Shopify store is the analysis domain** (`get-shop-info`); if not, skip the merchandising check, say so explicitly, and hand it to the product team rather than reporting another store's catalog. Frame mobile-UX/intent/demand hypotheses from the segment splits (a large mobile share converting far below desktop implicates mobile experience or intent, not a stack trace).

Three cheap, high-signal checks from the same page-visit data:

- **Traffic-quality split:** group visits by `SESSION_UTM_SOURCE`. A large paid/social share converting at zero while direct carries all conversions is demand-quality evidence (observed: a PDP with 43% paid-social traffic and zero conversions from it).
- **Exit-rate split:** add `groupBy: "IS_EXIT_PAGE"` to the baseline query. Exit-page visits (IS_EXIT_PAGE = true) convert ~0% near-definitionally — the diagnostic signal is a high exit share with short dwell (e.g. 53% exits at 15.6s median dwell), pointing to content depth or above-the-fold UX: visitors didn't engage rather than being blocked. Pair with scroll-depth (`MAX_SCROLL_DEPTH` / `MAX_PAGE_HEIGHT`) to confirm how far exiters got.
- **Revenue framing:** pull median order value once (`noibu_search_sessions`, `MEDIAN(CHECKOUT_COMPLETE_TOTAL_VALUE)` over converted sessions); state `tech_loss × median order value` and `total_shortfall × median order value` per window — the contrast (e.g. ~$10/mo tech vs ~$5.4k/mo total on one PDP) makes the verdict land with stakeholders.

### Step 8 — Report

Lead with the verdict and DF range, then the within-segment cohort table, severity cross-check, and caveats (Step 6 + below). Report **both denominators**, labeled per their jobs (Step 5, methodology §3a). Keep it directional; if the scope was too sparse to trust, say so and recommend the next-coarser grain.

If the output feeds a persistent or live dashboard, surface the **group- or category-grain conservative DF only** — per-URL scores are direction-only and flip on single conversions.

---

## Caveats to state in every report

1. **Conversion is a whole-funnel proxy.** Page-visit-weighted `CHECKOUT_COMPLETED` attributes the *eventual* purchase back to the page visit; add-to-cart isn't available at page grain — the DF measures whole-funnel contribution, not on-page micro-conversion.
2. **Cohort assignment is non-random.** Degraded visits skew to weaker devices/networks; part of the technical cohort's lower rate is selection, not causation. The DF is directional.
3. **Sparsity kills per-page DFs.** Individual PDPs are usually too thin; prefer page-group or product-type grain. Require enough conversions in each degraded cohort, not just enough visits — two conversions tell you nothing.
4. **The null-LCP range is real uncertainty,** not a rounding artifact. Report both cases.
5. **The technical bucket is a floor, not a census.** The cohorts capture only the technical degradation observable per visit today — visual errors and slow LCP. Silent JS/HTTP failures, broken interactivity (INP), and layout shift (CLS) land in Clean, so true technical drag can run above the measured number; report the measured drag as a lower bound on the technical contribution. The Step 6 severity cross-check partially patches what the cohorts can't see. (Widening the bucket is planned.)

---

## Routing & handoffs (noibu plugin ecosystem)

This skill sits between the plugin's discovery skills and its diagnosis skill; each neighbor carries the matching half of these handoffs in its own routing notes.

**Triggers in (run drag analysis when):**

- find-opportunities surfaced an Experience/Product card and the user wants the cause investigated — drag types it tech vs non-tech before anyone hypothesizes.
- product-analysis found a page underperforming with *healthy engagement* and the question becomes "is it technical?".
- segment-analysis found a gap — technical or intrinsic to the segment? Run on the segment's highest-traffic page-group, filtered to that segment.
- checkout-analysis found priority errors on checkout pages — how much do they actually drag completion? Run at checkout page-group grain (checkout-group notes in `references/execution-notes.md`).
- The user asks the attribution question directly ("would fixing bugs move conversion?").

**Does NOT trigger (defer instead):**

- Known tech signal needing root cause ("why is LCP poor on checkout", "what's causing this error") → **tech-diagnosis**. Drag establishes *whether* a tech signal exists; tech-diagnosis explains one already in hand.
- Catalog discovery ("which products underperform", view→ATC engagement diagnosis) → **product-analysis**. Its session-grain view→ATC funnel is also the right cross-check when the drag verdict is non-technical.
- Open-ended revenue hunting → **find-opportunities**.

**Hands off out:**

- Verdict tech-dominant, or Step 6 finds concentrated high-severity issues → **tech-diagnosis** with its structured handoff context: domain UUID, page/page-group, window, segment, and the behavioral signal (e.g. "desktop LCP>4s cohort converts 0% vs 13.9% same-page clean").
- Verdict non-technical → Step 7 (Shopify merchandising checks) and back to product-analysis levers.
- Dashboarding → store-pulse owns the dashboard; its v1 block set has no tech-drag tile (it offers an on-demand drag read instead). If one is ever added: group-grain conservative DF only (Step 8 rule).

**Principle alignment with tech-diagnosis:** no client-side error↔session joins — cohorts live entirely within page-visit data; the error cohort is triangulated via occurrence trends, never row-joined. Revenue figures stay on this side of the boundary: tech-diagnosis never surfaces revLost or dollar estimates, so the handoff passes the behavioral signal (cohort rates, visit counts), never the dollar framing.

---

## Reference files

- `references/methodology.md` — full drag-factor math: within-segment summation, sensitivity cases, dual denominators, severity heuristics, worked example (tovfurniture.com PDP group — derived totals only, illustrative rather than re-derivable).
- `references/execution-notes.md` — verified Noibu MCP wrapper constraints (what works vs what's documented), occurrence-vs-ARL cross-check, subagent sweep pattern, measured token costs. Read before issuing queries or dispatching a subagent.
