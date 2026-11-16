// V2 · The Chain: home sections below the hero (subjects, century bar signature, people, best sellers,
// reading path, classes, since 2007).
import { site, products, events, byId, esc, money, waLink } from './app.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const spines = await fetch('data/spines.json').then((r) => r.json()).catch(() => ({}));
const price = (p) => (p.free ? 'Free ebook' : money(p.sizes[0].price));

// ---------- Counters that roll when seen ----------
function roll(el, to, dur = 1400, from = 0) {
  if (reduce) { el.textContent = to; return; }
  // Lock the box to the final number's width so the layout around it never moves while it rolls.
  el.style.display = 'inline-block';
  el.style.minWidth = `${String(Math.max(Math.abs(to), Math.abs(from))).length}ch`;
  const t0 = performance.now();
  let last = '';
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    const v = String(Math.round(from + (to - from) * e));
    if (v !== last) { el.textContent = v; last = v; }
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const seen = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  seen.unobserve(e.target);
  e.target.classList.add('is-in');
  e.target.querySelectorAll('[data-roll]').forEach((el) => roll(el, +el.dataset.roll, 1400, +(el.dataset.from || 0)));
}), { threshold: 0.25 });

// ---------- What we publish ----------
const count = (fn) => products.filter(fn).length;
document.querySelectorAll('[data-count]').forEach((el) => {
  const k = el.dataset.count;
  const n = k === 'all' ? products.length : k === 'bm' ? count((p) => p.language === 'Bahasa Melayu') : k === 'free' ? count((p) => p.free) : count((p) => p.category === 'Family & Character');
  el.dataset.roll = n; el.textContent = n;
});
const SUBJ = [
  ['Sīrah & the Prophet ﷺ', 'His life, his beauty and his character ﷺ, from the earliest Sīrah in existence.'],
  ['Spirituality & Belief', 'Al-Ghazali, creed and the purification of the heart.'],
  ["Qur'an", 'Reflections and lessons, such as forty from Surah Yusuf.'],
  ['Life & Seasons', 'Ramadan, grief, invocations for morning and evening.'],
  ['Hadith', 'The 40 Hadith, and Sahih al-Bukhari in English for the first time.'],
  ['Salawat & Poetry', 'The Burdah of al-Busiri and prayers upon the Beloved ﷺ.'],
];
const subjEl = $('[data-subjects]');
if (subjEl) {
  subjEl.innerHTML = SUBJ.map(([cat, line]) => {
    const list = products.filter((p) => p.category === cat);
    const covers = list.filter((p) => p.image).slice(0, 3);
    const from = Math.min(...list.filter((p) => !p.free).map((p) => p.sizes[0].price));
    return `<li><a href="shop.html?cat=${encodeURIComponent(cat)}">
      <span class="subj-n" data-roll="${list.length}">${list.length}</span>
      <span class="subj-t"><span class="subj-name">${esc(cat)}</span><span class="subj-line">${esc(line)}</span><span class="subj-from">from ${money(from)}</span></span>
      <span class="subj-covers" aria-hidden="true">${covers.map((p) => `<img src="${esc(p.image)}" alt="" width="160" height="160" loading="lazy">`).join('')}</span>
    </a></li>`;
  }).join('');
}

// ---------- The people ----------
const PEOPLE = {
  classical: [
    ['موسى بن عقبة', 'Musa ibn ʿUqbah', 'd. 758 · Madinah', 'The Maghāzī'],
    ['الإمام الترمذي', 'Imam al-Tirmidhi', 'd. 892 · Tirmidh', "al-Shamā'il"],
    ['الإمام الغزالي', 'Imam al-Ghazali', 'd. 1111 · Tus', 'O Son! · Divine Wisdom'],
    ['القاضي عياض', 'Qadi ʿIyad', 'd. 1149 · Marrakesh', 'Gems from the Shifa'],
    ['الإمام النووي', 'Imam al-Nawawi', 'd. 1277 · Nawa', 'The 40 Hadith'],
    ['ابن أبي جمرة', 'Ibn Abi Jamrah', 'd. 1296 · Cairo', 'Mukhtasar Sahih al-Bukhari'],
    ['الإمام البوصيري', 'Imam al-Busiri', 'd. c.1296 · Alexandria', 'The Burdah'],
  ],
  today: [
    ['الحبيب عمر بن حفيظ', 'Habib Umar bin Hafiz', 'Tarim', 'Who is the Prophet Muhammad ﷺ?'],
    ['', 'Dr Yasir Qadhi', '', 'The Sīrah of the Prophet ﷺ'],
    ['', 'Shaykh Hamzah Abdul-Malik', '', '[client to confirm title]'],
    ['', "Shaykh Dr Thaika Shu'aib Alim", '', '[client to confirm title]'],
  ],
};
// Death years and places: to be checked against each book's introduction.
document.querySelectorAll('[data-people]').forEach((ul) => {
  ul.innerHTML = PEOPLE[ul.dataset.people].map(([ar, en, when, book]) => `<li>
    ${ar ? `<span class="ppl-ar" lang="ar" dir="rtl">${ar}</span>` : ''}
    <span class="ppl-en">${esc(en)}</span>
    <span class="ppl-meta">${when ? `${esc(when)} · ` : ''}${book.startsWith('[') ? `<span class="tbc">${esc(book)}</span>` : `<i>${esc(book)}</i>`}</span>
  </li>`).join('');
});

// ---------- Best sellers ----------
const bestEl = $('[data-best]');
if (bestEl) {
  const list = products.filter((p) => p.featured);
  bestEl.innerHTML = list.map((p) => {
    const tag = p.id === 'mukhtasar-sahih-al-bukhari-ibn-abi-jamrah' ? 'In English for the first time' : p.id.startsWith('maghazi') ? 'Earliest Sīrah in existence' : p.preorder ? 'Pre-order · December 2026 batch' : p.format === 'Premium edition' ? 'Premium edition' : '';
    return `<article class="bk">
      <a class="bk-img" href="product.html?id=${encodeURIComponent(p.id)}"><img src="${esc(p.image)}" alt="${esc(p.name)}" width="320" height="320" loading="lazy"></a>
      ${tag ? `<p class="bk-tag">${esc(tag)}</p>` : ''}
      <h3 class="bk-name"><a href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></h3>
      <p class="bk-meta">${esc(p.sizes[0].label)}</p>
      <div class="bk-buy"><b>${price(p)}</b><button class="bk-add" type="button" data-add-to-cart data-id="${esc(p.id)}" aria-label="Add ${esc(p.name)} to book bag">Add <span aria-hidden="true">+</span></button></div>
    </article>`;
  }).join('');
}

// ---------- Classes ----------
const klass = $('[data-klass]');
const ev = events.find((e) => e.upcoming);
if (klass && ev) {
  const d = new Date(ev.date + 'T00:00:00');
  const book = byId[ev.book];
  klass.innerHTML = `
    <div class="kl-date" aria-hidden="true"><span class="kl-day" data-roll="${d.getDate()}">${d.getDate()}</span><span class="kl-mon">${d.toLocaleString('en', { month: 'long' })}</span></div>
    <div class="kl-body">
      <p class="kl-kind">${esc(ev.kind)} in Kuala Lumpur</p>
      <h2>${esc(ev.title)}</h2>
      <p class="kl-sub">${esc(ev.subtitle)}, read with ${esc(ev.teacher)}.</p>
      <ul class="kl-facts"><li>${esc(ev.when)}</li><li>${esc(ev.where)}</li>${ev.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="kl-acts"><a class="cta" href="${esc(ev.register)}" target="_blank" rel="noopener"><span>Save my seat</span><svg viewBox="0 0 28 12" aria-hidden="true"><path d="M0 6h26M21 1l5 5-5 5"/></svg></a>
      ${book ? `<button class="ln-btn" type="button" data-add-to-cart data-id="${esc(book.id)}">Add the book, ${money(book.sizes[0].price)}</button>` : ''}
      <a class="ln-btn" href="classes.html">All classes</a></div>
    </div>
    ${book ? `<img class="kl-book" src="${esc(book.image)}" alt="${esc(book.name)}" width="420" height="420" loading="lazy">` : ''}`;
}

// ---------- Since 2007 ----------
const since = $('[data-since]');
if (since) { since.dataset.from = 758; since.dataset.roll = 2007; }

document.querySelectorAll('.sec, .subj li').forEach((el) => seen.observe(el));

// ---------- Reading path ----------
const pathEl = $('[data-path]');
if (pathEl) {
  const state = { level: 'new', subj: 'Sīrah & the Prophet ﷺ' };
  const books = $('[data-path-books]'), total = $('[data-path-total]'), add = $('[data-path-add]'), wa = $('[data-path-wa]');
  const pick = () => {
    let pool = products.filter((p) => !p.free && (state.subj === 'bm' ? p.language === 'Bahasa Melayu' : p.category === state.subj && p.language === 'English'));
    // One edition per work: drop duplicates of the same title.
    const seenName = new Set();
    pool = pool.filter((p) => { const k = p.name.replace(/\(.*\)/, '').trim(); if (seenName.has(k)) return false; seenName.add(k); return true; });
    pool.sort((a, b) => a.sizes[0].price - b.sizes[0].price);
    const n = pool.length;
    // New readers start with the gentlest prices, students of knowledge with the classical editions.
    const start = state.level === 'new' ? 0 : state.level === 'steady' ? Math.max(0, Math.floor(n / 2) - 1) : Math.max(0, n - 3);
    return pool.slice(start, start + 3);
  };
  const draw = () => {
    const list = pick();
    books.classList.remove('is-in'); void books.offsetWidth;
    books.innerHTML = list.map((p, i) => `<li style="--i:${i}"><a href="product.html?id=${encodeURIComponent(p.id)}"><img src="${esc(p.image)}" alt="" width="220" height="220" loading="lazy"></a>
      <span class="pb-step">${['First', 'Then', 'And then'][i]}</span><span class="pb-name">${esc(p.name)}</span><b>${price(p)}</b></li>`).join('');
    books.classList.add('is-in');
    const sum = list.reduce((s, p) => s + p.sizes[0].price, 0);
    total.textContent = money(sum);
    add.dataset.id = list.map((p) => p.id).join(',');
    wa.href = waLink(`Salam ${site.brand}, I'd like this reading path:\n${list.map((p, i) => `${i + 1}. ${p.name} (${money(p.sizes[0].price)})`).join('\n')}\nTotal ${money(sum)}`);
  };
  pathEl.querySelectorAll('.seg').forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    state[g.hasAttribute('data-path-level') ? 'level' : 'subj'] = b.dataset.v;
    draw();
  }));
  draw();
}

// ---------- Signature: the century bar ----------
const CENT = [
  { label: '8th century', year: 758, seg: 0, authors: ['Musa ibn ʿUqbah'] },
  { label: '9th century', year: 892, seg: 1, authors: ['Imam al-Tirmidhi'] },
  { label: '12th century', year: 1111, seg: 2, authors: ['Imam al-Ghazali', 'Qadi ʿIyad'] },
  { label: '13th century', year: 1240, seg: 3, authors: ['compiled by Ibn al-ʿArabi', 'Imam al-Nawawi', 'Ibn Abi Jamrah', 'Imam al-Busiri'] },
  { label: '19th century', year: 1860, seg: 3, authors: ['Imam al-Bajuri'] },
  { label: 'Today', year: new Date().getFullYear(), seg: 4, authors: ['Habib Umar bin Hafiz', 'Dr Yasir Qadhi'] },
];
const track = $('[data-cent-track]');
if (track) {
  const short = (n) => n.replace(/\s*\((Gold Premium|Leather PU Case|Paperback \+ Ebook|ebook|Ibn Abi Jamrah)\)/i, '').replace(/\s*\(Gems from ‘The Shifa’\)/, '').replace(/^The /, '');
  track.innerHTML = CENT.map((c, gi) => {
    const list = products.filter((p) => c.authors.includes(p.author));
    return `<div class="cg" data-cg="${gi}">
      <div class="cg-h"><span class="cg-year${c.label === 'Today' ? ' cg-year--now' : ''}">${c.label === 'Today' ? 'Today' : c.year}</span><span class="cg-label">${esc(c.label)}</span><span class="cg-who">${esc(c.authors.map((a) => a.replace('compiled by ', '')).join(' · '))}</span></div>
      <div class="cg-shelf">${list.map((p, i) => {
        const tall = p.format === 'Premium edition' ? 1 : p.free ? 0.78 : 0.88 + (i % 3) * 0.03;
        const wide = p.format === 'Premium edition' ? 86 : p.sizes[0].price >= 70 ? 72 : 60;
        return `<div class="sp" style="--c:${spines[p.id] || '#1d4a4f'};--h:${tall};--w:${wide}px">
          <button class="sp-b" type="button" aria-expanded="false" aria-label="${esc(p.name)}, ${price(p)}"><span class="sp-t">${esc(short(p.name))}</span><span class="sp-f" aria-hidden="true"></span></button>
          <div class="sp-card">
            <img src="${esc(p.image)}" alt="" width="200" height="200" loading="lazy">
            <p class="sp-name"><a href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></p>
            <p class="sp-meta">${esc(p.author)} · ${esc(p.sizes[0].label)}</p>
            <div class="sp-buy"><b>${price(p)}</b>${p.free ? `<a class="bk-add" href="${esc(p.shopUrl)}" target="_blank" rel="noopener">Get it free</a>` : `<button class="bk-add" type="button" data-add-to-cart data-id="${esc(p.id)}">Add <span aria-hidden="true">+</span></button>`}</div>
          </div>
        </div>`;
      }).join('')}</div>
    </div>`;
  }).join('') + `<div class="cg cg-end"><p>And ${products.length - 25} more titles, from RM25.</p><a class="cta" href="shop.html"><span>Open the bookstore</span><svg viewBox="0 0 28 12" aria-hidden="true"><path d="M0 6h26M21 1l5 5-5 5"/></svg></a></div>`;

  // Pull a spine out: hover on desktop, tap on phone.
  const close = (except) => track.querySelectorAll('.sp.is-out').forEach((s) => { if (s !== except) { s.classList.remove('is-out'); s.querySelector('.sp-b').setAttribute('aria-expanded', 'false'); } });
  track.addEventListener('click', (e) => {
    const b = e.target.closest('.sp-b'); if (!b) return;
    const sp = b.parentElement; const on = !sp.classList.contains('is-out');
    close(sp); sp.classList.toggle('is-out', on); b.setAttribute('aria-expanded', String(on));
  });
  if (matchMedia('(hover: hover)').matches) {
    track.addEventListener('pointerover', (e) => { const sp = e.target.closest('.sp'); if (sp && !sp.classList.contains('is-out')) { close(sp); sp.classList.add('is-out'); } });
    track.addEventListener('pointerleave', () => close());
  }

  const segEl = $('[data-cent-seg]');
  segEl.innerHTML = CENT.map((c) => `<li><span>${esc(c.label)}</span><i></i></li>`).join('');
  const segs = [...segEl.children];
  const groups = [...track.querySelectorAll('.cg[data-cg]')];
  const hdSegs = [...document.querySelectorAll('[data-cbar] li')];
  const update = (prog) => {
    // Which group sits under the centre of the view.
    const mid = innerWidth * 0.45;
    let cur = 0;
    groups.forEach((g, i) => { if (g.getBoundingClientRect().left < mid) cur = i; });
    segs.forEach((s, i) => { s.classList.toggle('is-on', i === cur); s.style.setProperty('--f', i < cur ? 1 : i === cur ? Math.max(0.15, Math.min(1, prog * groups.length - i)) : 0); });
    hdSegs.forEach((li, i) => li.classList.toggle('is-on', i === CENT[cur].seg));
  };
  const G = window.gsap, ST = window.ScrollTrigger;
  if (G && ST && !reduce && innerWidth > 800) {
    G.registerPlugin(ST);
    if (window.__lenis) window.__lenis.on('scroll', ST.update);
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 80);
    G.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '[data-cent]', start: 'top top', end: () => '+=' + dist(), pin: '[data-cent-pin]', scrub: 0.6, invalidateOnRefresh: true, onUpdate: (s) => update(s.progress) },
    });
    addEventListener('load', () => ST.refresh());
  } else {
    // Phones and reduced motion: a swipeable shelf.
    track.parentElement.classList.add('is-swipe');
    track.parentElement.addEventListener('scroll', () => { const v = track.parentElement; update(v.scrollLeft / Math.max(1, v.scrollWidth - v.clientWidth)); }, { passive: true });
  }
  update(0);
}

// Lock every rolling number to its final width at load, so the row never moves when the roll starts.
document.querySelectorAll('[data-roll]').forEach((el) => {
  const to = el.dataset.roll, from = el.dataset.from || '0';
  el.style.display = 'inline-block';
  el.style.minWidth = `${Math.max(String(to).length, String(from).length)}ch`;
});
