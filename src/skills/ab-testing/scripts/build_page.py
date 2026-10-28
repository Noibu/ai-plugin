#!/usr/bin/env python3
"""Build one "Recommended test" report page per test from a page.json, and the
candidates.json handoff.

Usage:
  python build_page.py page.json <domain-short>
  python build_page.py page.json implement <rank> <draft id> <flag key> <created|existing>

The first form writes one report per test, <domain-short>-test-<rank>.html,
next to page.json, plus candidates.json and findings-card.html. Each report
carries the run's intro (title, goal, data and capture lines, the previews
note) and then that one test in full: what to change, why, before/after,
the Noibu setup, dev notes and the "Create A/B test in Noibu" button; the
run-level "Outside your goal" list and the footer caveats close every
report, since they apply to all of them. findings-card.html is the in-chat
findings card: one block per test under a "Test N" header, with two buttons:
"Learn why and preview variation", which asks the chat to open that test's report in the side
panel (publishing it first when it is not published yet), and "Create A/B
test in Noibu". Both send a message to the chat through `sendPrompt`. The
run passes the card's HTML verbatim as `widget_code` to `show_widget`
(references/findings-card.md).

The second form writes implement-card-<rank>.html next to page.json: the card
shown once a test's draft exists in Noibu, carrying the draft id, the flag key
and one "Automate the implementation" button that starts this skill's build
half with that draft (references/findings-card.md, "Answering a click").

Each report is published with the Artifact tool (no doctype/html/head/body of
its own) and declares one capability: `mcp`, so the test's "Create A/B test
in Noibu" button on the report calls the viewer's Noibu connector. A report
has no implementation button: building a test happens in the chat. See
references/output-format.md for the JSON fields and references/create-drafts.md
for the report button's behavior.

candidates.json (references/handoffs/candidates.md) is derived, never
hand-written: page.json's tests (title, why, setup, createInput, metric
volume, overlap, fix-first, previews) + each test's optional `handoff`
block (evidence numbers, surfaceTemplate, extra selectors, consoleFollowUps)
+ page.json's optional `run` block (window, readiness, market, siblings,
killed) + walkthrough.json beside page.json (the site read's script JSONs,
keyed by script name: read_home, read_pdp, read_collection, read_cart, ...,
plus `meta`), from which each test gets the recorded selectors and a few
verbatim site facts for its surface.

page.json shape (all strings are plain text; the script escapes them):
{
  "run": {"window": {...}, "readiness": {...}, "market": {...}, "siblings": [], "companyId": 0,
          "platform": "shopify", "testingTools": [], "existingTests": [], "killed": [{"idea": "...", "reason": "..."}]},   # optional
  "domain": "www.store.com",
  "domainId": "uuid",
  "pageUrls": {"1": "https://claude.ai/artifact/..."},   # optional: each published report's URL by rank, known after its first publish
  "server": "noibu",                    # connector display name in claude.ai
  "goal": "Increase add to cart rate",  # or "All goals"
  "successMetricLabel": "Add to cart rate",
  "dataLine": "Noibu, Aug 29 to Sep 27, 2026 (30 days, about 946,000 sessions, 88% on mobile)",
  "captureLine": "Live-site check Sep 28, desktop browser, Canada storefront (CAD)",
  "caveats": ["..."],                   # optional, footer lines
  "tests": [{
    "title": "...", "surface": "/products/x", "variationName": "Button above info box",
    "what": "one or two sentences: the change",
    "why": "one or two sentences: the measured problem (at most 3 numbers) and what the site showed",
    "before": "previews/test-1/b/before.jpg" | null, "after": "..." | null,
    "previewNote": "why there is no image, when before/after are null",
    "previewViewport": "desktop" | "mobile" (optional; "mobile" when the pair was shot at phone size in the built-in browser),
    "setup": {"title": "...", "hypothesis": "...", "successMetric": "Add to cart rate",
              "secondaryMetrics": "Checkout conversion rate · Average order value" | "None",
              "targeting": "Everyone (skip this section)", "variations": "A: Original (control) · B: ..., split equally"},
    "metricVolume": "About 1,700 add-to-cart sessions a week in this targeting. Noibu shows the days to a verdict at setup.",
    "overlap": "..." | null,              # optional: a running/draft Noibu test or a third-party testing tool on the surface
    "devNotes": "...", "fixFirst": "..." | null,
    "createInput": { ...exact noibu_create_ab_test arguments minus domainId and rationale... },
    "handoff": {"surfaceTemplate": "collection|product|home|cart|checkout",   # optional; inferred from surface when absent
                "evidence": [{"claim": "...", "numbers": {...}, "source": "batch1#5", "correlational": false}],
                "selectors": {...extra selectors not in walkthrough.json...}, "consoleFollowUps": []}
  }],
  "outsideGoal": ["one line", ...]      # optional
}
"""
import html
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

CSS = """
:root { --bg:#f6f6f4; --surface:#fff; --ink:#17191c; --muted:#5c6168; --line:#dcdedb; --accent:#17191c; --accent-ink:#fff;
  --before:#8a8f96; --after:#1f6f4a; --after-bg:#e8f3ec; --note-bg:#fbf4dd; --note-ink:#5b4a12; --ok:#1f6f4a; --warn:#8a5a00; --err:#a33; --panel:#f0f0ed; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#141618; --surface:#1d2023; --ink:#eceef0; --muted:#a2a8b0; --line:#30353a;
  --accent:#eceef0; --accent-ink:#141618; --before:#8a8f96; --after:#6fcf9a; --after-bg:#1c2e25; --note-bg:#2f2a18; --note-ink:#e6d69a; --ok:#6fcf9a; --warn:#e6b45a; --err:#e88; --panel:#23272b; color-scheme:dark; } }
:root[data-theme="dark"] { --bg:#141618; --surface:#1d2023; --ink:#eceef0; --muted:#a2a8b0; --line:#30353a;
  --accent:#eceef0; --accent-ink:#141618; --before:#8a8f96; --after:#6fcf9a; --after-bg:#1c2e25; --note-bg:#2f2a18; --note-ink:#e6d69a; --ok:#6fcf9a; --warn:#e6b45a; --err:#e88; --panel:#23272b; color-scheme:dark; }
body { background:var(--bg); color:var(--ink); font-family:"IBM Plex Sans",system-ui,-apple-system,sans-serif; font-size:15px; line-height:1.5; }
.wrap { max-width:1180px; margin:0 auto; padding-block:32px 64px; padding-inline:20px; }
h1 { font-size:28px; font-weight:600; letter-spacing:-.01em; margin:0 0 6px; text-wrap:balance; }
header p { margin:0; color:var(--muted); max-width:70ch; }
.meta { display:flex; flex-wrap:wrap; gap:8px 20px; margin-top:14px; font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:12.5px; color:var(--muted); }
.note { margin-top:18px; background:var(--note-bg); color:var(--note-ink); border-radius:6px; padding:10px 14px; font-size:14px; max-width:80ch; }
section.test { margin-top:44px; padding-top:28px; border-top:1px solid var(--line); scroll-margin-top:16px; }
.rank { font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:12.5px; color:var(--muted); letter-spacing:.06em; text-transform:uppercase; display:block; margin-bottom:6px; }
.test h2 { font-size:22px; font-weight:600; margin:0; letter-spacing:-.01em; text-wrap:balance; }
.surface { font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:12.5px; color:var(--muted); margin-top:6px; word-break:break-all; }
.cols { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:16px; max-width:100ch; } @media (max-width:760px) { .cols { grid-template-columns:1fr; } }
.cols h3, .setup h3, .dev h3 { font-size:12.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin:0 0 4px; font-weight:600; }
.cols p { margin:0; }
.variation { margin-top:18px; font-weight:500; }
.pair { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:10px; } @media (max-width:760px) { .pair { grid-template-columns:1fr; } }
figure { margin:0; background:var(--surface); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
figure img { display:block; width:100%; height:auto; max-width:100%; }
.pair.mobile { grid-template-columns:repeat(2, minmax(0, 340px)); justify-content:start; } @media (max-width:760px) { .pair.mobile { grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; } }
figcaption { display:flex; align-items:center; gap:10px; padding:9px 12px; font-size:13px; border-top:1px solid var(--line); color:var(--muted); }
.tag { font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; padding:2px 8px; border-radius:4px; }
.tag.before { color:var(--before); border:1px solid var(--line); } .tag.after { color:var(--after); background:var(--after-bg); }
.nopreview { margin-top:10px; padding:12px 14px; border:1px dashed var(--line); border-radius:8px; color:var(--muted); font-size:14px; max-width:80ch; }
.setup { margin-top:20px; background:var(--panel); border-radius:8px; padding:14px 16px; max-width:100ch; }
.setup dl { display:grid; grid-template-columns:max-content 1fr; gap:6px 16px; margin:0; font-size:14px; }
.setup dt { color:var(--muted); } .setup dd { margin:0; }
@media (max-width:560px) { .setup dl { grid-template-columns:1fr; gap:2px; } .setup dt { margin-top:8px; } }
.dev { margin-top:16px; max-width:80ch; font-size:14px; } .dev p { margin:0 0 8px; }
.fix { color:var(--warn); }
.cta { margin-top:18px; display:flex; flex-wrap:wrap; align-items:center; gap:12px; }
/* A <button> does not inherit the page font (the browser gives it a system control font),
   and `font: ... inherit` is not valid shorthand, so the font properties are set one by one. */
button.create { display:inline-flex; align-items:center; justify-content:center; box-sizing:border-box; min-height:38px;
  font-family:inherit; font-size:14px; font-weight:600; line-height:1; letter-spacing:.02em; white-space:nowrap;
  background:var(--accent); color:var(--accent-ink); border:1.5px solid var(--accent); border-radius:6px; padding:0 18px; cursor:pointer; margin:0; -webkit-appearance:none; appearance:none; }
button.create:disabled { opacity:.55; cursor:default; }
button.create:focus-visible { outline:2px solid var(--after); outline-offset:2px; }
.status { font-size:13.5px; color:var(--muted); max-width:60ch; } .status.ok { color:var(--ok); } .status.err { color:var(--err); } .status.warn { color:var(--warn); }
.status code { font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:12.5px; }
.outside { margin-top:44px; padding-top:24px; border-top:1px solid var(--line); max-width:80ch; } .outside h2 { font-size:17px; margin:0 0 8px; }
.outside ul { margin:0; padding-left:20px; } .outside li { margin:4px 0; }
footer { margin-top:48px; color:var(--muted); font-size:13px; max-width:80ch; } footer p { margin:4px 0; }
@media (prefers-reduced-motion: no-preference) { button.create { transition: opacity .15s; } }
"""

JS = r"""
// Resolve a runtime capability, or null when this view has no runtime at all (the page
// opened somewhere other than claude.ai) or the capability is not granted here. Without
// this guard a bare `claude.use` throws on pages opened outside the runtime and neither
// button ever gets its click handler.
window.__nbUse = (name) => (window.claude && typeof window.claude.use === 'function')
  ? Promise.resolve(window.claude.use(name)).catch(() => null) : Promise.resolve(null);

(async () => {
  const cfg = window.__NB_PAGE;
  const cards = [...document.querySelectorAll('[data-test]')];
  const statusOf = c => c.querySelector('.status');
  const btnOf = c => c.querySelector('button.create');
  const setStatus = (c, text, cls) => { const s = statusOf(c); s.textContent = text; s.className = 'status' + (cls ? ' ' + cls : ''); };
  const disableAll = (text) => cards.forEach(c => { btnOf(c).disabled = true; setStatus(c, text, 'warn'); });

  const mcp = await window.__nbUse('mcp');
  if (!mcp) { disableAll('To create this test from here, open the page in claude.ai with the Noibu connector connected.'); return; }

  const fixCopy = (e) => {
    switch (e && e.code) {
      case 'needs_reauth': return 'Reconnect Noibu in claude.ai Settings → Connectors, then try again.';
      case 'server_not_connected':
      case 'selection_required': return 'Add the Noibu connector in claude.ai Settings → Connectors to create tests from this page.';
      case 'not_in_manifest': return 'This page was not allowed to use your Noibu connector. Allow it when asked, or create the test in the Noibu console.';
      case 'blocked_by_policy': return 'Your organization does not allow this action from a page. Create the test in the Noibu console.';
      case 'approval_required': return 'This action needs approval in your organization. Create the test in the Noibu console.';
      case 'tool_error': return 'Noibu refused the request: ' + (e.message || 'no details') + '.';
      case 'server_unavailable':
      case 'upstream_error': return 'Noibu did not answer. Check the tests list in the console before trying again; the draft may already exist.';
      default: return 'Could not create the test (' + (e && e.code || 'unknown') + '). Create it in the Noibu console.';
    }
  };

  // Learn which of these tests already exist, so nobody creates a duplicate.
  const norm = s => String(s || '').trim().toLowerCase();
  const findList = (p) => {
    const seen = new Set(); const stack = [p];
    while (stack.length) { const v = stack.pop(); if (!v || typeof v !== 'object' || seen.has(v)) continue; seen.add(v);
      if (Array.isArray(v)) { if (v.length && v.every(x => x && typeof x === 'object')) return v; v.forEach(x => stack.push(x)); }
      else Object.values(v).forEach(x => stack.push(x)); }
    return [];
  };
  let existing = [];
  try {
    const r = await mcp.callTool(cfg.server, 'noibu_list_ab_tests', { domainId: cfg.domainId, rationale: 'Viewer opened a test recommendation report; checking which recommended tests already exist on the domain', skill: 'ab-testing', skillStep: 'recommendation-report' }, { cache: false });
    existing = findList(r.payload).filter(t => t.title || t.name);
  } catch (e) {
    if (e && (e.code === 'needs_reauth' || e.code === 'server_not_connected' || e.code === 'selection_required' || e.code === 'not_in_manifest' || e.code === 'blocked_by_policy')) { disableAll(fixCopy(e)); return; }
    // other failures: creation may still work; the create call will report its own error
  }
  cards.forEach(c => {
    const title = norm(c.dataset.title);
    const hit = existing.find(t => norm(t.title || t.name) === title);
    if (hit) { btnOf(c).disabled = true; btnOf(c).textContent = 'Already in Noibu'; setStatus(c, 'Exists as ' + (hit.status || 'a test') + (hit.key ? ' · key ' + hit.key : '') + '.', 'ok'); }
  });

  const dig = (o, keys) => { const seen = new Set(); const stack = [o]; while (stack.length) { const v = stack.pop(); if (!v || typeof v !== 'object' || seen.has(v)) continue; seen.add(v);
    for (const k of keys) if (typeof v[k] === 'string' || typeof v[k] === 'number') return v[k]; Object.values(v).forEach(x => stack.push(x)); } return null; };

  cards.forEach(c => {
    const btn = btnOf(c); const input = JSON.parse(c.querySelector('script[type="application/json"]').textContent);
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      btn.disabled = true; btn.textContent = 'Creating…'; setStatus(c, 'Creating the draft on ' + cfg.domain + '…');
      try {
        const r = await mcp.callTool(cfg.server, 'noibu_create_ab_test', Object.assign({ domainId: cfg.domainId, rationale: 'Viewer clicked Create A/B test on the recommendation report for "' + input.title + '"', skill: 'ab-testing', skillStep: 'create-test' }, input), { cache: false });
        const key = dig(r.payload, ['key', 'slug']); const id = dig(r.payload, ['id']);
        btn.textContent = 'Created as draft';
        setStatus(c, 'Draft created' + (key ? ': flag key ' + key : '') + (id ? ' (id ' + id + ')' : '') + '. Deploy the variation code before starting it in the console.', 'ok');
      } catch (e) {
        if (e && e.code === 'tool_error' && /title|exists|duplicate/i.test(e.message || '')) { btn.textContent = 'Already in Noibu'; setStatus(c, 'A test with this title already exists on the domain. Open it in the Noibu console.', 'warn'); return; }
        btn.disabled = false; btn.textContent = 'Create A/B test in Noibu'; setStatus(c, fixCopy(e), 'err');
      }
    });
  });
})();
"""


def esc(s):
    return html.escape("" if s is None else str(s), quote=True)


def page_url(page: dict, rank: int) -> str | None:
    """The published URL of test <rank>'s report, when known (page.json `pageUrls`, keyed by rank)."""
    return (page.get("pageUrls") or {}).get(str(rank))


def build(page: dict, rank: int) -> str:
    """One report: the run's intro, then test <rank> in full, then the run-level closing sections."""
    tests = page["tests"]
    parts = []
    parts.append(f"<title>{esc(page['domain'].replace('www.', ''))} test {rank}: {esc(tests[rank - 1]['title'])}</title>")
    parts.append('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">')
    parts.append(f"<style>{CSS}</style>")
    parts.append('<div class="wrap"><header>')
    parts.append(f"<h1>A/B test recommendation for {esc(page['domain'])}</h1>")
    parts.append(f"<p>Goal: {esc(page['goal'])}" + (f" (success metric: {esc(page['successMetricLabel'])})" if page.get('successMetricLabel') else "") + f". It is validated against the live site and shown as it would look, with a button that creates it as a draft in Noibu.</p>")
    parts.append('<div class="meta">' + "".join(f"<span>{esc(x)}</span>" for x in [page.get("dataLine"), page.get("captureLine")] if x) + "</div>")
    parts.append('<div class="note">Previews are approximations: each change was made in a browser tab only, nothing on the site was modified, and the developer\'s build may differ in detail. Creating a test makes a draft that serves no traffic until it is started in the Noibu console.</div>')
    parts.append("</header>")

    for i, t in [(rank, tests[rank - 1])]:
        s = t["setup"]
        parts.append(f'<section class="test" id="test-{i}" data-test data-rank="{i}" data-title="{esc(s["title"])}">')
        parts.append(f'<h2>{esc(t["title"])}</h2>')
        parts.append(f'<div class="cols"><div><h3>What to change</h3><p>{esc(t["what"])}</p></div><div><h3>Why this test</h3><p>{esc(t["why"])}</p></div></div>')
        parts.append(f'<div class="variation">B: {esc(t.get("variationName") or "Variation")}</div>')
        if t.get("before") and t.get("after"):
            parts.append(f'<div class="pair{" mobile" if t.get("previewViewport") == "mobile" else ""}">'
                         f'<figure><img src="{esc(t["before"])}" alt="{esc(t.get("beforeAlt") or "The page as it is today")}" loading="lazy"><figcaption><span class="tag before">Original</span> {esc(t.get("beforeCaption") or "A: as it is today")}</figcaption></figure>'
                         f'<figure><img src="{esc(t["after"])}" alt="{esc(t.get("afterAlt") or "The page with the variation applied")}" loading="lazy"><figcaption><span class="tag after">Variation B</span> {esc(t.get("afterCaption") or t.get("variationName") or "")}</figcaption></figure>'
                         '</div>')
        else:
            parts.append(f'<div class="nopreview">No screenshot for this variation: {esc(t.get("previewNote") or "capture was not possible")}. {esc(t.get("what"))}</div>')
        parts.append('<div class="setup"><h3>Set it up in Noibu</h3><dl>'
                     f'<dt>Title</dt><dd>{esc(s["title"])}</dd>'
                     f'<dt>Hypothesis</dt><dd>{esc(s["hypothesis"])}</dd>'
                     f'<dt>Success metric</dt><dd>{esc(s["successMetric"])}</dd>'
                     + (f'<dt>Traffic for this metric</dt><dd>{esc(t["metricVolume"])}</dd>' if t.get("metricVolume") else "") +
                     f'<dt>Secondary metrics</dt><dd>{esc(s.get("secondaryMetrics") or "None")}</dd>'
                     f'<dt>Targeting</dt><dd>{esc(s.get("targeting") or "Everyone (skip this section)")}</dd>'
                     f'<dt>Variations</dt><dd>{esc(s["variations"])}</dd>'
                     '</dl></div>')
        parts.append('<div class="dev">' + (f'<h3>Dev notes</h3><p>{esc(t["devNotes"])}</p>' if t.get("devNotes") else "") + (f'<p class="fix"><strong>Fix first:</strong> {esc(t["fixFirst"])}</p>' if t.get("fixFirst") else "") + (f'<p class="fix"><strong>Overlap:</strong> {esc(t["overlap"])}</p>' if t.get("overlap") else "") + "</div>")
        parts.append('<div class="cta"><button type="button" class="create">Create A/B test in Noibu</button><span class="status">Creates a draft: no traffic until you start it in the console.</span></div>')
        parts.append('<script type="application/json">' + json.dumps(t["createInput"]).replace("</", "<\\/") + "</script>")
        parts.append("</section>")

    if page.get("outsideGoal"):
        parts.append('<section class="outside"><h2>Outside your goal</h2><ul>' + "".join(f"<li>{esc(x)}</li>" for x in page["outsideGoal"]) + "</ul></section>")
    parts.append("<footer>" + "".join(f"<p>{esc(x)}</p>" for x in page.get("caveats", [])) + "</footer></div>")
    cfg = {"server": page.get("server", "noibu"), "domainId": page["domainId"], "domain": page["domain"],
           "rank": rank, "pageUrl": page_url(page, rank)}
    parts.append("<script>window.__NB_PAGE = " + json.dumps(cfg) + ";" + JS + "</script>")
    return "\n".join(parts)


# --- findings-card.html: the in-chat summary card (show_widget) ---

SKILL_NAME = "ab-testing"
SLASH_COMMAND = "noibu:ab-testing"  # plugin-namespaced slash command the implement card sends

CARD_BTN = ('padding:6px 14px;font-size:13px;font-weight:500;color:var(--color-text-primary);'
            'background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);'
            'border-radius:6px;cursor:pointer;')
CARD_BTN_PRIMARY = ('padding:6px 14px;font-size:13px;font-weight:500;color:var(--color-background-primary);'
                    'background:var(--color-text-primary);border:0.5px solid var(--color-text-primary);'
                    'border-radius:6px;cursor:pointer;')


def _label(s: str) -> str:
    return "" if s is None else str(s).replace("#", "")


def _where(page: dict, rank: int) -> str:
    url = page_url(page, rank)
    return f" ({url})" if url else ""


def create_prompt(page: dict, rank: int, n: int, title: str) -> str:
    # The text lands in the chat as the person's own message, so it reads as something they would
    # say: no file names, field names or tool instructions (findings-card.md, "What the buttons send").
    return (f'Create test {rank} of {n}, "{_label(title)}", in Noibu from the A/B test recommendations for '
            f"{page['domain']}{_where(page, rank)}.")


def build_prompt(page: dict, rank: int, n: int, title: str) -> str:
    return (f'/{SLASH_COMMAND} Automate test {rank} of {n}, "{_label(title)}", from the A/B test recommendations for '
            f"{page['domain']}{_where(page, rank)}.")


def open_report_prompt(page: dict, rank: int, n: int, title: str) -> str:
    return (f'Open the report for test {rank} of {n}, "{_label(title)}", from the A/B test recommendations for '
            f"{page['domain']}{_where(page, rank)} in the side panel.")


def _onclick(prompt: str) -> str:
    # A JS string literal inside an HTML attribute: JSON-encode for JS, then escape for the attribute.
    return esc("sendPrompt(" + json.dumps(prompt) + ")")


CARD_BOX = 'border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;'


CARD_LABEL = ('font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;'
              'letter-spacing:0.06em;margin:0 0 4px;')


def _test_card(eyebrow: str, title: str, body: str, label: str, prompt: str,
               secondary: tuple[str, str] | None = None, body_html: str | None = None,
               title_label: str | None = None, why: str | None = None) -> str:
    """One test block: a small header bar, the title, one sentence, one primary button,
    and optionally one secondary (label, prompt) button before it. `body_html`, when
    given, replaces the escaped `body` (already-escaped HTML, e.g. with a real <a href>
    link, which the widget host opens after its link-confirmation dialog).
    `title_label`, when given, is a small label above the title ("What to change");
    `why`, when given, adds a labeled "Why this test" paragraph after the body."""
    buttons = ""
    if secondary:
        buttons += f'<button onclick="{_onclick(secondary[1])}" style="{CARD_BTN}">{esc(secondary[0])} ↗</button>'
    buttons += f'<button onclick="{_onclick(prompt)}" style="{CARD_BTN_PRIMARY}">{esc(label)} ↗</button>'
    return (f'<div style="{CARD_BOX}">'
            '<div style="background:var(--color-background-secondary);padding:8px 20px;border-bottom:0.5px solid var(--color-border-tertiary);">'
            f'<span style="font-size:12px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;">{esc(eyebrow)}</span>'
            '</div>'
            '<div style="background:var(--color-background-primary);padding:16px 20px;">'
            + (f'<p style="{CARD_LABEL}">{esc(title_label)}</p>' if title_label else '')
            + f'<p style="font-size:15px;font-weight:500;margin:0 0 6px;color:var(--color-text-primary);">{esc(title)}</p>'
            + f'<p style="font-size:14px;color:var(--color-text-secondary);line-height:1.6;margin:0 0 14px;">{body_html if body_html is not None else esc(body)}</p>'
            + (f'<p style="{CARD_LABEL}">Why this test</p>'
               f'<p style="font-size:14px;color:var(--color-text-secondary);line-height:1.6;margin:0 0 14px;">{esc(why)}</p>' if why else '')
            + f'<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">{buttons}</div>'
            '</div></div>')


def _card_stack(heading: str, blocks: list) -> str:
    return (f'<h2 style="position:absolute;width:1px;height:1px;overflow:hidden;">{esc(heading)}</h2>\n'
            '<div style="display:flex;flex-direction:column;gap:12px;padding:4px;">\n'
            + "\n".join(blocks) + "\n</div>")


def build_card(page: dict) -> str:
    """findings-card.html: one block per test (Test N header, a "What to change" label over the
    title and the proposed change, a "Why this test" label over the measured problem, two buttons).

    "Learn why and preview variation" (secondary) opens that test's own report in the side panel; "Create A/B
    test in Noibu" (primary) creates the draft. Building comes after, from the implement
    card the run shows once the draft exists: creating and building are two steps in
    order, so the build is not a third button here. Everything else about a test
    (the full evidence, targeting, metric, volume, overlap, previews, dev notes) lives on
    its report, which the first button opens. The card's "Why this test" line is the
    test's `why` (the measured problem in at most 3 numbers), so the data behind the
    idea is visible without a click."""
    tests = page["tests"]
    n = len(tests)
    blocks = [_test_card(f"Test {i}", t["title"], t["what"], "Create A/B test in Noibu",
                         create_prompt(page, i, n, t["setup"].get("title") or t["title"]),
                         secondary=("Learn why and preview variation",
                                    open_report_prompt(page, i, n, t["setup"].get("title") or t["title"])),
                         title_label="What to change", why=t.get("why"))
              for i, t in enumerate(tests, 1)]
    return _card_stack(f"A/B test opportunities for {page['domain']}", blocks)


def console_url(page: dict, draft_id: str) -> str:
    return f"https://console.noibu.com/{page['domainId']}/ab-tests/{draft_id}"


def implement_prompt(page: dict, rank: int, n: int, title: str, draft_id: str, flag_key: str) -> str:
    return build_prompt(page, rank, n, title) + f" It's already in Noibu as A/B test {draft_id}."


def build_implement_card(page: dict, rank: int, draft_id: str, flag_key: str, state: str) -> str:
    """implement-card-<rank>.html: shown after a "Create A/B test in Noibu" click, once the draft exists.

    `state` is "created" (this click made it) or "existing" (it was already a draft)."""
    tests = page["tests"]
    t = tests[rank - 1]
    stitle = t["setup"].get("title") or t["title"]
    lead = "Created" if state == "created" else "Already"
    rest = (f" · flag key {flag_key}. It serves no traffic until it's started, and its variation "
            "code has to be live first. Claude can automate that: write the code with Noibu's snippet in it, open "
            "a pull request, and take it all the way to a live test. Nothing goes live without your approval.")
    body = f"Draft {draft_id}{rest}"
    body_html = (f'<a href="{esc(console_url(page, draft_id))}" target="_blank" rel="noopener" '
                 f'style="color:var(--color-text-info, var(--text-accent));text-decoration:underline;">'
                 f'Draft {esc(draft_id)}</a>{esc(rest)}')
    block = _test_card(f"{lead} in Noibu · Test {rank}", t["title"], body, "Automate the implementation",
                       implement_prompt(page, rank, len(tests), stitle, draft_id, flag_key),
                       body_html=body_html)
    return _card_stack(f"Implement {t['title']}", [block])


# --- candidates.json: the handoff, derived from page.json + walkthrough.json ---

SURFACE_SCRIPT = {"home": "read_home", "collection": "read_collection", "product": "read_pdp",
                  "cart": "read_cart", "checkout": "read_checkout_entry"}


def _surface_template(test: dict) -> str | None:
    h = test.get("handoff") or {}
    if h.get("surfaceTemplate"):
        return h["surfaceTemplate"]
    s = (test.get("surface") or "").lower()
    if s.startswith("/collections") or "/collections/" in s:
        return "collection"
    if "/products" in s:
        return "product"
    if s.startswith("/cart") or s == "/cart":
        return "cart"
    if "checkout" in s:
        return "checkout"
    if s.strip() in ("/", "") or s.startswith("/ "):
        return "home"
    return None


def _site_facts(wt: dict, template: str | None) -> list:
    """A few verbatim facts from the script JSON for this surface (no analysis)."""
    rec = wt.get(SURFACE_SCRIPT.get(template or "", ""), {}) or {}
    facts = []
    keep = ["url", "title", "price", "inStock", "cta", "shippingReturnsCopy", "expressPayOnPdp", "widgets",
            "productCountText", "sort", "filters", "cards", "quickAdd", "merchandising",
            "announcementBar", "hero", "testingTools", "storefront", "sectionsBelowFold",
            "surface", "itemCount", "shippingMessages", "freeShippingProgress", "promoField",
            "shippingEstimator", "checkoutCta", "expressPay", "upsells", "notes"]
    for k in keep:
        if k in rec and rec[k] not in (None, [], {}, ""):
            facts.append({k: rec[k]})
    return facts


def candidates(page: dict, wt: dict, page_urls: dict | None = None) -> dict:
    run = page.get("run") or {}
    meta = wt.get("meta") or {}
    home = wt.get("read_home") or {}
    out = {
        "schema": "noibu.ab-candidates/1",
        "generatedAt": run.get("generatedAt") or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "domain": page["domain"],
        "domainId": page["domainId"],
        "goal": page.get("goal"),
        "successMetricLabel": page.get("successMetricLabel"),
        "dataLine": page.get("dataLine"),
        "captureLine": page.get("captureLine"),
        "platform": run.get("platform") or home.get("platform"),
        "testingTools": run.get("testingTools") or home.get("testingTools") or [],
        "storefront": home.get("storefront"),
        "surfaces": meta.get("surfaces"),
        "cartState": meta.get("cartState"),
        "couldNotComplete": meta.get("couldNotComplete") or [],
        "caveats": page.get("caveats", []),
        "tests": [],
        "outsideGoal": page.get("outsideGoal", []),
        "killed": run.get("killed", []),
    }
    for k in ("companyId", "siblings", "window", "market", "readiness", "existingTests", "browser", "previewBrowsers"):
        if k in run:
            out[k] = run[k]
    if page_urls:
        out["pageUrls"] = page_urls
    for i, t in enumerate(page["tests"], 1):
        h = t.get("handoff") or {}
        template = _surface_template(t)
        script = SURFACE_SCRIPT.get(template or "")
        rec = (wt.get(script) or {}) if script else {}
        selectors = dict(rec.get("selectors") or {})
        selectors.update(h.get("selectors") or {})
        variations = []
        for v in t["createInput"]["variations"]:
            item = dict(v)
            if not v.get("isControl"):
                item["devNotes"] = t.get("devNotes")
                item["selectors"] = selectors
                if t.get("before") and t.get("after"):
                    item["preview"] = {"before": t["before"], "after": t["after"], "viewport": t.get("previewViewport") or "desktop"}
                elif t.get("previewNote"):
                    item["preview"] = {"note": t["previewNote"]}
            variations.append(item)
        out["tests"].append({
            "rank": i,
            "title": t["title"],
            "reportUrl": page_url(page, i),
            "surface": t.get("surface"),
            "surfaceTemplate": template,
            "what": t.get("what"),
            "why": t.get("why"),
            "successMetric": t["createInput"]["successMetric"],
            "metricVolume": h.get("metricVolume") or t.get("metricVolume"),
            "evidence": h.get("evidence", []),
            "siteFacts": h.get("siteFacts") or _site_facts(wt, template),
            "variations": variations,
            "setup": t.get("setup"),
            "createInput": t["createInput"],
            "consoleFollowUps": h.get("consoleFollowUps", []),
            "overlap": t.get("overlap"),
            "fixFirst": t.get("fixFirst"),
        })
    return out


if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]
    page = json.loads(Path(src).read_text())
    if out == "implement":
        rank, draft_id, flag_key, state = int(sys.argv[3]), sys.argv[4], sys.argv[5], sys.argv[6]
        if state not in ("created", "existing"):
            sys.exit("state must be 'created' or 'existing'")
        if not 1 <= rank <= len(page["tests"]):
            sys.exit(f"rank {rank} is not a test on this page (1 to {len(page['tests'])})")
        path = Path(src).parent / f"implement-card-{rank}.html"
        path.write_text(build_implement_card(page, rank, draft_id, flag_key, state))
        print(f"wrote {path}")
        print(f"console {console_url(page, draft_id)}")
        sys.exit(0)
    # `out` is the domain-short prefix: reports land next to page.json as <prefix>-test-<rank>.html.
    prefix = Path(out).name.removesuffix(".html")
    folder = Path(src).parent
    reports = []
    for i in range(1, len(page["tests"]) + 1):
        path = folder / f"{prefix}-test-{i}.html"
        path.write_text(build(page, i))
        reports.append(str(path))
    wt_path = folder / "walkthrough.json"
    wt = json.loads(wt_path.read_text()) if wt_path.exists() else {}
    cand_path = folder / "candidates.json"
    cand_path.write_text(json.dumps(candidates(page, wt, page.get("pageUrls")), indent=2, ensure_ascii=False))
    card_path = folder / "findings-card.html"
    card_path.write_text(build_card(page))
    missing = [str(i) for i in range(1, len(page["tests"]) + 1) if not page_url(page, i)]
    print(f"wrote {len(reports)} reports ({', '.join(reports)}), {cand_path} and {card_path}"
          + ("" if wt else " (no walkthrough.json found: selectors and site facts come from page.json only)")
          + ("" if not missing else f" (no pageUrls yet for test {', '.join(missing)}: those card buttons name the report without a link; rebuild after publishing)"))
