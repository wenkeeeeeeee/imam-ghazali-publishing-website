// The lamp on every page: the flame is the cursor, its light uncovers each block, the header follows the
// section tone, and a page change dims the light and relights it on the next page.
const html = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const head = document.querySelector('[data-head]');

// Header tone: light over daylight sections, dark over night ones.
const toned = [...document.querySelectorAll('[data-tone]')];
function setTone() {
  const y = (head?.offsetHeight || 70) - 1;
  let tone = 'night';
  for (const el of toned) { const r = el.getBoundingClientRect(); if (r.top <= y && r.bottom > y) { tone = el.dataset.tone; break; } }
  head?.classList.toggle('is-day', tone === 'day');
  head?.classList.toggle('is-solid', scrollY > 40);
  requestAnimationFrame(setTone);
}
if (head) requestAnimationFrame(setTone);

// The light uncovers each block as it arrives.
const lit = document.querySelectorAll('[data-lit]');
if (reduce || !('IntersectionObserver' in window)) lit.forEach((el) => el.classList.add('is-lit', 'is-done'));
else {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-lit');
    setTimeout(() => e.target.classList.add('is-done'), 1700);
    io.unobserve(e.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  lit.forEach((el) => io.observe(el));
  setTimeout(() => lit.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-lit'); }), 60);
}

// Real numbers count up when seen.
document.querySelectorAll('[data-count]').forEach((el) => {
  const to = +el.dataset.count;
  if (reduce || to > 1000) return;
  el.textContent = '0';
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return; o.disconnect();
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 1600); el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, { threshold: 0.6 }).observe(el);
});

// The flame is the cursor (desktop). The hero and the lamp shelf carry their own.
if (fine && !reduce) {
  const c = document.createElement('div');
  c.className = 'cursor-flame';
  c.innerHTML = '<span class="cursor-halo"></span><svg viewBox="0 0 68.5 102.6"><use href="#flame-shape"/></svg>';
  document.body.append(c);
  html.classList.add('flame-cursor');
  let x = -100, y = -100, tx = -100, ty = -100, on = false;
  // Hide this flame only while the pointer is over a stage that draws its own lamp. Re-checked on scroll too,
  // so wheeling out of a stage without moving the mouse never leaves the page with no pointer.
  const OWN = '.gl-on [data-stage], .has-gl [data-shelf-stage]';
  const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea';
  const HOT = 'a[href], button, summary, label, select, [role="option"], [role="button"], [data-add-to-cart]';
  const check = (target) => {
    c.classList.toggle('is-off', !!(target?.closest?.(OWN) || target?.closest?.(TEXT)));
    c.classList.toggle('is-hot', !!target?.closest?.(HOT));
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    check(e.target);
    if (!on) { x = tx; y = ty; on = true; }
    c.classList.add('is-on');
  }, { passive: true });
  let queued = false;
  addEventListener('scroll', () => {
    if (!on || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; check(document.elementFromPoint(tx, ty)); });
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => c.classList.remove('is-on'));
  const t0 = performance.now();
  (function loop(now) {
    x += (tx - x) * 0.35; y += (ty - y) * 0.35;
    const t = (now - t0) / 1000;
    c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    c.firstElementChild.nextElementSibling.style.transform = `scale(${1 + 0.04 * Math.sin(t * 9.7)}, ${1 + 0.07 * Math.sin(t * 6.1)})`;
    requestAnimationFrame(loop);
  })(t0);
}

// Page change: the light dims, then relights on the next page.
const veil = document.querySelector('[data-veil]');
if (veil && !reduce) {
  let came = false;
  try { came = sessionStorage.getItem('v4-nav') === '1'; sessionStorage.removeItem('v4-nav'); } catch (e) { /* private */ }
  if (came) { veil.classList.add('is-in', 'is-now'); requestAnimationFrame(() => requestAnimationFrame(() => { veil.classList.remove('is-now'); veil.classList.remove('is-in'); })); }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    if (!/\.html$|\/$/.test(u.pathname)) return;
    e.preventDefault();
    try { sessionStorage.setItem('v4-nav', '1'); } catch (x) { /* private */ }
    veil.classList.add('is-in');
    setTimeout(() => { location.href = u.href; }, 420);
  });
  addEventListener('pageshow', (e) => { if (e.persisted) veil.classList.remove('is-in'); });
}

// Page heroes: the light pools where the flame is.
document.querySelectorAll('[data-ph]').forEach((ph) => {
  const light = ph.querySelector('.ph-light');
  ph.addEventListener('pointermove', (e) => { const r = ph.getBoundingClientRect(); light.style.setProperty('--mx', `${e.clientX - r.left}px`); light.style.setProperty('--my', `${e.clientY - r.top}px`); });
});
