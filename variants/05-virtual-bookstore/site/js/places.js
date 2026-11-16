// The places in the store: the subject aisles, the front table, the stands, and where you stand to see each one.
// Shared by the 3D store (store.js) and the plain list version of the home page (home.js).
import { products, byId } from './app.js';

const isBM = (p) => p.language === 'Bahasa Melayu';
const shelfable = (p) => !p.free && !isBM(p);
const fromPrice = (list) => Math.min(...list.filter((p) => !p.free && p.sizes[0].price != null).map((p) => p.sizes[0].price));

export const AISLES = [
  { key: 'sirah', name: 'Sīrah & the Prophet ﷺ', ar: 'السيرة النبوية', cat: 'Sīrah & the Prophet ﷺ' },
  { key: 'hadith', name: 'Hadith', ar: 'الحديث', cat: 'Hadith' },
  { key: 'quran', name: "Qur'an", ar: 'القرآن الكريم', cat: "Qur'an" },
  { key: 'spirit', name: 'Spirituality & Belief', ar: 'التزكية والعقيدة', cat: 'Spirituality & Belief' },
  { key: 'salawat', name: 'Salawat & Poetry', ar: 'الصلوات والمدائح', cat: 'Salawat & Poetry' },
  { key: 'family', name: 'Family & Character', ar: 'الأسرة والأخلاق', cat: 'Family & Character' },
  { key: 'life', name: 'Life & Seasons', ar: 'الحياة والمواسم', cat: 'Life & Seasons' },
  { key: 'bm', name: 'Buku Bahasa Melayu', ar: null, lang: 'Bahasa Melayu' },
];
AISLES.forEach((a) => {
  a.books = a.lang ? products.filter((p) => p.language === a.lang && !p.free) : products.filter((p) => p.category === a.cat && shelfable(p));
  a.href = a.lang ? `shop.html?lang=${encodeURIComponent(a.lang)}` : `shop.html?cat=${encodeURIComponent(a.cat)}`;
  a.meta = `${a.books.length} titles · from RM${fromPrice(a.books)}`;
});
export const aisle = Object.fromEntries(AISLES.map((a) => [a.key, a]));

export const PREMIUM = ['maghazi-of-sayyiduna-muhammad-gold-premium', 'al-shamail-al-muhammadiyya', 'mukhtasar-sahih-al-bukhari-ibn-abi-jamrah', 'burdah-of-busiri-leather-pu-case', 'sirah-of-the-prophet'].map((id) => byId[id]).filter(Boolean);
export const PREMIUM_NOTE = {
  'maghazi-of-sayyiduna-muhammad-gold-premium': 'Gold Premium',
  'al-shamail-al-muhammadiyya': 'Pre-order · Dec 2026',
  'mukhtasar-sahih-al-bukhari-ibn-abi-jamrah': 'First time in English',
  'burdah-of-busiri-leather-pu-case': 'Leather PU case',
  'sirah-of-the-prophet': 'Hardback',
};
export const FREE = products.filter((p) => p.free);
export const LOVED = products.filter((p) => p.featured && !p.free && !PREMIUM.includes(p));

// pos: where you stand [x, z]; look: what you face [x, y, z]. Units are metres; the door is at z = 0.
export const PLACES = [
  { key: 'door', name: 'The door', kind: 'Entrance', meta: '101 titles · from RM25', pos: [0, -1.1], look: [0, 1.35, -19] },
  { key: 'table', name: 'The front table', kind: 'Premium editions', meta: '5 editions · RM125–220', pos: [0, -2.7], look: [0, 0.82, -4.7], panel: true },
  ...AISLES.map((a) => ({ key: a.key, name: a.name, kind: 'Aisle', meta: a.meta, panel: true })),
  { key: 'ebooks', name: 'Free ebooks', kind: 'Stand', meta: '9 ebooks · free to download', pos: [4.75, -9.5], look: [7, 1.35, -9.5], panel: true },
  { key: 'loved', name: 'Best loved', kind: 'Wall shelf', meta: `${LOVED.length} titles readers come back for`, pos: [4.5, -3.9], look: [7, 1.3, -3.9], panel: true },
  { key: 'notice', name: 'Noticeboard', kind: 'Classes in KL', meta: 'Sat 21 November · Bangsar', pos: [3.75, -14.4], look: [7, 1.6, -14.4], panel: true, open: true },
  { key: 'founders', name: "Founders' wall", kind: 'Since 2007', meta: 'The scholars & translators', pos: [-2.7, -12.4], look: [-7, 1.6, -12.1], shift: 0.02, panel: true, open: true },
  { key: 'counter', name: 'The counter', kind: 'Book bag & checkout', meta: 'Pay on imamghazali.my or WhatsApp', pos: [0, -15.9], look: [0, 1.7, -20], panel: true, open: true },
];
// The aisle stand points: centre aisle faces at x = ±1.75, side aisles at x = ±2.25.
const AISLE_STAND = {
  sirah: [[0.45, -9.5], [-1.75, 1.25, -9.5]], hadith: [[-0.45, -9.5], [1.75, 1.25, -9.5]],
  quran: [[0.45, -14.5], [-1.75, 1.25, -14.5]], spirit: [[-0.45, -14.5], [1.75, 1.25, -14.5]],
  salawat: [[-4.45, -9.5], [-2.25, 1.25, -9.5]], family: [[-4.45, -14.5], [-2.25, 1.25, -14.5]],
  life: [[4.45, -9.5], [2.25, 1.25, -9.5]], bm: [[4.45, -14.5], [2.25, 1.25, -14.5]],
};
PLACES.forEach((p) => { if (AISLE_STAND[p.key]) { p.pos = AISLE_STAND[p.key][0]; p.look = AISLE_STAND[p.key][1]; } });
export const place = Object.fromEntries(PLACES.map((p) => [p.key, p]));
// The guided tour ("Next aisle →"), in the order a first visit makes sense.
export const TOUR = ['table', 'sirah', 'hadith', 'quran', 'spirit', 'salawat', 'family', 'founders', 'counter', 'bm', 'notice', 'ebooks', 'life', 'loved'];
