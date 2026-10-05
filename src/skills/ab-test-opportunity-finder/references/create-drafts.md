# The "Create A/B test in Noibu" button

Purpose: turn a recommendation into a real DRAFT test in the customer's
Noibu account with one click, on the page, by the person who decides. A
draft serves no traffic and stays fully editable; starting it is a
separate action in the console, after the variation code is deployed.

The button is built into every test section by `scripts/build_page.py`.
This skill never calls `noibu_create_ab_test` itself: creating objects in
a customer's account is the viewer's decision, made on the page, with the
viewer's own connector credentials. What the run does is produce a
correct `createInput` per test and publish the page with the right
capability; the runtime does the rest.

## What the runtime does (so you know what to promise)

- Declares `mcp` for the Noibu connector with two tools:
  `noibu_create_ab_test` (the button) and `noibu_list_ab_tests` (to grey
  out tests that already exist on the domain, so nobody creates a
  duplicate). A page with a connector manifest is organization-internal;
  it cannot be shared publicly.
- On load, resolves `claude.use("mcp")`. When that is `null` (the page is
  open somewhere without the runtime), every button is disabled with a
  line saying to open the page in claude.ai with the Noibu connector.
  When the viewer has not added the connector, or must reconnect it, the
  buttons are disabled with the matching fix copy; the first call asks
  the viewer's consent for the connector.
- One click creates. The setup fields sit right above the button, the
  draft serves no traffic and is one delete in the console, and the
  existing-test check below makes a duplicate impossible, so there is no
  second confirmation step: the button reads as light as approving a
  recommendation, which is the point of putting it on the page.
- On success it shows the derived flag key (and id) from the result and
  the one reminder that matters: deploy the variation code before
  starting the test. A duplicate-title rejection turns the button into
  "Already in Noibu". Other failures show their fix in one line and
  re-enable the button; a "Noibu did not answer" outcome tells the viewer
  to check the console before trying again, because the draft may exist.
- Never starts, updates, or deletes a test.

## Mapping a setup block to `createInput`

The setup block is written in the create screen's vocabulary, so each
field maps directly. `domainId` and `rationale` are added by the page;
everything else goes in `createInput` exactly as the tool takes it.

| Setup block field | `createInput` |
| --- | --- |
| Title | `title` (verbatim; the backend derives the flag key from it) |
| Hypothesis | `hypothesis` (verbatim) |
| Success metric: Add to cart rate | `successMetric: {metric: "ADD_TO_CART_RATE"}` |
| Success metric: Checkout conversion rate | `successMetric: {metric: "CHECKOUT_CONVERSION_RATE"}` |
| Success metric: Viewed page: \<URL\> | `successMetric: {metric: "PAGE_VIEW_TO_URL_RATE", pageUrl: "<URL>"}` (exact page URL) |
| Success metric: Viewed page: page group \<name\> | `successMetric: {metric: "PAGE_VIEW_TO_URL_RATE", pageGroup: "<name>"}` (name exactly as Batch 1 query #8 listed it) |
| Secondary metrics (up to 3) | `secondaryMetrics`: same mapping, plus Average order value → `{metric: "AVERAGE_ORDER_VALUE"}`; "None" → omit |
| Targeting: device type is Mobile / Desktop | `deviceTypes: ["mobile"]` / `["other"]` (no "desktop" value exists; "other" is what the console shows as Desktop) |
| Targeting: UTM \<parameter\> is \<value\> | `utmConditions: [{parameter: "utm_<parameter>", values: ["<value>"]}]`, one entry per condition (ANDed, matching the block's "and") |
| Targeting: location (country) | not supported by the tool: leave it out of `createInput` and say in `setup.targeting` that the country condition is added in the console after creation |
| Targeting: Everyone (skip this section) | omit `deviceTypes` and `utmConditions` |
| Variations: A: Original (control) · B: \<name\>, split equally | `variations: [{name: "Original", isControl: true, trafficSplit: 50}, {name: "<B name>", isControl: false, trafficSplit: 50}]` (three-way: 34/33/33); explicit percentages carry over as written |

The control is always the current experience: `isControl: true` goes on
"Original" and nowhere else. Splits must sum to 100. Variation names
become the flag values the SDK serves, verbatim, so keep the page's
names and the `createInput` names identical.

## What to say

The closing message says, in one clause, that each test on the page has
a button that creates it as a draft in Noibu, and carries the reminder
that variation code must be live before a test is started (shoppers
bucketed into a variation whose code is not live see the control while
being counted against it, and that data cannot be repaired).
