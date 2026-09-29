// Weight tab: latest weight, entry, chart, history, energy balance check.
import { state, saveWeight, updateWeight, deleteWeight, saveSettings } from './db.js';
import { latestWeight, periodOf, shiftPeriod, dayNum, energyBalance, earliestEntryDay } from './calc.js';
import {
  $, esc, today, todayNum, parseNum, wUnit, fmtWeight, fromDisplayWeight, toDisplayWeight, fmtInt, signed,
  dateLabel, openSheet, confirmInSheet, flash, setHint, segmented, clampDateInput, pastDateNote, ICONS, MONTHS_LONG
} from './ui.js';
import { drawWeightChart, periodLabel } from './chart.js';

const view = { kind: 'week', period: null, chartUnit: null, shown: 10 };
let refreshAll = () => {};

// Plausible range, in lb, to catch typos (e.g. 2084 instead of 208.4).
const MIN_LB = 50, MAX_LB = 700;

// "today", "yesterday", or "Mon, Sep 28" for use mid-sentence.
function dayWords(date) {
  const l = dateLabel(date);
  return l === 'Today' || l === 'Yesterday' ? l.toLowerCase() : l;
}

function weightError(v) {
  if (!isFinite(v)) return 'Enter a number, like 208.4.';
  const lb = fromDisplayWeight(v);
  if (lb < MIN_LB || lb > MAX_LB) return `That looks off. Enter a weight between ${Math.round(toDisplayWeight(MIN_LB))} and ${Math.round(toDisplayWeight(MAX_LB))} ${wUnit()}.`;
  return null;
}

export function init(refresh, ctx) {
  refreshAll = refresh;
  $('#w-setup-btn').onclick = () => ctx.showTab('settings');
  const form = $('#w-form'), input = $('#w-value'), date = $('#w-date'), hint = $('#w-hint');
  view.period = periodOf(view.kind, todayNum());

  const updateHint = () => {
    const existing = state.weights.find(w => w.date === date.value);
    setHint(hint, existing ? `Saving replaces the ${fmtWeight(existing.lb)} ${wUnit()} already logged for ${dayWords(date.value)}.` : '');
  };
  date.addEventListener('change', () => { clampDateInput(date); updateHint(); });
  input.addEventListener('input', () => { if (hint.classList.contains('error')) updateHint(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clampDateInput(date);
    const v = parseNum(input.value);
    const err = weightError(v);
    if (err) { setHint(hint, err, true); input.focus(); return; }
    await saveWeight(date.value, Math.round(fromDisplayWeight(v) * 100) / 100);
    input.value = '';
    input.blur();
    flash(form.querySelector('button[type=submit]'));
    refreshAll();
  });

  $('#w-prev').innerHTML = ICONS.prev;
  $('#w-next').innerHTML = ICONS.next;
  segmented($('#w-period'), v => { view.kind = v; view.period = periodOf(v, todayNum()); drawChart(); });
  view.setUnit = segmented($('#w-chart-unit'), v => { view.chartUnit = v; drawChart(); });
  $('#w-prev').onclick = () => { view.period = shiftPeriod(view.kind, view.period, -1); drawChart(); };
  $('#w-next').onclick = () => { view.period = shiftPeriod(view.kind, view.period, 1); drawChart(); };

  const fit = $('#w-fit'), avg = $('#w-avg');
  fit.checked = state.settings.chartFit ?? false;
  avg.checked = state.settings.chartAvg ?? true;
  fit.onchange = () => { saveSettings({ chartFit: fit.checked }); drawChart(); };
  avg.onchange = () => { saveSettings({ chartAvg: avg.checked }); drawChart(); };

  let lastW = 0;
  new ResizeObserver(() => { const w = $('#w-chart').clientWidth; if (w && w !== lastW) { lastW = w; drawChart(); } }).observe($('#w-chart'));

  $('#w-history').addEventListener('click', e => {
    const row = e.target.closest('[data-date]');
    if (row) editWeight(row.dataset.date);
    if (e.target.closest('[data-more]')) { view.shown += 20; renderHistory(); }
  });
  view.updateHint = updateHint;
  view.pastNote = pastDateNote(form.querySelector('.entry-row'), date, updateHint);
}

export function render() {
  if (!view.chartUnit) view.chartUnit = wUnit();
  view.setUnit(view.chartUnit);
  document.querySelectorAll('[data-unit="weight"]').forEach(el => { el.textContent = wUnit(); });
  $('#w-value').placeholder = wUnit() === 'kg' ? '0.0' : '0.0';
  renderHero();
  view.pastNote();
  view.updateHint();
  drawChart();
  renderHistory();
  renderBalance();
}

// Sets the entry date (used by the Summary calendar) and focuses the box.
export function prefill(date) {
  $('#w-date').value = date;
  view.updateHint();
  view.pastNote();
  window.scrollTo(0, 0);
  $('#w-value').focus();
}

// Settings changed the weight unit: the chart follows it again.
export function resetChartUnit() { view.chartUnit = null; }
// A new day started: go back to the current period.
export function resetPeriod() { view.period = periodOf(view.kind, todayNum()); }

function renderHero() {
  $('#w-setup').hidden = !!state.profile.confirmed;
  const latest = latestWeight(state.weights);
  const start = state.profile.startLb, u = wUnit();
  if (!latest) {
    $('#w-hero').innerHTML = `<div class="label">Starting weight</div>
      <div class="value">${fmtWeight(start)}<span class="u">${u}</span></div>
      <div class="sub">No weigh-ins yet. Log your first one below.</div>`;
    return;
  }
  const diff = toDisplayWeight(latest.lb) - toDisplayWeight(start);
  $('#w-hero').innerHTML = `<div class="label">Latest · ${esc(dateLabel(latest.date))}</div>
    <div class="value">${fmtWeight(latest.lb)}<span class="u">${u}</span></div>
    <div class="sub"><b>${signed(diff)} ${u}</b> since start (${fmtWeight(start)} ${u})</div>`;
}

function drawChart() {
  const t = todayNum();
  const first = state.weights.length ? Math.min(...state.weights.map(w => dayNum(w.date))) : t;
  const firstPeriod = periodOf(view.kind, Math.min(first, t));
  const current = periodOf(view.kind, t);
  if (view.period.start < firstPeriod.start) view.period = firstPeriod;
  if (view.period.start > current.start) view.period = current;
  $('#w-prev').disabled = view.period.start <= firstPeriod.start;
  $('#w-next').disabled = view.period.start >= current.start;
  $('#w-period-label').textContent = periodLabel(view.kind, view.period, MONTHS_LONG);
  $('#w-readout').innerHTML = view.kind === 'year' ? 'Dots are weekly averages. Tap the chart for values.' : 'Solid dots are weigh-ins, hollow dots are filled-in days. Tap for values.';
  drawWeightChart($('#w-chart'), {
    kind: view.kind, period: view.period, unit: view.chartUnit, isCurrent: view.period.start === current.start,
    showFit: $('#w-fit').checked, showAvg: $('#w-avg').checked, weights: state.weights,
    onPick: text => { $('#w-readout').innerHTML = text; }
  });
}

function renderHistory() {
  const list = [...state.weights].sort((a, b) => b.date.localeCompare(a.date));
  const u = wUnit();
  if (!list.length) { $('#w-history').innerHTML = `<div class="row"><p class="empty">Your weigh-ins will appear here.</p></div>`; return; }
  const rows = list.slice(0, view.shown).map((w, i) => {
    const prev = list[i + 1];
    const change = prev ? `${signed(toDisplayWeight(w.lb) - toDisplayWeight(prev.lb))} ${u} from previous` : 'First weigh-in';
    return `<button type="button" class="row" data-date="${w.date}">
      <span class="main"><span class="t">${esc(dateLabel(w.date))}</span><span class="s">${change}</span></span>
      <span class="val">${fmtWeight(w.lb)}<span class="u">${u}</span></span>${ICONS.chev}</button>`;
  }).join('');
  const more = list.length > view.shown ? `<div class="row list-more"><button type="button" class="btn quiet" data-more>Show more</button></div>` : '';
  $('#w-history').innerHTML = rows + more;
}

export function editWeight(date) {
  const w = state.weights.find(x => x.date === date);
  if (!w) return;
  const u = wUnit();
  openSheet('Edit weight', (body, close) => {
    body.innerHTML = `
      <label class="field"><span>Weight</span>
        <span class="num-field"><input type="text" inputmode="decimal" autocomplete="off" value="${fmtWeight(w.lb)}" data-v><span class="unit">${u}</span></span></label>
      <label class="field"><span>Date</span><input class="field-input" type="date" value="${w.date}" max="${today()}" data-d></label>
      <p class="hint" data-h></p>
      <div class="sheet-actions">
        <button type="button" class="btn primary block" data-save>Save</button>
        <button type="button" class="btn block" data-del>Delete</button>
      </div>`;
    const vIn = body.querySelector('[data-v]'), dIn = body.querySelector('[data-d]'), h = body.querySelector('[data-h]');
    const check = () => {
      const other = dIn.value !== date && state.weights.find(x => x.date === dIn.value);
      setHint(h, other ? `Saving replaces the ${fmtWeight(other.lb)} ${u} already logged for ${dayWords(dIn.value)}.` : '');
    };
    dIn.onchange = () => { clampDateInput(dIn); check(); };
    body.querySelector('[data-save]').onclick = async () => {
      clampDateInput(dIn);
      const v = parseNum(vIn.value), err = weightError(v);
      if (err) { setHint(h, err, true); return; }
      await updateWeight(date, dIn.value, Math.round(fromDisplayWeight(v) * 100) / 100);
      close(); refreshAll();
    };
    body.querySelector('[data-del]').onclick = async () => {
      if (await confirmInSheet(body, { title: 'Delete weigh-in?', message: `${fmtWeight(w.lb)} ${u} on ${dateLabel(date)} will be removed.`, confirm: 'Delete' })) {
        await deleteWeight(date); close(); refreshAll();
      }
    };
  });
}

function renderBalance() {
  const u = wUnit();
  const r = energyBalance(state, state.profile, today(), u);
  const el = $('#w-balance');
  if (!r.ok) {
    const lines = r.missing.map(m => {
      if (m.kind === 'days') return `${m.need - m.have} more ${m.need - m.have === 1 ? 'day' : 'days'} of logging (${m.have} of 14)`;
      if (m.kind === 'weighins') return `${m.need - m.have} more ${m.need - m.have === 1 ? 'weigh-in' : 'weigh-ins'} in the last 6 weeks (${m.have} of 5)`;
      return 'At least one day of calorie logs in the last 6 weeks';
    });
    el.innerHTML = `<p class="card-lead"><b>Needs more data.</b> This compares the weight change your logs predict with the change your weigh-ins show. Still needed:</p>
      <ul class="needs">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
    return;
  }
  el.innerHTML = `<div class="kv">
      <div class="r"><span class="k">Expected from logs</span><span class="v">${signed(r.expected)} ${u}/week</span></div>
      <div class="r"><span class="k">Actual from weigh-ins</span><span class="v">${signed(r.actual)} ${u}/week</span></div>
    </div>
    <p class="card-note">Last 6 weeks: ${fmtInt(r.intake)} cal average intake, ${fmtInt(r.maint)} maintenance, ${fmtInt(r.burn)} average exercise burn.</p>
    ${r.differs ? `<p class="card-note">Differences usually come from missed logs or the maintenance estimate being off.</p>` : ''}`;
}

// Oldest day any tracker has data (used by the Summary tab too).
export const firstEntryDay = () => earliestEntryDay(state);
