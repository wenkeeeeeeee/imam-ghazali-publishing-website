// Covers as small CSS 3D books (flat front from the shop mockups, spine colour sampled from the cover).
const spines = await fetch('data/spines.json').then((r) => r.json()).catch(() => ({}));
export const NO_TEX = new Set(['burdah-of-busiri-leather-pu-case', 'sirah-of-the-prophet', 'endless-banquet-i-ii-iii-bundle', 'in-the-company-of-the-quran-an-explanation-of-surah-al-anbiy', 'overachievers-ramadan-a-blueprint-for-success', 'miracles-of-the-prophet-muhammad-gems-from-the-shifa', 'virtues-of-the-sacred-land-of-the-masjid-al-aqsa-compound-an', 'story-of-the-blessed-birth-of-the-prophet-muhammad-and-his-b', 'english-burdah-a-singable-translation-of-imam-al-busiris-cla', 'glad-tidings-of-good-things-ebook']);
const TEX_OF = { 'introduction-to-islamic-creed-ebook': 'introduction-to-islamic-creed-bajuris-epistle', 'morning-evening-invocations-and-the-ten-sevens-before-sunris-2': 'morning-evening-invocations-and-the-ten-sevens-before-sunris' };
export const hasCover = (p) => !NO_TEX.has(p.id);
export const coverSrc = (p) => hasCover(p) ? `assets/covers/${TEX_OF[p.id] || p.id}.webp` : p.image;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// <span class="b3d"> front cover + spine + page block. Photo mockups (no flat cover) sit in a soft tile instead.
export function book3d(p, { lazy = true, cls = '' } = {}) {
  const ld = lazy ? ' loading="lazy"' : '';
  if (!hasCover(p)) return `<span class="b3d is-photo ${cls}"><img src="${esc(p.image)}" alt="${esc(p.name)}" width="600" height="600"${ld}></span>`;
  const thick = p.format === 'Premium edition' ? 1.4 : 1;
  return `<span class="b3d ${cls}" style="--spine:${spines[TEX_OF[p.id] || p.id] || '#1b4a47'};--thick:${thick}"><img class="b3d-front" src="${coverSrc(p)}" alt="${esc(p.name)}" width="512" height="768"${ld}><i class="b3d-spine"></i><i class="b3d-pages"></i></span>`;
}
