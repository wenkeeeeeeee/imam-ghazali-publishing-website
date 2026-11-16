// V3 site-wide motion and controls: header, drawn dropdowns, fanned decks of covers, the class card, hanging ribbons,
// 3D books across section joins, counters, the product book and page changes.
import { products, byId, events, esc, money, waLink, site } from './app.js';
import './pages.js';
import { book3d, hasCover } from './book.js';
import { gsap, ST, reduce } from './scroll.js';

const root = document.documentElement;
const head = document.querySelector('[data-head]');
const page = document.body.dataset.page;
const link = (p) => `product.html?id=${encodeURIComponent(p.id)}`;

// ---------- Header ----------
const onScroll = () => {
  head.classList.toggle('is-scrolled', scrollY > 4);
  if (page !== 'home') head.classList.toggle('show-subjects', scrollY > 140);
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();
if (innerWidth < 520) document.querySelectorAll('.find input').forEach((i) => { i.placeholder = 'Search titles'; });
root.classList.add('is-open');

// ---------- Dropdowns drawn in the site's style (the real <select> stays for forms and filters) ----------
function enhanceSelect(sel) {
  if (sel.dataset.dd) return; sel.dataset.dd = '1';
  const wrap = document.createElement('div'); wrap.className = 'dd';
  sel.parentNode.insertBefore(wrap, sel); wrap.append(sel); sel.classList.add('dd-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
  const list = document.createElement('ul'); list.className = 'dd-list'; list.setAttribute('role', 'listbox');
  wrap.append(btn, list);
  const sync = () => {
    const o = sel.options[sel.selectedIndex];
    btn.innerHTML = `<span>${esc(o ? o.text : '')}</span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 6 6.5l5-5"/></svg>`;
    list.innerHTML = [...sel.options].map((op, i) => `<li role="option" tabindex="-1" data-i="${i}" aria-selected="${i === sel.selectedIndex}">${esc(op.text)}</li>`).join('');
  };
  const close = () => { wrap.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
  const open = () => { document.querySelectorAll('.dd.is-open').forEach((d) => d !== wrap && d.classList.remove('is-open')); wrap.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); (list.querySelector('[aria-selected="true"]') || list.firstChild)?.focus(); };
  btn.addEventListener('click', () => (wrap.classList.contains('is-open') ? close() : open()));
  list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (!li) return; sel.selectedIndex = +li.dataset.i; sel.dispatchEvent(new Event('change', { bubbles: true })); sel.dispatchEvent(new Event('input', { bubbles: true })); sync(); close(); btn.focus(); });
  list.addEventListener('keydown', (e) => {
    const items = [...list.children], i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(items.length - 1, i + 1)]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(0, i - 1)]?.focus(); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.activeElement.click(); }
    if (e.key === 'Escape') { close(); btn.focus(); }
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
  sel.addEventListener('change', sync);
  new MutationObserver(sync).observe(sel, { childList: true });
  sync();
}
document.querySelectorAll('main select').forEach(enhanceSelect);

// ---------- Fanned decks of covers ----------
function deckIds(kind) {
  if (kind === 'bm') return products.filter((p) => p.language === 'Bahasa Melayu' && hasCover(p)).slice(0, 7);
  if (kind === 'free') return products.filter((p) => p.free && hasCover(p)).concat(['introduction-to-islamic-creed-bajuris-epistle'].map((id) => byId[id])).slice(0, 6);
  if (kind === 'shop') {
    const q = new URLSearchParams(location.search);
    const cat = q.get('cat'), lang = q.get('lang');
    let list = products.filter((p) => hasCover(p) && (!cat || p.category === cat) && (!lang || p.language === lang));
    if (!cat && !lang) list = products.filter((p) => p.featured && hasCover(p));
    return list.slice(0, 7);
  }
  return kind.split(',').map((id) => byId[id]).filter(Boolean);
}
function fan(deck, spread) {
  const cards = [...deck.children], n = cards.length, mid = (n - 1) / 2;
  const wide = deck.clientWidth, cw = cards[0]?.offsetWidth || 120;
  const step = Math.min(cw * 0.62, (wide - cw * 1.3) / Math.max(1, n - 1));
  cards.forEach((c, i) => {
    const o = i - mid;
    c.style.setProperty('--x', `${(o * step * spread).toFixed(1)}px`);
    c.style.setProperty('--r', `${(o * 7 * spread + (1 - spread) * (i % 2 ? 3 : -3)).toFixed(2)}deg`);
    c.style.setProperty('--y', `${(Math.abs(o) * Math.abs(o) * 5 * spread).toFixed(1)}px`);
  });
}
function renderDeck(deck) {
  const list = deckIds(deck.dataset.deck);
  const labelled = !deck.classList.contains('deck-hero');
  deck.innerHTML = list.map((p, i) => `<a class="dk" style="--i:${i}" href="${link(p)}"${labelled ? '' : ' tabindex="-1"'}>${book3d(p)}${labelled ? `<span class="dk-t">${esc(p.name)}<b>${p.free ? 'Free' : money(p.sizes[0].price)}</b></span>` : ''}</a>`).join('');
  fan(deck, reduce ? 1 : 0.05);
  if (reduce || !gsap) { fan(deck, 1); return; }
  const st = { s: 0.05 };
  const go = (to, d = 1.1) => gsap.to(st, { s: to, duration: d, ease: 'power3.out', onUpdate: () => fan(deck, st.s) });
  if (deck._st) deck._st.kill();
  deck._st = ST.create({ trigger: deck, start: 'top 85%', onEnter: () => go(1), onEnterBack: () => go(1), onLeaveBack: () => go(0.05, 0.5) });
  if (deck.getBoundingClientRect().top < innerHeight * 0.85) go(1, 1.3);
}
document.querySelectorAll('[data-deck]').forEach(renderDeck);
addEventListener('resize', () => document.querySelectorAll('[data-deck]').forEach((d) => fan(d, 1)));
// The bookstore's deck changes with the subject chip.
document.querySelector('[data-filter-cats]')?.addEventListener('click', () => setTimeout(() => { const d = document.querySelector('[data-deck="shop"]'); if (d) renderDeck(d); }, 0));

// ---------- The next class ----------
document.querySelectorAll('[data-class]').forEach((el) => {
  const e = events.find((x) => x.upcoming); if (!e) { el.hidden = true; return; }
  const b = byId[e.book];
  const d = new Date(e.date + 'T11:00:00+08:00');
  const days = Math.max(0, Math.ceil((d - new Date()) / 864e5));
  el.innerHTML = `<div class="cc-date"><b>${d.getDate()}</b><span>${d.toLocaleString('en-GB', { month: 'short' })}</span><i>${days ? `in ${days} day${days > 1 ? 's' : ''}` : 'today'}</i></div>
    <div class="cc-body"><p class="cc-kind">${esc(e.kind)} · Kuala Lumpur</p><h2 class="sec-h" id="class-h">${esc(e.title)}</h2>
      <p class="cc-sub">${esc(e.subtitle)} · taught by ${esc(e.teacher)}</p>
      <p class="cc-when">${esc(e.when)}<br>${esc(e.where)}</p>
      <ul class="cc-points">${e.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="cc-acts"><a class="btn" href="${esc(e.register)}" target="_blank" rel="noopener">Register on imamghazali.my</a>
      <a class="link-arrow" href="${waLink(`Salam ${site.brand}, I'd like to save a seat at ${e.title} (${e.when}). Name: `)}" target="_blank" rel="noopener">Save a seat on WhatsApp <span aria-hidden="true">→</span></a></div></div>
    ${b ? `<a class="cc-book" href="${link(b)}">${book3d(b)}<span>Read along: ${esc(b.name)} · ${money(b.sizes[0].price)}</span></a>` : ''}`;
});

// ---------- Hanging bookmark ribbons on section headings ----------
document.querySelectorAll('.sec-h').forEach((h) => {
  if (h.closest('.gather') || h.closest('.page-hero')) return;
  h.insertAdjacentHTML('afterbegin', '<span class="hang" aria-hidden="true"><svg viewBox="0 0 20 92"><path class="hang-l" d="M10 0v62"/><path class="hang-leaf" d="M10 58c6 3 8 13 0 26-8-13-6-23 0-26z"/></svg></span>');
});

// ---------- Reveals (lines wipe in at full brightness, never half-faded) ----------
const revealEls = document.querySelectorAll('.sec-h, .sec-line, .card, .sh-item, .spread, .firsts li, .counts > div, .names p, .faq details, .made-steps li, .helps li, .stock-list li, .class-card, .review, .past li, .about-img, .pdp-text');
revealEls.forEach((el) => el.classList.add('rv'));
if (reduce || !('IntersectionObserver' in window)) revealEls.forEach((el) => el.classList.add('is-in'));
else {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  revealEls.forEach((el) => io.observe(el));
  const mo = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.matches?.('.card')) { n.classList.add('rv'); io.observe(n); } })));
  document.querySelectorAll('[data-shop-grid], [data-products], [data-p-others]').forEach((g) => mo.observe(g, { childList: true }));
  setTimeout(() => document.querySelectorAll('.card.rv').forEach((c) => { if (c.getBoundingClientRect().top < innerHeight) c.classList.add('is-in'); }), 400);
}

// ---------- Counters ----------
document.querySelectorAll('[data-count]').forEach((el) => {
  const n = +el.dataset.count; if (reduce || !gsap) return;
  const from = n > 1000 ? 1990 : 0, o = { v: from };
  ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.fromTo(o, { v: from }, { v: n, duration: 1.8, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) });
});

// ---------- 3D books crossing the section joins ----------
if (!reduce && gsap) {
  const picks = products.filter((p) => hasCover(p) && p.featured);
  document.querySelectorAll('.after-hero > .spreads, .after-hero > .classes, .after-hero > .faq-sec').forEach((sec, i) => {
    const p = picks[(i * 3 + 1) % picks.length];
    const j = document.createElement('span'); j.className = `join ${i % 2 ? 'is-r' : 'is-l'}`; j.setAttribute('aria-hidden', 'true');
    j.innerHTML = book3d(p);
    sec.style.position = sec.style.position || 'relative';
    sec.prepend(j);
    gsap.fromTo(j, { y: 40, rotateY: i % 2 ? 40 : -40, rotateZ: i % 2 ? 14 : -12 }, { y: -40, rotateY: i % 2 ? -20 : 25, rotateZ: i % 2 ? -6 : 8, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top top', scrub: 0.6 } });
  });
}

// ---------- Shelves slide in ----------
if (!reduce && gsap) {
  document.querySelectorAll('[data-month-rail], [data-premium-rail], .shelf-grid').forEach((rail) => {
    ST.create({ trigger: rail, start: 'top 88%', once: true, onEnter: () => rail.classList.add('is-slid') });
  });
} else document.querySelectorAll('[data-month-rail], [data-premium-rail], .shelf-grid').forEach((r) => r.classList.add('is-slid'));

// ---------- Product page: the book turns toward the cursor ----------
if (page === 'product') {
  const p = byId[new URLSearchParams(location.search).get('id')] || products[0];
  const el = document.querySelector('[data-pdp-book]');
  el.innerHTML = book3d(p, { lazy: false, cls: 'is-big' });
  const b = el.firstElementChild; b.style.viewTransitionName = 'flybook';
  if (!reduce) {
    let rx = 0, ry = -22, tx = 0, ty = -22;
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); ty = -22 + ((e.clientX - r.left) / r.width - 0.5) * 34; tx = -((e.clientY - r.top) / r.height - 0.5) * 14; });
    el.addEventListener('pointerleave', () => { tx = 0; ty = -22; });
    const loop = (t) => { rx += (tx - rx) * 0.1; ry += (ty - ry) * 0.1; b.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${(ry + Math.sin(t / 1600) * 3).toFixed(2)}deg)`; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}

// ---------- Page change: the clicked book flies to the next page's shelf ----------
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname === location.pathname) return;
  document.querySelectorAll('[style*="flybook"]').forEach((x) => { x.style.viewTransitionName = ''; });
  const host = a.closest('[data-card], .dk, .hb, .sh-item, .cc-book, .review-book') || a;
  const b = host.querySelector('.b3d');
  if (b && url.pathname.endsWith('product.html')) b.style.viewTransitionName = 'flybook';
}, true);

// Pins are created by several modules: measure again once everything above them has rendered.
if (ST) { setTimeout(() => ST.refresh(), 60); addEventListener('load', () => ST.refresh()); }
