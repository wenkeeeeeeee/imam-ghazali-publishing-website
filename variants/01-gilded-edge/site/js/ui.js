// V1 · Gilded Edge, every page: drawn dropdowns, reveals (covers tilt in, lines draw), page-turn wipe, FAQ.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Dropdowns drawn in the site's style; the native <select> stays as the source of truth ----
function enhance(sel) {
  if (sel.dataset.gs) return; sel.dataset.gs = '1';
  const wrap = document.createElement('div'); wrap.className = 'gs';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gs-btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
  const lab = sel.getAttribute('aria-label') || sel.closest('label')?.textContent.trim().split('\n')[0] || '';
  if (lab) btn.setAttribute('aria-label', lab);
  const list = document.createElement('ul'); list.className = 'gs-list'; list.setAttribute('role', 'listbox'); list.tabIndex = -1;
  sel.after(wrap); wrap.append(btn, list); sel.classList.add('gs-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
  const sync = () => {
    btn.innerHTML = `<span>${sel.options[sel.selectedIndex]?.text || ''}</span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5"/></svg>`;
    list.innerHTML = [...sel.options].map((o, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel.selectedIndex}">${o.text}</li>`).join('');
  };
  const open = (v) => { wrap.classList.toggle('is-open', v); btn.setAttribute('aria-expanded', String(v)); if (v) { document.querySelectorAll('.gs.is-open').forEach((w) => w !== wrap && w.querySelector('.gs-btn').click()); list.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' }); } };
  btn.addEventListener('click', () => open(!wrap.classList.contains('is-open')));
  list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (!li) return; sel.selectedIndex = +li.dataset.i; sel.dispatchEvent(new Event('change', { bubbles: true })); sel.dispatchEvent(new Event('input', { bubbles: true })); sync(); open(false); btn.focus(); });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = Math.max(0, Math.min(sel.options.length - 1, sel.selectedIndex + (e.key === 'ArrowDown' ? 1 : -1))); sel.selectedIndex = n; sel.dispatchEvent(new Event('change', { bubbles: true })); sel.dispatchEvent(new Event('input', { bubbles: true })); sync(); }
    if (e.key === 'Escape') open(false);
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) open(false); });
  new MutationObserver(sync).observe(sel, { childList: true });
  sel.addEventListener('change', sync);
  sync();
}
const enhanceAll = () => document.querySelectorAll('select:not([data-gs])').forEach(enhance);
enhanceAll(); setTimeout(enhanceAll, 400); setTimeout(enhanceAll, 1200);

// ---- Reveals: covers tilt in, gilt joins draw, headings print in light ----
const targets = '.edge-join, .sec-head, .ed, .shelf li, .free-fan li, .sch-grid, .ch-wrap, .classes, .trust, .faq-list details, .page-hero, .grid > *, .pdp, .event, .steps li, .names li, .stores > li, .cols-3 > li';
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
const watch = () => document.querySelectorAll(targets).forEach((el) => { if (!el.dataset.rv) { el.dataset.rv = '1'; reduce ? el.classList.add('is-in') : io.observe(el); } });
watch(); new MutationObserver(watch).observe(document.body, { childList: true, subtree: true });
// fail-safe: never leave content hidden
setTimeout(() => document.documentElement.classList.add('rv-safe'), 4000);

// ---- Page change: the light dims, a gilt page edge turns across, the next room opens ----
const turn = document.querySelector('.turn');
document.documentElement.classList.add('is-arriving');
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('is-arriving')));
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || !turn || reduce || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || !/\.html$|\/$/.test(u.pathname) || (u.pathname === location.pathname && u.hash)) return;
  e.preventDefault();
  document.documentElement.classList.add('is-leaving');
  setTimeout(() => { location.href = u.href; }, 520);
});
addEventListener('pageshow', (e) => { if (e.persisted) document.documentElement.classList.remove('is-leaving'); });

// ---- FAQ: one open at a time ----
document.querySelectorAll('.faq-list, .faq').forEach((g) => g.addEventListener('toggle', (e) => {
  if (e.target.open) g.querySelectorAll('details[open]').forEach((d) => d !== e.target && (d.open = false));
}, true));
