// Shared UI helpers: formatting, icons, bottom sheets, confirmations.
import { state } from './db.js';
import { lbToKg, kgToLb, kmToMi, miToKm, dayNum, localDayStr } from './calc.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Today ----------

export const today = () => localDayStr();
export const todayNum = () => dayNum(localDayStr());

// ---------- Numbers and units ----------

export const MINUS = '−';

// Accepts "208.4" or "208,4". Returns a number or NaN.
export function parseNum(str) {
  const s = String(str ?? '').trim().replace(',', '.');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return NaN;
  return parseFloat(s);
}

export const wUnit = () => state.settings.weightUnit;
export const dUnit = () => state.settings.distUnit;
export const toDisplayWeight = (lb, unit = wUnit()) => unit === 'kg' ? lbToKg(lb) : lb;
export const fromDisplayWeight = (v, unit = wUnit()) => unit === 'kg' ? kgToLb(v) : v;
export const toDisplayDist = (km, unit = dUnit()) => unit === 'mi' ? kmToMi(km) : km;
export const fromDisplayDist = (v, unit = dUnit()) => unit === 'mi' ? miToKm(v) : v;

export const fmt1 = n => n.toFixed(1);
export const fmtWeight = (lb, unit = wUnit()) => fmt1(toDisplayWeight(lb, unit));
export const fmtInt = n => Math.round(n).toLocaleString('en-US');

// Signed number with a true minus sign, e.g. "−1.4" or "+0.3".
export function signed(n, digits = 1) {
  const r = Number(n.toFixed(digits));
  if (r === 0) return (0).toFixed(digits);
  return (r < 0 ? MINUS : '+') + Math.abs(r).toFixed(digits);
}

// ---------- Dates ----------

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export { MO as MONTHS_SHORT };

function partsOf(str) { const [y, m, d] = str.split('-').map(Number); return { y, m, d, wd: new Date(y, m - 1, d).getDay() }; }

// "Today", "Yesterday", "Mon, Sep 28", or "Mon, Sep 28, 2025" for other years.
export function dateLabel(str) {
  const t = today();
  if (str === t) return 'Today';
  if (dayNum(t) - dayNum(str) === 1) return 'Yesterday';
  const p = partsOf(str);
  const base = `${WD[p.wd]}, ${MO[p.m - 1]} ${p.d}`;
  return p.y === Number(t.slice(0, 4)) ? base : `${base}, ${p.y}`;
}

export function shortDate(str) { const p = partsOf(str); return `${MO[p.m - 1]} ${p.d}`; }

export function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// "Mon, Sep 28, 8:10 PM" for use mid-sentence ("today"/"yesterday" in lowercase).
export function dateTimeLabel(ts) {
  const d = dateLabel(localDayStr(ts));
  return `${d === 'Today' || d === 'Yesterday' ? d.toLowerCase() : d}, ${timeLabel(ts)}`;
}

// Value for <input type="datetime-local"> from a timestamp, and back.
export function toLocalInput(ts) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function fromLocalInput(v) {
  if (!v) return NaN;
  const [date, time] = v.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '0:0').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}

// Keeps a date input valid: never in the future, never empty.
export function clampDateInput(input) {
  const t = today();
  input.max = t;
  if (!input.value || input.value > t) input.value = t;
}

// ---------- Theme ----------

// Applies 'dark' or 'light' to the page, the browser chrome, and the iPhone status bar.
// localStorage keeps a copy so the next launch paints the right theme before the database loads.
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('meta[name="theme-color"]').content = theme === 'light' ? '#FFFFFF' : '#0E1012';
  $('meta[name="apple-mobile-web-app-status-bar-style"]').content = theme === 'light' ? 'default' : 'black-translucent';
  try { localStorage.setItem('pf-theme', theme); } catch (e) {}
}

// ---------- Icons (hand-drawn, 24-unit grid, one stroke weight) ----------

function gearPath() {
  const teeth = 8, rOut = 10, rIn = 7.6, cx = 12, cy = 12;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const w = Math.PI / teeth * 0.55;
    const pts = [[rIn, a - w * 1.25], [rOut, a - w * 0.7], [rOut, a + w * 0.7], [rIn, a + w * 1.25]];
    pts.forEach(([r, t], j) => {
      const x = (cx + r * Math.cos(t)).toFixed(2), y = (cy + r * Math.sin(t)).toFixed(2);
      d += (i === 0 && j === 0 ? 'M' : 'L') + x + ' ' + y + ' ';
    });
    const next = ((i + 1) / teeth) * Math.PI * 2 - w * 1.25;
    d += `A${rIn} ${rIn} 0 0 1 ${(cx + rIn * Math.cos(next)).toFixed(2)} ${(cy + rIn * Math.sin(next)).toFixed(2)} `;
  }
  return d + 'Z';
}

const S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
export const ICONS = {
  weight: `<svg viewBox="0 0 24 24" aria-hidden="true" ${S}><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M7.5 11a4.5 4.5 0 0 1 9 0"/><path d="M12 11l2-2.8"/></svg>`,
  calories: `<svg viewBox="0 0 24 24" aria-hidden="true" ${S}><path d="M6.5 3v5.5a2.5 2.5 0 0 0 5 0V3"/><path d="M9 3v18"/><path d="M17.5 21V3c-2.2 1.4-3.3 4-3.3 7.4V14h3.3"/></svg>`,
  exercise: `<svg viewBox="0 0 24 24" aria-hidden="true" ${S}><path d="M12 21.2c-3.8 0-6.4-2.6-6.4-6.1 0-3.4 2.4-5.3 3.6-8 .5 2 1.4 3.2 2.6 3.8-.1-3.4 1.3-6.2 3.6-8.1.3 3.4 3.4 5.6 3.4 10.1 0 5.3-3 8.3-6.8 8.3z"/><path d="M12 21.2c-1.6 0-2.8-1.2-2.8-2.9 0-1.8 1.5-2.7 2.1-4.3 1.9 1 3.5 2.4 3.5 4.3 0 1.7-1.2 2.9-2.8 2.9z"/></svg>`,
  fasting: `<svg viewBox="0 0 24 24" aria-hidden="true" ${S}><circle cx="12" cy="13.5" r="7.8"/><path d="M12 13.5V9.2"/><path d="M9.5 2.6h5"/><path d="M12 2.6v3.1"/></svg>`,
  summary: `<svg viewBox="0 0 24 24" aria-hidden="true" ${S}><rect x="3.5" y="4.8" width="17" height="16" rx="3"/><path d="M3.5 10h17"/><path d="M8 2.8v4"/><path d="M16 2.8v4"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" aria-hidden="true" ${S}><path d="${gearPath()}"/><circle cx="12" cy="12" r="3"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
  next: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`,
  chev: `<svg class="chev" viewBox="0 0 8 13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5l5 5-5 5"/></svg>`,
  close: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>`,
  warn: `<svg class="warn" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5"/><path d="M12 17.4v.1"/></svg>`
};

export function paintIcons(root = document) {
  $$('[data-icon]', root).forEach(el => { el.innerHTML = ICONS[el.dataset.icon] || ''; });
}

// ---------- Bottom sheet ----------

// Opens a sheet. `build(body, close)` fills it. Returns a promise resolved with
// whatever value close(value) receives (undefined when dismissed).
export function openSheet(title, build) {
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'sheet';
    dlg.setAttribute('aria-label', title);
    dlg.innerHTML = `<div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${ICONS.close}</button></div><div class="sheet-body"></div>`;
    document.body.appendChild(dlg);
    let result, done = false;
    // Remove the sheet as soon as it closes; don't depend on the 'close' event alone.
    const finish = () => { if (done) return; done = true; dlg.remove(); resolve(result); };
    const close = value => { result = value; if (dlg.open) dlg.close(); finish(); };
    dlg.addEventListener('close', finish); // any other native close
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(); }); // Escape key
    dlg.addEventListener('click', e => {
      if (e.target === dlg) { // tap on the dimmed backdrop
        const r = dlg.getBoundingClientRect();
        if (e.clientY < r.top) close();
      }
      if (e.target.closest('[data-close]')) close();
    });
    build($('.sheet-body', dlg), close, dlg);
    dlg.showModal();
    // Don't pop the keyboard open automatically; focus the sheet itself.
    dlg.focus();
  });
}

// Yes/no confirmation in a sheet. Resolves true only when confirmed.
export function confirmSheet({ title, message, confirm, cancel = 'Cancel' }) {
  return openSheet(title, (body, close) => {
    body.innerHTML = `<p class="msg">${esc(message)}</p>
      <div class="sheet-actions">
        <button type="button" class="btn block" data-yes>${esc(confirm)}</button>
        <button type="button" class="btn block" data-no>${esc(cancel)}</button>
      </div>`;
    $('[data-yes]', body).onclick = () => close(true);
    $('[data-no]', body).onclick = () => close(false);
  }).then(v => v === true);
}

// Brief confirmation on a button after saving ("Saved").
export function flash(btn, text = 'Saved') {
  if (!btn._t) btn.dataset.label = btn.textContent;
  btn.textContent = text;
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.textContent = btn.dataset.label; btn._t = null; }, 1100);
}

// Errors carry a warning icon so they don't rely on color alone.
export function setHint(el, text, isError = false) {
  el.innerHTML = text ? (isError ? ICONS.warn : '') + `<span>${esc(text)}</span>` : '';
  el.classList.toggle('error', !!(text && isError));
}

// Asks for confirmation inside an open sheet instead of stacking a second one.
// Resolves true when confirmed; on cancel the sheet's previous content comes back.
export function confirmInSheet(body, { title, message, confirm, cancel = 'Cancel' }) {
  return new Promise(resolve => {
    const dlg = body.closest('dialog');
    const head = dlg.querySelector('.sheet-head h2');
    const oldTitle = head.textContent;
    const saved = document.createDocumentFragment();
    while (body.firstChild) saved.appendChild(body.firstChild);
    head.textContent = title;
    body.innerHTML = `<p class="msg">${esc(message)}</p>
      <div class="sheet-actions">
        <button type="button" class="btn block" data-yes>${esc(confirm)}</button>
        <button type="button" class="btn block" data-no>${esc(cancel)}</button>
      </div>`;
    body.querySelector('[data-yes]').onclick = () => resolve(true);
    body.querySelector('[data-no]').onclick = () => {
      body.innerHTML = '';
      body.appendChild(saved);
      head.textContent = oldTitle;
      resolve(false);
    };
  });
}

// Shows "Logging for Tue, Sep 15 · Today" under an entry form whenever its date isn't
// today, so a back-dated entry never happens by accident. Returns an update function.
export function pastDateNote(anchor, dateInput, onReset) {
  const note = document.createElement('div');
  note.className = 'past-note';
  note.hidden = true;
  anchor.insertAdjacentElement('afterend', note);
  const update = () => {
    const past = dateInput.value && dateInput.value !== today();
    note.hidden = !past;
    if (past) note.innerHTML = `<span>Logging for <b>${esc(dateLabel(dateInput.value))}</b></span><button type="button" class="btn quiet">Today</button>`;
  };
  note.addEventListener('click', e => {
    if (!e.target.closest('button')) return;
    dateInput.value = today();
    update();
    onReset && onReset();
  });
  dateInput.addEventListener('change', update);
  return update;
}

// Segmented control helper: wires clicks and returns a setter.
export function segmented(el, onChange) {
  const set = v => $$('button', el).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  el.addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    set(b.dataset.v);
    onChange(b.dataset.v);
  });
  return set;
}
