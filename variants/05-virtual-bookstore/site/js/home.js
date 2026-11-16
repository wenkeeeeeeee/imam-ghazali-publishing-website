// Home page: the places of the store as sections (the list version), plus the HUD, the taken-book card and the
// place panels for the 3D store. With no WebGL or with reduced motion, the list version is the page.
import { site, events, byId, cart, esc, money, cardHTML, waLink, tbc } from './app.js';
import { AISLES, aisle, PREMIUM, FREE, LOVED, PLACES, place, TOUR } from './places.js';

const $ = (s, r = document) => r.querySelector(s);
const html = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const glOK = !!(window.__glOK && window.__glOK());

// ---------- the places, as sections ----------
const shelf = (list) => `<div class="shelf">${list.map(cardHTML).join('')}</div>`;
const sec = (key, kicker, title, body, extra = '') => `<section class="place place-${key}" id="place-${key}" data-place="${key}">
  <header class="place-head"><p class="place-k">${kicker}</p><h2 id="h-${key}">${title}</h2>${body}</header>${extra}</section>`;
const ev = events.find((e) => e.upcoming);
const evWa = ev ? waLink(`Salam ${site.brand}, I'd like to save a seat at ${ev.title} (${ev.when}). Name: `) : '#';
const parts = [];
parts.push(sec('table', 'The front table', 'Premium editions',
  `<p>Gold, leather and hardback, made to keep. Classical works in English for the first time: the Maghazi, the earliest Sīrah in existence, and Mukhtasar Sahih al-Bukhari.</p>
   <p class="place-meta">5 editions · RM125–220 · al-Shama'il ships with the December 2026 print batch</p>`, shelf(PREMIUM)));
AISLES.forEach((a) => parts.push(sec(a.key, `Aisle${a.ar ? ` <span lang="ar" dir="rtl">${a.ar}</span>` : ''}`, esc(a.name),
  `${a.key === 'bm' ? '<p>Buku IGP dalam Bahasa Melayu: ten titles, from Pembukaan Tanpa Akhir to Panduan Adab dan Akhlak Muslim.</p>' : ''}
   <p class="place-meta">${a.meta}</p><p><a class="link" href="${a.href}">This aisle in the bookstore list</a></p>`, shelf(a.books))));
parts.push(sec('ebooks', 'The stand', 'Free ebooks',
  `<p>Nine ebooks, free to download from imamghazali.my. Give what you can if you wish: each download page offers an optional gift that shares the ebook with others.</p>`, shelf(FREE)));
parts.push(sec('loved', 'Wall shelf', 'Best loved', `<p>The titles readers come back for, and give as gifts.</p>`, shelf(LOVED)));
parts.push(sec('notice', 'Noticeboard · Classes in Kuala Lumpur', ev ? esc(ev.title) : 'Classes',
  ev ? `<p class="notice-when"><strong>${esc(ev.when)}</strong><br>${esc(ev.where)}</p>
   <p>${esc(ev.kind)}: ${esc(ev.subtitle || '')}, taught by ${esc(ev.teacher)}. ${ev.points.map(esc).join(' · ')}.</p>
   <p class="place-btns"><a class="btn" href="${esc(ev.register)}" target="_blank" rel="noopener">Register on imamghazali.my/divine</a><a class="btn btn-ghost" href="${evWa}" target="_blank" rel="noopener">Save a seat on WhatsApp</a></p>
   <p><a class="link" href="classes.html">All classes &amp; past events</a></p>` : '',
  byId['divine-reports-mishkat-al-anwar'] ? shelf([byId['divine-reports-mishkat-al-anwar']]) : ''));
parts.push(sec('founders', "Founders' wall", 'Since 2007',
  `<p class="founders-lede">Reviving, translating &amp; beautifully producing works of scholarship.</p>
   <p>${esc(site.since)} Now in Malaysia: ${esc(site.company)}, with prices in RM, a Bahasa Melayu shelf and classes in Kuala Lumpur.</p>`,
  `<div class="founders-grid">
    <div><h3>First in English</h3><p>The Maghazi of Musa ibn ʿUqbah, the earliest work of Sīrah in existence. Mukhtasar Sahih al-Bukhari, in English for the first time in history.</p></div>
    <div><h3>Arabic beside English</h3><p>The IGP bilingual edition: clear Arabic script with the translation alongside. Many titles also give the transliteration.</p></div>
    <div><h3>The scholars</h3><p>Musa ibn ʿUqbah, Imam al-Tirmidhi, Imam al-Ghazali, Imam al-Nawawi, Imam al-Busiri, Qadi ʿIyad, Ibn Abi Jamrah.</p></div>
    <div><h3>Living teachers &amp; translators</h3><p>Habib Umar bin Hafiz, Dr Yasir Qadhi, Shaykh Hamzah Abdul-Malik, Shaykh Dr Thaika Shuʿaib Alim. Translators Shabbir Hassan and Rayyan Shaikh.</p></div>
  </div>
  <blockquote class="review"><p>“This book is truly amazing. The level of thought and care is inspiring. First of all, the Arabic is based on the best edition recommended by scholars in Egypt. The English translation is masterful. The designs are beautiful and the footnotes add a lot to text. It's a must-have.”</p><cite>On al-Shama'il al-Muhammadiyya · <span class="tbc">[reviewer name to confirm]</span></cite></blockquote>
  <p><a class="link" href="about.html">How a book is made</a></p>`));
parts.push(sec('counter', 'The counter', 'Your book bag',
  `<p>Check out on imamghazali.my (secure, in RM) or send the list to us on WhatsApp.</p>`,
  `<div class="bag" data-bag></div>
  <h3 class="counter-h">Questions at the counter</h3>
  <dl class="faq">
    <dt>Delivery in Malaysia, and how fast?</dt><dd>Shown at checkout on imamghazali.my. <span class="tbc">[client to confirm delivery fees and times]</span></dd>
    <dt>How can I pay?</dt><dd>At checkout on imamghazali.my, or on WhatsApp. <span class="tbc">[client to confirm FPX, DuitNow and cards]</span></dd>
    <dt>Is the Arabic included?</dt><dd>Many editions are bilingual, Arabic beside English. Each book says so on its card.</dd>
    <dt>Are there Malay editions?</dt><dd>Yes, ten titles on the Buku Bahasa Melayu shelf, from RM25.</dd>
    <dt>When does the Shama'il pre-order ship?</dt><dd>With the December 2026 print batch. Hardback, RM200.</dd>
  </dl>
  <h3 class="counter-h">Talk to us</h3>
  <p>WhatsApp ${tbc(site.whatsapp.display)} · <a class="link" href="${esc(site.socials.instagram)}" target="_blank" rel="noopener">Instagram @imamghazali.my</a> · ${tbc(site.email)}<br>${tbc(site.address)}<br>${esc(site.company)}</p>
  <p><a class="link" href="contact.html">Contact, wholesale &amp; where to buy</a></p>`));
const placesEl = $('[data-places]');
placesEl.innerHTML = `<header class="places-intro"><h2>The store, place by place</h2><p>Every shelf, the noticeboard and the counter, as a list.</p></header>` + parts.join('');

// the live book bag at the counter
function renderBag() {
  const items = cart.items();
  const body = items.length ? `<ul class="bag-lines">${items.map((i) => `<li><img src="assets/covers-s/${esc(i.id)}.webp" alt="" width="40" height="60"><span>${esc(i.name)}</span><span class="bag-q">× ${i.qty}</span><strong>${i.lineTotal != null ? money(i.lineTotal) : '<span class="tbc">[price to confirm]</span>'}</strong></li>`).join('')}</ul>
    <p class="bag-sub"><span>Subtotal</span><strong>${money(cart.subtotal())}</strong></p>` : '<p class="bag-empty">Your book bag is empty. Take a book from any shelf and add it.</p>';
  const dis = items.length ? '' : ' aria-disabled="true"';
  const out = `${body}<p class="place-btns"><a class="btn" href="${esc(cart.shopifyUrl())}" target="_blank" rel="noopener"${dis} data-checkout>Check out on imamghazali.my</a><a class="btn btn-ghost" href="${esc(cart.whatsappUrl())}" target="_blank" rel="noopener"${dis}>Order on WhatsApp</a></p><p class="bag-fine">Delivery fees shown at checkout <span class="tbc">[client to confirm]</span> · <button class="link" type="button" data-cart-open>Edit the book bag</button></p>`;
  document.querySelectorAll('[data-bag]').forEach((el) => { el.innerHTML = out; });
}
renderBag(); cart.onChange(renderBag);

// ---------- still version or 3D ----------
const store = $('[data-store]');
const intro = $('[data-intro]');
function still() {
  html.classList.remove('is-3d'); html.classList.add('is-still');
  $('[data-enter]').textContent = 'See the shelves';
  $('[data-enter]').onclick = () => $('#places').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  if (glOK && reduce) { const b = $('[data-anyway]'); b.hidden = false; b.onclick = () => { b.hidden = true; start(true); }; }
}
requestAnimationFrame(() => html.classList.add('is-open'));
if (glOK && !reduce) start(); else still();

async function start(enterNow = false) {
  html.classList.remove('is-still'); html.classList.add('is-3d');
  let api;
  try { const m = await import('./store.js'); api = await m.startStore(ui); }
  catch (e) { console.error(e); still(); return; }
  window.__store = api;
  html.classList.add('gl-ready');
  $('[data-enter]').textContent = 'Enter the bookstore';
  $('[data-enter]').onclick = () => enter();
  if (enterNow) enter();
  function enter() {
    html.classList.add('is-walking');
    $('[data-hud]').hidden = false;
    api.enter();
    setTimeout(() => { intro.hidden = true; }, 600);
  }
  ui.api = api;
}

// ---------- the UI the 3D store talks to ----------
const hud = $('[data-hud]'), take = $('[data-take]'), panel = $('[data-panel]'), reticle = $('[data-reticle]'), hint = $('[data-hint]');
let pointerNDC = null, isLocked = false, panelKey = null, relock = false, lastPlace = null;
const ui = {
  canvas: $('[data-gl]'),
  api: null,
  pointer: () => (isLocked ? { x: 0, y: 0 } : pointerNDC),
  setPointer(n) { pointerNDC = n; },
  wantsLock: () => !coarse && !panelKey,
  onLock(l) {
    isLocked = l; html.classList.toggle('is-locked', l);
    hint.hidden = l || coarse || !!panelKey || (ui.api && ui.api.isHolding());
  },
  onHover(label, active) {
    $('[data-reticle-label]').textContent = label;
    reticle.classList.toggle('is-on', active);
    ui.canvas.style.cursor = active && !isLocked ? 'pointer' : '';
  },
  onMove(me, where) {
    player.setAttribute('transform', `translate(${me.x.toFixed(2)} ${(-me.z).toFixed(2)}) rotate(${(-me.yaw * 180 / Math.PI).toFixed(1)})`);
    if (where && where !== lastPlace) { lastPlace = where; showWhere(where); }
  },
  onPlace(pl) { lastPlace = pl; showWhere(pl); },
  onTake(p) {
    const s = p.sizes[0];
    $('[data-take-cat]').textContent = `${p.category}${p.language !== 'English' ? ` · ${p.language}` : ''}`;
    $('[data-take-title]').textContent = p.name;
    $('[data-take-author]').textContent = p.author ? `${p.author}` : '';
    const fmt = [p.free ? 'Free ebook' : /bilingual/i.test(s.label) ? '' : s.label, p.bilingual ? 'Bilingual: Arabic & English' : '', p.format === 'Premium edition' ? 'Premium edition' : ''].filter(Boolean);
    $('[data-take-format]').innerHTML = tbc([...new Set(fmt)].join(' · '));
    $('[data-take-price]').innerHTML = p.free ? 'Free ebook' : s.price != null ? `${money(s.price)}${p.preorder ? ' <span>Pre-order · December 2026 batch</span>' : ''}` : '<span class="tbc">[client to confirm price]</span>';
    $('[data-take-line]').innerHTML = tbc(p.summary);
    $('[data-take-actions]').innerHTML = (p.free
      ? `<a class="btn" href="${esc(p.shopUrl)}" target="_blank" rel="noopener">Get the free ebook</a>`
      : `<button class="btn" type="button" data-add-to-cart data-id="${esc(p.id)}" data-size="${esc(s.label)}">Add to book bag</button>`)
      + `<a class="btn btn-ghost" href="product.html?id=${encodeURIComponent(p.id)}">View book</a>`;
    take.hidden = false; requestAnimationFrame(() => take.classList.add('is-in'));
    hint.hidden = true; html.classList.add('is-holding');
    if (document.pointerLockElement) document.exitPointerLock();
    ui.onHover('', false);
  },
  onPutBack() { take.classList.remove('is-in'); html.classList.remove('is-holding'); setTimeout(() => { if (!take.classList.contains('is-in')) take.hidden = true; }, 350); },
  onPutBackDone() { if (!coarse && !isLocked) ui.api.lock(); },
  openPanel(key) {
    const src = document.getElementById(`place-${key}`); if (!src) return;
    panelKey = key; relock = isLocked;
    if (document.pointerLockElement) document.exitPointerLock();
    const body = $('[data-panel-body]'); body.innerHTML = src.innerHTML;
    body.querySelector('h2')?.setAttribute('id', 'panel-title');
    panel.hidden = false; panel.dataset.key = key; panel.scrollTop = 0; body.scrollTop = 0;
    requestAnimationFrame(() => panel.classList.add('is-in'));
    hint.hidden = true;
    setTimeout(() => $('[data-panel-close]').focus({ preventScroll: true }), 50);
  },
  panelOpen: () => !!panelKey,
  closePanel() {
    if (!panelKey) return;
    panelKey = null; panel.classList.remove('is-in');
    setTimeout(() => { if (!panelKey) panel.hidden = true; }, 350);
    if (relock && !coarse) ui.api.lock();
  },
  next() {
    const cur = lastPlace ? TOUR.indexOf(lastPlace.key) : -1;
    const key = TOUR[(cur + 1) % TOUR.length];
    ui.closePanel();
    ui.api.goTo(key);
  },
  ping(x, y) { const d = document.createElement('i'); d.className = 'ping'; d.style.left = `${x}px`; d.style.top = `${y}px`; document.body.append(d); setTimeout(() => d.remove(), 900); },
};
function showWhere(pl) {
  $('[data-hud-kind]').textContent = pl.kind; $('[data-hud-name]').textContent = pl.name; $('[data-hud-meta]').textContent = pl.meta || '';
  hud.querySelectorAll('[data-go]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.go === pl.key)));
}
$('[data-take-back]').addEventListener('click', () => ui.api && ui.api.putBack());
$('[data-panel-close]').addEventListener('click', () => ui.closePanel());
$('[data-next]').addEventListener('click', () => ui.next());
take.addEventListener('click', (e) => {
  const b = e.target.closest('[data-add-to-cart]'); if (!b) return;
  setTimeout(() => { b.textContent = `In your book bag (${cart.count()})`; b.classList.add('is-done'); }, 0);
});

// floor plan
const map = $('[data-map]');
const r = (x0, x1, z0, z1, cls) => `<rect class="${cls}" x="${Math.min(x0, x1)}" y="${-Math.max(z0, z1)}" width="${Math.abs(x1 - x0)}" height="${Math.abs(z1 - z0)}" rx=".08"/>`;
map.innerHTML = r(-7, 7, 0, -21, 'm-room') + r(-2.27, -1.73, -7, -17, 'm-unit') + r(1.73, 2.27, -7, -17, 'm-unit') + r(-1.42, 1.42, -3.98, -5.22, 'm-table')
  + r(-2.26, 2.26, -19.14, -19.96, 'm-table') + r(6.7, 7, -1.4, -6.4, 'm-unit') + r(6.62, 7, -7.9, -11.1, 'm-unit') + r(6.9, 7, -13.3, -15.7, 'm-gold') + r(-7, -6.9, -8.2, -15.8, 'm-gold')
  + r(-7.05, -6.95, -1, -5.8, 'm-window') + r(-0.9, 0.9, 0.05, -0.05, 'm-window')
  + PLACES.filter((p) => p.key !== 'door').map((p) => { const [x, , z] = p.look; const px = clamp(x, -6.6, 6.6), pz = clamp(-z, 0.4, 20.6); return `<g class="m-dot" data-go="${p.key}" tabindex="0" role="button" aria-label="Walk to ${esc(p.name)}"><circle cx="${px}" cy="${pz}" r=".55"/><title>${esc(p.name)}</title></g>`; }).join('')
  + '<g class="m-me" data-me><path d="M0 -0.75 L0.5 0.45 L0 0.18 L-0.5 0.45 Z"/></g>';
const player = map.querySelector('[data-me]');
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
const list = $('[data-hud-list]');
list.innerHTML = PLACES.filter((p) => p.key !== 'door').map((p) => `<li><button type="button" data-go="${p.key}"><span>${esc(p.name)}</span><small>${esc(p.kind)}</small></button></li>`).join('');
const placesBtn = $('[data-places-btn]');
placesBtn.addEventListener('click', () => { const open = list.hidden; list.hidden = !open; placesBtn.setAttribute('aria-expanded', String(open)); });
hud.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]'); if (!g || !ui.api) return;
  const pl = place[g.dataset.go]; list.hidden = true; placesBtn.setAttribute('aria-expanded', 'false');
  ui.closePanel(); ui.api.goTo(pl.key, { openPanel: !!pl.open });
});
hud.addEventListener('keydown', (e) => { const g = e.target.closest('g[data-go]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); g.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });

// touch joystick
const joyEl = $('[data-joy]'), knob = joyEl.querySelector('span');
let joyId = null;
joyEl.addEventListener('pointerdown', (e) => { joyId = e.pointerId; joyEl.setPointerCapture(e.pointerId); moveJoy(e); });
joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) moveJoy(e); });
const endJoy = () => { joyId = null; knob.style.transform = ''; if (ui.api) { ui.api.joy.x = 0; ui.api.joy.y = 0; } };
joyEl.addEventListener('pointerup', endJoy); joyEl.addEventListener('pointercancel', endJoy);
function moveJoy(e) {
  const b = joyEl.getBoundingClientRect(), R = b.width / 2;
  let dx = e.clientX - (b.left + R), dy = e.clientY - (b.top + R); const d = Math.hypot(dx, dy), m = R * 0.62;
  if (d > m) { dx *= m / d; dy *= m / d; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  if (ui.api) { ui.api.joy.x = dx / m; ui.api.joy.y = -dy / m; }
}
ui.canvas.addEventListener('pointermove', (e) => { store.style.setProperty('--mx', `${e.clientX}px`); store.style.setProperty('--my', `${e.clientY}px`); });
