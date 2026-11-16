// Inner pages: the shelf of covers under each page title, the product's flat cover, and drawn dropdowns.
import { products, byId, esc } from './app.js';
import { PREMIUM, FREE, LOVED } from './places.js';
await import('./pages.js');

const page = document.body.dataset.page;
const prod = byId[new URLSearchParams(location.search).get('id')] || products[0];

// A shelf of covers and spines that fills in, book by book.
document.querySelectorAll('[data-hero-shelf]').forEach((el) => {
  const kind = el.dataset.heroShelf;
  const pick = {
    all: () => products.filter((p, i) => i % 5 === 0 && !p.free),
    free: () => FREE,
    premium: () => PREMIUM,
    loved: () => [...PREMIUM, ...LOVED],
    event: () => ['divine-reports-mishkat-al-anwar', 'healing-the-spiritually-sick-a-selection-of-noble-hadiths-as', 'mukhtasar-sahih-al-bukhari-ibn-abi-jamrah', 'al-shamail-al-muhammadiyya'].map((id) => byId[id]).filter(Boolean),
  }[kind];
  const list = (pick ? pick() : products.slice(0, 12)).slice(0, 18);
  const tones = ['#2F5D57', '#7A4B2A', '#1F3B5A', '#8C6B2F', '#13958F', '#5B2F3A', '#C9B79C', '#10302E'];
  let html = '', i = 0;
  list.forEach((p, n) => {
    html += `<a href="product.html?id=${encodeURIComponent(p.id)}" style="--i:${i++}" tabindex="-1"><img src="assets/covers-s/${esc(p.id)}.webp" alt="" width="256" height="384" loading="lazy"></a>`;
    const spines = 2 + (n % 3);
    for (let k = 0; k < spines; k++) { const h = 62 + ((n * 7 + k * 13) % 30); html += `<span class="is-spine" style="--i:${i++};--w:${12 + ((n + k) % 3) * 5}px;--h:${h}%;--c:${tones[(n + k * 3) % tones.length]}"></span>`; }
  });
  el.innerHTML = html;
});

if (page === 'product') {
  const c = document.querySelector('[data-p-cover]');
  if (c) { c.src = `assets/covers/${prod.id}.webp`; c.alt = `${prod.name}, front cover`; }
  document.title = `${prod.name} | IGP's bookstore`;
}

// Drawn dropdowns: the native select stays (hidden) as the source of truth.
function enhance(sel) {
  if (sel.closest('.dd')) return;
  const wrap = document.createElement('div'); wrap.className = 'dd';
  sel.parentNode.insertBefore(wrap, sel); wrap.append(sel);
  sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
  const lab = sel.closest('label'); const name = lab ? lab.textContent.trim().split('\n')[0] : '';
  const list = document.createElement('ul'); list.className = 'dd-list'; list.setAttribute('role', 'listbox'); if (name) list.setAttribute('aria-label', name);
  wrap.append(btn, list);
  let active = 0;
  const build = () => {
    list.innerHTML = [...sel.options].map((o, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel.selectedIndex}">${esc(o.textContent)}</li>`).join('');
    btn.innerHTML = `<span>${esc(sel.options[sel.selectedIndex]?.textContent || '')}</span>`;
  };
  const open = (v) => { wrap.classList.toggle('is-open', v); btn.setAttribute('aria-expanded', String(v)); active = sel.selectedIndex; mark(); };
  const mark = () => list.querySelectorAll('li').forEach((li, i) => li.classList.toggle('is-active', i === active));
  const choose = (i) => { sel.selectedIndex = i; build(); open(false); ['input', 'change'].forEach((t) => sel.dispatchEvent(new Event(t, { bubbles: true }))); btn.focus(); };
  btn.addEventListener('click', (e) => { e.preventDefault(); open(!wrap.classList.contains('is-open')); });
  list.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) choose(+li.dataset.i); });
  btn.addEventListener('keydown', (e) => {
    const n = sel.options.length, isOpen = wrap.classList.contains('is-open');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!isOpen) open(true); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; mark(); }
    else if ((e.key === 'Enter' || e.key === ' ') && isOpen) { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') open(false);
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) open(false); });
  sel.addEventListener('change', build);
  new MutationObserver(build).observe(sel, { childList: true });
  build();
}
document.querySelectorAll('main select').forEach(enhance);
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-quote-preset]')) setTimeout(() => document.querySelectorAll('.dd select').forEach((s) => s.dispatchEvent(new Event('change'))), 0);
});
