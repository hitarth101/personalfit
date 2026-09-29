// Calories tab: running total for a date, entries, and the three averages.
import { state, saveCalorie, deleteCalorie } from './db.js';
import { calorieAverage, exerciseAverage, maintenance, latestWeight, localDayStr } from './calc.js';
import {
  $, esc, today, todayNum, parseNum, fmtInt, fmtWeight, wUnit, dateLabel, shortDate, timeLabel,
  openSheet, confirmInSheet, flash, setHint, clampDateInput, pastDateNote, ICONS
} from './ui.js';

let refreshAll = () => {};
let pastNote = () => {};
const MAX_ENTRY = 10000;

function kcalError(v) {
  if (!isFinite(v)) return 'Enter a number of calories, like 450.';
  if (v < 0 || v > MAX_ENTRY) return `Enter between 0 and ${fmtInt(MAX_ENTRY)} calories per entry.`;
  return null;
}

export function init(refresh) {
  refreshAll = refresh;
  $('#c-root').innerHTML = `
    <div class="hero" id="c-hero"></div>
    <form class="card entry" id="c-form" novalidate>
      <div class="entry-row">
        <label class="num-field">
          <span class="sr-only">Calories</span>
          <input id="c-value" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="0" enterkeyhint="done">
          <span class="unit">cal</span>
        </label>
        <label class="date-field"><span class="sr-only">Date</span><input id="c-date" type="date" data-today required></label>
      </div>
      <p class="hint" id="c-hint" aria-live="polite"></p>
      <div class="btn-row">
        <button class="btn primary" type="submit">Add</button>
        <button class="btn" type="button" id="c-zero">0 today</button>
      </div>
    </form>
    <h2 class="section-title" id="c-list-title">Entries</h2>
    <div class="list" id="c-list"></div>
    <h2 class="section-title">Daily averages</h2>
    <div class="stats" id="c-stats"></div>
    <p class="footnote" id="c-foot"></p>`;

  const form = $('#c-form'), input = $('#c-value'), date = $('#c-date'), hint = $('#c-hint');
  date.addEventListener('change', () => { clampDateInput(date); setHint(hint, ''); render(); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    clampDateInput(date);
    const v = parseNum(input.value), err = kcalError(v);
    if (err) { setHint(hint, err, true); input.focus(); return; }
    await saveCalorie({ date: date.value, kcal: Math.round(v), added: Date.now() });
    input.value = '';
    setHint(hint, '');
    flash(form.querySelector('button[type=submit]'), 'Added');
    refreshAll();
  });
  $('#c-zero').addEventListener('click', async () => {
    clampDateInput(date);
    await saveCalorie({ date: date.value, kcal: 0, added: Date.now() });
    setHint(hint, '');
    refreshAll();
    flash($('#c-zero'), 'Logged');
  });
  pastNote = pastDateNote(form.querySelector('.entry-row'), date, () => render());
  $('#c-list').addEventListener('click', e => {
    const row = e.target.closest('[data-id]');
    if (row) editCalorie(Number(row.dataset.id));
  });
}

export function render() {
  const date = $('#c-date').value || today();
  pastNote();
  const entries = state.calories.filter(c => c.date === date).sort((a, b) => (a.added || a.id) - (b.added || b.id));
  const total = entries.reduce((t, c) => t + c.kcal, 0);
  const isToday = date === today();

  $('#c-hero').innerHTML = `<div class="label">${esc(dateLabel(date))}</div>
    <div class="value${entries.length ? '' : ' idle'}">${entries.length ? fmtInt(total) : '–'}<span class="u">cal</span></div>
    <div class="sub">${!entries.length ? 'Not logged yet. Unlogged days don’t count toward your average.' : total === 0 ? 'Logged as a 0-calorie day.' : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}</div>`;

  const zero = $('#c-zero');
  zero.textContent = isToday ? '0 today' : '0 for this day';
  zero.disabled = entries.length > 0;
  zero.title = entries.length ? 'This day already has entries' : '';

  $('#c-list-title').textContent = isToday ? 'Today’s entries' : `Entries for ${shortDate(date)}`;
  $('#c-list').innerHTML = entries.length
    ? entries.map(c => `<button type="button" class="row" data-id="${c.id}">
        <span class="main"><span class="t">${c.kcal === 0 ? 'Logged as 0' : 'Entry'}</span>${addedLabel(c)}</span>
        <span class="val">${fmtInt(c.kcal)}<span class="u">cal</span></span>${ICONS.chev}</button>`).join('')
    : `<div class="row"><p class="empty">No entries for ${isToday ? 'today' : 'this day'}. Add calories above, or tap “${zero.textContent}” for a fasting day.</p></div>`;

  renderStats();
}

function renderStats() {
  const t = todayNum();
  const intake = calorieAverage(state.calories, t);
  const burn = exerciseAverage(state.exercise, t);
  const maint = maintenance(state.weights, state.profile, today());
  const latest = latestWeight(state.weights);
  $('#c-stats').innerHTML = `
    <div class="stat"><div class="k">Intake</div><div class="v">${intake ? fmtInt(intake.avg) : '–'}</div><div class="n">${intake ? `cal/day · ${intake.days} ${intake.days === 1 ? 'day' : 'days'}` : 'Starts tomorrow'}</div></div>
    <div class="stat"><div class="k">Maintenance</div><div class="v">${fmtInt(maint)}</div><div class="n">cal/day</div></div>
    <div class="stat"><div class="k">Exercise</div><div class="v">${burn ? fmtInt(burn.avg) : '–'}</div><div class="n">${burn ? 'extra cal/day' : state.exercise.length ? 'Starts tomorrow' : 'No exercise yet'}</div></div>`;
  $('#c-foot').textContent = `Intake averages logged days only, through yesterday. Maintenance is for a sedentary day at ${fmtWeight(latest ? latest.lb : state.profile.startLb)} ${wUnit()}${latest ? '' : ' (your starting weight)'}. Exercise averages every day since your first workout, counting rest days as 0.`;
}

// Sets the entry date (used by the Summary calendar) and focuses the box.
export function prefill(date) {
  $('#c-date').value = date;
  render();
  $('#c-value').focus();
}

export function editCalorie(id) {
  const c = state.calories.find(x => x.id === id);
  if (!c) return;
  openSheet('Edit calories', (body, close) => {
    body.innerHTML = `
      <label class="field"><span>Calories</span>
        <span class="num-field"><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${c.kcal}" data-v><span class="unit">cal</span></span></label>
      <label class="field"><span>Date</span><input class="field-input" type="date" value="${c.date}" max="${today()}" data-d></label>
      <p class="hint" data-h></p>
      <div class="sheet-actions">
        <button type="button" class="btn primary block" data-save>Save</button>
        <button type="button" class="btn block" data-del>Delete</button>
      </div>`;
    const vIn = body.querySelector('[data-v]'), dIn = body.querySelector('[data-d]'), h = body.querySelector('[data-h]');
    dIn.onchange = () => clampDateInput(dIn);
    body.querySelector('[data-save]').onclick = async () => {
      clampDateInput(dIn);
      const v = parseNum(vIn.value), err = kcalError(v);
      if (err) { setHint(h, err, true); return; }
      await saveCalorie({ ...c, date: dIn.value, kcal: Math.round(v) });
      close(); refreshAll();
    };
    body.querySelector('[data-del]').onclick = async () => {
      if (await confirmInSheet(body, { title: 'Delete entry?', message: `${fmtInt(c.kcal)} cal on ${dateLabel(c.date)} will be removed.`, confirm: 'Delete' })) {
        await deleteCalorie(c.id); close(); refreshAll();
      }
    };
  });
}

// "Added 8:14 AM" for same-day entries, "Added Tue, Sep 29" for back-filled ones.
function addedLabel(c) {
  if (!c.added) return '';
  const day = localDayStr(c.added);
  return `<span class="s">Added ${esc(day === c.date ? timeLabel(c.added) : dateLabel(day))}</span>`;
}
