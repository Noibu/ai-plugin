// STAGE add_to_cart — add ONE unit of the MAIN product through the page's own add-to-cart
// control (so the real theme handler runs and any drawer opens), verify the add, and read
// whatever surface opened. Picks an in-stock option first when the CTA is gated ("Select
// Size"). Never touches header / menu product cards. On Shopify, /cart.js is the source of
// truth and /cart/add.js (with an available variant) is the fallback. Never checks out.
const out = { platform: platform(), method: null, added: false, itemCountBefore: null, itemCountAfter: null, variantSelected: [], ctaText: null, drawer: null, notes: [] };
const shop = out.platform === 'shopify';
const countBadge = () => { const b = qa(cx('cart-count,cart__count,cart-item-count,bubble') + ', [data-cart-count], ' + cx('cart-count', 'id')).find(vis); return b ? txt(b, 10) : null; };
if (shop) { const c = await shopifyCart(); out.itemCountBefore = c ? c.item_count : null; } else out.itemCountBefore = countBadge();
const { form, info, candidates } = productForm();
const findCta = () => (form && qa('button[type="submit"], input[type="submit"], button[name="add"]', form).find((el) => vis(el) && !/quick/i.test(el.id + ' ' + el.className))) || qa('button, input[type="submit"]', info).find((el) => vis(el) && /add to (cart|bag|basket)|select (a )?size/i.test(txt(el, 60) || el.value || ''));
let cta = findCta();
if (!form) out.notes.push('no visible main product form (' + candidates + ' candidates); CTA search limited to the buy-box region');
const gated = (el) => !el || el.disabled || el.getAttribute('aria-disabled') === 'true' || /select (a )?(size|colou?r|option)|choose/i.test(txt(el, 60) || el.value || '');
// Option pickers in the buy box only: skip color/sibling pickers that navigate to another product,
// skip anything already chosen, pick the first enabled in-stock option of each unchosen group.
const optionRadios = () => qa('input[type="radio"]', info).filter((r) => { const f = r.closest('form[action*="/cart/add"], form[data-product-form]'); return (!f || f === form) && !r.closest('aside, header, footer, swiper-slide, product-card, dynamic-product-card, main-product[id*="card" i], ' + cx('filter,facet,sibling,card,recommend,slide,carousel,pairs')) && !/sibling|card|filter/i.test(r.name + ' ' + r.id) && (vis(r) || (r.labels && r.labels[0] && vis(r.labels[0]))); });
if (gated(cta) || optionRadios().some((r) => !optionRadios().some((x) => x.name === r.name && x.checked))) {
  const groups = {};
  for (const r of optionRadios()) (groups[r.name] = groups[r.name] || []).push(r);
  for (const [name, radios] of Object.entries(groups)) {
    if (radios.some((r) => r.checked)) continue;
    const soldOut = (r) => /sold|unavailable|disabled|out-of-stock|line-through/i.test(r.className + ' ' + (r.labels && r.labels[0] ? r.labels[0].className + ' ' + txt(r.labels[0], 40) : '') + ' ' + (r.parentElement ? r.parentElement.className : ''));
    const pick = radios.find((r) => !r.disabled && !soldOut(r)) || radios.find((r) => !r.disabled);
    if (pick) { try { pick.click(); out.variantSelected.push(name + ': ' + ((pick.value && pick.value !== 'on') ? pick.value : (pick.labels && pick.labels[0] ? txt(pick.labels[0], 20) : (pick.nextSibling && pick.nextSibling.textContent || '').trim().slice(0, 20)))); } catch (e) {} }
  }
  for (const s of qa('select', info).filter((s) => vis(s) && !/sort|country|currency|quantity/i.test(s.name + ' ' + s.id))) {
    if (s.selectedIndex <= 0 || s.options[s.selectedIndex].disabled) { const o = [...s.options].find((x) => !x.disabled && x.value && !/select|choose/i.test(x.textContent)); if (o) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); out.variantSelected.push((s.name || 'select') + ': ' + txt(o, 20)); } }
  }
  if (out.variantSelected.length) { await sleep(2000); cta = (form && qa('button[type="submit"], input[type="submit"], button[name="add"]', form).find((el) => vis(el) && !el.disabled && !/quick/i.test(el.id + ' ' + el.className))) || findCta(); }
}
if (!cta) out.notes.push('no add-to-cart control found');
else if (cta.disabled || cta.getAttribute('aria-disabled') === 'true') out.notes.push('add-to-cart control is disabled (' + (txt(cta, 40) || cta.value) + ')' + (out.variantSelected.length ? ' even after selecting ' + out.variantSelected.join(', ') : ''));
else { try { out.ctaText = txt(cta, 40) || cta.value; cta.click(); out.method = 'click'; } catch (e) { out.notes.push('click threw: ' + e.message); } }
await sleep(3500);
if (shop) {
  let c = await shopifyCart(); out.itemCountAfter = c ? c.item_count : null;
  if (c && c.item_count === out.itemCountBefore) {
    // Prefer an available variant from the product JSON; the form's id can point at a sold-out default.
    let vid = null;
    try { const pj = await (await fetch(location.pathname.replace(/\/$/, '') + '.js', { credentials: 'same-origin' })).json(); const cur = form && q('[name="id"]', form) && q('[name="id"]', form).value; const v = (pj.variants || []).find((x) => x.available && String(x.id) === String(cur)) || (pj.variants || []).find((x) => x.available); vid = v && v.id; if (v) out.notes.push('ajax variant: ' + (v.title || v.id)); } catch (e) {}
    if (!vid) vid = (form && q('[name="id"]', form) && q('[name="id"]', form).value) || null;
    if (vid) {
      try {
        const r = await fetch('/cart/add.js', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: [{ id: Number(vid), quantity: 1 }] }) });
        out.notes.push((out.method ? 'click did not change /cart.js; ' : '') + 'used /cart/add.js (' + r.status + ')'); out.method = 'ajax';
        await sleep(1200); c = await shopifyCart(); out.itemCountAfter = c ? c.item_count : null;
      } catch (e) { out.notes.push('/cart/add.js failed: ' + e.message); }
    } else out.notes.push('no variant id available for the ajax fallback');
  }
  out.added = out.itemCountAfter != null && out.itemCountBefore != null && out.itemCountAfter > out.itemCountBefore;
  if (c && c.items && c.items.length) out.cartNow = c.items.map((i) => i.product_title + ' / ' + i.variant_title + ' / ' + (i.final_line_price / 100).toFixed(2)).slice(0, 3);
} else {
  out.itemCountAfter = countBadge();
  out.added = out.itemCountAfter !== out.itemCountBefore || !!cartDrawer();
  out.notes.push('non-Shopify: added is inferred from the cart badge / drawer; verify on the cart page');
}
// Whatever opened after the click: drawer, notification, or nothing (a redirect shows as a location change).
const drawer = cartDrawer();
if (drawer) {
  const checkout = qa('button, a, input[type="submit"]', drawer).find((el) => vis(el) && /check ?out/i.test(txt(el, 40) || el.value || ''));
  const shipMsg = qa('p, div, span', drawer).filter((el) => vis(el) && el.children.length < 3 && /ship|deliver/i.test(txt(el, 160)) && txt(el, 160).length < 160 && !scripty(txt(el, 160))).slice(0, 3).map((el) => txt(el, 160));
  out.drawer = { kind: /notification|added/i.test(drawer.className) ? 'notification' : 'drawer', selector: sel(drawer), text: txt(drawer, 400), checkoutCta: checkout ? txt(checkout, 40) : null, shippingMessages: [...new Set(shipMsg)], freeShippingProgress: qa(cx('progress,shipping-bar,free-shipping,threshold') + ', progress', drawer).some(vis) || /away from|left (until|to|for) free|until free|more to (get|unlock|qualify)|to qualify|you('ve| have) (secured|unlocked|earned)/i.test(txt(drawer, 800)) };
  if (checkout) out.drawer.checkoutSelector = rec(checkout);
} else out.drawer = { kind: location.pathname.includes('/cart') ? 'redirected-to-cart-page' : 'none' };
out.locationAfter = location.pathname;
return emit(out);
