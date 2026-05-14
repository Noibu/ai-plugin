# Errors / issues

Read this reference only when the user has **explicitly** asked about errors, bugs, JavaScript crashes, HTTP failures, broken pages, or revenue-loss projections — or after analytics has pointed at an error hypothesis and the user has confirmed they want to investigate.

Do NOT include these tools as a routine step in a cohort analysis, "user behaviour analysis", or "UX improvement" plan. For "what to fix" / "top opportunities" / open-ended improvement questions, lead with `noibu_search_sessions` and `noibu_get_page_visits` instead.

## Error tools

(In the Noibu console these are labelled "Issues" — we call them errors at the API layer.)

**noibu_list_priority_errors** — Quick view of the top priority errors ranked by occurrence. Only use when the user **explicitly** asks about errors or bugs. Applies the importance filters below server-side — prefer it over `noibu_search_errors` for priority questions.

**noibu_search_errors** — Advanced error search with filtering and sorting. Use when the conversation turns technical: specific errors, bugs, error types, stack traces, or when investigating root causes behind an analytics pattern.

**noibu_get_error** — Full detail for a single error including stack trace and error info. Use after `ErrorsSearch` or `GetPriorityErrors` to drill into a specific error.

**noibu_get_error_diagnosis** — AI-generated explanations for errors. Pass error UUIDs from `ErrorsSearch` to get plain-language explanations of what the error is.

**noibu_get_error_trends** — Error occurrence trends over time. Use to chart how errors are trending (getting worse or better).

## How "Important" Works — and ARL is NOT It

When the user asks anything shaped like "important", "priority", "what to fix", "what to focus on", "what's affecting my users", or "what matters most" — apply this filter and sort. Do NOT rank by ARL.

**Filter (apply all four):**

| User says | API |
|---|---|
| State: Unset, Open, In progress | `STATE` ∈ [new, open, in-progress] |
| Conversion impact: Verified, Unknown, Likely | `MANUALLY_VERIFIED` ∈ [IMPACT, UNKNOWN, LIKELY] |
| Insight is any: Caused by click, Lost sessions, Frequently broken image | `INSIGHTS` ∈ [ALL_USERS_CLICKED, LOST_SESSIONS, FREQUENT_IMAGE_ERROR] |
| Insight is not: Invalid coupon, Script error, HTTP undefined error, Dormant | `INSIGHTS` ∉ [INVALID_COUPON, SCRIPT_ERROR, HTTP_ZERO, DORMANT] |

If the user uses a left-column label, translate to the right.

**Sort:** `MANUALLY_VERIFIED` DESC, then `REV_LOST` DESC (actual — NOT `REV_LOST_ANNUALIZED`).

**Columns to surface:** ID, Title, Conversion impact, Revenue lost (`revLost`), Occurrences. ARL is NOT a column for importance answers.

`noibu_list_priority_errors` applies these filters server-side — prefer it.

**Verification terminology:** "verified errors" / "verified issues" = `MANUALLY_VERIFIED = "IMPACT"` (human-confirmed). Do NOT use "LIKELY" — that's an AI prediction, not verified.

## ARL is Directional, NOT Factual

`revLostAnnualized` (ARL) and `revLost` are Noibu **projections** computed from conversion-rate variance × cart value × leads, extrapolated to a year. Correlation-based, assumption-dependent, artifact-prone.

**Always caution when you surface revLost or ARL.** Footer-style note under the data, e.g.:

> *Note: revLostAnnualized is a Noibu projection — directional, not measured causal loss. Fixing the issue may recover more, less, or roughly the projected amount.*

**Phrasing rules:**

- Hedge: "projected", "estimated", "associated with ~$X". NOT "is costing $X", "is bleeding $X", "you're losing $X" — those imply measurement.
- No recovery promises ("you'll recover $X if you fix this").
- Sums across issues can double-count overlapping affected sessions.

**Do not use ARL as a proxy for importance.** Importance = the filter+sort above, not dollar ranking. Even within IMPACT-verified results, sort by `REV_LOST` (actual), NOT `REV_LOST_ANNUALIZED`.

**Do NOT surface revLost or ARL when:**

- The user didn't ask about revenue/money/financial impact. Lead with verification, symptoms (RageClick, BrokenButton, lost_sessions), and affected-session counts.
- Hard-zero categories (CSP, script, resource, page-check, fetch-API). $0 ARL here is a measurement gap, not "no impact".
- Brand-new issues (< ~7 days). ARL hasn't converged.
- Sitewide issues. Variance-based ARL collapses to ~$0 — no comparison group.
