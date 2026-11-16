// Page-specific behaviour, chosen by <body data-page="...">. Each block fills the hooks its page has.
import { site, products, events, byId, cardHTML, priceHTML, addBtn, money, esc, tbc, waLink } from './app.js';

const page = document.body.dataset.page;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Any page: book grids. <div data-products></div> = all; data-products="featured", "free", "bm"
// (Bahasa Melayu), "premium", "cat:Hadith", or "id1,id2".
export function pick(v) {
  if (!v) return products;
  if (v === 'featured') return products.filter((p) => p.featured);
  if (v === 'free') return products.filter((p) => p.free);
  if (v === 'bm') return products.filter((p) => p.language === 'Bahasa Melayu');
  if (v === 'premium') return products.filter((p) => p.format === 'Premium edition');
  if (v.startsWith('cat:')) return products.filter((p) => p.category === v.slice(4));
  return v.split(',').map((id) => byId[id]).filter(Boolean);
}
document.querySelectorAll('[data-products]').forEach((el) => {
  const list = pick(el.dataset.products);
  el.innerHTML = list.map(cardHTML).join('');
});

// Any page: store lists from data/stores.json. <ul data-stores></ul>
const storeEls = document.querySelectorAll('[data-stores]');
if (storeEls.length) {
  const st = await (await fetch('data/stores.json')).json();
  const outlet = (o) => `<li><strong>${tbc(o.name)}</strong>${o.address ? `<br>${tbc(o.address)}` : ''}${o.mapUrl ? ` <a href="${esc(o.mapUrl)}" target="_blank" rel="noopener">Map</a>` : ''}</li>`;
  storeEls.forEach((el) => {
    el.innerHTML = st.groups.map((g) => `<li class="store"><h3>${esc(g.name)}</h3><ul>${g.outlets.map(outlet).join('')}</ul></li>`).join('');
  });
}

// Bookstore: subject chips plus language, format and price filters, search and sort.
// Subject is kept in the URL (shop.html?cat=Hadith); also ?lang=Bahasa%20Melayu and ?format=Free%20ebook.
if (page === 'shop') {
  const grid = document.querySelector('[data-shop-grid]');
  const chips = document.querySelector('[data-filter-cats]');
  const search = document.querySelector('[data-filter-search]');
  const sort = document.querySelector('[data-filter-sort]');
  const langSel = document.querySelector('[data-filter-lang]');
  const fmtSel = document.querySelector('[data-filter-format]');
  const priceSel = document.querySelector('[data-filter-price]');
  const count = document.querySelector('[data-filter-count]');
  const cats = [...new Set(products.map((p) => p.category))];
  const qs = new URLSearchParams(location.search);
  let cat = qs.get('cat') || '';
  if (!cats.includes(cat)) cat = '';
  const opts = (sel, vals, all) => { if (sel) sel.innerHTML = `<option value="">${all}</option>` + vals.map((v) => `<option>${esc(v)}</option>`).join(''); };
  opts(langSel, [...new Set(products.map((p) => p.language))], 'All languages');
  opts(fmtSel, [...new Set(products.map((p) => p.format))], 'All formats');
  if (langSel && qs.get('lang')) langSel.value = qs.get('lang');
  if (fmtSel && qs.get('format')) fmtSel.value = qs.get('format');
  if (search && qs.get('q')) search.value = qs.get('q');
  chips.innerHTML = ['', ...cats].map((c) => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${c === cat}">${c ? esc(c) : 'All books'}</button>`).join('');
  const price = (p) => p.sizes[0].price ?? Infinity;
  const inBand = (p, band) => { if (!band) return true; const [lo, hi] = band.split('-').map(Number); const x = price(p); return x >= lo && x <= hi; };
  const render = () => {
    const q = (search?.value || '').trim().toLowerCase();
    let list = products.filter((p) => (!cat || p.category === cat)
      && (!langSel?.value || p.language === langSel.value)
      && (!fmtSel?.value || p.format === fmtSel.value)
      && inBand(p, priceSel?.value)
      && (!q || `${p.name} ${p.summary} ${p.category} ${p.author || ''}`.toLowerCase().includes(q)));
    if (sort.value === 'price-asc') list = [...list].sort((a, b) => price(a) - price(b));
    if (sort.value === 'price-desc') list = [...list].sort((a, b) => price(b) - price(a));
    if (sort.value === 'new') list = [...list].sort((a, b) => b.released.localeCompare(a.released));
    if (sort.value === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    grid.innerHTML = list.length ? list.map(cardHTML).join('') : '<p class="empty">No books match. Try another filter.</p>';
    count.textContent = `${list.length} title${list.length === 1 ? '' : 's'}`;
  };
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    cat = b.dataset.cat;
    chips.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const url = new URL(location.href);
    if (cat) url.searchParams.set('cat', cat); else url.searchParams.delete('cat');
    history.replaceState(null, '', url);
    render();
  });
  [search, sort, langSel, fmtSel, priceSel].forEach((el) => el && el.addEventListener(el === search ? 'input' : 'change', render));
  render();
}

// Product page: product.html?id=product-one (falls back to the first product).
if (page === 'product') {
  const p = byId[new URLSearchParams(location.search).get('id')] || products[0];
  document.title = `${p.name} | ${site.brand}`;
  const set = (sel, html) => document.querySelectorAll(sel).forEach((el) => { el.innerHTML = html; });
  set('[data-p-name]', esc(p.name));
  set('[data-p-category]', `<a href="shop.html?cat=${encodeURIComponent(p.category)}">${esc(p.category)}</a>`);
  set('[data-p-summary]', tbc(p.summary));
  set('[data-p-description]', tbc(p.description));
  set('[data-p-notes]', (p.notes || []).map((n) => `<li>${tbc(n)}</li>`).join(''));
  set('[data-p-details]', tbc(p.details));
  document.querySelectorAll('[data-p-image]').forEach((img) => { img.src = p.image; img.alt = p.name; });
  set('[data-p-author]', p.author ? esc(p.author) : '');
  set('[data-p-format]', esc(`${p.format} · ${p.language}${p.bilingual ? ' · Arabic and English' : ''}`));
  set('[data-p-gallery]', (p.gallery || []).map((g) => `<img src="${esc(g)}" alt="${esc(p.name)}, inside the book" loading="lazy" width="600" height="600">`).join(''));
  document.querySelectorAll('[data-p-shop]').forEach((a) => { a.href = p.shopUrl; });
  if (p.free) document.querySelectorAll('[data-p-buy]').forEach((el) => { el.innerHTML = addBtn(p); });

  const add = document.querySelector('[data-p-add]');
  const qty = document.querySelector('[data-qty]');
  const sizeSel = document.querySelector('[data-p-size]');
  sizeSel.innerHTML = p.sizes.map((s, i) => `<option value="${i}">${esc(s.label)}</option>`).join('');
  sizeSel.closest('label').hidden = p.sizes.length < 2;
  const setSize = () => {
    const s = p.sizes[+sizeSel.value || 0];
    set('[data-p-price]', priceHTML(p, s, 'pdp-price'));
    add.dataset.id = p.id;
    add.dataset.size = s.label;
  };
  const setQ = (n) => { qty.value = Math.max(1, Math.min(99, n || 1)); add.dataset.qty = qty.value; };
  sizeSel.addEventListener('change', setSize);
  document.querySelectorAll('[data-qty-step]').forEach((b) => b.addEventListener('click', () => setQ(+qty.value + +b.dataset.qtyStep)));
  qty.addEventListener('input', () => setQ(+qty.value));
  setSize();
  setQ(1);
  document.querySelectorAll('[data-p-ask]').forEach((a) => { a.href = waLink(p.preorder ? `Hi ${site.brand}, I'd like to pre-order ${p.name} (December 2026 batch).` : `Hi ${site.brand}, a question about ${p.name}: `); });
  document.querySelectorAll('[data-p-market]').forEach((a) => {
    const u = p.marketplaceUrl || site.marketplace?.url;
    if (u) a.href = u; else a.hidden = true;
  });
  const others = document.querySelector('[data-p-others]');
  if (others) others.innerHTML = products.filter((x) => x !== p && x.category === p.category).concat(products.filter((x) => x.featured && x !== p)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 4).map(cardHTML).join('');
}

// Classes & events: <div data-events="upcoming|past"></div>
document.querySelectorAll('[data-events]').forEach((el) => {
  const up = el.dataset.events !== 'past';
  el.innerHTML = events.filter((e) => !!e.upcoming === up).map((e) => up ? `<article class="event">
      <p class="event-kind">${esc(e.kind)}</p>
      <h3>${esc(e.title)}</h3>
      <p class="event-sub">${esc(e.subtitle || '')}${e.teacher ? ` · taught by ${esc(e.teacher)}` : ''}</p>
      <p class="event-when">${esc(e.when)}<br>${esc(e.where)}</p>
      <ul>${(e.points || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p><a class="btn" href="${esc(e.register)}" target="_blank" rel="noopener">Register on imamghazali.my</a>
      <a class="btn btn-line" href="${waLink(`Hi ${site.brand}, I'd like to save a seat at ${e.title} (${e.when}). Name: `)}" target="_blank" rel="noopener">Ask on WhatsApp</a></p>
    </article>` : `<li>${esc(e.title)} <span>${esc(e.kind)}</span></li>`).join('');
});

// Contact: a request form that writes the WhatsApp message live (pre-orders, title requests, class seats, wholesale).
if (page === 'contact') {
  const form = document.querySelector('[data-quote]');
  const preview = document.querySelector('[data-quote-preview]');
  const send = document.querySelector('[data-quote-send]');
  form.elements.purpose.innerHTML = site.quotePurposes.map((t) => `<option>${esc(t)}</option>`).join('');
  const titleSel = form.elements.title;
  if (titleSel) titleSel.innerHTML = '<option value="">Not sure yet</option>' + products.filter((p) => !p.free).map((p) => `<option>${esc(p.name)}</option>`).join('');
  const update = () => {
    const f = new FormData(form);
    const text = [
      `Hi ${site.brand},`,
      `${f.get('purpose')}`,
      f.get('title') ? `Title: ${f.get('title')}${+f.get('qty') > 1 ? ` x ${f.get('qty')}` : ''}` : '',
      f.get('area') ? `Deliver to: ${f.get('area')}` : '',
      f.get('name') ? `Name: ${f.get('name')}` : '',
      f.get('note') ? `Note: ${f.get('note')}` : '',
    ].filter(Boolean).join('\n');
    preview.textContent = text;
    send.href = waLink(text);
  };
  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => { e.preventDefault(); window.open(send.href, '_blank', 'noopener'); });
  document.querySelectorAll('[data-quote-preset]').forEach((b) => b.addEventListener('click', () => {
    form.elements.purpose.value = b.dataset.quotePreset;
    if (b.dataset.title && titleSel) titleSel.value = b.dataset.title;
    update();
    form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }));
  const pre = new URLSearchParams(location.search).get('for');
  if (pre && site.quotePurposes.includes(pre)) form.elements.purpose.value = pre;
  update();
}
