// STAGE click_checkout — from the cart surface, click the checkout control once (checkout
// goals only, to observe the first step). Follow it with a 4-second wait and
// read_checkout_entry.
const root = cartDrawer() || q('main') || document.body;
const checkout = qa('button[name="checkout"], input[name="checkout"], a[href*="/checkout"]', root).find(vis) || qa('button, a, input[type="submit"]', root).find((el) => vis(el) && /check ?out|proceed/i.test(txt(el, 40) || el.value || ''));
if (!checkout) return emit({ clicked: false, note: 'no checkout control found' });
try { checkout.click(); } catch (e) { return emit({ clicked: false, note: 'click threw: ' + e.message }); }
return emit({ clicked: true, control: txt(checkout, 40) || checkout.value || null });
