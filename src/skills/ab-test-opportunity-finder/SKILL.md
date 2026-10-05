---
name: ab-test-opportunity-finder
description: "Find evidence-backed A/B test opportunities for a Noibu-monitored ecommerce domain, aimed at the goal the user picks (add to cart rate, checkout starts, checkout completes, product or collection page views, a specific page, or all goals). Checks the domain has the traffic and instrumentation the goal needs, then combines 30 days of Noibu analytics with a read of the live site. With Claude in Chrome connected, it opens the store in a browser tab, reads the goal's pages and policy pages, and renders before/after previews; for cart and checkout goals it adds one item to the cart and removes it again. Without Chrome it works from Noibu data only. Publishes one page of ranked tests with their data, weekly traffic, setup, dev notes, and a button that creates the test as a Noibu draft, plus a candidates.json handoff. Writes no variation code. Use for A/B test ideas, CRO or experiment ideas, \"what should we test\", or previewing a test variation on a Noibu domain. Requires the Noibu MCP connector."
---

# A/B Test Opportunity Finder (Noibu)

Produce a short list of A/B test recommendations for an ecommerce store,
aimed at the goal the merchant cares about, that the merchant can read,
look at, and create in Noibu without leaving one page. The bar for
inclusion is high: every recommendation must be supported by measured
Noibu data AND, when a browser is available, validated against the live
site. Fewer, better-supported
tests beat a long speculative list.

The deliverable is a single hosted "Recommended tests" page
(`references/output-format.md`), never rendered in the conversation. Each
test on it is one section: what to change, why the data supports it, the
variation shown next to the current site (`references/preview.md`), the
setup exactly as Noibu will receive it, how much traffic its success
metric sees, dev notes, and a "Create A/B test in Noibu" button that
creates the draft through the viewer's own Noibu connector when clicked
(`references/create-drafts.md`). The page is built by
`scripts/build_page.py` from a `page.json` you write, so the run's job is
the content and the captures, not the HTML. Next to the page, the run
writes a `candidates.json` (`references/handoffs/candidates.md`): the same
tests in a machine-readable shape, with the selectors and evidence a
downstream skill needs to build one of them. It is published with the
page as a supporting file; the closing chat message does not repeat it.

The run ends at the page. Writing the variation code, building a preview
theme and QA belong to the skills that consume `candidates.json`; this
skill never opens a codebase, and the closing message does not offer to.

Why this skill exists: analytics data alone produces recommendations that die
on contact with the site (proposing a feature that already exists, calling a
working feature broken, missing copy that contradicts policy). The live-site
and documentation phases exist to kill those errors before they reach the
reader. Expect validation to eliminate 1 to 3 of your data-derived candidates;
that is the skill working, not failing. And a goal exists because "here are
six things to test" makes the merchant do the prioritizing; "here are three
tests that move add to cart rate" is a decision they can act on. A readiness
check exists because a domain with no traffic, or without the events the
goal's metric counts, cannot be tested, and finding that out after the
battery and the walkthrough wastes the merchant's time and yours.

## Speed and quiet-mode rules (read first, these govern the whole run)

The run is measured in round trips, not in tool calls. Every tool call that
does not depend on an earlier result goes in the same message as its
siblings. The target shape of a run, one message per step: Block 1 (setup
+ goal question) → Block 2 (resolve, with the browser tab and the scripts
the goal needs) → readiness (the message after Block 2) → Block 3 (Batch
1 + the homepage read, concurrent) → Block 4 (Batch 2 + the goal's site
surfaces named by Batch 1, concurrent, plus the Phase 3-5 references) →
previews (one browser call per surface, all in one message) → write
page.json, build (which also writes candidates.json), publish → closing
message. Anything that adds a serial step needs a reason.

1. **Batch the startup.** Block 1, in ONE message: invoke the
   `noibu:querying-noibu-data` and `claude-in-chrome` skills, load every
   deferred tool schema the run needs in ONE `ToolSearch` call (`select:`
   with a comma-separated list of the names exactly as the tool list
   shows them: the Noibu tools `noibu_get_domain`, `noibu_list_domains`,
   `noibu_check_data_connection`, `noibu_get_business_context`,
   `noibu_search_sessions`, `noibu_get_page_visits`,
   `noibu_list_priority_errors`, `noibu_list_ab_tests`; the Chrome tools
   `mcp__claude-in-chrome__tabs_context_mcp`, `tabs_create_mcp`,
   `tabs_close_mcp`, `navigate`, `get_page_text`, `find`, `computer`,
   `browser_batch`, `javascript_tool` with the same prefix; plus
   `TaskCreate` and `TaskUpdate`), AND ask the goal question (below) with
   `AskUserQuestion` unless the prompt already answers it. Tools that
   `ToolSearch` loads can only be called from the next message, so task
   creation waits for Block 2. If `TaskCreate`/`TaskUpdate` are not
   returned, skip the task list silently.
2. **Two query batches, maximum.** Run the battery in
   `references/noibu-query-battery.md` as two parallel batches (see
   "Battery shape" below). The readiness reads are not a batch: they are
   four small reads that decide whether the battery runs at all. One
   extra follow-up query is allowed only when a batch result is
   uninterpretable without it. Do not explore.
3. **The site read rides in the query blocks.** It never owns a block:
   Batch A (homepage and policies, which need no data) goes in the Block
   3 message with Batch 1; Batch B (the goal's surfaces, at the URLs
   Batch 1 names) goes in the Block 4 message with Batch 2. Which
   surfaces, and whether the cart path runs, is the goal table in
   `references/site-validation.md`; see Phase 1. **One page per browser
   call:** a `browser_batch` that runs past about a minute returns
   nothing, so every browser phase (Batch B, previews) is one call per
   page, all in the same message; they run in order, each with its own
   limit.
4. **No rendering tools.** Do NOT call `noibu_visualize_page_visits` or
   `noibu_show_session_replay`. Get scroll behavior from
   QUANTILES(MAX_SCROLL_DEPTH_RATIO) and click behavior from CLICKED_TEXT
   queries instead — same numbers, no iframes, no mandatory console URLs in
   the reply. Exception: the user explicitly asks for a heatmap or replay.
5. **No narration.** Do not summarize between tool calls, do not paste query
   results, findings, or data tables into the chat, and do not describe what
   you are about to do. The only visible process is the task list, when
   the environment has one. Mark a task complete inside whatever message
   you send next, never in a message of its own. Write one sentence in chat
   only if you hit a blocker, or when readiness stops the run (Block 2).
6. **Page-only output.** The page is published with the Artifact tool in
   the same message as the final task update; the app shows it as a card,
   so do not paste its URL, and do not reproduce the recommendations in
   the chat. The closing chat message has one fixed shape, at most 6
   short sentences: (1) what was delivered (the page, with a button per
   test that creates it as a draft in Noibu, and the reminder that
   variation code must be live before a test is started), (2) the
   top-ranked test in one clause, (3) which candidates the live-site
   check killed, one clause each, (4) the "previews are approximations"
   caveat and, if a tab was left open showing a variation, which one,
   (5) when the goal's site read used the cart path, the disclosure that
   one item was added to and removed from the cart, and (6) at most one
   caveat sentence, only when one applies, choosing the most
   consequential: the goal defaulted to "All goals"; the chosen metric is
   not instrumented here; traffic is thin, so Noibu's days-to-verdict
   estimate at setup decides whether a test is worth running; the store
   serves several markets and the page is written for the top one; no
   business context is saved (`build-business-context` would sharpen the
   hypotheses); no browser was available, so structural claims are
   inferred and previews are missing; or the browser was served a
   localized storefront most traffic does not see. Every other caveat
   lives on the page.
7. **Read each reference once, in a message that is already going
   out.** Read `references/noibu-query-battery.md` and
   `references/site-validation.md` in Block 1 (the battery is needed for
   readiness and both query blocks; the site-read file names the scripts
   to `Read` in Block 2); `references/output-format.md`,
   `references/preview.md` and `references/create-drafts.md` (for its
   mapping table) in the Block 4 message, since they depend on nothing
   and reading them later costs a serial step of its own;
   `references/handoffs/candidates.md`
   never during a run (the build script writes `candidates.json`; the
   file documents the shape for whoever consumes it);
   `references/shared/*` never (those files are hosted here for other
   skills and play no part in a run). After a context compaction, re-open
   only the file the current phase needs, never the shared references.

## Prerequisites

- Noibu MCP connector connected. The `noibu:querying-noibu-data` skill (or
  its equivalent reference) must be loaded before the first `noibu_*` call —
  it carries the orderBy requirement, row caps (sessions 100 rows, page
  visits 1,500 rows), measure-uniqueness rules that queries fail without,
  the domain-resolution flow, and the rule to check sibling domains before
  reporting a zero. This skill does not restate those; it cites them.
- Claude-in-Chrome for the live-site read and the previews (the
  `claude-in-chrome` skill is invoked in Block 1, before any browser tool
  call). If no browser is available, say so in one sentence, run the data
  phase, and mark every unvalidated structural claim as inferred — do not
  silently skip validation.
- A domain name or UUID from the user. If neither is given, resolve with
  `noibu_list_domains` and use the result; do not stall on asking.

Who runs it: anyone with read access to the domain in Noibu. The run
changes nothing in the Noibu account. On the store, its only effect is the
cart round trip for cart and checkout goals: `add_to_cart.js` adds one
in-stock item and `clear_cart.js` removes it, the add shows up in the
store's analytics, and the closing message says so (quiet-mode rule 6). It
never fills in a checkout field or places an order. Its other writes are
the published page and the draft a viewer creates by clicking a button,
with their own credentials. A skill that builds a test from
`candidates.json` needs the merchant's own repository and platform
connections; this skill does not, and it never asks for a codebase.

Shared references: `references/shared/` (`noibu-feature-flag-sdk.md`,
`platforms.md`) is hosted here for other A/B skills, which read it by
path (inside a plugin, `../ab-test-opportunity-finder/references/shared/<file>`).
No phase of this skill reads it.

## The goal question (Block 1)

Ask what the user is trying to move before pulling any data, because the
goal decides which gaps count as candidates, which success metric every
test uses, and which site surfaces need a closer look. The goals are the
primary metrics Noibu's A/B testing product can measure (add to cart rate,
checkout conversion rate, and page-view-to-URL rate against a URL or a
page group; nothing else exists as a success metric), so a chosen goal
maps directly onto the Success metric field. Page group names come from
the domain's own data (Batch 1 query #8); the names below are the usual
ones.

| Goal as offered | Success metric written on the page |
| --- | --- |
| Increase add to cart rate | Add to cart rate |
| Increase checkout starts | Viewed page: page group Checkout (or the checkout URL) |
| Increase checkout completes | Checkout conversion rate |
| Increase views of product pages | Viewed page: page group Product |
| Increase views of collection pages | Viewed page: page group Collection |
| Increase views of a specific page | Viewed page: <URL> |
| Not sure / show me everything | "All goals": rank across all metrics, as before |

Ask with the question tool, in the same message as the rest of Block 1.
Block 1 carries exactly one question, "What do you want these tests to
improve?", with four options: Increase add to cart rate · Increase
checkout starts · Increase checkout completes · Increase page views
(product pages, collection pages, or one specific page). Say in the
question text that "not sure" is fine: the user can type it under Other
and get tests across every goal.

Only a page-views answer needs a second question. The other goals already
name their success metric outright, so a "which pages?" question next to
them is noise the user has to dismiss with "not applicable", and it
suggests the skill did not understand what they picked. So:

- Answer is Increase page views: ask "Which pages?" in the Block 2
  message (it depends on the first answer, so it cannot share Block 1):
  Product pages · Collection pages · A specific page (put the URL under
  Other). A "specific page" answer that arrives without a URL gets one
  further follow-up for the URL in the next message.
- Answer is any other goal, "not sure", or anything typed under Other:
  no second question. Proceed straight to Block 2 with the goal set.

Skip the question when the prompt already states the goal ("find tests to
get more people into checkout" is the checkout-starts goal; "our add to cart
rate is bad" is Add to cart rate; "more traffic to our collection pages"
is page views: Collection, with no follow-up needed; "what should we test"
with no metric is a reason to ask). In an unattended or scheduled run, or
if the question tool is unavailable, default to "All goals", use the
closing message's caveat sentence to say so, and carry on.

The goal then shapes three things: which battery results are decisive
(the "Goal lens" table in `references/noibu-query-battery.md`), which
conditional site stops to plan for (`references/site-validation.md`), and
the inclusion rule in Phase 3 that every shipped test uses the goal's
metric. A checkout-completes goal on a domain whose completion counters
are zero (Batch 1 check #4) cannot be measured; use the caveat sentence
at delivery and ship the tests against the checkout-starts metric (Viewed
page: page group Checkout) instead. A goal whose metric the readiness
check shows is not instrumented at all is handled in Block 2, before any
battery runs.

## Workflow

Run the phases in order. Default analysis window: the last 30 full days
(adjust only if the user asks or the domain is low-traffic — under ~50k
sessions/30d, widen to 90 days).

### Block 2 — Resolve and readiness

In one message: `noibu_get_domain` (or `noibu_list_domains`),
`tabs_context_mcp` with `createIfEmpty: true` (this is the browser
availability check for the whole run, and the tab id it returns is the
one tab the site read uses), `TaskCreate` for the three tasks (Pull data →
Validate on site → Publish page), `Read` of the walkthrough scripts the
goal needs plus `dismiss_consent.js` for the previews (the list is in
`references/site-validation.md`; they depend only on the goal, so they
never wait for data), and, only when the goal
answer was Increase page views, the "Which pages?" follow-up from Block 1.

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
  with page-view metrics only and say so in the closing caveat. For an
  add-to-cart or checkout goal, ask once with `AskUserQuestion` whether to
  switch to page-view goals (Product, Collection, Checkout page group, or
  a URL) or stop; if the user is not there to answer, continue with
  page-view goals and the caveat. Either way the page's footer carries
  one line saying the cart and checkout events are not instrumented and
  that fixing that comes before any cart or checkout test.
- **Thin traffic (under about 15,000 sessions in 30 days):** continue,
  widen the window to 90 days, and reserve the closing caveat for thin
  traffic unless a weightier one applies. Every card's traffic line
  (Phase 3) does the rest; the product's days-to-verdict estimate at
  setup is the final word, so do not pre-empt it with a number.
- **Siblings with traffic:** when a sibling carries more sessions than
  the domain asked for, or is a `checkout.` host, say so in the page's
  data line (one clause: "checkout is tracked on checkout.example.com"),
  because a checkout-conversion metric on a storefront-only domain may
  not count the purchase.
- **Business context null:** nothing changes in the run; the closing
  caveat may point to `build-business-context` when no heavier caveat
  applies. When context exists, read its brand-voice section before
  writing any `what`, `why`, hypothesis or variation name, and use the
  business facts it states (shipping thresholds, promotions, audiences)
  as evidence the walkthrough can confirm, never as a substitute for
  the walkthrough.

A run that passes readiness goes straight to Block 3 in the following
message. Readiness costs one serial block and never more.

### Phase 1 — Noibu data and the site read, interleaved

The site read is scripted, not explored, and goal-scoped, not a fixed
tour: each surface is read by one bundled script from
`scripts/walkthrough/` that returns a small JSON of exactly the facts the
run needs (what exists on the surface, the selectors and block containers
previews are written from, the storefront and market the browser was
served, any third-party experimentation tool loaded on the page), the
policy pages are fetched from the homepage instead of visited, and
nothing is screenshotted (the preview batch shoots before and after at
the same scroll position, which a read-time screenshot can never match).
`references/site-validation.md` has the two batches, the surfaces each
goal reads, and the fix-up rule; this section says where they go.

**Block 3, one message:** every Batch 1 query from the battery AND the
site read's Batch A on the tab from Block 2: navigate to the store →
wait → `read_home` with its chunk items → `read_policy` with its chunk
items. Nothing in Batch A depends on data.

**Block 4, one message:** Batch 2 (filters come from Batch 1), the
Phase 3-5 reference reads, AND the site read's Batch B on the same tab
(one `browser_batch` call per page, in the order
`references/site-validation.md` gives), whose URLs come from Batch 1: the top
collection page by visits from #5 (`read_collection`) and the top product
page by visits from #5 (`read_pdp`) for add-to-cart, page-view and "all
goals" runs; the cart path (`read_pdp` → `add_to_cart` → cart →
`read_cart` → `clear_cart`, plus the first checkout step, observation
only, for a checkout-completes goal) for cart and checkout goals and "all
goals"; the named URL with the fitting script for a specific-page goal.
The tab stays open for the previews. Read the data's top pages, not a
fixed route: the store's "shop all" link and a random mid-priced product
are the wrong pages when the data says shoppers are on `/collections/x`
and `/products/y`, and reading those directly is what removes the extra
site stops a fixed tour used to need.

As Batch 1 and Batch 2 results land, keep a private list of candidate
opportunities, each tagged with the numbers that support it and the
success metric it acts on. Read the script JSONs in the same pass:
anything they show already exists on the site (free-shipping progress, a
promo field behind a toggle, express pay, quick add on cards, shipping
copy by the buy box, an upsell block) is not a candidate. A `null` or
`"absent"` is a missing selector as often as a missing feature: when a
candidate's survival depends on one, the preview batch's before shot is
the second look (Phase 4), and a candidate the before shot contradicts
is dropped there. `read_home.testingTools` names any Optimizely, VWO,
Convert, AB Tasty, Kameleoon, Dynamic Yield or similar script on the
page: another tool may already be running experiments on the same
surfaces, so every card's overlap line says so (Phase 3) and the page's
footer carries one line naming the tool.

If Block 2's `tabs_context_mcp` failed, there is no site read: proceed
without validation and mark structural claims as inferred per the
prerequisites. If a batch stops on a navigation error, the fix-up rule in
`references/site-validation.md` applies once per batch; what is still
missing after that is reported on the page, never re-explored.

Mark "Pull data" and "Validate on site" complete in the message after
Block 4 returns (the preview batch, or the rare Phase 2 stop).

What makes a candidate worth carrying forward: a measured gap (segment A vs
segment B, page vs template peers, cohort vs baseline) that is large, sits on
meaningful volume, has a plausible mechanism a variant could act on, and
acts on the goal's metric. Generic best practices without a measured gap do
not qualify, and neither does a strong gap on a metric the user did not
ask about (it can earn one line under "Outside your goal").

#### Battery shape

`references/noibu-query-battery.md` is already consolidated: the
readiness reads live in Block 2; Batch 1 is queries #2 to #8 (device
baseline and its country sibling; top pages and scroll reach are one
query; #8 lists the domain's page groups), Batch 2 is #9 (one click-text
query over the goal's surfaces), #10 (landing attribution, only when an
underperformer exists), and the optional queries the goal lens or a
candidate calls for. Every entry in the battery carries its exact
`queryInput`; copy it rather than composing the JSON. There is never a
third batch.

#### Multi-market stores (read with Batch 1)

A store on Shopify Markets or any locale-routed storefront serves several
countries, prices and copy from one domain. Two signals, either one
enough: the top URLs in Batch 1 #5 carry a locale prefix (`/en-gb/`,
`/fr-fr/`, `/de-de/`), or the country sibling of #2 shows two or more
countries each above about 10% of sessions with conversion rates that
differ severalfold. When a store is multi-market:

- Treat the prefix (or the country) as the market. The top market by
  sessions is the one the page is written for; say so in the data line
  and the caveat.
- Compare the market the walkthrough was served (`read_home.storefront`:
  `country`, `routeRoot`, `pathPrefix`) with the top market. When they
  differ and a candidate depends on copy, price or layout, Phase 2
  re-reads the homepage and the PDP under the top market's prefix in one
  batch; otherwise note the difference and carry on.
- Rows with an empty COUNTRY_CODE that carry more than about 10% of
  sessions and convert near zero are not shoppers: exclude them from
  every baseline you cite and say so in one footer line.
- The create screen has no market or country field a skill can set
  (location targeting is added in the console after creation): write the
  per-market condition in `setup.targeting` as a console follow-up, per
  `references/create-drafts.md`, and never claim the test is scoped to a
  market until that is done.

### Phase 2 — Extra site stops (rare)

Block 4 already read the homepage, the policy pages, and the goal's own
surfaces from the data, so most runs skip this phase. Run it only when a
surviving candidate depends on a surface nobody read: the top market's
storefront when it differs from the one served (above), search (empty
state, the #1 query from the data, typo tolerance; skip if search is not
instrumented), a paid landing page, or a candidate-specific URL. On the
run's tab, one `browser_batch` call per page (navigate → wait → the
fitting bundled script or one `find`); no screenshots here either. The
question per candidate is the same as in Block 4: does the proposed
variant already exist? Is the "problem" actually a defect? What does the
surface really contain? Record selectors and block containers for
anything a variation would touch here too.

The browser renders a desktop viewport; never make mobile-layout claims from
the site read — use the scroll/click query data for those.

#### Browser efficiency rules

- **Bundled scripts, not hand-written reads.** `scripts/walkthrough/` has
  one paste-ready script per surface; it returns a small JSON with the
  facts, the selectors, and each element's block-level container, and it
  never throws, so a batch never stops on a missing element. Authoring a
  DOM read by hand costs a round trip of thinking and a content-filter
  risk; `get_page_text` on a homepage or collection page costs thousands
  of tokens that stay in context for the rest of the run. Use a script;
  use one `find` for a single element the scripts do not cover; use
  `get_page_text` only for a policy page the fetch-based read could not
  get. Paste each script into its item's `text` as the file reads;
  never generate batch JSON with Bash or Python and copy it back. If an
  ad hoc script is unavoidable, keep it free of the word
  "cookie" and of `innerHTML` / `script[src]` dumps (the tool's content
  filter blocks scripts that look like they read cookies or page source;
  say "consent banner").
- **Batches, not steps; one page per call.** The whole site read is two
  messages of `browser_batch` calls (Batch A: homepage + policies, one
  call, in Block 3; Batch B: one call per page of the goal's surfaces,
  in Block 4), and a cart add, when the goal calls for one, is inside
  Batch B because `add_to_cart.js` verifies itself; the cart clear is
  always its own last call, so it runs even if a read before it fails.
  Each script returns its JSON in 900-character chunks that the same
  call reads back (the browser tool cuts longer results), so no call
  needs a follow-up to see a result. One fix-up call is allowed per
  surface; never a second.
- **No screenshots during the read.** A before image is only useful at
  the exact scroll position of its after image, so both are shot in the
  preview batch (Phase 4). Reading a page from pixels is never the
  method; the scripts' JSON is the record.
- **Navigate directly, fetch what you can.** The cart URL and an in-stock
  product come from `read_home` (the product is the fallback when #5
  names no product page); policy pages are fetched from the homepage by
  `read_policy`, not visited. Try `help.<domain>` only if every policy
  read came back `notFound`.
- **One tab for the whole run.** The site read and the preview calls
  never close it; the publish message closes it, or it is left showing a
  variation for the user, per `references/preview.md`.

### Phase 3 — Synthesis

Apply the inclusion rules, in this order:

1. Kill any candidate whose variant already exists on the site, or whose
   evidence dissolved under validation. Do not include them in the document.
2. Reclassify: anything that is simply wrong (copy contradicting policy,
   verified errors, broken pages, poor web vitals) is a defect, not a test.
   Fold a defect into a recommendation only as a one-line "Fix first" note
   when it lives inside that test's surface.
3. Hold to the goal. When a goal was chosen, every test in "The tests"
   uses the goal's success metric, because that is the question the user
   asked. A survivor that most directly moves a different metric goes
   under "Outside your goal" as one line (at most two such lines), or is
   dropped; do not stretch it to the goal's metric with a weaker
   mechanism. For "All goals", rank across metrics as before.
4. Check the instrumentation under each candidate. When the payment step
   is thin (Batch 1 #3 depth 3, or the #4 PAYMENT_INFO_SUBMITTED counter,
   under about a fifth of completed checkouts), any candidate whose
   evidence is a drop-off between checkout start and completion is built
   on a gap in the data, not on shopper behaviour: drop it, and put one
   footer line on the page saying the payment step is not fully tracked
   and that fixing the instrumentation comes first. Checkout conversion
   rate itself stays valid on such a domain (completes are counted); only
   step-level claims are not.
5. Rank the survivors by evidence strength × traffic exposure × plausible
   effect, not novelty. Aim for 3 to 6 recommendations; if only 2 survive,
   ship 2 and say why the bar was high.
6. Label correlational evidence as such (self-selected cohorts like search
   users or email traffic justify running a test, never assuming the gap
   transfers).
7. Express every survivor in the create-flow's own fields (the setup block
   in `references/output-format.md`). A candidate that cannot be expressed
   there — no supported success metric even by proxy, or an audience that
   targeting cannot select (anything beyond UTM fields, device type, and
   country) — gets widened,
   reframed, or killed at this step, never shipped with fields the setup
   screen does not have.
8. Write each test's traffic line (`metricVolume`): how many sessions a
   week, in the test's own targeting, reach the event its success metric
   counts (add to cart, checkout completion, or the page group or URL),
   from Batch 1 #3 and #8 divided by the weeks in the window, rounded to
   two significant figures, plus the fixed clause "Noibu shows the days
   to a verdict at setup". When a candidate would be defensible on two
   supported metrics, pick the one with more weekly events and say so in
   one clause. Never write a day count, a required sample size, or an
   expected lift: the product computes "About N days to reach a verdict"
   from real traffic once the draft exists, and a number of yours next to
   it would be the one the merchant remembers. The battery's "Metric
   volume" section has the arithmetic.
9. Write each test's overlap line when something applies: a RUNNING or
   DRAFT Noibu test on the same surface (`noibu_list_ab_tests`, one call
   in Block 4 when the domain's test list has not been read yet), or a
   third-party testing tool the walkthrough found. Omit the line when
   nothing applies.
10. Never fabricate numbers. Every figure in the output must come from a
   query, page, or document from this run. If a baseline was not measured,
   write "baseline shown at setup". Site facts come from the script JSONs
   of Blocks 3 and 4 (and Phase 2) verbatim, never from memory of how
   stores usually work.

### Phase 4 — Previews (every surviving test)

Once synthesis has fixed the list, preview every lettered variation of
every test before building the page, following `references/preview.md`.
In short: write one small injection script per variation from the
recorded selectors and block containers and the Dev notes, moving whole
layout blocks and checking the layout held; apply them live in Claude in
Chrome so the user can look, one `browser_batch` call per surface, all
in ONE message (navigate → wait → dismiss → instant scroll to the change
→ wait → screenshot before → inject → wait → screenshot after, both with
`save_to_disk: true`), so every pair shares one scroll position and no
call runs past the browser tool's time limit; the before shot is also the
second look at the surface (a variation it shows already in place is
dropped, and the closing message says so); if a surface's call stops on
a selector miss, fix that one script and run that surface once more in
the next message, never a third time;
then hand the captures to `page.json`. On a multi-market store, preview
under the top market's prefix. Chrome is the only source of images (the
cloud workspace cannot reach the store, so there is no headless capture):
a surface with no usable pair gets a text-only preview slot in that
test's section, and no browser at all means the page still ships with a
description per variation and one line saying why there are no captures.
A preview is never an error message, and its absence is never a reason
to hold the page.

Previews need no answer from the user, so they run the same way in
attended and unattended runs. What they need is the browser: when Block 2
already found no browser, skip straight to the text-only page rather than
trying again.

The preview message also saves the injection scripts under `previews/`
and writes `walkthrough.json` in the working
directory: every script JSON from Blocks 3 and 4 (and Phase 2), chunks
concatenated, unedited, under the script's name as the key
(`references/site-validation.md`, "The record"). The build script reads
it to fill `candidates.json` with selectors and site facts, so nothing
from the site read is retyped later. Never paraphrase the site read into
prose ("has free shipping messaging"): that loses the threshold and the
selectors, and lost selectors force a second browser visit.

### Phase 5 — Build, publish, deliver

Write `page.json` exactly per `references/output-format.md` (every test's
`setup` and `createInput` say the same thing; the mapping is in
`references/create-drafts.md`), including its small `run` block and each
test's `handoff` block (the evidence numbers behind the card's `why`, the
surface template, anything a downstream skill needs that the page does
not already carry). Build with `scripts/build_page.py page.json
<domain>-test-recommendations.html`: it writes the page AND
`candidates.json` next to it, merging `page.json` with the selectors and
site facts in `walkthrough.json`, so the handoff is never authored twice
(`references/handoffs/candidates.md` documents the result for its
consumers). Publish with the Artifact tool in ONE message together with
the final task updates and, unless the tab is left for the user,
`tabs_close_mcp`: `icon: "flask"`, a one-sentence `description`,
`files` mapping every preview image and `candidates.json`, and the `mcp`
capability declared for the Noibu connector with exactly
`noibu_create_ab_test` and `noibu_list_ab_tests` (the capability is what
makes the button work; without it the page renders but every button says
so). Then write the closing chat message in the fixed shape from
quiet-mode rule 6. Do not render the page's content in the conversation,
do not list the supporting files in chat, and do not ask a follow-up
question: the button on each test is the follow-up, taken by the person
who decides, with their own credentials.

The button never runs from this session, and this session never creates
a test: a page that creates drafts on load, or a run that calls
`noibu_create_ab_test` because the user seemed likely to want it, is a
failure. Editing, starting, and deleting tests stay in the console.

In an unattended or scheduled run nothing changes: the page is the
deliverable and needs no answer from anyone.
