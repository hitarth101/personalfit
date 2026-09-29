// Summary tab: weekly summary card and the logging calendar.
import { state } from './db.js';
import { weeklySummary, weekStart, earliestEntryDay, dayStr, monthStart, monthEnd, addMonths, weekday, localDayStr, formatDuration } from './calc.js';
import {
  $, esc, today, todayNum, fmtInt, fmtWeight, fmt1, wUnit, dUnit, toDisplayDist, toDisplayWeight, signed,
  dateLabel, shortDate, timeLabel, dateTimeLabel, openSheet, ICONS, MONTHS_LONG
} from './ui.js';
import { editWeight } from './weight.js';
import { editCalorie } from './calories.js';
import { editExercise } from './exercise.js';
import { editFast } from './fasting.js';

let ctx;
let week = null;  // Monday day number
let month = null; // first-of-month day number

// Small marker shapes, distinguishable without color (functional spec §10).
const MARK = {
  weight: '<svg viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="3.2"/></svg>',
  calories: '<svg viewBox="0 0 8 8" aria-hidden="true"><rect x="1" y="1" width="6" height="6" rx="0.8"/></svg>',
  exercise: '<svg viewBox="0 0 8 8" aria-hidden="true"><path d="M4 0.6L7.6 7H0.4Z"/></svg>',
  fasting: '<svg viewBox="0 0 8 8" aria-hidden="true"><path d="M4 0.3L7.7 4L4 7.7L0.3 4Z"/></svg>'
};
const LABEL = { weight: 'Weight', calories: 'Calories', exercise: 'Exercise', fasting: 'Fasting' };

export function init(refresh, c) {
  ctx = c;
  $('#s-root').innerHTML = `
    <div class="card week-card">
      <div class="period-nav">
        <button type="button" class="icon-btn" id="s-wprev" aria-label="Previous week">${ICONS.prev}</button>
        <div class="period-label" id="s-wlabel" aria-live="polite"></div>
        <button type="button" class="icon-btn" id="s-wnext" aria-label="Next week">${ICONS.next}</button>
      </div>
      <div class="kv" id="s-week"></div>
    </div>

    <h2 class="section-title">Logging calendar</h2>
    <div class="card cal-card">
      <div class="period-nav">
        <button type="button" class="icon-btn" id="s-mprev" aria-label="Previous month">${ICONS.prev}</button>
        <div class="period-label" id="s-mlabel" aria-live="polite"></div>
        <button type="button" class="icon-btn" id="s-mnext" aria-label="Next month">${ICONS.next}</button>
      </div>
      <div class="cal-head" aria-hidden="true"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
      <div class="cal-grid" id="s-cal"></div>
      <div class="legend">${Object.keys(MARK).map(k => `<span class="lg m-${k}">${MARK[k]}${LABEL[k]}</span>`).join('')}</div>
    </div>
    <p class="footnote">Tap a day to see its entries or add one. A fast counts on the day it ended.</p>`;

  $('#s-wprev').onclick = () => { week -= 7; renderWeek(); };
  $('#s-wnext').onclick = () => { week += 7; renderWeek(); };
  $('#s-mprev').onclick = () => { month = addMonths(month, -1); renderCalendar(); };
  $('#s-mnext').onclick = () => { month = addMonths(month, 1); renderCalendar(); };
  $('#s-cal').addEventListener('click', e => {
    const b = e.target.closest('[data-day]');
    if (b) openDay(b.dataset.day);
  });
}

export function newDay() { week = null; month = null; }

export function render() {
  if (week == null) week = weekStart(todayNum());
  if (month == null) month = monthStart(todayNum());
  renderWeek();
  renderCalendar();
}

function firstDay() {
  const e = earliestEntryDay(state);
  return e == null ? todayNum() : Math.min(e, todayNum());
}

function renderWeek() {
  const t = todayNum(), cur = weekStart(t), min = weekStart(firstDay());
  week = Math.max(min, Math.min(cur, week));
  $('#s-wprev').disabled = week <= min;
  $('#s-wnext').disabled = week >= cur;
  $('#s-wlabel').textContent = week === cur ? 'This week' : week === cur - 7 ? 'Last week' : `${shortDate(dayStr(week))} – ${shortDate(dayStr(week + 6))}`;

  const s = weeklySummary(state, week, t);
  const u = wUnit();
  const change = s.weightChangeLb == null ? '<span class="muted">Not enough data</span>'
    : `${signed(toDisplayWeight(s.weightChangeLb, u))} ${u}`;
  const logged = k => `${s.logged[k]}/${s.elapsed}`;
  $('#s-week').innerHTML = `
    <div class="r"><span class="k">Weight change<small>Average vs. the week before</small></span><span class="v">${change}</span></div>
    <div class="r"><span class="k">Average intake<small>Per logged day${week === cur ? ', including today' : ''}</small></span><span class="v">${s.avgIntake == null ? '<span class="muted">No logs</span>' : `${fmtInt(s.avgIntake)} cal`}</span></div>
    <div class="r"><span class="k">Total extra burn</span><span class="v">${fmtInt(s.totalBurn)} cal</span></div>
    <div class="r"><span class="k">Days logged</span><span class="v days">
      <span>Weight <b>${logged('weight')}</b></span><span>Calories <b>${logged('calories')}</b></span><span>Exercise <b>${logged('exercise')}</b></span></span></div>`;
}

function marksFor(date) {
  const m = [];
  if (state.weights.some(w => w.date === date)) m.push('weight');
  if (state.calories.some(c => c.date === date)) m.push('calories');
  if (state.exercise.some(x => x.date === date)) m.push('exercise');
  if (state.fasts.some(f => localDayStr(f.end) === date)) m.push('fasting');
  return m;
}

function renderCalendar() {
  const t = todayNum(), cur = monthStart(t), min = monthStart(firstDay());
  month = Math.max(min, Math.min(cur, month));
  $('#s-mprev').disabled = month <= min;
  $('#s-mnext').disabled = month >= cur;
  const [y, m] = dayStr(month).split('-').map(Number);
  $('#s-mlabel').textContent = `${MONTHS_LONG[m - 1]} ${y}`;

  let html = '';
  for (let i = 0; i < weekday(month); i++) html += '<span class="cal-cell"></span>';
  const end = monthEnd(month);
  for (let d = month; d <= end; d++) {
    const n = d - month + 1;
    if (d > t) { html += '<span class="cal-cell"></span>'; continue; } // future days stay blank
    const date = dayStr(d);
    const marks = marksFor(date);
    const label = `${dateLabel(date)}${marks.length ? ': ' + marks.map(k => LABEL[k]).join(', ') : ': nothing logged'}`;
    html += `<button type="button" class="cal-cell day${d === t ? ' today' : ''}" data-day="${date}" aria-label="${esc(label)}">
      <span class="dn">${n}</span><span class="marks">${marks.map(k => `<span class="m-${k}">${MARK[k]}</span>`).join('')}</span></button>`;
  }
  $('#s-cal').innerHTML = html;
}

function openDay(date) {
  const u = wUnit(), du = dUnit();
  const w = state.weights.find(x => x.date === date);
  const cals = state.calories.filter(c => c.date === date);
  const ex = state.exercise.filter(x => x.date === date);
  const fasts = state.fasts.filter(f => localDayStr(f.end) === date);
  const calTotal = cals.reduce((s, c) => s + c.kcal, 0);
  const exTotal = ex.reduce((s, x) => s + x.kcal, 0);

  openSheet(dateLabel(date), (body, close) => {
    const row = (attrs, t, s, v) => `<button type="button" class="row" ${attrs}><span class="main"><span class="t">${esc(t)}</span>${s ? `<span class="s">${esc(s)}</span>` : ''}</span><span class="val">${v}</span>${ICONS.chev}</button>`;
    const none = text => `<div class="row"><p class="empty">${text}</p></div>`;
    body.innerHTML = `
      <h3 class="day-h"><span class="m-weight">${MARK.weight}</span>Weight</h3>
      <div class="list inset">${w ? row('data-w', 'Weigh-in', '', `${fmtWeight(w.lb)}<span class="u">${u}</span>`) : none('No weigh-in')}</div>
      <h3 class="day-h"><span class="m-calories">${MARK.calories}</span>Calories${cals.length ? `<span class="tot">${fmtInt(calTotal)} cal</span>` : ''}</h3>
      <div class="list inset">${cals.length ? cals.map(c => row(`data-c="${c.id}"`, c.kcal === 0 ? 'Logged as 0' : 'Entry', c.added ? `Added ${localDayStr(c.added) === date ? timeLabel(c.added) : dateLabel(localDayStr(c.added))}` : '', `${fmtInt(c.kcal)}<span class="u">cal</span>`)).join('') : none('Not logged')}</div>
      <h3 class="day-h"><span class="m-exercise">${MARK.exercise}</span>Exercise${ex.length ? `<span class="tot">${fmtInt(exTotal)} cal</span>` : ''}</h3>
      <div class="list inset">${ex.length ? ex.map(x => row(`data-x="${x.id}"`,
        x.type === 'direct' ? 'Other activity' : `${x.type[0].toUpperCase() + x.type.slice(1)} · ${fmt1(toDisplayDist(x.km))} ${du}`,
        x.type === 'direct' ? '' : `${Math.round(x.minutes)} min${x.note ? ' · ' + x.note : ''}`,
        `${fmtInt(x.kcal)}<span class="u">cal</span>`)).join('') : none('No exercise')}</div>
      <h3 class="day-h"><span class="m-fasting">${MARK.fasting}</span>Fasting</h3>
      <div class="list inset">${fasts.length ? fasts.map(f => row(`data-f="${f.id}"`, `Ended ${timeLabel(f.end)}`, `Started ${dateTimeLabel(f.start)}`, formatDuration(f.end - f.start))).join('') : none('No fast ended this day')}</div>
      <div class="add-row">
        <button type="button" class="btn" data-add="weight">Add weight</button>
        <button type="button" class="btn" data-add="calories">Add calories</button>
        <button type="button" class="btn" data-add="exercise">Add exercise</button>
      </div>`;
    body.addEventListener('click', e => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.add) { close(); ctx.prefill(t.dataset.add, date); return; }
      if (t.hasAttribute('data-w')) { close(); editWeight(date); }
      if (t.dataset.c) { close(); editCalorie(Number(t.dataset.c)); }
      if (t.dataset.x) { close(); editExercise(Number(t.dataset.x)); }
      if (t.dataset.f) { close(); editFast(Number(t.dataset.f)); }
    });
  });
}

