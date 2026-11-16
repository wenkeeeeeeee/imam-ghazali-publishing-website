// The lamp shelf: a dark shelf of real covers slides under the lamp; the lit book shows its parts and price.
// Shares the hero's one WebGL canvas: the canvas moves here once the hero has scrolled away.
export function initShelf({ renderer, makePlane, Transform, canvas, reduce, G, ST }) {
  const sec = document.querySelector('[data-shelf]');
  if (!sec) return;
  const stage = sec.querySelector('[data-shelf-stage]');
  const track = sec.querySelector('[data-shelf-track]');
  const books = [...sec.querySelectorAll('[data-shelf-book]')];
  const flame = sec.querySelector('[data-shelf-flame]');
  const flameSvg = flame.querySelector('svg');
  const hero = document.querySelector('[data-stage]');
  const still = reduce || !G || !ST;
  if (still) { sec.classList.add('is-still'); books.forEach((b) => b.classList.add('is-lit')); return; }

  let W = stage.clientWidth, H = stage.clientHeight, p = 0, x = W * 0.5, y = H * 0.4, active = -1;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pointer = { x: 0, y: 0, t: -1e9 };
  const rel = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  stage.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') { [pointer.x, pointer.y] = rel(e); pointer.t = performance.now(); } });
  stage.addEventListener('pointerleave', () => { pointer.t = -1e9; });
  stage.addEventListener('touchmove', (e) => { [pointer.x, pointer.y] = rel(e.touches[0]); pointer.y -= 60; pointer.t = performance.now(); }, { passive: true });

  const scene = renderer ? new Transform() : null;
  const planes = renderer ? books.map((b, i) => makePlane(b.querySelector('.ls-img'), i, scene)) : [];
  if (renderer) sec.classList.add('has-gl');

  const span = () => Math.max(0, track.scrollWidth - W + parseFloat(getComputedStyle(track).paddingLeft));
  ST.create({ trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true,
    onUpdate: (self) => { p = self.progress; } });
  addEventListener('resize', () => { W = stage.clientWidth; H = stage.clientHeight; });

  let running = false, tx = 0;
  new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) requestAnimationFrame(frame); }, { threshold: 0 }).observe(sec);
  const t0 = performance.now();
  const sr = () => stage.getBoundingClientRect();

  function frame(now) {
    if (!running) return;
    const t = (now - t0) / 1000;
    tx += (-p * span() - tx) * 0.14;
    track.style.transform = `translate3d(${tx}px,0,0)`;
    const s = sr();
    const rects = books.map((b) => { const r = b.querySelector('.ls-img img').getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; });
    const mouse = fine && pointer.t > 0;
    const live = mouse || now - pointer.t < 2600;
    // the lamp rests a little left of centre and the shelf slides under it
    const anchor = live ? pointer.x : W * (W > 760 ? 0.44 : 0.5);
    let best = 0, bd = 1e9;
    rects.forEach((r, i) => { const d = Math.abs(r.x + r.w / 2 - anchor); if (d < bd) { bd = d; best = i; } });
    const b = rects[best];
    const tgx = live ? pointer.x : b.x + b.w * (0.5 + 0.18 * Math.sin(t * 0.6));
    const tgy = live ? pointer.y : b.y + b.h * (0.3 + 0.08 * Math.sin(t * 0.8));
    const k = mouse ? 0.35 : live ? 0.24 : 0.08;
    x += (tgx - x) * k; y += (tgy - y) * k;
    if (best !== active) { active = best; books.forEach((el, i) => el.classList.toggle('is-lit', i === best)); }
    flame.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    flame.style.opacity = fine ? '0' : ''; // with a mouse the cursor flame is the only flame
    flameSvg.style.transform = `scale(${1 + 0.035 * Math.sin(t * 9.7)}, ${1 + 0.06 * Math.sin(t * 6.1 + 0.6)}) skewX(${Math.sin(t * 2.3) * 2.2}deg)`;

    const heroOwns = hero && hero.getBoundingClientRect().bottom > innerHeight * 0.35;
    if (renderer && !heroOwns) {
      if (canvas.parentNode !== stage) { stage.prepend(canvas); renderer.setSize(W, H); }
      const flick = 1 + 0.05 * Math.sin(t * 13.1) + 0.035 * Math.sin(t * 7.3 + 1.2);
      planes.forEach((pl, i) => {
        const r = rects[i];
        pl.mesh.visible = pl.ready && r.x < W && r.x + r.w > 0;
        if (!pl.mesh.visible) return;
        const u = pl.uniforms;
        u.uRect.value = [r.x, r.y, r.w, r.h]; u.uRes.value = [W, H];
        u.uLamp.value = [x, y - 24, 130]; u.uPower.value = 1.1 * flick;
        u.uAmbient.value = 0.1; u.uRadius.value = Math.max(150, H * 0.3); u.uAlpha.value = 1; u.uRelief.value = 2.2;
      });
      renderer.render({ scene, frustumCull: false, sort: false });
    }
    requestAnimationFrame(frame);
  }
}
