# Conversion Technical Drag — methodology

Detailed math for the technical-drag-factor workflow in `../SKILL.md`. Read before computing. Assumes the domain UUID is resolved and a target page or page-group chosen (SKILL.md Step 1).

## Table of contents

1. Cohort definitions
2. Why within-segment is non-negotiable
3. The technical-drag-factor formulas
4. The null-LCP sensitivity range
5. Per-visit severity heuristics (the sanity check)
6. Reconciling DF against per-issue revenue loss
7. Worked example — tovfurniture.com PDP group, last 30 days
8. Reference computation script

---

## 1. Cohort definitions

Each page visit lands in exactly one cohort, split on two `noibu_get_page_visits` fields: `VISUAL_ERROR_COUNT` and `LCP` (raw per-visit value, not the p75 aggregate — we bucket individual visits, not rank pages).

| Cohort | Condition | Read as |
|---|---|---|
| **Errors** | `VISUAL_ERROR_COUNT > 0` | the visit hit a visible defect |
| **Poor-perf** | `VISUAL_ERROR_COUNT = 0` AND `LCP > 4000ms` | no error, but slow (CWV "poor" band) |
| **Clean** | `VISUAL_ERROR_COUNT = 0` AND `LCP ≤ 4000ms` | no *observable* defect — silent JS/HTTP failures and poor INP/CLS land here (the bucket is a floor; SKILL.md caveat 5) |
| **Null-LCP** | remainder (LCP not recorded) | ambiguous — handle in §4 |

`4000ms` is the Google CrUX "poor" LCP threshold; parameterizable, but state the value used.

"Degraded cohorts" = Errors + Poor-perf (and, in the aggressive case only, Null-LCP).

---

## 2. Why within-segment is non-negotiable

Conversion rate varies enormously by device and browser independent of any technical issue — desktop converts far above mobile on most stores for reasons of intent, screen real estate, and payment friction unrelated to errors or LCP. Degraded visits also skew toward weaker devices, so with one site-wide clean rate and one site-wide degraded rate, the degraded rate is depressed partly because it is *more mobile* — you will over-attribute the gap to technical issues.

The fix: compute every cohort rate **inside a single device** (and ideally a single browser), then sum the loss terms across segments. The mobile calculation uses the *mobile* clean rate; the desktop calculation the *desktop* clean rate. The global benchmark `T` (best clean rate, usually desktop-clean) is used only for the total-shortfall term, itself a deliberate "what's the ceiling" framing — see §3.

---

## 3. The technical-drag-factor formulas

Within each segment `s` (e.g. desktop, mobile), you have for each cohort: visit count `v` and conversion rate `r` (= conversions / visits).

**Benchmark.** `T = max over segments of clean_rate_s`. Typically `T = desktop_clean_rate`. This is the "nothing technically wrong, best-converting context" ceiling.

**Technical loss** — recovered conversions if every degraded visit had converted at its *own segment's* clean rate:

```
technical_loss = Σ_s Σ_{c in degraded}  v[s,c] × ( clean_rate[s] − r[s,c] )
```

The same-segment clean rate keeps device mix out of this term.

**Total shortfall** — the gap between the benchmark ceiling and reality, across all visits:

```
total_shortfall = T × total_visits − total_conversions
```

**Non-technical loss** — the residual:

```
non_technical_loss = total_shortfall − technical_loss
```

**Technical drag factor and share:**

```
DF    = technical_loss / non_technical_loss
share = technical_loss / total_shortfall          (0–1)
```

Interpretation:
- `DF > 1` → technical degradation explains more of the gap than everything else — a hypothesis to confirm, not a verdict (asymmetry note below); hand to tech-diagnosis before pointing engineering at it.
- `DF < 1` → non-technical factors dominate (price, demand, content, intent, mobile UX). Point strategy there.
- **The two directions are not equally trustworthy.** Cohort assignment is non-random and the selection bias runs one way: degraded visits skew toward weaker devices, networks, and lower-intent contexts, which *inflates* `technical_loss`. A low DF is therefore robust — the bias could only make the true technical share smaller still (`DF ≈ 0.03` is an overwhelming exoneration). A high DF inherits the full bias exactly when the verdict matters most — `DF ≈ 5` is a strong reason to investigate, not yet a conclusion. Distance from 1 strengthens the verdict only on the low side.

`share` is the friendlier number for a non-technical audience: "technical issues explain ~3% of the shortfall."

### 3a. Two denominators — ceiling-share vs mix-adjusted share

The `total_shortfall` above uses the **ceiling** framing: every visit valued at `T` (best clean rate, usually desktop-clean). This deliberately counts the device-mix gap (mobile-clean converting below desktop-clean) as *non-technical loss* — useful when the question is "how far from best case, and how much of that is tech."

There is a second legitimate denominator, the **mix-adjusted expectation**:

```
E_mix          = Σ over (device × browser) cells: visits_cell × baseline_rate_cell
shortfall_mix  = max(E_mix − conversions, 0)
share_mix      = technical_loss / shortfall_mix
```

where `baseline_rate_cell` is the page-group-wide visit-level conversion rate for that device × browser segment. This asks "is the page underperforming a *typical* page given its traffic mix" — the structural mobile/desktop gap is absorbed into E and excluded from the shortfall entirely.

The two denominators answer different questions and can disagree sharply. With the group-grain `T` mandated by §3b, `T ≥ baseline_rate_cell` has held for every cell in every run so far — not mathematically guaranteed (a strong browser cell can exceed a pooled device clean rate), but expect `total_shortfall ≥ shortfall_mix`, with share_mix the higher share for the same technical loss. **The ordering reliably breaks when T is improvised from a page's own clean rate**: on a content-broken page the own-clean rate sits below the mix baselines and the ceiling shortfall comes out *smaller* than the mix shortfall (verified: own-T ceiling 5.84 vs mix 10.45; group-grain T restores 28.68 vs 10.45). An observed inversion is therefore a tripwire — most often a §3b violation, occasionally a legitimate strong-browser-cell artifact — and, where legitimate, a strong content/demand signal (the page underperforms even its mix expectation inside clean cohorts). **Report both, labeled**, the way the conservative/aggressive pair is reported — and give each its job: the **mix-adjusted share decides the tech-vs-non-tech verdict** (on any mobile-heavy store the ceiling denominator is dominated by the structural device-mix gap, so the ceiling share reads "non-technical" almost regardless of the page's actual state — a near-deterministic verdict carries little information); the **ceiling-share frames strategy** ("how far from best case, and how much of that distance is tech"). Never present one as the other.

Observed on one 20-PDP pool: group-grain conservative share 0.024 (ceiling) vs 0.136 (mix-adjusted) — same verdict, different magnitude; both belong in the report.

### 3b. Sparse-cohort fallback and stability rules (normative — do not improvise)

Two blind runs on the same pages once produced different per-page DFs (0.03→0.21 vs 0.05→0.64) purely from improvised fallbacks. Follow these exactly:

1. **Clean-rate fallback.** If a page×segment clean cohort has **< 8 conversions**, replace `clean_rate[s]` with the **group clean rate for that device segment** (computed once per run from the pooled page-group, same window). Flag every fallback cell (†) and report which rates are measured vs fallback.
2. **Benchmark T is always group-grain.** `T` = the pooled page-group's best segment-clean rate (typically group desktop-clean), never a single page's sparse measured value. A page's own measured clean rate enters only the within-segment loss terms, and only when it clears the 8-conversion bar. If a page's clean rate exceeds T, it has no shortfall to attribute — report it as at-or-above benchmark (DF n/a) rather than forcing a ratio.
3. **DF stability guard.** If `non_technical_loss < 0.05 × total_shortfall` (or `total_shortfall ≤ 0`), the DF ratio is numerically unstable (observed blowup: DF_aggressive = 94.6 on a page where clean rate ≈ overall rate with a large null cohort). Suppress DF, report **share** only, and label the case.
4. **LCP boundary.** Poor-perf is `LCP > 4000`; clean is `LCP ≤ 4000`. The wrapper's strict GREATER_THAN/LESSER_THAN filters silently drop exact-4000 values from both filtered queries — immaterial in volume, but they are clean by definition; derive clean by subtraction (total − poor − errors − null), not by a second filtered query, and the boundary takes care of itself.

---

## 4. The null-LCP sensitivity range

Null-LCP visits have no recorded LCP — a mix of genuinely fast pages whose vitals weren't captured, instrumentation gaps, and very short bounces; you cannot cleanly call them technical or not. Compute the DF twice:

- **Conservative case:** Null-LCP is *not* a degraded cohort. It contributes its visits and conversions to the totals (so it affects `total_shortfall`) but adds nothing to `technical_loss`. This is the headline DF.
- **Aggressive case:** treat Null-LCP as a technical cohort — add its `v × (clean_rate − r)` term to `technical_loss` using its own segment's clean rate. This normally marks the high end of the range, but it is **not a guaranteed upper bound**: null-LCP visits are mostly fine experiences (cached loads, back-nav — often by purchasers), and a null cohort that out-converts its segment's clean rate contributes a *negative* term, dropping the "aggressive" case below the conservative one. Report the null cohort's conversion rate and the sign of its term; an inverted range is itself evidence the null cohort is benign.

Report both. If they straddle 1, the verdict is genuinely "mixed / can't tell from this data" — say so rather than picking a side.

---

## 5. Per-visit severity heuristics (the sanity check)

These are rough priors from early cross-store runs — **not validated bands**: no within-segment measurement confirms them yet; the one pooled measurement (below) gives 1.88× for measured-clean vs poor, consistent with the band. Useful to catch a broken cohort split — not to compute the DF; deviation is a prompt to re-check the split and sample size, not proof of a bug:

- Clean visits convert roughly **1.8–2.1×** the rate of poor-vitals visits.
- Clean visits convert roughly **5–9×** the rate of error visits.

If your computed cohort rates are wildly outside these bands (e.g. error visits converting *higher* than clean, or a 50× clean/error ratio), suspect a cohort-definition bug, a segmentation error, or a sample too small to mean anything — investigate before trusting the DF.

**Measured once (302k PDP visits, one store/month, pooled cross-page, NOT within-segment):** measured-clean converts **1.88×** poor-LCP visits (2.381% vs 1.267%) — in-band. The broader non-degraded baseline (measured-clean + null-LCP) converts **1.44×** poor (1.825% vs 1.267%); including null-LCP pulls the ratio down, and device-mix pooling contributes too. Use the within-segment band for sanity checks; use a domain-measured pooled penalty (PEN ≈ 0.31, defined on the non-degraded baseline) only for the §5a prior-smoothing.

### 5a. Prior-smoothed technical loss for zero-conversion cohorts

Per-page degraded cohorts are typically 5–30 visits with 0 conversions, making the raw loss term `v × (clean_rate − 0)` pure mechanical noise. (The mirror case — a sparse degraded cohort that happens to convert *above* its clean rate — produces a negative term; flag it rather than clipping silently, per the §8 script.) For sparse cohorts, also compute a prior-based estimate:

```
tech_loss_smoothed = degraded_visits × clean_rate × PEN
```

where `PEN` is the domain-calibrated relative conversion penalty for degraded visits, measured once per domain/window on the pooled page-group (measured: PEN = 0.31 for poor-LCP).

**PEN definition (normative):** `PEN = 1 − pooled_poor_rate / pooled_non-degraded_rate`, where **non-degraded = measured-clean + null-LCP** (all `VISUAL_ERROR_COUNT = 0` visits not in the poor band). The denominator choice matters: against measured-clean only, the same data gives ≈ 0.47 (measured: poor 1.267% vs non-degraded 1.825% → 0.31; vs measured-clean 2.381% → 0.47), a ~50% swing in every smoothed loss. The incl-null definition is canonical because null-LCP visits are mostly fine experiences (cached loads, back-nav — see execution-notes) and excluding them inflates the baseline; it also matches the §5 non-degraded figure (1.825%) and prior calibrations. Report raw and smoothed side by side; rank pages by the smoothed figure when degraded-cohort conversions are zero (raw is then an upper-bound artifact, smoothed is the believable estimate). This complements — does not replace — the group-rate fallback for sparse *clean* cohorts.

Two calibration limits to state whenever smoothed terms are reported: **(1) PEN is calibrated for the poor-LCP cohort only.** For the errors cohort, calibrate a separate `PEN_err` the same way (pooled error-cohort rate vs pooled non-degraded rate); if the pooled error cohort is itself too sparse to calibrate, report the raw term only, labeled an upper-bound artifact — never reuse the poor-LCP PEN. **(2) Grain mismatch:** PEN is calibrated pooled (cross-segment) but multiplied by a within-segment clean rate, and pooling absorbs part of the device gap (pooled ratios run below within-segment ones — §5), so every smoothed term inherits some device-mix bias. Acceptable for ranking sparse pages against each other; one more reason smoothed terms never feed the headline DF.

---

## 6. Reconciling DF against per-issue revenue loss

The DF is **conversion-weighted across all visits** — it answers "where is the bulk of the lost conversion." Individual error severity is **revenue-weighted and concentrated** — a bug that only fires on 2% of sessions but on high-AOV, high-intent ones can carry a large `revLost` projection while contributing almost nothing to the DF.

They are not contradictory; they answer different questions. So even when the DF says non-technical dominates:

1. Pull `noibu_search_errors` for the scope. Note the top issues by `revLost` and severity.
1a. For any issue implicating the target page, pull `noibu_get_error_trends` and check **occurrence volume** over the window. Projection-heavy but occurrence-light issues (e.g. a $146k-ARL error firing ~7×/month) cannot materially contribute to drag — occurrence data overrides the projection.
2. Report them *alongside* the verdict, not instead of it: "Strategy should target [non-technical lever] — that's where 97% of the gap is. Separately, issue #X projects $Y lost on a concentrated slice of high-value sessions; fix it on its own merits."

This keeps a low DF from being misread as "the site is fine, don't fix anything."

---

## 7. Worked example — tovfurniture.com PDP group, last 30 days

Target: the product-detail-page group (analyzed at group grain because individual PDPs are too sparse — see SKILL.md caveat 3). Window: last 30 days.

*(Derived totals only — the per-cell visit/conversion table is not reproduced here, so treat the figures as an illustration of the method, not a dataset the arithmetic can be re-derived from.)*

**Within-segment clean rates:**
- Desktop clean: **3.77%** → this is the benchmark `T`.
- Mobile clean: **1.56%**.

Mobile is **65%** of PDP traffic — the population is mobile-heavy, and the desktop-vs-mobile clean gap (3.77% vs 1.56%) is itself a large non-technical signal unrelated to errors or speed.

**Degraded traffic** (errors + poor-vitals) is only about **5–6%** of visits — structurally it cannot explain a large conversion gap, which foreshadows the result.

**Loss terms (conservative case):**
- Technical loss (errors + poor-vitals, summed within segment): **≈ 184 conversions**.
- Total shortfall (`T × total_visits − total_conversions`): **≈ 5,919 conversions**.
- Non-technical loss = 5,919 − 184 = **≈ 5,735 conversions**.

```
DF (conservative) = 184 / 5,735 ≈ 0.03
```

Non-technical factors dominate by roughly **31:1**. Technical issues explain ~3% of the shortfall.

**Aggressive case (null-LCP counted as technical):**

```
DF (aggressive) ≈ 0.38   →   roughly 2.6:1 still in favor of non-technical
```

Even crediting every unmeasured visit to the technical bucket, non-technical factors still dominate. The verdict is robust across the sensitivity range — this is a non-technical conversion problem.

**Severity cross-check.** Browser splits show Safari converting **1.21%** vs Chrome **2.71%** — another large non-technical-looking split (browser-correlated shopper behavior, not necessarily a Safari bug, though it's worth a glance at `noibu_search_errors` filtered to Safari to rule out a real defect).

**Where to point strategy.** With mobile at 65% of traffic and converting less than half the desktop clean rate, the lever is the mobile PDP experience, mobile-shopper intent, and merchandising (price/stock/content) — verified via the Shopify MCP — not error-fixing. Any concentrated high-`revLost` issues from Step 6 still get fixed on their own merits, but they are not the strategy.

---

## 8. Reference computation script

Pull the cohort rows (visits + conversions per cohort per segment) from `noibu_get_page_visits`, then compute in code — never by hand. The pattern below implements the §3a/§3b/§4 rules. The group-grain inputs at the top are **required, not optional** — a script that derives `T` or fallback rates from the target page's own rows reproduces exactly the improvised-fallback failure §3b forbids.

```python
# Target-page rows: one dict per (segment, cohort) cell
#   {"segment": "desktop", "cohort": "clean", "visits": ..., "conversions": ...}
# Group-grain inputs, computed ONCE per run from the pooled page-group, same window (§3b):
#   GROUP_CLEAN   = {"desktop": 0.0377, "mobile": 0.0156}  # per-segment pooled clean rates
#   T             = max(GROUP_CLEAN.values())              # benchmark — never the page's own rate
#   CELL_BASELINE = {("desktop", "chrome"): ..., ...}      # §3a group visit-level rate per device×browser cell
#   CELL_VISITS   = {("desktop", "chrome"): ..., ...}      # target page's visits per cell
from collections import defaultdict

DEGRADED = {"errors", "poor_perf"}   # conservative; aggressive adds "null_lcp"
MIN_CLEAN_CONV = 8                   # §3b rule 1

def rate(v, c):
    return c / v if v else 0.0

seg = defaultdict(dict)
for r in rows:
    seg[r["segment"]][r["cohort"]] = (r["visits"], r["conversions"])

# §3b rule 1 — the page's own clean rate only above the conversion bar; group fallback otherwise (flag †)
clean_rate, fellback = {}, {}
for s, cells in seg.items():
    v, c = cells.get("clean", (0, 0))
    fellback[s] = c < MIN_CLEAN_CONV
    clean_rate[s] = GROUP_CLEAN[s] if fellback[s] else rate(v, c)

total_visits = sum(v for cells in seg.values() for (v, _) in cells.values())
total_conv   = sum(c for cells in seg.values() for (_, c) in cells.values())

def case(degraded):
    tech, inversions = 0.0, []
    for s, cells in seg.items():
        for cohort, (v, c) in cells.items():
            if cohort in degraded:
                term = v * (clean_rate[s] - rate(v, c))
                if term < 0:
                    inversions.append((s, cohort, round(term, 2)))
                tech += term            # negative terms flow in — report them, don't clip (§4, §5a)
    shortfall = T * total_visits - total_conv          # ceiling denominator (§3a)
    nontech = shortfall - tech
    unstable = shortfall <= 0 or nontech < 0.05 * shortfall   # §3b rules 2+3 — at/above benchmark or unstable: suppress DF, report share/label only
    return {"tech": tech, "shortfall": shortfall,
            "df": None if unstable else tech / nontech,
            "share": tech / shortfall if shortfall > 0 else None,
            "unstable": unstable, "inversions": inversions}

# §3a mix-adjusted denominator — same technical loss, the verdict denominator
E_mix = sum(CELL_VISITS[cell] * CELL_BASELINE[cell] for cell in CELL_VISITS)
shortfall_mix = max(E_mix - total_conv, 0.0)

cons, aggr = case(DEGRADED), case(DEGRADED | {"null_lcp"})
print("fallback cells (†):", fellback)
print("conservative:", cons, "share_mix:", cons["tech"] / shortfall_mix if shortfall_mix else None)
print("aggressive:  ", aggr)
```

For zero-conversion degraded cohorts, also compute the §5a smoothed term (`visits × clean_rate × PEN`) and report raw and smoothed side by side. Report the conservative case as the headline and the aggressive case as the sensitivity range (not a guaranteed upper bound — §4), with both denominators labeled per §3a: mix-adjusted share for the verdict, ceiling share for the strategy framing.
