// STAGE clear_cart — remove what the walkthrough added and verify the cart is empty.
// Shopify: POST /cart/clear.js (deterministic, no button hunting), verified via /cart.js.
// Others: fetch a remove link (a click would navigate and kill this script) or click a
// remove button, then re-read the cart in place; `verify` says when a reload is needed.
const out = { platform: platform(), method: null, cleared: false, itemCount: null, notes: [] };
if (out.platform === 'shopify') {
  try {
    const r = await fetch('/cart/clear.js', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' } });
    out.method = '/cart/clear.js (' + r.status + ')';
    await sleep(800);
    const c = await shopifyCart(); out.itemCount = c ? c.item_count : null; out.cleared = out.itemCount === 0;
  } catch (e) { out.notes.push('/cart/clear.js failed: ' + e.message); }
}
if (!out.cleared) {
  const root = cartDrawer() || document;
  const rows = () => qa(cx('cart-item,line-item,cart__item') + ', tr[class*="cart" i], [data-cart-item], cart-item').filter(vis).length;
  for (let i = 0; i < 3; i++) {
    const rm = byText(/^(remove|delete|×|✕)$/i, 'a, button, [role="button"]', root)[0] || qa('a[href*="quantity=0"], a[href*="/cart/change"], button[name="remove"], a[aria-label*="remove" i], button[aria-label*="remove" i], a[title*="remove" i], ' + cx('remove') + ':not(input)', root).find(vis);
    if (!rm) break;
    const href = rm.tagName === 'A' && rm.getAttribute('href');
    if (href && /quantity=0|\/cart\/change|remove|delete/i.test(href)) {
      try { const r = await fetch(href, { credentials: 'same-origin', redirect: 'follow' }); out.method = 'fetched remove link (' + r.status + ')'; out.verify = 'reload the cart URL and run clear_cart once more to confirm (it only reads when nothing is left to remove)'; } catch (e) { out.notes.push('remove fetch failed: ' + e.message); }
      break;
    }
    try { rm.click(); out.method = (out.method ? out.method + '; ' : '') + 'clicked remove'; } catch (e) { out.notes.push('remove click threw: ' + e.message); break; }
    await sleep(2500);
    if (!rows()) break;
  }
  if (out.platform === 'shopify') { const c = await shopifyCart(); out.itemCount = c ? c.item_count : rows(); } else out.itemCount = rows();
  out.cleared = out.itemCount === 0 || /empty|nothing in your (cart|bag)/i.test(txt(document.body, 3000));
  if (!out.cleared) out.notes.push('cart may still hold the item; report it so the user can clear it');
}
return emit(out);
