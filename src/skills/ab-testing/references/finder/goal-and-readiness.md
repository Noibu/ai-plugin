## The metric catalogue (read from Noibu every run)

Noibu adds and retires A/B metrics from time to time, so the skill never
works from a fixed list. The catalogue is read from the
`noibu_create_ab_test` schema that Block 1's `ToolSearch` returns (the
tool is loaded only so its schema can be read; this skill never calls it):

- **Primary metrics** = the enum of `successMetric.metric`.
- **Secondary metrics** = the enum of `secondaryMetrics[].metric`, and how
  many are allowed = that array's `maxItems`.
- **Page-scoped metrics** = the metrics the schema's `pageUrl` /
  `pageGroup` descriptions name (today PAGE_VIEW_TO_URL_RATE): only these
  take a page URL or page group, and they need exactly one of the two.
- **Not in the console (excluded):** a few codes the MCP accepts have no
  matching option on the console's create screen, so a draft made with
  one could not be shown or edited there. They are dropped from both
  lists before anything else reads the catalogue: never a goal, never a
  success or secondary metric. Today: **REVENUE_PER_SESSION**. This list
  is maintained by hand in this file; the console is never checked at run
  time. A person who asks to improve an excluded metric is told in one
  clause that Noibu can't run a test on it yet and offered the nearest
  goal (for revenue per session: Increase checkout completes, with
  Average order value as a secondary metric).
- **Bounce rate (dormant until the MCP offers it):** the console has
  "Bounce rate on page" (lower is better), but the MCP does not expose it
  yet. The skill switches it on by itself the first run a primary enum
  value contains `BOUNCE` (for example BOUNCE_RATE_ON_PAGE): that code is
  the bounce metric, used verbatim. Until then nothing about bounce rate
  appears on the goal card, its fallback or the page. Everything it needs
  once live is already written: the goal and its pages question below,
  the label in `references/output-format.md`, the `createInput` row in
  `references/create-drafts.md`, the goal lens and volume rows in
  `references/noibu-query-battery.md`, and the site reads in
  `references/site-validation.md`. If the schema does not list it as
  page-scoped, treat it as domain-wide: no pages question, no
  `pageUrl`/`pageGroup`.

Hold the catalogue for the whole run; every goal offered, every success
and secondary metric written on the page, and every `createInput` comes
from it and nothing else. A metric code is written exactly as the enum
spells it. If the schema cannot be read (the tool is missing from the
`ToolSearch` result), use the last-known catalogue in
`references/create-drafts.md`, and put one footer line on the page saying
the metric list could not be confirmed against Noibu.

Labels: a known code uses its label from the table in
`references/output-format.md` ("Success metric"); a code that table does
not list is new, so build its label from the enum value in plain words
(AVERAGE_ORDER_VALUE → "Average order value") and, when the schema
describes it, from that description. A code in that table that is no
longer in the catalogue is retired: never offer or write it. A metric is
"Increase" unless it is one where lower is better (bounce rate, or a new
code whose schema description says decrease): those are "Reduce".

## The goal question (Block 2)

Ask what the user is trying to move before pulling any data, because the
goal decides which gaps count as candidates, which success metric every
test uses, and which site surfaces need a closer look. Goals are built
from the catalogue's primary metrics, so a chosen goal maps directly onto
the Success metric field:

- each non-page-scoped primary metric is one goal, "Increase <label>"
  (today: add to cart rate; checkout completes for
  CHECKOUT_CONVERSION_RATE). Every primary metric left after the console
  exclusions is offered; none is held back;
- a metric the catalogue lists only as secondary (today
  AVERAGE_ORDER_VALUE) is never a goal, because the create tool rejects
  it as a success metric. A person who asks to raise it is offered
  Increase checkout completes as the goal, with average order value as a
  secondary metric, and told so in one clause;
- the bounce metric, once the catalogue has one, is the goal "Reduce
  bounce rate" (page-scoped: it asks "Which pages?" like page views);
- the page-scoped metric gives the page-view goals: "Increase checkout
  starts" (page group Checkout, or the checkout URL) and "Increase page
  views" (product pages, collection pages, or one specific page). Page
  group names come from the domain's own data (Batch 1 query #8);
- "Not sure / show me everything" = "All goals": rank across every
  catalogue primary metric.

Ask with the **goal card**, a `show_widget` card, in the Block 2 message
(the widget tools were loaded in Block 1; call `mcp__visualize__read_me`
once, module `interactive`, silently, if this chat has not called it
yet). The card has one heading, "What do you want these tests to
improve?", and one button per goal above, label only: no line of
explanation under any button. Each goal's label already says what it
measures ("Increase add to cart rate"), so a subtitle would only repeat
it in more words, and this card sits at the top of the run where the
person wants to pick and move on. The same card chrome is used for
SKILL.md's pick-an-existing-test card, so the two read as one family;
its HTML and rules are in `references/choice-cards.md` ("The goal
card"). Include every catalogue goal: the card has no four-option limit,
so a new metric gets its own button. "Not sure / show me everything" is
always the last button. On a store found to be split-checkout (readiness),
checkout goals are switched off as Block 2 describes. If `show_widget` is
missing or the call fails, fall back to one `AskUserQuestion` with the
same labels in the same order and no descriptions (at most four options;
name any further goals in the question text for the user to type under
Other).

Only a page-views answer needs a second question. The other goals already
name their success metric outright, so a "which pages?" question next to
them is noise the user has to dismiss with "not applicable", and it
suggests the skill did not understand what they picked. So:

- Answer is Increase page views: ask "Which pages?" in the readiness
  message (it depends on the first answer) with the same card chrome
  (`references/choice-cards.md`, "The pages card"): Product pages ·
  Collection pages · A specific page. A "specific page" answer gets one
  plain-text follow-up for the URL in the next message.
- Answer is Reduce bounce rate (only offered once the bounce metric is
  live): ask "Which pages?" the same way with the bounce pages card
  (`references/choice-cards.md`, "The pages card"): Homepage · Product
  pages · Collection pages · A specific page. When the bounce metric is
  not page-scoped, no second question.
- Answer is any other goal, "not sure", or anything typed instead of a
  click: no second question. Proceed with the goal set.

The buttons send a fixed phrase as the person's next message
("Improve add to cart rate", "Show me everything"); match that phrase, or
any paraphrase, to the goal. A typed reply that names a metric in the
catalogue is that goal; one that names nothing measurable is "All goals".

Skip the question when the prompt already states the goal, as long as
that goal's metric is in the catalogue ("find tests to
get more people into checkout" is the checkout-starts goal; "our add to cart
rate is bad" is Add to cart rate; "make more money per visitor" or "raise
basket size" is excluded (offer checkout completes, as above); "fewer
people leaving the homepage" is Reduce bounce rate: Homepage, once the
bounce metric is live (before that, say in one clause that Noibu can't
run a bounce-rate test yet and offer Increase page views: Product pages);
"more traffic to our collection pages"
is page views: Collection, with no follow-up needed; "what should we test"
with no metric is a reason to ask). In an unattended or scheduled run, or
if neither `show_widget` nor the question tool is available, default to
"All goals", say so in a footer line on the page, and carry on.

The goal then shapes three things: which battery results are decisive
(the "Goal lens" table in `references/noibu-query-battery.md`; a new
catalogue metric with no row there has no lens, so its candidates are
ranked on evidence that acts on it directly and its traffic line says the
volume is shown at setup), which
conditional site stops to plan for (`references/site-validation.md`), and
the inclusion rule in Phase 3 that every shipped test uses the goal's
metric. A checkout-completes goal on a domain whose completion counters
are zero (Batch 1 check #4) cannot be measured; say so in a `caveats` line
(quiet-mode rule 6) and ship the tests against the checkout-starts metric (Viewed
page: page group Checkout) instead. A goal whose metric the readiness
check shows is not instrumented at all is handled in Block 2, before any
battery runs.

**Split-checkout stores (checkout on another domain).** Some stores run
checkout on a separate host (`mainsite.com` + `checkout.mainsite.com`),
which Noibu tracks as a separate domain. Sessions do not carry across
domains, so a test's arm, set on the storefront, is not on the checkout
session, and a checkout metric measured on the storefront domain undercounts
or reads zero. Until the skill supports split-domain stores, checkout is
switched off for them: no checkout goal, no checkout success metric
(Checkout conversion rate, Viewed page: page group Checkout or a checkout
URL), and no test whose change sits on a checkout page. Readiness detects
the split (the readiness reads); the goal question comes before them
because the domain is not resolved yet.

## Workflow

Run the phases in order. Default analysis window: the last 30 full days
(adjust only if the user asks or the domain is low-traffic — under ~50k
sessions/30d, widen to 90 days).

### Block 2 — Resolve and readiness

In one message: `noibu_get_domain` (or `noibu_list_domains`; skipped
when SKILL.md's Stage 0 already resolved the domain, whose UUID is
reused), the
browser availability check from "The browser" (`Claude_Browser__tabs_context`,
plus `list_connected_browsers` always, since Chrome takes the desktop
previews; with no built-in browser tools, `tabs_context_mcp` with
`createIfEmpty: true` straight away), `TaskCreate` for the three tasks ("Analyze 30 days of Noibu data" →
"Check the live store" → "Prepare your ranked test ideas"), and the goal card built from the
metric catalogue (`show_widget`; unless the prompt already gave a goal in
the catalogue). After the `show_widget` call, output nothing and wait for
the click. The readiness message (the next one) also opens the run's
tab: for the built-in browser, `request_access` for the store origin
(scope `"site"`) and then `preview_start` with the store URL; for Chrome
picked as the fallback, the `claude-in-chrome` skill and
`tabs_context_mcp` with `createIfEmpty: true`. Once the goal is known, `Read` the walkthrough scripts it
needs plus `dismiss_consent.js` for the previews (the list is in
`references/site-validation.md`) in the readiness message, together with
the "Which pages?" follow-up when the answer was Increase page views.

Then, in the next message, the four readiness reads, all parallel, all
small (the exact calls are the "Readiness" section of
`references/noibu-query-battery.md`): `noibu_check_data_connection`;
one `noibu_search_sessions` over the window grouped by
CONVERSION_FUNNEL_DEPTH; `noibu_list_domains` filtered to the domain's
`companyId` (the sibling domains); `noibu_get_business_context`. Read
them together and decide before anything else runs:

- **Not receiving data, or fewer than about 1,000 sessions in the
  window:** stop. One sentence in chat: the domain has no traffic to
  analyze, and, when a sibling domain in the result does carry sessions
  (a `www.` twin, a storefront next to a `checkout.` host), name it and
  offer to run against it. Nothing is published.
- **Every session at funnel depth null (no add-to-cart or checkout
  events in the window):** add to cart rate and checkout conversion rate
  cannot be measured here. For a page-views goal or "All goals", continue
  with page-view metrics only and say so in a footer line. For an
  add-to-cart or checkout goal, ask once with `AskUserQuestion` whether to
  switch to page-view goals (Product, Collection, Checkout page group, or
  a URL) or stop; if the user is not there to answer, continue with
  page-view goals and a `caveats` line saying so. Either way the reports' footer carries
  one line saying the cart and checkout events are not instrumented and
  that fixing that comes before any cart or checkout test.
- **Thin traffic (under about 15,000 sessions in 30 days):** continue,
  widen the window to 90 days, and put one footer line on the page
  saying traffic is thin. Every card's traffic line
  (Phase 3) does the rest; the product's days-to-verdict estimate at
  setup is the final word, so do not pre-empt it with a number.
- **Siblings with traffic:** when a sibling carries more sessions than
  the domain asked for, say so in the page's data line.
- **Split checkout:** a sibling from R3 whose host is the store's own
  checkout host (`checkout.`, `secure.` or `pay.` on the same root
  domain), or business context saying checkout runs on another domain,
  marks the store as split-checkout. Then, in this order:
  1. **Warn**, one sentence in chat even in quiet mode: "Checkout on this
     store runs on <sibling host>, which Noibu tracks as a separate site,
     so checkout goals and checkout tests are switched off for this run;
     support for split-domain stores is coming."
  2. **Switch off checkout.** If the goal was Increase checkout starts or
     Increase checkout completes, or a specific page on the checkout host
     or the Checkout page group, ask once with `AskUserQuestion` for
     another goal: Increase add to cart rate (Recommended) · Increase
     page views (product pages, collection pages, or one specific page) ·
     Stop here. Unattended, or no answer: Increase add to cart rate, with
     a `caveats` line saying so. "All goals" continues across add to
     cart rate and page-view metrics only. The checkout-entry stop of the
     site read never runs on a split-checkout store.
  3. **Record it:** the data line says "checkout runs on <sibling host>;
     checkout goals are off for split-domain stores for now", one footer
     line repeats why, and `run.readiness.splitCheckout` carries
     `{"checkoutDomain": "<sibling host>", "checkoutDomainId": "<its
     UUID>"}` (absent when the store is not split), so the build half
     does not re-check.
- **Business context null:** nothing changes in the run; a footer
  line points to `build-business-context`. When context exists, read its brand-voice section before
  writing any `what`, `why`, hypothesis or variation name, and use the
  business facts it states (shipping thresholds, promotions, audiences)
  as evidence the walkthrough can confirm, never as a substitute for
  the walkthrough.

A run that passes readiness goes straight to Block 3 in the following
message. Readiness costs one serial block and never more.
