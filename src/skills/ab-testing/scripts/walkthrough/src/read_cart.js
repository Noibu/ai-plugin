// STAGE read_cart — one read of the cart surface with one item in it: the cart page, or the
// drawer when the store has no cart page (some redirect /cart to a drawer over the
// homepage). Items, shipping messaging verbatim, free-shipping progress, promo field,
// estimator, checkout CTA, express pay, upsells, extras, remove control, selectors.
// Returns chunk 1 of a JSON string; the batch reads chunks 2-4 from window.__nw.
const out = { url: location.pathname, platform: platform(), surface: null, itemCount: null, subtotal: null, itemsInCart: null, shippingMessages: [], freeShippingProgress: null, promoField: null, shippingEstimator: null, checkoutCta: null, expressPay: [], upsells: null, extras: [], removeControl: null, selectors: {}, notes: [], overlays: null };
out.overlays = await dismissOverlays();
const drawer = cartDrawer();
const onCartPage = /\/cart|\/basket|\/bag|checkout\/cart/i.test(location.pathname);
const root = drawer || (onCartPage ? (q('main') || q('[class*="cart" i]') || document.body) : null);
out.surface = drawer ? 'drawer' + (onCartPage ? ' (over the cart page)' : ' (site redirected /cart to a drawer over ' + location.pathname + ')') : onCartPage ? 'page' : 'unknown: not on a cart URL and no drawer open';
if (!root) { out.notes.push('no cart surface found; open the cart from its icon and re-run'); return emit(out); }
if (out.platform === 'shopify') { const c = await shopifyCart(); if (c) { out.itemCount = c.item_count; out.subtotal = (c.total_price / 100).toFixed(2) + ' ' + (c.currency || ''); out.itemsInCart = (c.items || []).map((i) => i.product_title + ' / ' + i.variant_title + ' / ' + (i.final_line_price / 100).toFixed(2)).slice(0, 3); } }
const rows = qa(cx('cart-item,line-item,cart__item') + ', tr[class*="cart" i], [data-cart-item], cart-item, [id*="CartItem" i]', root).filter(vis);
if (out.itemCount == null) { out.itemCount = rows.length; const sub = qa(cx('subtotal,total'), root).find((el) => vis(el) && /\d/.test(txt(el, 60))); out.subtotal = sub ? txt(sub, 60) : null; }
if (rows[0]) out.selectors.lineItem = rec(rows[0]);
// Shipping messaging, verbatim, inside the cart surface only.
const seen = new Set();
for (const el of qa('p, div, span, li, small, em, strong', root)) {
  if (!vis(el) || el.children.length > 3) continue;
  const t = txt(el, 160);
  if (t.length < 6 || t.length > 160 || seen.has(t) || scripty(t) || !/ship|deliver|dispatch|arrive/i.test(t)) continue;
  if ([...seen].some((s) => s.includes(t))) continue;
  seen.add(t); out.shippingMessages.push({ text: t, selector: sel(el) });
  if (out.shippingMessages.length >= 5) break;
}
if (!out.shippingMessages.length) out.shippingMessages = 'absent';
else out.selectors.cartShippingMessage = rec(q(out.shippingMessages[0].selector));
// Free-shipping progress indicator.
const prog = qa(cx('progress,shipping-bar,free-shipping,threshold,goal') + ', progress', root).find(vis);
const progText = qa('p, div, span', root).find((el) => vis(el) && el.children.length < 3 && /away from|left (until|to|for) free|until free (shipping|delivery)|more (to|for) (get|unlock|qualify|free)|to qualify for free|you('ve| have) (unlocked|earned|qualified|secured)|spend .* (more|to get)/i.test(txt(el, 160)));
out.freeShippingProgress = prog || progText ? { present: true, text: txt(progText || prog, 120), selector: sel(prog || progText) } : { present: false };
// Promo / discount code field (visible, or behind a toggle).
const promoInput = qa('input[name*="discount" i], input[name*="coupon" i], input[name*="promo" i], input[id*="discount" i], input[id*="coupon" i], input[placeholder*="code" i], input[placeholder*="discount" i], input[placeholder*="promo" i], input[placeholder*="coupon" i]', root).find(vis);
const promoToggle = qa('button, a, summary, label, span', root).find((el) => vis(el) && el.children.length < 3 && /(discount|promo|coupon|gift card|voucher) ?(code)?/i.test(txt(el, 60)) && txt(el, 60).length < 60);
out.promoField = promoInput ? { present: true, how: 'input visible', placeholder: promoInput.placeholder || null, selector: sel(promoInput) } : promoToggle ? { present: true, how: 'behind a toggle: ' + txt(promoToggle, 40), selector: sel(promoToggle) } : { present: false, note: out.platform === 'shopify' ? 'Shopify carts usually take codes at checkout, not in the cart' : null };
// Shipping estimator.
const est = qa(cx('shipping-calculator,shipping-estimat') + ', [data-shipping-estimator]', root).find(vis) || qa('button, a, summary, h2, h3, p', root).find((el) => vis(el) && /estimate shipping|shipping estimat|calculate shipping|get shipping rates/i.test(txt(el, 80)));
out.shippingEstimator = est ? { present: true, text: txt(est, 60), selector: sel(est) } : { present: false };
// Checkout CTA.
const checkout = qa('button[name="checkout"], input[name="checkout"], a[href*="/checkout"], button[form*="cart"][type="submit"]', root).find(vis) || qa('button, a, input[type="submit"]', root).find((el) => vis(el) && /check ?out|proceed|secure checkout/i.test(txt(el, 40) || el.value || ''));
if (checkout) { out.checkoutCta = { text: txt(checkout, 40) || checkout.value || null, disabled: !!checkout.disabled }; out.selectors.checkoutCta = rec(checkout); } else out.notes.push('no checkout control found on this surface');
// Express pay.
for (const el of qa('shopify-payment-button, .shopify-payment-button, ' + cx('dynamic-checkout,additional-checkout,paypal,shop-pay,shopify-pay,apple-pay,google-pay,amazon-pay') + ', iframe[title*="PayPal" i], [data-shopify="dynamic-checkout-cart"]', root)) if (vis(el)) out.expressPay.push((txt(el, 30) || el.getAttribute('title') || el.tagName.toLowerCase()).toLowerCase());
out.expressPay = [...new Set(out.expressPay)];
// Upsells / cross-sells.
const upHead = qa('h2, h3, h4, p', root).find((el) => vis(el) && /you may also like|you might also like|recommended|frequently bought|complete the look|pairs well|add-?ons|customers also|don'?t forget|before you go/i.test(txt(el, 80)));
const upBlock = qa(cx('upsell,cross-sell,crosssell,recommend,complementary'), root).find(vis);
out.upsells = upHead || upBlock ? { present: true, heading: upHead ? txt(upHead, 60) : null, products: qa('a[href*="/products/"], a[href*="/product"]', upBlock || upHead.parentElement).filter(vis).length, selector: sel(upBlock || upHead) } : { present: false };
// Extras worth knowing.
for (const [k, re] of [['orderNote', /order note|special instructions|add a note/i], ['giftOption', /gift (wrap|message|option)/i], ['trustBadges', /secure checkout|ssl|money.?back|guarantee|safe (and|&) secure/i], ['continueShopping', /continue shopping/i], ['taxesShippingNote', /tax(es)? (and|&|,)? ?(discounts)?,? ?(and|&)? ?shipping (calculated|at checkout)|shipping (calculated|at checkout)/i], ['storePickup', /pick ?up in store|select store/i]]) {
  const el = qa('p, a, button, label, summary, span, div, small', root).find((x) => vis(x) && x.children.length < 3 && re.test(txt(x, 120)));
  if (el) out.extras.push(k + ': ' + txt(el, 80));
}
// Remove control (text first, then attributes; never a quantity input).
const rm = byText(/^(remove|delete|×|✕)$/i, 'a, button, [role="button"]', root)[0] || qa('a[href*="quantity=0"], a[href*="/cart/change"], button[name="remove"], a[aria-label*="remove" i], button[aria-label*="remove" i], a[title*="remove" i], cart-remove-button a, cart-remove-button button, ' + cx('remove') + ':not(input)', root).find(vis);
if (rm) { out.removeControl = { text: txt(rm, 20) || rm.getAttribute('aria-label') || null, selector: sel(rm) }; out.selectors.removeControl = rec(rm); }
return emit(out);
