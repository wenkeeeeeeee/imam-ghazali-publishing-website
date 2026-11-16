// V5 The Virtual Bookstore: a first-person walk through IGP's bookstore in three.js.
// One renderer; shelves are instanced, each aisle's books are one merged mesh on a per-aisle cover atlas that
// fills in as that aisle's covers load. The sun casts one static shadow map (rendered once).
import * as THREE from './vendor/three.module.js';
import { products, byId, site, esc, money } from './app.js';
import { AISLES, aisle, PREMIUM, PREMIUM_NOTE, FREE, LOVED, PLACES, place, TOUR } from './places.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const COARSE = matchMedia('(pointer: coarse)').matches;
const EYE = 1.6;
const C = { paper: '#F4EFE4', white: '#FBF8F2', oak: '#B98A5E', walnut: '#6B4A33', ink: '#10302E', teal: '#13958F', gold: '#D8A800', sun: '#FFE7B8' };
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(20071);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const priceOf = (p) => (p.free ? 'Free ebook' : p.sizes[0].price != null ? money(p.sizes[0].price) : '[client to confirm price]');

// ---------- book sizes, titles, colours ----------
const premiumIds = new Set(PREMIUM.map((p) => p.id));
function dims(p) {
  const r = hash(p.id), r2 = hash(p.id + 'w');
  const prem = p.format === 'Premium edition';
  const h = prem ? 0.275 + r * 0.02 : 0.205 + r * 0.05;
  return { h, w: prem ? 0.05 + r2 * 0.012 : 0.017 + r2 * 0.03, d: h * 0.667 };
}
function shortTitle(name) {
  let s = name.replace(/\s*\([^)]*\)/g, '').trim();
  s = s.split(/:| – | — | - /)[0].trim();
  if (s.length > 34) { let o = ''; for (const w of s.split(' ')) { if ((o + ' ' + w).trim().length > 32) break; o = (o + ' ' + w).trim(); } s = o; }
  return s || name;
}
const MUTED = ['#2F5D57', '#7A4B2A', '#1F3B5A', '#8C6B2F', '#5B2F3A', '#3E5A3A', '#C9B79C', '#E8DCC4', '#13958F'];
const tones = {};
function toneOf(p) { return tones[p.id] || MUTED[Math.floor(hash(p.id + 't') * MUTED.length)]; }
function sampleTone(img) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 12;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 8, 12);
  const d = g.getImageData(0, 0, 8, 12).data, px = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2], 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]]);
  px.sort((a, b) => a[3] - b[3]);
  const mid = px.slice(Math.floor(px.length * 0.3), Math.floor(px.length * 0.7));
  const m = [0, 1, 2].map((k) => Math.round(mid.reduce((s, x) => s + x[k], 0) / mid.length * 0.9));
  return `rgb(${m.join(',')})`;
}
const lumOf = (css) => { const m = css.match(/\d+/g); if (!m || css[0] === '#') { const n = parseInt(css.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; } return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255; };

// A spine drawn horizontally into (x, y, w, h); text starts at the left (the book's top).
function drawSpine(g, x, y, w, h, p) {
  const tone = toneOf(p), k = w / 256;
  g.save();
  g.fillStyle = tone; g.fillRect(x, y, w, h);
  const sh = g.createLinearGradient(0, y, 0, y + h);
  sh.addColorStop(0, 'rgba(0,0,0,.28)'); sh.addColorStop(0.35, 'rgba(255,255,255,.10)'); sh.addColorStop(0.6, 'rgba(255,255,255,.04)'); sh.addColorStop(1, 'rgba(0,0,0,.32)');
  g.fillStyle = sh; g.fillRect(x, y, w - 14 * k, h);
  g.fillStyle = 'rgba(216,168,0,.9)'; g.fillRect(x + 9 * k, y + 4 * k, 2 * k, h - 8 * k); g.fillRect(x + 226 * k, y + 4 * k, 2 * k, h - 8 * k);
  g.fillStyle = lumOf(tone) > 0.62 ? '#1d1712' : '#FBF8F2';
  const t = shortTitle(p.name);
  let fs = 15.5 * k; const font = () => `500 ${fs}px Gambetta, "Reem Kufi", Georgia, serif`;
  g.font = font(); while (g.measureText(t).width > 204 * k && fs > 9 * k) { fs -= 0.5 * k; g.font = font(); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x + 118 * k, y + h / 2 + 1 * k, 208 * k);
  g.restore();
}
function drawCoverStandIn(g, x, y, w, h, p) {
  g.save(); g.fillStyle = toneOf(p); g.fillRect(x, y, w, h);
  g.fillStyle = lumOf(toneOf(p)) > 0.62 ? '#1d1712' : '#FBF8F2'; g.textAlign = 'center';
  g.font = `500 ${w * 0.1}px Gambetta, Georgia, serif`;
  wrap(g, shortTitle(p.name), x + w / 2, y + h * 0.36, w * 0.8, w * 0.12);
  g.restore();
}
function wrap(g, text, x, y, maxW, lh, maxLines = 6) {
  const words = String(text).split(' '); let line = '', n = 0;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y + n * lh); line = w; n++; if (n >= maxLines) return n; } else line = t;
  }
  if (line) { g.fillText(line, x, y + n * lh); n++; }
  return n;
}

// ---------- images ----------
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise((res) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  return imgCache.get(src);
}
const coverSmall = (p) => `assets/covers-s/${p.id}.webp`;
const coverLarge = (p) => `assets/covers/${p.id}.webp`;

// ---------- per-aisle atlas: 18 covers (160x240) and 31 spines (256x32) on one 1024 canvas ----------
class Atlas {
  constructor(titles, renderer) {
    this.titles = titles;
    this.c = document.createElement('canvas'); this.c.width = this.c.height = 1024;
    this.g = this.c.getContext('2d');
    this.cov = new Map(); this.sp = new Map();
    titles.forEach((p, i) => { if (i < 18) this.cov.set(p.id, i); if (i < 31) this.sp.set(p.id, i); });
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.draw();
  }
  coverRect(i) { return [5 + (i % 6) * 170, 5 + Math.floor(i / 6) * 250, 160, 240]; }
  spineRect(j) { return [(j % 4) * 256, 753 + Math.floor(j / 4) * 34, 256, 32]; }
  uv([x, y, w, h], inset = 1.5) { return { u0: (x + inset) / 1024, u1: (x + w - inset) / 1024, vT: 1 - (y + inset) / 1024, vB: 1 - (y + h - inset) / 1024 }; }
  spineUV(p) { const j = this.sp.get(p.id) ?? 0; return this.uv(this.spineRect(j)); }
  boardUV(p) { const [x, y] = this.spineRect(this.sp.get(p.id) ?? 0); return this.uv([x + 243, y + 6, 10, 20], 2); }
  coverUV(p) { return this.cov.has(p.id) ? this.uv(this.coverRect(this.cov.get(p.id))) : null; }
  pagesUV() { const [x, y] = this.spineRect(31); return this.uv([x + 20, y + 6, 200, 20], 2); }
  draw(imgs = {}) {
    const g = this.g;
    g.fillStyle = '#efe6d6'; g.fillRect(0, 0, 1024, 1024);
    this.titles.forEach((p) => {
      if (this.cov.has(p.id)) { const [x, y, w, h] = this.coverRect(this.cov.get(p.id)); if (imgs[p.id]) g.drawImage(imgs[p.id], x, y, w, h); else drawCoverStandIn(g, x, y, w, h, p); }
      if (this.sp.has(p.id)) { const [x, y, w, h] = this.spineRect(this.sp.get(p.id)); drawSpine(g, x, y, w, h, p); }
    });
    const [px, py] = this.spineRect(31);
    g.fillStyle = '#f3ead9'; g.fillRect(px, py, 256, 32);
    g.fillStyle = 'rgba(120,100,70,.18)'; for (let i = 0; i < 32; i += 3) g.fillRect(px, py + i, 256, 1);
    this.tex.needsUpdate = true;
  }
  async load() {
    const imgs = {};
    await Promise.all(this.titles.map(async (p) => { const i = await loadImg(coverSmall(p)); if (i) { imgs[p.id] = i; tones[p.id] = tones[p.id] || sampleTone(i); } }));
    this.draw(imgs);
  }
}

// ---------- merged book batches ----------
const FACE_DEFS = [ // key, N, R, U (as local axis indices with sign), half-extent axes
  ['pz', [2, 1], [0, 1], [1, 1]], ['nz', [2, -1], [0, -1], [1, 1]],
  ['px', [0, 1], [2, -1], [1, 1]], ['nx', [0, -1], [2, 1], [1, 1]],
  ['py', [1, 1], [0, 1], [2, -1]], ['ny', [1, -1], [0, 1], [2, 1]],
];
class BookBatch {
  constructor(atlas, key) { this.atlas = atlas; this.key = key; this.pos = []; this.nor = []; this.uvs = []; this.idx = []; this.books = []; }
  add(b) {
    // b: { p, kind: 'spine'|'face', c, ax, ay, az, h: [hx, hy, hz], n (aisle normal) }
    const A = [b.ax, b.ay, b.az], H = b.h, at = this.atlas;
    const pages = at.pagesUV(), board = at.boardUV(b.p), spine = at.spineUV(b.p), cover = at.coverUV(b.p) || board;
    const spec = b.kind === 'spine'
      ? { pz: [spine, 's'], nz: [pages, 'n'], px: [board, 'n'], nx: [board, 'n'], py: [pages, 'n'], ny: [pages, 'n'] }
      : { pz: [cover, 'n'], nz: [board, 'n'], px: [pages, 'n'], nx: [spine, 's'], py: [pages, 'n'], ny: [pages, 'n'] };
    b.v0 = this.pos.length / 3;
    const min = V(Infinity, Infinity, Infinity), max = V(-Infinity, -Infinity, -Infinity);
    for (const [key, [ni, ns], [ri, rs], [ui, us]] of FACE_DEFS) {
      const N = A[ni].clone().multiplyScalar(ns), R = A[ri].clone().multiplyScalar(rs), U = A[ui].clone().multiplyScalar(us);
      const hn = H[ni], hr = H[ri], hu = H[ui];
      const base = b.c.clone().addScaledVector(N, hn);
      const TL = base.clone().addScaledVector(R, -hr).addScaledVector(U, hu), TR = base.clone().addScaledVector(R, hr).addScaledVector(U, hu);
      const BR = base.clone().addScaledVector(R, hr).addScaledVector(U, -hu), BL = base.clone().addScaledVector(R, -hr).addScaledVector(U, -hu);
      const [r, mode] = spec[key];
      const uv = mode === 's' ? [[r.u0, r.vB], [r.u0, r.vT], [r.u1, r.vT], [r.u1, r.vB]] : [[r.u0, r.vT], [r.u1, r.vT], [r.u1, r.vB], [r.u0, r.vB]];
      const v = this.pos.length / 3;
      [TL, TR, BR, BL].forEach((P, i) => { this.pos.push(P.x, P.y, P.z); this.nor.push(N.x, N.y, N.z); this.uvs.push(uv[i][0], uv[i][1]); min.min(P); max.max(P); });
      this.idx.push(v, v + 3, v + 2, v, v + 2, v + 1);
    }
    b.box = new THREE.Box3(min, max);
    b.batch = this;
    this.books.push(b);
    return b;
  }
  build(mat) {
    const g = new THREE.BufferGeometry();
    this.posArr = new Float32Array(this.pos); this.base = this.posArr.slice();
    g.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.box = new THREE.Box3(); this.books.forEach((b) => this.box.union(b.box));
    this.pos = this.nor = this.uvs = this.idx = null;
    return this.mesh;
  }
  offset(b, vec) { // move one book's 24 vertices (hover lift, hide)
    const a = this.posArr, s = b.v0 * 3;
    for (let i = 0; i < 72; i += 3) { a[s + i] = this.base[s + i] + vec.x; a[s + i + 1] = this.base[s + i + 1] + vec.y; a[s + i + 2] = this.base[s + i + 2] + vec.z; }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
  hide(b) { const a = this.posArr, s = b.v0 * 3; for (let i = 0; i < 72; i += 3) { a[s + i] = b.c.x; a[s + i + 1] = b.c.y; a[s + i + 2] = b.c.z; } this.mesh.geometry.attributes.position.needsUpdate = true; }
  show(b) { this.offset(b, V()); }
}

// ---------- procedural textures ----------
function canvasTex(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 4; return t;
}
function oakTex(base = C.oak, seed = 3) {
  const r = rng(seed);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, l = 6 + r() * 40; g.fillStyle = r() > 0.5 ? 'rgba(255,240,215,.07)' : 'rgba(70,40,15,.08)'; g.fillRect(x, y, l, 1 + r() * 1.5); }
    for (let i = 0; i < 40; i++) { const y = r() * h; g.fillStyle = 'rgba(90,55,25,.06)'; g.fillRect(0, y, w, 2 + r() * 3); }
  });
}
function terrazzoTex() {
  const r = rng(9);
  const chips = ['#CDBB9F', '#B98A5E', '#9A6E4C', '#DCC9A8', '#FFFFFF', '#F2E8D6', '#A4643F', '#8B7B67'];
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#ECE2D2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, s = 1.5 + Math.pow(r(), 2.2) * 11;
      g.fillStyle = r() < 0.012 ? C.teal : r() < 0.02 ? C.gold : chips[Math.floor(r() * chips.length)];
      g.globalAlpha = 0.55 + r() * 0.45;
      g.beginPath(); const n = 5 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + r() * 0.6, rr = s * (0.6 + r() * 0.5); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.fill();
    }
    g.globalAlpha = 1;
  }, { repeat: [7, 10.5] });
}
function doorsTex(n) { // base cupboard fronts: n doors across
  return canvasTex(256 * n, 128, (g, w, h) => {
    g.fillStyle = C.oak; g.fillRect(0, 0, w, h);
    const r = rng(n * 7); for (let i = 0; i < 400 * n; i++) { g.fillStyle = r() > 0.5 ? 'rgba(255,240,215,.06)' : 'rgba(70,40,15,.07)'; g.fillRect(r() * w, r() * h, 10 + r() * 50, 1); }
    for (let i = 0; i < n; i++) {
      const x = i * 256; g.strokeStyle = 'rgba(80,50,25,.45)'; g.lineWidth = 3; g.strokeRect(x + 10, 10, 236, h - 20);
      g.fillStyle = C.gold; g.fillRect(x + 118, 40, 20, 4);
    }
  });
}
function streetTex() { // a sunlit street of shophouses outside the window
  const r = rng(5);
  return canvasTex(1024, 640, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.6); sky.addColorStop(0, '#9FD0DA'); sky.addColorStop(1, '#F6E9CC');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const fac = ['#F4E3C3', '#EBD3B0', '#E7EEDF', '#F2D9C6', '#F7EEDB', '#DDE8E2'];
    let x = -20;
    while (x < w) {
      const bw = 140 + r() * 90, top = 120 + r() * 70; g.fillStyle = fac[Math.floor(r() * fac.length)]; g.fillRect(x, top, bw, h - top);
      g.fillStyle = '#B5653F'; g.fillRect(x - 4, top - 10, bw + 8, 12);
      for (let k = 0; k < 3; k++) { const wx = x + 18 + k * (bw - 36) / 3; g.fillStyle = 'rgba(70,90,90,.35)'; g.fillRect(wx, top + 34, (bw - 60) / 3, 52); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(wx, top + 34, (bw - 60) / 3, 4); }
      g.fillStyle = 'rgba(60,45,30,.18)'; g.fillRect(x, top + 120, bw, 14);
      for (let k = 0; k < 2; k++) { const ax = x + 14 + k * bw / 2, aw = bw / 2 - 28; g.fillStyle = 'rgba(80,60,40,.32)'; g.beginPath(); g.moveTo(ax, h - 160); g.lineTo(ax, top + 190); g.arc(ax + aw / 2, top + 190, aw / 2, Math.PI, 0); g.lineTo(ax + aw, h - 160); g.fill(); }
      x += bw;
    }
    g.fillStyle = '#d9c7a6'; g.fillRect(0, h - 160, w, 160);
    g.fillStyle = 'rgba(255,240,200,.5)'; g.fillRect(0, h - 160, w, 6);
    for (let i = 0; i < 9; i++) { const cx = r() * w, cy = 40 + r() * 140, s = 60 + r() * 70; const tg = g.createRadialGradient(cx, cy, 4, cx, cy, s); tg.addColorStop(0, 'rgba(96,140,80,.95)'); tg.addColorStop(1, 'rgba(96,140,80,0)'); g.fillStyle = tg; g.beginPath(); g.arc(cx, cy, s, 0, 7); g.fill(); }
    g.filter = 'blur(2px)'; g.drawImage(g.canvas, 0, 0); g.filter = 'none';
    const haze = g.createLinearGradient(0, 0, 0, h); haze.addColorStop(0, 'rgba(255,248,230,.15)'); haze.addColorStop(1, 'rgba(255,240,210,.35)'); g.fillStyle = haze; g.fillRect(0, 0, w, h);
  });
}
function signTex(en, ar, { bg = C.teal, w = 1024, h = 300 } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,231,184,.55)'; g.lineWidth = 3; g.strokeRect(18, 18, w - 36, h - 36);
    g.fillStyle = C.white; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = ar ? 92 : 104; g.font = `500 ${fs}px Gambetta, Georgia, serif`;
    while (g.measureText(en).width > w - 120) { fs -= 2; g.font = `500 ${fs}px Gambetta, Georgia, serif`; }
    g.fillText(en, w / 2, ar ? h * 0.4 : h / 2 + 4);
    if (ar) { g.fillStyle = C.sun; g.font = `500 56px "Reem Kufi", sans-serif`; g.direction = 'rtl'; g.fillText(ar, w / 2, h * 0.75); }
  });
}
// Paper panels with set text (noticeboard poster, founders' wall frames, price cards).
function paperTex(w, h, draw, bg = C.white) { return canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.textBaseline = 'alphabetic'; draw(g, w, h); }); }
const F = { d: (s, wgt = 500) => `${wgt} ${s}px Gambetta, Georgia, serif`, s: (s, wgt = 500) => `${wgt} ${s}px "General Sans", system-ui, sans-serif` };

// ---------- the store ----------
export async function startStore(ui) {
  const canvas = ui.canvas;
  const renderer = window.__glTrack(new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, COARSE ? 1.3 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.72;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  await Promise.race([Promise.all([
    document.fonts.load('500 40px Gambetta'), document.fonts.load('500 20px "General Sans"'), document.fonts.load('500 40px "Reem Kufi"', 'السيرة'),
  ]), new Promise((r) => setTimeout(r, 1800))]);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.paper);
  scene.fog = new THREE.Fog(0xf3ebdd, 20, 58);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 45);
  camera.rotation.order = 'YXZ';

  // Light: soft warm daylight everywhere, the sun through the window, warm pendants over each aisle.
  const hemi = new THREE.HemisphereLight(0xfff7ea, 0xe6d6bf, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2b0, 0.6);
  sun.position.set(-14.5, 6.6, 3.1); sun.target.position.set(0, 0, -4); scene.add(sun, sun.target);
  sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = -15; sc.right = 15; sc.top = 15; sc.bottom = -15; sc.near = 1; sc.far = 50;
  sun.shadow.mapSize.set(COARSE ? 1024 : 2048, COARSE ? 1024 : 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; sun.shadow.radius = 4;
  const fill = new THREE.DirectionalLight(0xfff1dc, 0.35); fill.position.set(3, 5, 6); scene.add(fill);

  const M = {
    wall: new THREE.MeshLambertMaterial({ color: C.paper }),
    wallW: new THREE.MeshLambertMaterial({ color: C.white }),
    ceil: new THREE.MeshLambertMaterial({ color: C.white, side: THREE.DoubleSide }),
    oak: new THREE.MeshStandardMaterial({ map: oakTex(), roughness: 0.72 }),
    oakLight: new THREE.MeshStandardMaterial({ map: oakTex('#D2B08A', 5), roughness: 0.7 }),
    walnut: new THREE.MeshStandardMaterial({ map: oakTex(C.walnut, 8), roughness: 0.6 }),
    teal: new THREE.MeshStandardMaterial({ color: C.teal, roughness: 0.55 }),
    ink: new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.5 }),
    brass: new THREE.MeshStandardMaterial({ color: '#C9A13A', roughness: 0.32, metalness: 0.35, side: THREE.DoubleSide }),
    floor: new THREE.MeshStandardMaterial({ map: terrazzoTex(), roughness: 0.42 }),
    pages: new THREE.MeshLambertMaterial({ color: '#F1E8D8' }),
    bulb: new THREE.MeshBasicMaterial({ color: '#FFF3D6' }),
  };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const solids = []; // [Box3, tag] for picking and occlusion
  const block = (mat, x0, x1, y0, y1, z0, z1, { cast = true, recv = true, tag = 'occ', parent = scene } = {}) => {
    const m = new THREE.Mesh(boxGeo, mat);
    m.scale.set(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = cast; m.receiveShadow = recv; parent.add(m);
    if (tag) solids.push([new THREE.Box3(V(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), V(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1))), tag]);
    return m;
  };
  // Instanced oak for all the shelving.
  const oakBoxes = [];
  const oakBox = (x0, x1, y0, y1, z0, z1) => oakBoxes.push([x0, x1, y0, y1, z0, z1]);

  // ---- room: x -7..7, z 0 (door) .. -21, ceiling 3.6 ----
  const H = 3.6;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 21), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -10.5); floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14.6, 21.6), M.ceil); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, -10.5); ceil.castShadow = true; ceil.receiveShadow = true; scene.add(ceil);
  // Left wall with the window (z -1.0..-5.8, sill 0.55, head 3.0)
  block(M.wall, -7.3, -7, 0, H + 0.3, 0.3, -1.0); block(M.wall, -7.3, -7, 0, 0.55, -1.0, -5.8); block(M.wall, -7.3, -7, 3.0, H + 0.3, -1.0, -5.8); block(M.wall, -7.3, -7, 0, H + 0.3, -5.8, -21.3);
  block(M.wall, 7, 7.3, 0, H + 0.3, 0.3, -21.3);
  block(M.wall, -7.3, 7.3, 0, H + 0.3, -21, -21.3);
  // Door wall with a glass door (x -0.9..0.9, h 2.7)
  block(M.wall, -7.3, -0.9, 0, H + 0.3, 0, 0.3); block(M.wall, 0.9, 7.3, 0, H + 0.3, 0, 0.3); block(M.wall, -0.9, 0.9, 2.7, H + 0.3, 0, 0.3);
  const street = streetTex();
  const outside = new THREE.MeshBasicMaterial({ map: street, toneMapped: false, fog: false });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(13, 7.6), outside); win.rotation.y = Math.PI / 2; win.position.set(-10, 1.9, -3.4); scene.add(win);
  const out2 = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), outside); out2.rotation.y = Math.PI; out2.position.set(0, 1.9, 3.2); scene.add(out2);
  // window frame (oak): sill, mullions, transom
  block(M.oak, -7.06, -6.82, 0.5, 0.56, -0.95, -5.85, { tag: null });
  [-1.0, -2.6, -4.2, -5.8].forEach((z) => block(M.oak, -7.14, -7.0, 0.55, 3.0, z + 0.04, z - 0.04, { tag: null }));
  block(M.oak, -7.14, -7.0, 2.33, 2.39, -1.0, -5.8, { tag: null }); block(M.oak, -7.14, -7.0, 2.96, 3.02, -1.0, -5.8, { tag: null });
  // door frame
  block(M.oak, -0.95, -0.88, 0, 2.72, 0.02, 0.2, { tag: null }); block(M.oak, 0.88, 0.95, 0, 2.72, 0.02, 0.2, { tag: null }); block(M.oak, -0.95, 0.95, 2.68, 2.74, 0.02, 0.2, { tag: null });
  block(M.oak, -0.03, 0.03, 0, 2.7, 0.08, 0.14, { tag: null }); block(M.brass, -0.18, -0.06, 1.0, 1.03, 0.04, 0.07, { tag: null, cast: false });
  // skirting
  block(M.walnut, -7, -6.985, 0, 0.11, -0.02, -20.98, { tag: null, cast: false }); block(M.walnut, 6.985, 7, 0, 0.11, -0.02, -20.98, { tag: null, cast: false });
  block(M.walnut, -6.98, 6.98, 0, 0.11, -20.985, -21, { tag: null, cast: false });
  // ceiling slats running down the store
  {
    const n = 28, inst = new THREE.InstancedMesh(boxGeo, M.oakLight, n), m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const x = -6.75 + i * 0.5; m4.compose(V(x, H - 0.035, -10.5), new THREE.Quaternion(), V(0.045, 0.06, 20.9)); inst.setMatrixAt(i, m4); }
    inst.receiveShadow = true; scene.add(inst);
  }

  // ---- shelving ----
  // A face is one side of a double-sided unit (or a wall case), split into 1.25 m bays. n is the side it faces.
  const LEVELS = [0.46, 0.88, 1.30, 1.72]; // board bottoms; books stand at board top + 2 mm
  const FACES = [
    { ux: -2, n: 1, z0: -7, z1: -17, slots: ['sirah', 'quran'] },
    { ux: 2, n: -1, z0: -7, z1: -17, slots: ['hadith', 'spirit'] },
    { ux: -2, n: -1, z0: -7, z1: -17, slots: ['salawat', 'family'] },
    { ux: 2, n: 1, z0: -7, z1: -17, slots: ['life', 'bm'] },
    { wall: true, ux: 7, n: -1, z0: -1.4, z1: -6.4, slots: ['loved', 'loved'] },
  ];
  const batches = {};
  const slotTitles = { ...Object.fromEntries(AISLES.map((a) => [a.key, a.books])), loved: LOVED };
  const atlases = {};
  const bookMat = (atlas) => new THREE.MeshLambertMaterial({ map: atlas.tex });
  for (const key of Object.keys(slotTitles)) { atlases[key] = new Atlas(slotTitles[key], renderer); batches[key] = new BookBatch(atlases[key], key); }

  function addBook(batch, p, kind, pivot, ax, ay, az, rel, half, q, n) {
    let v = ax.clone().multiplyScalar(rel[0]).addScaledVector(ay, rel[1]).addScaledVector(az, rel[2]);
    let AX = ax.clone(), AY = ay.clone(), AZ = az.clone();
    if (q) { v.applyQuaternion(q); AX.applyQuaternion(q); AY.applyQuaternion(q); AZ.applyQuaternion(q); }
    return batch.add({ p, kind, c: pivot.clone().add(v), ax: AX, ay: AY, az: AZ, h: half, n });
  }

  for (const f of FACES) {
    const nV = V(f.n, 0, 0), right = V(0, 0, f.n > 0 ? -1 : 1);
    const back = f.wall ? f.ux - 0.03 : f.ux + f.n * 0.012; // back plane x
    const depth = 0.238;
    const L = Math.abs(f.z1 - f.z0), nb = Math.round(L / 1.25);
    const leftZ = f.n > 0 ? f.z0 : f.z1; // the end on the viewer's left
    const at = (s) => leftZ + right.z * s;
    const xA = back, xB = back + f.n * depth;
    const X0 = Math.min(xA, xB), X1 = Math.max(xA, xB);
    // structure
    for (let k = 0; k <= nb; k++) { const z = at(k * 1.25); oakBox(X0, X1, 0, 2.2, z - 0.015, z + 0.015); }
    LEVELS.forEach((y) => oakBox(Math.min(xA, back + f.n * 0.232), Math.max(xA, back + f.n * 0.232), y, y + 0.025, Math.min(f.z0, f.z1), Math.max(f.z0, f.z1)));
    oakBox(Math.min(xA, back + f.n * 0.258), Math.max(xA, back + f.n * 0.258), 2.2, 2.26, Math.min(f.z0, f.z1) - 0.02, Math.max(f.z0, f.z1) + 0.02);
    const baseM = new THREE.MeshStandardMaterial({ map: doorsTex(nb), roughness: 0.7 });
    block(baseM, Math.min(xA, back + f.n * 0.236), Math.max(xA, back + f.n * 0.236), 0, 0.46, Math.min(f.z0, f.z1), Math.max(f.z0, f.z1));
    if (f.wall) block(M.oakLight, Math.min(back, back - f.n * 0.015), Math.max(back, back - f.n * 0.015), 0.46, 2.2, Math.min(f.z0, f.z1), Math.max(f.z0, f.z1), { tag: 'occ' });

    // books, bay by bay
    for (let bay = 0; bay < nb; bay++) {
      const zc = at((bay + 0.5) * 1.25);
      const key = f.slots[zc > -12 || f.wall ? 0 : 1];
      const titles = slotTitles[key], batch = batches[key];
      if (!titles.length) continue;
      const st = batch.st || (batch.st = { face: 0, spine: Math.floor(rand() * titles.length) });
      const s0 = bay * 1.25 + 0.035, s1 = (bay + 1) * 1.25 - 0.035;
      LEVELS.forEach((ly, li) => {
        const y = ly + 0.027;
        let s = s0 + rand() * 0.02;
        const faceAt = li === 1 ? [0.0, 0.42, 0.84] : li === 3 && bay % 2 === 0 ? [0.5] : [];
        const stackAt = (li === 2 && bay % 2 === 1) || (li === 0 && bay % 3 === 2) ? s1 - 0.27 : null;
        let fi = 0;
        while (s < s1 - 0.02) {
          if (fi < faceAt.length && s >= s0 + faceAt[fi] - 0.005) { // a face-out cover
            const p = titles[st.face++ % Math.min(titles.length, 18)]; const d = dims(p);
            const wv = d.d, t = 0.026;
            if (s + wv > s1) break;
            const pivot = V(back + f.n * 0.19, y, 0).add(V(0, 0, at(s + wv / 2)));
            const q = new THREE.Quaternion().setFromAxisAngle(right, -0.13);
            addBook(batch, p, 'face', pivot, right, UP, nV, [0, d.h / 2, -t / 2], [wv / 2, d.h / 2, t / 2], q, nV);
            s += wv + 0.03; fi++; continue;
          }
          if (stackAt != null && s >= stackAt) { // a horizontal stack
            let yy = y; const cnt = 3 + Math.floor(rand() * 3);
            for (let k = 0; k < cnt; k++) {
              const p = titles[(st.spine++) % titles.length]; const d = dims(p);
              const ay = right.clone().negate(); // book height along the shelf
              const q = new THREE.Quaternion().setFromAxisAngle(UP, (rand() - 0.5) * 0.08);
              const pivot = V(back + f.n * (0.012 + d.d / 2), yy, at(stackAt + 0.13));
              addBook(batch, p, 'spine', pivot, UP, ay, nV, [d.w / 2, 0, 0], [d.w / 2, d.h / 2, d.d / 2], q, nV);
              yy += d.w + 0.001; if (yy > y + 0.3) break;
            }
            s = s1; break;
          }
          // a run of 2-5 copies, spine out
          const p = titles[(st.spine++) % titles.length]; const d = dims(p);
          const copies = Math.max(1, Math.min(5, Math.round((titles.length < 8 ? 3 : 2) + rand() * 2)));
          for (let k = 0; k < copies && s + d.w < s1; k++) {
            const pivot = V(back + f.n * (0.012 + d.d / 2), y, at(s + d.w / 2));
            addBook(batch, p, 'spine', pivot, right, UP, nV, [0, d.h / 2, 0], [d.w / 2, d.h / 2, d.d / 2], null, nV);
            s += d.w + 0.0015;
          }
          const nextFace = fi < faceAt.length ? s0 + faceAt[fi] : Infinity;
          if (rand() < 0.16 && s + 0.07 < Math.min(s1, nextFace)) { // a gap with one book leaning into it
            const p2 = titles[(st.spine++) % titles.length]; const d2 = dims(p2);
            const a = 0.22; const pivot = V(back + f.n * (0.012 + d2.d / 2), y, at(s + d2.w));
            const q = new THREE.Quaternion().setFromAxisAngle(nV, -a);
            addBook(batch, p2, 'spine', pivot, right, UP, nV, [-d2.w / 2, d2.h / 2, 0], [d2.w / 2, d2.h / 2, d2.d / 2], q, nV);
            s += d2.w + Math.sin(a) * d2.h + 0.02;
          } else s += 0.003;
        }
      });
    }
  }
  // unit dividers and end panels
  for (const ux of [-2, 2]) {
    block(M.oakLight, ux - 0.01, ux + 0.01, 0.46, 2.2, -7, -17);
    for (const z of [-7, -17]) block(M.oak, ux - 0.262, ux + 0.262, 0, 2.27, z + (z > -12 ? 0.012 : -0.012), z + (z > -12 ? -0.022 : 0.022), { tag: 'occ' });
  }
  { // oak instancing
    const inst = new THREE.InstancedMesh(boxGeo, M.oak, oakBoxes.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    oakBoxes.forEach(([x0, x1, y0, y1, z0, z1], i) => { m4.compose(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), q, V(Math.abs(x1 - x0), y1 - y0, Math.abs(z1 - z0))); inst.setMatrixAt(i, m4); });
    inst.castShadow = true; inst.receiveShadow = true; scene.add(inst);
  }
  for (const key in batches) { if (batches[key].books.length) scene.add(batches[key].build(bookMat(atlases[key]))); }

  // ---- single books: front table, ebook rack ----
  const items = []; // { mesh, p, coverAxis, n, tag }
  const matCache = new Map();
  function spineCanvasTex(p) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 512; const g = c.getContext('2d');
    g.translate(64, 0); g.rotate(Math.PI / 2); drawSpine(g, 0, 0, 512, 64, p);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function bookMaterials(p, kind) {
    const key = p.id + kind; if (matCache.has(key)) return matCache.get(key);
    const cover = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    const coverTex = new THREE.Texture(); coverTex.colorSpace = THREE.SRGBColorSpace;
    loadImg(coverSmall(p)).then((img) => { if (!img) return; if (!tones[p.id]) tones[p.id] = sampleTone(img); coverTex.image = img; coverTex.needsUpdate = true; cover.map = coverTex; cover.needsUpdate = true; spine.map = spineCanvasTex(p); spine.needsUpdate = true; boardM.color.set(toneOf(p)); });
    const spine = new THREE.MeshLambertMaterial({ map: spineCanvasTex(p) });
    const boardM = new THREE.MeshLambertMaterial({ color: toneOf(p) });
    const pg = M.pages;
    const arr = kind === 'spine' ? [cover, boardM, pg, pg, spine, pg] : [pg, spine, pg, pg, cover, boardM];
    const out = { arr, cover };
    matCache.set(key, out); return out;
  }
  function upgradeCover(p, mats) { loadImg(coverLarge(p)).then((img) => { if (!img) return; const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; mats.cover.map = t; mats.cover.needsUpdate = true; }); }
  function bookMesh(p, kind, half) {
    const mats = bookMaterials(p, kind);
    const m = new THREE.Mesh(new THREE.BoxGeometry(half[0] * 2, half[1] * 2, half[2] * 2), mats.arr);
    m.castShadow = true; m.receiveShadow = true; m.userData.mats = mats; return m;
  }

  // Front table (premium editions), centre (0, -4.6)
  block(M.oak, -1.42, 1.42, 0.74, 0.785, -5.22, -3.98, { tag: 'occ' });
  block(M.walnut, -1.25, 1.25, 0, 0.739, -5.06, -4.14, { tag: 'occ' });
  const priceCard = (p) => paperTex(512, 300, (g, w, h) => {
    g.fillStyle = C.ink; g.textAlign = 'center';
    g.font = F.d(118); g.fillText(money(p.sizes[0].price), w / 2, 150);
    g.fillStyle = C.teal; g.font = F.s(40); g.fillText(PREMIUM_NOTE[p.id] || '', w / 2, 225);
    g.fillStyle = C.gold; g.fillRect(w / 2 - 40, 255, 80, 4);
  });
  PREMIUM.forEach((p, i) => {
    const x = -1.1 + i * 0.55, d = dims(p), t = d.w;
    const q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -0.2);
    const m = bookMesh(p, 'face', [d.d / 2, d.h / 2, t / 2]);
    const c = V(0, d.h / 2, -t / 2).applyQuaternion(q).add(V(x, 0.787, -4.62));
    m.position.copy(c); m.quaternion.copy(q); scene.add(m);
    upgradeCover(p, m.userData.mats);
    block(M.walnut, x - 0.05, x + 0.05, 0.787, 0.93, -4.75, -4.72, { tag: null }); // easel
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.1), new THREE.MeshLambertMaterial({ map: priceCard(p) }));
    card.position.set(x, 0.835, -4.2); card.rotation.x = -0.5; scene.add(card);
    const it = { mesh: m, p, coverAxis: 'z', n: V(0, 0, 1), tag: 'book' };
    items.push(it); it.box = new THREE.Box3().setFromObject(m);
    const cb = new THREE.Box3().setFromObject(card); items.push({ box: cb, p, tag: 'card', ref: it });
  });

  // Free ebooks rack on the right wall (z -7.9..-11.1)
  block(M.oakLight, 6.93, 6.985, 0.5, 2.15, -7.85, -11.15, { tag: 'occ' });
  [0.6, 1.1, 1.6].forEach((y) => { block(M.oak, 6.66, 6.93, y - 0.03, y, -7.9, -11.1, { tag: 'occ' }); block(M.oak, 6.64, 6.67, y, y + 0.05, -7.9, -11.1, { tag: null }); });
  FREE.forEach((p, i) => {
    const row = Math.floor(i / 3), col = i % 3, y = [1.6, 1.1, 0.6][row], z = -8.45 - col * 1.05;
    const hh = 0.38, ww = hh * 0.667, t = 0.012;
    const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -Math.PI / 2).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -0.18));
    const m = bookMesh(p, 'face', [ww / 2, hh / 2, t / 2]);
    m.position.copy(V(0, hh / 2, 0).applyQuaternion(q).add(V(6.74, y + 0.002, z))); m.quaternion.copy(q); scene.add(m);
    const it = { mesh: m, p, coverAxis: 'z', n: V(-1, 0, 0), tag: 'book' }; it.box = new THREE.Box3().setFromObject(m); items.push(it);
  });
  const sign = (en, ar, w, h, x, y, z, ry, { hang = true, tag } = {}) => {
    const tex = signTex(en, ar);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.18 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.035), [M.teal, M.teal, M.teal, M.teal, mat, mat]);
    m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; scene.add(m);
    if (hang) { const rod = new THREE.CylinderGeometry(0.006, 0.006, H - y - h / 2, 6); [-1, 1].forEach((s) => { const r = new THREE.Mesh(rod, M.brass); const off = V(s * w * 0.42, 0, 0).applyAxisAngle(UP, ry); r.position.set(x + off.x, (H + y + h / 2) / 2, z + off.z); scene.add(r); }); }
    if (tag) items.push({ box: new THREE.Box3().setFromObject(m), tag });
    return m;
  };
  sign('Free ebooks', null, 1.5, 0.4, 6.96, 2.42, -9.5, -Math.PI / 2, { hang: false, tag: 'place:ebooks' });
  sign('Best loved', null, 1.5, 0.4, 6.96, 2.58, -3.9, -Math.PI / 2, { hang: false, tag: 'place:loved' });
  // Aisle signs, hung so they read from the door
  const signAt = { sirah: [-0.95, -7.3], hadith: [0.95, -7.3], quran: [-0.95, -12.3], spirit: [0.95, -12.3], salawat: [-4.6, -7.3], family: [-4.6, -12.3], life: [4.6, -7.3], bm: [4.6, -12.3] };
  AISLES.forEach((a) => { const [x, z] = signAt[a.key]; sign(a.name, a.ar, 1.6, 0.46, x, z < -10 ? 2.92 : 2.78, z, 0, { tag: 'place:' + a.key }); });

  // Noticeboard (right wall, z -13.3..-15.7)
  block(M.oak, 6.9, 6.985, 0.8, 2.3, -13.25, -15.75, { tag: 'place:notice' });
  const cork = canvasTex(512, 300, (g, w, h) => { g.fillStyle = '#C49A6C'; g.fillRect(0, 0, w, h); const r = rng(4); for (let i = 0; i < 5000; i++) { g.fillStyle = r() > 0.5 ? 'rgba(90,55,25,.25)' : 'rgba(255,230,190,.25)'; g.fillRect(r() * w, r() * h, 1.5, 1.5); } });
  const corkM = new THREE.Mesh(new THREE.PlaneGeometry(2.36, 1.36), new THREE.MeshLambertMaterial({ map: cork })); corkM.rotation.y = -Math.PI / 2; corkM.position.set(6.895, 1.55, -14.5); corkM.receiveShadow = true; scene.add(corkM);
  const ev = (window.__events || []).find((e) => e.upcoming) || {};
  const poster = paperTex(620, 880, (g, w) => {
    g.fillStyle = C.teal; g.fillRect(0, 0, w, 16);
    g.fillStyle = C.teal; g.font = F.s(26, 600); g.fillText('ONE-DAY INTENSIVE · KUALA LUMPUR', 48, 80);
    g.fillStyle = C.ink; g.font = F.d(76); g.fillText('The Niche', 48, 180); g.fillText('of Light', 48, 258);
    g.font = F.d(31, 400); wrap(g, 'The Divine Reports (Mishkat al-Anwar), compiled by Ibn al-ʿArabi', 48, 320, 520, 40);
    g.fillStyle = C.gold; g.fillRect(48, 420, 90, 5);
    g.fillStyle = C.ink; g.font = F.s(30, 600); g.fillText('with Dr Ali Hussain (USA)', 48, 482);
    g.font = F.s(28, 500); g.fillText('Saturday 21 November', 48, 548); g.fillText('11am – 5pm', 48, 588);
    g.font = F.s(25, 400); wrap(g, 'MSABA Hall, Masjid Saidina Abu Bakar As-Siddiq, Bangsar', 48, 640, 520, 34);
    g.fillStyle = C.teal; g.font = F.s(25, 600); g.fillText('Full reading · Certificate · 60 seats left', 48, 760);
    g.fillStyle = C.ink; g.font = F.s(25, 500); g.fillText('Register: imamghazali.my/divine', 48, 820);
  });
  const posterM = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.88), new THREE.MeshLambertMaterial({ map: poster, emissive: '#ffffff', emissiveMap: poster, emissiveIntensity: 0.12 }));
  posterM.rotation.y = -Math.PI / 2 + 0.0; posterM.rotation.z = 0.015; posterM.position.set(6.885, 1.55, -14.05); scene.add(posterM);
  const dr = byId['divine-reports-mishkat-al-anwar'];
  if (dr) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.45), new THREE.MeshLambertMaterial({ color: '#fff' }));
    loadImg(coverSmall(dr)).then((img) => { if (img) { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; m.material.map = t; m.material.needsUpdate = true; } });
    m.rotation.y = -Math.PI / 2; m.rotation.z = -0.03; m.position.set(6.885, 1.72, -14.95); scene.add(m);
  }
  const card2 = paperTex(420, 260, (g, w) => { g.fillStyle = C.ink; g.font = F.d(40); g.fillText('Save a seat', 30, 70); g.font = F.s(24, 400); g.fillStyle = C.teal; wrap(g, 'Register on imamghazali.my/divine, or ask us on WhatsApp.', 30, 120, 360, 32); g.fillStyle = C.gold; g.fillRect(30, 215, 70, 4); });
  const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.21), new THREE.MeshLambertMaterial({ map: card2 })); c2.rotation.y = -Math.PI / 2; c2.rotation.z = 0.03; c2.position.set(6.885, 1.2, -14.98); scene.add(c2);
  [[-14.05, 1.97], [-14.95, 1.93], [-14.98, 1.29]].forEach(([z, y]) => { const pin = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.brass); pin.position.set(6.875, y, z); scene.add(pin); });
  const nbTitle = paperTex(800, 160, (g, w) => { g.fillStyle = C.ink; g.textAlign = 'center'; g.font = F.d(92); g.fillText('Noticeboard', w / 2, 112); }, C.paper);
  const nbT = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.2), new THREE.MeshLambertMaterial({ map: nbTitle })); nbT.rotation.y = -Math.PI / 2; nbT.position.set(6.985, 2.48, -14.5); scene.add(nbT);

  // Founders' wall (left wall, z -8.2..-15.8)
  const framed = (tex, w, h, z, y) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.1 }));
    p.rotation.y = Math.PI / 2; p.position.set(-6.955, y, z); scene.add(p);
    block(M.oak, -7, -6.965, y - h / 2 - 0.04, y + h / 2 + 0.04, z + w / 2 + 0.04, z - w / 2 - 0.04, { tag: 'place:founders', cast: false });
  };
  const big = paperTex(1400, 760, (g, w) => {
    g.fillStyle = C.teal; g.font = F.s(34, 600); g.fillText('IMAM GHAZALI PUBLISHING · IGP MY', 70, 100);
    g.fillStyle = C.ink; g.font = F.d(200); g.fillText('Since 2007', 62, 300);
    g.font = F.d(56, 400); wrap(g, 'Reviving, translating & beautifully producing works of scholarship.', 70, 420, 1240, 70);
    g.fillStyle = C.gold; g.fillRect(70, 580, 120, 6);
    g.fillStyle = C.ink; g.font = F.s(34, 400); wrap(g, 'Now in Malaysia: IGP MY · SSM 202401032039 (1577888-V). Prices in RM, a Bahasa Melayu shelf, classes in Kuala Lumpur.', 70, 650, 1260, 46);
  });
  framed(big, 2.1, 1.14, -10.75, 1.65);
  const panel = (head, lines) => paperTex(720, 900, (g, w) => {
    g.fillStyle = C.teal; g.font = F.s(28, 600); g.fillText(head.toUpperCase(), 54, 90);
    g.fillStyle = C.gold; g.fillRect(54, 116, 70, 5);
    let y = 200; g.fillStyle = C.ink;
    lines.forEach(([t, s]) => { g.font = F.d(s ? 46 : 38, s ? 500 : 400); y += wrap(g, t, 54, y, 610, s ? 54 : 48) * (s ? 54 : 48) + 14; });
  });
  framed(panel('The scholars', [['Musa ibn ʿUqbah', 1], ['Imam al-Tirmidhi', 1], ['Imam al-Ghazali', 1], ['Imam al-Nawawi', 1], ['Imam al-Busiri', 1], ['Qadi ʿIyad', 1], ['Ibn Abi Jamrah', 1]]), 0.7, 0.88, -12.4, 1.6);
  framed(panel('Living teachers & translators', [['Habib Umar bin Hafiz', 1], ['Dr Yasir Qadhi', 1], ['Shaykh Hamzah Abdul-Malik', 1], ['Shaykh Dr Thaika Shuʿaib Alim', 1], ['Translators Shabbir Hassan and Rayyan Shaikh', 0]]), 0.7, 0.88, -13.25, 1.6);
  framed(panel('First in English', [['The Maghazi of Musa ibn ʿUqbah: the earliest Sīrah in existence', 1], ['Mukhtasar Sahih al-Bukhari, in English for the first time in history', 1], ['Arabic beside English: the IGP bilingual edition', 0]]), 0.7, 0.88, -14.1, 1.6);
  framed(paperTex(720, 900, (g) => {
    g.fillStyle = C.gold; g.font = F.d(160); g.fillText('“', 40, 150);
    g.fillStyle = C.ink; g.font = F.d(36, 400);
    wrap(g, 'The level of thought and care is inspiring. The Arabic is based on the best edition recommended by scholars in Egypt. The English translation is masterful. It’s a must-have.', 54, 210, 610, 48);
    g.fillStyle = C.teal; g.font = F.s(26, 600); g.fillText('On al-Shamaʾil', 54, 760); g.font = F.s(22, 400); g.fillText('[reviewer name to confirm]', 54, 800);
  }), 0.7, 0.88, -14.95, 1.6);

  // Counter, back wall, logo plaque
  block(M.walnut, -2.2, 2.2, 0, 0.98, -19.9, -19.2, { tag: 'place:counter' });
  block(M.oak, -2.26, 2.26, 0.98, 1.03, -19.96, -19.14, { tag: 'place:counter' });
  const fluted = canvasTex(2048, 64, (g, w, h) => { for (let i = 0; i < 120; i++) { const x = i * w / 120, gw = w / 120; const gr = g.createLinearGradient(x, 0, x + gw, 0); gr.addColorStop(0, '#8f6640'); gr.addColorStop(0.35, '#c99f72'); gr.addColorStop(0.7, '#b58757'); gr.addColorStop(1, '#7d5634'); g.fillStyle = gr; g.fillRect(x, 0, gw, h); } });
  block(new THREE.MeshStandardMaterial({ map: fluted, roughness: 0.65 }), -2.21, 2.21, 0.06, 0.95, -19.19, -19.185, { tag: null, cast: false });
  block(M.teal, -2.21, 2.21, 0.0, 0.06, -19.19, -19.18, { tag: null, cast: false });
  block(M.ink, 0.9, 1.3, 1.03, 1.1, -19.7, -19.4, { tag: null }); // till
  { const scr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.015), M.ink); scr.position.set(1.1, 1.22, -19.62); scr.rotation.x = -0.35; scene.add(scr); }
  const logoImg = await loadImg('assets/img/logo.png');
  const logoTex = new THREE.Texture(logoImg); logoTex.colorSpace = THREE.SRGBColorSpace; logoTex.anisotropy = 8; logoTex.needsUpdate = true;
  // paper book bag on the counter, the logo on its side
  block(M.wallW, -1.2, -0.84, 1.03, 1.45, -19.6, -19.44, { tag: null });
  { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.17), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })); l.position.set(-1.02, 1.26, -19.435); scene.add(l); const hnd = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.006, 6, 16, Math.PI), M.teal); hnd.position.set(-1.02, 1.45, -19.52); scene.add(hnd); }
  // a short stack of books on the counter
  ['sirah-of-the-prophet', 'o-son-a-translation-of-imam-al-ghazalis-ayyuhal-walad', '40-hadith-of-imam-al-nawawi'].map((id) => byId[id]).filter(Boolean).forEach((p, i) => {
    const d = dims(p); const m = bookMesh(p, 'spine', [d.w / 2, d.h / 2, d.d / 2]);
    m.rotation.set(0, Math.PI / 2 + (i - 1) * 0.06, Math.PI / 2); m.position.set(-0.2, 1.03 + 0.02 + i * 0.045, -19.55); scene.add(m);
  });
  block(M.wallW, -1.25, 1.25, 1.55, 3.0, -20.985, -20.96, { tag: 'occ' });
  [[-1.29, -1.25, 1.51, 3.04], [1.25, 1.29, 1.51, 3.04]].forEach(([a, b, c, d]) => block(M.oak, a, b, c, d, -21, -20.95, { tag: null }));
  block(M.oak, -1.29, 1.29, 1.51, 1.55, -21, -20.95, { tag: null }); block(M.oak, -1.29, 1.29, 3.0, 3.04, -21, -20.95, { tag: null });
  { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 1.18), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, toneMapped: false })); l.position.set(0, 2.27, -20.955); scene.add(l); }
  sign('Counter · Book bag & checkout', null, 1.9, 0.38, 0, 3.08, -19.05, 0, { tag: 'place:counter' });

  // Pendant lamps: brass domes with warm bulbs, one light per group
  const domeGeo = new THREE.LatheGeometry([[0.016, 0.0], [0.07, -0.008], [0.135, -0.04], [0.18, -0.095], [0.205, -0.16], [0.21, -0.168]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
  const lamps = [];
  const pendant = (x, z, y = 2.9, light = true, order = 0) => {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const d = new THREE.Mesh(domeGeo, M.brass); g.add(d);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10), M.bulb.clone()); b.position.y = -0.11; g.add(b);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, H - y, 4), M.ink); cord.position.y = (H - y) / 2; g.add(cord);
    scene.add(g);
    let pl = null;
    if (light) { pl = new THREE.PointLight(0xffd9a0, 0, 9, 1.6); pl.position.set(x, y - 0.25, z); scene.add(pl); }
    lamps.push({ bulb: b, light: pl, order, max: 5.5 });
  };
  pendant(0, -4.6, 2.95, true, 0); pendant(-0.9, -4.6, 3.05, false, 0); pendant(0.9, -4.6, 3.05, false, 0);
  pendant(0, -9.5, 2.95, true, 1); pendant(0, -14.5, 2.95, true, 2);
  pendant(-4.6, -9.5, 2.95, false, 1); pendant(-4.6, -12, 2.95, true, 1); pendant(-4.6, -14.5, 2.95, false, 2);
  pendant(4.6, -9.5, 2.95, false, 1); pendant(4.6, -12, 2.95, true, 1); pendant(4.6, -14.5, 2.95, false, 2);
  pendant(0, -19.5, 2.7, true, 3); pendant(-1.3, -19.5, 2.8, false, 3); pendant(1.3, -19.5, 2.8, false, 3);
  pendant(4.6, -3.9, 2.95, false, 0); pendant(-4.6, -3.4, 2.95, false, 0);

  // Dust in the sunlight by the window
  const dust = (() => {
    const n = COARSE ? 160 : 320, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { a[i * 3] = -6.8 + rand() * 6; a[i * 3 + 1] = 0.3 + rand() * 2.8; a[i * 3 + 2] = -1 - rand() * 7.5; seed[i] = rand() * 100; }
    g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const spr = canvasTex(64, 64, (c) => { const r = c.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,248,225,1)'); r.addColorStop(0.4, 'rgba(255,240,200,.35)'); r.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = r; c.fillRect(0, 0, 64, 64); });
    const m = new THREE.PointsMaterial({ size: 0.022, map: spr, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85, color: 0xfff1d0 });
    const pts = new THREE.Points(g, m); scene.add(pts); return { pts, a, seed, base: a.slice() };
  })();

  // Collision boxes (xz) and the walk grid
  const OBST = [
    [-2.27, -1.73, -17.04, -6.96], [1.73, 2.27, -17.04, -6.96],
    [-1.43, 1.43, -5.23, -3.97], [-2.27, 2.27, -19.97, -19.13],
    [6.7, 7, -6.45, -1.35], [6.62, 7, -11.15, -7.85],
  ];
  const ROOM = { x0: -6.95, x1: 6.95, z0: -20.95, z1: -0.08 };
  const R = 0.32;
  function collide(p) {
    p.x = clamp(p.x, ROOM.x0 + R, ROOM.x1 - R); p.z = clamp(p.z, ROOM.z0 + R, ROOM.z1 - R);
    for (const [x0, x1, z0, z1] of OBST) {
      if (p.x > x0 - R && p.x < x1 + R && p.z > z0 - R && p.z < z1 + R) {
        const dx0 = p.x - (x0 - R), dx1 = x1 + R - p.x, dz0 = p.z - (z0 - R), dz1 = z1 + R - p.z, m = Math.min(dx0, dx1, dz0, dz1);
        if (m === dx0) p.x = x0 - R; else if (m === dx1) p.x = x1 + R; else if (m === dz0) p.z = z0 - R; else p.z = z1 + R;
      }
    }
  }
  const blocked = (x, z, pad = R + 0.05) => x < ROOM.x0 + pad || x > ROOM.x1 - pad || z < ROOM.z0 + pad || z > ROOM.z1 - pad || OBST.some(([x0, x1, z0, z1]) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad);
  const clear = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.12); for (let i = 1; i < n; i++) { const t = i / n; if (blocked(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; } return true; };
  function route(from, to) { // A* on a 0.25 m grid, then string-pulled
    if (clear(from, to)) return [to];
    const S = 0.25, gx = (x) => Math.round((x + 7) / S), gz = (z) => Math.round(-z / S), W = 57, Hh = 85;
    const key = (i, j) => j * W + i, wx = (i) => i * S - 7, wz = (j) => -j * S;
    const start = [gx(from[0]), gz(from[1])], goal = [gx(to[0]), gz(to[1])];
    const open = new Map([[key(...start), { i: start[0], j: start[1], g: 0, f: 0, prev: null }]]), closed = new Map();
    let found = null, guard = 0;
    while (open.size && guard++ < 6000) {
      let cur = null; for (const n of open.values()) if (!cur || n.f < cur.f) cur = n;
      open.delete(key(cur.i, cur.j)); closed.set(key(cur.i, cur.j), cur);
      if (Math.abs(cur.i - goal[0]) <= 1 && Math.abs(cur.j - goal[1]) <= 1) { found = cur; break; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const i = cur.i + di, j = cur.j + dj, k = key(i, j);
        if (i < 0 || j < 0 || i >= W || j >= Hh || closed.has(k) || blocked(wx(i), wz(j))) continue;
        const g = cur.g + Math.hypot(di, dj), h = Math.hypot(i - goal[0], j - goal[1]);
        const o = open.get(k); if (!o || g < o.g) open.set(k, { i, j, g, f: g + h, prev: cur });
      }
    }
    if (!found) return [to];
    const pts = []; for (let n = found; n; n = n.prev) pts.unshift([wx(n.i), wz(n.j)]);
    pts.push(to);
    const out = []; let a = from;
    for (let i = 0; i < pts.length; i++) { const nx = pts[i + 1]; if (!nx || !clear(a, nx)) { out.push(pts[i]); a = pts[i]; } }
    return out;
  }

  // ---------- picking ----------
  const ray = new THREE.Raycaster(); const hitP = V();
  function pick(ndc, far = 4.2) { // a ray that slips between two books tries again a hair to each side
    const h = pick1(ndc, far);
    if (!h || h.tag !== 'occ') return h;
    for (const [dx, dy] of [[0.012, 0], [-0.012, 0], [0, 0.02], [0, -0.02], [0.024, 0], [-0.024, 0]]) { const h2 = pick1({ x: ndc.x + dx, y: ndc.y + dy }, far); if (h2 && (h2.book || h2.item)) return h2; }
    return h;
  }
  function pick1(ndc, far) {
    ray.setFromCamera(ndc, camera); ray.far = far;
    let best = null, bt = far, bestBook = null, bb = far;
    const test = (box, obj) => { const p = ray.ray.intersectBox(box, hitP); if (p) { const t = p.distanceTo(ray.ray.origin); if (t < bt) { bt = t; best = obj; } if ((obj.book || obj.item) && t < bb) { bb = t; bestBook = obj; } } };
    for (const k in batches) { const b = batches[k]; if (!b.mesh || !ray.ray.intersectsBox(b.box)) continue; for (const bk of b.books) if (!bk.hidden) test(bk.box, { book: bk }); }
    for (const it of items) if (!(it.mesh && it.mesh.userData.taken)) test(it.box, it.p ? { item: it } : { tag: it.tag });
    for (const [box, tag] of solids) test(box, { tag });
    void bestBook; void bb;
    return best;
  }

  // ---------- held book ----------
  const hold = new THREE.Scene();
  hold.add(new THREE.HemisphereLight(0xfffaf0, 0xd9c4a5, 1.25));
  const hl = new THREE.DirectionalLight(0xfff0d6, 1.5); hl.position.set(-1, 2, 2); hold.add(hl, hl.target);
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: C.white, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }));
  veil.renderOrder = 999; veil.frustumCulled = false; scene.add(veil);
  let held = null; // { mesh, from: {pos, quat}, out, t, phase, src }

  function take(target) {
    if (held || !target) return;
    let mesh, src, n, coverAxis, p;
    if (target.book) {
      const b = target.book; p = b.p; n = b.n; src = b;
      const kind = b.kind;
      mesh = bookMesh(p, kind, b.h);
      mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(b.ax, b.ay, b.az));
      mesh.position.copy(b.c);
      coverAxis = kind === 'spine' ? 'x' : 'z';
      b.batch.hide(b); b.hidden = true;
    } else if (target.item) {
      const it = target.item.ref || target.item; p = it.p; n = it.n; src = it; mesh = it.mesh; coverAxis = it.coverAxis;
      scene.remove(mesh); mesh.userData.taken = true;
    } else return;
    upgradeCover(p, mesh.userData.mats);
    hold.add(mesh);
    held = { mesh, p, src, coverAxis, from: { pos: mesh.position.clone(), quat: mesh.quaternion.clone() }, out: mesh.position.clone().addScaledVector(n, 0.2).add(V(0, 0.02, 0)), t: 0, phase: 'in' };
    setHover(null);
    ui.onTake(p);
  }
  function putBack() {
    if (!held || held.phase === 'back') return;
    held.phase = 'back'; held.t = 0; held.backFrom = { pos: held.mesh.position.clone(), quat: held.mesh.quaternion.clone() };
    ui.onPutBack();
  }
  const tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4();
  function holdPose() {
    const toCam = camera.getWorldDirection(V()).negate(), up = UP.clone().applyQuaternion(camera.quaternion);
    let X, Y = up, Z;
    if (held.coverAxis === 'x') { X = toCam; Z = X.clone().cross(Y); } else { Z = toCam; X = Y.clone().cross(Z); }
    tmpM.makeBasis(X, Y, Z); const q = new THREE.Quaternion().setFromRotationMatrix(tmpM);
    q.premultiply(tmpQ.setFromAxisAngle(up, -0.24 + Math.sin(clock.elapsedTime * 0.7) * 0.03));
    const narrow = innerWidth < 760;
    const local = narrow ? V(0, 0.07, -0.62) : V(-0.1, -0.005, -0.5);
    return { pos: camera.localToWorld(local), quat: q };
  }

  // ---------- hover ----------
  let hover = null;
  function setHover(h) {
    const same = (a, b) => a && b && ((a.book && a.book === b.book) || (a.item && a.item === b.item) || (a.tag && a.tag === b.tag));
    if (same(hover, h)) return;
    if (hover && hover.book && !hover.book.hidden) hover.book.batch.show(hover.book);
    if (hover && hover.item && hover.item.mesh && !hover.item.mesh.userData.taken) hover.item.mesh.position.sub(hover.item.lift || V());
    hover = h && (h.book || h.item || (h.tag && h.tag.startsWith('place:'))) ? h : null;
    if (hover && hover.book) hover.book.batch.offset(hover.book, hover.book.n.clone().multiplyScalar(0.03));
    if (hover && hover.item && hover.item.mesh) { hover.item.lift = hover.item.n.clone().multiplyScalar(0.02); hover.item.mesh.position.add(hover.item.lift); }
    let label = '';
    if (hover) {
      const p = hover.book ? hover.book.p : hover.item && (hover.item.ref || hover.item).p;
      if (p) label = `${shortTitle(p.name)} · ${priceOf(p)}`;
      else { const k = hover.tag.slice(6); label = { notice: 'Read the noticeboard', founders: "Read the founders' wall", counter: 'The counter: your book bag & checkout', ebooks: 'Free ebooks: see the list', loved: 'Best loved: see the list' }[k] || `${aisle[k]?.name}: see the list`; }
    }
    ui.onHover(label, !!hover);
  }

  // ---------- movement state ----------
  const me = { x: 0, z: -1.45, yaw: 0, pitch: -0.02, vx: 0, vz: 0, bob: 0 };
  const keys = new Set(); const joy = { x: 0, y: 0 };
  let mode = 'intro'; // intro | walk
  let auto = null; // { path, look, then }
  let warm = 0, pinned = null;
  const clock = { t0: performance.now(), last: performance.now(), elapsedTime: 0, getDelta() { const n = performance.now(), d = (n - this.last) / 1000; this.last = n; this.elapsedTime = (n - this.t0) / 1000; return d; } };
  const lookAtAngles = (from, look) => { const dx = look[0] - from[0], dz = look[2] - from[1], dy = look[1] - EYE; return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }; };
  function goTo(key, { openPanel = false } = {}) {
    const pl = place[key]; if (!pl || held) return;
    const path = route([me.x, me.z], pl.pos);
    const look = lookAtAngles(pl.pos, pl.look);
    if (openPanel && innerWidth > 860) look.yaw -= pl.shift ?? 0.34; // keep the place clear of the panel on the right
    auto = { path, look, key, openPanel }; pinned = pl;
    ui.onPlace(pl);
  }
  function walkTo(x, z) { if (blocked(x, z, R)) return; auto = { path: route([me.x, me.z], [x, z]), look: null }; }

  // ---------- lazy cover loading, nearest aisle first ----------
  const slotCentre = { loved: [6.6, -3.9] }; FACES.forEach((f) => f.slots.forEach((k, i) => { if (!slotCentre[k]) slotCentre[k] = [f.ux, i ? -14.5 : -9.5]; }));
  const queue = Object.keys(atlases).filter((k) => slotTitles[k].length);
  (async () => {
    while (queue.length) {
      queue.sort((a, b) => Math.hypot(slotCentre[a][0] - me.x, slotCentre[a][1] - me.z) - Math.hypot(slotCentre[b][0] - me.x, slotCentre[b][1] - me.z));
      await atlases[queue.shift()].load();
    }
  })();

  // ---------- size, render loop ----------
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 1 ? clamp(2 * Math.atan(Math.tan((62 * Math.PI) / 360) / (w / h) * 0.62) * 180 / Math.PI, 58, 82) : 58;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  renderer.shadowMap.needsUpdate = true;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!visible) return;
    // lights warming up, aisle by aisle
    warm = Math.min(1, warm + dt / 1.25);
    lamps.forEach((l) => { const k = easeOut(clamp((warm - l.order * 0.13) / 0.55, 0, 1)); if (l.light) l.light.intensity = l.max * k; l.bulb.material.color.setRGB(0.55 + 0.45 * k, 0.5 + 0.45 * k, 0.42 + 0.42 * k); });
    renderer.toneMappingExposure = 0.72 + 0.28 * easeOut(warm);
    hemi.intensity = 1.0 + 0.85 * easeOut(warm); sun.intensity = 0.6 + 2.6 * easeOut(clamp(warm * 1.4, 0, 1));
    if (mode === 'intro') {
      me.x = Math.sin(t * 0.19) * 0.14; me.z = -1.45 - (0.5 - 0.5 * Math.cos(t * 0.13)) * 0.45;
      me.yaw = Math.sin(t * 0.16) * 0.045; me.pitch = -0.03 + Math.sin(t * 0.11) * 0.012;
    } else if (!held) {
      let fx = 0, fz = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) fz += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) fz -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) fx -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) fx += 1;
      fx += joy.x; fz += joy.y;
      const len = Math.hypot(fx, fz); if (len > 1) { fx /= len; fz /= len; }
      if (len > 0.05) { auto = null; pinned = null; }
      const sy = Math.sin(me.yaw), cy = Math.cos(me.yaw);
      let tx = (-sy * fz + cy * fx) * 2.3, tz = (-cy * fz - sy * fx) * 2.3;
      if (auto) {
        let dx = 0, dz = 0, d = 0, last = true;
        if (!auto.arrived) {
          const tgt = auto.path[0];
          dx = tgt[0] - me.x; dz = tgt[1] - me.z; d = Math.hypot(dx, dz) || 1e-6;
          last = auto.path.length === 1;
          if (d < (last ? 0.04 : 0.3)) { auto.path.shift(); if (!auto.path.length) auto.arrived = true; }
        }
        if (!auto.arrived) { const sp = Math.min(2.8, d * (last ? 2.2 : 3) + 0.5); tx = (dx / d) * sp; tz = (dz / d) * sp; const wantYaw = auto.look && last && d < 1.2 ? auto.look.yaw : Math.atan2(-dx, -dz); me.yaw += angDiff(me.yaw, wantYaw) * Math.min(1, dt * 3.2); me.pitch += ((auto.look && last && d < 1.2 ? auto.look.pitch : -0.02) - me.pitch) * Math.min(1, dt * 3); }
        else {
          tx = tz = 0;
          if (auto.look) { me.yaw += angDiff(me.yaw, auto.look.yaw) * Math.min(1, dt * 4); me.pitch += (auto.look.pitch - me.pitch) * Math.min(1, dt * 4); }
          if (!auto.look || Math.abs(angDiff(me.yaw, auto.look.yaw)) < 0.01) { const a = auto; auto = null; if (a.openPanel) ui.openPanel(a.key); }
        }
      }
      const k = 1 - Math.exp(-dt * 9); me.vx += (tx - me.vx) * k; me.vz += (tz - me.vz) * k;
      const p = { x: me.x + me.vx * dt, z: me.z + me.vz * dt }; collide(p); me.x = p.x; me.z = p.z;
      me.bob += Math.hypot(me.vx, me.vz) * dt * 5.2;
      ui.onMove(me, pinned || whereAmI());
    }
    camera.position.set(me.x, EYE + Math.sin(me.bob) * 0.008, me.z);
    camera.rotation.set(me.pitch, me.yaw, 0);
    camera.updateMatrixWorld();
    // dust drifts in the sun
    const a = dust.a; for (let i = 0; i < a.length; i += 3) { const s = dust.seed[i / 3]; a[i] = dust.base[i] + Math.sin(t * 0.13 + s) * 0.18; a[i + 1] = dust.base[i + 1] + Math.sin(t * 0.09 + s * 1.7) * 0.22; a[i + 2] = dust.base[i + 2] + Math.cos(t * 0.11 + s) * 0.18; }
    dust.pts.geometry.attributes.position.needsUpdate = true;
    // hover (desktop): what's under the reticle or the mouse
    if (mode === 'walk' && !held && !COARSE && ui.pointer()) { const h = pick(ui.pointer()); setHover(h); }
    // held book
    if (held) {
      held.t += dt;
      const hp = holdPose();
      if (held.phase === 'in') {
        const t1 = clamp(held.t / 0.26, 0, 1), t2 = clamp((held.t - 0.22) / 0.62, 0, 1);
        const mid = held.from.pos.clone().lerp(held.out, easeOut(t1));
        held.mesh.position.copy(mid.lerp(hp.pos, ease(t2)));
        held.mesh.quaternion.copy(held.from.quat).slerp(hp.quat, ease(t2));
        veil.material.opacity = 0.62 * ease(t2);
        if (t2 >= 1) held.phase = 'hold';
      } else if (held.phase === 'hold') {
        held.mesh.position.lerp(hp.pos, 0.2); held.mesh.quaternion.slerp(hp.quat, 0.2);
      } else {
        const t2 = clamp(held.t / 0.5, 0, 1), t1 = clamp((held.t - 0.42) / 0.2, 0, 1);
        const pos = held.backFrom.pos.clone().lerp(held.out, ease(t2)).lerp(held.from.pos, easeOut(t1));
        held.mesh.position.copy(pos); held.mesh.quaternion.copy(held.backFrom.quat).slerp(held.from.quat, ease(t2));
        veil.material.opacity = 0.62 * (1 - ease(t2));
        if (t1 >= 1) {
          hold.remove(held.mesh);
          if (held.src.batch) { held.src.batch.show(held.src); held.src.hidden = false; held.mesh.geometry.dispose(); }
          else { held.mesh.position.copy(held.from.pos); held.mesh.quaternion.copy(held.from.quat); held.mesh.userData.taken = false; scene.add(held.mesh); }
          held = null; ui.onPutBackDone();
        }
      }
      veil.visible = !!held;
    if (held) { veil.position.copy(camera.localToWorld(V(0, 0, -1.2))); veil.quaternion.copy(camera.quaternion); }
    }
    renderer.autoClear = true;
    renderer.render(scene, camera);
    if (held) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(hold, camera); }
  }

  function whereAmI() {
    const f = V(-Math.sin(me.yaw), 0, -Math.cos(me.yaw));
    let best = null, bs = Infinity;
    for (const pl of PLACES) { if (pl.key === 'door') continue; const dx = pl.look[0] - me.x, dz = pl.look[2] - me.z, d = Math.hypot(dx, dz); const s = d - 2.2 * ((dx * f.x + dz * f.z) / (d || 1)); if (s < bs) { bs = s; best = pl; } }
    return best;
  }

  // ---------- input ----------
  const isTyping = (e) => /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
  addEventListener('keydown', (e) => {
    if (mode !== 'walk' || isTyping(e)) return;
    if (held && (e.code === 'KeyE' || e.code === 'Escape')) { e.preventDefault(); putBack(); return; }
    if (ui.panelOpen() && e.code === 'Escape') { ui.closePanel(); return; }
    if (e.code === 'KeyN') { ui.next(); return; }
    if (/^(Key[WASD]|Arrow)/.test(e.code)) { keys.add(e.code); if (e.code.startsWith('Arrow')) e.preventDefault(); }
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  // Mouse: pointer lock while walking; without it, drag to look. Touch: drag to look, tap a book or the floor.
  let drag = null;
  const locked = () => document.pointerLockElement === canvas;
  const ndcOf = (e) => { const r = canvas.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  function activate(target, viaTap) {
    if (!target) return false;
    if (target.book || (target.item && target.item.p)) { take(target); return true; }
    if (target.tag && target.tag.startsWith('place:')) { ui.openPanel(target.tag.slice(6)); if (locked()) document.exitPointerLock(); return true; }
    void viaTap; return false;
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'walk' || held) return;
    if (locked()) { if (e.button === 0) { const h = pick(new THREE.Vector2(0, 0)); if (activate(h)) document.exitPointerLock(); } return; }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    ui.setPointer(e.pointerType === 'mouse' && !locked() ? ndcOf(e) : null);
    if (locked()) { me.yaw -= e.movementX * 0.0022; me.pitch = clamp(me.pitch - e.movementY * 0.0022, -1.1, 1.0); auto = null; if (Math.abs(e.movementX) > 2) pinned = null; return; }
    if (!drag || drag.id !== e.pointerId) return;
    const k = e.pointerType === 'mouse' ? 0.0042 : 0.0058;
    me.yaw += (e.clientX - drag.x) * k; me.pitch = clamp(me.pitch + (e.clientY - drag.y) * k, -1.1, 1.0);
    drag.x = e.clientX; drag.y = e.clientY;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) { auto = null; pinned = null; }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy), quick = performance.now() - drag.t < 450;
    drag = null;
    if (moved > 8 || !quick || held) return;
    const ndc = ndcOf(e), h = pick(ndc, 5.5);
    if (activate(h, true)) return;
    if (e.pointerType === 'mouse' && ui.wantsLock()) { canvas.requestPointerLock?.(); return; }
    // tap the floor to walk there
    ray.setFromCamera(ndc, camera); ray.far = 30;
    const t = -ray.ray.origin.y / ray.ray.direction.y;
    if (t > 0 && t < 25) { const x = ray.ray.origin.x + ray.ray.direction.x * t, z = ray.ray.origin.z + ray.ray.direction.z * t; walkTo(x, z); ui.ping(e.clientX, e.clientY); }
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointerleave', () => ui.setPointer(null));
  document.addEventListener('pointerlockchange', () => ui.onLock(locked()));

  requestAnimationFrame(frame);

  return {
    enter() {
      mode = 'walk'; warm = Math.max(warm, 0.99);
      me.pitch = 0; auto = { path: [[0, -2.1]], look: { yaw: 0, pitch: -0.05 } };
      if (!COARSE && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* drag to look instead */ } }
    },
    lock() { if (!COARSE && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* */ } } },
    goTo, putBack, joy, isHolding: () => !!held, me,
    shadowsDirty() { renderer.shadowMap.needsUpdate = true; },
    debug: { camera, me, take, pick, batches, items, place },
  };
}
