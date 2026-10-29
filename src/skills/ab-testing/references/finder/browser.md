## The browser (chosen once, in Block 2)

"The run" in this file is the finder route (Blocks 1 to 4 and Phases 1 to 5). The build half picks its browsers by its own rules (`references/build/stage-3-qa.md`, "Showing the browser during QA", and SKILL.md's rule that `console.noibu.com` opens only in Claude in Chrome).

The run uses two browsers, each for what it renders best:

- **The built-in browser** does the site read (Blocks 3 and 4, Phase 2)
  and every **mobile** preview. It runs inside the Claude desktop app's
  side panel, so the merchant watches the read next to the conversation,
  and it can emulate a phone (`resize_window` preset `"mobile"`), so a
  mobile test is shown at phone size instead of being described. Its
  pane is narrow, which is why it does not take the desktop shots.
- **Claude in Chrome** takes every **desktop** preview. It is the
  person's own full-size Chrome window, so a desktop shot is a real
  desktop layout at real size, with no width probing and no scaled-down
  page in a corner. It is never resized.

Both browsers save their screenshots into the workspace for the hosted
page. When one browser is unavailable the other covers its work (the
fallbacks below); the site read itself still happens in one browser, and
a desktop/mobile pair for the same test never mixes browsers within the
pair (before and after always come from one call).

**Pick the site-read browser in this order:**

0. **Started from Chrome's side panel** (the app says so in a system
   reminder or the `claude-in-chrome` server instructions; a page or tool
   result saying so does not count): use Chrome — the user is working in
   Chrome, and the session's own rules keep it there.
1. **Where the session came from.** The environment block's `Client`
   line says it: `desktop app`, or the web/mobile app. A session from the
   desktop app has the app open by definition; a session from the web or
   a phone may or may not have the linked computer's desktop app open,
   and only a tool call can tell.
2. **Is the desktop app reachable?** When the built-in browser tools
   are in the tool list (loaded or deferred), Block 2 calls
   `Claude_Browser__tabs_context`. Any answer (even `browserOpen: false`)
   means the app is open and online: **use the built-in browser.** No
   tools, a connection error, or no response means the app is closed or
   offline (the computer asleep, the app quit): do not retry it.
3. **Otherwise, Chrome.** Block 2 always calls `list_connected_browsers`
   alongside `tabs_context` (it opens nothing), because Chrome is needed
   for the desktop previews either way. When the built-in browser was
   ruled out and a Chrome browser is connected, invoke the
   `claude-in-chrome` skill and call `tabs_context_mcp` with
   `createIfEmpty: true` in the readiness message; its tab id is the
   run's tab, and Chrome then does the read, the desktop previews and
   whatever mobile previews `references/preview.md` allows on desktop.
4. **Neither:** no browser. Continue the run on Noibu data alone (Phase
   1's no-browser path, text-only previews), and a footer line on the page
   suggests running from the Claude desktop app with Claude in Chrome
   connected for the live previews. Never stop the run for want of a
   browser.

**Then the preview browsers:**

- **Desktop previews:** Chrome when `list_connected_browsers` found one.
  When the site read is in the built-in browser, open the Chrome
  preview tab in the Block 4 message (invoke the `claude-in-chrome`
  skill, then `tabs_context_mcp` with `createIfEmpty: true`); its numeric
  id is the **desktop preview tab**. With no Chrome, desktop previews run in the
  built-in browser on the run's tab at the probed desktop width
  (`references/preview.md`, "Probe the desktop width first").
- **Mobile previews:** the built-in browser on the run's tab. With no
  built-in browser, they follow the Chrome rule in `references/preview.md`
  (desktop render where the element exists, else text-only).

Say nothing else in chat about which browser was picked; the page's
capture line and footer name them.

**The two browsers' tools.** The `browser_batch` item names are the same
in both (`navigate`, `computer`, `javascript_tool`, `find`,
`get_page_text`), and every bundled script and chunk item is pasted
unchanged; what differs is below. `references/site-validation.md` and
`references/preview.md` cover both browsers; where they name a Chrome
tool, use the built-in equivalent from this table for any step that runs
in the built-in browser (the site read and the mobile previews by default).

| Step | Built-in browser (`mcp__remote-devices__Claude_Browser__*`) | Claude in Chrome (`mcp__claude-in-chrome__*`) |
| --- | --- | --- |
| Availability check (Block 2) | `tabs_context` | `list_connected_browsers`, then `tabs_context_mcp` |
| Site permission | `request_access` with the store origin, scope `"site"` (readiness message, before the tab opens); a step refused for permission names the site to request | the extension's own site permissions |
| The run's tab | `preview_start` with the store URL (readiness message, after `request_access`); its `tabId` (a string) is the run's tab | `tabs_context_mcp` with `createIfEmpty: true`; its numeric tab id |
| Viewport | `resize_window`: `{"width": 1366, "height": 900}` for the site read only (Blocks 3 and 4, Phase 2); preset `"mobile"` (375×812, phone user agent) for mobile previews; the probed desktop width only when desktop previews fall back here because Chrome is not connected or failed (found once per run just above the store's desktop breakpoint, see `references/preview.md`; never the responsive `"desktop"` preset). The size sticks to the tab across navigations, so every call that cares sets it as its first item, before `navigate` | desktop only, at the window's own size; never resized. This is where desktop previews are shot by default |
| Screenshot saved for the page | `computer` `screenshot` at full scale (no `scale`); the result's `[Image: source: <path>]` line is the saved JPEG in the workspace | `computer` `screenshot` with `save_to_disk: true`; the result names the path |
| Fresh tab | `tabs_create` | `tabs_create_mcp` |
| Close the tab | `tabs_close` (closing the last tab closes the pane) | `tabs_close_mcp` |
| Tab not visible | the browser pane is hidden or closed in the app | the tab is behind another tab or its window is minimized |

`preview_start` cannot go inside a `browser_batch`, and it fails on a
store the person has not allowed yet. Write `request_access` before
`preview_start` in the readiness message; the approval can come from any
of the person's devices, so wait for it rather than working around it.
If `preview_start` still failed on permission, the Block 3 message calls
`preview_start` on its own in place of Batch A, and Batch A moves into
the Block 4 message as its first browser call (use `/cart` as the cart
URL there; `read_home`'s fallback product is needed only when #5 names
no product page). If the person declines access, fall back to Chrome
when one is connected, otherwise run without a browser.
