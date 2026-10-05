# Live-site read (two batches, bundled scripts, goal-scoped, no screenshots)

Purpose: confirm or kill every data-derived candidate before it reaches the
output. For each candidate the read answers three things: (1) does the
variant I want to test already exist? (2) is the problem actually a defect
rather than a test? (3) what does this surface really contain, so the "Why
this test" and Dev notes lines are accurate and the preview scripts can be
written blind from recorded selectors?

The read is done by the main run and never owns a round trip of its own:
**Batch A** (homepage and policies) goes in the Block 3 message next to the
Batch 1 queries, and **Batch B** (the goal's surfaces, at the URLs Batch 1
named, one `browser_batch` call per page) goes in the Block 4 message next
to the Batch 2 queries. Each
surface is read by a bundled script from `scripts/walkthrough/` that
returns a small JSON object; nothing is authored by hand, nothing is read
with `get_page_text` on a big page, nothing is scrolled to be read, and
nothing is screenshotted (the preview phase shoots before and after at the
same scroll position, which is the only kind of before image that is any
use). The scripts never throw (a missing element is a `null` or `"absent"`
in the JSON, a crash is a `scriptError` field), so a batch never stops on
a site's quirks — only a navigation that lands somewhere unexpected stops
it, and the fix-up rule below covers that.

The rendered viewport is desktop and resizing is unreliable — never make
mobile-layout claims from this read; use the scroll/click query data for
those.

## The scripts (`scripts/walkthrough/`)

Each file is one paste into `javascript_tool`'s `text`, unchanged, on the
surface named. `Read` the ones the goal needs in Block 2 (they depend only
on the goal), all in one message, plus `dismiss_consent.js` whenever a
browser is available (every preview call pastes it). A script's own header comment says what
it does; the JSON it returns is the record of that surface.

| Script | Run on | Returns |
| --- | --- | --- |
| `read_home.js` | homepage | platform, storefront served (`Shopify.country`/currency, first price seen, `routeRoot` and `pathPrefix` for market routing, `multiMarketHint`), `testingTools` (third-party experimentation tools detected from globals and resource hosts), announcement bar verbatim, hero + CTA, search, sections below the fold with y offsets, footer policy links, cart URL, **a mid-priced in-stock product** (Shopify `/products.json`; the fallback when #5 names no product page), selectors + block containers, what the overlay dismiss did |
| `read_policy.js` | homepage, right after `read_home` | fetches the same-origin shipping / returns / FAQ pages without navigating (Shopify canonical `/policies/*` first, then footer links): per page the title, `notFound`, the opening line, and the sentences stating thresholds, fees, delivery times, windows, conditions, verbatim; plus `offSiteLinks` (help centers, returns portals) it did not read |
| `read_pdp.js` | the product page | title, price, in stock, above-the-fold checklist, CTA text + disabled state, variant selector, shipping/returns copy near the buy box verbatim (or `"absent"`), express pay, third-party widgets, selected variant id, selectors + containers |
| `add_to_cart.js` | the product page (**cart and checkout goals, "all goals"**) | clicks the real add-to-cart control, verifies via `/cart.js` (Shopify) or badge/drawer, falls back to `/cart/add.js`, and reads whatever opened (drawer text, free-shipping progress, checkout CTA) |
| `read_cart.js` | the cart page (or drawer) with one item in it | page vs drawer, items, shipping messages verbatim, free-shipping progress, promo field (visible or behind a toggle), estimator, checkout CTA, express pay, upsells, notes/gift/trust extras, remove control, selectors + containers |
| `click_checkout.js` → `read_checkout_entry.js` | cart → first checkout step (**checkout-completes goal only, observation only**) | guest vs account gate quoted, express pay, step labels, field count and labels, shipping options visible. Enters nothing. |
| `clear_cart.js` | the cart page, last | removes what was added: Shopify `/cart/clear.js` and verifies via `/cart.js`; otherwise fetches or clicks the remove control and re-reads the cart; its `verify` field says when a reload and a second `clear_cart` (which then only reads) are needed |
| `read_collection.js` | the top collection page | item count, default sort + options, filters, cards sample, **quick add on cards** (if it exists, any "add quick add" candidate dies), merchandising/search platform, card selectors + containers |
| `dismiss_consent.js` | any page | closes the consent banner (decline only) and popups; the `read_*` scripts already do this, so it is used by the preview batch |

Every script is self-contained (it carries the helpers it uses), so the
scripts run in any order, in any tab, and a store's CSP cannot break the
read. They are generated from `scripts/walkthrough/src/` by `build.py`;
edit the sources and rebuild, never the generated files. Keep any ad hoc
script free of the word "cookie" and of `innerHTML` / `script[src]` dumps:
the browser tool's content filter blocks scripts that look like they read
cookies or page source. Say "consent banner".

## Which scripts each goal reads

| Goal | Block 2 `Read`s | Batch B surfaces (URLs from Batch 1 #5) |
| --- | --- | --- |
| Add to cart rate | read_home, read_policy, read_collection, read_pdp | top collection page by visits → `read_collection`; top product page by visits → `read_pdp` |
| Product page views, Collection page views | read_home, read_policy, read_collection | top collection page by visits → `read_collection` (add `read_pdp` on the top product page for a product-views goal when #5 shows product pages as exits) |
| Viewed page: \<URL\> | read_home, read_policy, plus the script that fits the URL | that URL → `read_pdp` for a product, `read_collection` for a listing, otherwise one `find` for the element the goal is about |
| Checkout starts | read_home, read_policy, read_pdp, add_to_cart, read_cart, clear_cart | top product page → `read_pdp` → `add_to_cart` → cart URL → `read_cart` → `clear_cart` |
| Checkout completes | the checkout-starts set plus click_checkout, read_checkout_entry | the checkout-starts path, with `click_checkout` → `read_checkout_entry` → back to the cart URL before `clear_cart` |
| All goals | everything above except the checkout step | top collection → `read_collection`; top product page → `read_pdp` → `add_to_cart` → cart → `read_cart` → `clear_cart` |

The product page is the top `/products/` URL by visits in #5 (mobile and
desktop lists agree often enough; take mobile's when they differ, it is
most of the traffic). When #5 lists no product page, use
`read_home.product.url`. The collection page is the top `/collections/`
(or the platform's listing path) URL in #5; never the store's "shop all"
link, which is a dead or empty page on some themes. The cart URL comes from
`read_home.cartUrl`.

## How a script returns its result (read this before writing a batch)

The browser tool cuts any single result over 1,000 characters and blocks
results that look like query strings or base64. The scripts are built for
that: each one sanitizes its JSON, caps it at 3,600 characters (trimming the
longest arrays first), stashes it in `window.__nw`, and returns **chunk 1 of
900 characters**, prefixed `[chunk 1/N]` when there is more. So every
`read_*` script in a batch is followed by three tiny chunk items:

```
{"name":"javascript_tool","input":{"action":"javascript_exec","tabId":T,"text":"(window.__nw||'').slice(900,1800)"}}
{"name":"javascript_tool","input":{"action":"javascript_exec","tabId":T,"text":"(window.__nw||'').slice(1800,2700)"}}
{"name":"javascript_tool","input":{"action":"javascript_exec","tabId":T,"text":"(window.__nw||'').slice(2700,3600)"}}
```

Unused chunks come back empty, which costs nothing. Concatenate the chunks
(drop the `[chunk 1/N] ` prefix) and the JSON is whole. The small scripts
(`add_to_cart`, `click_checkout`, `clear_cart`) usually
fit in one return; give `add_to_cart` and `clear_cart` the chunk items
anyway, never `click_checkout` (it navigates, and a read during navigation
errors the batch). Never store the result anywhere else, never read it
back in other slice sizes, and never re-run a script to "see the rest".

## The two batches

**Time limit: one page per call.** A `browser_batch` call that runs past
about a minute returns nothing at all (every result in it is lost), and
Chrome keeps executing the rest of it, so the next browser call waits
behind it. Several `browser_batch` calls in ONE message run one after
another in the order written, each with its own limit. So a batch is
never one big call: it is one call per page (navigate, wait, that page's
scripts with their chunk items, 15 to 30 seconds), all written in the
same message. One call failing does not stop the calls after it.

**Tab:** Block 2's `tabs_context_mcp` with `createIfEmpty: true` returns
the tab id. Use it in every batch item; one tab for the whole read and
the previews. Never close it during the read: closing a group's last tab
removes the group, and a new tab costs a round trip of its own.

**Writing the items.** Put each script into its item's `text` exactly as
the file reads; the tool call's own JSON string escaping is the only
change. Never build the batch JSON with Bash or Python and copy it back:
the output has to be typed into the call again, which doubles the
payload, and long outputs come back truncated.

**Batch A — homepage and policies** (Block 3, beside the Batch 1 queries),
one `browser_batch`: `navigate` store URL → `computer` wait 3 →
`read_home` + 3 chunk items → `read_policy` + 3 chunk items. `read_home`
dismisses the consent banner and popups first (decline only, never accept;
a banner with no decline control is left and noted). Its result gives the
platform, the storefront served, the cart URL, the testing tools and a
fallback product.

**Batch B — the goal's surfaces** (Block 4, beside the Batch 2 queries),
URLs from Batch 1 #5 prefixed with the store origin, per the goal table
above. One `browser_batch` call per item below, written in this order in
the one message, each skipped when the goal does not read that surface:

1. Collection: `navigate` collection URL → wait 3 → `read_collection` +
   chunks.
2. Product page: `navigate` product URL → wait 3 → `read_pdp` + chunks →
   *(cart path only)* `add_to_cart` + chunks.
3. Cart *(cart path only)*: `navigate` cart URL → wait 3 → `read_cart` +
   chunks.
4. Checkout entry *(checkout-completes only)*: `click_checkout` → wait 4
   → `read_checkout_entry` + chunks.
5. Clear *(cart path only, always last, and always written even when an
   earlier call may fail)*: `navigate` cart URL → wait 2 → `clear_cart` +
   chunks → *(off Shopify, when `clear_cart` returned a `verify` note:
   `navigate` cart URL → wait 2 → `clear_cart` again, which then only
   reads)*.

A specific-page goal is one call on that URL with the fitting script.
Because the clear is its own call, the cart is emptied even when the read
before it fails. The tab stays open for the previews.

`add_to_cart` picks an in-stock option itself when the CTA is gated
("Select Size"), clicks the real control, and falls back to `/cart/add.js`
with an available variant when the click does not register; `cartNow`
names what is actually in the cart, so a wrong item cannot go unnoticed.
Some stores redirect `/cart` to a drawer over another page; `read_cart`
reads the drawer and says so in `surface`. Adding and removing one item
is the maximum state-changing action; it happens only on cart and checkout
goals and "all goals", it is reverted in the same message, and it is
disclosed in one clause of the closing chat message.

**Fix-up rule.** A call stops at its first failing item and returns
everything before it, a call that timed out returns nothing, and a script
can come back with a `notes` entry or a `null` where a candidate needs a
fact. Each surface may get ONE fix-up call, no more, and all fix-ups go
in one message. Do not spend calls diagnosing tabs after a timeout; the
fix-up call itself shows whether the tab is still there:
- A call timed out, or every call after a timed-out one came back empty:
  redo those surfaces, one call each. If the product-page call with
  `add_to_cart` was lost, do not add again: the item is usually in the
  cart, so the fix-up is `read_cart` then the clear call, and `cartNow`
  or `itemsInCart` says what was added.
- A result came back `[BLOCKED: ...]` (the browser tool's content
  filter): do not re-run the script or read its chunks another way.
  Record `blockedByBrowserTool` for it; for `add_to_cart`, the cart
  read's `itemsInCart` is the confirmation.
- Navigation errored or a script returned `scriptError` mentioning a
  destroyed context: the site navigated on its own (a theme that redirects
  to the cart on add, a region redirect). Continue from the next surface;
  on the cart, the item is usually there already.
- `add_to_cart` returned `added: false` twice (once in the batch, once in
  the fix-up): stop, describe the cart from `read_cart` on the empty cart
  and from click data, and say so on the page.
- `read_policy` returned `notFound` for every page: `navigate` to the best
  same-origin footer link from `read_home` and `get_page_text` it (policy
  pages are short); that is the one case `get_page_text` is right.
  Off-site help centers (`help.<domain>`) are listed in `offSiteLinks`;
  read one only if the same-origin pages said nothing about shipping.
- `read_collection` recognized no cards, or `read_pdp` returned a null
  title or price: one `find` for that element ("product card", "price
  next to the add to cart button") in the fix-up call, and record the
  selector it returns. Never re-author the whole read.
Do not open a second fix-up for the same surface; what is still missing goes
on the page as a caveat, and the preview batch's before shot is the last
look (a candidate the before shot contradicts is dropped there).

## What to look at in the results (the validation itself)

- **Storefront served.** Stores localize by IP: a browser in Canada sees CAD
  prices, different thresholds, and different copy from the US traffic that
  dominates the data. Compare `read_home.storefront` with where most
  sessions come from (Batch 1 device baseline grouped by COUNTRY_CODE if in
  doubt); if they differ, say so in the page's data line, and never report
  a threshold mismatch between two surfaces as a defect until both were
  read in the same storefront.
- **Market served.** `read_home.storefront.pathPrefix` and `routeRoot` say
  which market the browser landed in on a locale-routed store
  (`/en-gb/`, `/fr-fr/`); `multiMarketHint` is true when the store routes
  by locale at all. Compare them with the data's top market and decide
  whether a Phase 2 read under another prefix is needed (SKILL.md
  "Multi-market stores").
- **Other testing tools.** `read_home.testingTools` lists experimentation
  tools loaded on the page (Optimizely, VWO, Convert, AB Tasty,
  Kameleoon, Dynamic Yield, Intelligems, Shoplift, Visually and similar). An
  entry is not a defect and kills nothing; it goes on every card's overlap
  line and in the footer so the page can say the surface may already carry
  someone else's test.
- **Announcement bar vs policy.** The bar often states a shipping threshold;
  the policy page is the statement of intended behavior. Where they
  disagree, that is a "Fix first" defect, and the policy's number is the one
  used in variants. Where the policy is silent on a threshold the bar
  advertises, the bar is the best available statement and the silence is
  worth one clause.
- **What already exists.** Free-shipping progress in the drawer or cart,
  a promo field (even behind a toggle), express pay, quick add on cards,
  shipping copy near the buy box, an upsell block: each of these present
  kills the candidate that would "add" it. This is the #1 reason the read
  exists. The converse is not safe: `"absent"` or `null` can be a selector
  miss on an unfamiliar theme, so a candidate that exists only because a
  field came back empty is confirmed by the fix-up `find` or the preview's
  before shot before it ships.
- **Defects.** A disabled or sold-out CTA on a top product, a cart that did
  not take the add, a policy page that 404s, consent banners with no
  decline control covering the fold, copy contradicting policy, a dead
  "shop all" page: defects, not tests.
- **Selectors and block containers** come back with every element the
  scripts record (`selector`, `block`, `column`). Previews move the block,
  not the inner element, and having them recorded is what lets the preview
  phase write every injection script blind. If a candidate touches an
  element no script records, run one `find` for it during the fix-up
  batch rather than a later browser visit.

## The record (`walkthrough.json`)

The JSON each script returned **is** the record of that surface. In the
preview message (Phase 4), write `walkthrough.json` in the working
directory: one key per script name (`read_home`, `read_policy`,
`read_pdp`, `read_collection`, `read_cart`, `add_to_cart`,
`read_checkout_entry`, plus any Phase 2 read under its script name or
`find:<what>`), each value the script's JSON with chunks concatenated and
nothing edited, plus a `meta` key: `{"storeUrl", "surfaces": {"home":
"/", "collection": "/collections/x", "product": "/products/y", "cart":
"/cart"}, "fixUps": ["..."], "couldNotComplete": ["..."] or [],
"cartState": "cleared and verified" | "never added" | what remains}`.
`scripts/build_page.py` reads this file to put selectors and site facts
into `candidates.json`, so nothing from the read is retyped. Do not
summarize the JSON anywhere in prose: summarizing ("has free shipping
messaging") loses the threshold and the selectors.

## Conduct

- Do not check out, create accounts, enter personal data, or interact with
  payment surfaces. The checkout-entry stop observes the first step and
  enters nothing; if it shows nothing without data entry, skip it and rely
  on the funnel numbers, saying so. Adding/removing one cart item is the
  maximum state-changing action, it happens only on cart and checkout goals,
  and it must be reverted and disclosed.
- Decline non-essential tracking when a consent banner appears (the scripts
  do this). If the banner offers no decline control, leave it unanswered and
  work around it; never click Accept on someone else's store.
- Avoid clicking elements that trigger browser-native dialogs.
- If the browser is unavailable, run what you can, mark every structural
  claim as inferred-not-observed, and tell the user in one sentence which
  claims a 10-minute manual walkthrough would firm up.
