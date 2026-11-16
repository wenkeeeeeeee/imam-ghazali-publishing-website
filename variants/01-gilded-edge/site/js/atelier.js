// V1 · Gilded Edge hero: a warm-lit atelier built in three.js. The real Gold Maghazi (photo cut-out on a plane)
// stands lit at the centre; scrolling walks the camera to a curved film screen, names the parts, switches the film,
// then turns to the premium editions on plinths. Pinned for 3 screens with CSS sticky; one WebGL canvas.
import * as THREE from './vendor/three.module.js';

const root = document.querySelector('[data-atelier]');
const canvas = root?.querySelector('[data-atelier-gl]');
const copy = root?.querySelector('.atelier-copy');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- title: printed in light (CSS does the wipe; JS wraps the lines and starts it) ----
root.querySelectorAll('.atelier-title .ln').forEach((ln) => {
  const i = document.createElement('span'); i.className = 'ln-i'; i.innerHTML = ln.innerHTML; ln.innerHTML = ''; ln.append(i);
});
const startPrint = () => {
  root.querySelectorAll('.atelier-title .ln-i').forEach((el) => el.style.setProperty('--w', el.offsetWidth + 'px'));
  root.classList.add('is-printed');
};

// Smooth scroll (Lenis), shared clock with the render loop.
let lenis = null;
if (!reduce && window.Lenis) { lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.9 }); }

if (!root || !canvas || !window.__glOK || !window.__glOK()) {
  document.documentElement.classList.add('no-gl');
  setTimeout(startPrint, 200);
  if (lenis) (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
} else {
  init();
}

function init() {
  // one canvas for the whole page: fixed behind the hero and the making-of rooms
  document.body.prepend(canvas);
  canvas.classList.add('room-gl');
  const making = document.querySelector('[data-making]');
  const mkRooms = making ? [...making.querySelectorAll('[data-room]')] : [];
  const mkEnd = making?.querySelector('[data-mk-end]');
  const mkSteps = making ? [...making.querySelectorAll('[data-mk-steps] li')] : [];
  const renderer = window.__glTrack(new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  const NIGHT = new THREE.Color('#071d1c');
  scene.background = NIGHT;
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);

  const tl = new THREE.TextureLoader();
  const tex = (url) => { const t = tl.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  // Shared GLSL: fog toward the night colour, warm light pools.
  const FOG = `
    uniform vec3 uFog; varying float vDepth;
    vec3 fogged(vec3 c, float near, float far){ return mix(c, uFog, smoothstep(near, far, vDepth)); }`;
  const VS = `
    varying vec2 vUv; varying vec3 vW; varying float vDepth;
    void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`;
  const uni = { uTime: { value: 0 }, uFog: { value: NIGHT }, uOpen: { value: 0 }, uP: { value: 0 } };

  // ---------- Room: floor, back and side walls, lit in shader ----------
  const ROOM = { floorY: -0.75, back: -9 };
  const floorMat = new THREE.ShaderMaterial({
    uniforms: { ...uni },
    vertexShader: VS,
    fragmentShader: `
      varying vec2 vUv; varying vec3 vW; uniform float uTime, uOpen; ${FOG}
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec3 base = vec3(.004,.020,.019);
        // polished stone boards: faint seams running toward the screen
        float seam = smoothstep(.985, 1., abs(fract(vW.x * .55) * 2. - 1.)) * .012;
        // pool under the book from the skylight shaft
        float pool = exp(-dot(vW.xz - vec2(0., .1), vW.xz - vec2(0., .1)) * .55) * uOpen;
        // pools from the side windows (slanted slats)
        vec2 q = vW.xz - vec2(-1.6, 1.8);
        float slats = smoothstep(.15, .9, sin((q.x * .8 + q.y * .45) * 6.) * .5 + .5);
        float side = exp(-dot(q * vec2(.42, .6), q * vec2(.42, .6))) * slats * .55;
        // pools under the plinth row
        float row = 0.;
        for (int i = 1; i < 5; i++) { vec2 r = vW.xz - vec2(.6 + 2.4 * float(i), 1.1); row += exp(-dot(r, r) * 1.6); }
        vec3 warm = vec3(1., .66, .32);
        vec3 c = base + warm * (pool * .55 + side * .28 + row * .22 * smoothstep(.55, .8, ${'uP'.replace('uP','0.')} + uOpenRow)) + seam;
        c += (h(floor(vW.xz * 90.)) - .5) * .003;
        // a faint sheen: the polished floor catches the film
        c += vec3(.02,.05,.05) * exp(-pow((vW.z + 3.4) * .5, 2.)) * exp(-pow(vW.x * .25, 2.));
        gl_FragColor = vec4(fogged(c, 9., 26.), 1.);
        #include <colorspace_fragment>
      }`.replace('uOpenRow', 'uRow'),
  });
  floorMat.uniforms.uRow = { value: 0 };
  floorMat.fragmentShader = floorMat.fragmentShader.replace('uniform float uTime, uOpen;', 'uniform float uTime, uOpen, uRow;');
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(4, ROOM.floorY, -2);
  scene.add(floor);

  // Walls: back wall with tall arched lattice windows; left wall carries the shafts' source.
  const latticeTex = makeLattice();
  const wallMat = (kind) => new THREE.ShaderMaterial({
    uniforms: { ...uni, uLat: { value: latticeTex }, uKind: { value: kind } },
    vertexShader: VS,
    fragmentShader: `
      varying vec2 vUv; varying vec3 vW; uniform float uTime, uOpen, uKind; uniform sampler2D uLat; ${FOG}
      // arched window mask in wall-local coords (x along wall, y up)
      float arch(vec2 p, vec2 c, float w, float hgt){
        vec2 d = p - c; float body = step(abs(d.x), w) * step(0., d.y) * step(d.y, hgt);
        float top = step(length(vec2(d.x, (d.y - hgt) * 1.1)), w) * step(hgt, d.y);
        return clamp(body + top, 0., 1.);
      }
      void main(){
        vec2 p = uKind < .5 ? vec2(vW.x, vW.y) : vec2(-vW.z, vW.y);
        vec3 c = mix(vec3(.008,.034,.032), vec3(.002,.009,.009), smoothstep(-1., 6., vW.y));
        // warm wash from the light below, plaster grain
        c += vec3(.05,.03,.012) * exp(-pow((vW.y + .4) * .45, 2.)) * uOpen;
        float win = 0.; float lat = 0.;
        for (int i = 0; i < 3; i++) {
          vec2 cen = uKind < .5 ? vec2(-6.5 + float(i) * 6.5 + 13., 1.4) : vec2(-3. + float(i) * 3.6, 1.6);
          float w = uKind < .5 ? 1.05 : .8;
          float m = arch(p, cen, w, 3.6);
          win += m;
          vec2 luv = (p - cen) / vec2(w * 2., 4.8) + vec2(.5, 0.);
          lat += m * texture2D(uLat, luv * vec2(2., 3.)).r;
        }
        vec3 glow = vec3(1., .66, .34) * (.75 + .06 * sin(uTime * .7));
        c = mix(c, glow * (.12 + .88 * lat), win * (.18 + .82 * uOpen) * (uKind < .5 ? .5 : 1.));
        // reveal edge (niche depth)
        gl_FragColor = vec4(fogged(c, 10., 30.), 1.);
        #include <colorspace_fragment>
      }`,
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(60, 18), wallMat(0));
  back.position.set(6, 8, ROOM.back); scene.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(40, 18), wallMat(1));
  left.rotation.y = Math.PI / 2; left.position.set(-8.5, 8, -2); scene.add(left);

  // Low shelving along the back wall: rows of spines in shadow (a publisher's library).
  const spines = buildShelves();
  scene.add(spines);

  // ---------- Curved film screen (a plaster apse until the film starts) ----------
  const vids = [makeVideo('assets/hero/screen-pages'), makeVideo('assets/hero/screen-garden')];
  const posters = [tex('assets/hero/screen-pages.jpg'), tex('assets/hero/screen-garden.jpg')];
  const vtex = vids.map((v) => { const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; return t; });
  const roomTex = ['assets/making/ch-manuscript.jpg', 'assets/making/ch-translation.jpg', 'assets/making/ch-design.jpg', 'assets/making/ch-press.jpg'].map(tex);
  const pressVid = makeVideo('assets/making/press');
  const pressTex = new THREE.VideoTexture(pressVid); pressTex.colorSpace = THREE.SRGBColorSpace;
  const R = 8.2, SPAN = 1.2, SH = 4.4;
  const screenMat = new THREE.ShaderMaterial({
    uniforms: { ...uni, uA: { value: vtex[0] }, uB: { value: vtex[1] }, uPA: { value: posters[0] }, uPB: { value: posters[1] }, uRA: { value: 0 }, uRB: { value: 0 }, uMix: { value: 0 }, uOn: { value: 0 }, uDim: { value: 1 } },
    vertexShader: VS,
    side: THREE.BackSide,
    fragmentShader: `
      varying vec2 vUv; varying vec3 vW; uniform float uTime, uOpen, uMix, uOn, uDim, uRA, uRB; uniform sampler2D uA, uB, uPA, uPB; ${FOG}
      void main(){
        vec2 uv = vec2(1. - vUv.x, vUv.y);
        vec3 fa = mix(texture2D(uPA, uv).rgb, texture2D(uA, uv).rgb, uRA);
        vec3 fb = mix(texture2D(uPB, uv).rgb, texture2D(uB, uv).rgb, uRB);
        vec3 film = mix(fa, fb, uMix);
        film = pow(film, vec3(1.15)) * .66 * uDim;
        film *= .75 + .25 * smoothstep(0., .5, uv.y);
        film *= mix(.42, 1., smoothstep(.1, .22, abs(uv.x - .5)));
        // plaster apse lit from the skylight
        float lit = exp(-pow((uv.x - .5) * 3.2, 2.)) * (.55 + .45 * uv.y);
        vec3 plaster = vec3(.004,.017,.017) + vec3(.075,.045,.018) * lit * uOpen;
        vec3 c = mix(plaster, film, uOn);
        // edge falloff: the film sinks into the room at its sides and floor
        float edge = smoothstep(0., .07, uv.x) * smoothstep(1., .93, uv.x) * smoothstep(0., .12, uv.y);
        c = mix(plaster * .6, c, mix(1., edge, uOn));
        gl_FragColor = vec4(fogged(c, 14., 30.), 1.);
        #include <colorspace_fragment>
      }`,
  });
  const screen = new THREE.Mesh(new THREE.CylinderGeometry(R, R, SH, 64, 1, true, Math.PI - SPAN / 2, SPAN), screenMat);
  screen.position.set(0, ROOM.floorY + SH / 2 + 0.02, -5.8 + R);
  scene.add(screen);

  // ---------- Light shafts ----------
  const shafts = new THREE.Group(); scene.add(shafts);
  const shaftMat = (strength, reveal) => new THREE.ShaderMaterial({
    uniforms: { ...uni, uS: { value: strength }, uReveal: { value: reveal ? 0 : 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vDepth; varying vec3 vW;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - w.xyz); vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vDepth; varying vec3 vW;
      uniform float uTime, uS, uReveal;
      void main(){
        float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
        float along = vUv.y;               // 1 at the source, 0 at the floor
        float fall = smoothstep(1. - uReveal * 1.05, 1.05 - uReveal * 1.05 + .25, along) ;
        float fade = smoothstep(0., .25, along) * (.55 + .45 * along);
        float flick = .92 + .08 * sin(uTime * .9 + vW.x * 2.);
        float a = f * fade * uS * flick * (uReveal >= 1. ? 1. : fall);
        gl_FragColor = vec4(vec3(1., .84, .58) * a, 1.);
      }`,
  });
  const beam = (from, to, r0, r1, strength, reveal) => {
    const len = from.distanceTo(to);
    const g = new THREE.CylinderGeometry(r0, r1, len, 48, 1, true);
    const m = new THREE.Mesh(g, shaftMat(strength, reveal));
    m.position.copy(from).add(to).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), from.clone().sub(to).normalize());
    shafts.add(m); return m;
  };
  const sky = beam(new THREE.Vector3(-0.6, 9, -0.6), new THREE.Vector3(0, ROOM.floorY, 0.15), 0.45, 1.25, 0.34, true);
  const side = [0, 1, 2].map((i) => beam(new THREE.Vector3(-8.3, 4.6, -3 + i * 3.6), new THREE.Vector3(-1.6 + i * 0.4, ROOM.floorY, 0.6 + i * 1.6), 0.55, 0.95, 0.075, false));
  const rowBeams = [1, 2, 3, 4].map((i) => beam(new THREE.Vector3(0.6 + 2.4 * i, 8, 1.1), new THREE.Vector3(0.6 + 2.4 * i, ROOM.floorY, 1.1), 0.25, 0.75, 0.0, false));

  // Dust in the light
  const dust = makeDust(); scene.add(dust);

  // ---------- Plinths and books ----------
  const BOOK_H = 2.3;
  const plinthMat = new THREE.ShaderMaterial({
    uniforms: { ...uni },
    vertexShader: `varying vec3 vN; varying vec3 vW; varying float vDepth; varying vec2 vUv;
      void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vW; varying vec2 vUv; uniform float uTime, uOpen; ${FOG}
      void main(){
        vec3 base = vec3(.006,.028,.027);
        float top = step(.5, vN.y);
        float front = max(0., vN.z) * .35 + max(0., -vN.x) * .15;
        vec3 c = base * (.6 + front) + top * vec3(.5,.33,.12) * .35;
        // gilt fore-edge line along the top rim
        c += vec3(.58,.37,.07) * smoothstep(.95, 1., vUv.y) * (1. - top);
        c *= mix(.7, 1., smoothstep(-.8, 0., vW.y));
        gl_FragColor = vec4(fogged(c, 10., 26.), 1.);
        #include <colorspace_fragment>
      }`,
  });
  const bookMat = (map, aspect, glint) => new THREE.ShaderMaterial({
    uniforms: { ...uni, uMap: { value: map }, uGlint: { value: glint }, uLift: { value: 1 } },
    transparent: true,
    vertexShader: VS,
    fragmentShader: `
      varying vec2 vUv; varying vec3 vW; uniform sampler2D uMap; uniform float uTime, uOpen, uGlint, uLift; ${FOG}
      void main(){
        vec4 t = texture2D(uMap, vUv);
        if (t.a < .02) discard;
        vec3 c = t.rgb;
        // warm key light from the skylight: brighter at the top, a soft fall-off to the base
        float key = mix(.62, 1.04, smoothstep(0., 1., vUv.y));
        c *= key * vec3(1.04, .99, .9) * mix(.12, 1., uOpen) * uLift;
        // slow glint across the gilt: only the gold/cream pixels catch it
        float gold = smoothstep(.08, .28, t.r - t.b) * smoothstep(.35, .7, t.r);
        float band = exp(-pow((vUv.x * .9 + vUv.y * .45 - mod(uTime * .12, 2.4) + .5) * 9., 2.));
        c += vec3(1., .86, .55) * band * (gold * .85 + .06) * uGlint * uOpen;
        gl_FragColor = vec4(fogged(c, 12., 28.), t.a);
        #include <colorspace_fragment>
      }`,
  });
  const contactMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; void main(){ vec2 d = (vUv - .5) * vec2(2., 2.); float a = exp(-dot(d,d) * 4.) * .75; gl_FragColor = vec4(0.,0.,0.,a); }`,
  });

  const items = [
    { src: 'assets/hero/maghazi.webp', ar: 920 / 1748, h: BOOK_H, x: 0, z: 0, ph: 0.75, glint: 1 },
    { src: 'assets/hero/shamail.webp', ar: 527 / 1000, h: 1.62, x: 3.0, z: 1.1, ph: 0.9, glint: 0.5 },
    { src: 'assets/hero/bukhari.webp', ar: 526 / 1000, h: 1.62, x: 5.4, z: 1.1, ph: 0.9, glint: 0.5 },
    { src: 'assets/hero/burdah.webp', ar: 600 / 1000, h: 1.5, x: 7.8, z: 1.1, ph: 0.9, glint: 0.3 },
    { src: 'assets/hero/sirah.webp', ar: 605 / 812, h: 1.45, x: 10.2, z: 1.1, ph: 0.9, glint: 0.2 },
  ];
  const plinths = items.map((it, i) => {
    const g = new THREE.Group();
    const top = ROOM.floorY + it.ph;
    const pw = i === 0 ? 1.7 : 1.45;
    const box = new THREE.Mesh(new THREE.BoxGeometry(pw, it.ph, i === 0 ? 1.2 : 1.0), plinthMat);
    box.position.y = ROOM.floorY + it.ph / 2; g.add(box);
    const mat = bookMat(tex(it.src), it.ar, it.glint);
    const book = new THREE.Mesh(new THREE.PlaneGeometry(it.h * it.ar, it.h), mat);
    book.position.set(0, top + it.h / 2, 0.05); g.add(book);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(it.h * it.ar * 1.5, 0.7), contactMat);
    sh.rotation.x = -Math.PI / 2; sh.position.set(0.05, top + 0.003, 0.08); g.add(sh);
    g.position.set(it.x, 0, it.z);
    g.userData = { top, h: it.h, ar: it.ar, mat, rise: i === 0 ? 1 : 0, baseY: 0 };
    scene.add(g); return g;
  });
  const hero = plinths[0];

  // ---------- Camera path: 0 room · 1 walk-in at the screen · 2 closer, film changes · 3 turn to the plinths ----------
  const K = [
    { pos: [0.0, 1.15, 7.4], look: [0.0, 1.05, -0.6], fov: 36 },
    { pos: [0.35, 1.05, 6.0], look: [0.1, 1.3, -1.5], fov: 38 },
    { pos: [-0.55, 1.0, 5.6], look: [0.1, 1.35, -2.0], fov: 39 },
    { pos: [6.4, 1.3, 9.8], look: [5.2, 0.55, 0.8], fov: 40 },
  ];
  const cam = { pos: new THREE.Vector3(...K[0].pos), look: new THREE.Vector3(...K[0].look), fov: K[0].fov };
  const tgt = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 36 };
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function pathAt(p) {
    const seg = Math.min(2, Math.floor(p * 3));
    let t = (p * 3 - seg);
    t = ease(THREE.MathUtils.clamp((t - 0.08) / 0.84, 0, 1)); // hold briefly on each key
    const a = K[seg], b = K[seg + 1];
    tgt.pos.fromArray(a.pos).lerp(new THREE.Vector3(...b.pos), t);
    tgt.look.fromArray(a.look).lerp(new THREE.Vector3(...b.look), t);
    tgt.fov = a.fov + (b.fov - a.fov) * t;
    // phones: step back so the subject and the row fit a narrow frame
    const aspect = camera.aspect;
    if (aspect < 1.2) {
      const back = (1.2 / aspect - 1) * (seg === 2 && t > 0.3 ? 5.2 : 3.4);
      const dir = tgt.pos.clone().sub(tgt.look).normalize();
      tgt.pos.addScaledVector(dir, back * (p > 0.85 ? 1.9 : 1));
    }
    return tgt;
  }

  // ---------- Part anchors (book-local) ----------
  const bookTop = hero.userData.top, BW = BOOK_H * hero.userData.ar;
  const at = (u, v) => new THREE.Vector3((u - 0.5) * BW, bookTop + (1 - v) * BOOK_H, 0.06);
  const anchors = {
    edge: at(0.93, 0.48),
    board: at(0.9, 0.04),
    text: at(0.3, 0.79),
  };
  const svg = root.querySelector('[data-parts-svg]');
  const parts = [...root.querySelectorAll('[data-part]')];
  const NS = 'http://www.w3.org/2000/svg';
  const lines = parts.map(() => {
    const path = document.createElementNS(NS, 'path'); path.setAttribute('pathLength', '1');
    const dot = document.createElementNS(NS, 'circle'); const ring = document.createElementNS(NS, 'circle'); ring.classList.add('ring');
    svg.append(path, dot, ring); return { path, dot, ring };
  });
  const spread = [...root.querySelectorAll('.sp-label')];
  const plinthLabels = [...root.querySelectorAll('[data-plinth]')];
  const rail = root.querySelector('[data-rail]');

  // ---------- Size, scroll, steps ----------
  let W = 0, H = 0;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  let p = 0, pS = 0, step = -1;
  const readP = () => {
    const r = root.getBoundingClientRect();
    const run = root.offsetHeight - innerHeight;
    return reduce ? 0 : THREE.MathUtils.clamp(-r.top / Math.max(1, run), 0, 1);
  };
  function setStep(s) {
    if (s === step) return; step = s;
    copy.dataset.step = s;
    root.classList.remove('step-0', 'step-1', 'step-2', 'step-3'); root.classList.add('step-' + s);
    // one film at a time
    const want = s === 1 ? 0 : s === 2 ? 1 : -1;
    vids.forEach((v, i) => { if (i === want) { v.play().catch(() => {}); } else if (!v.paused) v.pause(); });
  }

  const proj = new THREE.Vector3();
  const toScreen = (v) => { proj.copy(v).project(camera); return [(proj.x * 0.5 + 0.5) * W, (-proj.y * 0.5 + 0.5) * H, proj.z]; };

  // screen edges on screen, so labels sit in the dark room beside the film, never on it
  const edgeL = new THREE.Vector3(), edgeR = new THREE.Vector3();
  function screenEdges() {
    const zc = screen.position.z, cy = screen.position.y + SH * 0.1;
    edgeL.set(-R * Math.sin(SPAN / 2), cy, zc - R * Math.cos(SPAN / 2));
    edgeR.set(R * Math.sin(SPAN / 2), cy, zc - R * Math.cos(SPAN / 2));
    return [toScreen(edgeL)[0], toScreen(edgeR)[0]];
  }
  const clampY = (y, h) => Math.round(Math.max(56 + 16, Math.min(H - h - 24, y)));
  function placeParts() {
    if (step !== 1) return;
    const [sl, sr] = screenEdges();
    const offs = { edge: [1, 0.0], board: [1, -0.2], text: [-1, 0.05] };
    parts.forEach((el, i) => {
      const key = el.dataset.part; const [ax, ay] = toScreen(anchors[key]);
      const dir = offs[key][0];
      const w = el.offsetWidth, h = el.offsetHeight;
      const ly = clampY(ay + offs[key][1] * H - h / 2, h) + h / 2;
      let ex = dir > 0 ? Math.max(ax + 0.08 * W, sr + 20) : Math.min(ax - 0.08 * W, sl - 20);
      ex = dir > 0 ? Math.min(ex, W - w - 24) : Math.max(ex, w + 24);
      const kx = ax + dir * Math.min(Math.abs(ex - ax) * 0.35, 60);
      lines[i].path.setAttribute('d', `M${ax},${ay} L${kx},${ly} L${ex},${ly}`);
      lines[i].dot.setAttribute('cx', ax); lines[i].dot.setAttribute('cy', ay);
      lines[i].ring.setAttribute('cx', ax); lines[i].ring.setAttribute('cy', ay);
      el.classList.toggle('is-right', dir < 0);
      const x = dir > 0 ? ex + 12 : ex - 12 - w;
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(ly - h / 2)}px)`;
    });
  }
  function placeSpread() {
    if (step !== 2) return;
    const [sl, sr] = screenEdges();
    const at = [[-1, 0.30], [-1, 0.46], [1, 0.38]];
    spread.forEach((el, i) => {
      const [dir, fy] = at[i];
      const w = el.offsetWidth, h = el.offsetHeight;
      let x = dir < 0 ? sl - 28 - w : sr + 28;
      x = Math.max(16, Math.min(W - w - 16, x));
      el.classList.toggle('is-right', dir < 0);
      el.style.textAlign = dir < 0 ? 'right' : 'left';
      el.style.justifyItems = dir < 0 ? 'end' : 'start';
      el.style.transform = `translate(${Math.round(x)}px, ${clampY(fy * H - h / 2, h)}px)`;
    });
  }
  function placePlinths() {
    plinthLabels.forEach((li, i) => {
      const g = plinths[i];
      const [x, y] = toScreen(new THREE.Vector3(g.position.x, ROOM.floorY - 0.05 + g.position.y, g.position.z + 0.6));
      li.style.transform = `translate(${Math.round(x)}px, ${Math.round(y + 14)}px)`;
    });
  }

  // ---------- Opening: a one-second light shaft falls on the book ----------
  const t0 = performance.now();
  let opened = reduce;
  if (reduce) { uni.uOpen.value = 1; sky.material.uniforms.uReveal.value = 1; }
  setTimeout(startPrint, reduce ? 0 : 520);
  root.classList.add('is-gl');

  // ---------- Loop ----------
  let last = performance.now(), mode = 'hero', room = -1, qS = 0;
  const SIG = [
    { a: [-1.7, 1.0, 4.4], b: [-1.1, 1.05, 3.9], look: [0.4, 1.35, -3.6] },
    { a: [1.8, 1.25, 4.6], b: [1.2, 1.2, 4.0], look: [-0.4, 1.3, -3.6] },
    { a: [0.0, 0.45, 4.2], b: [0.0, 0.6, 3.6], look: [0.0, 1.7, -3.6] },
    { a: [-0.9, 1.55, 5.4], b: [-0.4, 1.4, 4.8], look: [0.5, 1.05, -3.6] },
    { a: [0.0, 1.2, 9.0], b: [0.0, 1.25, 8.4], look: [0.0, 1.3, -3.0] },
  ];
  const v3 = new THREE.Vector3();
  function sigFrame(q, time) {
    // 4 rooms over 0..0.84, then "Now in Kuala Lumpur"
    const span = 0.21, idx = Math.min(4, Math.floor(q / span)), t = idx < 4 ? (q - idx * span) / span : (q - 0.84) / 0.16;
    if (idx !== room) {
      room = idx;
      mkRooms.forEach((li, i) => li.classList.toggle('is-on', i === idx));
      mkSteps.forEach((li, i) => li.classList.toggle('is-on', i <= Math.min(idx, 3)));
      mkEnd?.classList.toggle('is-on', idx === 4);
      const sm = screenMat.uniforms;
      if (idx === 3) { sm.uA.value = pressTex; sm.uPA.value = roomTex[3]; sm.uRA.value = 0; pressVid.play().catch(() => {}); }
      else { sm.uPA.value = roomTex[Math.min(idx, 3)]; sm.uRA.value = 0; if (!pressVid.paused) pressVid.pause(); }
      if (idx === 4) { sm.uPA.value = roomTex[2]; sm.uRA.value = 0; }
    }
    if (idx === 3) screenMat.uniforms.uRA.value = pressVid.readyState >= 2 ? 1 : 0;
    // the light dims and opens on each new room
    const edge = Math.min(t, 1 - t);
    const lightK = idx === 4 ? Math.min(1, t * 4) : THREE.MathUtils.smoothstep(edge, 0, 0.12);
    uni.uOpen.value = 0.18 + 0.82 * lightK;
    const k = SIG[idx], e = THREE.MathUtils.clamp(t, 0, 1);
    camera.position.set(...k.a).lerp(v3.set(...k.b), e);
    camera.position.x += Math.sin(time * 0.21) * 0.05;
    camera.lookAt(v3.set(...k.look));
    if (camera.fov !== 38) { camera.fov = 38; camera.updateProjectionMatrix(); }
    screenMat.uniforms.uOn.value = idx === 4 ? 1 - Math.min(1, t * 2) * 0.85 : 1;
    screenMat.uniforms.uMix.value = 0;
    screenMat.uniforms.uDim.value = 0.55 + 0.45 * lightK;
    sky.material.uniforms.uS.value = 0.2 + (idx === 4 ? 0.14 * Math.min(1, t * 2) : 0);
    sky.material.uniforms.uReveal.value = 1;
    floorMat.uniforms.uRow.value = 0;
    rowBeams.forEach((b) => { b.material.uniforms.uS.value = 0; });
    plinths.forEach((g, i) => { g.visible = idx === 4 && i === 0; g.position.y = 0; });
    dust.material.uniforms.uTime.value = time;
    dust.material.uniforms.uOpen.value = uni.uOpen.value;
    renderer.render(scene, camera);
  }
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    canvas.style.visibility = m ? 'visible' : 'hidden';
    if (m !== 'hero') { vids.forEach((v) => !v.paused && v.pause()); step = -1; }
    if (m !== 'sig' && !pressVid.paused) pressVid.pause();
    if (m === 'hero') {
      uni.uOpen.value = 1; plinths[0].visible = true;
      const sm = screenMat.uniforms; sm.uA.value = vtex[0]; sm.uPA.value = posters[0];
    }
    if (m === 'sig') room = -1;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (lenis) lenis.raf(now);
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    const time = (now - t0) / 1000;
    uni.uTime.value = time;
    shafts.children.forEach((m) => { m.material.uniforms.uTime.value = time; });
    const hr = root.getBoundingClientRect();
    const mr = making?.getBoundingClientRect();
    const m = hr.bottom > 0 ? 'hero' : (mr && mr.top < innerHeight && mr.bottom > 0 && !reduce) ? 'sig' : null;
    setMode(m);
    if (!m) return;
    if (m === 'sig') {
      const q = THREE.MathUtils.clamp(-mr.top / Math.max(1, making.offsetHeight - innerHeight), 0, 1);
      qS += (q - qS) * (1 - Math.exp(-dt * 7));
      sigFrame(qS, time);
      return;
    }

    if (!opened) {
      const o = THREE.MathUtils.clamp(time / 1.0, 0, 1);
      const e = 1 - Math.pow(1 - o, 3);
      sky.material.uniforms.uReveal.value = e;
      uni.uOpen.value = THREE.MathUtils.clamp((time - 0.25) / 0.9, 0, 1);
      if (time > 1.2) opened = true;
    }

    p = readP();
    pS += (p - pS) * (1 - Math.exp(-dt * 7));
    if (Math.abs(p - pS) < 0.0004) pS = p;
    uni.uP.value = pS;
    setStep(p < 0.18 ? 0 : p < 0.52 ? 1 : p < 0.82 ? 2 : 3);
    if (rail) rail.style.transform = `scaleY(${pS})`;

    // camera along the path, with a slow breathing drift at rest
    pathAt(pS);
    cam.pos.copy(tgt.pos); cam.look.copy(tgt.look);
    const drift = reduce ? 0 : 1;
    camera.position.set(cam.pos.x + Math.sin(time * 0.21) * 0.06 * drift, cam.pos.y + Math.sin(time * 0.17) * 0.03 * drift, cam.pos.z);
    camera.lookAt(cam.look);
    if (Math.abs(camera.fov - tgt.fov) > 0.01) { camera.fov = tgt.fov; camera.updateProjectionMatrix(); }

    // the apse becomes a film screen; the film changes for step 2
    const on = THREE.MathUtils.smoothstep(pS, 0.12, 0.27) * (1 - THREE.MathUtils.smoothstep(pS, 0.8, 0.95) * 0.82);
    screenMat.uniforms.uOn.value = on;
    screenMat.uniforms.uMix.value = THREE.MathUtils.smoothstep(pS, 0.47, 0.57);
    // dim near each loop's seam so the restart never shows
    const v = vids[screenMat.uniforms.uMix.value > 0.5 ? 1 : 0];
    const d = v.duration || 12, ct = v.currentTime || 0;
    screenMat.uniforms.uRA.value = vids[0].readyState >= 2 ? 1 : 0;
    screenMat.uniforms.uRB.value = vids[1].readyState >= 2 ? 1 : 0;
    screenMat.uniforms.uDim.value = v.readyState >= 2 ? Math.min(1, Math.min(ct, d - ct) / 0.45 + 0.15) : 1;

    // shafts: the skylight softens while the film plays; the row beams light the plinths
    sky.material.uniforms.uS.value = 0.34 * (1 - on * 0.55);
    const row = THREE.MathUtils.smoothstep(pS, 0.68, 0.9);
    floorMat.uniforms.uRow.value = row;
    rowBeams.forEach((b, i) => { b.material.uniforms.uS.value = 0.16 * THREE.MathUtils.smoothstep(pS, 0.72 + i * 0.025, 0.87 + i * 0.02); });
    plinths.forEach((g, i) => {
      if (i === 0) return;
      const r = THREE.MathUtils.smoothstep(pS, 0.69 + i * 0.025, 0.85 + i * 0.02);
      g.position.y = (1 - r) * -(g.userData.h + 1.2);
      g.visible = r > 0.001;
    });
    // gentle settle of the hero book at rest (barely: it is a photograph)
    hero.children[1].position.y = bookTop + BOOK_H / 2 + Math.sin(time * 0.6) * 0.008;

    dust.material.uniforms.uTime.value = time;
    dust.material.uniforms.uOpen.value = uni.uOpen.value * (1 - on * 0.4);

    renderer.render(scene, camera);
    placeParts(); placeSpread(); placePlinths();
  }
  requestAnimationFrame(frame);

  // ---------- helpers ----------
  function makeVideo(src) {
    const v = document.createElement('video');
    const mp4 = v.canPlayType('video/mp4; codecs="avc1.42E01E"');
    v.src = src + (mp4 ? '.mp4' : '.webm'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = src.includes('pages') ? 'auto' : 'metadata'; v.poster = src + '.jpg';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.crossOrigin = 'anonymous';
    return v;
  }
  function makeLattice() {
    // eight-point star lattice (geometric screen), drawn once
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#000'; g.lineWidth = 10; g.lineJoin = 'miter';
    const star = (cx, cy, r) => {
      g.beginPath();
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 + Math.PI / 8; const rr = k % 2 ? r * 0.62 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      g.closePath(); g.stroke();
    };
    for (let y = 0; y <= 256; y += 128) for (let x = 0; x <= 256; x += 128) { star(x, y, 58); star(x + 64, y + 64, 30); }
    g.lineWidth = 6; g.strokeRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
  }
  function buildShelves() {
    const group = new THREE.Group();
    const n = 420;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...uni },
      vertexShader: `attribute vec3 aCol; varying vec3 vC; varying vec3 vN; varying float vDepth; varying vec3 vW;
        void main(){ vC = aCol; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vec4 w = modelMatrix * instanceMatrix * vec4(position,1.); vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying vec3 vN; varying vec3 vW; uniform float uOpen; ${FOG}
        void main(){ float l = .35 + max(0., vN.z) * .5 + max(0., vN.y) * .2; vec3 c = vC * vC * l * .55 * mix(.3, 1., uOpen);
          c *= .55 + .45 * exp(-pow(vW.x * .12, 2.));
          gl_FragColor = vec4(fogged(c, 10., 26.), 1.);
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    const cols = ['#5b1f22', '#0e4a46', '#1b5c58', '#d9cfb6', '#2a2a26', '#6b4f22', '#103634'].map((h) => new THREE.Color(h));
    const aCol = new Float32Array(n * 3);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    let i = 0;
    const shelvesY = [-0.1, 0.95, 2.0];
    for (const sx of [-7.2, 7.2]) {
      for (const sy of shelvesY) {
        let x = sx - 2.6;
        while (x < sx + 2.6 && i < n) {
          const w = 0.06 + Math.random() * 0.07, h = 0.62 + Math.random() * 0.28;
          s.set(w, h, 0.42); pos.set(x + w / 2, sy + h / 2, ROOM.back + 0.3);
          const tilt = Math.random() < 0.05 ? 0.12 : 0;
          q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), tilt);
          m.compose(pos, q, s); mesh.setMatrixAt(i, m);
          const c = cols[(Math.random() * cols.length) | 0];
          aCol.set([c.r, c.g, c.b], i * 3);
          x += w + 0.008; i++;
        }
      }
    }
    mesh.count = i;
    geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(aCol, 3));
    group.add(mesh);
    // shelf boards with a gilt lip
    const board = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.05, 0.5), new THREE.MeshBasicMaterial({ color: '#1d160b' }));
    for (const sx of [-7.2, 7.2]) for (const sy of shelvesY) { const b = board.clone(); b.position.set(sx, sy - 0.03, ROOM.back + 0.3); group.add(b); }
    return group;
  }
  function makeDust() {
    const n = 900, g = new THREE.BufferGeometry();
    const p3 = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // most motes live inside the skylight shaft, some in the side light
      const inSky = i < n * 0.6;
      const y = Math.random();
      if (inSky) { const r = 0.2 + y * 0; const rad = (0.45 + (1 - y) * 0.8) * Math.sqrt(Math.random()); const a = Math.random() * 6.28; p3.set([-0.6 * y + Math.cos(a) * rad, ROOM.floorY + y * 7.5, Math.sin(a) * rad], i * 3); }
      else { p3.set([-7 + Math.random() * 6.5, ROOM.floorY + Math.random() * 4.5, -3 + Math.random() * 7], i * 3); }
      seed[i] = Math.random();
    }
    g.setAttribute('position', new THREE.BufferAttribute(p3, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpen: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSeed; uniform float uTime, uPx; varying float vA;
        void main(){ vec3 p = position;
          p.y += mod(uTime * (.03 + aSeed * .05) + aSeed * 7., 7.5) - 3.75 + 0.;
          p.y = mix(position.y, ${ROOM.floorY.toFixed(2)} + mod(position.y - ${ROOM.floorY.toFixed(2)} - uTime * (.025 + aSeed * .04), 7.5), 1.);
          p.x += sin(uTime * .3 + aSeed * 40.) * .12; p.z += cos(uTime * .23 + aSeed * 30.) * .12;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = (1.2 + aSeed * 2.6) * uPx * (9. / -mv.z);
          vA = (.35 + .65 * sin(uTime * (.6 + aSeed) + aSeed * 20.) * .5 + .3) * smoothstep(30., 4., -mv.z);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; uniform float uOpen;
        void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d) * vA * uOpen; gl_FragColor = vec4(vec3(1., .88, .62) * a, 1.); }`,
    });
    return new THREE.Points(g, mat);
  }
}
