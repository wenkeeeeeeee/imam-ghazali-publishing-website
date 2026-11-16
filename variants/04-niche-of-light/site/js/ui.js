// Controls in the site's own style: every <select> becomes a button with a drawn list (arrows, Enter, Esc,
// type-ahead) that keeps the real select in sync; number inputs get a minus/plus stepper.
let uid = 0;
function enhanceSelect(sel) {
  if (sel.dataset.enhanced) return;
  sel.dataset.enhanced = '1';
  const id = `sel-${++uid}`;
  const wrap = document.createElement('div');
  wrap.className = 'sel';
  sel.after(wrap);
  wrap.append(sel);
  sel.classList.add('sel-native');
  sel.tabIndex = -1;
  sel.setAttribute('aria-hidden', 'true');
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'sel-btn';
  btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', id);
  const label = sel.closest('label')?.querySelector('span.sr-only, :scope > span')?.textContent || sel.getAttribute('aria-label') || '';
  if (label) btn.setAttribute('aria-label', label);
  sel.closest('label')?.querySelector('span.sr-only')?.remove();
  const list = document.createElement('ul');
  list.className = 'sel-list'; list.id = id; list.setAttribute('role', 'listbox'); list.hidden = true;
  wrap.append(btn, list);
  let idx = 0;
  const build = () => {
    list.innerHTML = [...sel.options].map((o, i) => `<li role="option" id="${id}-${i}" data-i="${i}" aria-selected="${o.selected}">${o.textContent}</li>`).join('');
    sync();
  };
  const sync = () => {
    const o = sel.options[sel.selectedIndex];
    btn.innerHTML = `<span>${o ? o.textContent : ''}</span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 6 6.5l5-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
    list.querySelectorAll('li').forEach((li) => li.setAttribute('aria-selected', String(+li.dataset.i === sel.selectedIndex)));
  };
  const mark = (i) => { idx = Math.max(0, Math.min(sel.options.length - 1, i)); list.querySelectorAll('li').forEach((li) => li.classList.toggle('is-active', +li.dataset.i === idx)); const a = list.querySelector('.is-active'); a?.scrollIntoView({ block: 'nearest' }); list.setAttribute('aria-activedescendant', `${id}-${idx}`); };
  const open = () => { document.querySelectorAll('.sel.is-open').forEach((w) => w !== wrap && w.dispatchEvent(new Event('close'))); list.hidden = false; wrap.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); mark(sel.selectedIndex); };
  const close = () => { list.hidden = true; wrap.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
  const choose = (i) => { if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('change', { bubbles: true })); sel.dispatchEvent(new Event('input', { bubbles: true })); } sync(); close(); btn.focus(); };
  wrap.addEventListener('close', close);
  btn.addEventListener('click', () => (list.hidden ? open() : close()));
  list.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) choose(+li.dataset.i); });
  let typed = '', typedT;
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (list.hidden) open(); else mark(idx + (e.key === 'ArrowDown' ? 1 : -1)); }
    else if ((e.key === 'Enter' || e.key === ' ') && !list.hidden) { e.preventDefault(); choose(idx); }
    else if (e.key === 'Escape') close();
    else if (e.key.length === 1) {
      typed += e.key.toLowerCase(); clearTimeout(typedT); typedT = setTimeout(() => { typed = ''; }, 600);
      const i = [...sel.options].findIndex((o) => o.textContent.toLowerCase().startsWith(typed));
      if (i >= 0) { if (list.hidden) open(); mark(i); }
    }
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
  sel.addEventListener('change', sync);
  new MutationObserver(build).observe(sel, { childList: true });
  build();
  // a value set by script (filters from the URL) shows up too
  let last = sel.value;
  setInterval(() => { if (sel.value !== last) { last = sel.value; sync(); } }, 400);
}

function enhanceNumber(input) {
  if (input.dataset.enhanced || input.closest('.stepper, .qty')) return;
  input.dataset.enhanced = '1';
  const min = +(input.min || 1), max = +(input.max || 999);
  input.type = 'text'; input.inputMode = 'numeric';
  const box = document.createElement('div');
  box.className = 'stepper';
  input.after(box);
  const minus = Object.assign(document.createElement('button'), { type: 'button', textContent: '−' });
  const plus = Object.assign(document.createElement('button'), { type: 'button', textContent: '+' });
  minus.setAttribute('aria-label', 'One less'); plus.setAttribute('aria-label', 'One more');
  box.append(minus, input, plus);
  const set = (v) => { input.value = Math.max(min, Math.min(max, v || min)); minus.disabled = +input.value <= min; input.dispatchEvent(new Event('input', { bubbles: true })); };
  minus.addEventListener('click', () => set(+input.value - 1));
  plus.addEventListener('click', () => set(+input.value + 1));
  minus.disabled = +input.value <= min;
}

const run = () => {
  document.querySelectorAll('select:not([multiple])').forEach(enhanceSelect);
  document.querySelectorAll('input[type="number"]').forEach(enhanceNumber);
};
run();
setTimeout(run, 600);
