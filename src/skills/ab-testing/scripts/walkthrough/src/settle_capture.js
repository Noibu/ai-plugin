// STAGE settle_capture — make a busy page capturable. Run in the preview batch after
// dismiss_consent.js and before the scroll item. Changes nothing the shopper sees in the
// finished page: it reveals a page an anti-flicker snippet is still hiding, finishes or
// pauses motion (CSS animations, transitions, videos, carousel autoplay) so a frame can
// settle, and reports whether the tab is in the background, which no script can fix.
const out = { visibility: document.visibilityState, hasFocus: document.hasFocus() };
if (document.visibilityState !== 'visible') { out.tabHidden = true; return emit(out); }
// Anti-flicker: testing tools hide the page until their experiments load.
const hideRe = /opacity\s*:\s*0(?![.\d])|visibility\s*:\s*hidden/i;
const idRe = /^_vwo|vwo|async-hide|optimizely|abtasty|kameleoon|convert|anti-?flicker/i;
const hiders = [...document.querySelectorAll('style')].filter((s) => idRe.test(s.id || '') && hideRe.test(s.textContent || ''));
hiders.forEach((s) => s.remove());
out.antiFlickerRemoved = hiders.map((s) => s.id);
document.documentElement.classList.remove('async-hide');
out.unhid = [];
for (const el of [document.documentElement, document.body]) {
  if (!el) continue;
  const cs = getComputedStyle(el);
  if (cs.opacity === '0' || cs.visibility === 'hidden') {
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('visibility', 'visible', 'important');
    out.unhid.push(el.tagName.toLowerCase());
  }
}
// Motion: finish finite animations (so nothing freezes half-faded), pause infinite ones,
// stop transitions so the injection's change lands in one frame.
let finished = 0, paused = 0;
for (const a of (document.getAnimations ? document.getAnimations() : [])) {
  try { a.finish(); finished++; } catch (e) { try { a.pause(); paused++; } catch (e2) {} }
}
const freeze = document.createElement('style');
freeze.id = 'noibu-preview-settle';
freeze.textContent = '*,*::before,*::after{transition:none!important;scroll-behavior:auto!important}';
document.head.appendChild(freeze);
out.animations = { finished, paused };
let videos = 0;
document.querySelectorAll('video').forEach((v) => { try { if (!v.paused) { v.pause(); videos++; } } catch (e) {} });
out.videosPaused = videos;
let carousels = 0;
document.querySelectorAll('.swiper, .swiper-container').forEach((el) => { try { if (el.swiper && el.swiper.autoplay) { el.swiper.autoplay.stop(); carousels++; } } catch (e) {} });
try { if (window.jQuery) window.jQuery('.slick-initialized').each(function () { try { window.jQuery(this).slick('slickPause'); carousels++; } catch (e) {} }); } catch (e) {}
document.querySelectorAll('slideshow-component, slider-component, [data-autoplay]').forEach((el) => { try { if (typeof el.pause === 'function') { el.pause(); carousels++; } } catch (e) {} });
document.querySelectorAll('.flickity-enabled').forEach((el) => { try { const f = window.Flickity && window.Flickity.data(el); if (f) { f.stopPlayer(); carousels++; } } catch (e) {} });
out.carouselsStopped = carousels;
await sleep(300);
return emit(out);
