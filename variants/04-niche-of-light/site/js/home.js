// Home page: the BM and free-ebook rails, the "Reserve a copy" tool, and the class countdown.
import { site, products, esc, money, waLink } from './app.js';

// Rails of real covers, lit one by one as the rail arrives.
document.querySelectorAll('[data-rail]').forEach((rail) => {
  const free = rail.dataset.rail === 'free';
  const list = products.filter((p) => (free ? p.free : p.language === 'Bahasa Melayu'));
  rail.innerHTML = list.map((p, i) => `<article class="rb" style="--i:${i}">
    <a class="rb-img" href="product.html?id=${encodeURIComponent(p.id)}" tabindex="-1" aria-hidden="true"><img src="${free ? esc(p.image) : `assets/cut/${esc(p.id)}.webp`}" alt="" width="${free ? 600 : 360}" height="600" loading="lazy"></a>
    <h3><a href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></h3>
    ${free ? `<a class="rb-act" href="${esc(p.shopUrl)}" target="_blank" rel="noopener">Free · Get the ebook</a>`
      : `<p class="rb-price">${money(p.sizes[0].price)}</p><button class="rb-act" type="button" data-add-to-cart data-id="${esc(p.id)}">Add to book bag</button>`}
  </article>`).join('');
});

// Countdown to the class (Kuala Lumpur time).
document.querySelectorAll('[data-countdown]').forEach((el) => {
  const days = Math.ceil((new Date(el.dataset.countdown) - Date.now()) / 864e5);
  if (days > 1) el.textContent = `In ${days} days · 11am–5pm`;
  else if (days === 1) el.textContent = 'Tomorrow · 11am–5pm';
});

// Reserve a copy: the WhatsApp message writes itself.
const form = document.querySelector('[data-reserve]');
if (form) {
  const preview = document.querySelector('[data-reserve-preview]');
  const send = document.querySelector('[data-reserve-send]');
  const letter = document.querySelector('.res-letter');
  const qty = form.elements.qty;
  const qtyLabel = form.querySelector('[data-qty-label]');
  const minus = form.querySelector('[data-step="-1"]');
  const setQty = (v) => { qty.value = Math.max(1, Math.min(20, v || 1)); minus.disabled = +qty.value <= 1; };
  form.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { setQty(+qty.value + +b.dataset.step); update(); }));
  qty.addEventListener('input', () => setQty(parseInt(qty.value, 10)));
  let pulseT;
  function update() {
    const f = new FormData(form);
    const intent = f.get('intent');
    form.querySelectorAll('[data-when]').forEach((el) => { el.hidden = !el.dataset.when.split(' ').includes(intent); });
    qtyLabel.textContent = intent === 'seat' ? 'Seats' : 'Copies';
    const n = +qty.value || 1, name = (f.get('name') || '').trim(), area = f.get('area');
    const lines = [`Salam ${site.brand},`];
    if (intent === 'preorder') lines.push(`I'd like to pre-order al-Shama'il al-Muhammadiyya (hardback, RM200, December 2026 batch).`, `Copies: ${n} (${money(200 * n)})`, `Deliver to: ${area}`);
    if (intent === 'request') lines.push(`I'm looking for a title: ${(f.get('title') || '').trim() || '…'}`, 'Do you have it, and at what price?', `Deliver to: ${area}`);
    if (intent === 'seat') lines.push(`Please save ${n} seat${n > 1 ? 's' : ''} at The Niche of Light: The Divine Reports (Mishkat al-Anwar) with Dr Ali Hussain.`, 'Saturday 21 November, 11am–5pm, MSABA Hall, Masjid Saidina Abu Bakar As-Siddiq, Bangsar.');
    lines.push(`Name: ${name || '…'}`);
    const text = lines.join('\n');
    preview.textContent = text;
    send.href = waLink(text);
    letter.classList.remove('is-writing'); void letter.offsetWidth; letter.classList.add('is-writing');
    clearTimeout(pulseT); pulseT = setTimeout(() => letter.classList.remove('is-writing'), 900);
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (e) => { e.preventDefault(); window.open(send.href, '_blank', 'noopener'); });
  document.querySelectorAll('[data-reserve-intent]').forEach((a) => a.addEventListener('click', () => {
    const r = form.querySelector(`input[name="intent"][value="${a.dataset.reserveIntent}"]`);
    if (r) { r.checked = true; update(); }
  }));
  setQty(1);
  update();
}
