// Shared helpers. build.py includes only the ones each stage script references.
// Each helper is one top-level `const name = ...;` statement; keep it that way.
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
const txt = (el, n = 240) => clean(el && (el.innerText !== undefined ? el.innerText : el.textContent)).slice(0, n);
const scripty = (s) => /[{};]|function|window\.|=>|\bvar\b|\bconst\b/.test(s);
const esc = (v) => (window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/([^\w-])/g, '\\$1'));
const cx = (names, attr = 'class') => names.split(',').map((n) => `[${attr}*="${n}" i]`).join(',');
const vis = (el) => {
  if (!el || el.nodeType !== 1) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
};
const aboveFold = (el) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.top + window.scrollY < window.innerHeight && r.bottom > 0;
};
const q = (s, root = document) => { try { return root.querySelector(s); } catch (e) { return null; } };
const qa = (s, root = document) => { try { return [...root.querySelectorAll(s)]; } catch (e) { return []; } };
const byText = (re, sels = 'button, a, [role="button"], input[type="submit"]', root = document) =>
  qa(sels, root).filter((el) => vis(el) && re.test(txt(el, 80) || el.getAttribute('aria-label') || el.value || ''));
const goodClass = (c) => /^[a-zA-Z][\w-]{2,40}$/.test(c) && !/^(css|sc|jsx|_|is-|has-)-?/.test(c) && !/[a-f0-9]{6,}|\d{3,}/.test(c);
const goodId = (id) => typeof id === 'string' && id.length > 0 && !/\d{3,}|[a-f0-9]{8,}/.test(id);
const unique = (s) => { try { return document.querySelectorAll(s).length === 1; } catch (e) { return false; } };
const sel = (el) => {
  if (!el || el.nodeType !== 1) return null;
  const id0 = el.getAttribute('id');
  if (goodId(id0) && unique('#' + esc(id0))) return '#' + esc(id0);
  for (const a of ['data-testid', 'data-test', 'data-id', 'name', 'data-action', 'aria-label']) {
    const v = el.getAttribute(a);
    if (v && v.length < 60) {
      const s = `${el.tagName.toLowerCase()}[${a}="${v.replace(/"/g, '\\"')}"]`;
      if (unique(s)) return s;
    }
  }
  const parts = [];
  let cur = el;
  for (let depth = 0; cur && cur.nodeType === 1 && depth < 6; depth++) {
    const cid = cur.getAttribute('id');
    if (goodId(cid)) { parts.unshift('#' + esc(cid)); break; }
    let part = cur.tagName.toLowerCase();
    const cls = [...cur.classList].filter(goodClass).slice(0, 2);
    if (cls.length) part += '.' + cls.map(esc).join('.');
    const p = cur.parentElement;
    if (p && (!cls.length || !unique(parts.length ? part + ' > ' + parts.join(' > ') : part))) {
      const sib = [...p.children].filter((c) => c.tagName === cur.tagName);
      if (sib.length > 1) part += `:nth-of-type(${sib.indexOf(cur) + 1})`;
    }
    parts.unshift(part);
    if (unique(parts.join(' > '))) break;
    cur = p;
  }
  return parts.join(' > ');
};
const isColumn = (el) => {
  if (!el || el === document.body) return true;
  if (/group-block-content|product__info|product-info|product-details|shopify-section|cart__contents|cart-items|drawer__inner/.test(el.className || '')) return true;
  const cs = getComputedStyle(el);
  const kids = el.children.length;
  return (cs.display === 'grid' && kids >= 2) || (cs.display === 'flex' && /column/.test(cs.flexDirection) && kids >= 3);
};
const block = (el) => {
  if (!el) return null;
  let cur = el;
  for (let i = 0; i < 12 && cur.parentElement && cur.parentElement !== document.body; i++) {
    if (isColumn(cur.parentElement)) break;
    cur = cur.parentElement;
  }
  return { block: sel(cur), column: sel(cur.parentElement) };
};
const rec = (el) => (el ? { selector: sel(el), text: txt(el, 48), aboveFold: aboveFold(el), ...block(el) } : null);
const platform = () => {
  if (window.Shopify && window.Shopify.shop) return 'shopify';
  if (window.BCData) return 'bigcommerce';
  if (window.dw || qa('a[href*="/on/demandware.store/"]').length) return 'salesforce-commerce-cloud';
  if (document.body.classList.contains('woocommerce') || qa('.woocommerce').length) return 'woocommerce';
  if (qa('[data-mage-init], body.catalog-product-view, body.cms-index-index').length) return 'magento';
  return 'custom';
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shopifyCart = async () => { try { const r = await fetch('/cart.js', { credentials: 'same-origin' }); return r.ok ? await r.json() : null; } catch (e) { return null; } };
const priceText = (root = document) => {
  const m = txt(root, 20000).match(/(?:[$€£¥]|CA\$|US\$|A\$|C\$|USD|CAD|EUR|GBP|AUD)\s?\d[\d,.]*/);
  return m ? m[0] : null;
};
// Close the consent banner (decline only, never accept) and marketing popups. Returns what it did.
const dismissOverlays = async () => {
  const out = { dismissed: [], left: [], declineSelector: null, closeSelector: null };
  const overlays = qa('[role="dialog"], [aria-modal="true"], ' + cx('consent,gdpr,popup,modal,newsletter,overlay') + ',' + cx('consent,onetrust,Cybot,popup', 'id'))
    .filter((el) => vis(el) && (/fixed|sticky/.test(getComputedStyle(el).position) || el.getAttribute('role') === 'dialog'));
  const declineRe = /^(decline( all)?|reject( all)?|refuse( all)?|deny( all)?|(only |strictly )?(necessary|essential)( only)?|no,? thanks?|not now|maybe later|continue without|i do not accept)$/i;
  const closeRe = /^(close|dismiss|×|✕|x)$/i;
  for (const o of overlays.slice(0, 6)) {
    const label = txt(o, 140);
    const decline = byText(declineRe, 'button, a, [role="button"]', o)[0];
    const close = byText(closeRe, 'button, a, [role="button"]', o)[0] || qa('button[aria-label*="close" i], a[aria-label*="close" i], [class*="close" i]', o).find(vis);
    const isConsent = /consent|privacy|tracking|we use|your experience/i.test(label) || /consent|onetrust|Cybot|gdpr/i.test(o.id + ' ' + o.className);
    if (decline) { out.declineSelector = out.declineSelector || sel(decline); try { decline.click(); } catch (e) {} out.dismissed.push({ kind: isConsent ? 'consent' : 'popup', via: 'decline', text: label }); continue; }
    if (close && (!isConsent || !byText(/accept|agree|allow|got it|ok/i, 'button, a, [role="button"]', o).length)) { out.closeSelector = out.closeSelector || sel(close); try { close.click(); } catch (e) {} out.dismissed.push({ kind: isConsent ? 'consent' : 'popup', via: 'close', text: label }); continue; }
    out.left.push({ kind: isConsent ? 'consent (no decline control; left unanswered)' : 'overlay', text: label, selector: sel(o) });
  }
  try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); } catch (e) {}
  if (out.dismissed.length) await sleep(500);
  return { dismissed: out.dismissed.map((d) => d.kind + ' via ' + d.via + ': ' + d.text.slice(0, 60)), left: out.left.map((l) => l.kind + ': ' + l.text.slice(0, 60) + ' [' + l.selector + ']'), declineSelector: out.declineSelector, closeSelector: out.closeSelector };
};

// The MAIN product form on a PDP: visible, inside main, after the visible h1, never a hidden
// header / mega-menu / drawer product card. Returns { form, h1, info } (info = the buy-box column).
const productForm = () => {
  const main = q('main') || document.body;
  const h1 = qa('h1', main).find(vis) || qa('h1').find(vis) || null;
  const bad = (el) => !!el.closest('header, nav, footer, [class*="menu" i], [id*="menu" i], [class*="mega" i], [class*="drawer" i]:not([class*="product-info" i]), [id*="drawer" i], [class*="recommend" i], [class*="upsell" i], [class*="card" i], product-card, dynamic-product-card, main-product[id*="card" i]');
  const forms = qa('form[action*="/cart/add"], form[data-product-form], product-form form, form[id*="product" i]').filter((f) => !bad(f) && (vis(f) || qa('button, input[type="submit"]', f).some(vis)));
  const after = (f) => !h1 || !!(h1.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING);
  const form = forms.find(after) || forms[0] || null;
  const info = (form && form.closest('main-product, product-info, .product__info-wrapper, .product__info-container, .product-single__meta, ' + cx('product-info,product__info,product-details,buy-box,product-form-wrapper'))) || (h1 && h1.closest('section, ' + cx('product'))) || (form && form.parentElement) || main;
  return { form, h1, info, candidates: forms.length };
};
// The open cart drawer, if any. Judged by VISIBLE descendants, not the host's own box: custom
// elements like <modal-dialog> are often display:inline with a 0x0 rect while their panel is laid out.
const cartDrawer = () => {
  const cands = qa('cart-drawer, modal-dialog, dialog, [role="dialog"], [aria-modal="true"], ' + cx('cart-drawer,cartdrawer,mini-cart,minicart,side-cart,slide-cart,ajax-cart,cart-notification') + ', ' + cx('cart-drawer,cartdrawer,mini-cart,minicart', 'id'));
  const panel = (el) => vis(el) && el.getBoundingClientRect().height > 150 ? el : qa('*', el).find((c) => vis(c) && c.getBoundingClientRect().height > 150 && c.getBoundingClientRect().width > 200) || null;
  return cands.find((el) => !/menu|search|newsletter|filter|country|geo/i.test(el.id + ' ' + el.className) && /cart|bag|basket|checkout/i.test(txt(el, 600)) && panel(el)) || null;
};
// Output layer. The browser tool cuts any result over 1,000 chars and blocks results that look like
// query strings (key=value&key=value) or base64. So: strip query strings, replace '&', shrink to
// MAX chars by trimming the longest arrays/strings, stash on window.__nw, and return chunk 1 of
// 900. The batch reads chunks 2-4 with: (window.__nw||'').slice(900,1800) etc.
const emit = (out, max = 3600) => {
  const clip = (v) => typeof v === 'string' ? v.replace(/\?(?=[\w-]+=)[^"\s]*/g, '').replace(/&/g, '+').replace(/[A-Za-z0-9+/]{60,}/g, (m) => m.slice(0, 50) + '…').slice(0, 200) : v;
  const walk = (v) => Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : clip(v);
  const o = walk(out);
  let s = JSON.stringify(o);
  for (let i = 0; i < 30 && s.length > max; i++) {
    const arrs = [];
    const scan = (v) => { if (Array.isArray(v)) { if (v.length > 1) arrs.push(v); v.forEach(scan); } else if (v && typeof v === 'object') Object.values(v).forEach(scan); };
    scan(o);
    if (!arrs.length) break;
    arrs.sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0].pop();
    s = JSON.stringify(o);
  }
  if (s.length > max) s = s.slice(0, max - 12) + '…[capped]';
  window.__nw = s;
  const n = Math.ceil(s.length / 900);
  return (n > 1 ? '[chunk 1/' + n + '] ' : '') + s.slice(0, 900);
};
