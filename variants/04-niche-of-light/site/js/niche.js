// V4 · Niche of Light: the logo's flame drops into the dark and becomes a lamp the visitor carries.
// WebGL (ogl) lights the real photos: the Burdah leather with a normal map derived from the photo, the gilt covers
// with relief read from their own luminance. Scroll: leather (0) → gilt covers with prices (1) → the next class in
// its niche (2) → daylight and the shelf (3). DOM <img> placeholders set every plane's place and stay as the fallback.
import { Renderer, Program, Mesh, Texture, Transform, Plane } from './vendor/ogl-lite.js';

const root = document.querySelector('[data-niche]');

function init() {
  const stage = root.querySelector('[data-stage]');
  const flameEl = root.querySelector('[data-flame]');
  const flameSvg = flameEl.querySelector('svg');
  const head = document.querySelector('[data-head]');
  const logo = document.querySelector('[data-logo]');
  const steps = [...root.querySelectorAll('[data-step]')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const G = window.gsap, ST = window.ScrollTrigger;

  const S = { p: 0, day: 0, open: 0, x: 0, y: 0, scale: 1, opening: true };
  let W = stage.clientWidth, H = stage.clientHeight;
  const pointer = { x: 0, y: 0, t: -1e9 };
  const rel = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  stage.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') { [pointer.x, pointer.y] = rel(e); pointer.t = performance.now(); } });
  stage.addEventListener('pointerleave', () => { pointer.t = -1e9; });
  stage.addEventListener('touchstart', (e) => { [pointer.x, pointer.y] = rel(e.touches[0]); pointer.y -= 50; pointer.t = performance.now(); }, { passive: true });
  stage.addEventListener('touchmove', (e) => { [pointer.x, pointer.y] = rel(e.touches[0]); pointer.y -= 50; pointer.t = performance.now(); }, { passive: true });

  // ---------- WebGL ----------
  const planes = [];
  let renderer = null, scene = null, makePlane = null;
  const canvas = root.querySelector('[data-gl]');
  const glOK = window.__glOK ? window.__glOK() : true;
  if (glOK) {
    try {
      renderer = new Renderer({ canvas, dpr: Math.min(devicePixelRatio || 1, 1.75), alpha: true, premultipliedAlpha: true, depth: false, antialias: false });
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      window.__glTrack?.({ dispose() {}, forceContextLoss() { gl.getExtension('WEBGL_lose_context')?.loseContext(); } });
      scene = new Transform();
      const geo = new Plane(gl);
      const blank = new Texture(gl, { image: new Uint8Array([128, 128, 255, 255]), width: 1, height: 1, generateMipmaps: false });
      makePlane = (fig, i, sc) => {
        const img = fig.querySelector('img');
        const tex = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR });
        const uniforms = {
          tMap: { value: tex }, tNormal: { value: blank }, uHasNormal: { value: 0 }, uUv: { value: [1, 1, 0, 0] },
          uRect: { value: [0, 0, 1, 1] }, uRes: { value: [W, H] }, uLamp: { value: [0, 0, 140] }, uPower: { value: 0 },
          uAmbient: { value: 0.04 }, uAlpha: { value: 0 }, uTexel: { value: [1 / 1024, 1 / 1024] }, uRadius: { value: 240 }, uRelief: { value: 1 }, uFeather: { value: 0 }, uFeatherY: { value: 0 },
        };
        const program = new Program(gl, { vertex: VERT, fragment: FRAG, uniforms, transparent: true, depthTest: false, depthWrite: false, cullFace: false });
        const mesh = new Mesh(gl, { geometry: geo, program, renderOrder: i });
        mesh.visible = false;
        mesh.setParent(sc);
        const plane = { fig, img, mesh, uniforms, tex, ready: false, cover: fig.classList.contains('plate'), name: fig.dataset.plane };
        const load = () => { tex.image = img; uniforms.uTexel.value = [1 / img.naturalWidth, 1 / img.naturalHeight]; plane.ready = true; };
        img.complete && img.naturalWidth ? load() : img.addEventListener('load', load, { once: true });
        if (fig.dataset.normal) {
          const n = new Image(); n.decoding = 'async'; n.src = fig.dataset.normal;
          const ntex = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR });
          n.onload = () => { ntex.image = n; uniforms.tNormal.value = ntex; uniforms.uHasNormal.value = 1; };
        }
        return plane;
      };
      root.querySelectorAll('[data-plane]').forEach((fig, i) => planes.push(makePlane(fig, i, scene)));
      document.documentElement.classList.add('gl-on');
    } catch (err) { console.error('niche gl', err); renderer = null; document.documentElement.classList.remove('gl-on'); }
  }

  // ---------- layout helpers ----------
  const by = (n) => planes.find((p) => p.name === n);
  const rectOf = (el) => { const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; };
  const mix = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function leatherPoint(fx, fy) { // a point on the photo (fractions of the image) on screen, through object-fit: cover
    const el = root.querySelector('.plate img'), r = rectOf(el);
    const iw = 2400, ih = 1600, s = Math.max(r.w / iw, r.h / ih), dw = iw * s, dh = ih * s;
    const pos = getComputedStyle(el).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    return [r.x + (r.w - dw) * pos[0] + fx * dw, r.y + (r.h - dh) * pos[1] + fy * dh];
  }
  function logoFlame() { const r = logo.getBoundingClientRect(), s = stage.getBoundingClientRect(); return [r.left - s.left + r.width * 0.172, r.top - s.top + r.height * 0.175]; }

  // Where the lamp goes by itself at each step (it follows the cursor or finger when one is moving).
  function scripted(t) {
    const p = S.p;
    const a = leatherPoint(0.2 + 0.1 * Math.sin(t * 0.33), 0.66 + 0.1 * Math.sin(t * 0.51 + 1.3));
    const books = ['shamail', 'bukhari', 'maghazi'].map((n) => by(n) ? rectOf(by(n).img) : rectOf(root.querySelector(`[data-plane="${n}"] img`)));
    const sweep = sstep(0.22, 0.47, p) * 2; // 0..2 across three covers
    const i = Math.min(1, Math.floor(sweep)), f = sweep - i;
    const bx = mix(books[i].x + books[i].w * 0.5, books[i + 1].x + books[i + 1].w * 0.5, sstep(0, 1, f));
    const b = [bx + Math.sin(t * 0.7) * 10, books[1].y + books[1].h * 0.34 + Math.sin(t * 0.9) * 14];
    const dr = rectOf(root.querySelector('[data-plane="divine"] img'));
    const c = [dr.x + dr.w * (0.48 + 0.12 * Math.sin(t * 0.45)), dr.y + dr.h * (0.3 + 0.1 * Math.sin(t * 0.6 + 2))];
    const d = logoFlame();
    let x, y, k;
    if (p < 0.16) [x, y] = a;
    else if (p < 0.27) { k = sstep(0.16, 0.27, p); x = mix(a[0], b[0], k); y = mix(a[1], b[1], k); }
    else if (p < 0.5) [x, y] = b;
    else if (p < 0.6) { k = sstep(0.5, 0.6, p); x = mix(b[0], c[0], k); y = mix(b[1], c[1], k); }
    else if (p < 0.77) [x, y] = c;
    else { k = sstep(0.77, 0.92, p); x = mix(c[0], d[0], k); y = mix(c[1], d[1], k); }
    return [x, y];
  }

  // ---------- opening: the flame drops from the logo and lights within a second ----------
  const wasLit = document.documentElement.classList.contains('was-lit');
  try { sessionStorage.setItem('v4-lit', '1'); } catch (e) { /* private mode */ }
  const rest = () => { const [x, y] = scripted(0); return [x, y]; };
  function opening() {
    const [rx, ry] = rest();
    if (reduce || wasLit || !G) { S.x = rx; S.y = ry; S.open = 1; S.opening = false; S.scale = 1; flameEl.style.opacity = 1; return; }
    const [lx, ly] = logoFlame();
    Object.assign(S, { x: lx, y: ly + 14, scale: 0.32 });
    flameEl.style.opacity = 1;
    G.timeline({ onComplete: () => { S.opening = false; } })
      .to(S, { y: ry, duration: 0.62, ease: 'power2.in' }, 0)
      .to(S, { x: rx, duration: 0.62, ease: 'power1.inOut' }, 0)
      .to(S, { scale: 1, duration: 0.5, ease: 'power2.out' }, 0.12)
      .to(S, { open: 1, duration: 0.4, ease: 'power2.out' }, 0.56);
  }

  // ---------- scroll ----------
  const gilt = [...root.querySelectorAll('.shelf-gilt .book')];
  const plate = root.querySelector('.plate');
  const arch = root.querySelector('[data-arch]');
  const divine = root.querySelector('[data-plane="divine"]');
  const dayShelf = root.querySelector('[data-day-shelf]');
  const dayBooks = [...dayShelf.querySelectorAll('.day-book')];
  const setStep = (n) => steps.forEach((el) => el.classList.toggle('is-on', +el.dataset.step === n));
  let curStep = -1;
  function stepFor(p) { return p < 0.14 ? 0 : p < 0.48 ? 1 : p < 0.77 ? 2 : 3; }

  if (reduce || !G || !ST) {
    // A lit still: the leather under a resting lamp, the headline, nothing pinned.
    document.documentElement.classList.add('is-still');
    G?.set([...gilt, divine], { autoAlpha: 0 });
    setStep(0); curStep = 0;
  } else {
    G.registerPlugin(ST);
    if (window.Lenis) {
      const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on('scroll', ST.update);
      G.ticker.add((t) => lenis.raf(t * 1000));
      G.ticker.lagSmoothing(0);
    }
    G.set(gilt, { autoAlpha: 0, y: () => H * 0.16 });
    G.set(divine, { autoAlpha: 0, y: () => H * 0.12 });
    G.set(arch, { autoAlpha: 0, scaleX: 0.55, scaleY: 0.3 });
    G.set(dayBooks, { autoAlpha: 0, y: () => H * 0.1 });
    G.set(dayShelf, { autoAlpha: 0 });
    const tl = G.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true,
      onUpdate: (self) => { S.p = self.progress; } } });
    tl.to(plate, { autoAlpha: 0, scale: 1.06, duration: 0.13, ease: 'power1.in' }, 0.13)
      .to(gilt, { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.025, ease: 'power2.out' }, 0.15)
      .to(gilt, { autoAlpha: 0, y: () => -H * 0.08, duration: 0.09, stagger: 0.015, ease: 'power1.in' }, 0.47)
      .to(arch, { autoAlpha: 1, scaleX: 1, scaleY: 1, duration: 0.13, ease: 'power2.out' }, 0.49)
      .to(divine, { autoAlpha: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.53)
      .to(S, { day: 1, duration: 0.15, ease: 'power1.inOut' }, 0.77)
      .to(stage, { backgroundColor: '#F4EFE4', duration: 0.13, ease: 'power1.inOut' }, 0.78)
      .to(arch, { scaleX: 4.2, scaleY: 1.5, autoAlpha: 0, duration: 0.14, ease: 'power1.in' }, 0.77)
      .to(divine, { autoAlpha: 0, y: () => -H * 0.06, duration: 0.08 }, 0.77)
      .to(dayShelf, { autoAlpha: 1, duration: 0.06 }, 0.82)
      .to(dayBooks, { autoAlpha: 1, y: 0, duration: 0.1, stagger: 0.018, ease: 'power2.out' }, 0.83)
      .to({}, { duration: 0.04 }, 0.96);
  }

  // ---------- frame loop ----------
  let running = true, t0 = performance.now();
  new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) requestAnimationFrame(frame); }, { threshold: 0 }).observe(root);
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (renderer) renderer.setSize(W, H);
  }
  addEventListener('resize', resize);
  resize();

  function frame(now) {
    if (!running) return;
    const t = (now - t0) / 1000;
    const step = stepFor(S.p);
    if (step !== curStep && !document.documentElement.classList.contains('is-still')) { curStep = step; setStep(step); }
    root.dataset.tone = S.day > 0.55 ? 'day' : 'night';

    // lamp position
    if (!S.opening) {
      const mouse = fine && pointer.t > 0;
      const live = mouse || (now - pointer.t < 2600 && S.p < 0.8);
      const [tx, ty] = live ? [pointer.x, pointer.y] : scripted(reduce ? 0 : t);
      const k = mouse ? 0.35 : live ? 0.24 : 0.07;
      S.x += (tx - S.x) * k; S.y += (ty - S.y) * k;
    }
    const flick = reduce ? 1 : 1 + 0.05 * Math.sin(t * 13.1) + 0.035 * Math.sin(t * 7.3 + 1.2) + 0.025 * Math.sin(t * 23.7);
    const lit = S.open * (1 - S.day);
    const fs = S.scale * mix(1, 0.4, S.day);
    flameEl.style.transform = `translate3d(${S.x}px, ${S.y}px, 0) scale(${fs})`;
    // With a mouse the cursor flame is the only flame on screen; the scene keeps its light. Phones keep this flame.
    flameEl.style.opacity = (fine && !S.opening) ? '0' : String(Math.max(0, 1 - S.day * 1.1));
    if (!reduce) flameSvg.style.transform = `scale(${1 + 0.035 * Math.sin(t * 9.7)}, ${1 + 0.06 * Math.sin(t * 6.1 + 0.6) + 0.03 * Math.sin(t * 17.3)}) skewX(${Math.sin(t * 2.3) * 2.2}deg)`;

    const owns = stage.getBoundingClientRect().bottom > innerHeight * 0.35;
    if (renderer && scene && owns) {
      if (canvas.parentNode !== stage) { stage.insertBefore(canvas, stage.querySelector('.plate')); renderer.setSize(W, H); }
      const lampX = S.x, lampY = S.y - 26 * fs; // light from the flame's heart
      const ambient = mix(0.022, 1, S.day);
      const radius = Math.max(130, Math.min(W, H) * 0.25);
      for (const pl of planes) {
        const op = pl.fig.style.visibility === 'hidden' ? 0 : (G ? +G.getProperty(pl.fig, 'opacity') : 1);
        pl.mesh.visible = pl.ready && op > 0.003;
        if (!pl.mesh.visible) continue;
        const r = rectOf(pl.img);
        const u = pl.uniforms;
        u.uRect.value = [r.x, r.y, r.w, r.h];
        u.uRes.value = [W, H];
        if (pl.cover) {
          const iw = pl.img.naturalWidth, ih = pl.img.naturalHeight, s = Math.max(r.w / iw, r.h / ih);
          const fx = r.w / (iw * s), fy = r.h / (ih * s);
          const pos = getComputedStyle(pl.img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
          u.uUv.value = [fx, fy, (1 - fx) * pos[0], 1 - fy - (1 - fy) * pos[1]];
        }
        u.uLamp.value = [lampX, lampY, pl.cover ? 150 : 120];
        u.uPower.value = lit * flick * (pl.cover ? 1.15 : 1.0);
        u.uAmbient.value = pl.cover ? ambient : mix(0.11, 1, S.day);
        u.uRadius.value = pl.cover ? radius : radius * 1.25;
        u.uFeather.value = pl.cover && W > 760 ? 0.16 : 0.0;
        u.uFeatherY.value = pl.cover && W <= 760 ? 0.22 : 0.0;
        u.uAlpha.value = op;
        u.uRelief.value = pl.cover ? 1 : 2.2;
      }
      renderer.render({ scene, frustumCull: false, sort: false });
    }
    requestAnimationFrame(frame);
  }

  import('./shelf.js').then((m) => m.initShelf({ renderer, makePlane, Transform, canvas, flick: () => 1, reduce, G, ST })).catch((e) => console.error('shelf', e));
  const go = () => { opening(); setStep(0); curStep = 0; requestAnimationFrame(frame); };
  const leatherImg = root.querySelector('.plate img');
  (leatherImg.complete ? Promise.resolve() : new Promise((r) => { leatherImg.onload = r; setTimeout(r, 2500); })).then(() => (document.fonts ? document.fonts.ready : null)).then(go);
}

const VERT = /* glsl */ `
attribute vec3 position; attribute vec2 uv;
uniform vec4 uRect; uniform vec2 uRes;
varying vec2 vUv; varying vec2 vPx;
void main() {
  vUv = uv;
  vec2 px = uRect.xy + vec2(uv.x, 1.0 - uv.y) * uRect.zw;
  vPx = px;
  gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tMap; uniform sampler2D tNormal;
uniform float uHasNormal, uPower, uAmbient, uAlpha, uRadius, uRelief, uFeather, uFeatherY;
uniform vec4 uUv; uniform vec3 uLamp; uniform vec2 uTexel;
varying vec2 vUv; varying vec2 vPx;
float lum(vec2 uv) { return dot(texture2D(tMap, uv).rgb, vec3(.299, .587, .114)); }
void main() {
  vec2 uv = vUv * uUv.xy + uUv.zw;
  vec4 c = texture2D(tMap, uv);
  vec3 N; float leather = 1.0;
  if (uHasNormal > .5) {
    vec3 t = texture2D(tNormal, uv).rgb;
    vec2 nxy = t.xy * 2.0 - 1.0;
    leather = t.b;                       // 1 on the leather, lower on the page
    nxy *= mix(.08, 1.0, smoothstep(.45, .95, leather));
    N = normalize(vec3(nxy, sqrt(max(.0, 1.0 - dot(nxy, nxy)))));
  } else {
    vec2 e = uTexel * 2.0;
    float gx = lum(uv + vec2(e.x, 0.)) - lum(uv - vec2(e.x, 0.));
    float gy = -(lum(uv + vec2(0., e.y)) - lum(uv - vec2(0., e.y)));
    N = normalize(vec3(-gx * uRelief, -gy * uRelief, 1.0));
  }
  vec3 L = vec3(uLamp.xy - vPx, uLamp.z);
  float d = length(L.xy);
  L = normalize(L);
  float diff = max(dot(N, L), 0.0);
  float att = exp(-d * d / (2.0 * uRadius * uRadius)) + .07 * exp(-d * d / (2.0 * uRadius * uRadius * 5.0));
  vec3 Hh = normalize(L + vec3(0., 0., 1.));
  float bright = max(c.r, max(c.g, c.b));
  float gloss = mix(.25, 1.0, smoothstep(.45, .9, bright));
  float spec = pow(max(dot(N, Hh), 0.0), 36.0) * gloss;
  vec3 lamp = vec3(1.0, .80, .52);
  float lit = uPower * att;
  vec3 col = c.rgb * (uAmbient + lamp * lit * (.3 + 1.35 * diff) * mix(.5, 1.0, leather)) + lamp * spec * lit * .55 * leather;
  col = mix(col, col * vec3(1.02, .99, .94), (1.0 - uAmbient) * .5);
  float a = c.a * uAlpha * (uFeather > 0. ? smoothstep(0.0, uFeather, vUv.x) : 1.0) * (uFeatherY > 0. ? smoothstep(1.0, 1.0 - uFeatherY, vUv.y) : 1.0);
  gl_FragColor = vec4(col * a, a);
}`;

if (root) init();
