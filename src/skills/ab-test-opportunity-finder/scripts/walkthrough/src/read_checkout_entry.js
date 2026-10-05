// STAGE read_checkout_entry — OBSERVATION ONLY of the first checkout step: guest vs
// account gate, express pay, how many fields, which steps. Enters nothing, clicks
// nothing. If the step shows nothing without data entry, say so and rely on the funnel.
const out = { url: location.origin + location.pathname, reached: false, gate: null, expressPay: [], steps: [], fieldCount: null, fieldsAboveFold: null, fieldLabels: [], shippingOptionsVisible: [], notes: [] };
out.reached = /checkout|\/checkouts?\//i.test(location.href) || !!qa('h1, h2').find((el) => vis(el) && /checkout|contact|shipping|payment|information/i.test(txt(el, 40)));
if (!out.reached) { out.notes.push('this does not look like a checkout step (still on ' + location.pathname + ')'); return emit(out); }
const main = q('main') || document.body;
const lines = (main.innerText || '').split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 2 && l.length < 200);
const gates = [];
for (const [k, re] of [['loginPrompt', /(log ?in|sign ?in)\b/i], ['guestOption', /continue as guest|guest checkout|checkout as guest/i], ['createAccount', /create (an )?account|sign ?up/i], ['emailFirst', /^(email|e-mail)/i]]) { const line = lines.find((l) => re.test(l)); if (line) gates.push(k + ': "' + line.slice(0, 80) + '"'); }
const pwd = qa('input[type="password"]').some(vis);
out.gate = { accountRequired: pwd && !gates.some((g) => /guestOption/.test(g)), signals: gates, passwordFieldVisible: pwd };
const payEls = qa('shopify-payment-button, ' + cx('dynamic-checkout,express,wallet,paypal,shop-pay,apple-pay,google-pay,amazon-pay') + ', iframe[title*="PayPal" i], button[aria-label*="pay" i]').filter(vis);
for (const el of payEls.filter((e) => !payEls.some((o) => o !== e && e.contains(o)))) out.expressPay.push((txt(el, 30) || el.getAttribute('title') || el.getAttribute('aria-label') || el.tagName.toLowerCase()).toLowerCase());
out.expressPay = [...new Set(out.expressPay)].slice(0, 6);
out.steps = [...new Set(qa('nav li, ' + cx('breadcrumb') + ' li, ' + cx('step') + ', h2', main).filter(vis).map((el) => txt(el, 30)).filter((t) => /cart|information|contact|shipping|delivery|payment|review|details/i.test(t)))].slice(0, 6);
const fields = qa('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]), select, textarea', main).filter(vis);
out.fieldCount = fields.length; out.fieldsAboveFold = fields.filter(aboveFold).length;
out.fieldLabels = [...new Set(fields.map((f) => f.getAttribute('placeholder') || f.getAttribute('aria-label') || f.name || f.id).filter(Boolean))].slice(0, 12);
for (const el of qa(cx('shipping-method,delivery') + ', [role="radiogroup"], fieldset', main)) if (vis(el) && /free|\$|€|£|\d+ days?/i.test(txt(el, 300))) out.shippingOptionsVisible.push(txt(el, 140));
out.shippingOptionsVisible = out.shippingOptionsVisible.slice(0, 3);
if (!fields.length && !gates.length) out.notes.push('step shows nothing without data entry; rely on funnel numbers');
return emit(out);
