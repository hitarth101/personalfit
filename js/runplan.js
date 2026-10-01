// Run plan view inside the Exercise tab: the 10-week Zone 2 plan and its check boxes.
// The check boxes only record that a planned run day was done. They never affect
// logged exercise, averages, or the Summary calendar.
import { state, setRunCheck } from './db.js';
import { KM_PER_MI, formatPace } from './calc.js';
import { $, esc, fmt1, dUnit } from './ui.js';

export const RUN_DAYS = [['mon', 'Mon', 'Monday'], ['wed', 'Wed', 'Wednesday'], ['sat', 'Sat', 'Saturday']];

// Main set as jog / walk intervals; `then` is the cool-down walk that brings the session to 5 km.
export const WEEKS = [
  { sets: [{ main: '1:00 / 2:00 × 8', then: 'then walk 25 min' }], session: 54 },
  { sets: [{ main: '1:30 / 2:00 × 7', then: 'then walk 24 min' }], session: 54 },
  { sets: [{ main: '2:00 / 1:30 × 6', then: 'then walk 28 min' }], session: 54 },
  { sets: [{ main: '3:00 / 1:30 × 5', then: 'then walk 25.5 min' }], session: 53 },
  { sets: [{ main: '5:00 / 2:00 × 3 (consolidation week)', then: 'then walk 27 min' }], session: 53 },
  { sets: [{ main: '7:00 / 1:30 × 3', then: 'then walk 21.5 min' }], session: 52 },
  { sets: [{ main: '8:00 / 1:30 × 3', then: 'then walk 18.5 min' }], session: 52 },
  { sets: [{ main: '12:00 / 1:30 × 2, then 6:00', then: 'then walk 13 min' }], session: 51 },
  { sets: [{ main: '15:00 / 1:00 × 2', then: 'then walk 14 min' }], session: 51 },
  { sets: [{ main: 'Mon & Wed: 20:00 / 1:00 / 10:00', then: 'then walk 15 min' }, { main: 'Sat: 30:00 non-stop', then: 'then walk 16 min' }], session: 51 }
];

export const STRENGTH = [
  ['Calf raises, straight knee', '3 × 15', 'Rise onto toes slowly, lower slowly'],
  ['Calf raises, bent knee', '3 × 15', 'Same, with knees slightly bent'],
  ['Tibialis raises', '3 × 15', 'Back against a wall, heels about a foot out, lift toes toward shins. The key shin-splint exercise.'],
  ['Single-leg balance', '3 × 30 s per leg', 'Stand on one foot, slight knee bend'],
  ['Glute bridges', '3 × 15', 'Lie on back, knees bent, lift hips and squeeze']
];

export const checkKey = (week, day) => `w${week}-${day}`;

// The plan is written in km; shown in the unit chosen in Settings. A no-break space
// (NBSP) keeps each number on the same line as its unit.
const NBSP = '\u00a0';
export const distText = (km, unit = dUnit()) => unit === 'mi' ? `${fmt1(km / KM_PER_MI)}${NBSP}mi` : `${km}${NBSP}km`;
export const paceText = (minPerKm, unit = dUnit()) => unit === 'mi' ? `~${formatPace(minPerKm * KM_PER_MI)}${NBSP}min/mi` : `~${minPerKm}${NBSP}min/km`;
// Keeps an interval sequence like "20:00 / 1:00 / 10:00" from breaking across lines.
const keepIntervals = s => s.replace(/ ([/×]) /g, `${NBSP}$1${NBSP}`);

export function weekDays(unit = dUnit()) {
  const run = { what: `Run/walk intervals, at least ${distText(5, unit)}`, where: 'Track' };
  const rest = { what: 'Rest', rest: true };
  return [
    ['Mon', run],
    ['Tue', rest],
    ['Wed', run],
    ['Thu', rest],
    ['Fri', { what: 'Brisk walk + strength routine', where: 'Hilly loop' }],
    ['Sat', run],
    ['Sun', { what: `Long easy walk, ${distText(8, unit)} at ${paceText(11, unit)} + strength routine`, where: 'Hilly loop' }]
  ];
}

export function init() {
  $('#e-plan').addEventListener('change', e => {
    const box = e.target.closest('input[data-k]');
    if (box) setRunCheck(box.dataset.k, box.checked);
  });
}

export function render() {
  const u = dUnit();
  const head = cols => `<div class="row rp-head">${cols}</div>`;

  const tracker = WEEKS.map((_, i) => `<div class="row rp-track">
      <span class="rp-lead">${i + 1}</span>
      ${RUN_DAYS.map(([d, , long]) => `<label class="rp-check"><input type="checkbox" class="check" data-k="${checkKey(i + 1, d)}"${state.runChecks[checkKey(i + 1, d)] ? ' checked' : ''} aria-label="Week ${i + 1}, ${long} run"></label>`).join('')}
    </div>`).join('');

  const plan = WEEKS.map((w, i) => `<div class="row rp-row">
      <span class="rp-lead">${i + 1}</span>
      <span class="main">${w.sets.map(s => `<span class="t">${esc(keepIntervals(s.main))}</span><span class="s">${esc(s.then)}</span>`).join('')}</span>
      <span class="val">~${w.session}<span class="u">min</span></span>
    </div>`).join('');

  const days = weekDays(u).map(([d, x]) => `<div class="row rp-row${x.rest ? ' rest' : ''}">
      <span class="rp-lead">${d}</span>
      <span class="main"><span class="t">${esc(x.what)}</span>${x.where ? `<span class="s">${esc(x.where)}</span>` : ''}</span>
    </div>`).join('');

  const strength = STRENGTH.map(([name, reps, how]) => `<div class="row rp-row">
      <span class="main"><span class="t">${esc(name)}</span><span class="s">${esc(how)}</span></span>
      <span class="val">${esc(reps)}</span>
    </div>`).join('');

  $('#e-plan').innerHTML = `
    <h2 class="section-title first">Progression tracker</h2>
    <div class="list rp">${head(`<span class="rp-lead">Week</span>${RUN_DAYS.map(([, d]) => `<span class="rp-check">${d}</span>`).join('')}`)}${tracker}</div>

    <h2 class="section-title">Progress plan</h2>
    <div class="list rp">${head(`<span class="rp-lead">Week</span><span class="main">Main set (jog / walk)</span><span>Session</span>`)}${plan}</div>

    <h2 class="section-title">Every run day</h2>
    <div class="card rp-kv"><div class="kv">
      <div class="r"><span class="k">Warm-up</span><span class="v">5 min brisk walk</span></div>
      <div class="r"><span class="k">Main set</span><span class="v">This week’s intervals</span></div>
      <div class="r"><span class="k">Cool-down</span><span class="v">Walk until ${distText(5, u)} total</span></div>
    </div></div>

    <h2 class="section-title">Weekly structure</h2>
    <div class="list rp">${days}</div>

    <h2 class="section-title">Strength routine</h2>
    <div class="list rp">${strength}</div>`;
}
