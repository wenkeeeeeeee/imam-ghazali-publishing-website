// V2 · The Chain: one book holds the stage while the centuries change behind it.
// Scroll (3 screens, pinned): the book lifts apart into its pages and re-forms as each century's title;
// the gold chain runs from the logo's flame through each author's city to "you, in Kuala Lumpur".
import * as THREE from './vendor/three/three.module.js';
import Lenis from './vendor/lenis.mjs';

const hero = document.querySelector('[data-hero]');
if (hero) init();

function init() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const $ = (s) => hero.querySelector(s);
  const stage = $('[data-stage]');
  const canvas = $('[data-gl]');
  const yearEl = $('[data-year]');
  const arEl = $('[data-ar]');
  const chap = $('[data-chap]');
  const segs = [...document.querySelectorAll('[data-cbar] li')];
  const labels = [...$('[data-bead-labels]').children];
  const svg = $('[data-chain]');
  const ghost = $('[data-chain-ghost]'), gold = $('[data-chain-gold]'), links = $('[data-chain-links]');
  const beadG = $('[data-beads]');

  // Death years CE: to be checked against each book's introduction.
  const NOW = new Date().getFullYear();
  const C = [
    { year: 758, who: 'Musa ibn ‘Uqbah', ar: 'موسى بن عقبة', cover: 'maghazi', spine: '#141312', gilt: true, thick: 0.17,
      line: 'The earliest available work of Sīrah in existence.', title: 'The Maghāzī of Sayyidunā Muhammad ﷺ', ed: 'Gold Premium hardback', price: 'RM220', id: 'maghazi-of-sayyiduna-muhammad-gold-premium' },
    { year: 892, who: 'Imam al-Tirmidhi', ar: 'الإمام الترمذي', cover: 'shamail', spine: '#1d6c61', gilt: true, thick: 0.17,
      line: '415 hadiths on the beauty and perfection of the Prophet ﷺ, Arabic beside English.', title: "al-Shamā'il al-Muhammadiyya", ed: 'Hardback · pre-order', price: 'RM200', id: 'al-shamail-al-muhammadiyya' },
    { year: 1111, who: 'Imam al-Ghazali', ar: 'الإمام الغزالي', cover: 'oson', spine: '#1b2840', gilt: false, thick: 0.11,
      line: 'Timeless advice from al-Ghazali’s letter to his student, Ayyuhal Walad.', title: 'O Son!', ed: 'Paperback', price: 'RM40', id: 'o-son-a-translation-of-imam-al-ghazalis-ayyuhal-walad' },
    { year: 1277, who: 'Imam al-Nawawi', ar: 'الإمام النووي', cover: 'nawawi', spine: '#0f4b6c', gilt: false, thick: 0.12,
      line: 'Timeless wisdom and gems, translated with notes by Talut Dawood.', title: 'The 40 Hadith of Imam al-Nawawi', ed: 'Paperback', price: 'RM40', id: '40-hadith-of-imam-al-nawawi' },
    { year: NOW, today: true, who: 'Habib Umar bin Hafiz', ar: 'الحبيب عمر بن حفيظ', cover: 'who', spine: '#005d55', gilt: false, thick: 0.11,
      line: 'Questions and answers on the Sīrah. The chain reaches you, in Kuala Lumpur.', title: 'Who is the Prophet Muhammad ﷺ?', ed: 'Paperback', price: 'RM40', id: 'who-is-the-prophet-muhammad' },
  ];
  // Scroll progress at which each book is held (0% Maghazi, 33% Shama'il, 66% O Son!, then 40 Hadith, 100% today).
  const STOPS = [0, 0.33, 0.66, 0.82, 0.97];

  // ---------- Scroll ----------
  let lenis = null;
  if (!reduce) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    // One clock for smooth scroll and the GSAP pins: two separate loops drift a frame apart and pinned or
    // scrubbed sections shake.
    if (window.gsap) {
      window.gsap.ticker.add((time) => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const progress = () => {
    const r = hero.getBoundingClientRect();
    const run = hero.offsetHeight - innerHeight;
    return Math.min(1, Math.max(0, -r.top / run));
  };
  const toIndex = (p) => {
    for (let i = 0; i < STOPS.length - 1; i++) if (p <= STOPS[i + 1]) return i + (p - STOPS[i]) / (STOPS[i + 1] - STOPS[i]);
    return STOPS.length - 1;
  };
  // Century bar: click a segment to travel to that century.
  segs.forEach((li, i) => li.querySelector('button').addEventListener('click', () => {
    const y = hero.offsetTop + STOPS[i] * (hero.offsetHeight - innerHeight) + 2;
    lenis ? lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }));

  // ---------- Chain geometry ----------
  let beadPts = [], pathLen = 0, segLens = [];
  const flamePath = 'M0,-9 C5,-4 6,1 3.6,5 C2.2,7.4 -2.2,7.4 -3.6,5 C-6,1 -5,-4 0,-9 Z';
  function layoutChain() {
    const W = stage.clientWidth, H = stage.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const phone = W < 800;
    const logo = document.querySelector('[data-logo] img').getBoundingClientRect();
    // The logo's flame sits at about 17% across, 9% down the logo image.
    const fx = logo.left + logo.width * 0.17, fy = logo.top + logo.height * 0.16;
    const hy = phone ? H - 40 : H * 0.85; // the chain's horizon
    const gut = parseFloat(getComputedStyle(document.body).getPropertyValue('--gut')) || 48;
    const x0 = gut + (phone ? 6 : 10), x1 = W - gut - (phone ? 6 : 10);
    const n = 6;
    beadPts = Array.from({ length: n }, (_, i) => {
      const x = x0 + (x1 - x0) * (i / (n - 1));
      const sag = Math.sin((i / (n - 1)) * Math.PI) * (phone ? 6 : 14);
      return [x, hy + sag];
    });
    const top = document.querySelector('[data-cbar]').getBoundingClientRect().bottom - stage.getBoundingClientRect().top + 4;
    // From the flame, out under the header to the left margin, down to the first city, then city to city.
    let d = `M${fx},${fy + 10} C${fx},${top + 26} ${fx - 40},${top + 14} ${Math.max(x0 + 60, fx - 120)},${top + 14} L${x0 + 24},${top + 14} Q${x0},${top + 14} ${x0},${top + 38} L${x0},${beadPts[0][1]}`;
    for (let i = 1; i < n; i++) {
      const [ax, ay] = beadPts[i - 1], [bx, by] = beadPts[i];
      const mx = (ax + bx) / 2, my = Math.max(ay, by) + (phone ? 6 : 12);
      d += ` Q${mx},${my} ${bx},${by}`;
    }
    [ghost, gold, links].forEach((p) => p.setAttribute('d', d));
    pathLen = gold.getTotalLength();
    // Length along the path at each bead.
    segLens = beadPts.map(([bx, by]) => {
      let lo = 0, hi = pathLen;
      for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; const pt = gold.getPointAtLength(m); (pt.x < bx - 0.5 || pt.y < by - 30 ? (lo = m) : (hi = m)); }
      return hi;
    });
    gold.style.strokeDasharray = `${pathLen} ${pathLen}`;
    links.style.strokeDasharray = '0.1 11';
    beadG.innerHTML = beadPts.map(([x, y], i) => `<path class="bead" data-b="${i}" transform="translate(${x} ${y}) scale(${i === n - 1 ? 1.35 : 1.05})" d="${flamePath}"/>`).join('');
    labels.forEach((li, i) => {
      const [x, y] = beadPts[i];
      li.style.left = (i === n - 1 ? x + 8 : x) + 'px';
      li.style.top = (y + (phone ? 11 : 16)) + 'px';
    });
    if (phone) labels.forEach((li, i) => { li.style.display = i === 0 || i === n - 1 ? "" : "none"; });
  }

  // ---------- Text per chapter ----------
  let shown = 0;
  const set = (sel, v) => { const el = chap.querySelector(sel); if (el) el.textContent = v; };
  function showChapter(i) {
    if (i === shown) return;
    shown = i;
    chap.classList.add('is-out');
    clearTimeout(showChapter.t);
    showChapter.t = setTimeout(() => {
      const c = C[i];
      set('[data-c-year]', c.today ? 'Today' : c.year);
      set('[data-c-who]', c.who);
      set('[data-c-line]', c.line);
      set('[data-c-title]', c.title);
      set('[data-c-ed]', c.ed);
      set('[data-c-price]', c.price);
      chap.querySelector('[data-c-link]').href = `product.html?id=${encodeURIComponent(c.id)}`;
      arEl.textContent = c.ar;
      chap.classList.remove('is-out');
    }, reduce ? 0 : 380);
  }

  // ---------- 3D book ----------
  let gl = null;
  if (window.__glOK && window.__glOK()) {
    try { gl = makeBook(); root.classList.add('has-gl'); } catch (e) { console.warn(e); gl = null; }
  }

  function makeBook() {
    const renderer = window.__glTrack(new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }));
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    // Tight near/far planes: the book sits about 4 units away, so depth precision stays high and the
    // stacked boards and page blocks never fight over the same pixels.
    const camera = new THREE.PerspectiveCamera(26, 1, 1, 30);
    const loader = new THREE.TextureLoader();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const covers = {};
    const loadCover = (k) => covers[k] || (covers[k] = loader.load(`assets/hero/${k}.jpg`, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; t.needsUpdate = true; }));
    C.forEach((c) => loadCover(c.cover));

    // Page-block edges drawn in canvas: gilt for the gold editions, warm paper for paperbacks.
    function edgeTex(giltEdge) {
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 512;
      const g = cv.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 64, 0);
      if (giltEdge) { grd.addColorStop(0, '#8a6a12'); grd.addColorStop(0.5, '#e2bf55'); grd.addColorStop(1, '#9b7a1c'); }
      else { grd.addColorStop(0, '#cfc6b2'); grd.addColorStop(0.5, '#ece5d3'); grd.addColorStop(1, '#d6ceba'); }
      g.fillStyle = grd; g.fillRect(0, 0, 64, 512);
      for (let x = 0; x < 64; x += 2) { g.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`; g.fillRect(x, 0, 1, 512); }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    const giltMat = new THREE.MeshStandardMaterial({ map: edgeTex(true), metalness: 0.65, roughness: 0.32, color: 0xffffff, emissive: 0x3a2a00, emissiveIntensity: 0.35 });
    const paperEdgeMat = new THREE.MeshStandardMaterial({ map: edgeTex(false), roughness: 0.9 });
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xf1ead9, roughness: 0.95 });
    const spineMat = new THREE.MeshStandardMaterial({ color: 0x141312, roughness: 0.6 });
    const coverMat = new THREE.MeshStandardMaterial({ map: covers.maghazi, roughness: 0.5 });

    const W = 1, H = 1.489, N = 12; // cover proportions from the flat covers (900 x 1340)
    const book = new THREE.Group();
    const holder = new THREE.Group();
    holder.add(book); scene.add(holder);
    const parts = [];
    const board = (front) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, H + 0.03, 0.014), [spineMat, spineMat, spineMat, spineMat, front ? coverMat : spineMat, spineMat]);
      return m;
    };
    const front = board(true), back = board(false);
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.02, H + 0.03, 1), spineMat);
    const slabs = [];
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, H - 0.012, 1), [giltMat, paperMat, giltMat, giltMat, paperMat, paperMat]);
      slabs.push(m);
    }
    [front, ...slabs, back].forEach((m) => { book.add(m); parts.push(m); });
    book.add(spine);
    // Per-part scatter direction for the lift-apart.
    const scatter = parts.map((_, k) => ({
      y: 0.05 * Math.sin(k * 1.9),
      x: 0.16 * Math.cos(k * 2.3) + 0.05 * k,
      rz: 0.07 * Math.sin(k * 3.1),
      ry: 0.10 * Math.cos(k * 1.3),
    }));

    let cur = -1, thick = 0.17;
    function applyBook(i) {
      if (i === cur) return; cur = i;
      const c = C[i];
      coverMat.map = loadCover(c.cover); coverMat.needsUpdate = true;
      spineMat.color.set(c.spine);
      const edge = c.gilt ? giltMat : paperEdgeMat;
      slabs.forEach((m) => { m.material[0] = edge; m.material[2] = edge; m.material[3] = edge; });
      thick = c.thick;
    }
    applyBook(0);

    // Shadow / glow under the book.
    const sh = document.createElement('canvas'); sh.width = sh.height = 128;
    const sg = sh.getContext('2d'); const rg = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(0,0,0,.55)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = rg; sg.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -H / 2 - 0.09; scene.add(shadow);

    scene.add(new THREE.AmbientLight(0xdfe8e6, 0.85));
    const key = new THREE.DirectionalLight(0xfff3dd, 2.1); key.position.set(-2.2, 2.4, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xd8a800, 1.6); rim.position.set(3, 1, -2); scene.add(rim);
    const fill = new THREE.DirectionalLight(0x13958f, 0.7); fill.position.set(2.5, -1, 3); scene.add(fill);

    let bookCY = 0.5;
    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const phone = w < 800;
      const top = canvas.getBoundingClientRect().top; // stage top
      const hdBottom = document.querySelector('[data-cbar]').getBoundingClientRect().bottom - stage.getBoundingClientRect().top;
      const horizon = phone ? h - 40 : h * 0.85;
      // Book height as a share of the room between the bar and the chain.
      const room = phone ? h * 0.46 : h * 0.75; // the book leads: about 75% of the window on desktop
      const want = room * (phone ? 0.95 : 1);
      const fov = camera.fov * Math.PI / 180;
      const dist = (H / (want / h)) / (2 * Math.tan(fov / 2));
      camera.position.set(0, 0, dist);
      // Centre the book in that room.
      const cy = phone ? hdBottom + room / 2 + h * 0.01 : Math.min(hdBottom + 16 + room / 2, h - room / 2 - 6);
      const wpp = (2 * dist * Math.tan(fov / 2)) / h;
      camera.position.y = (cy - h / 2) * wpp;
      camera.lookAt(0, camera.position.y, 0);
      camera.updateProjectionMatrix();
      bookCY = cy / h; void top;
      holder.position.x = phone ? 0.08 : 0.24; // centre-right, clear of the headline
    }

    function render(f, t) {
      // f: continuous chapter index. Which book is held, and how far apart it is lifted.
      const i0 = Math.floor(f), fr = f - i0;
      // Lift window: the middle half of each step.
      let s = 0;
      if (fr > 0.2 && fr < 0.8) s = Math.sin(((fr - 0.2) / 0.6) * Math.PI);
      if (reduce) s = 0;
      applyBook(reduce ? Math.round(f) : (fr < 0.5 ? i0 : Math.min(i0 + 1, C.length - 1)));
      const ease = s * s * (3 - 2 * s);
      const T = thick;
      const inner = T - 0.028, slabT = inner / N;
      // The spine sits just inside the boards and just outside the page blocks, so no two faces share a plane
      // (shared planes flicker as the book turns).
      spine.scale.z = T - 0.004; spine.position.set(-W / 2 - 0.0015, 0, 0);
      const spread = 1 + ease * 7;
      parts.forEach((m, k) => {
        let z;
        if (k === 0) z = T / 2 - 0.007;
        else if (k === parts.length - 1) z = -T / 2 + 0.007;
        else { m.scale.z = slabT * 0.98; z = T / 2 - 0.014 - slabT * (k - 0.5); }
        const sc = scatter[k];
        m.position.set(sc.x * ease, sc.y * ease, z * spread);
        m.rotation.set(0, sc.ry * ease, sc.rz * ease);
      });
      spine.visible = ease < 0.05;
      spine.position.z = 0;
      // At rest the book breathes and turns ±6°; during the lift it turns to show the pages.
      const breathe = reduce ? 0 : Math.sin(t * 0.55);
      holder.rotation.y = -0.55 + breathe * 0.105 - ease * 0.3;
      holder.rotation.x = 0.04 + (reduce ? 0 : Math.sin(t * 0.4) * 0.015) + ease * 0.08;
      holder.position.y = (reduce ? 0 : Math.sin(t * 0.8) * 0.012) - ease * 0.04;
      shadow.material.opacity = 1 - ease * 0.7;
      renderer.render(scene, camera);
    }
    return { resize, render };
  }

  // ---------- Loop ----------
  let target = 0, cur = 0, visible = true, t0 = performance.now(), last = t0;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' });
  io.observe(hero);

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    target = toIndex(progress());
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    cur += (target - cur) * (reduce ? 1 : 1 - Math.exp(-dt * 7.5));
    if (Math.abs(target - cur) < 0.0005) cur = target;
    const t = (now - t0) / 1000;
    const f = cur;
    const held = Math.round(f);
    // Giant year rolls between centuries.
    const i0 = Math.floor(f), fr = f - i0;
    const a = C[i0], b = C[Math.min(i0 + 1, C.length - 1)];
    const k = fr < 0.2 ? 0 : fr > 0.8 ? 1 : ((fr - 0.2) / 0.6);
    const ek = k * k * (3 - 2 * k);
    const yr = Math.round(a.year + (b.year - a.year) * (reduce ? Math.round(fr) : ek));
    yearEl.textContent = (f >= C.length - 1 - 0.01) ? 'Today' : yr;
    showChapter(held);
    // Century bar and chain.
    segs.forEach((li, i) => {
      const fill = Math.max(0, Math.min(1, f - i + 1)); // segment i fills as the book moves into chapter i
      li.querySelector('i').style.setProperty('--f', i === 0 ? Math.min(1, 0.35 + f) : fill);
      li.classList.toggle('is-on', i === held);
      li.classList.toggle('is-done', i < held);
    });
    if (pathLen && !opening) {
      const fb = Math.min(f, C.length - 1);
      const j = Math.floor(fb), jf = fb - j;
      let len = segLens[j] + ((segLens[j + 1] ?? segLens[j]) - segLens[j]) * jf;
      if (f >= C.length - 1 - 0.001) len = pathLen; // today: the chain reaches you, in Kuala Lumpur
      gold.style.strokeDashoffset = pathLen - len;
      links.style.strokeDasharray = `0.1 11`;
      links.style.clipPath = '';
      beadG.querySelectorAll('.bead').forEach((el, i) => {
        const lit = i <= held || (i === 5 && f >= C.length - 1 - 0.02);
        el.classList.toggle('is-lit', lit);
        el.classList.toggle('is-now', i === held);
      });
      labels.forEach((li, i) => {
        li.classList.toggle('is-lit', i <= held || (i === 5 && f >= C.length - 1 - 0.02));
        li.classList.toggle('is-now', i === held);
      });
    }
    root.classList.toggle('is-scrolled', f > 0.05);
    if (gl) gl.render(f, t);
  }

  // ---------- Opening: the chain draws in 1 s ----------
  let opening = false;
  function start() {
    layoutChain();
    gl && gl.resize();
    let seen = false; try { seen = sessionStorage.getItem('igp-chain-open') === '1'; } catch (e) {}
    if (reduce || seen || progress() > 0.01) {
      ghost.style.strokeDasharray = 'none';
    } else {
      try { sessionStorage.setItem('igp-chain-open', '1'); } catch (e) {}
      opening = true;
      root.classList.add('is-opening');
      ghost.style.strokeDasharray = `${pathLen} ${pathLen}`;
      ghost.style.strokeDashoffset = pathLen;
      gold.style.strokeDashoffset = pathLen;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        root.classList.remove('is-opening');
        const t0o = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0o) / 1000);
          const e = 1 - Math.pow(1 - k, 3);
          ghost.style.strokeDashoffset = pathLen * (1 - e);
          gold.style.strokeDashoffset = pathLen - segLens[0] * e;
          if (k < 1) requestAnimationFrame(step); else { opening = false; ghost.style.strokeDasharray = 'none'; }
        };
        requestAnimationFrame(step);
      }));
    }
    requestAnimationFrame(frame);
  }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layoutChain(); gl && gl.resize(); }, 120); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
}
