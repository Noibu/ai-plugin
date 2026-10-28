# Variation previews (every test, before delivery)

Purpose: let the merchant *see* each recommended variation next to the
current site before anyone builds it. Noibu's developer docs say the
product has no force-variant or preview tool, so this is the only visual
check that exists before code is written. A recommendation that can be
looked at gets discussed and approved; one that has to be imagined stalls.
Each test's report shows Original and the
variation side by side, between the evidence and the button that creates
the test.

This phase runs for every surviving test, between synthesis and building
the reports (`references/finder/phases.md`, Phase 4). It is part of the deliverable: every
test's report carries its before/after pair, or the reason there is none.

## What a preview is, honestly

A preview is an approximation: the variation's *visible* change applied to
the live page with a short DOM/CSS script, captured as screenshots. It is
not the implementation. Each report's note says so in one line.
Never present a preview as what the test will ship.

All preview files live under `previews/` in the working directory (the
same place `page.json` is written), never inside the skill directory: the Artifact tool only publishes supporting files from
the working directory or scratchpad.

## Two outcomes, in order of preference

1. **Live render and capture in the viewport's browser** (the ideal, and
   usually the whole job). The browsers are the ones
   `references/finder/browser.md` "The browser" chose: **desktop
   previews in Claude in Chrome** (the desktop preview tab, a real
   full-size desktop window), **mobile previews in Claude's built-in
   browser** (the run's tab, at the phone preset). When Chrome is not
   connected, desktop previews run in the built-in browser at the probed
   desktop width; when the built-in browser is absent, Chrome takes the
   mobile tests as described under "Viewport" below. Apply the injection script to the real page
   so the user can look at it (in a Chrome tab they control, or in the
   desktop app's browser pane), so the selectors are proven against the
   real DOM the shopper gets (logged-out, region, personalization), and
   so the screenshots are real pixels. Both browsers save the screenshot
   as a JPEG in the cloud workspace: the built-in browser's full-scale
   `computer` screenshot reports it on its `[Image: source: <path>]`
   line, and Chrome's `computer` screenshot with `save_to_disk: true`
   returns the path. That file is exactly what the hosted page needs. One
   `browser_batch` call per surface and viewport, all in one message;
   each does (built-in only: set the viewport) → navigate → wait →
   dismiss → settle → instant scroll to the change → wait → screenshot
   (before) → inject → wait → screenshot (after).
2. **Text-only preview.** When no browser was found (`references/finder/browser.md` "The
   browser", step 4), or a surface's two allowed calls did not
   produce a usable pair, the hosted page carries a plain description of
   what the variation looks like with a one-line note saying why there is
   no image. That is graceful failure: the user still gets a link and an
   explanation, never an error dump.

There is no headless or in-container capture: the cloud workspace reaches
the web only through an allowlist proxy, so a browser inside it cannot
load the store. The two browsers are the only source of images. The one
switch allowed is for desktop shots: when a desktop surface's Chrome call
and its one retry both fail (verification page, tab stuck in the
background, Chrome disconnected), that surface and the remaining desktop
ones move to the built-in browser at the probed desktop width, when it is
available. Mobile shots never move to Chrome mid-run. Never pass `scale` on a capture screenshot in the built-in
browser: the saved file is the scaled image, and a scaled-down capture is
too small for the page.
Whatever was not possible is one footer line on the page, never a
stack trace.

## Injection technique: move blocks, then check the layout held

Product pages on modern themes are a flex or grid column of blocks
(Shopify's `group-block-content`, a `shopify-section` per block on
landing pages). Moving an inner element out of its block into another
block's parent breaks that layout, and the first attempt on a real store
did exactly that: the whole product column collapsed onto the image. The
rule: move the **block-level sibling** that contains the element, not the
element. Find it by walking up from the element until its parent also
contains the target, then move that child next to the target's own
block-level child of the same parent. Have the injection script measure a
stable landmark (the `h1`'s left edge, the main image's width) before and
after the move and return "layout shifted" if it changed by more than a
couple of pixels; on that return, reload the page and try the next-larger
container rather than shipping a broken picture. For added elements (a
new button on cards), append a styled element inside the card's own
bottom row rather than restructuring the card.

Screenshots come from the top of the page unless the change is below the
fold, and then from a single scroll position shared by the before and the
after shot. Set it with an instant scroll, never a smooth one: themes that
set `scroll-behavior: smooth` are still animating when the screenshot
fires and the frame comes back blank or half-rendered. The scroll item is
one small `javascript_tool` call before the before shot:

```js
(() => { document.documentElement.style.scrollBehavior = 'auto';
  const el = document.querySelector('<the element the change is about>');
  if (!el) return 'selectors missing: anchor';
  window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + scrollY - 260), behavior: 'instant' });
  return 'scrolled to ' + scrollY; })()
```

followed by a two-second wait (lazy sections need it) and then the before
shot; the injection must not scroll again, so the after shot lands on the
same pixels. Never scroll-and-capture repeatedly.

## Step 1: write the injection script per variation

One JS file per lettered variation (B, and C when present), plus an
optional CSS file, saved under `previews/test-<n>/<letter>/` in the
working directory. Rules that keep it honest and reusable:

- Use the selectors and block containers recorded during the site read:
  every element in the scripts' JSON carries `selector`, `block` (the
  block-level sibling to move), and `column` (its layout parent). Never
  guess a selector from how stores usually look. If one was not recorded,
  the injection script itself finds the block: walk up from the element
  until the parent contains the target, and move that child; return
  "selectors missing: <name>" if the element is absent.
- Make the script refuse when the variation is already there. Before it
  changes anything it checks for the thing it would add or move (a
  shipping line under the buy box, an add control on a card, a button
  within a couple of hundred pixels of the price) and returns "already
  applied: <what it found>" instead. That return, like a before shot that
  plainly shows the feature, means the candidate slipped through
  validation: drop it from `page.json` and record it in `run.killed`.
- Change only what the Dev notes describe. A preview that also "tidies up"
  other things misrepresents the test.
- Wrap in an IIFE that returns a short string on success and a
  "selectors missing: ..." string on failure, so the browser
  `javascript_tool` result confirms the change applied.
- Use real copy from the run (policy thresholds, announcement text). Never
  invent a threshold or claim in preview copy that the policy documentation
  does not support.
- Keep it idempotent and side-effect free: no network calls, no cart
  changes, no form submits, no navigation, nothing that triggers a dialog.
- **Viewport, and which browser takes it.** A mobile test (targeting
  Mobile, or its evidence is mobile) is previewed in the **built-in
  browser** at the `"mobile"` preset (375×812 with a phone user agent, so
  the theme serves its mobile layout). A test whose change applies to
  every device but whose evidence is mobile is shot at mobile size there
  too. Everything else is a desktop preview, shot in **Claude in
  Chrome** on the desktop preview tab at the window's own size (never
  resized; Chrome resizing is unreliable). Only when desktop previews fall
  back to the built-in browser are they shot at the **probed desktop
  width** (below), height 540: never 1366×900 there (the pane is smaller
  than that, and a scaled-down desktop window comes back as a tiny page in
  the corner of a mostly blank screenshot), and never the responsive
  `"desktop"` preset (in a narrow pane it is about 500px wide and the
  theme serves its mobile layout). When there is no built-in browser,
  a mobile-only change is previewed in Chrome on desktop when the same
  element exists there (the caption says so), and is text-only when it
  does not.
- **Mobile selectors.** The site read recorded selectors at desktop
  size, and many themes render separate mobile copies of the header,
  buy box or filters, hiding the desktop one. An injection script meant
  for a mobile shot picks the first *visible* match
  (`[...document.querySelectorAll(sel)].find(e => e.getClientRects().length)`)
  rather than `querySelector`, and returns "selectors missing: <name>
  (mobile)" when no visible match exists.

Shape:

```js
(() => {
  const cta = document.querySelector('form[action="/cart/add"] button[type="submit"]');
  const ship = document.querySelector('.product__shipping-info');
  if (!cta || !ship) return 'selectors missing: ' + [!cta && 'cta', !ship && 'ship'].filter(Boolean).join(', ');
  ship.parentNode.insertBefore(cta, ship);
  return 'moved add-to-cart above shipping info';
})()
```

The dismiss script already exists: `scripts/walkthrough/dismiss_consent.js`
closes the consent banner (decline only) and
marketing popups so screenshots show the page, not the modal. Run it in the
browser as the item after each navigate and wait, before the scroll and
the before shot. Popups that open later than the dismiss (a sign-up
dialog on a timer) will show in a shot; one extra `javascript_tool` item
that clicks a control whose text or aria-label is "Close dialog" is the
allowed fix, and never an Accept.

## Probe the desktop width first (only when desktop previews run in the built-in browser)

Skip this section when Chrome is taking the desktop previews: Chrome's
window is already a full desktop. Run it once, before the first desktop
preview call, only when Chrome is not connected, or when desktop shots
fell back to the built-in browser mid-run (then in the message that
retries them).

Every theme switches from its mobile layout to its desktop layout at its
own breakpoint, and the pane is too small to show a full 1366px desktop,
so a desktop preview needs the smallest width at which this store serves
its desktop layout. Find it in one `browser_batch` on the run's tab,
before the first desktop preview call: for each width in 640, 768, 801,
901, 1025, 1201 (height 540), run `resize_window` then the check below,
which returns `"<width>: desktop"` or `"<width>: mobile"` (a `burger` is a short-labelled menu button near the top of the page; `links` counts visible header links). No navigation:
media queries re-evaluate on resize.

```js
(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 1 && r.height > 1 && c.display !== 'none' && c.visibility !== 'hidden'; };
  const id = (e) => (e.getAttribute('aria-label') || '') + ' ' + e.className + ' ' + e.id;
  const burger = [...document.querySelectorAll('button, a, [role="button"]')].find((e) => /menu|hamburger|burger|toggle/i.test(id(e)) && !/search|cart|account|currency|filter|sort|dropdown|submenu|sub-menu/i.test(id(e)) && (e.innerText || '').trim().length < 12 && vis(e) && e.getBoundingClientRect().top < 200);
  const links = [...document.querySelectorAll('header a[href], nav a[href]')].filter((a) => vis(a) && a.getBoundingClientRect().top < 400 && (a.innerText || '').trim().length > 1).length;
  return innerWidth + ': ' + (!burger && links >= 4 ? 'desktop' : 'mobile') + ' (burger ' + !!burger + ', links ' + links + ')';
})()
```

Take the smallest width that returns `desktop` and add 20px: that is the
run's desktop preview width (record it in `walkthrough.json` as
`meta.desktopPreviewWidth`). If none of the widths returns `desktop`, or
the smallest is above 1100 (the pane would scale it down too far), every
desktop preview is text-only with the note "the browser pane was too
narrow for the desktop layout". Reset the tab with preset `"desktop"` at
the end of the batch. If the smallest `desktop` width is right at a
ladder step (801 here means a breakpoint at 801px), the +20px keeps the
page clear of it.

## Step 2: live render (desktop in Chrome, mobile in the built-in browser)

The browsers are the ones `references/finder/browser.md` "The browser" chose, whose tools Block 1
loaded; if no browser was found there is no preview batch, and the page
ships text-only with the footer's desktop-app suggestion.

**Tabs.** Desktop previews use the desktop preview tab in Chrome that
Block 4 opened; mobile previews use the run's tab in the built-in
browser, which the site read left open. If one is gone, open a new one in
the message before (`tabs_context_mcp` with `createIfEmpty: true` in
Chrome, `preview_start` with the store URL in the built-in browser). When
a browser has fallen back to cover the other's viewport, its own tab is
used for both.

In ONE message: save the injection scripts under `previews/`
with Bash, and write one `browser_batch` call per surface and viewport,
never two surfaces in one call (a call that runs past about a minute
returns nothing, and four surfaces in one call do). Desktop calls go to
Chrome's `browser_batch` and mobile calls to the built-in browser's; the
two browsers run side by side, so mixing them in one message costs
nothing. A built-in browser call's first item is `resize_window` (preset
`"mobile"` for a mobile test, or `{"width": <probed desktop width>,
"height": 540}` for a desktop test that fell back there), set before
`navigate` so the page loads as that device and a failed earlier call
cannot leave the wrong size behind; Chrome calls have no resize item.
When a mobile test and a desktop test share a surface, they are two
calls, one per browser. Then: navigate → wait 4 seconds →
run `dismiss_consent.js` → run `settle_capture.js` (see "Busy pages and
background tabs" below) → the instant scroll item above → wait 2 seconds
→ screenshot saved to disk (before) → run the injection script with
`javascript_tool` → wait 2 seconds → screenshot saved to disk (after).
"Saved to disk" is a full-scale `computer` screenshot in the built-in
browser and `save_to_disk: true` in Chrome. The calls run one after another in the
order written, each with its own time limit, and one that fails does not
stop the next. Both shots of a pair come from one call at one scroll
position; the site read saved no screenshots and a before image from
another moment would not line up. Write every injection script from the
recorded selectors and block containers, so nothing is inspected at
preview time, and paste it into its item's `text` as written (never
generate the batch JSON with a script). A call stops at the first failing
action: read the injection's return value ("selectors missing" means the
recorded selector does not match the live DOM: fix that script from the
error; "layout shifted" means the move broke the column: move the
next-larger block; "already applied" means the candidate is dead: drop
it) and run one second call for that surface in the next message. Do not
open a third. The after screenshot is also your
check: it must show the Dev notes' change and nothing else, and the two
shots are the last look at the surface: if the before shot, or anything
in the after shot the injection did not add (a section that loaded
late), plainly shows the feature the variation would add, the test is
dropped and a footer line says so. Copy the saved JPEGs into `previews/test-<n>/<letter>/`
as `before.jpg` and `after.jpg` (in the built-in browser, the paths on
the two screenshots' `[Image: source: ...]` lines).

When the user is present, leave each browser's tab on its last variation
so they can look at it (the desktop one in the Chrome tab, the mobile one
in the app's browser pane at phone size), and say so in a footer line;
otherwise close both in the message that ends the run. A Chrome desktop
preview tab that took no preview (no desktop test survived) is closed in
that message either way. Never close it in a preview call: a surface that needs
its second call would then need a new tab first, which costs a round
trip.

Chrome's rendered viewport is desktop; do not make mobile claims from it.
Mobile tests are shot at phone size in the built-in browser, and the
mobile before shot is a real look at the phone layout, so a mobile
variation it shows already in place is dropped like any other. Only when
there is no built-in browser does a mobile test land in Chrome; then the
page's footer says the mobile layout was not previewed whenever a test is
mobile-only or its evidence is mobile.

## Busy pages and background tabs

Two things stop a screenshot even when the injection is right:

**The page never settles.** Testing tools (Optimizely, VWO, AB Tasty and
similar) can hide the page with an anti-flicker snippet until their
experiments load, and autoplaying heroes, carousels and videos keep the
frame changing. `scripts/walkthrough/settle_capture.js`, run after
`dismiss_consent.js` on every surface, removes a hiding style a testing
tool left in place, unhides `html`/`body`, finishes or pauses animations,
turns off transitions, pauses videos and stops carousel autoplay. It does
not disable the testing tool, so an experiment already running on the
surface still shows in both shots, as it would for a shopper in that
bucket. It returns JSON naming what it changed. A page whose main thread
stays blocked by its own scripts is not fixed by this: the second call
for that surface uses a 10-second first wait instead of 4, and if that
also fails, the variation is text-only with the note "the page did not
finish loading in time".

**The tab is not in front.** In the built-in browser this means the
browser pane is hidden (something else is open in the app's side panel)
or closed. Attended run: call `Claude_Browser__tabs_context` (its last
line says whether the pane is displayed, hidden, or not open); when it is
hidden, ask the user in one line to bring the browser back (Cmd+Shift+B
on Mac, Ctrl+Shift+B on Windows, or close what is open in the side panel
and click the globe icon) and keep it showing for about a minute, then
run that surface's second call; when it is not open, run the second call
on a new tab from `preview_start`. Unattended run: one second call on a
`tabs_create` tab; if it also reports `tabHidden`, the remaining
variations are text-only with the note "the browser pane was hidden".

In Chrome: Chrome captures only a tab that is visible
in its window, so a tab behind another tab, in a minimized window, or in
a window on another desktop cannot be screenshotted, and no script can
bring it forward. `settle_capture.js` reports this as `"tabHidden": true`
(with `visibility` showing the state); the screenshot after it then
fails, and the batch stops there. Read that result before the error:

- Attended run: in the next message, ask the user in one line to click
  the desktop preview tab in Chrome and keep it in front for about a minute, then
  run that surface's second call. Batch the request for every hidden
  surface into one message; do not ask twice.
- Unattended run: do not ask. Make the second call open a fresh tab with
  `tabs_create_mcp` first and run on it. If that tab also reports
  `tabHidden`, stop using Chrome: when the built-in browser is available,
  run the probe (above) and the remaining desktop surfaces there at the
  probed width, with a footer line saying the desktop previews were taken
  in the built-in browser because the Chrome window was in the
  background. Without the built-in browser, ship every remaining
  variation text-only with the note "the browser tab was in the
  background", and add a footer line saying previews need the Chrome
  window in front.
- Attended run whose retry still reports `tabHidden`: same fallback to
  the built-in browser for the remaining desktop surfaces; do not ask a
  second time.

Either way, the second-call limit stands: one retry per surface in a
browser, never a third. The one exception is the fallback above, which
gives a desktop surface one call in the built-in browser after its two
Chrome calls.

## Step 3: hand the captures to the reports

The previews are not a page of their own: they are the before/after pair
inside each test's own report, which
`scripts/build_page.py` builds from `page.json` (see
`references/output-format.md`). This step only fills the per-test fields:

- `before` and `after`: the paths under `previews/test-<n>/<letter>/`
  (copy the browser's saved JPEGs there as `before.jpg` and `after.jpg`).
- `previewViewport`: `"mobile"` when the pair was shot at the mobile
  preset (the page then shows the two shots at phone width), otherwise
  omit it.
- `beforeAlt`, `afterAlt`: what each image shows, for readers without
  images; `beforeCaption`, `afterCaption`: the short labels under them.
- When there is no pair for a variation: `before` and `after` `null` and a
  one-clause `previewNote` saying why (no browser available; the surface
  loads below the fold and the two calls did not reach it; the change
  is mobile-only and no built-in browser was available; selectors changed; the browser
  tab was in the background; the browser pane was hidden;
  the page did not finish loading in time). Name a cause only when a
  tool result showed it (`settle_capture.js` output or the screenshot
  step's error text); never infer one from `testingTools` or from what is
  loaded on the page.
  The section still renders, with the `what` sentence in the image's
  place, and the button still works.

A report's published `files` map must list that test's `before` and
`after` images, by the same relative path the JSON uses. Both browsers' JPEGs are small enough as saved.

## Failure and conduct rules

- Never modify the live site. Injection changes the DOM in a tab only;
  nothing is saved anywhere but the workspace.
- Never preview a variation on a checkout page past the cart. Cart is the
  furthest surface.
- Never log in, add to cart, or dismiss anything but cookie banners and
  marketing popups during previews.
- If a preview reveals that the variation is already how the site looks
  (a selector matched something that already does what the variation
  proposes), that is a validation failure that slipped through: drop the
  test from `page.json`, and record which test was pulled and why in
  `run.killed` (not in a footer line).
