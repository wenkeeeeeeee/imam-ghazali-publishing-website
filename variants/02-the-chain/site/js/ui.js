// V2 · The Chain: shared UI on every page. Century bar on inner pages, page change (the bar segment advances),
// styled dropdowns in place of the browser's, section beads that light as you arrive.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const body = document.body;

// ---------- Century bar on inner pages: fills to this page's segment, from the last page's ----------
const bar = document.querySelector('[data-cbar]');
const segs = bar ? [...bar.children] : [];
const KEY = 'igp-chain-seg';
if (bar && body.classList.contains('inner')) {
  const to = +body.dataset.seg || 0;
  let from = to; try { from = +(sessionStorage.getItem(KEY) ?? to); } catch (e) {}
  const set = (n) => segs.forEach((li, i) => {
    li.querySelector('i').style.setProperty('--f', i < Math.floor(n) ? 1 : i === Math.floor(n) ? Math.max(0.35, n - Math.floor(n)) : 0);
    li.classList.toggle('is-on', i === Math.round(n)); li.classList.toggle('is-done', i < Math.round(n));
  });
  set(from);
  if (!reduce && from !== to) {
    const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3); set(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  } else set(to);
  try { sessionStorage.setItem(KEY, to); } catch (e) {}
  segs.forEach((li) => li.querySelector('button').addEventListener('click', () => { location.href = 'index.html#centuries'; }));
}
if (body.dataset.page === 'home') { try { sessionStorage.setItem(KEY, 0); } catch (e) {} }

// ---------- Page change: a gold line sweeps across under the bar, then the page goes ----------
const wipe = document.createElement('div');
wipe.className = 'pg-wipe'; wipe.setAttribute('aria-hidden', 'true');
body.append(wipe);
requestAnimationFrame(() => root.classList.add('pg-ready'));
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || reduce || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname) || (url.pathname === location.pathname && url.hash)) return;
  e.preventDefault();
  root.classList.add('pg-leave');
  setTimeout(() => { location.href = url.href; }, 420);
});
addEventListener('pageshow', (e) => { if (e.persisted) root.classList.remove('pg-leave'); });

// ---------- Section beads light as each section arrives ----------
const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { threshold: 0.18 });
document.querySelectorAll('.sec, .page-hero, main > section, .ft').forEach((el) => io.observe(el));

// ---------- Dropdowns drawn in the site's style (the <select> stays for the page's logic) ----------
function enhance(sel) {
  if (sel.dataset.enh) return; sel.dataset.enh = '1';
  const wrap = document.createElement('div'); wrap.className = 'dd';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-b';
  btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
  const lab = sel.closest('label'); const name = lab ? lab.textContent.trim().replace(/\s+/g, ' ').split('  ')[0] : '';
  if (sel.getAttribute('aria-label') || name) btn.setAttribute('aria-label', sel.getAttribute('aria-label') || name);
  const list = document.createElement('ul'); list.className = 'dd-l'; list.setAttribute('role', 'listbox'); list.tabIndex = -1; list.hidden = true;
  sel.after(wrap); wrap.append(btn, list); sel.classList.add('dd-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
  let act = 0;
  const opts = () => [...sel.options];
  const render = sel._r = () => {
    const o = sel.options[sel.selectedIndex];
    btn.innerHTML = `<span>${o ? o.textContent : ''}</span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 6 6.5 11 1.5"/></svg>`;
    list.innerHTML = opts().map((op, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel.selectedIndex}" class="${i === act ? 'is-act' : ''}">${op.textContent}</li>`).join('');
  };
  const open = (v) => {
    list.hidden = !v; btn.setAttribute('aria-expanded', String(v)); wrap.classList.toggle('is-open', v);
    if (v) { act = Math.max(0, sel.selectedIndex); render(); list.focus(); }
  };
  const choose = (i) => { sel.selectedIndex = i; sel.dispatchEvent(new Event('change', { bubbles: true })); sel.dispatchEvent(new Event('input', { bubbles: true })); render(); open(false); btn.focus(); };
  btn.addEventListener('click', () => open(list.hidden));
  list.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) choose(+li.dataset.i); });
  list.addEventListener('keydown', (e) => {
    const n = opts().length;
    if (e.key === 'ArrowDown') { act = Math.min(n - 1, act + 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { act = Math.max(0, act - 1); render(); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') { choose(act); e.preventDefault(); }
    else if (e.key === 'Escape') { open(false); btn.focus(); }
    else if (e.key.length === 1) { const i = opts().findIndex((o) => o.textContent.toLowerCase().startsWith(e.key.toLowerCase())); if (i >= 0) { act = i; render(); } }
    list.querySelector('.is-act')?.scrollIntoView({ block: 'nearest' });
  });
  document.addEventListener('click', (e) => { if (!e.composedPath().includes(wrap)) open(false); });
  new MutationObserver(render).observe(sel, { childList: true, subtree: true });
  sel.addEventListener('change', render);
  render();
}
const enhanceAll = () => document.querySelectorAll('main select').forEach((s) => { enhance(s); s._r && s._r(); });
enhanceAll();
setTimeout(enhanceAll, 400);
addEventListener('load', enhanceAll);

// ---------- Inner page heroes: the page's word in Arabic and a fan of real covers ----------
const PH = {
  shop: ['المكتبة', ['maghazi-of-sayyiduna-muhammad-gold-premium', 'al-shamail-al-muhammadiyya', 'burdah-of-busiri-leather-pu-case', '40-hadith-of-imam-al-nawawi', 'who-is-the-prophet-muhammad']],
  ebooks: ['هدية', null],
  classes: ['مجالس العلم', ['divine-reports-mishkat-al-anwar']],
  about: ['إحياء', ['maghazi-of-sayyiduna-muhammad-gold-premium', 'mukhtasar-sahih-al-bukhari-ibn-abi-jamrah', 'al-shamail-al-muhammadiyya']],
  contact: ['تواصل', ['al-shamail-al-muhammadiyya']],
};
const ph = document.querySelector('.page-hero');
const cfg = PH[body.dataset.page];
if (ph && cfg) {
  import('./app.js').then(({ products, byId }) => {
    const ids = cfg[1] || products.filter((p) => p.free).slice(0, 5).map((p) => p.id);
    const list = ids.map((id) => byId[id]).filter(Boolean);
    const deco = document.createElement('div');
    deco.className = 'ph-deco'; deco.setAttribute('aria-hidden', 'true');
    deco.innerHTML = `<span class="ph-ar" lang="ar" dir="rtl">${cfg[0]}</span><span class="ph-fan">${list.map((p, i) => `<img src="${p.image}" alt="" width="240" height="240" style="--i:${i};--n:${list.length}">`).join('')}</span>`;
    ph.append(deco);
    requestAnimationFrame(() => requestAnimationFrame(() => deco.classList.add('is-in')));
  });
}
