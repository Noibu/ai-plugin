# AB tests

Read this reference when the user asks about AB tests or experiments — what tests exist, whether one is running, how a test is doing, which variation is winning, whether it's safe to ship, or why a variation won.

Two tools split the work: `noibu_list_ab_tests` returns test **configs** — it can never say which variation is winning, because outcomes are computed live and never stored on the test; `noibu_get_ab_test_results` returns the **verdict and results** for one test (a `DRAFT` test returns config + estimate only — that is normal, not an error).

## Terms

- **Lifecycle vs verdict are different axes.** Lifecycle (`status`, stored on the test): `DRAFT` (not started — nothing to analyze), `RUNNING`, `STOPPED` (ended, with or without a decision). Verdict (computed live, never stored): `TOO_EARLY`, `TOO_CLOSE`, `BEAT_CONTROL`, `MULTIPLE_BEAT_CONTROL`, `CLEAR_WINNER`.
- **Control** — the variation with `isControl: true`; the default experience the others are compared against.
- **Success metric** — the single metric the verdict is judged on. **Secondary metrics** (up to 3) are measured alongside but never decide the outcome.
- **`key` vs `id`** — `key` is the test's slug and feature-flag key (what sessions are tagged with); `id` is the numeric identity used in console URLs (`/…/ab-tests/<id>`). Both come from `noibu_list_ab_tests`.
- **Lifecycle mechanics** — while `RUNNING`, only the hypothesis and secondary metrics are editable (server-enforced — variations, split, targeting, and the success metric lock so results stay valid). `STOPPED` is final: no restart, the flag turns off, everyone sees the control. Assignment is sticky per visitor, and visitors excluded by targeting see the control without entering the results.

## Interpreting results (`noibu_get_ab_test_results`)
Reading the verdict (`results.primaryMetric.bayesianAnalysis`):

- `status`: `TOO_EARLY` (nothing compared yet — a variation is short of 500 sessions, 25 conversions, or 7 days), `TOO_CLOSE` (compared, nothing separated — also the no-winner state on a control-less test), `BEAT_CONTROL` / `MULTIPLE_BEAT_CONTROL` (one / several variations beat the control, none won outright), `CLEAR_WINNER` (one variation beat every other).
- **Two claims — never conflate them.** `perVariation[].isWinner` means the variation beat **every** other arm; at most one ever has it, and the control can win. `comparisonToControl.isBetterThanControl` is the weaker pairwise claim and several arms can hold it at once — `MULTIPLE_BEAT_CONTROL` is a real result, not "no result".
- `recommendedVariation` names the variation to ship and is set on exactly the three decisive statuses — read it rather than matching on `status`. When it is the **control**, report "keep the current experience" — a decided test, not a failed one.
- A test `STOPPED` while the verdict reads `TOO_EARLY` was **stopped early** — say so rather than "no results".
- vs-control numbers (`probabilityToBeat`, uplift, `credibleInterval95`) live per-arm under `comparisonToControl` — null on the control's own row, and on every row when the test named no control (arms are still ranked). `probabilityToBeBest` is a display ranking only — it gates nothing, and a winner's can sit below 95%.
- On `TOO_EARLY` every figure is still reported — quote rates and probabilities if asked — but nothing is flagged and `recommendedVariation` is null. Report "not enough data to call it yet", never a tie and never a winner.

Health checks (`results.guardrails`) — three checks: `sampleRatio` (traffic-split mismatch), `errorRate`, `lcpP95`, each `PASS` | `WARN` | `NOT_EVALUATED`. A `WARN` never invalidates the verdict but must be reported alongside it ("winner, with warnings"). `NOT_EVALUATED` early in a test is normal; `notEvaluatedReason` says why. `BELOW_SAMPLE_FLOOR` is the guardrail's own floor, unrelated to the gates `TOO_EARLY` reports against — and lcpP95's floor only bars an arm from being the baseline; a below-floor arm is still compared and can still be flagged.

Estimated time to a decision (`estimate`) — present for draft and running tests. The estimate and the verdict share one bar: `requiredSessionsPerVariation`, `requiredConversionsPerVariation`, and `minimumRuntimeDays` are the same three gates `TOO_EARLY` reports against — never present them as two opinions, and on `TOO_EARLY` name the gate still open rather than only the day count. `estimatedDays` is never below `minimumRuntimeDays`; for a `PAGE_VIEW_TO_URL_RATE` success metric the conversion gate is not projected, so hedge the day count. `isCapped` at 365 days can mean a gate that never opens — say the test cannot reach a verdict as configured. `status: INSUFFICIENT_TRAFFIC` means too few recent targeted sessions to estimate.

## Result validity caveats

When a user doubts their numbers, probe for these — the tools cannot detect them:

- A variation can be **assigned without rendering**: sessions are tagged when the flag is *evaluated*, not when the experience actually changes. Code that evaluates but doesn't render the variation (partial or late deploy, broken branch) counts visitors into an arm while they see the control — silent corruption; suspect it when a challenger tracks the control almost exactly. A test started with *no* evaluation code deployed collects nothing at all — arms stay empty rather than corrupted.
- The config locks at start, but the merchant's code doesn't — a variation edited mid-test mixes two experiences in one arm.
- Two overlapping tests touching the same element confound each other.

## Comparing arms — "why did variation X win?"

Sessions record their test assignment as a custom-attribute tuple: name = the test's `key`, value = the variation `key`. So the regular analytics tools can slice by arm:

```json
{ "collectionFilter": { "collection": "CUSTOM_ATTRIBUTE_TUPLES", "operator": "CONTAINS_TUPLE",
                        "comparisonValues": ["<test key>", "<variation key>"] } }
```

This filter works in `noibu_search_sessions`, `noibu_get_page_visits`, and `noibu_visualize_page_visits` (a heatmap per arm). Run the same query once per variation and compare. Scope `dateTimeRange` to the test's window (`startedAt` → `endedAt`, or now while running) so both arms cover the same period.
