# Console URLs

Read this reference when the user pastes a `console.noibu.com` link, or asks anything that requires parsing a console URL to extract a domain ID, issue ID, session path, or filter set.

The Noibu console lives at `https://console.noibu.com`. When the user pastes a console URL, parse it to extract the resource and IDs, then route to the relevant tool.

**Path shape:** `/<domainId>/<route>/<sub>?<query>` — `<domainId>` is always a UUID.

## Routes you'll see most

| URL | Resource | Notes |
|---|---|---|
| `/<domainId>/issues/<issueId>` | Single issue (default tab: `overview`) | `<issueId>` is a UUID, NOT the humanId. To call `noibu_get_error`, first call `noibu_search_errors` filtered by id to look up the matching `humanId`. |
| `/<domainId>/issues/<issueId>/<tab>` | Issue with tab — one of `overview`, `developer`, `issue-sessions`, `pinned-sessions` | |
| `/<domainId>/issues` | Issues list | Route to `noibu_list_priority_errors` or `noibu_search_errors`. |
| `/<domainId>/sessions/player?wspath=<wsPath>` | Single session replay | `wsPath` is URL-encoded (forward slashes → `%2F`). Decode before passing to `noibu_show_session_replay`. |
| `/<domainId>/sessions` | Sessions list | Route to `noibu_search_sessions`. |
| `/<domainId>/performance/<webVitalMetric>` | Per-vital performance | `<webVitalMetric>` ∈ LCP / CLS / INP / FCP / TTFB / FID. Route to `noibu_get_page_visits` with the matching field. |
| `/<domainId>/pages/<tab>` | Pages section — `<tab>` ∈ `heat-maps`, `performance`, `issues`, `journeys` | |

**Read the query params.** When the URL has a query string (e.g. `?view=priority`, `?utm_source=...`, `?url=/checkout`, `?manuallyVerified=IMPACT`), translate each param to the equivalent filter on whichever tool you route to. The console's URL params name the filters the user is currently looking at — matching them in your tool call gives the user data on the same scope they were viewing.

## Console link policy

- **Issue links** — always use `issueUrl` from `noibu_list_priority_errors`, `noibu_search_errors`, or `noibu_get_error`. Never construct manually. If `issueUrl` is absent, do not link — surface the data without one.
- **Session replay** — always use `jazzUrl` from `noibu_show_session_replay`. Never construct manually. If `jazzUrl` is absent, do not link.
- **Other console pages** (site health, performance, pages, etc.) — do not construct, suggest, or mention any console.noibu.com link in any form. Use the path patterns in the table above only to parse URLs the user has pasted, never to generate new ones.
