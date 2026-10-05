# Noibu query battery (lean, two batches)

Run against the resolved domain UUID over the analysis window (default: last
30 full days). Four small readiness reads first (Block 2), then exactly two
batches; every query inside a batch runs in parallel. Every query needs `orderBy` inside `queryInput`, and each query's
measures must be unique by (target, measureFunc) — duplicates are silently
dropped. Always pass a specific `rationale`.

One extra follow-up query after Batch 2 is allowed only when a result cannot
be interpreted without it (for example, an unexpected URL pattern that splits
a template across two paths). Do not run exploratory queries. The limits
below are the most rows synthesis ever uses; do not raise them, and never
ask for measures a candidate cannot use (each row's JSON is context for
the rest of the run).

## Call shapes (copy these; do not guess the JSON)

Every analytics call is `{domainId, rationale, input}` with `input` =
`{"periodOptions": {"dateTimeRange": {"startTime": "<ISO>", "endTime":
"<ISO>"}}, "queryInput": {...}}`. Inside `queryInput`:

- `measures`: each item is exactly one of
  `{"aggregate": {"measureFunc": "COUNT", "target": {"field": "SESSION_ID"}, "measureAlias": "sessions"}}`,
  `{"predefined": {"measure": "CONVERSION_RATE", "measureAlias": "cr"}}`
  (the key is `measure`, not `metric`; sessions allow BOUNCE_RATE,
  CONVERSION_RATE, DISCOUNT_RATE, REVENUE_PER_SESSION; page visits allow
  ADD_TO_CART_RATE, CONVERSION_RATE, CLICK_RATE, BOUNCE_RATE), or a
  `computed`. A filtered aggregate carries its own `filters` inside the
  aggregate: `{"aggregate": {"measureFunc": "UNIQ", "target": {"field":
  "SESSION_ID"}, "measureAlias": "atcSessions", "filters": [{"fieldName":
  "CONVERSION_FUNNEL_DEPTH", "operator": "GREATER_THAN_OR_EQUALS",
  "comparisonValues": ["1"]}]}}`.
- `filters`: `[{"fieldFilter": {"fieldName": "DEVICE_TYPE", "operator":
  "IS_ANY_OF", "comparisonValues": ["MOBILE"]}}]` (never a bare
  `field`/`values` pair); a collection filter is `{"collectionFilter":
  {"collection": "...", "operator": "CONTAINS_ANY", "comparisonValues":
  [...]}}`.
- `groupBy`: `{"fieldSegments": ["DEVICE_TYPE", "CONVERSION_FUNNEL_DEPTH"]}`
  (plain strings) or `{"arrayJoin": {"arrayJoinCollection": "CLICKED_TEXT"}}`;
  both may be combined.
- `orderBy`: `{"measureAlias": "sessions", "direction": "DESCENDING"}`,
  always; `limit` as the battery says.

`noibu_list_domains` takes `companyId` and `pagination: {"limit": 50,
"offset": 0}` (offset is required). `noibu_list_priority_errors` takes
`days: "LAST30_DAYS"` (`"LAST90_DAYS"` when the window was widened to 90
days); it has no `period` argument. `noibu_list_ab_tests` takes only `domainId`.
Each battery entry below ends with its `queryInput` in this shape; the
envelope is the same for all of them. A schema error costs a round trip
and, worse, tempts a load of the 30k-token tool schema: copy the shape.

## Readiness (Block 2, one message, four parallel reads; decides whether the battery runs)

These are reads, not a batch: each returns a handful of rows. SKILL.md
Block 2 says what each outcome means; this section says what to call.

- **R1 Data connection** — `noibu_check_data_connection` with the domain
  UUID. `isReceivingData: false` ends the run.
- **R2 Funnel depth** — `noibu_search_sessions` over the window, groupBy
  CONVERSION_FUNNEL_DEPTH, COUNT(SESSION_ID), orderBy COUNT desc, limit 10.
  The sum of the rows is the session count; a single row with depth null
  means no cart or checkout event was ever recorded. Keep the rows: they
  are also the numerator for the metric-volume lines (below) and they
  double as Batch 1 #3 when the run is thin on time.
  `{"measures":[{"aggregate":{"measureFunc":"COUNT","target":{"field":"SESSION_ID"},"measureAlias":"sessions"}}],"groupBy":{"fieldSegments":["CONVERSION_FUNNEL_DEPTH"]},"orderBy":{"measureAlias":"sessions","direction":"DESCENDING"},"limit":10}`
- **R3 Siblings** — `noibu_list_domains` with `companyId` set to the
  resolved domain's `companyId`, `pagination: {"limit": 50, "offset": 0}`. Name any sibling
  that is a `checkout.` or `shop.` host, or a `www.` twin of the domain;
  a sibling's traffic is one extra R2 only when the domain itself fails
  the session floor (to offer the right domain instead).
- **R4 Business context** — `noibu_get_business_context`. Null is a
  caveat, not a stop. When present, its brand-voice section governs the
  page's wording and its facts are leads for the walkthrough to confirm.

## Batch 1 — Baseline (always, all in parallel; nothing here depends on anything)

1. *(moved to Readiness R4)*
2. **Device baseline** — `noibu_search_sessions`, groupBy DEVICE_TYPE.
   Measures: COUNT(SESSION_ID), predefined CONVERSION_RATE, predefined
   BOUNCE_RATE, predefined REVENUE_PER_SESSION,
   MEDIAN(CHECKOUT_COMPLETE_TOTAL_VALUE).
   **Country sibling, same message:** the same measures groupBy
   COUNTRY_CODE, orderBy COUNT desc, limit 10. Two jobs: it is the
   multi-market signal (SKILL.md "Multi-market stores": two or more
   countries above about 10% of sessions with conversion rates that
   differ severalfold), and it exposes a blank-country row that carries
   real volume at near-zero conversion, which is excluded from every
   baseline the page cites.
   `{"measures":[{"aggregate":{"measureFunc":"COUNT","target":{"field":"SESSION_ID"},"measureAlias":"sessions"}},{"predefined":{"measure":"CONVERSION_RATE","measureAlias":"cr"}},{"predefined":{"measure":"BOUNCE_RATE","measureAlias":"bounce"}},{"predefined":{"measure":"REVENUE_PER_SESSION","measureAlias":"rps"}},{"aggregate":{"measureFunc":"MEDIAN","target":{"field":"CHECKOUT_COMPLETE_TOTAL_VALUE"},"measureAlias":"aov"}}],"groupBy":{"fieldSegments":["DEVICE_TYPE"]},"orderBy":{"measureAlias":"sessions","direction":"DESCENDING"},"limit":10}`
   (country sibling: the same with `"fieldSegments":["COUNTRY_CODE"]`)
3. **Funnel distribution** — `noibu_search_sessions`, groupBy
   [DEVICE_TYPE, CONVERSION_FUNNEL_DEPTH], COUNT(SESSION_ID). Depth key:
   null/0 = no progression, 1 = added to cart, 2 = checkout started,
   3 = payment info, 4 = completed. Derive add-to-cart rate, cart→checkout
   rate, and checkout completion. Size the largest leak in sessions/month.
   `{"measures":[{"aggregate":{"measureFunc":"COUNT","target":{"field":"SESSION_ID"},"measureAlias":"sessions"}}],"groupBy":{"fieldSegments":["DEVICE_TYPE","CONVERSION_FUNNEL_DEPTH"]},"orderBy":{"measureAlias":"sessions","direction":"DESCENDING"},"limit":20}`
4. **Checkout instrumentation check** — `noibu_search_sessions`, groupBy
   DEVICE_TYPE, SUM of CHECKOUT_STARTED_COUNT,
   CHECKOUT_CONTACT_INFO_SUBMITTED_COUNT, PAYMENT_INFO_SUBMITTED_COUNT,
   CHECKOUT_COMPLETE_COUNT. If completion counters are zero across the
   window, checkout conversion rate cannot be a primary metric on this
   domain — note this once in the document, on the affected tests only (and
   at delivery if the chosen goal was checkout completes).
   `{"measures":[{"aggregate":{"measureFunc":"SUM","target":{"field":"CHECKOUT_STARTED_COUNT"},"measureAlias":"started"}},{"aggregate":{"measureFunc":"SUM","target":{"field":"CHECKOUT_CONTACT_INFO_SUBMITTED_COUNT"},"measureAlias":"contact"}},{"aggregate":{"measureFunc":"SUM","target":{"field":"PAYMENT_INFO_SUBMITTED_COUNT"},"measureAlias":"payment"}},{"aggregate":{"measureFunc":"SUM","target":{"field":"CHECKOUT_COMPLETE_COUNT"},"measureAlias":"complete"}}],"groupBy":{"fieldSegments":["DEVICE_TYPE"]},"orderBy":{"measureAlias":"started","direction":"DESCENDING"},"limit":10}`
5. **Top pages by device, with scroll reach** — `noibu_get_page_visits`,
   run as TWO parallel queries in this batch, one filtered DEVICE_TYPE =
   MOBILE and one DEVICE_TYPE = DESKTOP, each groupBy URL, orderBy COUNT
   desc, limit 25 (a single query grouped by [URL, DEVICE_TYPE] returns
   almost only mobile rows on a mobile-heavy store and leaves desktop
   unmeasured). Measures: COUNT(PAGE_VISIT_ID), predefined
   ADD_TO_CART_RATE, predefined CONVERSION_RATE,
   MEDIAN(PAGE_VISIT_DURATION), QUANTILES(MAX_SCROLL_DEPTH_RATIO),
   MEDIAN(MAX_PAGE_HEIGHT), MEDIAN(VIEWPORT_HEIGHT), SUM(IS_EXIT_PAGE).
   Together they give the top pages per device plus what the median
   visitor actually sees (p50 scroll × page height vs viewport height).
   A row with page height 0 or duration 0 is unmeasured for scroll (the
   template does not report it), never "everyone sees the whole page";
   say "scroll not measurable on this template" if a candidate depends on
   it. This replaces the old separate top-pages and scroll-reach queries
   and the mobile scrollmap; do not run those. The top `/collections/`
   and `/products/` URLs in the mobile list are also the pages the site
   read's Batch B visits (`references/site-validation.md`).
   `{"measures":[{"aggregate":{"measureFunc":"COUNT","target":{"field":"PAGE_VISIT_ID"},"measureAlias":"visits"}},{"predefined":{"measure":"ADD_TO_CART_RATE","measureAlias":"atc"}},{"predefined":{"measure":"CONVERSION_RATE","measureAlias":"cr"}},{"aggregate":{"measureFunc":"MEDIAN","target":{"field":"PAGE_VISIT_DURATION"},"measureAlias":"dur"}},{"aggregate":{"measureFunc":"QUANTILES","target":{"field":"MAX_SCROLL_DEPTH_RATIO"},"measureAlias":"scroll"}},{"aggregate":{"measureFunc":"MEDIAN","target":{"field":"MAX_PAGE_HEIGHT"},"measureAlias":"height"}},{"aggregate":{"measureFunc":"MEDIAN","target":{"field":"VIEWPORT_HEIGHT"},"measureAlias":"vh"}},{"aggregate":{"measureFunc":"SUM","target":{"field":"IS_EXIT_PAGE"},"measureAlias":"exits"}}],"filters":[{"fieldFilter":{"fieldName":"DEVICE_TYPE","operator":"IS_ANY_OF","comparisonValues":["MOBILE"]}}],"groupBy":{"fieldSegments":["URL"]},"orderBy":{"measureAlias":"visits","direction":"DESCENDING"},"limit":25}`
   (desktop: the same with `["DESKTOP"]`)
6. **Priority errors** — `noibu_list_priority_errors`, `days:
   "LAST30_DAYS"`. These are confounders and "Fix first" notes, not test
   ideas. Revenue figures are projections; hedge if cited.
7. **Abandoner exits** — sessions filtered CONVERSION_FUNNEL_DEPTH = 1,
   groupBy [EXIT_URL, DEVICE_TYPE], COUNT, limit 15. Where cart abandoners
   give up.
   `{"measures":[{"aggregate":{"measureFunc":"COUNT","target":{"field":"SESSION_ID"},"measureAlias":"sessions"}}],"filters":[{"fieldFilter":{"fieldName":"CONVERSION_FUNNEL_DEPTH","operator":"EQUALS","comparisonValues":["1"]}}],"groupBy":{"fieldSegments":["EXIT_URL","DEVICE_TYPE"]},"orderBy":{"measureAlias":"sessions","direction":"DESCENDING"},"limit":15}`
8. **Page groups** — `noibu_search_sessions`, groupBy
   arrayJoin(VISITED_PAGE_GROUPS), COUNT(SESSION_ID), orderBy COUNT desc,
   limit 20. Two jobs: it lists the domain's page group names exactly as
   the product knows them (the Success metric "Viewed page: page group
   <name>" must use these spellings), and sessions-that-reached-a-group ÷
   all sessions (#2) is the baseline for every page-group goal, including
   checkout starts. A result dominated by `No Page Group` means page groups
   are not configured: write Viewed page metrics against URLs instead.
   `{"measures":[{"aggregate":{"measureFunc":"COUNT","target":{"field":"SESSION_ID"},"measureAlias":"sessions"}}],"groupBy":{"arrayJoin":{"arrayJoinCollection":"VISITED_PAGE_GROUPS"}},"orderBy":{"measureAlias":"sessions","direction":"DESCENDING"},"limit":20}`

## Batch 2 — Deep-dive (filters come from Batch 1)

9. **Click text on the key surfaces** (replaces the clickmap) — ONE page
   visits query filtered URL IS_ANY_OF the goal's surfaces (the top
   collection page and top product page from #5, the homepage, and /cart
   for cart and checkout goals), groupBy [URL] plus arrayJoin(CLICKED_TEXT),
   COUNT, limit 60, so one call covers every surface. Read as a ranked
   list of what shoppers do per page: popup dismissals outranking shopping
   actions, estimator/filter usage, detail-tab reads versus add clicks,
   checkout CTA volume.
   `{"measures":[{"aggregate":{"measureFunc":"COUNT","target":{"field":"PAGE_VISIT_ID"},"measureAlias":"clicks"}}],"filters":[{"fieldFilter":{"fieldName":"URL","operator":"IS_ANY_OF","comparisonValues":["/","/collections/<top>","/products/<top>"]}}],"groupBy":{"fieldSegments":["URL"],"arrayJoin":{"arrayJoinCollection":"CLICKED_TEXT"}},"orderBy":{"measureAlias":"clicks","direction":"DESCENDING"},"limit":60}`
10. **Landing attribution for underperformers** — only when #5 shows a
   high-traffic URL with near-zero ATC: sessions filtered LANDING_URL
   STARTS_WITH that path, groupBy [UTM_SOURCE, UTM_MEDIUM], COUNT,
   BOUNCE_RATE, and a filtered UNIQ(SESSION_ID) at CONVERSION_FUNNEL_DEPTH
   ≥ 1. A paid-cold cohort converting at a fraction of warm traffic on the
   same URL is a landing-experience candidate (label it correlational);
   a paid cohort landing on an expired campaign page is a fix, not a test.
   `{"measures":[{"aggregate":{"measureFunc":"COUNT","target":{"field":"SESSION_ID"},"measureAlias":"sessions"}},{"predefined":{"measure":"BOUNCE_RATE","measureAlias":"bounce"}},{"aggregate":{"measureFunc":"UNIQ","target":{"field":"SESSION_ID"},"measureAlias":"atcSessions","filters":[{"fieldName":"CONVERSION_FUNNEL_DEPTH","operator":"GREATER_THAN_OR_EQUALS","comparisonValues":["1"]}]}}],"filters":[{"fieldFilter":{"fieldName":"LANDING_URL","operator":"STARTS_WITH","comparisonValues":["/pages/<path>"]}}],"groupBy":{"fieldSegments":["UTM_SOURCE","UTM_MEDIUM"]},"orderBy":{"measureAlias":"sessions","direction":"DESCENDING"},"limit":10}`
11. **Optional queries** — run inside Batch 2, never as a third batch, and
    only when a candidate depends on one or the goal lens below calls for
    it:
    - **Mobile web vitals** — page visits filtered DEVICE_TYPE = MOBILE and
      URL IS_ANY_OF [candidate surfaces], groupBy URL: COUNT,
      QUANTILE_75(LCP), QUANTILE_75(INP), QUANTILE_75(CLS). p75 only.
      Thresholds: LCP 2500ms good / 4000ms poor; CLS 0.1 / 0.25; INP 200ms
      / 500ms. Poor vitals on a test surface become a "Fix first" note.
      `{"measures":[{"aggregate":{"measureFunc":"COUNT","target":{"field":"PAGE_VISIT_ID"},"measureAlias":"visits"}},{"aggregate":{"measureFunc":"QUANTILE_75","target":{"field":"LCP"},"measureAlias":"lcp"}},{"aggregate":{"measureFunc":"QUANTILE_75","target":{"field":"INP"},"measureAlias":"inp"}},{"aggregate":{"measureFunc":"QUANTILE_75","target":{"field":"CLS"},"measureAlias":"cls"}}],"filters":[{"fieldFilter":{"fieldName":"DEVICE_TYPE","operator":"IS_ANY_OF","comparisonValues":["MOBILE"]}},{"fieldFilter":{"fieldName":"URL","operator":"IS_ANY_OF","comparisonValues":["/","/collections/<top>","/products/<top>"]}}],"groupBy":{"fieldSegments":["URL"]},"orderBy":{"measureAlias":"visits","direction":"DESCENDING"},"limit":10}`
    - **Search cohort** — sessions filtered SEARCH_COUNT ≥ 1, groupBy
      DEVICE_TYPE: COUNT, CONVERSION_RATE, and a filtered UNIQ(SESSION_ID)
      at CONVERSION_FUNNEL_DEPTH ≥ 1. If it returns zero rows, search
      is not instrumented on this domain; drop all search candidates
      without comment.
      `{"measures":[{"aggregate":{"measureFunc":"COUNT","target":{"field":"SESSION_ID"},"measureAlias":"sessions"}},{"predefined":{"measure":"CONVERSION_RATE","measureAlias":"cr"}},{"aggregate":{"measureFunc":"UNIQ","target":{"field":"SESSION_ID"},"measureAlias":"atcSessions","filters":[{"fieldName":"CONVERSION_FUNNEL_DEPTH","operator":"GREATER_THAN_OR_EQUALS","comparisonValues":["1"]}]}}],"filters":[{"fieldFilter":{"fieldName":"SEARCH_COUNT","operator":"GREATER_THAN_OR_EQUALS","comparisonValues":["1"]}}],"groupBy":{"fieldSegments":["DEVICE_TYPE"]},"orderBy":{"measureAlias":"sessions","direction":"DESCENDING"},"limit":10}`
    - **Existing tests** — `noibu_list_ab_tests` for the domain, no status
      filter, once per run, inside Batch 2. Any RUNNING or DRAFT test on a
      candidate's surface becomes that card's overlap line; a STOPPED test
      with the same idea is one clause in `why` ("a similar test ran in
      <month>; check its result in the console before repeating it").

## Goal lens (which results carry the argument for each goal)

The battery is the same for every goal; what changes is which numbers
decide candidates and which optional query earns its place. Read with the
goal in front of you so the candidates you carry forward act on the goal's
metric, not on whatever gap happened to be largest.

| Goal (success metric) | Decisive results | Optional query worth running in Batch 2 |
| --- | --- | --- |
| Add to cart rate | #3 depth 0→1 by device; #5 ATC rate by URL and device, scroll reach vs page height on PDPs; #9 clicks on the top collection page | Mobile web vitals on the top PDPs |
| Checkout starts (Viewed page: page group Checkout) | #3 depth 1→2 and #8 Checkout-group reach as the baseline; #7 where cart abandoners exit; #9 clicks on /cart (checkout CTA volume vs promo/estimator/popup clicks) | None usually; the cart click list is the story |
| Checkout conversion rate | #4 first (zero completion counters means the goal is not measurable here: say so once and ship against checkout starts); #3 depth 2→4 by device; #7 exits at checkout URLs | Mobile web vitals on checkout URLs |
| Product page views (Viewed page: page group Product) | #8 Product-group reach as the baseline; #5 collection and homepage exits and scroll reach; #9 clicks on the top collection page (sort, filters, cards, quick-add) | Search cohort |
| Collection page views (Viewed page: page group Collection) | #8 Collection-group reach as the baseline; #5 homepage scroll reach vs where collection links sit; #10 landing attribution for cold traffic that never reaches a collection | Search cohort |
| Viewed page: <URL> | #5 for that URL and the pages that link to it; #9 clicks on the top linking page; #10 for that URL when it is a landing page | None |
| All goals | Everything, ranked by evidence × exposure × effect | At most one, only if a candidate depends on it |

## Metric volume (the traffic line on every card)

The page never states a duration, a sample size or an expected lift: the
product computes "About N days to reach a verdict" from real traffic once a
draft exists, and its gates (per `querying-noibu-data/references/ab-tests.md`:
500 sessions and 25 conversions per variation, and 7 days, before anything
is compared) are the only ones that count. What the card states instead is
the measured weekly volume of the event the success metric counts, inside
the test's targeting, so the reader can see at a glance that one metric has
ten times the events of another:

| Success metric | Weekly events = (sessions in the window that ...) ÷ weeks in the window |
| --- | --- |
| Add to cart rate | reached funnel depth ≥ 1 (R2 or #3), in the targeting's device rows |
| Checkout conversion rate | reached funnel depth 4 (R2 or #3) |
| Viewed page: page group <name> | reached that page group (#8) |
| Viewed page: <URL> | visited that URL (#5, or one extra page-visit COUNT filtered to the URL when #5 did not list it) |

Round to two significant figures and write the line as "About 1,700
add-to-cart sessions a week in this targeting. Noibu shows the days to a
verdict at setup." For a UTM-targeted test, filter the count to the UTM
condition (one extra query is allowed for this, inside Batch 2). When two
supported metrics are both defensible for a candidate, the one with more
weekly events is the recommendation and the other is a one-clause note.

## Reading the results

For every number you plan to cite, ask: what is it being compared to, and is
the comparison fair? Sale collections out-perform full-price ones partly on
price intent; email audiences out-convert paid partly on warmth. These gaps
still justify tests — the test is how you find out how much transfers — but
the write-up must say so, in one clause, not a paragraph.
