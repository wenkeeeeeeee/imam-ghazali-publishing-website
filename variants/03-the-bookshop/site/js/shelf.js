// V3 · The Bookshop — "Gather" hero. Real IGP covers as 3D books drift in a pile, then fly onto a white wall of
// shelves by subject, this Hijri month's shelf lights up, and one book comes forward with its price.
import * as THREE from './vendor/three.module.js';
import { products, byId, esc, money, addBtn } from './app.js';
import { lenis as sharedLenis } from './scroll.js';
const SPINES = await fetch('data/spines.json').then((r) => r.json()).catch(() => ({}));

const stage = document.querySelector('[data-stage]');
const gather = document.querySelector('[data-gather]');
if (stage) init();

function init() {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wallEl = stage.querySelector('[data-wall]');
  const featureEl = stage.querySelector('[data-feature]');
  const copyEl = stage.querySelector('[data-copy]');
  const ribbon = stage.querySelector('[data-ribbon] path');
  const glow = stage.querySelector('[data-glow]');
  const cue = stage.querySelector('[data-cue]');
  const canvas = stage.querySelector('[data-gl]');
  const head = document.querySelector('[data-head]');

  // ---------- This Hijri month (Umm al-Qura) ----------
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', year: 'numeric' }).formatToParts(now);
  const hMonth = +(parts.find((x) => x.type === 'month') || { value: 6 }).value;
  const hYear = (parts.find((x) => x.type === 'year') || { value: '' }).value;
  const arMonth = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { month: 'long' }).format(now);
  const MONTHS = ['Muharram', 'Safar', "Rabiʿ al-Awwal", "Rabiʿ al-Akhir", 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Shaʿban", 'Ramadan', 'Shawwal', "Dhu al-Qaʿdah", 'Dhu al-Hijjah'];
  const ISRA = ['isra-miraj-the-night-journey-ascension-of-the-prophet-muhamm', 'forgotten-moments-from-the-isra-miraj', 'prophets-night-journey-and-heavenly-ascent'];
  const SEASONS = {
    3: { label: 'For Mawlid', line: 'Salawat and qasaʾid for the month of the Prophet’s ﷺ birth', ids: ['qasaid-for-rabi-al-awwal-the-ahmadan-outpouring', 'complete-elation-happiness-through-the-birth-of-the-locus-of', 'seeking-hope-success-through-reading-about-the-messenger-his'], q: 'Rabi' },
    6: { label: 'Rajab is near', line: 'Read the Night Journey before Rajab begins', ids: ISRA, q: 'Isra' },
    7: { label: 'For Rajab', line: 'The month of the Night Journey and Ascent', ids: ISRA, q: 'Isra' },
    8: { label: 'For Shaʿban', line: 'Between Rajab and Ramadan, the month often overlooked', ids: ['blessed-month-of-shaban', 'ramadan-revealed', 'recitation-of-the-glorious-quran-its-virtues-etiquettes-and'], q: 'Sha' },
    9: { label: 'For Ramadan', line: 'Fasting, the Qurʾan and the nights of the month', ids: ['ramadan-revealed', 'endless-banquet-volume-i', 'recitation-of-the-glorious-quran-its-virtues-etiquettes-and'], q: 'Ramadan' },
  };
  const AUTHORS = {
    'isra-miraj-the-night-journey-ascension-of-the-prophet-muhamm': 'Shaykh Muhammad al-Mahi ʿAli Cissé',
    'prophets-night-journey-and-heavenly-ascent': 'Shaykh Muhammad ʿAlawi al-Maliki',
  };
  // Covers whose shop image is not a front-on mockup (flattening fails): kept off the 3D shelf.
  const NO_TEX = new Set(['burdah-of-busiri-leather-pu-case', 'sirah-of-the-prophet', 'endless-banquet-i-ii-iii-bundle', 'in-the-company-of-the-quran-an-explanation-of-surah-al-anbiy', 'overachievers-ramadan-a-blueprint-for-success', 'miracles-of-the-prophet-muhammad-gems-from-the-shifa', 'virtues-of-the-sacred-land-of-the-masjid-al-aqsa-compound-an', 'story-of-the-blessed-birth-of-the-prophet-muhammad-and-his-b', 'english-burdah-a-singable-translation-of-imam-al-busiris-cla', 'glad-tidings-of-good-things-ebook']);
  // Free ebooks that share their print edition's cover.
  const TEX_OF = { 'introduction-to-islamic-creed-ebook': 'introduction-to-islamic-creed-bajuris-epistle', 'morning-evening-invocations-and-the-ten-sevens-before-sunris-2': 'morning-evening-invocations-and-the-ten-sevens-before-sunris' };
  const coverOf = (id) => `assets/covers/${TEX_OF[id] || id}.webp`;
  const ok = (p) => !NO_TEX.has(p.id);
  const byNew = (a, b) => (b.featured - a.featured) || String(b.released).localeCompare(String(a.released));

  let season = SEASONS[hMonth];
  if (!season) {
    const fresh = products.filter((p) => ok(p) && !p.free).sort((a, b) => String(b.released).localeCompare(String(a.released))).slice(0, 3);
    season = { label: 'New on the shelf', line: 'The latest titles from IGP', ids: fresh.map((p) => p.id), q: '' };
  }
  season.ids = season.ids.filter((id) => byId[id]);
  const featureId = season.ids[0];
  const used = new Set(season.ids);

  // ---------- The wall: 10 bays ----------
  const BAYS = [
    { key: "Qur'an", label: "Qur'an", href: "shop.html?cat=Qur'an" },
    { key: 'Hadith', label: 'Hadith', href: 'shop.html?cat=Hadith' },
    { key: 'season' },
    { key: 'Sīrah & the Prophet ﷺ', label: 'Sīrah & the Prophet ﷺ', href: 'shop.html?cat=' + encodeURIComponent('Sīrah & the Prophet ﷺ') },
    { key: 'Spirituality & Belief', label: 'Spirituality & Belief', href: 'shop.html?cat=' + encodeURIComponent('Spirituality & Belief'), desk: true },
    { key: 'Salawat & Poetry', label: 'Salawat & Poetry', href: 'shop.html?cat=' + encodeURIComponent('Salawat & Poetry'), desk: true },
    { key: 'Family & Character', label: 'Family & Character', href: 'shop.html?cat=' + encodeURIComponent('Family & Character'), desk: true },
    { key: 'Life & Seasons', label: 'Life & Seasons', href: 'shop.html?cat=' + encodeURIComponent('Life & Seasons'), desk: true },
    { key: 'bm', label: 'Bahasa Melayu', href: 'shop.html?lang=' + encodeURIComponent('Bahasa Melayu') },
    { key: 'free', label: 'Free ebooks', href: 'ebooks.html' },
  ];
  const pool = (b) => b.key === 'bm' ? products.filter((p) => p.language === 'Bahasa Melayu')
    : b.key === 'free' ? products.filter((p) => p.free)
    : products.filter((p) => p.category === b.key && p.language !== 'Bahasa Melayu');
  BAYS.forEach((b) => {
    if (b.key === 'season') { b.ids = season.ids.slice(0, 3); return; }
    const all = pool(b);
    b.count = all.length;
    b.ids = all.filter((p) => ok(p) && !used.has(p.id)).sort(byNew).slice(0, 3).map((p) => p.id);
    b.ids.forEach((id) => used.add(id));
  });
  wallEl.innerHTML = BAYS.map((b, i) => {
    const imgs = b.ids.map((id) => `<img src="${coverOf(id)}" alt="${esc(byId[id].name)}" data-book="${esc(id)}" width="100" height="150" loading="lazy">`).join('');
    const label = b.key === 'season'
      ? `<a class="bay-label" href="shop.html?q=${encodeURIComponent(season.q)}"><b>${esc(season.label)}</b><small><span lang="ar" class="ar-m">${esc(arMonth)}</span> ${esc(hYear)}</small></a>`
      : `<a class="bay-label" href="${b.href}"><b>${esc(b.label)}</b><small>${b.key === 'free' ? `${b.count} free` : `${b.count} titles`}</small></a>`;
    return `<div class="bay${b.key === 'season' ? ' is-season' : ''}${b.desk ? ' is-desk' : ''}" data-bay="${i}"><div class="bay-books">${imgs}</div>${label}</div>`;
  }).join('');
  const bays = [...wallEl.querySelectorAll('.bay')];
  const seasonBay = wallEl.querySelector('.is-season');
  const labels = [...wallEl.querySelectorAll('.bay-label')];

  // ---------- The feature card ----------
  const fp = byId[featureId];
  if (fp) {
    featureEl.innerHTML = `<p class="f-season"><i lang="ar">${esc(arMonth)}</i> ${esc(MONTHS[hMonth - 1])} ${esc(hYear)} · ${esc(season.label)}</p>
      <h2>${esc(fp.name)}</h2>
      <p class="f-by">${esc(AUTHORS[fp.id] || fp.author || '')}${(AUTHORS[fp.id] || fp.author) ? ' · ' : ''}${esc(season.line)}</p>
      <div class="f-buy"><p class="f-price">${fp.free ? 'Free' : money(fp.sizes[0].price)}<small>${esc(fp.sizes[0].label)} · checkout in RM</small></p>${addBtn(fp, 'Add to book bag')}</div>
      <p class="f-more"><a class="link-arrow" href="product.html?id=${encodeURIComponent(fp.id)}">Look inside this book <span aria-hidden="true">→</span></a></p>`;
  }

  // ---------- Book sizes from the space below the copy ----------
  // The teal bookmark ribbon: drawn in real pixels so it sweeps through the headline at any size.
  function sizeRibbon() {
    const svg = ribbon.ownerSVGElement, r = svg.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    svg.setAttribute('viewBox', `0 0 ${w.toFixed(0)} ${h.toFixed(0)}`);
    const P = (x, y) => `${(x * w).toFixed(1)} ${(y * h).toFixed(1)}`;
    ribbon.setAttribute('d', `M ${P(-0.04, 0.84)} C ${P(0.2, 0.76)}, ${P(0.3, 0.32)}, ${P(0.52, 0.36)} S ${P(0.82, 0.64)}, ${P(1.04, 0.1)}`);
  }
  function sizeWall() {
    sizeRibbon();
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const phone = sw <= 800;
    const rows = phone ? 3 : 2;
    const cols = phone ? 2 : 5;
    const gap = phone ? 6 : Math.round(Math.min(14, sw * 0.008));
    const colGap = parseFloat(getComputedStyle(wallEl).columnGap) || 20;
    const bayW = (wallEl.clientWidth - colGap * (cols - 1)) / cols;
    const top = copyEl.getBoundingClientRect().bottom - stage.getBoundingClientRect().top + (phone ? 22 : 34);
    const bottom = phone ? 12 : 18;
    const labelH = phone ? 44 : 50;
    const avail = sh - top - bottom - rows * labelH - (rows - 1) * 6;
    let w = Math.min((bayW - gap * 2) / 3, avail / rows / 1.5);
    w = Math.max(phone ? 34 : 56, Math.floor(w));
    const need = rows * (w * 1.5 + labelH) + (rows - 1) * 6;
    const free = sh - top - need;
    wallEl.style.bottom = Math.max(phone ? 12 : 18, Math.min(free * 0.45, 70)) + 'px';
    wallEl.style.setProperty('--book-w', w + 'px');
    wallEl.style.setProperty('--book-h', Math.round(w * 1.5) + 'px');
    wallEl.style.setProperty('--book-gap', gap + 'px');
  }
  sizeWall();

  const glOK = !reduce && window.__glOK && window.__glOK();
  if (!glOK) { still(); return; }

  // ---------- three.js ----------
  const renderer = window.__glTrack(new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }));
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 10, 6000);

  // A soft studio for reflections on the laminated covers.
  {
    const pm = new THREE.PMREMGenerator(renderer);
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x8a9796, side: THREE.BackSide })));
    const panel = (w, h, x, y, z, ry, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; m.lookAt(0, 0, 0); env.add(m); };
    panel(6, 3, -3, 3.5, 3, 0, 0xffffff);
    panel(3, 5, 4.6, 1, 1, 0, 0xf2fbfa);
    panel(8, 1.2, 0, 4.9, 0, 0, 0xffffff);
    scene.environment = pm.fromScene(env, 0.035).texture;
    pm.dispose();
  }
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 14; key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0006;
  scene.add(key, key.target);
  const goldLight = new THREE.PointLight(0xffc533, 0, 0, 0);
  scene.add(goldLight);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.1 }));
  back.receiveShadow = true;
  back.position.z = -70;
  scene.add(back);

  // Page block textures (fore-edge lines run with the height, top/bottom lines run with the width).
  function pageTex(vertical) {
    const c = document.createElement('canvas'); c.width = vertical ? 64 : 256; c.height = vertical ? 256 : 64;
    const g = c.getContext('2d');
    g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(90,86,74,${0.05 + Math.random() * 0.1})`;
      const t = Math.random() * (vertical ? c.width : c.height);
      vertical ? g.fillRect(t, 0, 1, c.height) : g.fillRect(0, t, c.width, 1);
    }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }
  const edgeV = pageTex(true), edgeH = pageTex(false);
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // Every book on the wall, plus the feature.
  const ids = [];
  bays.forEach((bay) => bay.querySelectorAll('[data-book]').forEach((img) => ids.push({ id: img.dataset.book, img, bay })));
  const HARD = new Set(['maghazi-of-sayyiduna-muhammad-gold-premium', 'al-shamail-al-muhammadiyya', 'mukhtasar-sahih-al-bukhari-ibn-abi-jamrah']);
  const rand = mulberry(7);
  let loaded = 0;
  function makeBookMesh(id, onReady) {
    const depth = HARD.has(id) ? 0.17 : 0.11;
    const geo = new THREE.BoxGeometry(1, 1.5, depth);
    const front = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0, envMapIntensity: 0.32, transparent: true });
    const spine = new THREE.MeshStandardMaterial({ color: 0x1b4a47, roughness: 0.5, envMapIntensity: 0.4, transparent: true });
    const backM = new THREE.MeshStandardMaterial({ color: 0x1b4a47, roughness: 0.5, envMapIntensity: 0.3, transparent: true });
    const pagesV = new THREE.MeshStandardMaterial({ map: edgeV, roughness: 0.9, envMapIntensity: 0.2, transparent: true });
    const pagesH = new THREE.MeshStandardMaterial({ map: edgeH, roughness: 0.9, envMapIntensity: 0.2, transparent: true });
    const mesh = new THREE.Mesh(geo, [pagesV, spine, pagesH, pagesH, front, backM]);
    mesh.castShadow = true;
    mesh.visible = false;
    const load = (tries) => loader.load(coverOf(id), (tx) => {
      tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = maxAniso;
      front.map = tx; front.needsUpdate = true;
      spine.color.set(SPINES[id] || '#1b4a47'); backM.color.set(SPINES[id] || '#1b4a47').multiplyScalar(0.85);
      mesh.visible = true; onReady && onReady(true);
    }, undefined, () => { if (tries < 3) setTimeout(() => load(tries + 1), 700); else onReady && onReady(false); });
    load(0);
    return { mesh, mats: [front, spine, backM, pagesV, pagesH] };
  }
  const books = ids.map((b, i) => {
    const { mesh, mats } = makeBookMesh(b.id, () => { loaded++; });
    const [front, spine, backM, pagesV, pagesH] = mats;
    scene.add(mesh);
    return {
      ...b, mesh, mats: [front, spine, backM, pagesV, pagesH], isSeason: b.bay === seasonBay, isFeature: b.id === featureId,
      order: i, ph: rand() * 6.28, pile: null, wall: null, off: new THREE.Vector2(), offT: new THREE.Vector2(),
      q0: new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 1.1, (rand() - 0.5) * 1.6, (rand() - 0.5) * 1.3)),
      spin: (rand() - 0.5) * 0.25, delay: rand(),
    };
  });
  const feature = books.find((b) => b.isFeature);

  // The one WebGL canvas is lent to the season shelf further down the page (see home.js).
  window.__igpGL = { THREE, renderer, canvas, env: scene.environment, makeBookMesh, coverOf };
  window.dispatchEvent(new Event('igp-gl'));

  // ---------- Layout ----------
  let W = 1, H = 1, D = 1, phone = false;
  const layoutBooks = () => {
    sizeWall();
    W = stage.clientWidth; H = stage.clientHeight; phone = W <= 800;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    D = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, D); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    key.position.set(-W * 0.35, H * 0.7, 1400); key.target.position.set(0, 0, 0);
    const sc = key.shadow.camera; sc.left = -W; sc.right = W; sc.top = H; sc.bottom = -H; sc.near = 200; sc.far = 3500; sc.updateProjectionMatrix();
    back.scale.set(W * 3, H * 3, 1);
    const sr = stage.getBoundingClientRect();
    const toWorld = (r) => ({ x: r.left - sr.left + r.width / 2 - W / 2, y: H / 2 - (r.top - sr.top + r.height / 2), w: r.width, h: r.height });
    // Copy rectangle to keep the pile off the words.
    const keeps = [copyEl.querySelector('.welcome'), copyEl.querySelector('.gather-side')].map((el) => { const r = el.getBoundingClientRect(); return { l: r.left - sr.left - 34, r: r.right - sr.left + 34, t: -999, b: r.bottom - sr.top + 26 }; });
    const bookW = parseFloat(wallEl.style.getPropertyValue('--book-w')) || 100;
    const pileW = bookW * (phone ? 1.25 : 1.2);
    const placed = [];
    const rr = mulberry(11);
    books.forEach((b) => {
      const r = b.img.getBoundingClientRect();
      b.wall = r.width ? toWorld(r) : null; // hidden bay (phones): leaves the frame
      if (b.isFeature) {
        b.pile = phone ? { x: W * 0.16, y: -H * 0.2, z: 300, s: pileW * 1.5 } : { x: W * 0.2, y: -H * 0.12, z: 330, s: pileW * 1.55 };
        return;
      }
      let best = null, bestScore = -1;
      for (let k = 0; k < 40; k++) {
        const z = -10 + rr() * 260;
        const f = D / (D - z);
        const sx = (rr() * 1.12 - 0.56) * W, sy = (rr() * 1.15 - 0.6) * H; // screen-space centre (from stage centre)
        const px = sx + W / 2, py = H / 2 - sy;
        const hw = pileW * f * 0.5, hh = pileW * 1.5 * f * 0.5;
        if (keeps.some((k) => px + hw > k.l && px - hw < k.r && py - hh < k.b)) continue; // overlaps the words
        let dmin = 1e9; placed.forEach((p) => { dmin = Math.min(dmin, Math.hypot(p.x - sx, p.y - sy) / ((p.s + hw) || 1)); });
        const score = placed.length ? dmin : 1;
        if (score > bestScore) { bestScore = score; best = { x: sx / f, y: sy / f, z, s: pileW, sx, sy, hw }; }
      }
      if (!best) best = { x: (rr() - 0.5) * W, y: -H * 0.3, z: 0, s: pileW, sx: 0, sy: 0, hw: 40 };
      placed.push({ x: best.sx, y: best.sy, s: best.hw });
      b.pile = best;
    });
    if (feature) {
      feature.end = phone ? { x: W * 0.02, y: H * 0.13, z: 160, s: Math.min(W * 0.38, H * 0.26) } : { x: W * 0.12, y: -H * 0.01, z: 140, s: H * 0.48 };
    }
    const gr = seasonBay.getBoundingClientRect();
    const gs = Math.max(gr.width, gr.height) * 1.9;
    glow.style.width = gs + 'px'; glow.style.height = gs + 'px';
    glow.style.transform = `translate(${gr.left - sr.left + gr.width / 2 - gs / 2}px, ${gr.top - sr.top + gr.height * 0.36 - gs / 2}px)`;
    const sw = toWorld(gr);
    goldLight.position.set(sw.x, sw.y + gr.height * 0.25, 220);
  };
  layoutBooks();

  // ---------- Scroll ----------
  let target = 0, prog = 0, intro = 0, introStart = 0;
  const lenis = sharedLenis;
  const gsap = window.gsap, ST = window.ScrollTrigger;
  let st = null;
  if (gsap && ST) {
    const headH = () => head.getBoundingClientRect().height;
    st = ST.create({
      trigger: gather, start: () => `top top+=${headH()}`, end: () => `+=${innerHeight * (phone ? 1.3 : 2)}`,
      pin: true, pinSpacing: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 2,
      onUpdate: (s) => { target = s.progress; },
      
    });
  }
  addEventListener('scroll', () => { head.classList.toggle('is-scrolled', scrollY > 4); head.classList.toggle('show-subjects', !!st && scrollY > st.end + 60); }, { passive: true });
  let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { layoutBooks(); ST && ST.refresh(); }, 120); });

  // Cursor: nudges the pile.
  const mouse = new THREE.Vector2(9999, 9999), mouseS = new THREE.Vector2(9999, 9999);
  stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); mouse.set(e.clientX - r.left - W / 2, H / 2 - (e.clientY - r.top)); if (mouseS.x > 9000) mouseS.copy(mouse); });
  stage.addEventListener('pointerleave', () => mouse.set(9999, 9999));

  // ---------- Frame ----------
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const span = (v, a, b) => clamp01((v - a) / (b - a));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out3 = (t) => 1 - Math.pow(1 - t, 3);
  const qI = new THREE.Quaternion(), qT = new THREE.Quaternion(), qS = new THREE.Quaternion(), eul = new THREE.Euler();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(stage);
  let tPrev = performance.now() / 1000, tNow = 0;
  let lastStyle = '';

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    if (canvas.parentNode !== stage) { stage.insertBefore(canvas, copyEl); layoutBooks(); }
    const tn = performance.now() / 1000, dt = Math.min(tn - tPrev, 0.1); tPrev = tn; tNow += dt; const t = tNow;
    if (!introStart && (loaded >= books.length || t > 1.6)) { introStart = t; root.classList.add('is-open'); }
    intro = introStart ? clamp01((t - introStart) / 1.0) : 0;
    prog += (target - prog) * (1 - Math.pow(1 - 0.14, dt * 60));
    if (Math.abs(target - prog) < 0.0005) prog = target;
    const p = prog;
    mouseS.lerp(mouse, 0.1);

    const gAll = span(p, 0.04, 0.31);
    const glowT = ease(span(p, 0.44, 0.57));
    const featT = ease(span(p, 0.72, 0.92));
    const fadeOthers = ease(span(p, 0.74, 0.88));

    books.forEach((b) => {
      if (!b.pile) return;
      const m = b.mesh;
      // Drop-in on opening: staggered, within one second.
      const di = out3(clamp01((intro - b.delay * 0.42) / 0.55));
      // Flight to the shelf, staggered by column.
      const g = ease(span(p, 0.04 + b.delay * 0.12, 0.19 + b.delay * 0.12));
      const rest = 1 - g;
      // Pile drift + cursor nudge.
      const dx = Math.sin(t * 0.33 + b.ph) * 14, dy = Math.cos(t * 0.27 + b.ph * 1.3) * 16;
      const f = D / (D - b.pile.z);
      const sx = (b.pile.x + b.off.x) * f - mouseS.x, sy = (b.pile.y + b.off.y) * f - mouseS.y;
      const dist = Math.hypot(sx, sy), R = 240;
      if (dist < R && rest > 0.5) { const k = Math.pow(1 - dist / R, 2) * 90; b.offT.set((sx / (dist || 1)) * k, (sy / (dist || 1)) * k); } else b.offT.set(0, 0);
      b.off.lerp(b.offT, 0.06);
      const pile = b.pile;
      let px = pile.x + dx + b.off.x, py = pile.y + dy + b.off.y, pz = pile.z, ps = pile.s;
      // pile rotation (drift + nudge + the slow turn of the front book)
      if (b.isFeature) eul.set(0.08 + Math.sin(t * 0.4) * 0.05, -0.55 + Math.sin(t * 0.22) * 0.5, 0.05);
      else eul.set(Math.sin(t * 0.21 + b.ph) * 0.12 + b.off.y * -0.004, t * b.spin * 0.4 + b.off.x * 0.006, Math.cos(t * 0.19 + b.ph) * 0.08);
      qT.setFromEuler(eul); qS.copy(b.q0); if (b.isFeature) qS.identity(); qS.multiply(qT);
      // drop from above
      py += (1 - di) * (H * 0.95 + pile.z * 0.5);

      let x = px, y = py, z = pz, s = ps;
      const w = b.wall;
      if (w) {
        const hop = Math.sin(Math.PI * g) * 140;
        x = px + (w.x - px) * g; y = py + (w.y - py) * g; z = pz + (0 - pz) * g + hop; s = ps + (w.w - ps) * g;
        // the lit shelf steps forward a little
        if (b.isSeason) { z += glowT * 26 * (1 - featT); }
      } else {
        x = px + (px > 0 ? W : -W) * g; z = pz;
      }
      m.quaternion.copy(qS).slerp(qI, w ? g : 0);
      if (w && g >= 1) m.quaternion.setFromEuler(eul.set(Math.sin(t * 0.6 + b.ph) * 0.006, 0, 0));
      // Feature comes forward.
      if (b.isFeature && feature.end) {
        const e = feature.end, a = featT;
        x += (e.x - x) * a; y += (e.y - y) * a; z += (e.z - z) * a + Math.sin(Math.PI * a) * 80; s += (e.s - s) * a;
        if (a > 0) { qT.setFromEuler(eul.set(0.04 * a, (0.3 + Math.sin(t * 0.35) * 0.07) * a, 0)); m.quaternion.slerp(qT, a); }
      }
      if (!b.isFeature) z -= fadeOthers * 160;
      m.position.set(x, y, z);
      m.scale.setScalar(s);
      // light: others dim when this month's shelf glows, then fade back when the feature comes forward
      const dim = b.isSeason ? 1 : 1 - glowT * 0.28 * (1 - fadeOthers);
      const op = b.isFeature ? 1 : 1 - fadeOthers;
      b.mats.forEach((mt) => { mt.opacity = op; });
      b.mats[0].color.setScalar(dim);
      m.castShadow = op > 0.5;
      m.visible = op > 0.01 && !!b.mats[0].map;
    });
    goldLight.intensity = glowT * (1 - fadeOthers) * 2.2;
    back.material.opacity = 0.035 + 0.075 * gAll;

    // DOM states (cheap writes, only when changed)
    const lab = span(p, 0.22, 0.32), rib = ease(span(p, 0.1, 0.33));
    const style = [lab, rib, glowT, featT, fadeOthers, p > 0.01].map((v) => (+v).toFixed(3)).join();
    if (style !== lastStyle) {
      lastStyle = style;
      labels.forEach((l, i) => {
        const isS = l.parentElement === seasonBay;
        const o = lab * (isS ? 1 : 1 - glowT * 0.5) * (1 - fadeOthers);
        l.style.opacity = o.toFixed(3);
        l.style.transform = `translateY(${((1 - lab) * 8).toFixed(1)}px)`;
        l.style.setProperty('--plank', ease(span(p, 0.12 + (i % 5) * 0.02, 0.28 + (i % 5) * 0.02)).toFixed(3));
        l.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
        if (isS) l.style.setProperty('--lit', glowT.toFixed(3));
      });
      ribbon.style.strokeDashoffset = (1 - rib).toFixed(4);
      ribbon.parentElement.style.opacity = (Math.min(1, rib * 20) * (1 - featT)).toFixed(3);
      glow.style.opacity = (glowT * (1 - fadeOthers)).toFixed(3);
      copyEl.style.opacity = (1 - featT).toFixed(3);
      copyEl.style.transform = `translateY(${(-30 * featT).toFixed(1)}px)`;
      copyEl.style.visibility = featT > 0.98 ? 'hidden' : '';
      const fc = span(p, 0.84, 0.96);
      featureEl.classList.toggle('is-on', fc > 0);
      featureEl.style.opacity = out3(fc).toFixed(3);
      featureEl.style.transform = phone ? `translateY(${((1 - out3(fc)) * 20).toFixed(1)}px)` : `translateY(calc(-50% + ${((1 - out3(fc)) * 20).toFixed(1)}px))`;
      if (cue) cue.style.opacity = (1 - span(p, 0, 0.06)).toFixed(3);
    }
    renderer.render(scene, camera);
  }
  ribbon.setAttribute('pathLength', '1');
  ribbon.style.strokeDasharray = '1';
  ribbon.style.strokeDashoffset = '1';
  requestAnimationFrame(frame);
  // Safety: never leave the copy hidden.
  setTimeout(() => root.classList.add('is-open'), 2200);

  function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- Still shelf (reduced motion or no WebGL) ----------
  function still() {
    stage.classList.add('no-gl');
    root.classList.add('is-open');
    canvas.remove();
    labels.forEach((l) => { l.style.opacity = 1; l.style.transform = 'none'; l.style.setProperty('--plank', 1); });
    ribbon.setAttribute('pathLength', '1'); ribbon.style.strokeDasharray = '1'; ribbon.style.strokeDashoffset = '0';
    const gr = seasonBay.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const gs = Math.max(gr.width, gr.height) * 1.9;
    glow.style.cssText = `width:${gs}px;height:${gs}px;opacity:1;transform:translate(${gr.left - sr.left + gr.width / 2 - gs / 2}px,${gr.top - sr.top + gr.height * 0.36 - gs / 2}px)`;
    if (cue) cue.remove();
    addEventListener('scroll', () => head.classList.toggle('is-scrolled', scrollY > 4), { passive: true });
  }
}
