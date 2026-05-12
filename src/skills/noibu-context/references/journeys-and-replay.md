# Journeys & session replay

Read this reference when the user asks about the shape of multi-step journey patterns across many sessions, or when they explicitly want to watch / see / view a session replay.

## Most "journey" questions belong in noibu_PageVisitsQuery

Default to `noibu_PageVisitsQuery` for journey-shaped questions. The vast majority of prompts that mention "journey", "funnel", "drop-off", "navigation", "path", or "what comes after /cart" are URL-level questions that PageVisitsQuery answers directly:

- **One-hop predecessor / successor** — "what page comes after /cart", "what's the top URL before /checkout" → URL + `PREV_URL`.
- **Drop-off / exit / abandonment** — "where do users drop off in checkout", "which pages do users exit from" → `IS_EXIT_PAGE`.
- **Landing / entry** — "what pages do users land on", "which landing pages convert" → `IS_LANDING_PAGE`.

If the user is asking for an aggregate (count, rate, percentage, ranking by URL) — route to `noibu_PageVisitsQuery` and stop. A URL in the prompt is not by itself a redirect signal; it may be the anchor for the shape question below. The presence of "journey" or "funnel" is not a signal either; what the user is asking for is. Load `references/page-visits.md` for field-level detail.

## noibu_TopPageGroupJourneys (narrow)

Use ONLY when the user is asking about the SHAPE of multi-step page-CATEGORY patterns across many sessions — ranked aggregated journey shapes at the page-group level, not URLs. Concrete examples:

- "What shapes do multi-step journeys leading into Checkout take?"
- "What does the purchase funnel look like at a category level?"
- "What common multi-step browsing patterns exist around the search results page?"
- "What are the most common page-group sequences our users follow?"

Output is page-group names (e.g. `Product`, `Cart`, `Checkout`), not URLs. Ungrouped visits render as `No Page Group`. Consecutive duplicates are collapsed (`[Product, Product, Cart]` → `[Product, Cart]`).

### When you use this tool, also call noibu_PageVisitsQuery in parallel

The tool returns aggregated page-CATEGORY shapes — it hides the underlying URLs and intra-group depth (`[Product]` covers a session that saw one PDP and a session that saw thirty). To give a complete answer, run `noibu_PageVisitsQuery` alongside for URL-level grounding (which specific URLs make up each step, how many PDPs per session, etc.). Do not conclude on the page-group shape alone.

### Page-group coverage is a prerequisite

The output is only useful if the customer has configured page groups on their domain. If `forwardPaths` is dominated by the `No Page Group` sentinel — or top patterns look like `[No Page Group, No Page Group, …]` — coverage is poor. Abandon this tool for the question, answer from `noibu_PageVisitsQuery` instead, and surface the coverage gap to the user.

### Always pass `minSteps = 3`

The schema default is 1, but always pass 3. At 1, single-bucket bouncer shapes (`[Product]`, `[Home]`) flood the top-N and bury the funnel and conversion patterns users actually want to see. Lower only when the user explicitly asks about short / bouncer journeys.

### Anchor

Optional. Exactly one of:

- `anchor.url` — exact URL match (paths only — `/cart`, not `https://...`).
- `anchor.pageGroup` — page-group name. The `No Page Group` sentinel is rejected.

The anchor visit's own step is NOT in either path array — the full journey is `backwardPaths` + [anchor's page-group] + `forwardPaths`.

### Truncation signal

`exitingSessionCount < sessionCount` (forward) or `landingSessionCount < sessionCount` (backward) means those sessions were capped by `maxDepth`. The path's length is a lower bound, not the actual journey length. Raise `maxDepth` (up to 15) if the user needs to see further.

### Anti-patterns

- Do not call this tool for URL-level questions — use `noibu_PageVisitsQuery`.
- Do not call this tool for counts, rates, bounce, exit, or landing analysis — use `noibu_PageVisitsQuery`.
- Do not pass URLs in `sessionFilters` — session-scope only (device, browser, UTM, conversion). Same shape as QuerySessions filters. `ExpressionFilter` is rejected.

## noibu_session_replay

Renders ONE page visit from a session as a video inside Claude's UI, and returns the session's full page-visit metadata (URLs, durations, key events per visit). May return a `jazzUrl` for the full session — use it only if present; never construct or mention a Noibu console link otherwise.

USE ONLY when the user **explicitly** asks to watch / see / view a session replay or video. Examples of when to call it:

- "Show me the session replay for sessionId=…"
- "Can I watch that session?"
- "I want to see where they got stuck in checkout"
- "Play back session X"

DO NOT use this tool as a data source for session summarization or analysis. The metadata it returns (page visits, events) is a convenience for UI navigation, NOT an analytics shortcut. For session summaries, cohort analysis, or "what did these users do" questions across multiple sessions, use `noibu_PageVisitsQuery` filtered by `SESSION_ID` — it's cheaper, aggregates cleanly, and doesn't render a video for each session.

Specifically:
- Do NOT call `noibu_session_replay` N times to pull event data for N sessions. That's what `noibu_PageVisitsQuery` is for.
- Do NOT call it just to "see what happened in the session" — use `noibu_PageVisitsQuery` for that.

**Page visit selection:**
- When `pageVisitIndex` is omitted, the tool auto-selects the most important page visit based on signal strength (errors, ecommerce events, navigation, time on page). The selected index is exposed as `importantIndex` in the response so you can explain why that page visit was chosen.
- Only specify `pageVisitIndex` when the user has expressed interest in a specific page visit (e.g., "show me page visit 3").

**Multiple replays:**
- When showing multiple replays from the same session, call the tool once per page visit and write the summary immediately after each replay before calling the tool for the next. This produces: [iframe] → summary → [iframe] → summary, rather than batching all summaries at the end.
