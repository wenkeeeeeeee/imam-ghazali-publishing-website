// V1 · Gilded Edge home sections: premium editions, shelves, scholars, the edition chooser, counters.
import { site, products, byId, esc, money, waLink } from './app.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const url = (p) => `product.html?id=${encodeURIComponent(p.id)}`;
const price = (p) => (p.free ? 'Free' : money(p.sizes[0].price));

// ---- Premium editions: large covers on lit stands, gilt edge on one side ----
const premiumIds = ['maghazi-of-sayyiduna-muhammad-gold-premium', 'al-shamail-al-muhammadiyya', 'mukhtasar-sahih-al-bukhari-ibn-abi-jamrah', 'burdah-of-busiri-leather-pu-case', 'sirah-of-the-prophet'];
const cut = { 'maghazi-of-sayyiduna-muhammad-gold-premium': 'assets/hero/maghazi.webp', 'al-shamail-al-muhammadiyya': 'assets/hero/shamail.webp', 'mukhtasar-sahih-al-bukhari-ibn-abi-jamrah': 'assets/hero/bukhari.webp', 'burdah-of-busiri-leather-pu-case': 'assets/hero/burdah.webp', 'sirah-of-the-prophet': 'assets/hero/sirah.webp' };
const notes = {
  'maghazi-of-sayyiduna-muhammad-gold-premium': 'Gold-illuminated hardback · the earliest Sīrah known',
  'al-shamail-al-muhammadiyya': 'Hardback · Arabic beside English · December 2026 batch',
  'mukhtasar-sahih-al-bukhari-ibn-abi-jamrah': 'In English for the first time in history',
  'burdah-of-busiri-leather-pu-case': 'Leather PU case · the poem of the cloak',
  'sirah-of-the-prophet': 'Dr Yasir Qadhi · a contemporary analysis',
};
const ed = document.querySelector('[data-editions]');
if (ed) ed.innerHTML = premiumIds.map((id, i) => {
  const p = byId[id]; if (!p) return '';
  return `<li class="ed" style="--i:${i}">
    <a class="ed-stage" href="${url(p)}" aria-label="${esc(p.name)}"><img src="${cut[id]}" alt="" loading="lazy"></a>
    <div class="ed-copy">
      <h3><a href="${url(p)}">${esc(p.name.replace(/\s*\((Gold Premium|Leather PU Case|Ibn Abi Jamrah)\)/, ''))}</a></h3>
      <p class="ed-note">${esc(notes[id])}</p>
      <p class="ed-price">${price(p)}${p.preorder || /pre-order/i.test(p.sizes[0].label) ? ' <span>pre-order</span>' : ''}</p>
      <button class="btn-add" type="button" data-add-to-cart data-id="${esc(p.id)}" data-size="${esc(p.sizes[0].label)}">Add to book bag</button>
    </div>
  </li>`;
}).join('');

// ---- Subjects: an index of shelves with counts; hovering lifts a cover ----
const subjCover = {};
products.forEach((p) => { if (!subjCover[p.category] && !p.free) subjCover[p.category] = p.image; });
const counts = {};
products.forEach((p) => { if (p.language !== 'Bahasa Melayu' && !p.free) counts[p.category] = (counts[p.category] || 0) + 1; });
const sl = document.querySelector('[data-subjects]');
const peek = document.querySelector('[data-sub-peek]');
if (sl) {
  sl.innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<li><a href="shop.html?cat=${encodeURIComponent(c)}" data-cover="${esc(subjCover[c])}"><span class="sub-name">${esc(c)}</span><span class="sub-n">${n} titles</span></a></li>`).join('');
  sl.addEventListener('pointerover', (e) => {
    const a = e.target.closest('[data-cover]'); if (!a || !peek || peek.dataset.src === a.dataset.cover) return;
    peek.dataset.src = a.dataset.cover; peek.classList.remove('is-in'); void peek.offsetWidth; peek.src = a.dataset.cover; peek.classList.add('is-in');
  });
}
const bm = document.querySelector('[data-bm]');
if (bm) bm.innerHTML = products.filter((p) => p.language === 'Bahasa Melayu').sort((a, b) => b.sizes[0].price - a.sizes[0].price).map((p, i) => `<li style="--i:${i}"><a href="${url(p)}"><img src="${esc(p.image)}" alt="" loading="lazy" width="300" height="300"><b lang="ms">${esc(p.name)}</b><span>${price(p)}</span></a></li>`).join('');
const fr = document.querySelector('[data-free]');
if (fr) fr.innerHTML = products.filter((p) => p.free).slice(0, 5).map((p, i) => `<li style="--i:${i}"><a href="${url(p)}" aria-label="${esc(p.name)}"><img src="${esc(p.image)}" alt="" loading="lazy" width="300" height="300"></a></li>`).join('');

// ---- Scholars: choose a name, its book comes forward ----
const sch = document.querySelector('[data-sch]');
if (sch) {
  const img = document.querySelector('[data-sch-img]'), cap = document.querySelector('[data-sch-cap]'), link = document.querySelector('[data-sch-link]');
  const show = (li) => {
    const p = byId[li.dataset.book]; if (!p) return;
    sch.querySelectorAll('li').forEach((x) => x.classList.toggle('is-on', x === li));
    img.classList.remove('is-in'); void img.offsetWidth;
    img.src = p.image; img.classList.add('is-in');
    cap.innerHTML = `${esc(p.name)} · <b>${price(p)}</b>`;
    link.href = url(p);
  };
  sch.addEventListener('pointerover', (e) => { const li = e.target.closest('li'); if (li) show(li); });
  sch.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) show(li); });
  sch.addEventListener('focusin', (e) => { const li = e.target.closest('li'); if (li) show(li); });
  show(sch.querySelector('li'));
}

// ---- Choose your edition: pull a spine, compare its editions, add or ask ----
const sets = [
  { t: 'The Maghāzī of Sayyidunā Muhammad ﷺ', s: 'Maghāzī', ids: ['maghazi-of-sayyiduna-muhammad-paperback-ebook', 'maghazi-of-sayyiduna-muhammad-gold-premium'], c: '#1d1d1b' },
  { t: 'Morning & Evening Invocations', s: 'Morning & Evening', ids: ['morning-evening-invocations-and-the-ten-sevens-before-sunris', 'morning-evening-invocations-and-the-ten-sevens-before-sunris-2'], c: '#0f5b56' },
  { t: 'Introduction to Islamic Creed', s: 'Islamic Creed', ids: ['introduction-to-islamic-creed-bajuris-epistle', 'introduction-to-islamic-creed-ebook'], c: '#5b1f22' },
  { t: 'The Virtues of al-Sham & Damascus', s: 'Virtues of al-Sham', ids: ['virtues-of-al-sham-damascus-paperback', 'virtues-of-al-sham-damascus-ebook'], c: '#6b4f22' },
];
const spines = document.querySelector('[data-ch-spines]');
const stage = document.querySelector('[data-ch-stage]');
const kind = (p) => (p.free ? 'Free ebook' : /gold/i.test(p.name) ? 'Gold Premium hardback' : p.sizes[0].label);
const blurb = (p) => (p.free ? 'Read on any phone. Download from imamghazali.my.' : /gold/i.test(p.name) ? 'Gold-illuminated edges, hardback. A gift to keep.' : /\+ ?ebook/i.test(p.sizes[0].label) ? 'The paperback, with the ebook included.' : 'The printed paperback, shipped in Malaysia.');
function renderSet(i) {
  const set = sets[i];
  spines.querySelectorAll('[role=tab]').forEach((b, j) => { b.setAttribute('aria-selected', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
  const eds = set.ids.map((id) => byId[id]).filter(Boolean);
  stage.innerHTML = `<h3 class="ch-title">${esc(set.t)}</h3><div class="ch-eds">${eds.map((p, j) => `
    <article class="ch-ed${j === eds.length - 1 && !p.free ? ' is-gold' : ''}" style="--j:${j}">
      <a class="ch-cover" href="${url(p)}"><img src="${esc(p.image)}" alt="${esc(p.name)}" width="300" height="300" loading="lazy"></a>
      <p class="ch-kind">${esc(kind(p))}</p>
      <p class="ch-price"><b data-price="${p.free ? 0 : p.sizes[0].price}">${price(p)}</b></p>
      <p class="ch-blurb">${esc(blurb(p))}</p>
      ${p.free
        ? `<a class="btn-add" href="${esc(p.shopUrl)}" target="_blank" rel="noopener">Get the free ebook</a>`
        : `<button class="btn-add" type="button" data-add-to-cart data-id="${esc(p.id)}" data-size="${esc(p.sizes[0].label)}">Add to book bag</button>`}
      <a class="ch-wa" href="${waLink(`Salam ${site.brand}, I'd like the ${kind(p)} of ${set.t}.`)}" target="_blank" rel="noopener">or order on WhatsApp</a>
    </article>`).join('')}</div>`;
  stage.classList.remove('is-in'); void stage.offsetWidth; stage.classList.add('is-in');
  if (!reduce) stage.querySelectorAll('[data-price]').forEach((b) => countTo(b, +b.dataset.price, 'RM', 700));
}
if (spines && stage) {
  spines.innerHTML = sets.map((s, i) => `<button type="button" role="tab" class="spine" style="--c:${s.c}" aria-selected="false" data-set="${i}"><span>${esc(s.s)}</span></button>`).join('');
  spines.addEventListener('click', (e) => { const b = e.target.closest('[data-set]'); if (b) renderSet(+b.dataset.set); });
  spines.addEventListener('keydown', (e) => {
    const cur = [...spines.children].findIndex((b) => b.getAttribute('aria-selected') === 'true');
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return; e.preventDefault(); const n = (cur + d + sets.length) % sets.length; renderSet(n); spines.children[n].focus();
  });
  renderSet(0);
}

// ---- Counters ----
function countTo(el, to, prefix = '', ms = 1600, from = 0) {
  if (!to) return;
  const t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / ms); const e = 1 - Math.pow(1 - k, 3); el.textContent = prefix + (k >= 1 ? to : Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return; io.unobserve(e.target);
  if (!reduce) countTo(e.target, +e.target.dataset.count, '', 1600, e.target.dataset.count > 1000 ? 1957 : 0);
}), { threshold: 0.6 });
document.querySelectorAll('[data-count]').forEach((el) => io.observe(el));

// ---- The hardback crossing the join (scroll-driven turn) ----
const crosser = document.querySelector('[data-crosser]');
if (crosser && !reduce) {
  const upd = () => {
    const r = crosser.parentElement.getBoundingClientRect();
    const k = Math.max(-1, Math.min(1, (r.top - innerHeight / 2) / innerHeight));
    crosser.style.transform = `translate(-50%, calc(-50% + ${k * 90}px)) rotate(${-8 + k * 14}deg) rotateY(${k * 24}deg)`;
  };
  addEventListener('scroll', upd, { passive: true }); upd();
}

// Rolling counters keep the final number's width and equal-width digits, so nothing around them shifts as they roll.
document.querySelectorAll('[data-count]').forEach((el) => {
  if (!/^\d+$/.test(el.dataset.count || '')) return; // only numeric counters
  el.style.display = 'inline-block';
  el.style.fontVariantNumeric = 'tabular-nums lining-nums';
  el.style.minWidth = `${String(el.dataset.count || el.textContent).replace(/\D/g, '').length || 1}ch`;
});
