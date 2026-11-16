// One smooth-scroll clock for the whole site: Lenis drives ScrollTrigger.
export const gsap = window.gsap;
export const ST = window.ScrollTrigger;
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (gsap && ST) gsap.registerPlugin(ST);
let l = window.__lenis || null;
if (!l && !reduce && window.Lenis) {
  l = new window.Lenis({ lerp: 0.1, smoothWheel: true });
  if (gsap && ST) { l.on('scroll', ST.update); gsap.ticker.add((t) => l.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
  else { const f = (t) => { l.raf(t); requestAnimationFrame(f); }; requestAnimationFrame(f); }
  window.__lenis = l;
}
export const lenis = l;
