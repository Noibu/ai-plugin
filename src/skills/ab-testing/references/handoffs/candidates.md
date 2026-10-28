# `candidates.json`: the handoff from the finder half to the build half

Written by `scripts/build_page.py` in Phase 5, next to the per-test
reports, and published with each of them as a supporting file (for
people who download a report's files; the skill never reads it back
from there), never mentioned in chat. It
carries the same tests the reports show, in the shape the build half (drafting the
code, QA, and building and starting one test)
needs to act without re-running the analysis or re-reading the
site: the evidence with its numbers, the surfaces, the selectors and block
containers the site read recorded, the exact create arguments, the traffic
line and the overlap notes.

It is **derived, never authored**: the build script merges `page.json`
(each test's `title`, `why`, `setup`, `createInput`, `metricVolume`,
`overlap`, `fixFirst`, previews, plus the optional `handoff` and `run`
blocks `references/output-format.md` describes) with `walkthrough.json`
(the site read's script JSONs, keyed by script name, plus `meta`; see
`references/site-validation.md`, "The record"). A test inherits the
`selectors` of the script that read its surface (`surfaceTemplate` →
`read_home` / `read_collection` / `read_pdp` / `read_cart` /
`read_checkout_entry`) and a few verbatim fields from that JSON as
`siteFacts`. Nothing in it is new analysis, and nothing in it is typed
twice: if a field is wrong here, fix `page.json` or `walkthrough.json` and
rebuild.

Home: this schema lives here, in the skill's finder half, which writes
the file in Phase 5; the build half reads it from Stage 1 on. The file
is scoped to the chat that produced it: the build half reads only the
copy in this chat's working folder, never the copy published with the
page, a copy from another chat, or one found through the artifact
gallery. The finder itself never reads this file during a run.

## Shape

```json
{
  "schema": "noibu.ab-candidates/1",
  "generatedAt": "2026-10-03T14:20:00Z",
  "domain": "www.example-store.ca",
  "domainId": "00000000-0000-4000-8000-000000000000",
  "pageUrls": {"1": "https://claude.ai/artifact/…"},   // one entry per published report, keyed by rank; added by the republish after each publish (output-format.md, step 4)
  "goal": "Increase add to cart rate",
  "successMetricLabel": "Add to cart rate",
  "dataLine": "Noibu, Sep 3 to Oct 3, 2026 (30 days, about 483,000 sessions, 78% on mobile)",
  "captureLine": "Live-site check Oct 3, desktop browser, Canada storefront (CAD)",
  "platform": "shopify",
  "testingTools": ["Visually"],
  "storefront": {"country": "CA", "currency": "CAD", "routeRoot": "/", "pathPrefix": null, "multiMarketHint": true},
  "surfaces": {"home": "/", "collection": "/collections/plush", "product": "/products/silver-star-plush-toy"},
  "cartState": "never added",
  "couldNotComplete": [],
  "companyId": 2420,
  "browser": "built-in",
  "siblings": [],
  "window": {"start": "2026-09-03", "end": "2026-10-03", "days": 30, "sessions": 482560, "mobileShare": 0.78},
  "market": {"multiMarket": false, "written_for": "CA"},
  "readiness": {"receivingData": true, "funnelInstrumented": true, "paymentStepTracked": false, "businessContext": false, "thinTraffic": false},
  "existingTests": [],
  "caveats": ["..."],
  "tests": [
    {
      "rank": 1,
      "title": "Quick add on collection cards",
      "surface": "/collections/plush and every other collection page",
      "surfaceTemplate": "collection",
      "what": "...", "why": "...",
      "successMetric": {"metric": "ADD_TO_CART_RATE"},
      "metricVolume": "About 6,500 add-to-cart shoppers a week in this targeting. Noibu shows the days to a verdict at setup.",
      "evidence": [
        {"claim": "Collection pages reach 29% of sessions", "numbers": {"collectionGroupSessions": 141000, "allSessions": 482560}, "source": "batch1#8, R2", "correlational": false}
      ],
      "siteFacts": [{"cards": {"count": 18, "aboveFold": 0, "sample": ["..."]}}, {"quickAdd": {"present": false}}],
      "variations": [
        {"name": "Original", "isControl": true, "trafficSplit": 50},
        {"name": "Add to cart button on cards", "isControl": false, "trafficSplit": 50,
         "devNotes": "Collection grid: add an Add to cart control ...",
         "selectors": {"productCard": {"selector": "div.product-summary", "block": "div.results-grid__item", "column": "div.results-grid"}, "cardPrice": {"selector": "div.product-summary__prices"}},
         "preview": {"before": "previews/test-1/b/before.jpg", "after": "previews/test-1/b/after.jpg", "viewport": "desktop"}}
      ],
      "setup": {"title": "...", "hypothesis": "...", "successMetric": "Add to cart rate (about 5.8%)", "secondaryMetrics": "...", "targeting": "Everyone (skip this section)", "variations": "..."},
      "createInput": {"title": "...", "hypothesis": "...", "successMetric": {"metric": "ADD_TO_CART_RATE"}, "variations": [{"name": "Original", "isControl": true, "trafficSplit": 50}, {"name": "Add to cart button on cards", "isControl": false, "trafficSplit": 50}]},
      "consoleFollowUps": [],
      "overlap": "Visually is loaded on every page ...",
      "fixFirst": "Mobile CLS on /collections/plush is 0.31 at p75 ..."
    }
  ],
  "outsideGoal": ["one line", "one line"],
  "killed": [{"idea": "Shipping reassurance beside the PDP buy box", "reason": "already present: the PDP shows a Free shipping block above the buy box; caught by the preview's before shot"}]
}
```

## Field rules

- `tests[].createInput` is byte-identical to the report's `createInput` for
  the same test, so the build half can create the draft without
  re-mapping. `consoleFollowUps` lists what the create API cannot set
  (location targeting for a market, a country condition).
- `evidence[].numbers` carries the figures that appear in the card's
  `why`, with the battery query they came from in `source`. A downstream
  skill writing a hypothesis quotes these, never the prose. They come from
  `page.json`'s `handoff.evidence`; a test without one has `[]`.
- `variations[].selectors` are the site read's recorded `selector`,
  `block` and `column` values for the surface, verbatim from
  `walkthrough.json`, plus anything `handoff.selectors` adds (a `find`
  result). They are what lets a code step grep the theme and a QA step
  write its change-specific check without another browser visit.
- `siteFacts` are verbatim fields from the surface's script JSON (cards,
  quick add, shipping copy, express pay, widgets, and so on), not a
  summary; `walkthrough.json` itself is the full record when more is
  needed.
- `metricVolume` is the measured weekly volume behind the card's traffic
  line; no day counts or sample sizes, for the same reason the page has
  none.
- `readiness` records what Block 2 found so the build half does not
  re-check it, and `killed` records what validation removed so nobody
  re-proposes it. `cartState` says whether a cart add happened in the
  read ("never added" on goals that do not touch the cart).
  `readiness.splitCheckout` is present only on a store whose checkout runs
  on another Noibu domain and names that domain; such a run ships no
  checkout-metric or checkout-page test.
- `browser` says which browser did the site read (`built-in`, `chrome` or `none`); `previewBrowsers` says which took the desktop and the mobile previews (by default `chrome` for desktop and `built-in` for mobile); `preview.viewport` is `mobile` when the pair was shot at phone size (375×812) in the built-in browser, otherwise `desktop`.
- Paths under `previews/` are relative to the published page, the same
  as in `page.json`.
- Keys the run did not supply are absent rather than `null`, except
  `overlap` and `fixFirst`, which are explicit nulls so a reader can tell
  "checked, nothing" from "not checked".
