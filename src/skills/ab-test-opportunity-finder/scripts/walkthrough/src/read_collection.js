// STAGE read_collection — one read of a collection / category page: item count, default
// sort and options, filters, product cards (found generically: the grid cell around each
// product link, so custom card elements count too), quick add on cards (if it exists, any
// "add quick add" candidate dies), merchandising platform, and card selectors + containers.
// Returns chunk 1 of a JSON string; the batch reads chunks 2-4 from window.__nw.
const out = { url: location.pathname, platform: platform(), title: null, productCountText: null, sort: null, filters: null, cards: { count: 0, aboveFold: 0, sample: [] }, quickAdd: null, merchandising: [], selectors: {}, notes: [], overlays: null };
out.overlays = await dismissOverlays();
const h1 = qa('h1').find(vis); out.title = h1 ? txt(h1, 60) : document.title.slice(0, 60);
const main = q('main') || document.body;
const cnt = qa('p, span, div, h2', main).filter((el) => vis(el) && /\b\d+\s+(products?|items?|results?|styles?)\b/i.test(txt(el, 60))).sort((a, b) => txt(a, 60).length - txt(b, 60).length)[0];
out.productCountText = cnt ? (txt(cnt, 60).match(/\d[\d,]*\s+(?:products?|items?|results?|styles?)/i) || [txt(cnt, 40)])[0] : null;
// Sort control.
const sortSel = qa('select[name*="sort" i], select[id*="sort" i], select[class*="sort" i]', main).find(vis) || qa('select', main).find((s) => vis(s) && /best ?selling|price|newest|featured|alphabetically|relevance/i.test([...s.options].map((o) => o.text).join(' ')));
const sortBtn = qa('button, summary, a, label, span', main).find((el) => vis(el) && el.children.length < 4 && (/^sort( by)?:?/i.test(txt(el, 40)) || /sort/i.test(el.getAttribute('aria-label') || '')));
if (sortSel) out.sort = { control: 'select', current: sortSel.options[sortSel.selectedIndex] ? txt(sortSel.options[sortSel.selectedIndex], 30) : null, options: [...sortSel.options].map((o) => txt(o, 30)).slice(0, 8), selector: sel(sortSel) };
else if (sortBtn) out.sort = { control: 'button/menu', label: txt(sortBtn, 40), selector: sel(sortBtn), options: qa('[role="option"], [role="menuitem"], li, label, a, button', sortBtn.closest('details, div, form, ' + cx('sort')) || sortBtn.parentElement).map((o) => txt(o, 30)).filter((t, i, arr) => t.length > 2 && t.length < 30 && !/^sort/i.test(t) && arr.indexOf(t) === i).slice(0, 8) };
else out.sort = { control: 'none found' };
// Filters.
const filterRoot = qa('form[id*="filter" i], ' + cx('facet,filter') + ', aside, [id*="filter" i]', main).find((el) => (vis(el) || /dialog/i.test(el.tagName)) && qa('input, details, summary, button', el).length >= 2);
const filterBtn = byText(/^filters?( \(\d+\))?$/i, 'button, a, summary, label', main)[0];
out.filters = filterRoot ? { present: true, groups: [...new Set(qa('summary, legend, h3, h4, ' + cx('filter-title,facet-title,facet__label'), filterRoot).map((el) => txt(el, 24)).filter(Boolean))].slice(0, 10), layout: /aside/i.test(filterRoot.tagName) || (vis(filterRoot) && filterRoot.getBoundingClientRect().left < window.innerWidth / 3) ? 'sidebar' : 'drawer/top', selector: sel(filterRoot) } : filterBtn ? { present: true, layout: 'behind a button: ' + txt(filterBtn, 20), selector: sel(filterBtn) } : { present: false };
// Product cards: known card elements first, else the grid cell around each product link.
const links = qa('a[href*="/products/"], a[href*="/product/"], a[href*="/p/"]', main).filter((a) => !a.closest('header, nav, footer, ' + cx('breadcrumb,recommend,recently')));
const cellOf = (a) => { let el = a; for (let i = 0; i < 8 && el.parentElement && el.parentElement !== main; i++) { const p = el.parentElement; const cs = getComputedStyle(p); if (((cs.display === 'grid' || cs.display === 'flex' || /grid|collection|products|results|listing|swiper-wrapper/i.test(p.className)) && p.children.length >= 3)) return el; el = p; } return null; };
let cards = qa('product-card, dynamic-product-card, main-product[id*="card" i], ' + cx('product-card,card-product,product-item,product-grid-item,grid__item,product-tile,product-summary,product-block,productitem,product_card'), main).filter((c) => qa('a[href*="/product"], a[href*="/p/"]', c).length && !c.closest('header, nav, footer'));
if (cards.length < 3) cards = [...new Set(links.map(cellOf).filter(Boolean))];
// Last resort (custom themes): the nearest card-sized ancestor of each product link, so a grid is never reported as 0 cards.
if (cards.length < 3) cards = [...new Set(links.map((a) => { let el = a; for (let i = 0; i < 6 && el.parentElement && el.parentElement !== main; i++) { const r = el.getBoundingClientRect(); if (r.width > 120 && r.width < 700 && r.height > 150) return el; el = el.parentElement; } return null; }).filter(Boolean))];
cards = cards.filter((c) => !cards.some((o) => o !== c && o.contains(c)));
out.cards.count = cards.length;
out.cards.aboveFold = cards.filter((c) => vis(c) && aboveFold(c)).length;
out.cards.sample = cards.slice(0, 4).map((c) => { const a = q('a[href]', c); const p = qa('[class*="price" i]', c).find(vis); const link = qa('a[href*="/product"], a[href*="/p/"]', c).find((a) => txt(a, 40) && !/buy|off|sale|new/i.test(txt(a, 40))) ; const img = q('img[alt]', c); const title = (c.closest('[aria-label]') && (c.closest('[aria-label]').getAttribute('aria-label') || '').replace(/^product /i, '')) || (link && txt(link, 40)) || (img && img.alt.slice(0, 40)) || txt(q('h2, h3, [class*="title" i]', c), 40) || '?'; return title.slice(0, 40) + ' | ' + (p ? txt(p, 30) : 'no price') + (qa('[class*="badge" i], [class*="label" i]', c).find(vis) ? ' | badge: ' + txt(qa('[class*="badge" i], [class*="label" i]', c).find(vis), 30) : ''); });
if (cards[0]) { out.selectors.productCard = rec(cards[0]); const img = q('img', cards[0]); if (img) out.selectors.cardImage = rec(img); const pr = qa('[class*="price" i]', cards[0]).find(vis); if (pr) out.selectors.cardPrice = rec(pr); }
if (!cards.length) out.notes.push('no product cards recognized; run one find for "product card" in the fix-up batch to get its selector');
// Quick add on cards (hidden hover-only controls count as present).
const qaBtn = cards.slice(0, 12).map((c) => qa('button, a, form[action*="/cart/add"] [type="submit"], ' + cx('quick,add-to-cart') + ', [data-quick-add], quick-shop-toggle button, quick-add-button', c).find((el) => /quick|add to (cart|bag)|^\+$|choose options|^add$/i.test(txt(el, 40) || el.getAttribute('aria-label') || '') || /quick-?(add|shop|view|buy)|add-to-cart/i.test(el.className + ' ' + el.id))).find(Boolean);
const sizeForms = cards.slice(0, 12).reduce((n, c) => n + qa('form[action*="/cart/add"]', c).length, 0);
out.quickAdd = qaBtn ? { present: true, text: txt(qaBtn, 30) || qaBtn.getAttribute('aria-label') || null, visibleWithoutHover: vis(qaBtn), addFormsInFirst12Cards: sizeForms, selector: sel(qaBtn) } : { present: false, addFormsInFirst12Cards: sizeForms, note: cards.length ? 'no quick-add control inside the first 12 cards' : 'no cards recognized, so unknown' };
if (qaBtn) out.selectors.quickAdd = rec(qaBtn);
// Merchandising / search platform hooks.
const globals = { searchspring: !!window.SearchSpring || !!window.searchspring, nosto: !!window.Nosto || !!window.nostojs, klevu: !!window.klevu, algolia: !!window.algoliasearch || !!window.algoliaShopify, boost: !!window.boostPFSConfig || !!window.boostSDConfig || !!window.BoostPFS, searchanise: !!window.Searchanise, findify: !!window.findify, bloomreach: !!window.BrTrk, fastsimon: !!window.ISP_PROPERTIES || !!window.InstantSearchPlus, rebuy: !!window.Rebuy, visually: !!window.visually || !!q('[class*="vsly" i]') };
for (const [k, v] of Object.entries(globals)) if (v) out.merchandising.push(k);
for (const el of qa(cx('searchspring,nosto,klevu,ais-,boost-,snize,findify,ns-serp')).slice(0, 3)) out.merchandising.push((el.className.match(/searchspring|nosto|klevu|ais-|boost-|snize|findify|ns-serp/i) || [''])[0].toLowerCase());
out.merchandising = [...new Set(out.merchandising)];
out.gridTopPx = cards[0] && vis(cards[0]) ? Math.round(cards[0].getBoundingClientRect().top + window.scrollY) : null;
out.foldPx = window.innerHeight;
return emit(out);
