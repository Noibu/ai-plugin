# NoibuFeatureFlag SDK: the one statement every A/B skill reads

Home: this file lives in the opportunity finder
(`ab-test-opportunity-finder/references/shared/`), which owns it. Any
skill that writes, reviews or QAs variation code cites it by that path
(inside a plugin, `../ab-test-opportunity-finder/references/shared/noibu-feature-flag-sdk.md`)
and restates nothing from it; when the product moves, this file changes
and the skills do not.

Sources: help.noibu.com articles 1676106141 and 1868677576 (re-read them if
the product has moved on), the `querying-noibu-data/references/ab-tests.md`
reference for what the platform records, and one customer implementation
observed in the field (marked as such below). Where this file says
"documented", the developer docs say it; where it says "observed", one
store's code does it and it has to be confirmed against the console's own
Implementation snippet before it becomes a rule.

## Keys and values (documented)

- A test's **flag key** is derived server-side from the test title when the
  draft is created, and is domain-prefixed (observed shape: `<numId>-<slug>`,
  for example `2083-free-shipping-bar`). Read it back from
  `noibu_list_ab_tests` (`key`) or the create result; never type it from
  memory, never strip or add the prefix.
- Each **variation's flag value is its variation name** as entered at setup.
  Variation names are therefore identifiers: keep them URL- and class-safe
  when naming a new test ("button-above-info" beats "Button above info box");
  when the test already exists, use its names verbatim and sanitize only in
  the class name, documenting the mapping.
- Both exist only once the test exists as a draft. Before that, say "derived
  from the title at creation" and have the developer confirm against the
  draft.

## Reading the assignment (documented, with one observed gotcha)

- Client: `window.NoibuFeatureFlag.getClient()`.
- Readiness: `client.addHandler("PROVIDER_READY", cb)` when
  `window.NoibuFeatureFlag` already exists, else the `noibuFeatureFlagReady`
  window event (`event.detail.client` is the client). Race readiness against
  a timeout; the loser is the control. 1,000 ms is the documented helper's
  default; one observed implementation waits up to 10 s after `window.load`
  for stores whose SDK loads late.
- Simple read: `client.getStringValue(flagKey, controlName)`. Synchronous,
  never throws, returns the default before the SDK is ready.
- Detailed read: `client.getStringDetails(flagKey, controlName)` returns an
  object with the arm and a `reason` (`SPLIT` for a live assignment, `CACHED`
  for a repeat visitor, `FLAG_NOT_FOUND` for a draft or stopped test, plus
  `errorCode` on failure).
- **Observed gotcha, to confirm:** the console's Implementation panel has been
  seen to destructure `const { variation } = client.getStringDetails(...)`,
  while the SDK's details object carries the arm in `variant` (and `value`),
  e.g. `{ variant: 'show-reassurance', value: 'show-reassurance', reason:
  'CACHED' }`. Copied verbatim, every visitor falls through to the control
  with no error. Until the snippet and the SDK are confirmed to agree, code
  that uses the details object reads
  `details.variant || details.variation || details.value || CONTROL`, and
  QA verifies the read on a flag that is already running. If the snippet is
  confirmed wrong, that is a product bug to file, not a convention to keep.
- Assignment is deterministic per browser and consistent across sessions;
  visitors excluded by targeting always get the control and never enter the
  results.

## What the platform records (from `ab-tests.md`)

- A session is tagged with its arm when the flag is **evaluated**, as a
  custom-attribute tuple: name = the test's `key`, value = the variation
  `key`. The regular analytics tools can slice by arm with a
  `CUSTOM_ATTRIBUTE_TUPLES` `CONTAINS_TUPLE` filter.
- Evaluation is not rendering. Code that evaluates the flag but does not
  render the variation (partial or late deploy, broken branch) counts
  visitors into an arm while they see the control, silently. A test started
  with no evaluation code deployed collects nothing. This is why variation
  code must be live before a test starts, and why a QA step verifies the
  arm actually renders.
- Recommended, not documented: report the arm the page **rendered** as a
  second custom attribute with a distinct name (for example
  `ab_rendered_<flagKey>`), so the assigned tuple and the rendered attribute
  can be compared when a challenger tracks the control suspiciously closely.

## Lifecycle facts that shape the code (documented)

- Variation code must be deployed before the test is started in Noibu.
- While RUNNING only the hypothesis and secondary metrics are editable;
  variations, split, targeting and the success metric are locked.
- STOPPED is final: the flag turns off and everyone sees the control. Noibu
  does not roll the winner in; the developer implements the winner directly
  and removes the flag read.
- The product has no force-variant or preview tool. The documented check is
  `client.getStringDetails(FLAG_KEY, CONTROL).reason === "SPLIT"`, and a
  scenario can be pinned with
  `NoibuFeatureFlag.setContext({ targetingKey: "qa-b" })` in separate
  incognito windows.

## The gating helper (documented pattern, one per codebase)

Reuse an existing Noibu gating helper when the codebase has one (search for
`NoibuFeatureFlag`, `noibuFeatureFlagReady`, `noibu` in layout or theme
files, script tags, a package dependency) and copy its pattern exactly.
Otherwise add this once, adapted to the codebase's module style, and gate
rendering on a root-element class, which diffs smallest and is reversible
with one line:

```js
// Noibu A/B test gating. Test: "<Title>"  Flag key: <key or "derived from title at creation">
// Deploy before starting the test in Noibu. Remove the flag read when the test is stopped.
(function () {
  var FLAG_KEY = "<flag key>";
  var CONTROL = "<control variation name>";   // the default: current experience
  var TIMEOUT_MS = 1000;

  function arm(client) {
    if (!client) return CONTROL;
    var d = client.getStringDetails ? client.getStringDetails(FLAG_KEY, CONTROL) : null;
    return (d && (d.variant || d.variation || d.value)) || client.getStringValue(FLAG_KEY, CONTROL) || CONTROL;
  }
  function apply(client) {
    var variation = arm(client);
    if (variation !== CONTROL) {
      document.documentElement.classList.add("nb-test-" + variation);
    }
    if (window.NOIBUJS && NOIBUJS.addCustomAttribute) {
      try { NOIBUJS.addCustomAttribute("ab_rendered_" + FLAG_KEY, variation); } catch (e) {}
    }
  }
  function onReady(cb) {
    if (window.NoibuFeatureFlag) {
      var client = window.NoibuFeatureFlag.getClient();
      client.addHandler("PROVIDER_READY", function () { cb(client); });
    } else {
      window.addEventListener("noibuFeatureFlagReady", function (e) { cb(e.detail.client); }, { once: true });
    }
  }
  var done = false;
  function once(client) { if (!done) { done = true; apply(client); } }
  onReady(once);
  setTimeout(function () { once(window.NoibuFeatureFlag ? window.NoibuFeatureFlag.getClient() : null); }, TIMEOUT_MS);
})();
```

Make the rendering change depend on `html.nb-test-<variation name>`. For
above-the-fold changes the helper must run early (head, or the top of the
theme's main script) so the class lands before first paint; below-the-fold
changes tolerate a swap after resolution. A CSS-only variation
(`html.nb-test-<name> .product__cta { order: -1 }`) is the ideal shape for
position, visibility and copy changes; markup changes only when the
variation adds something not on the page today.

## Conventions observed in one customer theme (detect, then fall back)

These are not SDK facts. A skill that writes code into an existing theme
looks for them and mirrors them when present; when absent, it uses the
documented helper above and does not introduce them unasked:

- One flag script per test under `assets/noibu-flag-<slug>.js`, and a gate
  section per test under `sections/noibu-<slug>-ab.liquid` placed through
  the template or section-group JSON (subtractive gate: the variation markup
  is always rendered and hidden until the flag says B).
- A `?nff_<name>=<variation key>` query parameter that forces an arm for QA,
  bypassing the SDK and its cache.
- A paint-time `localStorage` hint so returning visitors do not see a flash
  before the SDK resolves.
- `noibuFeatureFlagError` handling that falls back to the control.
- Never editing another test's flag file, or control-defining files such as
  `sections/header.liquid` and `layout/theme.liquid`, while tests run.

## Open question for the plugin

Which read is canonical for new code, `getStringValue` or
`getStringDetails`? This file recommends the details read with the
defensive field order because it also yields `reason` for QA, and keeps the
simple read as the fallback. Settle it here once, against the SDK source,
and every skill follows.
