// STAGE read_home — one read of the homepage: platform + storefront (incl. market routing), third-party testing tools, announcement bar,
// hero, search, below-the-fold sections, policy links, cart URL, selectors, and a mid-priced
// in-stock product as the fallback for the cart path when the data names no product page.
// Returns chunk 1 of a JSON string; the batch reads chunks 2-4 from window.__nw.
const out = { url: location.href, platform: platform(), storefront: {}, testingTools: [], announcementBar: null, hero: {}, search: {}, pageHeightPx: document.documentElement.scrollHeight, foldPx: window.innerHeight, sectionsBelowFold: [], policyLinks: [], cartUrl: null, product: null, selectors: {}, overlays: null };
out.overlays = await dismissOverlays();
const path = (u) => { try { const a = new URL(u, location.origin); return a.origin === location.origin ? a.pathname : a.origin + a.pathname; } catch (e) { return null; } };
if (window.Shopify) out.storefront = { shop: Shopify.shop, country: Shopify.country || null, currency: (Shopify.currency && Shopify.currency.active) || null, locale: Shopify.locale || null, routeRoot: (Shopify.routes && Shopify.routes.root) || null };
out.storefront.firstPriceSeen = priceText();
out.storefront.htmlLang = document.documentElement.lang || null;
// Market routing: a locale prefix on the path (/en-gb/, /fr-fr/) means the store serves several markets from one domain.
const pfx = location.pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)(?=\/|$)/i);
out.storefront.pathPrefix = pfx ? '/' + pfx[1].toLowerCase() : null;
out.storefront.multiMarketHint = !!(out.storefront.pathPrefix || (out.storefront.routeRoot && out.storefront.routeRoot !== '/') || qa('a[hreflang]').length > 2);
// Third-party experimentation tools on the page: globals they install, then the hosts their resources load from.
// Read from window and the resource timing list only (never from script tags or page source).
const toolGlobals = [['Optimizely', 'optimizely'], ['VWO', '_vwo_code'], ['VWO', 'VWO'], ['Convert', 'convert'], ['AB Tasty', 'ABTasty'], ['Kameleoon', 'Kameleoon'], ['Dynamic Yield', 'DY'], ['Google Optimize', 'google_optimize'], ['Adobe Target', 'adobe'], ['Intelligems', 'igData'], ['Shoplift', 'Shoplift'], ['Visually', 'visually']];
const toolHosts = [['Optimizely', /optimizely\.com/i], ['VWO', /visualwebsiteoptimizer\.com|vwo\.com/i], ['Convert', /convertexperiments\.com/i], ['AB Tasty', /abtasty\.com/i], ['Kameleoon', /kameleoon\.(com|eu|io)/i], ['Dynamic Yield', /dynamicyield\.com/i], ['Adobe Target', /tt\.omtrdc\.net|adobedtm\.com/i], ['Intelligems', /intelligems\.io/i], ['Shoplift', /shoplift\.ai/i], ['Visually', /visually\.io/i], ['Omniconvert', /omniconvert\.com/i]];
const found = new Set();
for (const [name, g] of toolGlobals) { try { if (typeof window[g] !== 'undefined' && window[g] !== null) found.add(name); } catch (e) {} }
try { for (const r of performance.getEntriesByType('resource')) { for (const [name, re] of toolHosts) { if (re.test(r.name)) found.add(name); } } } catch (e) {}
out.testingTools = Array.from(found);
// Announcement bar: a visible strip near the top whose name says so.
const bar = qa(cx('announcement,promo-bar,promobar,top-bar,topbar,marquee,ticker,usp,header__bar') + ',' + cx('announcement', 'id')).find((el) => vis(el) && el.getBoundingClientRect().top < 220 && txt(el, 400).length > 3);
if (bar) { out.announcementBar = txt(bar, 300); out.selectors.announcementBar = rec(bar); }
// Hero: first big heading above the fold and its CTA.
const main = q('main') || document.body;
const h = qa('h1, h2', main).find((el) => vis(el) && aboveFold(el));
if (h) {
  const region = h.closest('section, ' + cx('hero,banner,slide') + ', .shopify-section') || h.parentElement;
  const cta = qa('a, button', region).find((el) => vis(el) && txt(el, 60).length > 1 && txt(el, 60).length < 40);
  out.hero = { heading: txt(h, 100), cta: cta ? txt(cta, 40) : null, ctaHref: cta && cta.href ? path(cta.href) : null };
  if (cta) out.selectors.heroCta = rec(cta);
} else out.hero = { heading: null, note: 'no visible h1/h2 above the fold (hero may be image-only or still loading)' };
// Search entry point.
const sInput = qa('input[type="search"], input[name="q"], input[name="query"], input[placeholder*="search" i]').find(vis);
const sLink = qa('a[href*="/search"], button[aria-label*="search" i], [class*="search" i] button, summary[aria-label*="search" i]').find(vis) || byText(/^search$/i, 'button, a, summary, [role="button"]')[0];
out.search = { inputVisible: !!sInput, iconOrLink: !!sLink, placeholder: sInput ? sInput.placeholder : null };
if (sInput || sLink) out.selectors.search = rec(sInput || sLink);
// Sections below the fold, in order (compare with scroll-depth quantiles from the data).
out.sectionsBelowFold = qa('h2, h3', main).filter((el) => vis(el) && el.getBoundingClientRect().top + window.scrollY > window.innerHeight).slice(0, 12).map((el) => txt(el, 40) + ' @' + Math.round(el.getBoundingClientRect().top + window.scrollY));
// Policy / help links from the footer.
const footer = q('footer') || document.body;
const seen = new Set();
for (const a of qa('a[href]', footer)) {
  const t = txt(a, 40); const p = path(a.href);
  if (!p || !/ship|deliver|return|refund|exchange|faq|help|policy/i.test(t + ' ' + p) || seen.has(p) || /^#|privacy|terms|legal/i.test(p + t)) continue;
  seen.add(p); out.policyLinks.push(t + ' → ' + p);
  if (out.policyLinks.length >= 8) break;
}
// Cart URL and icon.
const cartLink = qa('a[href*="/cart"], a[href*="/basket"], a[href*="/bag"], a[aria-label*="cart" i], button[aria-label*="cart" i], ' + cx('cart', 'id') + ' a, [class*="cart" i] a').find(vis);
out.cartUrl = out.platform === 'shopify' ? '/cart' : (cartLink && cartLink.href ? path(cartLink.href) : null);
if (cartLink) out.selectors.cartIcon = rec(cartLink);
// Fallback product for the cart path: mid-priced, in stock, from Shopify's /products.json (null elsewhere; the data's top product page is used first).
if (out.platform === 'shopify') {
  try {
    const r = await fetch('/products.json?limit=250', { credentials: 'same-origin' });
    const items = r.ok ? (await r.json()).products || [] : [];
    const cands = [];
    for (const p of items) {
      const v = (p.variants || []).find((x) => x.available);
      if (!v || !(parseFloat(v.price) > 0)) continue;
      cands.push({ title: p.title, handle: p.handle, variantId: v.id, variantTitle: v.title, price: parseFloat(v.price), type: p.product_type || null });
    }
    cands.sort((a, b) => a.price - b.price);
    if (cands.length) {
      const pick = cands[Math.floor(cands.length / 2)];
      out.product = { url: '/products/' + pick.handle, title: pick.title, price: pick.price, availableVariant: pick.variantId + ' (' + pick.variantTitle + ')', type: pick.type, pickedFrom: cands.length + ' in-stock products via /products.json, price range ' + cands[0].price + '-' + cands[cands.length - 1].price };
    } else out.product = { error: 'products.json returned no available products (' + items.length + ' products)' };
  } catch (e) { out.product = { error: 'products.json failed: ' + (e && e.message) }; }
}
return emit(out);
