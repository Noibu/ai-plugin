# Journeys & session replay

Read this reference when the user asks about the shape of multi-step journey patterns across many sessions, or when they explicitly want to watch / see / view a session replay.

## Most "journey" questions belong in noibu_get_page_visits

Default to `noibu_get_page_visits` for journey-shaped questions. The vast majority of prompts that mention "journey", "funnel", "drop-off", "navigation", "path", or "what comes after /cart" are URL-level questions that PageVisitsQuery answers directly:

- **One-hop predecessor / successor** — "what page comes after /cart", "what's the top URL before /checkout" → `URL` + `PREV_URL`.
- **Drop-off / exit / abandonment** — "where do users drop off in checkout", "which pages do users exit from" → `IS_EXIT_PAGE`.
- **Landing / entry** — "what pages do users land on", "which landing pages convert" → `IS_LANDING_PAGE`.

If the user is asking for an aggregate (count, rate, percentage, ranking by URL) — route to `noibu_get_page_visits` and stop. A URL in the prompt is not by itself a redirect signal; it may be the anchor for the shape question below. Load `references/page-visits.md` for field-level detail.

### Funnel-shaped *visualization* requests are different

When the user explicitly asks to **see / chart / visualize / draw** the ecommerce conversion funnel (e.g. "show me the checkout funnel", "render the purchase funnel as a chart", "funnel chart for last 7 days vs previous"), do NOT stop at `noibu_get_page_visits`. Use it (or `noibu_search_sessions`) to fetch the per-step session counts, then hand the result to `references/funnel-visualization.md` — it renders the bar chart inline via `show_widget`. Analytical funnel prompts ("where do users drop off", "abandonment by step") still terminate at `noibu_get_page_visits`.

## noibu_list_page_group_journeys (narrow)

Use when the user is asking about the SHAPE of multi-step page-CATEGORY patterns across many sessions — ranked aggregated journey shapes at the page-group level, not URLs. Concrete examples:

- "What shapes do multi-step journeys leading into Checkout take?"
- "What does the purchase funnel look like at a category level?"
- "What common multi-step browsing patterns exist around the search results page?"
- "What are the most common page-group sequences our users follow?"

Output is page-group names (e.g. `Product`, `Cart`, `Checkout`), not URLs. Ungrouped visits render as `No Page Group`. Consecutive duplicates are collapsed (`[Product, Product, Cart]` → `[Product, Cart]`).

### When you use this tool, also call noibu_get_page_visits in parallel

This tool returns page-category shapes and hides the underlying URLs and intra-group depth (`[Product]` covers a session that saw one PDP and one that saw thirty). Calling `noibu_get_page_visits` alongside for URL-level grounding is strongly recommended, and when you are uncertain whether the user needs URL detail, call both. If the user's question turns on exact URLs (e.g., "what pages come before and after X") or on how often a category was visited, `noibu_get_page_visits` is essential and the intra-group depth should be surfaced to the user. The parallel-call rule is about completing journey-shape answers — it is NOT a reason to call this tool when `noibu_get_page_visits` alone would have answered the question.

### Page-group coverage is a prerequisite

The output is only useful if the customer has configured page groups on their domain. If `forwardPaths` is dominated by the `No Page Group` sentinel, coverage is poor. Abandon this tool for the question and answer from `noibu_get_page_visits` instead.

### Always pass `minSteps = 3`

The schema default is 1, but always pass 3. At 1, single-bucket bouncer shapes (`[Product]`, `[Home]`) flood the top-N and bury the funnel and conversion patterns users actually want to see. Use 1 or 2 only when the user explicitly asks about bouncer or single-hop questions; raise above 3 only when they want long, deep journeys.

### Anchor

Optional. Exactly one of:

- `anchor.url` — exact URL match (paths only — `/cart`, not `https://...`).
- `anchor.pageGroup` — page-group name. The `No Page Group` sentinel is rejected.

The anchor visit's own step is NOT in either path array — the full journey is `backwardPaths` + [anchor's page-group] + `forwardPaths`.

### Truncation signal

`exitingSessionCount < sessionCount` (forward) or `landingSessionCount < sessionCount` (backward) means those sessions were capped by `maxDepth`. The path's length is a lower bound, not the actual journey length. Raise `maxDepth` (up to 15) if the user needs to see further.

### Pattern coverage check

Compare `totalMatchingSessions` to the sum of `sessionCount` across returned patterns. When the sum is much smaller than the total, the long tail dominates: either raise `limit` (schema default 25, max 500 — 100 is a reasonable exploration starting point) or narrow the population with `sessionFilters` (e.g., filter to converters when the question is about conversion). The top-N alone is misleading without this coverage check.

## noibu_show_session_replay

Renders ONE page visit from a session as a video inside Claude's UI, and returns the session's full page-visit metadata (URLs, durations, key events per visit). May return a `jazzUrl` for the full session — use it only if present; never construct or mention a Noibu console link otherwise.

USE ONLY when the user **explicitly** asks to watch / see / view a session replay or video. Examples of when to call it:

- "Show me the session replay for sessionId=…"
- "Can I watch that session?"
- "I want to see where they got stuck in checkout"
- "Play back session X"

DO NOT use this tool as a data source for session summarization or analysis. The metadata it returns (page visits, events) is a convenience for UI navigation, NOT an analytics shortcut. For session summaries, cohort analysis, or "what did these users do" questions across multiple sessions, use `noibu_get_page_visits` filtered by `SESSION_ID` — it's cheaper, aggregates cleanly, and doesn't render a video for each session.

Specifically:
- Do NOT call `noibu_show_session_replay` N times to pull event data for N sessions. That's what `noibu_get_page_visits` is for.
- Do NOT call it just to "see what happened in the session" — use `noibu_get_page_visits` for that.

**Page visit selection:**
- When `pageVisitIndex` is omitted, the tool auto-selects the most important page visit based on signal strength (errors, ecommerce events, navigation, time on page). The selected index is exposed as `importantIndex` in the response so you can explain why that page visit was chosen.
- Only specify `pageVisitIndex` when the user has expressed interest in a specific page visit (e.g., "show me page visit 3").

**Multiple replays:**
- When showing multiple replays from the same session, call the tool once per page visit and write the summary immediately after each replay before calling the tool for the next. This produces: [iframe] → summary → [iframe] → summary, rather than batching all summaries at the end.
