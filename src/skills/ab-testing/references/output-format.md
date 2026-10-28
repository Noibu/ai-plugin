# Output format: the "Recommended test" reports

The deliverable is ONE hosted report per recommended test, all built from
a single `page.json` you write and each published with the Artifact tool.
Do NOT render the recommendations, or any test from them, in the
conversation. The chat gets only the findings card (quiet-mode rule 6).

A report's job: let a busy merchant read what the test is, see why the
data supports it, look at the variation next to the current site, and
create the test in Noibu with one click, all without leaving the report.
Every report opens with the run's intro (title, goal, data and capture
lines, the previews note) and then carries its one test in this order:
what to change → why → before and after → the setup as Noibu will
receive it → dev notes → the "Create A/B test in Noibu" button
(`references/create-drafts.md`). The run-level "Outside your goal" list
and the footer caveats close every report, since they apply to all the
tests. A report has no implementation button: building a test happens in
this chat, from the implement card's "Automate the implementation" button
(shown once a draft exists) or a typed request
(`references/findings-card.md`).

## How the reports are built

1. Write `page.json` in the working directory (fields below), next to the
   `walkthrough.json` the preview message wrote.
2. `python <skill-dir>/scripts/build_page.py page.json <domain-short>`
   writes one report per test next to `page.json`
   (`<domain-short>-test-1.html`, `<domain-short>-test-2.html`, ...),
   `candidates.json` (the handoff, derived from `page.json` +
   `walkthrough.json`; never hand-written) and `findings-card.html` (the
   in-chat findings card); the card's HTML is never hand-written.
3. Do not publish yet. The Artifact tool opens a page in the side panel as
   soon as it publishes, so a report goes up only when the person clicks
   that test's "Learn why and preview variation" button on the findings card (or, in an
   unattended run where no one can click, at the end of the run, every
   report in rank order). To publish a report, use the Artifact tool on
   that test's file: `icon: "flask"`, a one-sentence `description` naming
   the test, `files` mapping that test's `previews/…` images (its
   `before` and `after` paths, when it has them) plus `candidates.json`,
   and
   `capabilities: {"mcp": {"servers": [{"server": "<connector display name>", "tools": ["noibu_create_ab_test", "noibu_list_ab_tests"]}]}}`.
   The connector display name is the `<connector>` segment of this
   session's `mcp__<connector>__noibu_*` tool names (usually `noibu`).
   `mcp` powers "Create A/B test in Noibu". Declare nothing else: the
   report sends nothing back to the chat. Each report is its own
   artifact with its own URL; publish each one from its own file path, so
   a second test's publish never overwrites the first.
4. After that publish, take the report's URL from the result, add it to
   `page.json` under `pageUrls` keyed by the test's rank (`{"2": "<url>"}`),
   rebuild, and republish the same file (same path, so the URL and
   supporting files are kept; the report is already open, so nothing new
   opens). The URL goes into that test's findings-card buttons and
   `candidates.json` so a create or build request names the report the
   person is looking at; the skill never loads tests back from that link
   (tests are scoped to this chat's working folder). Rebuilding rewrites
   every report file, which is harmless: unpublished ones are only files,
   and a published one changes only if it is republished. Never paste a
   URL in chat.
5. At the end of the finder run, render the findings card (`Read`
   `findings-card.html`, pass it verbatim to `show_widget`), with no text
   around it (`references/findings-card.md`). The card is built from the
   first build and needs no `pageUrls`: it is one short block per test
   under a "Test N" header (a "What to change" label over the title and change, a "Why this test" label over the `why` sentence) with two buttons, "Learn why and preview variation", which
   publishes that test's report and so opens it in the side panel, and
   "Create A/B test in Noibu".

The build script owns the HTML, the styling, and the button runtime, so
every run produces the same reports; do not hand-write a report or edit
the generated HTML. If something in the reports needs to change for every
run, change the script.

## page.json fields

Top level:

| Field | Content |
| --- | --- |
| `domain`, `domainId` | the resolved domain name and UUID |
| `pageUrls` | each published report's claude.ai URL, keyed by the test's rank as a string (`{"1": "...", "3": "..."}`); absent on the first build, a key added for each republish (step 4 above) |
| `server` | the connector display name (see above) |
| `goal` | the goal as the user chose it ("Increase add to cart rate"), or "All goals" |
| `successMetricLabel` | the goal's metric label, or omit for "All goals" |
| `dataLine` | "Noibu, <window> (<N> days, about <sessions> sessions, <mobile share>)", plus one clause when it applies: the market the reports are written for, "checkout is tracked on <sibling domain>", or, on a split-checkout store, "checkout runs on <sibling host>; checkout goals are off for split-domain stores for now" |
| `captureLine` | "Live-site check <date>, read in <built-in browser|Chrome><, desktop previews in <Chrome|the built-in browser>><, mobile previews at phone size in the built-in browser><, <country> storefront (<currency>)>" (each preview clause only when at least one pair was shot at that size) |
| `caveats` | footer lines, each only when it applies: the localized-storefront or multi-market note (which market the reports are written for, and that per-market targeting is set in the console), "mobile layout was not previewed" (when any test is mobile-only or rests on mobile evidence and it has no mobile-size pair: the run used Chrome, which captures desktop only, or the mobile shot failed), the baseline note, the thin-traffic note, the instrumentation note (cart or checkout events not recorded, or the payment step not fully tracked), the blank-country exclusion, the third-party testing tool on the page, and the run notes quiet-mode rule 6 lists (which browser read the site or that none did, the cart add-and-remove, a tab left open on a variation, the "All goals" default, missing business context); nothing else. No line about how many tests made the cut: killed candidates, dropped tests and why fewer than three remain go in `run.killed` only |
| `tests` | the ranked tests, 3 to 6 (2 if only 2 survived; record the removed ones in `run.killed`, never in a footer line) |
| `outsideGoal` | at most 2 one-line candidates that survived validation but act on another metric; omit for "All goals" runs |
| `run` | not rendered; carried into `candidates.json`: `window` ({start, end, days, sessions, mobileShare}), `readiness` ({receivingData, funnelInstrumented, paymentStepTracked, businessContext, thinTraffic, splitCheckout?: {checkoutDomain, checkoutDomainId}}), `market` ({multiMarket, written_for}), `browser` (the site-read browser: `"built-in"`, `"chrome"` or `"none"`), `previewBrowsers` ({desktop, mobile}, each `"built-in"`, `"chrome"` or `"none"`: which browser took that size's previews), `siblings`, `companyId`, `platform`, `testingTools`, `existingTests`, `killed` ([{idea, reason}] for every candidate validation removed) |

Per test:

| Field | Content |
| --- | --- |
| `title` | the test's name: name the change, not the metric ("Quick add on collection cards") |
| `surface` | the URL path(s) the test lives on |
| `variationName` | B's short noun phrase ("Add to cart button on cards") |
| `what` | one or two plain sentences: the change a shopper would notice |
| `why` | one or two sentences: the measured problem, at most 3 numbers, plus what the live site showed; correlational evidence labeled in one clause. Also shown on the findings card under "Why this test", so it must stand alone and lead with the customer's own numbers |
| `before`, `after` | paths under `previews/` to the captured images, or `null` when capture failed |
| `previewNote` | when there are no images: why, in one clause, naming only a cause a tool result showed (see `references/preview.md`) |
| `beforeAlt`, `afterAlt`, `beforeCaption`, `afterCaption` | what each image shows (optional; defaults exist) |
| `previewViewport` | `"mobile"` when the pair was shot at the built-in browser's mobile preset (the report shows it at phone width); omit otherwise |
| `setup` | the six fields as the create screen shows them (rules below): `title`, `hypothesis`, `successMetric` (label plus baseline in parentheses), `secondaryMetrics`, `targeting`, `variations` |
| `metricVolume` | one line: the measured weekly volume of the event the success metric counts, in this test's targeting, plus "Noibu shows the days to a verdict at setup" (battery, "Metric volume"); never a day count, sample size or lift |
| `overlap` | one line, only when it applies: a RUNNING or DRAFT Noibu test on the same surface (title and status), or a third-party testing tool the walkthrough found on the page; else omit |
| `devNotes` | 1 to 3 sentences per lettered variation: page, element or block, what changes; selectors welcome, code never |
| `fixFirst` | one line, only when a verified defect sits inside the test's surface; else omit |
| `createInput` | the exact `noibu_create_ab_test` arguments for this test, minus `domainId` and `rationale` (the report adds those): see `references/create-drafts.md` for the mapping. The report shows `setup`; the button sends `createInput`; they must say the same thing |
| `handoff` | not rendered; carried into `candidates.json`: `evidence` (the figures behind `why`, as `[{claim, numbers, source, correlational}]`, so a downstream hypothesis quotes numbers, not prose), optional `surfaceTemplate` (home, collection, product, cart, checkout; inferred from `surface` when absent, and it picks which script's selectors in `walkthrough.json` the test inherits), optional extra `selectors` (a `find` result the scripts did not record), optional `consoleFollowUps` (a country condition to add in the console) |

## Voice

Write for a busy merchant scanning on a phone. Short sentences. Plain
words. One idea per sentence. Say "shoppers" not "sessions" where the
meaning survives. Never use em dashes: use colons, commas, periods, or
parentheses. No hype adjectives, no pitch framing. At most 3 numbers per
test in `why`; pick the ones that carry the argument. Every number must
come from this run's queries, pages, or documents. A baseline you measured
is "about X%" (the battery derives it from session funnel depth and the
product's own definition may differ, so the setup screen's figure wins);
one you did not measure is "baseline shown at setup".

## Field-by-field rules (the `setup` block and `createInput`)

### Title

Name the change, not the metric. About 30 to 45 characters so it scans in
the tests list, and it must still make sense months later. The backend
derives the test's flag key from it, and a title already used on the
domain is rejected, so never reuse one.

### Hypothesis

Match the shape of the field's own example ("Moving the add to cart button
higher on the PDP will increase add to cart rate."). One sentence:
mechanism → expected direction → the success metric.

### Success metric

Exactly one, and it must be the metric the variant acts on most directly,
not the most impressive one. When the user chose a goal, every test uses
that goal's metric: the goal was the brief, and a test whose most direct
metric is something else does not answer it (it can be one line in
`outsideGoal` instead).

The supported success metrics are this run's catalogue
(`references/finder/goal-and-readiness.md`, "The metric catalogue"); a
metric the catalogue offers only as secondary is never a success metric.
Write the label the way the setup screen shows it:

| Write this label | Use when the variant directly drives... |
| --- | --- |
| Add to cart rate | adding a product to the cart |
| Checkout conversion rate | completing a purchase |
| Viewed page: \<URL\> | reaching one specific page (a landing page, the checkout URL, a sale page) |
| Viewed page: page group \<name\> | reaching any page in a Noibu page group (product pages, collection pages, checkout, cart) |
| Bounce rate on page: \<URL\> | (only once the catalogue has a bounce metric) keeping shoppers who land on one page from leaving without a second page view. Lower is better: hypotheses say "will reduce bounce rate on …" |
| Bounce rate on page: page group \<name\> | (same) the same for every landing page in a page group (product pages, collection pages) |

So "more checkout starts" is `Viewed page: page group Checkout` (or the
checkout URL when the domain has no Checkout group), "more product page
views" is `Viewed page: page group Product`, and "more collection views" is
`Viewed page: page group Collection`. Use the page group names exactly as
the domain's data reports them (Batch 1 query #8 lists them); if the
domain has no page groups, fall back to the URL form with the path the
walkthrough recorded. Average order value ("Average order value") is a
secondary metric only while the catalogue lists it only as secondary.
Secondary metrics go up to the catalogue's `maxItems`, each from its
secondary list. Do not use metrics outside the catalogue (no revenue per session, which the console can't show; no bounce rate until the catalogue has it; no exit rate, scroll depth, email capture, or per-step
completion rates). If a test's natural KPI is unsupported, choose the nearest
supported metric and, at most, note in one clause what the test
consequently does not measure.

If checkout completion is not instrumented on the domain (Batch 1 check
#4), do not use Checkout conversion rate; use `Viewed page: page group
Checkout` (or the checkout URL) and say in one clause that the test
measures reaching checkout, not buying.

### Secondary metrics

Up to 3. They give directional context and never decide the winner, so pick
the ones that would catch a side effect of this specific variant (a cart
change that might depress order size: Average order value; a routing change
that might just shuffle traffic: Viewed page on the destination). "None" is
a fine value; do not pad.

### Targeting

Only write conditions the product can express: UTM campaign, UTM medium,
UTM source, UTM term, UTM content, device type (Mobile, which includes
tablets, or Desktop), and location (country, set in the console).
Conditions combine with "and". Example: "UTM medium is email and device
type is Mobile". If the evidence is not segment-specific, write "Everyone
(skip this section)": targeting narrows traffic, and less traffic means a
longer wait for a verdict, so recommend a condition only when the measured
gap lives in that segment. If a candidate's natural audience cannot be
expressed with these conditions (returning customers, cart value bands,
logged-in state), either widen it to everyone and note the dilution in one
clause, or drop the candidate; do not invent targeting the setup screen
does not offer. On a multi-market store, write the market as a location
condition to be added in the console after creation ("Location is United
Kingdom, set in the console"), and keep `createInput` free of it. (Custom attributes registered through the SDK can extend
targeting, but that is dev work, not a setup-screen option; if a test
genuinely needs one, say so in dev notes, not in Targeting.)

### Variations

Variation A is always "Original" and is the control; never rename it. Name
B (and C at most: more variants split traffic thinner and stretch the
verdict) with a short noun phrase describing the experience, because that
name is what the results page, the verdict banner, and the SDK's flag value
will carry ("Button above info box", not "Variant B"). Default to "split
equally"; recommend an uneven split only with a stated reason.

### Dev notes

Noibu owns the split, targeting, and metrics; the store's own code decides
what each variation renders, by reading the assignment from Noibu's SDK
(the pattern is documented in `references/shared/noibu-feature-flag-sdk.md`
for the skill that writes the code), so a developer is in the loop on every
test and the variation code must be live before the test starts. These
notes are the one to three sentences per lettered variation that tell that
developer what to build: the page, the element or block, and what changes.
Concrete enough to start from ("PDP: move the whole add-ons block after the
trust badges block in the product info column"), never actual code, and
never instructions for A (the control renders the current experience by
definition). The preview phase already found the right block to move; say
that block, not the inner element.

### Fix first

Omit when there is nothing verified to fix. When a verified defect (error,
broken element, copy contradicting policy, poor vitals) sits inside a
test's surface, one line: what to fix and why it would otherwise pollute
the test's result.

## Guardrails and results framing

Guardrails are fixed and automatic in the product: error rate, P95 LCP,
sample ratio mismatch. They warn; they never block. Do not present ordinary
metrics as "guardrails" and do not invent per-test guardrails. Results in
the product are Bayesian ("chance to win", verdict banners); do not explain
this on a report and do not fabricate expected lifts, run durations, or
power calculations. No confidence ratings, no sizing, no duration
estimates: the product computes "About N days to reach a verdict" from the
real traffic at setup. The one traffic figure a card carries is
`metricVolume`: the measured weekly count of the success metric's event,
which is a fact from this run's queries, not a projection.

## Ranking

Order by evidence strength × traffic exposure × plausible effect, not
novelty. Aim for 3 to 6 tests.
