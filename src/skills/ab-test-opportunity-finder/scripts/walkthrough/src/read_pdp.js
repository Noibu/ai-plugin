// STAGE read_pdp — one read of a product page, scoped to the MAIN product (never a hidden
// header / mega-menu product card): what is above the fold, the CTA and its state,
// shipping/returns copy near the buy box (verbatim), third-party widgets, and the
// selectors + block containers a variation on this surface would touch.
// Returns chunk 1 of a JSON string; the batch reads chunks 2-4 from window.__nw.
const out = { url: location.pathname, platform: platform(), title: null, price: null, inStock: null, aboveFold: {}, cta: null, variantSelector: null, shippingReturnsCopy: [], expressPayOnPdp: [], widgets: [], selectors: {}, selectedVariantId: null, notes: [], overlays: null };
out.overlays = await dismissOverlays();
const { form, h1, info, candidates } = productForm();
const titleEl = h1 || qa('h1, h2, [class*="product-title" i], [class*="product__title" i]', info).find((el) => vis(el) && txt(el, 100).length > 2) || qa('h1, h2', document.body).find((el) => vis(el) && !el.closest('header, nav, footer') && txt(el, 100).length > 2);
out.title = titleEl ? txt(titleEl, 100) : null;
if (!form) out.notes.push('no visible main product form found (' + candidates + ' candidates)');
// Price near the buy box.
const priceEl = qa('[class*="price" i], [data-price], [itemprop="price"]', info).find((el) => vis(el) && /\d/.test(txt(el, 40)) && txt(el, 40).length < 40) || qa('[class*="price" i], [data-price], [itemprop="price"]', document.body).find((el) => vis(el) && !el.closest('header, nav, footer, ' + cx('recommend,related,upsell,card')) && /^[^\d]{0,4}\d/.test(txt(el, 40)) && txt(el, 40).length < 40);
out.price = priceEl ? txt(priceEl, 60) : priceText(info);
if (priceEl) out.selectors.price = rec(priceEl);
// CTA: the add-to-cart control and its state.
const cta = (form && qa('button[type="submit"], input[type="submit"], button[name="add"]', form).find((el) => vis(el))) || (form && q('button[type="submit"], input[type="submit"], button[name="add"]', form)) || qa('button, a, input[type="submit"]', info).find((el) => vis(el) && /add to (cart|bag|basket)|buy now|select (a )?size|sold out|notify|pre-?order|out of stock/i.test(txt(el, 60) || el.value || ''));
if (cta) {
  const label = txt(cta, 60) || cta.value || cta.getAttribute('aria-label') || '';
  const disabled = !!(cta.disabled || cta.getAttribute('aria-disabled') === 'true' || /disabled/i.test(cta.className));
  out.cta = { text: label, disabled, visible: vis(cta), aboveFold: aboveFold(cta) };
  out.inStock = /sold out|out of stock|unavailable|notify/i.test(label) ? false : (disabled && /select|choose/i.test(label)) ? 'gated until an option is chosen ("' + label + '")' : !disabled;
  out.selectors.addToCart = rec(cta);
  if (form) out.selectors.productForm = rec(form);
} else out.notes.push('no add-to-cart control found in the main product region');
const idInput = form && q('[name="id"]', form); out.selectedVariantId = idInput ? idInput.value : null;
// Option pickers in the buy box (up to 3: color, size, ...), each with its groups, option count and sold-out count.
const hosts = [...new Set(qa('variant-selects, variant-radios, variant-picker, product-variant-picker, ' + cx('variant-picker,variant-selects,variant-radios,product-options,swatch,size-select'), info).filter(vis).map((el) => el.closest('variant-selects, variant-radios, variant-picker, product-variant-picker, ' + cx('variant,product-options')) || el))];
if (!hosts.length) { const f = qa('fieldset, select', info).find((el) => vis(el) && !/sort|country|currency|quantity/i.test(el.name + ' ' + el.id + ' ' + el.className)); if (f) hosts.push(f); }
const vhost = hosts[0] || null;
out.variantSelector = hosts.slice(0, 3).map((host) => {
  const opts = qa('option, input[type="radio"]', host);
  const legend = [...new Set(qa('legend, label.form__label, .form__label, ' + cx('option-name,option__label,option-label,label'), host).map((el) => txt(el, 24)).filter(Boolean))].slice(0, 3);
  const unavailable = opts.filter((o) => o.disabled || /sold|unavailable|disabled|line-through/i.test(o.className + ' ' + (o.labels && o.labels[0] ? o.labels[0].className : ''))).length;
  return { type: host.tagName.toLowerCase(), label: legend.join(' / ') || txt(host, 30), optionCount: opts.length, unavailableOptions: unavailable, anySelected: opts.some((o) => o.checked || o.selected), aboveFold: aboveFold(host), selector: sel(host), ...(hosts.indexOf(host) === 0 ? {} : {}) };
});
if (vhost) out.selectors.variantSelector = rec(vhost);
if (hosts[1]) out.selectors.variantSelector2 = rec(hosts[1]);
// Shipping / returns / promo copy near the buy box, verbatim.
const seenCopy = new Set();
for (const el of qa('p, li, div, span, summary, details, a, small', info)) {
  if (!vis(el) || el.children.length > 4 || el.closest(cx('recommend,upsell,card'))) continue;
  const t = txt(el, 160);
  if (t.length < 8 || t.length > 160 || seenCopy.has(t) || scripty(t) || !/ship|deliver|return|exchange|free |guarantee|in stock|arrives|dispatch|klarna|afterpay|sezzle|affirm|installments|pick ?up in store/i.test(t)) continue;
  if ([...seenCopy].some((s) => s.includes(t))) continue;
  seenCopy.add(t);
  out.shippingReturnsCopy.push({ text: t, aboveFold: aboveFold(el), selector: sel(el) });
  if (!out.selectors.shippingBlock && /ship|deliver|return/i.test(t)) out.selectors.shippingBlock = rec(el);
  if (out.shippingReturnsCopy.length >= 6) break;
}
if (!out.shippingReturnsCopy.length) out.shippingReturnsCopy = 'absent';
// Express pay on the PDP.
for (const el of qa('shopify-payment-button, .shopify-payment-button, ' + cx('dynamic-checkout,paypal,shop-pay,apple-pay,google-pay') + ', iframe[title*="PayPal" i]', info)) if (vis(el)) out.expressPayOnPdp.push((txt(el, 30) || el.tagName.toLowerCase()).toLowerCase());
out.expressPayOnPdp = [...new Set(out.expressPayOnPdp)];
// Third-party widgets by known hooks.
const hooks = { reviews: 'yotpo|jdgm|judgeme|okendo|stamped|loox|trustpilot|bazaarvoice|reviews\\.io|junip', bnpl: 'klarna|afterpay|sezzle|affirm|clearpay|zip-widget', sizing: 'kiwi|truefit|sizebay|fit-?finder|size-?guide|size-?chart', chat: 'gorgias|intercom|zendesk|tidio|drift|crisp', recommendations: 'rebuy|nosto|limespot|wiser|recom', bopis: 'pickup|store-availability|bopis' };
for (const [kind, re] of Object.entries(hooks)) {
  const rx = new RegExp(re, 'i');
  const hits = qa('[class], [id]').filter((el) => vis(el) && rx.test(el.className + ' ' + el.id)).slice(0, 3);
  if (hits.length) out.widgets.push(kind + ':' + [...new Set(hits.map((el) => (el.className + ' ' + el.id).match(rx)[0].toLowerCase()))].join('/') + (hits.some(aboveFold) ? ' (above fold)' : ''));
}
// Above-the-fold checklist.
out.aboveFold = { foldPx: window.innerHeight, price: !!(priceEl && aboveFold(priceEl)), cta: !!(cta && aboveFold(cta)), variantSelector: !!(vhost && aboveFold(vhost)), shippingOrReturnsCopy: Array.isArray(out.shippingReturnsCopy) && out.shippingReturnsCopy.some((c) => c.aboveFold && /ship|deliver|return/i.test(c.text)), reviewsWidget: out.widgets.some((w) => /^reviews.*above fold/.test(w)), expressPay: out.expressPayOnPdp.length > 0 };
out.selectors.title = titleEl ? rec(titleEl) : null;
return emit(out);
