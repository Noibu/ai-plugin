// STAGE read_policy — read the shipping, returns, and FAQ/help pages WITHOUT navigating:
// fetches them from the current page (run it on the homepage, right after read_home) and
// returns, per page, the sentences that state thresholds, fees, delivery times, return
// windows, and conditions, verbatim. Tries Shopify's canonical policy URLs first, then
// footer links whose text mentions shipping, returns, FAQ, or help (same origin only).
// Returns chunk 1 of a JSON string; the batch reads chunks 2-4 from window.__nw.
const out = { pages: [], offSiteLinks: [], notes: [] };
const shop = platform() === 'shopify';
const urls = [];
const push = (u, why) => { try { const a = new URL(u, location.origin); if (a.origin !== location.origin) { const off = why + ' → ' + a.origin + a.pathname; if (/ship|deliver|return|refund|help|faq/i.test(why + a.href) && out.offSiteLinks.length < 4 && !out.offSiteLinks.includes(off)) out.offSiteLinks.push(off); return; } if (a.hash && a.pathname === location.pathname) return; if (!urls.some((x) => x.url === a.href)) urls.push({ url: a.origin + a.pathname, why }); } catch (e) {} };
if (shop) { push('/policies/shipping-policy', 'shopify canonical'); push('/policies/refund-policy', 'shopify canonical'); }
const footer = q('footer') || document.body;
for (const a of qa('a[href]', footer)) {
  const t = txt(a, 40) + ' ' + a.getAttribute('href');
  if (/privacy|terms|legal|accessib/i.test(t)) continue;
  if (/ship|deliver/i.test(t)) push(a.href, 'footer: ' + txt(a, 30));
  else if (/return|refund|exchange/i.test(t)) push(a.href, 'footer: ' + txt(a, 30));
  else if (/\bfaq|help|support/i.test(t) && !/contact/i.test(t)) push(a.href, 'footer: ' + txt(a, 30));
}
const keyRe = /free (standard |express |ground |u\.?s\.? )?(shipping|delivery)|orders? (over|above|of \$|totaling|\$)|[$€£]\s?\d|\d+\s?(business|working)? ?days?|within \d+|\d+-day|return|refund|exchange|restock|final sale|non-?returnable|flat rate|ship(s|ping) (to|within|from|time|cost)|deliver|carrier|tracking|threshold|minimum/i;
for (const { url, why } of urls.slice(0, 4)) {
  try {
    const r = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    for (const s of doc.querySelectorAll('script, style, noscript, nav, header, footer, svg, template')) s.remove();
    for (const el of doc.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, br, tr, td, th, section, article, dt, dd, summary, details')) el.insertAdjacentText('afterend', ' ');
    const h1 = doc.querySelector('h1');
    const title = clean(h1 ? h1.textContent : doc.title).slice(0, 60);
    // The policy body is the LARGEST of the known content containers (a class match alone can
    // hit a header strip whose class merely contains the word).
    let body = doc.body, best = 0;
    for (const s of ['.shopify-policy__body', '.shopify-policy__container', 'main', 'article', '[role="main"]', '.rte', '[class*="page-content" i]', '[class*="page__content" i]', '[class*="policy" i]']) for (const c of doc.querySelectorAll(s)) { const n = clean(c.textContent).length; if (n > best) { best = n; body = c; } }
    const raw = clean(body.textContent).replace(/[a-z0-9-]+\s*\{[^}]*\}/g, ' ').replace(/\s+/g, ' ');
    const notFound = !r.ok || /^(404|page not found|not found)/i.test(title) || /\b404\b|page (you requested )?(could not be found|does not exist)|page not found/i.test(raw.slice(0, 400)) || raw.length < 120;
    const sentences = raw.split(/(?<=[.!?])(?<!\b[A-Z]\.)(?<!\b(?:etc|vs|approx|incl|excl|no)\.)\s+(?=[A-Z0-9(])|\s{2,}/i).map((s) => s.trim()).filter((s) => s.length > 12 && s.length < 220);
    const seen = new Set(); const highlights = [];
    for (const s of sentences) if (keyRe.test(s) && !seen.has(s) && s.split(' ').length >= 4 && !scripty(s)) { seen.add(s); highlights.push(s); if (highlights.length >= 14) break; }
    out.pages.push({ url: url.replace(location.origin, ''), why, status: r.status, title, notFound, chars: raw.length, opening: raw.slice(0, 140), highlights });
  } catch (e) { out.pages.push({ url: url.replace(location.origin, ''), why, error: String(e && e.message || e) }); }
}
if (!out.pages.some((p) => !p.notFound && !p.error)) out.notes.push('no policy page readable by fetch; navigate to a footer link and use get_page_text');
return emit(out);
