#!/usr/bin/env python3
"""Build the "Recommended tests" page from a page.json, and the candidates.json handoff.

Usage: python build_page.py page.json out.html

Writes out.html AND candidates.json next to it. The page is published with
the Artifact tool (no doctype/html/head/body of its own) and declares the
`mcp` capability so each test's "Create A/B test in Noibu" button calls the
viewer's Noibu connector. See references/output-format.md for the JSON
fields and references/create-drafts.md for the button's behavior.

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
.glance { margin-top:26px; padding:0 0 0 22px; max-width:80ch; } .glance li { margin:4px 0; } .glance a { color:var(--ink); }
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
button.create { background:var(--accent); color:var(--accent-ink); border:0; border-radius:6px; padding:11px 18px; font:600 14px/1 inherit; letter-spacing:.02em; cursor:pointer; }
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
(async () => {
  const cfg = window.__NB_PAGE;
  const cards = [...document.querySelectorAll('[data-test]')];
  const statusOf = c => c.querySelector('.status');
  const btnOf = c => c.querySelector('button.create');
  const setStatus = (c, text, cls) => { const s = statusOf(c); s.textContent = text; s.className = 'status' + (cls ? ' ' + cls : ''); };
  const disableAll = (text) => cards.forEach(c => { btnOf(c).disabled = true; setStatus(c, text, 'warn'); });

  const mcp = await claude.use('mcp');
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
    const r = await mcp.callTool(cfg.server, 'noibu_list_ab_tests', { domainId: cfg.domainId, rationale: 'Viewer opened the recommendations page; checking which recommended tests already exist on the domain' }, { cache: false });
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
        const r = await mcp.callTool(cfg.server, 'noibu_create_ab_test', Object.assign({ domainId: cfg.domainId, rationale: 'Viewer clicked Create A/B test on the recommendations page for "' + input.title + '"' }, input), { cache: false });
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


def build(page: dict) -> str:
    tests = page["tests"]
    parts = []
    parts.append(f"<title>{esc(page['domain'].replace('www.', ''))} test recommendations</title>")
    parts.append('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">')
    parts.append(f"<style>{CSS}</style>")
    parts.append('<div class="wrap"><header>')
    parts.append(f"<h1>A/B test recommendations for {esc(page['domain'])}</h1>")
    parts.append(f"<p>Goal: {esc(page['goal'])}" + (f" (success metric: {esc(page['successMetricLabel'])})" if page.get('successMetricLabel') else "") + ". Each test is validated against the live site and shown as it would look, with a button that creates it as a draft in Noibu.</p>")
    parts.append('<div class="meta">' + "".join(f"<span>{esc(x)}</span>" for x in [page.get("dataLine"), page.get("captureLine")] if x) + "</div>")
    parts.append('<div class="note">Previews are approximations: each change was made in a browser tab only, nothing on the site was modified, and the developer\'s build may differ in detail. Creating a test makes a draft that serves no traffic until it is started in the Noibu console.</div>')
    parts.append('<ol class="glance">' + "".join(f'<li><a href="#test-{i+1}">{esc(t["title"])}</a>: {esc(t["what"])}</li>' for i, t in enumerate(tests)) + "</ol>")
    parts.append("</header>")

    for i, t in enumerate(tests, 1):
        s = t["setup"]
        parts.append(f'<section class="test" id="test-{i}" data-test data-title="{esc(s["title"])}">')
        parts.append(f'<span class="rank">Test {i} of {len(tests)}</span><h2>{esc(t["title"])}</h2>')
        if t.get("surface"):
            parts.append(f'<div class="surface">{esc(t["surface"])}</div>')
        parts.append(f'<div class="cols"><div><h3>What to change</h3><p>{esc(t["what"])}</p></div><div><h3>Why this test</h3><p>{esc(t["why"])}</p></div></div>')
        parts.append(f'<div class="variation">B: {esc(t.get("variationName") or "Variation")}</div>')
        if t.get("before") and t.get("after"):
            parts.append('<div class="pair">'
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
    cfg = {"server": page.get("server", "noibu"), "domainId": page["domainId"], "domain": page["domain"]}
    parts.append("<script>window.__NB_PAGE = " + json.dumps(cfg) + ";" + JS + "</script>")
    return "\n".join(parts)


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


def candidates(page: dict, wt: dict, page_url: str | None = None) -> dict:
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
    for k in ("companyId", "siblings", "window", "market", "readiness", "existingTests"):
        if k in run:
            out[k] = run[k]
    if page_url:
        out["pageUrl"] = page_url
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
                    item["preview"] = {"before": t["before"], "after": t["after"]}
                elif t.get("previewNote"):
                    item["preview"] = {"note": t["previewNote"]}
            variations.append(item)
        out["tests"].append({
            "rank": i,
            "title": t["title"],
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
    Path(out).write_text(build(page))
    wt_path = Path(src).parent / "walkthrough.json"
    wt = json.loads(wt_path.read_text()) if wt_path.exists() else {}
    cand_path = Path(out).parent / "candidates.json"
    cand_path.write_text(json.dumps(candidates(page, wt), indent=2, ensure_ascii=False))
    print(f"wrote {out} ({len(page['tests'])} tests) and {cand_path}" + ("" if wt else " (no walkthrough.json found: selectors and site facts come from page.json only)"))
