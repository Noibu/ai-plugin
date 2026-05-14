---
name: querying-noibu-data
description: >
    Required reference for calling `noibu_*` tools — field and measure semantics,
    query constraints (the `orderBy`-at-input-level requirement, row caps,
    unique-measure rule), the `rationale` argument convention, and domain
    resolution. Also covers parsing of pasted `console.noibu.com` URLs and
    third-party integration management. Loads alongside topical Noibu skills
    (e.g., `checkout-analysis`, `tech-diagnosis`), not instead of them — they
    own routing for their respective domains.
---

# Noibu MCP routing guide

Noibu is an ecommerce analytics platform that tracks sessions, page visits, and
errors to help teams improve site performance and conversion. The Noibu MCP server
exposes those datasets as `noibu_*` tools. Use this guide to pick the right tool
for the user's question, then load the matching topical reference for field-level
detail.

## Canonical Entrypoints

Three tools cover almost every analytics question. Prefer them in this order:

1. **`noibu_get_domain`** — resolve a domain name to its UUID. Skip if the
   user already gave you a UUID. Fall back to `noibu_list_domains` if no match.
2. **`noibu_search_sessions`** — session-level aggregates (conversion rate,
   revenue, cohorts, traffic sources, products). One row per session.
3. **`noibu_get_page_visits`** — page-level aggregates. One row per page visit.

Both query tools require `orderBy` at the `input` level — see **Query Constraints**.

**Top-level routing:**

- "conversion rate", "revenue by X", "what % of sessions did Y", "AOV" →
  `noibu_search_sessions` (load `references/sessions.md`).
- "which pages are slow / broken / get the most traffic", web vitals
  (LCP/CLS/INP), multi-URL navigation paths between specific pages, one-hop
  predecessor/successor ("what page comes before/after /X") →
  `noibu_get_page_visits` (load `references/page-visits.md`).
- Quantitative click or scroll questions, or "show me the clickmap/scrollmap" →
  load `references/page-visits.md`.
- Page-CATEGORY journey patterns across many sessions (e.g., "shapes leading
  into the Cart page group", "common multi-step browsing patterns"), OR an
  explicit request to watch a session replay → load
  `references/journeys-and-replay.md`.
- "Show / chart / visualize the conversion funnel", "checkout funnel chart",
  "purchase journey chart" → load `references/funnel-visualization.md`.
  It is a renderer only; fetch the per-step session counts from
  `noibu_search_sessions` (or `noibu_get_page_visits`) first.
- Errors / bugs / crashes — only when the user EXPLICITLY asks. Load
  `references/errors.md`. Not a generic "what to fix" entrypoint.
- Connect / disconnect / list integrations → load `references/integrations.md`.
- Pasted `console.noibu.com` URL → load `references/console-urls.md`.

**Within page-visits — pair metrics and visual when both help. Rows assume a URL is in scope:**

| User verb | Tool |
|---|---|
| "how many clicks on /url", "top clicked on /url", "which CTA on /url" | `noibu_get_page_visits` |
| "% scroll to … on /url", "avg scroll depth on /url", "reach footer on /url" | `noibu_get_page_visits` |
| "show the clickmap for /url" | `noibu_visualize_page_visits` (`visualization.clickMap`) |
| "show the scrollmap for /url" | `noibu_visualize_page_visits` (`visualization.scrollMap`) |
| "How many sessions reached cart / checkout / payment", "conversion-funnel step counts" | `noibu_search_sessions` |
| "Show / chart / visualize the conversion funnel", "checkout funnel chart" | load `references/funnel-visualization.md` (renderer; expects step+sessions data already fetched) |

**No URL**: site-wide click prompts ("top CTAs", "what users click most") → `noibu_search_sessions`'s `CLICKED_TEXT`. Scroll has no site-wide equivalent — stay on `noibu_get_page_visits`. If scope is unclear, ask.

Prefer `noibu_visualize_page_visits` over hand-rolled SVG, chart libraries, or other generic visualizations — the iframe IS the visualization.

## Sessions vs page visits

Use `noibu_search_sessions` when the question is about the session as a whole:

- "What's our checkout completion rate?" → Sessions (CHECKOUT_COMPLETED, SESSION_ID)
- "Which products are added to cart most?" → Sessions (ADDED_TO_CART_PRODUCT_TITLES collection)
- "Sessions by traffic source?" → Sessions (UTM_SOURCE, UTM_MEDIUM)
- "Average order value by country?" → Sessions (CHECKOUT_COMPLETE_TOTAL_VALUE, COUNTRY_CODE)
- "Which discount codes are used most?" → Sessions (CHECKOUT_COMPLETE_DISCOUNT_CODES_APPLIED collection)
- "What are people searching for?" → Sessions (SEARCH_QUERIES collection)
- "How many people bounce?" → Sessions (BOUNCED)
- "What CTAs are users clicking most across the site?" → Sessions (CLICKED_TEXT collection, GROUP_ARRAY_10)
- "What's the user's navigation path in this session?" → Sessions (PAGE_VISIT_URLS collection, ordered)

Use `noibu_get_page_visits` when the question is about individual pages, performance, UX, or cohort-level "what did this user do" narratives:

- "Which pages get the most traffic?" → Page Visits (URL, COUNT of PAGE_VISIT_ID)
- "Average time on product pages?" → Page Visits (PAGE_VISIT_DURATION, filter/segment by URL)
- "Which landing pages lead to conversion?" → Page Visits (IS_LANDING_PAGE=true, CHECKOUT_COMPLETED, segment by URL)
- "Which pages are slow?" → Page Visits (**QUANTILE_75** of LCP / INP / CLS per URL — p75 is the canonical web-vitals statistic, matching the Noibu Console)
- "Where are users abandoning?" → Page Visits (IS_EXIT_PAGE=true, segment by URL)
- "What pages do bouncers see?" → Page Visits (SESSION_BOUNCED=true, segment by URL)
- "Cohort behaviour for sessions with UTM_SOURCE=x" → Page Visits filtered by SESSION_UTM_SOURCE (UTM and other session-level context is denormalized onto each page visit — no JOIN needed)

Web vitals (LCP, CLS, INP, FCP, TTFB, FID) and `VISUAL_ERROR_COUNT` live on Page Visits — these are the primary lens for performance / "slow" / "broken feeling" / UX-quality questions. Do NOT route these to error tools.

For full field references, load `references/sessions.md` or `references/page-visits.md`.

## Lead with analytics

Most users are asking business questions about their site performance, not
technical questions about errors. Lead with analytics.

- "What are my top opportunities?" → Start with session and page visit analytics
  (conversion trends, cart abandonment, traffic source performance, page engagement,
  device/browser breakdowns). Errors are one type of opportunity but not the only
  or primary type.
- "Why is checkout broken?" → Could be analytics or technical. Start with analytics
  to understand the scope (is it all users or a specific segment? when did it start?).
  Ask the user if they want to dig into specific errors, or continue exploring the
  data patterns.
- "How is my site performing?" → Analytics first (sessions, page visits, time series).
- "What errors are happening?" → Now it's explicitly technical. Load `references/errors.md`.

The pattern: analytics tools discover patterns and frame the problem. Error tools
explain root causes. Always start with analytics unless the user explicitly asks
about errors, bugs, or specific errors. When in doubt, ask the user whether they
want to explore the data or investigate specific errors.

## Domain Resolution Flow

1. If the user provided a domain UUID, use it directly — skip `noibu_get_domain` and `noibu_list_domains`.
2. If no UUID but the user provided a domain name, call `noibu_get_domain` to resolve it.
3. If `noibu_get_domain` returns no match or errors, fall back to `noibu_list_domains` to show available domains and let the user select one.

**noibu_get_domain** — Look up a single domain by name. Exact match only. Accepts bare names or full URLs; tolerates `www.`, scheme, path, query, fragment, and trailing dot. Typos do NOT auto-resolve — on miss, errors with `NotFound` and surfaces up to 3 nearest permitted domain names in `errors[0].extensions.suggestions`. Surface those to the user verbatim and let them pick; never silently substitute a suggestion. If suggestions are empty, fall back to `noibu_list_domains`.

**noibu_list_domains** — List domains the user has access to. Call this when no domain UUID or name is available, or as a fallback when `noibu_get_domain` returns no match.

## The `rationale` argument

Every `noibu_*` tool accepts a `rationale` argument. **Always populate it.** It
is a one-sentence description of why the tool is being called RIGHT NOW, phrased
from the user's perspective.

- Good: `rationale: "User asked which checkout CTAs convert best on mobile, fetching clickmap for /checkout"`
- Good: `rationale: "Following up on the cart-abandonment spike — pulling page visits to find where users drop off"`
- Bad: `rationale: "calling tool"` (says nothing)
- Bad: `rationale: "to get data"` (says nothing)

Noibu engineers cannot see the chat. The rationale is the only signal we have
to understand what people are actually trying to do, so make it specific to the
user's question. The call will succeed without it, but please include one on
every call.

## Query Constraints

- Row caps: `noibu_search_sessions` returns up to 100 rows; `noibu_get_page_visits` up to 1500.
- ⚠ `orderBy` is REQUIRED at the `input` level, NOT inside `queryInput`. Note: `measures`/`groupBy`/`filters` all live inside `queryInput` — only `orderBy` is hoisted to the input level. Without `orderBy`, the row cap returns arbitrary rows and aggregates are silently wrong.
- Each measure must be unique by (fieldName, measureFunc).
- For time series: resolution options are MINUTE, HOUR, DAY, WEEK. Pick based on range: last 24h → HOUR, last 7d → DAY, last 90d → WEEK.
- `HAS_DISCOUNT` is only populated once a discount code is applied at checkout. Be careful comparing `HAS_DISCOUNT=true` vs `false` — there is survivorship bias.

## Reporting blockers

**noibu_send_feedback** — Submit feedback to Noibu when you (the AI) are confused or blocked. Records a structured log entry tagged with the user's identity so the Noibu team can investigate failures happening in real chat sessions.

Use when:
- You don't know how to answer the user's question with the available tools
- A Noibu tool returned an unexpected error you can't recover from
- The tool descriptions or instructions seem ambiguous, wrong, or incomplete
- You're going in circles and want to flag the conversation for review

Inputs: `category` (`confused` | `blocked`), `intent` (what YOU — the AI — were trying to do and why, the tool or step you reached for, and where you got stuck), `message` (your description of the issue itself), and optional `context` (what the user was trying to do). Always populate `intent` — without it the Noibu team can only see that something went wrong, not why you took the path you did. Calling this tool does NOT replace answering the user — still do your best to help them after submitting feedback.

## Topic references

Load exactly one reference based on the topic of the user's question. Each file contains tool-specific field semantics, worked examples, and constraint nuances that aren't needed in every conversation.

| When the user asks about… | Read |
|---|---|
| Session-level analytics (conversion rate, revenue, AOV, traffic sources, bounce, search, products, time-series trends) | `references/sessions.md` |
| Page-level analytics (per-page traffic, time on page, web vitals, landing/exit pages, visual errors, scroll depth, click/scroll behaviour, cohort behaviour by URL) — also clickmap/scrollmap visualizations | `references/page-visits.md` |
| Rendering an ecommerce conversion funnel as a chart ("show the funnel", "checkout funnel chart") | `references/funnel-visualization.md` |
| Multi-step journey shape patterns across many sessions, OR an explicit request to watch a session replay | `references/journeys-and-replay.md` |
| Errors, bugs, issues, crashes, stack traces, revenue-loss projections, or "what's the priority" / "what to fix" once analytics has pointed at errors | `references/errors.md` |
| Connecting, disconnecting, listing, or checking the status of third-party integrations | `references/integrations.md` |
| A pasted `console.noibu.com` URL (or any question requiring console-URL parsing or the console-link policy) | `references/console-urls.md` |
