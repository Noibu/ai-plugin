# AB tests

Read this reference when the user asks about AB tests or experiments — what tests exist, whether one is running, how a test is doing, which variation is winning, whether it's safe to ship, or why a variation won.

Two tools split the work: `noibu_list_ab_tests` returns test **configs** — it can never say which variation is winning, because outcomes are computed live and never stored on the test; `noibu_get_ab_test_results` returns the **verdict and results** for one test (a `DRAFT` test returns config + estimate only — that is normal, not an error).

## Terms

- **Lifecycle vs verdict are different axes.** Lifecycle (`status`, stored on the test): `DRAFT` (not started — nothing to analyze), `RUNNING`, `STOPPED` (ended, with or without a decision). Verdict (computed live, never stored): `TOO_EARLY`, `TOO_CLOSE`, `CLEAR_LEADER`.
- **Control** — the variation with `isControl: true`; the default experience the others are compared against.
- **Success metric** — the single metric the verdict is judged on. **Secondary metrics** (up to 3) are measured alongside but never decide the outcome.
- **`key` vs `id`** — `key` is the test's slug and feature-flag key (what sessions are tagged with); `id` is the numeric identity used in console URLs (`/…/ab-tests/<id>`). Both come from `noibu_list_ab_tests`.
- **Lifecycle mechanics** — while `RUNNING`, only the hypothesis and secondary metrics are editable (server-enforced — variations, split, targeting, and the success metric lock so results stay valid). `STOPPED` is final: no restart, the flag turns off, everyone sees the control. Assignment is sticky per visitor, and visitors excluded by targeting see the control without entering the results.

## Interpreting results (`noibu_get_ab_test_results`)

The payload's `notes[]` carries computed caveats (running window, control not observed, estimate unavailable) — relay them to the user.

Reading the verdict (`results.primaryMetric.bayesianAnalysis`):

- `status`: `TOO_EARLY` (not enough data for a call), `TOO_CLOSE` (enough data, no decisive separation), `CLEAR_LEADER` (a variation's `probabilityBest` cleared 95%).
- `recommendedVariation` names the variation to ship. When it is the **control**, report "keep the current experience" — that is a decided test, not a failed one.
- A test `STOPPED` while the verdict reads `TOO_EARLY` was **stopped early** — say so rather than "no results".
- `chanceToWin`, uplift, and `credibleInterval95` are challenger-vs-control readings; they are null when no control was observable (the `notes[]` explain when that happens — variations are still ranked).
- `TOO_EARLY` means the statistical gates aren't met: each variation needs a minimum sample (surfaced as `estimate.requiredSessionsPerVariation`) and minimum conversions. The bar is fixed traffic, not time — high-traffic sites clear it sooner — but advise letting a test span at least a full week so weekly seasonality doesn't skew the read.

Health checks (`results.guardrails`) — three checks: `sampleRatio` (traffic-split mismatch), `errorRate`, `lcpP95`, each `PASS` | `WARN` | `NOT_EVALUATED`. A `WARN` never invalidates the verdict but must be reported alongside it ("winner, with warnings"). `NOT_EVALUATED` early in a test is normal; `notEvaluatedReason` says why (e.g. `BELOW_SAMPLE_FLOOR`).

Estimated time to a decision (`estimate`) — present for draft and running tests: `estimatedDays` until the smallest variation reaches the required sample. `status: INSUFFICIENT_TRAFFIC` means too few recent targeted sessions to estimate.

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
