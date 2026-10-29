# Finder half: Phases 1 to 5 (data and site read, extra stops, synthesis, previews, build and publish)

Block 2 (resolve, goal, readiness) is in `goal-and-readiness.md`; this file is everything after it.

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
site read's Batch A on the run's tab (opened in the readiness message;
for the built-in browser, the call's first item is `resize_window`
`{"width": 1366, "height": 900}` so the read sees the desktop layout,
not the pane's narrower width): navigate to the store →
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
The tab stays open for the previews. When the site read is in the
built-in browser and Block 2 found a Chrome browser, the same message
also opens the **desktop preview tab** in Chrome (invoke the
`claude-in-chrome` skill, then `tabs_context_mcp` with `createIfEmpty:
true`; `references/finder/browser.md`, "Then the preview browsers").
Nothing is said in chat about it: a Chrome tab that is behind another
window is handled when it happens (`references/preview.md`, "Busy pages
and background tabs"). Read the data's top pages, not a
fixed route: the store's "shop all" link and a random mid-priced product
are the wrong pages when the data says shoppers are on `/collections/x`
and `/products/y`; read those.

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

If "The browser" found no browser, there is no site read: proceed
without validation and mark structural claims as inferred per the
prerequisites; a footer line carries the desktop-app suggestion. If a batch stops on a navigation error, the fix-up rule in
`references/site-validation.md` applies once per batch; what is still
missing after that is reported on the page, never re-explored.

Mark "Analyze 30 days of Noibu data" and "Check the live store" complete in the message after
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

The site read is done at desktop size in either browser; never make
mobile-layout claims from it — use the scroll/click query data for
those. In the built-in browser the mobile preview's before shot (Phase 4)
is a real phone-size render, so it is the place a mobile candidate is
confirmed or killed on sight; Chrome has no such look.

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
- **One tab per browser for the whole run**: the run's tab in the
  site-read browser (the read and the mobile previews), and the desktop
  preview tab in Chrome. The site read and the preview calls never close
  them; the publish message closes them, or leaves them showing a
  variation for the user, per `references/preview.md`.

### Phase 3 — Synthesis

Apply the inclusion rules, in this order:

1. Kill any candidate whose variant already exists on the site, or whose
   evidence dissolved under validation. Do not include them in the document.
2. Reclassify: anything that is simply wrong (copy contradicting policy,
   verified errors, broken pages, poor web vitals) is a defect, not a test.
   Fold a defect into a recommendation only as a one-line "Fix first" note
   when it lives inside that test's surface.
3. On a split-checkout store (Block 2), kill every candidate whose
   success metric is a checkout metric or whose change sits on a checkout
   page, and list none of them under "Outside your goal": the checkout
   session is on another domain and the test could not measure it. Then
   check every survivor against SKILL.md's "Platform restrictions and
   blast radius" for this store's platform, as its "Finder synthesis"
   bullet says.
4. Hold to the goal. When a goal was chosen, every test in "The tests"
   uses the goal's success metric, because that is the question the user
   asked. A survivor that most directly moves a different metric goes
   under "Outside your goal" as one line (at most two such lines), or is
   dropped; do not stretch it to the goal's metric with a weaker
   mechanism. For "All goals", rank across every catalogue primary metric.
5. Check the instrumentation under each candidate. When the payment step
   is thin (Batch 1 #3 depth 3, or the #4 PAYMENT_INFO_SUBMITTED counter,
   under about a fifth of completed checkouts), any candidate whose
   evidence is a drop-off between checkout start and completion is built
   on a gap in the data, not on shopper behaviour: drop it, and put one
   footer line on the page saying the payment step is not fully tracked
   and that fixing the instrumentation comes first. Checkout conversion
   rate itself stays valid on such a domain (completes are counted); only
   step-level claims are not.
6. Rank the survivors by evidence strength × traffic exposure × plausible
   effect, not novelty. Aim for 3 to 6 recommendations; if only 2 survive,
   ship 2 and say why the bar was high.
7. Label correlational evidence as such (self-selected cohorts like search
   users or email traffic justify running a test, never assuming the gap
   transfers).
8. Express every survivor in the create-flow's own fields (the setup block
   in `references/output-format.md`), with every success and secondary
   metric taken from this run's catalogue. A candidate that cannot be
   expressed there — no catalogue success metric even by proxy, or an audience that
   targeting cannot select (anything beyond UTM fields, device type, and
   country) — gets widened,
   reframed, or killed at this step, never shipped with fields the setup
   screen does not have.
9. Write each test's traffic line (`metricVolume`): how many sessions a
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
10. Write each test's overlap line when something applies: a RUNNING or
   DRAFT Noibu test on the same surface (`noibu_list_ab_tests`, one call
   in Block 4 when the domain's test list has not been read yet), or a
   third-party testing tool the walkthrough found. Omit the line when
   nothing applies.
11. Never fabricate numbers. Every figure in the output must come from a
   query, page, or document from this run. If a baseline was not measured,
   write "baseline shown at setup". Site facts come from the script JSONs
   of Blocks 3 and 4 (and Phase 2) verbatim, never from memory of how
   stores usually work.

### Phase 4 — Previews (every surviving test)

Once synthesis has fixed the list, preview every lettered variation of
every test before building the reports, following `references/preview.md`.
In short: write one small injection script per variation from the
recorded selectors and block containers and the Dev notes, moving whole
layout blocks and checking the layout held; apply them live in
the viewport's browser so the user can look: **desktop tests in Claude
in Chrome** on the desktop preview tab Block 4 opened (no resize), **mobile
tests in the built-in browser** on the run's tab. One `browser_batch` call per
surface and viewport, all in ONE message (in the built-in browser, set
the viewport first: preset `"mobile"` for a mobile test, or the probed desktop width (`references/preview.md`, "Probe the desktop width first") for a desktop test that fell back there because Chrome is not connected, never 1366×900 (site read only) or the responsive `"desktop"` preset; then navigate → wait → dismiss → settle → instant scroll to
the change → wait → screenshot before → inject → wait → screenshot
after, each saved to disk per "The browser"), so every pair shares one
scroll position and no
call runs past the browser tool's time limit; the before shot is also the
second look at the surface (a variation it shows already in place is
dropped and recorded in `run.killed`); if a surface's call stops on
a selector miss, fix that one script and run that surface once more in
the next message, never a third time;
then hand the captures to `page.json`. On a multi-market store, preview
under the top market's prefix. **Mobile tests** (targeting Mobile, or
whose evidence is mobile) are previewed at phone size in the built-in
browser, and their page entry carries `"previewViewport":
"mobile"` so the page shows the pair at phone width; only when there is no
built-in browser do they go to Chrome, desktop-or-text-only as
`references/preview.md` says. The two browsers are the only source of
images (the cloud workspace cannot reach the store, so there is no
headless capture):
a surface with no usable pair gets a text-only preview slot in that
test's report, and no browser at all means the reports still ship with a
description per variation and one line saying why there are no captures.
A preview is never an error message, and its absence is never a reason
to hold a report.

Previews need no answer from the user, so they run the same way in
attended and unattended runs. What they need is the browser: when Block 2
already found no browser, skip straight to the text-only page rather than
trying again. The only mid-run switch is the desktop fallback from Chrome
to the built-in browser in `references/preview.md` ("Busy pages and
background tabs").

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
surface template, anything the build half needs that the page does
not already carry). Build with `scripts/build_page.py page.json
<domain-short>`: it writes one report per test
(`<domain-short>-test-<rank>.html`) AND `candidates.json` next to them,
merging `page.json` with the selectors and site facts in
`walkthrough.json`, so the handoff is never authored twice
(`references/handoffs/candidates.md` documents the result for its
consumers). Do NOT publish any report yet. The Artifact tool opens a page
in the side panel the moment it publishes (there is no quiet publish), so
a report is published only when the person asks for it with that test's
"Learn why and preview variation" button on the findings card (`references/findings-card.md`,
"Answering a click"). Until then the built files
(`<domain-short>-test-<rank>.html`, `candidates.json`, `previews/`,
`findings-card.html`) stay in the run's working folder, which is also
where the build half reads `candidates.json` from.

In ONE message, together with the final task updates and, unless the tab is
left for the user, each browser's close call (`tabs_close` for the
run's tab, `tabs_close_mcp` for the Chrome desktop preview tab, which is
closed either way when it took no preview; in the built-in browser, a tab left open on a mobile
variation keeps its phone size so the user sees it as previewed, and one
being closed needs no reset), render the findings card (`Read`
`findings-card.html`, `show_widget` with `title: "ab_test_findings"`,
after one silent `read_me` with module `interactive`), with no text
before or after it (quiet-mode rule 6, `references/findings-card.md`). Do
not render the reports' content in the conversation beyond that card, do
not list the supporting files in chat, and do not ask a follow-up
question of your own: the buttons on each test, on its report and on the
card, are the follow-up, taken by the person who decides. (When the finder ran as the
"Look for new A/B test opportunities" route of SKILL.md, no card follows:
the findings card's buttons are the next step. After the "Create a
specific A/B test" route SKILL.md continues from its Stage 1 step 3 with
the one test as the pick, and no card follows.)

No button is ever pressed by this session, and the finder route itself
never creates a test: a report that creates drafts on load, or a run that
calls `noibu_create_ab_test` because the user seemed likely to want it,
is a failure. A draft is created only when a person clicks the card's
"Create A/B test in Noibu" button, which arrives as their request
("Answering a click" in `references/findings-card.md`), or by the build
half's Stage 2a once the person has picked a test and a run mode.
Editing, starting, and deleting tests stay in the console.

In an unattended or scheduled run nobody can press "Learn why and preview variation", so
every report is published at the end of the run instead, in rank order
(publish steps in `references/output-format.md`, step 3, no Artifact
`open`, no URL pasted); the findings card still renders, and its buttons
wait for whoever reads the chat.
