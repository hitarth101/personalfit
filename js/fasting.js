// Fasting tab: live timer, start/end, editable start time, save-or-discard, history.
import { state, saveFast, deleteFast, setActiveFast } from './db.js';
import { fastError, activeStartError, formatDuration } from './calc.js';
import {
  $, esc, dateTimeLabel, toLocalInput, fromLocalInput,
  openSheet, confirmInSheet, setHint, ICONS
} from './ui.js';

let refreshAll = () => {};
let timer = null;
let shown = 10;

export function init(refresh) {
  refreshAll = refresh;
  $('#f-root').innerHTML = `
    <div class="card fast-card">
      <div class="fast-state" id="f-state"></div>
      <div class="timer" id="f-timer" role="timer" aria-live="off">00:00:00</div>
      <div id="f-meta"></div>
      <p class="hint" id="f-hint" aria-live="polite"></p>
      <button class="btn primary block" type="button" id="f-main">Start fast</button>
    </div>
    <h2 class="section-title">History</h2>
    <div class="list" id="f-history"></div>`;

  $('#f-main').addEventListener('click', async () => {
    if (state.activeFast) { endFast(); return; }
    const now = Date.now();
    const err = activeStartError(now, state.fasts, now);
    if (err) { setHint($('#f-hint'), err, true); return; }
    setHint($('#f-hint'), '');
    await setActiveFast({ start: now });
    refreshAll();
  });
  $('#f-meta').addEventListener('click', e => { if (e.target.closest('[data-edit-start]')) editStart(); });
  $('#f-history').addEventListener('click', e => {
    const row = e.target.closest('[data-id]');
    if (row) editFast(Number(row.dataset.id));
    if (e.target.closest('[data-more]')) { shown += 20; renderHistory(); }
  });
  document.addEventListener('visibilitychange', tick);
}

const lastFast = () => [...state.fasts].sort((x, y) => y.end - x.end)[0];

// Running: live h:m:s. Idle: the last fast's duration is the hero number.
function tick() {
  const el = $('#f-timer');
  if (state.activeFast) { el.textContent = formatDuration(Date.now() - state.activeFast.start, true); return; }
  const last = lastFast();
  el.textContent = last ? formatDuration(last.end - last.start) : '00:00:00';
}

// The timer only runs while a fast is active and the Fasting tab is on screen.
function syncTimer() {
  const visible = !$('#tab-fasting').hidden;
  clearInterval(timer);
  timer = null;
  tick();
  if (state.activeFast && visible) timer = setInterval(tick, 1000);
}

// Called by app.js on every tab switch.
export { syncTimer as onTab };

export function render() {
  const a = state.activeFast, last = lastFast();
  $('#f-state').textContent = a ? 'Fasting' : last ? 'Last fast' : 'Not fasting';
  $('#f-state').classList.toggle('on', !!a);
  $('#f-timer').classList.toggle('idle', !a && !last);
  $('#f-main').textContent = a ? 'End fast' : 'Start fast';
  if (a) {
    $('#f-meta').innerHTML = `<button type="button" class="start-btn" data-edit-start>Started ${esc(dateTimeLabel(a.start))}<span class="edit">Edit</span></button>`;
  } else {
    $('#f-meta').innerHTML = `<p class="fast-sub">${last ? `Ended ${esc(dateTimeLabel(last.end))}` : 'Tap Start fast when you begin.'}</p>`;
  }
  syncTimer();
  renderHistory();
}

function renderHistory() {
  const list = [...state.fasts].sort((a, b) => b.end - a.end);
  if (!list.length) { $('#f-history').innerHTML = `<div class="row"><p class="empty">Saved fasts will appear here.</p></div>`; return; }
  const more = list.length > shown ? `<div class="row list-more"><button type="button" class="btn quiet" data-more>Show more</button></div>` : '';
  $('#f-history').innerHTML = list.slice(0, shown).map(f => `
    <button type="button" class="row" data-id="${f.id}">
      <span class="main"><span class="t">Ended ${esc(dateTimeLabel(f.end))}</span><span class="s">Started ${esc(dateTimeLabel(f.start))}</span></span>
      <span class="val">${formatDuration(f.end - f.start)}</span>${ICONS.chev}</button>`).join('') + more;
}

function nowInput() { return toLocalInput(Date.now()); }

function editStart() {
  const a = state.activeFast;
  openSheet('Edit start time', (body, close) => {
    body.innerHTML = `
      <label class="field"><span>Started</span><input class="field-input" type="datetime-local" value="${toLocalInput(a.start)}" max="${nowInput()}" data-s></label>
      <p class="hint" data-h></p>
      <div class="sheet-actions"><button type="button" class="btn primary block" data-save>Save</button></div>`;
    body.querySelector('[data-save]').onclick = async () => {
      const start = fromLocalInput(body.querySelector('[data-s]').value);
      const err = activeStartError(start, state.fasts, Date.now());
      if (err) { setHint(body.querySelector('[data-h]'), err, true); return; }
      await setActiveFast({ start });
      close(); refreshAll();
    };
  });
}

function endFast() {
  const a = state.activeFast;
  openSheet('End fast', (body, close) => {
    body.innerHTML = `
      <p class="msg" data-q></p>
      <label class="field"><span>Started</span><input class="field-input" type="datetime-local" value="${toLocalInput(a.start)}" disabled></label>
      <label class="field"><span>Ended</span><input class="field-input" type="datetime-local" value="${nowInput()}" max="${nowInput()}" data-e></label>
      <p class="hint" data-h></p>
      <div class="sheet-actions">
        <button type="button" class="btn primary block" data-save>Save</button>
        <button type="button" class="btn block" data-keep>Keep fasting</button>
        <button type="button" class="btn block" data-discard>Discard</button>
      </div>`;
    const eIn = body.querySelector('[data-e]'), h = body.querySelector('[data-h]');
    const upd = () => {
      const end = fromLocalInput(eIn.value);
      body.querySelector('[data-q]').textContent = end > a.start ? `Save this fast of ${formatDuration(end - a.start)}?` : 'The end must be after the start.';
    };
    eIn.oninput = upd; eIn.onchange = upd;
    upd();
    body.querySelector('[data-save]').onclick = async () => {
      const end = fromLocalInput(eIn.value);
      const err = fastError(a.start, end, state.fasts, Date.now());
      if (err) { setHint(h, err, true); return; }
      await saveFast({ start: a.start, end });
      await setActiveFast(null);
      close(); refreshAll();
    };
    body.querySelector('[data-keep]').onclick = () => close();
    body.querySelector('[data-discard]').onclick = async () => {
      const end = fromLocalInput(eIn.value);
      const shownEnd = end > a.start && end <= Date.now() ? end : Date.now();
      if (await confirmInSheet(body, { title: 'Discard this fast?', message: `This fast of ${formatDuration(shownEnd - a.start)} won’t be saved.`, confirm: 'Discard', cancel: 'Keep fasting' })) {
        await setActiveFast(null); close(); refreshAll();
      }
    };
  });
}

export function editFast(id) {
  const f = state.fasts.find(x => x.id === id);
  if (!f) return;
  openSheet('Edit fast', (body, close) => {
    body.innerHTML = `
      <p class="msg" data-q></p>
      <label class="field"><span>Started</span><input class="field-input" type="datetime-local" value="${toLocalInput(f.start)}" max="${nowInput()}" data-s></label>
      <label class="field"><span>Ended</span><input class="field-input" type="datetime-local" value="${toLocalInput(f.end)}" max="${nowInput()}" data-e></label>
      <p class="hint" data-h></p>
      <div class="sheet-actions">
        <button type="button" class="btn primary block" data-save>Save</button>
        <button type="button" class="btn block" data-del>Delete</button>
      </div>`;
    const sIn = body.querySelector('[data-s]'), eIn = body.querySelector('[data-e]'), h = body.querySelector('[data-h]');
    const upd = () => {
      const s = fromLocalInput(sIn.value), e = fromLocalInput(eIn.value);
      body.querySelector('[data-q]').textContent = e > s ? `Duration ${formatDuration(e - s)}` : 'The end must be after the start.';
    };
    [sIn, eIn].forEach(el => { el.oninput = upd; el.onchange = upd; });
    upd();
    body.querySelector('[data-save]').onclick = async () => {
      const start = fromLocalInput(sIn.value), end = fromLocalInput(eIn.value), now = Date.now();
      let err = fastError(start, end, state.fasts, now, f.id);
      if (!err && state.activeFast && end > state.activeFast.start) err = 'This would overlap the fast you’re in now.';
      if (err) { setHint(h, err, true); return; }
      await saveFast({ ...f, start, end });
      close(); refreshAll();
    };
    body.querySelector('[data-del]').onclick = async () => {
      if (await confirmInSheet(body, { title: 'Delete fast?', message: `The ${formatDuration(f.end - f.start)} fast that ended ${dateTimeLabel(f.end)} will be removed.`, confirm: 'Delete' })) {
        await deleteFast(f.id); close(); refreshAll();
      }
    };
  });
}
