// V3 home below the hero: this month's shelf, the heart finder, the season shelf (Hijri ring + the hero's 3D books).
import { products, byId, esc, money, addBtn, waLink, site } from './app.js';
import { book3d, hasCover } from './book.js';
import { gsap, ST, reduce } from './scroll.js';

const price = (p) => p.free ? 'Free' : money(p.sizes[0].price);
const link = (p) => `product.html?id=${encodeURIComponent(p.id)}`;
const shelfItem = (p, extra = '') => `<article class="sh-item" data-card>
  <a class="sh-book" href="${link(p)}" aria-label="${esc(p.name)}">${book3d(p)}</a>
  <div class="sh-meta">${extra}<h3><a href="${link(p)}">${esc(p.name)}</a></h3>
  <div class="sh-buy"><p class="sh-price">${price(p)}<span>${esc(p.sizes[0].label)}</span></p>${addBtn(p, 'Add', 'btn btn-sm')}</div></div>
</article>`;

// ---------- Hijri month ----------
const now = new Date();
const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', year: 'numeric' }).formatToParts(now);
const hMonth = +(parts.find((x) => x.type === 'month') || { value: 6 }).value;
const hYear = (parts.find((x) => x.type === 'year') || { value: '' }).value;
const MONTHS = ['Muharram', 'Safar', 'Rabiʿ al-Awwal', 'Rabiʿ al-Akhir', 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', 'Shaʿban', 'Ramadan', 'Shawwal', 'Dhu al-Qaʿdah', 'Dhu al-Hijjah'];
const AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
const ISRA = ['isra-miraj-the-night-journey-ascension-of-the-prophet-muhamm', 'forgotten-moments-from-the-isra-miraj', 'prophets-night-journey-and-heavenly-ascent'];
const STOPS = [
  { m: 3, label: 'Mawlid & salawat', line: 'The month of the Prophet’s ﷺ birth: qasaʾid and salawat for the gatherings.', ids: ['qasaid-for-rabi-al-awwal-the-ahmadan-outpouring', 'complete-elation-happiness-through-the-birth-of-the-locus-of', 'seeking-hope-success-through-reading-about-the-messenger-his', 'prayers-upon-the-beloved-salawat-of-habib-umar-bin-hafiz'] },
  { m: 7, label: 'The Night Journey', line: 'The Isrāʾ and Miʿrāj, read in the month it is remembered.', ids: ISRA },
  { m: 8, label: 'Before Ramadan', line: 'Between Rajab and Ramadan, the month often overlooked.', ids: ['blessed-month-of-shaban', 'daily-dua-book-prayers-to-recite-every-morning-evening', 'how-to-draw-close-to-allah'] },
  { m: 9, label: 'The month of the Qurʾan', line: 'Fasting, recitation and reflection, night by night.', ids: ['ramadan-revealed', 'endless-banquet-volume-i', 'recitation-of-the-glorious-quran-its-virtues-etiquettes-and', 'unlocking-surah-al-fatihah-the-great-beginning'] },
];
STOPS.forEach((s) => { s.ids = s.ids.filter((id) => byId[id] && hasCover(byId[id])); });
const thisStop = hMonth === 6 || hMonth === 7 ? STOPS[1] : STOPS.find((s) => s.m === hMonth);

// ---------- 1. On the shelf this month ----------
{
  const rail = document.querySelector('[data-month-rail]');
  const seasonIds = thisStop ? thisStop.ids.slice(0, 3) : [];
  const fresh = products.filter((p) => hasCover(p) && !p.free && !seasonIds.includes(p.id)).sort((a, b) => String(b.released).localeCompare(String(a.released))).slice(0, 8 - seasonIds.length);
  const tag = (t, gold) => `<p class="sh-tag${gold ? ' is-gold' : ''}">${t}</p>`;
  rail.innerHTML = seasonIds.map((id) => shelfItem(byId[id], tag(hMonth === 6 ? 'Rajab is near' : MONTHS[hMonth - 1], true))).join('')
    + fresh.map((p) => shelfItem(p, tag('New'))).join('');
  const prem = ['maghazi-of-sayyiduna-muhammad-gold-premium', 'al-shamail-al-muhammadiyya', 'mukhtasar-sahih-al-bukhari-ibn-abi-jamrah', 'burdah-of-busiri-leather-pu-case', 'sirah-of-the-prophet'].map((id) => byId[id]).filter(Boolean);
  document.querySelector('[data-premium-rail]').innerHTML = prem.map((p) => shelfItem(p, `<p class="sh-tag">${esc(p.sizes[0].label.replace(' [client to confirm]', ''))}${p.preorder ? ' · pre-order' : ''}</p>`)).join('');
}

// ---------- 2. What is your heart carrying? ----------
{
  const HEART = [
    { k: 'grief', label: 'Grief', line: '“The Prophet ﷺ wept. And in his tears is permission for yours.”', ids: ['losing-and-healing'] },
    { k: 'anger', label: 'Anger or anxiety', line: '“You know the hadith. You believe the teachings. Yet somehow, a gap remains between what you know and how you live.”', ids: ['emotionally-intelligent-muslim'] },
    { k: 'patience', label: 'Patience', line: 'Forty life lessons from Sūrah Yūsuf.', ids: ['a-beautiful-patience-40-life-lessons-from-surah-yusuf'] },
    { k: 'forget', label: 'Forgetting', line: 'A cure for forgetfulness, in English and in Bahasa Melayu.', ids: ['curing-forgetfulness', 'penawar-lupa'] },
    { k: 'children', label: 'Raising children', line: 'Sons, daughters and the home, in the light of prophecy.', ids: ['futuwwah-and-raising-males-into-sacred-manhood', 'integrity-of-the-family-the-role-of-parents', 'seni-keibubapaan-dalam-cahaya-kenabian'] },
    { k: 'first', label: 'First steps', line: 'Begin with the forty hadith every student learns first.', ids: ['40-hadith-of-imam-al-nawawi'] },
    { k: 'quran', label: 'The Qurʾan', line: 'A thematic explanation of the Qurʾan in three volumes, RM120 for the set.', ids: ['endless-banquet-volume-i', 'endless-banquet-volume-ii', 'endless-banquet-volume-iii'] },
  ];
  const chips = document.querySelector('[data-heart-chips]');
  const out = document.querySelector('[data-heart-out]');
  chips.innerHTML = HEART.map((h, i) => `<button type="button" role="radio" class="hchip" aria-checked="${i === 0}" data-heart="${h.k}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2c5 2 6.5 7 4 13-5-2-6.5-7-4-13z"/></svg>${esc(h.label)}</button>`).join('');
  const show = (k, animate) => {
    const h = HEART.find((x) => x.k === k);
    const list = h.ids.map((id) => byId[id]).filter(Boolean);
    const total = list.reduce((a, p) => a + (p.sizes[0].price || 0), 0);
    const ids = k === 'quran' ? 'endless-banquet-i-ii-iii-bundle' : list.map((p) => p.id).join(',');
    const sum = k === 'quran' ? 120 : total;
    const msg = `Salam ${site.brand}, my heart is carrying ${h.label.toLowerCase()}. I'd like: ${list.map((p) => p.name).join('; ')}. Total ${money(sum)}.`;
    out.innerHTML = `<p class="heart-line">${esc(h.line)}</p>
      <div class="heart-books n${list.length}">${list.map((p, i) => `<a class="hb" style="--i:${i};--n:${list.length}" href="${link(p)}">${book3d(p, { lazy: false })}<span class="hb-t">${esc(p.name)}<b>${price(p)}</b></span></a>`).join('')}</div>
      <div class="heart-acts"><button class="btn" type="button" data-add-to-cart data-id="${ids}" data-set-name="${esc(h.label)} books" data-open-cart>Add ${list.length > 1 ? (k === 'quran' ? 'the set' : 'all ' + list.length) : 'it'} to book bag · ${money(sum)}</button>
      <a class="link-arrow" href="${waLink(msg)}" target="_blank" rel="noopener">Ask a teacher's pick on WhatsApp <span aria-hidden="true">→</span></a></div>`;
    if (animate && gsap && !reduce) {
      gsap.fromTo(out.querySelectorAll('.hb'), { y: -60, rotate: (i) => (i % 2 ? 14 : -14), opacity: 0 }, { y: 0, rotate: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.2)', stagger: 0.09 });
      gsap.fromTo(out.querySelectorAll('.heart-line, .heart-acts'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.08, delay: 0.15 });
    }
  };
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('[data-heart]'); if (!b) return;
    chips.querySelectorAll('[data-heart]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    show(b.dataset.heart, true);
  });
  show('grief', false);
}

// ---------- 3. The season shelf ----------
{
  const section = document.querySelector('[data-season]');
  const stage = document.querySelector('[data-season-stage]');
  const ring = document.querySelector('[data-ring]');
  const card = document.querySelector('[data-season-card]');
  const steps = document.querySelector('[data-season-steps]');
  const total = (s) => s.ids.reduce((a, id) => a + (byId[id].sizes[0].price || 0), 0);
  const cardHTML = (s) => `<p class="sc-month"><span lang="ar">${AR[s.m - 1]}</span>${MONTHS[s.m - 1]}</p>
    <h3>${esc(s.label)}</h3><p class="sc-line">${esc(s.line)}</p>
    <div class="sc-covers">${s.ids.slice(0, 3).map((id) => book3d(byId[id])).join('')}</div>
    <ul class="sc-list">${s.ids.map((id) => `<li><a href="${link(byId[id])}">${esc(byId[id].name)}</a><b>${price(byId[id])}</b></li>`).join('')}</ul>
    <button class="btn" type="button" data-add-to-cart data-id="${s.ids.join(',')}" data-set-name="${esc(MONTHS[s.m - 1])} shelf" data-open-cart>Add this shelf · ${money(total(s))}</button>`;
  steps.innerHTML = STOPS.map((s) => `<li>${MONTHS[s.m - 1]}</li>`).join('');
  let idx = -1;
  const setStop = (i, anim) => {
    if (i === idx) return; idx = i;
    const s = STOPS[i];
    if (anim && gsap && !reduce) {
      gsap.to(card, { opacity: 0, y: -10, duration: 0.18, ease: 'power2.in', onComplete: () => { card.innerHTML = cardHTML(s); gsap.fromTo(card, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }); } });
    } else card.innerHTML = cardHTML(s);
    [...steps.children].forEach((li, k) => li.classList.toggle('is-on', k === i));
  };

  // The ring: 12 months, this month marked in gold; it turns so the shelf's month meets the leaf pointer.
  let R = 300, cx = 0, cy = 0, phoneR = false;
  const drawRing = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    phoneR = w <= 800;
    R = phoneR ? w * 0.62 : Math.min(h * 0.6, w * 0.27);
    cx = phoneR ? w / 2 : R * 0.3; cy = phoneR ? -R * 0.38 : h / 2;
    if (!phoneR) stage.style.setProperty('--ring-r', `${Math.round(cx + R + 64)}px`);
    ring.setAttribute('viewBox', `0 0 ${w} ${h}`);
    let g = `<circle cx="${cx}" cy="${cy}" r="${R}" class="r-line"/><circle cx="${cx}" cy="${cy}" r="${R * 0.78}" class="r-line r-thin"/><g class="r-turn" style="transform-origin:${cx}px ${cy}px">`;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * 360;
      const isNow = k + 1 === hMonth, isStop = STOPS.some((s) => s.m === k + 1);
      g += `<g transform="rotate(${a} ${cx} ${cy})"><line x1="${cx + R - 10}" y1="${cy}" x2="${cx + R + 10}" y2="${cy}" class="r-tick${isStop ? ' is-stop' : ''}"/>
        <text x="${cx + R * 0.89}" y="${cy}" class="r-en${isStop ? ' is-stop' : ''}" text-anchor="middle" dominant-baseline="middle" transform="rotate(90 ${cx + R * 0.89} ${cy})">${MONTHS[k]}</text>
        <text x="${cx + R * 0.66}" y="${cy}" class="r-ar" text-anchor="middle" dominant-baseline="middle" transform="rotate(90 ${cx + R * 0.66} ${cy})">${AR[k]}</text>
        ${isNow ? `<circle cx="${cx + R}" cy="${cy}" r="7" class="r-now"/><text x="${cx + R + 18}" y="${cy}" class="r-nowt" dominant-baseline="middle" transform="rotate(90 ${cx + R + 18} ${cy})" text-anchor="middle">now ${hYear}</text>` : ''}</g>`;
    }
    g += '</g>';
    const pa = phoneR ? 90 : 0; // pointer angle
    const px = cx + Math.cos(pa * Math.PI / 180) * (R + 26), py = cy + Math.sin(pa * Math.PI / 180) * (R + 26);
    g += `<path class="r-leaf" transform="translate(${px} ${py}) rotate(${pa + 90})" d="M0 -16c9 4 11 16 0 30C-11 0-9-12 0-16z"/>`;
    ring.innerHTML = g;
  };
  const turnTo = (v) => { // v: continuous stop index
    const i0 = Math.floor(v), i1 = Math.min(STOPS.length - 1, i0 + 1), f = v - i0;
    const m = STOPS[i0].m + (STOPS[i1].m - STOPS[i0].m) * f;
    const pa = phoneR ? 90 : 0;
    const t = ring.querySelector('.r-turn'); if (t) t.style.transform = `rotate(${pa - ((m - 1) / 12) * 360}deg)`;
  };
  drawRing();
  setStop(Math.max(0, STOPS.indexOf(thisStop)) || 0, false);

  if (reduce || !gsap || !ST) {
    section.classList.add('is-still');
    turnTo(Math.max(0, STOPS.indexOf(thisStop)));
    card.insertAdjacentHTML('afterend', `<div class="season-still">${STOPS.map((s) => `<div><p class="sc-month">${MONTHS[s.m - 1]}</p><div class="ss-books">${s.ids.slice(0, 3).map((id) => book3d(byId[id])).join('')}</div></div>`).join('')}</div>`);
  } else {
    let target = 0, v = 0, visible = false, phone = innerWidth <= 800;
    setStop(0, false);
    const plateau = (p) => { const f = p * (STOPS.length - 1); const i = Math.min(STOPS.length - 2, Math.floor(f)); const fr = f - i; const t = Math.min(1, Math.max(0, (fr - 0.3) / 0.4)); return i + t * t * (3 - 2 * t); };
    ST.create({ trigger: section, start: () => `top top+=${document.querySelector('[data-head]').getBoundingClientRect().height}`, end: () => `+=${innerHeight * (phone ? 2 : 3)}`, pin: true, anticipatePin: 1, invalidateOnRefresh: true, onUpdate: (s) => { target = plateau(s.progress); }, onRefresh: () => { drawRing(); turnTo(v); } });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '80px' }).observe(stage);
    addEventListener('resize', () => { phone = innerWidth <= 800; drawRing(); });

    // 3D: borrow the hero's one WebGL canvas.
    let gl = null, scene, camera, books = [], plank, W = 1, H = 1, D = 1, tPrev = performance.now();
    const setup = () => {
      gl = window.__igpGL; if (!gl || scene) return;
      const { THREE } = gl;
      scene = new THREE.Scene(); scene.environment = gl.env;
      camera = new THREE.PerspectiveCamera(26, 1, 10, 6000);
      const key = new THREE.DirectionalLight(0xffffff, 1.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 10; key.shadow.blurSamples = 12;
      scene.add(key, key.target); scene.userData.key = key;
      const warm = new THREE.PointLight(0xffd36a, 1.2, 0, 0); scene.add(warm); scene.userData.warm = warm;
      const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.09 })); back.receiveShadow = true; back.position.z = -60; scene.add(back); scene.userData.back = back;
      plank = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, envMapIntensity: 0.6 }));
      plank.receiveShadow = true; plank.castShadow = true; scene.add(plank);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x13958f, roughness: 0.5 }));
      scene.add(lip); scene.userData.lip = lip;
      STOPS.forEach((s, k) => s.ids.forEach((id, j) => {
        const { mesh } = gl.makeBookMesh(id);
        mesh.receiveShadow = true; scene.add(mesh);
        books.push({ mesh, k, j, n: s.ids.length, ph: Math.random() * 6 });
      }));
      layout();
    };
    const layout = () => {
      if (!scene) return;
      const { THREE } = gl;
      W = stage.clientWidth; H = stage.clientHeight;
      D = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.aspect = W / H; camera.position.set(0, 0, D); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
      const key = scene.userData.key; key.position.set(-W * 0.3, H * 0.8, 1400);
      const sc = key.shadow.camera; sc.left = -W; sc.right = W; sc.top = H; sc.bottom = -H; sc.near = 200; sc.far = 3500; sc.updateProjectionMatrix();
      scene.userData.back.scale.set(W * 3, H * 3, 1);
      const cr = card.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const left = phone ? 16 : cr.right - sr.left + 40, right = W - (phone ? 16 : Math.max(32, W * 0.03));
      const areaW = right - left;
      const shelfY = phone ? -H * 0.02 : -H * 0.2;
      const bw = Math.min(H * 0.42 / 1.5, areaW / (1.12 * 3 + 1) / 1.04);
      scene.userData.geo = { cx: left + areaW / 2 - W / 2, shelfY, bw, areaW };
      const bh = bw * 1.5;
      plank.scale.set(areaW * 0.98, 14, 110); plank.position.set(scene.userData.geo.cx, shelfY - 7, 0);
      scene.userData.lip.scale.set(areaW * 0.98, 4, 4); scene.userData.lip.position.set(scene.userData.geo.cx, shelfY - 12, 56);
      scene.userData.warm.position.set(scene.userData.geo.cx, shelfY + bh * 1.2, 420);
    };
    addEventListener('igp-gl', setup);
    setup();
    addEventListener('resize', () => setTimeout(layout, 140));

    const frame = () => {
      requestAnimationFrame(frame);
      const tn = performance.now(), dt = Math.min((tn - tPrev) / 1000, 0.1); tPrev = tn;
      v += (target - v) * (1 - Math.pow(0.86, dt * 60));
      if (Math.abs(target - v) < 0.0005) v = target;
      if (!visible) return;
      turnTo(v);
      setStop(Math.round(v), true);
      if (!scene || phone) return;
      const { renderer, canvas } = gl;
      if (canvas.parentNode !== stage) { stage.insertBefore(canvas, stage.firstChild); layout(); renderer.setSize(W, H, false); }
      const g = scene.userData.geo, t = tn / 1000;
      books.forEach((b) => {
        const d = b.k - v; // 0 = on the shelf, (0,1] waiting above, [-1,0) sliding away
        const m = b.mesh;
        if (d > 1 || d < -1) { m.visible = false; return; }
        m.visible = !!m.material[4].map;
        const span = g.bw * 1.12, x0 = g.cx - (span * (b.n - 1)) / 2 + b.j * span;
        let x = x0, y = g.shelfY + g.bw * 0.75, z = 20 - Math.abs(b.j - (b.n - 1) / 2) * 18, rz = 0, ry = (b.j - (b.n - 1) / 2) * -0.16 + Math.sin(t * 0.5 + b.ph) * 0.03;
        if (d > 0) { const e = d * d; y += e * H * 0.9 + b.j * 30 * d; rz = d * (b.j % 2 ? 0.5 : -0.4); }
        if (d < 0) { const e = -d; x += e * W * 0.55 + b.j * 40 * e; rz = -e * 0.9; y -= e * e * 80; ry += e * 0.8; }
        m.position.set(x, y, z); m.rotation.set(0, ry, rz); m.scale.setScalar(g.bw);
      });
      renderer.render(scene, camera);
    };
    requestAnimationFrame(frame);
  }
}

// ---------- Review book ----------
{
  const el = document.querySelector('[data-review-book]');
  if (el && byId['al-shamail-al-muhammadiyya']) el.innerHTML = `<a href="${link(byId['al-shamail-al-muhammadiyya'])}">${book3d(byId['al-shamail-al-muhammadiyya'])}</a>`;
}
