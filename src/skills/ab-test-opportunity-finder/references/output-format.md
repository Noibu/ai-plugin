# Output format: the "Recommended tests" page

The deliverable is ONE hosted page, built from a `page.json` you write and
published with the Artifact tool. Do NOT render the recommendations, or
any test from them, in the conversation. The chat gets only the closing
message in the fixed shape SKILL.md defines (quiet-mode rule 6).

The page's job: let a busy merchant read what each test is, see why the
data supports it, look at the variation next to the current site, and
create the test in Noibu with one click, all without leaving the page.
Every test is one section in that order: what to change → why → before
and after → the setup as Noibu will receive it → dev notes → the
"Create A/B test in Noibu" button.

## How the page is built

1. Write `page.json` in the working directory (fields below), next to the
   `walkthrough.json` the preview message wrote.
2. `python <skill-dir>/scripts/build_page.py page.json <domain-short>-test-recommendations.html`
   writes the page and `candidates.json` (the handoff, derived from
   `page.json` + `walkthrough.json`; never hand-written).
3. Publish that file with the Artifact tool: `icon: "flask"`, a one-sentence
   `description`, `files` mapping every `previews/…` image the JSON
   references plus `candidates.json`, and `capabilities: {"mcp": {"servers": [{"server": "<connector display name>", "tools": ["noibu_create_ab_test", "noibu_list_ab_tests"]}]}}`.
   The connector display name is the `<connector>` segment of this
   session's `mcp__<connector>__noibu_*` tool names (usually `noibu`).

The build script owns the HTML, the styling, and the button runtime, so
every run produces the same page; do not hand-write the page or edit the
generated HTML. If something in the page needs to change for every run,
change the script.

## page.json fields

Top level:

| Field | Content |
| --- | --- |
| `domain`, `domainId` | the resolved domain name and UUID |
| `server` | the connector display name (see above) |
| `goal` | the goal as the user chose it ("Increase add to cart rate"), or "All goals" |
| `successMetricLabel` | the goal's metric label, or omit for "All goals" |
| `dataLine` | "Noibu, <window> (<N> days, about <sessions> sessions, <mobile share>)", plus one clause when it applies: the market the page is written for, or "checkout is tracked on <sibling domain>" |
| `captureLine` | "Live-site check <date>, desktop browser<, <country> storefront (<currency>)>" |
| `caveats` | footer lines, each only when it applies: the localized-storefront or multi-market note (which market the page is written for, and that per-market targeting is set in the console), "mobile layout was not previewed" (always, when any test is mobile-only or rests on mobile evidence: the browser is desktop and nothing else captures), the baseline note, the thin-traffic note, the instrumentation note (cart or checkout events not recorded, or the payment step not fully tracked), the blank-country exclusion, the third-party testing tool on the page; nothing else |
| `tests` | the ranked tests, 3 to 6 (2 if only 2 survived, and the closing message says why) |
| `outsideGoal` | at most 2 one-line candidates that survived validation but act on another metric; omit for "All goals" runs |
| `run` | not rendered; carried into `candidates.json`: `window` ({start, end, days, sessions, mobileShare}), `readiness` ({receivingData, funnelInstrumented, paymentStepTracked, businessContext, thinTraffic}), `market` ({multiMarket, written_for}), `siblings`, `companyId`, `platform`, `testingTools`, `existingTests`, `killed` ([{idea, reason}] for every candidate validation removed) |

Per test:

| Field | Content |
| --- | --- |
| `title` | the test's name: name the change, not the metric ("Quick add on collection cards") |
| `surface` | the URL path(s) the test lives on |
| `variationName` | B's short noun phrase ("Add to cart button on cards") |
| `what` | one or two plain sentences: the change a shopper would notice |
| `why` | one or two sentences: the measured problem, at most 3 numbers, plus what the live site showed; correlational evidence labeled in one clause |
| `before`, `after` | paths under `previews/` to the captured images, or `null` when capture failed |
| `previewNote` | when there are no images: why, in one clause |
| `beforeAlt`, `afterAlt`, `beforeCaption`, `afterCaption` | what each image shows (optional; defaults exist) |
| `setup` | the six fields as the create screen shows them (rules below): `title`, `hypothesis`, `successMetric` (label plus baseline in parentheses), `secondaryMetrics`, `targeting`, `variations` |
| `metricVolume` | one line: the measured weekly volume of the event the success metric counts, in this test's targeting, plus "Noibu shows the days to a verdict at setup" (battery, "Metric volume"); never a day count, sample size or lift |
| `overlap` | one line, only when it applies: a RUNNING or DRAFT Noibu test on the same surface (title and status), or a third-party testing tool the walkthrough found on the page; else omit |
| `devNotes` | 1 to 3 sentences per lettered variation: page, element or block, what changes; selectors welcome, code never |
| `fixFirst` | one line, only when a verified defect sits inside the test's surface; else omit |
| `createInput` | the exact `noibu_create_ab_test` arguments for this test, minus `domainId` and `rationale` (the page adds those): see `references/create-drafts.md` for the mapping. The page shows `setup`; the button sends `createInput`; they must say the same thing |
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

The product supports exactly three success metrics (the set the Noibu
create-test API accepts: ADD_TO_CART_RATE, CHECKOUT_CONVERSION_RATE,
PAGE_VIEW_TO_URL_RATE with either a page URL or a page group). Write the
label the way the setup screen shows it:

| Write this label | Use when the variant directly drives... |
| --- | --- |
| Add to cart rate | adding a product to the cart |
| Checkout conversion rate | completing a purchase |
| Viewed page: \<URL\> | reaching one specific page (a landing page, the checkout URL, a sale page) |
| Viewed page: page group \<name\> | reaching any page in a Noibu page group (product pages, collection pages, checkout, cart) |

So "more checkout starts" is `Viewed page: page group Checkout` (or the
checkout URL when the domain has no Checkout group), "more product page
views" is `Viewed page: page group Product`, and "more collection views" is
`Viewed page: page group Collection`. Use the page group names exactly as
the domain's data reports them (Batch 1 query #8 lists them); if the
domain has no page groups, fall back to the URL form with the path the
walkthrough recorded. Average order value exists as a secondary metric
only. Do not use metrics outside this set (no bounce rate, revenue per
session, exit rate, scroll depth, email capture, or per-step completion
rates). If a test's natural KPI is unsupported, choose the nearest
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
this on the page and do not fabricate expected lifts, run durations, or
power calculations. No confidence ratings, no sizing, no duration
estimates: the product computes "About N days to reach a verdict" from the
real traffic at setup. The one traffic figure a card carries is
`metricVolume`: the measured weekly count of the success metric's event,
which is a fact from this run's queries, not a projection.

## Ranking

Order by evidence strength × traffic exposure × plausible effect, not
novelty. Aim for 3 to 6 tests.
