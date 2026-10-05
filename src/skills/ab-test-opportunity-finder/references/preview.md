# Variation previews (every test, before delivery)

Purpose: let the merchant *see* each recommended variation next to the
current site before anyone builds it. Noibu's developer docs say the
product has no force-variant or preview tool, so this is the only visual
check that exists before code is written. A recommendation that can be
looked at gets discussed and approved; one that has to be imagined stalls.
Each test's section on the recommendations page shows Original and the
variation side by side, between the evidence and the button that creates
the test.

This phase runs for every surviving test, between synthesis and building
the page (SKILL.md, Phase 4). It is part of the deliverable: every test
section carries its before/after pair, or the reason there is none.

## What a preview is, honestly

A preview is an approximation: the variation's *visible* change applied to
the live page with a short DOM/CSS script, captured as screenshots. It is
not the implementation. The page's note says so in one line, and the
closing message carries the same caveat (SKILL.md, quiet-mode rule 6).
Never present a preview as what the test will ship.

All preview files live under `previews/` in the working directory (the
same place `page.json` is written), never inside the skill directory: the Artifact tool only publishes supporting files from
the working directory or scratchpad.

## Two outcomes, in order of preference

1. **Live render and capture in Claude in Chrome** (the ideal, and usually
   the whole job). Apply the injection script to the real page in the
   user's Chrome so they can look at it in a tab they control, so the
   selectors are proven against the real DOM the shopper gets (logged-out,
   region, personalization), and so the screenshots are real pixels: the
   Chrome `computer` screenshot with `save_to_disk: true` writes a JPEG
   into the cloud workspace and returns its path, which is exactly what
   the hosted page needs. One `browser_batch` call per surface, all in one
   message; each does navigate → wait → dismiss → instant scroll to the
   change → wait → screenshot (before) → inject → wait → screenshot
   (after).
2. **Text-only preview.** When Chrome is absent (Block 2's
   `tabs_context_mcp` failed), or a surface's two allowed calls did not
   produce a usable pair, the hosted page carries a plain description of
   what the variation looks like with a one-line note saying why there is
   no image. That is graceful failure: the user still gets a link and an
   explanation, never an error dump.

There is no headless or in-container capture: the cloud workspace reaches
the web only through an allowlist proxy, so a browser inside it cannot
load the store, and the built-in Claude browser does not save screenshots
to disk. Chrome is the only source of images; nothing else is attempted.
Whatever was not possible is one sentence in the closing message, never a
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
  validation: drop it from `page.json` and name it in the closing
  message.
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
- Chrome renders a desktop viewport and resizing is unreliable, so every
  capture is desktop. A mobile-only change is previewed on desktop when
  the same element exists there (the caption says so), and is text-only
  when it does not.

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

## Step 2: live render in Claude in Chrome

The browser is Claude in Chrome, the user's real browser, whose tools
Block 1 loaded; if Block 2 found no browser there is no preview batch,
and the page ships text-only with the closing message's "could not be
done" sentence.

Use the run's tab, which the site read left open (if it is gone, get a
new one with `tabs_context_mcp` and `createIfEmpty: true` in the message
before). In ONE message: save the injection scripts under `previews/`
with Bash, and write one `browser_batch` call per surface, never two
surfaces in one call (a call that runs past about a minute returns
nothing, and four surfaces in one call do): navigate → wait 4 seconds →
run `dismiss_consent.js` → the instant scroll item above → wait 2 seconds
→ screenshot with `save_to_disk: true` (before) → run the injection
script with `javascript_tool` → wait 2 seconds → screenshot with
`save_to_disk: true` (after). The calls run one after another in the
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
dropped and the closing message says so. Copy the saved JPEGs into `previews/test-<n>/<letter>/`
as `before.jpg` and `after.jpg`.

When the user is present, leave the tab on the last variation so they can
look at it, and say so in the closing message; otherwise close it in the
publish message. Never close it in a preview call: a surface that needs
its second call would then need a new tab first, which costs a round
trip.

Chrome's rendered viewport is desktop; do not make mobile claims from it.
Mobile is never previewed, and the page's footer says so whenever a test
is mobile-only or its evidence is mobile.

## Step 3: hand the captures to the page

The previews are not a page of their own: they are the before/after pair
inside each test's section of the recommendations page, which
`scripts/build_page.py` builds from `page.json` (see
`references/output-format.md`). This step only fills the per-test fields:

- `before` and `after`: the paths under `previews/test-<n>/<letter>/`
  (copy Chrome's saved JPEGs there as `before.jpg` and `after.jpg`).
- `beforeAlt`, `afterAlt`: what each image shows, for readers without
  images; `beforeCaption`, `afterCaption`: the short labels under them.
- When there is no pair for a variation: `before` and `after` `null` and a
  one-clause `previewNote` saying why (no browser available; the surface
  loads below the fold and the two calls did not reach it; the change
  is mobile-only; selectors changed).
  The section still renders, with the `what` sentence in the image's
  place, and the button still works.

The published `files` map must list every image the JSON references, by
the same relative path. Chrome's JPEGs are small enough as saved.

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
  test from `page.json`, and use the closing message's caveat sentence
  to say which test was pulled and why.
