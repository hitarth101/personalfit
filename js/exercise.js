// Exercise tab: walk/jog/run entry with live preview, direct calorie entry,
// entries for the selected date, average extra burn, and history.
import { state, saveExercise, deleteExercise, saveSettings } from './db.js';
import { exerciseKcal, weightOnOrBefore, paceMinPerUnit, formatPace, exerciseAverage, dayStr } from './calc.js';
import {
  $, esc, today, todayNum, parseNum, fmtInt, fmt1, dUnit, toDisplayDist, fromDisplayDist, dateLabel, shortDate,
  openSheet, confirmInSheet, flash, setHint, segmented, clampDateInput, pastDateNote, ICONS
} from './ui.js';

let refreshAll = () => {};
let selected = null; // date whose entries are listed
let shown = 10;
const NAMES = { walk: 'Walk', jog: 'Jog', run: 'Run', direct: 'Other activity' };

// Checks activity inputs (display units). Returns {minutes, km} or {error}.
function readActivity(minStr, distStr) {
  const minutes = parseNum(minStr), dist = parseNum(distStr);
  if (!isFinite(minutes) || minutes <= 0) return { error: 'Enter the duration in minutes.' };
  if (minutes > 1440) return { error: 'Duration can’t be more than 24 hours.' };
  if (!isFinite(dist) || dist <= 0) return { error: `Enter the distance in ${dUnit()}.` };
  const km = fromDisplayDist(dist);
  if (km > 200) return { error: 'That distance looks too long. Check the number.' };
  return { minutes, km };
}

function kcalFor(type, km, date) {
  return exerciseKcal(type, km, weightOnOrBefore(state.weights, date, state.profile.startLb));
}

// "Pace 8:00 /km · 400 extra cal" or a prompt when incomplete.
function previewText(type, minStr, distStr, date) {
  const r = readActivity(minStr, distStr);
  if (r.error) return { text: 'Enter duration and distance to see pace and calories.', ok: false };
  const pace = formatPace(paceMinPerUnit(r.minutes, r.km, dUnit()));
  return { text: `Pace ${pace} /${dUnit()} · ${fmtInt(kcalFor(type, r.km, date))} extra cal`, ok: true };
}

export function init(refresh) {
  refreshAll = refresh;
  $('#e-root').innerHTML = `
    <form class="card entry" id="e-form" novalidate>
      <div class="seg" role="group" aria-label="Activity" id="e-type">
        <button type="button" data-v="walk" aria-pressed="true">Walk</button>
        <button type="button" data-v="jog" aria-pressed="false">Jog</button>
        <button type="button" data-v="run" aria-pressed="false">Run</button>
      </div>
      <div class="entry-row">
        <label class="num-field"><span class="sr-only">Duration in minutes</span>
          <input id="e-min" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="0"><span class="unit">min</span></label>
        <label class="num-field"><span class="sr-only">Distance</span>
          <input id="e-dist" type="text" inputmode="decimal" autocomplete="off" placeholder="0.0"><span class="unit" data-unit="dist">km</span></label>
      </div>
      <div class="entry-row">
        <label class="grow"><span class="sr-only">Note (optional)</span>
          <input id="e-note" class="field-input" type="text" maxlength="80" autocomplete="off" placeholder="Note (optional)" enterkeyhint="done"></label>
        <label class="date-field"><span class="sr-only">Date</span><input id="e-date" type="date" data-today required></label>
      </div>
      <p class="preview" id="e-preview" aria-live="polite"></p>
      <p class="hint" id="e-hint" aria-live="polite"></p>
      <button class="btn primary block" type="submit">Save</button>
    </form>

    <h2 class="section-title">Other activity</h2>
    <form class="card entry" id="e-direct" novalidate>
      <div class="entry-row">
        <label class="num-field"><span class="sr-only">Calories burned</span>
          <input id="e-kcal" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="0"><span class="unit">cal</span></label>
        <label class="date-field"><span class="sr-only">Date</span><input id="e-kdate" type="date" data-today required></label>
      </div>
      <p class="hint" id="e-khint" aria-live="polite"></p>
      <button class="btn block" type="submit">Add</button>
      <p class="card-note">For anything besides walks, jogs and runs. Enter extra calories only, like your watch’s active calories.</p>
    </form>

    <h2 class="section-title" id="e-day-title">Today</h2>
    <div class="list" id="e-day"></div>

    <h2 class="section-title">Average extra burn</h2>
    <div class="card" id="e-avg"></div>

    <h2 class="section-title">History</h2>
    <div class="list" id="e-history"></div>`;

  const type = { v: state.settings.lastActivity || 'walk' };
  const setType = segmented($('#e-type'), v => { type.v = v; saveSettings({ lastActivity: v }); updatePreview(); });
  setType(type.v);
  const min = $('#e-min'), dist = $('#e-dist'), note = $('#e-note'), date = $('#e-date'), hint = $('#e-hint');
  const updatePreview = () => {
    const p = previewText(type.v, min.value, dist.value, date.value || today());
    $('#e-preview').textContent = p.text;
    $('#e-preview').classList.toggle('ready', p.ok);
  };
  [min, dist].forEach(el => el.addEventListener('input', () => { updatePreview(); setHint(hint, ''); }));
  date.addEventListener('change', () => { clampDateInput(date); selected = date.value; updatePreview(); render(); });

  $('#e-form').addEventListener('submit', async e => {
    e.preventDefault();
    clampDateInput(date);
    const r = readActivity(min.value, dist.value);
    if (r.error) { setHint(hint, r.error, true); return; }
    await saveExercise({ date: date.value, type: type.v, minutes: r.minutes, km: Math.round(r.km * 1000) / 1000, note: note.value.trim(), kcal: kcalFor(type.v, r.km, date.value), added: Date.now() });
    min.value = dist.value = note.value = '';
    document.activeElement && document.activeElement.blur();
    selected = date.value;
    flash($('#e-form button[type=submit]'));
    updatePreview();
    refreshAll();
  });

  const kcal = $('#e-kcal'), kdate = $('#e-kdate'), khint = $('#e-khint');
  kdate.addEventListener('change', () => { clampDateInput(kdate); selected = kdate.value; render(); });
  $('#e-direct').addEventListener('submit', async e => {
    e.preventDefault();
    clampDateInput(kdate);
    const v = parseNum(kcal.value);
    if (!isFinite(v) || v <= 0 || v > 10000) { setHint(khint, 'Enter the calories burned, between 1 and 10,000.', true); return; }
    await saveExercise({ date: kdate.value, type: 'direct', kcal: Math.round(v), note: '', added: Date.now() });
    kcal.value = '';
    kcal.blur();
    setHint(khint, '');
    selected = kdate.value;
    flash($('#e-direct button[type=submit]'), 'Added');
    refreshAll();
  });

  const onRow = e => {
    const row = e.target.closest('[data-id]');
    if (row) editExercise(Number(row.dataset.id));
    if (e.target.closest('[data-more]')) { shown += 20; renderHistory(); }
  };
  $('#e-day').addEventListener('click', onRow);
  $('#e-history').addEventListener('click', onRow);
  init.updatePreview = updatePreview;
  const toToday = () => { selected = today(); updatePreview(); render(); };
  notes.push(pastDateNote(date.closest('.entry-row'), date, toToday), pastDateNote(kdate.closest('.entry-row'), kdate, toToday));
}

export function newDay() { selected = null; }
const notes = [];

export function render() {
  notes.forEach(n => n());
  document.querySelectorAll('[data-unit="dist"]').forEach(el => { el.textContent = dUnit(); });
  if (!selected || selected > today()) selected = $('#e-date').value || today();
  init.updatePreview();
  renderDay();
  renderAverage();
  renderHistory();
}

function rowHtml(x, withDate) {
  const u = dUnit();
  let title, sub;
  if (x.type === 'direct') {
    title = NAMES.direct;
    sub = withDate ? dateLabel(x.date) : '';
  } else {
    title = `${NAMES[x.type]} · ${fmt1(toDisplayDist(x.km))} ${u} · ${Math.round(x.minutes)} min`;
    sub = [withDate ? dateLabel(x.date) : '', `${formatPace(paceMinPerUnit(x.minutes, x.km, u))} /${u}`, x.note].filter(Boolean).join(' · ');
  }
  return `<button type="button" class="row" data-id="${x.id}">
    <span class="main"><span class="t">${esc(title)}</span>${sub ? `<span class="s">${esc(sub)}</span>` : ''}</span>
    <span class="val">${fmtInt(x.kcal)}<span class="u">cal</span></span>${ICONS.chev}</button>`;
}

function renderDay() {
  const list = state.exercise.filter(x => x.date === selected).sort((a, b) => (a.added || a.id) - (b.added || b.id));
  const isToday = selected === today();
  $('#e-day-title').textContent = isToday ? 'Today' : dateLabel(selected);
  const total = list.reduce((t, x) => t + x.kcal, 0);
  $('#e-day').innerHTML = list.length
    ? list.map(x => rowHtml(x, false)).join('') + (list.length > 1 ? `<div class="row total"><span class="main">Total</span><span class="val">${fmtInt(total)}<span class="u">cal</span></span></div>` : '')
    : `<div class="row"><p class="empty">No exercise logged for ${isToday ? 'today' : 'this day'}.</p></div>`;
}

function renderAverage() {
  const r = exerciseAverage(state.exercise, todayNum());
  const el = $('#e-avg');
  if (!r) {
    el.innerHTML = `<p class="card-lead">${state.exercise.length ? 'Your average appears tomorrow, once your first day of exercise is complete.' : 'Log a walk, jog, run or other activity to start your average.'}</p>`;
    return;
  }
  const first = dayStr(todayNum() - r.days);
  el.innerHTML = `<div class="big-stat"><span class="v">${fmtInt(r.avg)}</span><span class="u">extra cal/day</span></div>
    <p class="card-note">Over ${r.days} ${r.days === 1 ? 'day' : 'days'}, ${shortDate(first)} through yesterday. Days without exercise count as 0.</p>`;
}

function renderHistory() {
  const list = [...state.exercise].sort((a, b) => b.date.localeCompare(a.date) || (b.added || b.id) - (a.added || a.id));
  if (!list.length) { $('#e-history').innerHTML = `<div class="row"><p class="empty">Your workouts will appear here.</p></div>`; return; }
  const more = list.length > shown ? `<div class="row list-more"><button type="button" class="btn quiet" data-more>Show more</button></div>` : '';
  $('#e-history').innerHTML = list.slice(0, shown).map(x => rowHtml(x, true)).join('') + more;
}

// Sets both entry dates (used by the Summary calendar) and focuses the activity form.
export function prefill(date) {
  $('#e-date').value = date;
  $('#e-kdate').value = date;
  selected = date;
  render();
  window.scrollTo(0, 0);
  $('#e-min').focus();
}

export function editExercise(id) {
  const x = state.exercise.find(e => e.id === id);
  if (!x) return;
  const u = dUnit();
  const direct = x.type === 'direct';
  openSheet(direct ? 'Edit other activity' : 'Edit workout', (body, close) => {
    body.innerHTML = direct ? `
      <label class="field"><span>Calories burned</span>
        <span class="num-field"><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${x.kcal}" data-k><span class="unit">cal</span></span></label>`
      : `
      <div class="seg" role="group" aria-label="Activity" data-type>
        ${['walk', 'jog', 'run'].map(t => `<button type="button" data-v="${t}" aria-pressed="${t === x.type}">${NAMES[t]}</button>`).join('')}
      </div>
      <div class="entry-row">
        <label class="field grow"><span>Duration</span><span class="num-field"><input type="text" inputmode="numeric" autocomplete="off" value="${Math.round(x.minutes)}" data-m><span class="unit">min</span></span></label>
        <label class="field grow"><span>Distance</span><span class="num-field"><input type="text" inputmode="decimal" autocomplete="off" value="${fmt1(toDisplayDist(x.km))}" data-dist><span class="unit">${u}</span></span></label>
      </div>
      <label class="field"><span>Note</span><input class="field-input" type="text" maxlength="80" value="${esc(x.note || '')}" placeholder="Optional" data-n></label>`;
    body.innerHTML += `
      <label class="field"><span>Date</span><input class="field-input" type="date" value="${x.date}" max="${today()}" data-d></label>
      ${direct ? '' : '<p class="preview ready" data-p></p>'}
      <p class="hint" data-h></p>
      <div class="sheet-actions">
        <button type="button" class="btn primary block" data-save>Save</button>
        <button type="button" class="btn block" data-del>Delete</button>
      </div>`;
    const q = s => body.querySelector(s);
    const dIn = q('[data-d]'), h = q('[data-h]');
    let type = x.type;
    // Distance shown with one decimal: keep the stored value unless the owner changes it.
    const shownDist = direct ? '' : fmt1(toDisplayDist(x.km));
    const upd = () => { if (!direct) q('[data-p]').textContent = previewText(type, q('[data-m]').value, q('[data-dist]').value, dIn.value).text; };
    if (!direct) {
      segmented(q('[data-type]'), v => { type = v; upd(); });
      q('[data-m]').oninput = upd; q('[data-dist]').oninput = upd;
      upd();
    }
    dIn.onchange = () => { clampDateInput(dIn); upd(); };
    q('[data-save]').onclick = async () => {
      clampDateInput(dIn);
      if (direct) {
        const v = parseNum(q('[data-k]').value);
        if (!isFinite(v) || v <= 0 || v > 10000) { setHint(h, 'Enter the calories burned, between 1 and 10,000.', true); return; }
        await saveExercise({ ...x, date: dIn.value, kcal: Math.round(v) });
      } else {
        const r = readActivity(q('[data-m]').value, q('[data-dist]').value);
        if (r.error) { setHint(h, r.error, true); return; }
        const km = q('[data-dist]').value.trim() === shownDist ? x.km : Math.round(r.km * 1000) / 1000;
        // Calories are recalculated because the entry was edited (functional spec §7).
        await saveExercise({ ...x, type, date: dIn.value, minutes: r.minutes, km, note: q('[data-n]').value.trim(), kcal: kcalFor(type, km, dIn.value) });
      }
      close(); refreshAll();
    };
    q('[data-del]').onclick = async () => {
      if (await confirmInSheet(body, { title: 'Delete entry?', message: `${direct ? NAMES.direct : NAMES[x.type]} on ${dateLabel(x.date)} (${fmtInt(x.kcal)} cal) will be removed.`, confirm: 'Delete' })) {
        await deleteExercise(x.id); close(); refreshAll();
      }
    };
  });
}
