// Run with: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/calc.js';

// A made-up test person (80 kg, 180 cm, born 1990-06-15), not the owner's profile.
const profile = { sex: 'male', dob: '1990-06-15', heightCm: 180, startLb: 80 * C.LB_PER_KG };
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('dates: day numbers round-trip and weeks start Monday', () => {
  assert.equal(C.dayStr(C.dayNum('2026-09-28')), '2026-09-28');
  assert.equal(C.weekday(C.dayNum('2026-09-28')), 0); // Monday
  assert.equal(C.weekday(C.dayNum('2026-09-27')), 6); // Sunday
  assert.equal(C.dayStr(C.weekStart(C.dayNum('2026-10-04'))), '2026-09-28');
  // across a US daylight-saving change
  assert.equal(C.dayNum('2026-11-02') - C.dayNum('2026-11-01'), 1);
});

test('dates: month and year periods, stepping', () => {
  const p = C.periodOf('month', C.dayNum('2026-02-14'));
  assert.equal(C.dayStr(p.start), '2026-02-01');
  assert.equal(C.dayStr(p.end), '2026-02-28');
  const prev = C.shiftPeriod('month', C.periodOf('month', C.dayNum('2026-01-10')), -1);
  assert.equal(C.dayStr(prev.start), '2025-12-01');
  const y = C.periodOf('year', C.dayNum('2024-06-01'));
  assert.equal(C.dayStr(y.end), '2024-12-31');
});

test('age from date of birth', () => {
  assert.equal(C.ageOn('1990-06-15', '2026-06-14'), 35);
  assert.equal(C.ageOn('1990-06-15', '2026-06-15'), 36);
  assert.equal(C.ageOn('1990-06-15', '2026-12-31'), 36);
});

test('maintenance: Mifflin-St Jeor x 1.2 (80 kg, 180 cm, age 36 = 1,750 x 1.2 = 2,100)', () => {
  assert.equal(C.maintenance([], profile, '2026-09-28'), 2100);
  assert.equal(C.maintenance([], { ...profile, sex: 'female' }, '2026-09-28'), Math.round((1750 - 166) * 1.2));
});

test('maintenance uses the most recent actual weight, not the start weight', () => {
  const w = [{ date: '2026-09-01', lb: 200 }, { date: '2026-09-20', lb: 205 }];
  const expected = Math.round(C.bmr({ lb: 205, heightCm: 180, age: 36, sex: 'male' }) * 1.2);
  assert.equal(C.maintenance(w, profile, '2026-09-28'), expected);
});

test('exercise: 5 km run in 40 min at 80 kg = 400 cal, pace 8:00 /km', () => {
  assert.equal(C.exerciseKcal('run', 5, 80 * C.LB_PER_KG), 400);
  assert.equal(C.formatPace(C.paceMinPerUnit(40, 5, 'km')), '8:00');
  assert.equal(C.exerciseKcal('walk', 5, 80 * C.LB_PER_KG), 200);
  assert.equal(C.formatPace(C.paceMinPerUnit(40, 5, 'mi')), '12:52');
});

test('exercise weight is the latest entry on or before the exercise date', () => {
  const w = [{ date: '2026-09-01', lb: 200 }, { date: '2026-09-20', lb: 190 }];
  assert.equal(C.weightOnOrBefore(w, '2026-09-10', 180), 200);
  assert.equal(C.weightOnOrBefore(w, '2026-08-01', 180), 180);
});

test('interpolation: 180 on day 1, 178.5 on day 4 gives 179.5 and 179.0', () => {
  const s = C.dailySeries([{ date: '2026-09-01', lb: 180 }, { date: '2026-09-04', lb: 178.5 }]);
  near(s.get(C.dayNum('2026-09-02')).lb, 179.5);
  near(s.get(C.dayNum('2026-09-03')).lb, 179.0);
  assert.equal(s.get(C.dayNum('2026-09-02')).real, false);
  assert.equal(s.get(C.dayNum('2026-09-04')).real, true);
  // no extrapolation
  assert.equal(s.has(C.dayNum('2026-08-31')), false);
  assert.equal(s.has(C.dayNum('2026-09-05')), false);
});

test('interpolation across a month boundary uses the entry outside the month', () => {
  const s = C.dailySeries([{ date: '2026-08-30', lb: 200 }, { date: '2026-09-03', lb: 196 }]);
  near(s.get(C.dayNum('2026-09-01')).lb, 198);
});

test('7-day moving average over the daily series', () => {
  const w = [];
  for (let i = 1; i <= 7; i++) w.push({ date: `2026-09-0${i}`, lb: 200 + i });
  const s = C.dailySeries(w);
  near(C.movingAverage7(s, C.dayNum('2026-09-07')), 204);
  near(C.movingAverage7(s, C.dayNum('2026-09-01')), 201);
  assert.equal(C.movingAverage7(s, C.dayNum('2026-09-08')), null);
});

test('least-squares line', () => {
  const f = C.linearFit([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }]);
  near(f.slope, 2); near(f.intercept, 1);
  assert.equal(C.linearFit([{ x: 1, y: 1 }]), null);
});

test('spec check: calorie average, one day 2,000 and one day logged 0 = 1,000', () => {
  const cals = [{ date: '2026-09-26', kcal: 1200 }, { date: '2026-09-26', kcal: 800 }, { date: '2026-09-27', kcal: 0 }];
  const r = C.calorieAverage(cals, C.dayNum('2026-09-28'));
  assert.equal(r.avg, 1000); assert.equal(r.days, 2);
});

test('calorie average excludes today and skips unlogged days', () => {
  const cals = [{ date: '2026-09-20', kcal: 2000 }, { date: '2026-09-28', kcal: 500 }];
  assert.equal(C.calorieAverage(cals, C.dayNum('2026-09-28')).avg, 2000);
  assert.equal(C.calorieAverage([{ date: '2026-09-28', kcal: 500 }], C.dayNum('2026-09-28')), null);
});

test('exercise average counts days with no exercise as 0, first entry to yesterday', () => {
  const ex = [{ date: '2026-09-25', kcal: 300 }]; // 25, 26, 27 -> 3 days
  const r = C.exerciseAverage(ex, C.dayNum('2026-09-28'));
  assert.equal(r.days, 3); assert.equal(r.avg, 100);
  assert.equal(C.exerciseAverage([{ date: '2026-09-28', kcal: 300 }], C.dayNum('2026-09-28')), null);
});

test('energy balance: needs more data', () => {
  const r = C.energyBalance({ weights: [], calories: [], exercise: [], fasts: [] }, profile, '2026-09-28');
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing.map(m => m.kind), ['days', 'weighins', 'calories']);
});

test('energy balance: expected vs actual per week', () => {
  const today = '2026-09-28', t = C.dayNum(today);
  const weights = [], calories = [];
  // 42 days, weight falls 0.1 lb/day -> -0.7 lb/week; intake 1,820 every day
  for (let i = 42; i >= 1; i--) {
    const d = C.dayStr(t - i);
    calories.push({ date: d, kcal: 1820 });
    if (i % 3 === 0) weights.push({ date: d, lb: 185 - 0.1 * (42 - i) });
  }
  const r = C.energyBalance({ weights, calories, exercise: [], fasts: [] }, profile, today);
  assert.equal(r.ok, true);
  const maint = C.maintenance(weights, profile, today);
  near(r.expected, (1820 - maint) * 7 / 3500, 1e-9);
  near(r.actual, -0.7, 1e-9);
  const k = C.energyBalance({ weights, calories, exercise: [], fasts: [] }, profile, today, 'kg');
  near(k.actual, -0.7 / C.LB_PER_KG, 1e-9);
  near(k.expected, (1820 - maint) * 7 / 7700, 1e-9);
});

test('weekly summary', () => {
  const today = C.dayNum('2026-10-01'); // Thursday
  const ws = C.weekStart(today); // Mon 2026-09-28
  const data = {
    weights: [{ date: '2026-09-22', lb: 206 }, { date: '2026-09-24', lb: 204 }, { date: '2026-09-29', lb: 203 }, { date: '2026-10-01', lb: 201 }],
    calories: [{ date: '2026-09-28', kcal: 2000 }, { date: '2026-10-01', kcal: 1000 }, { date: '2026-10-01', kcal: 500 }],
    exercise: [{ date: '2026-09-30', kcal: 300 }, { date: '2026-10-01', kcal: 150 }],
    fasts: []
  };
  const s = C.weeklySummary(data, ws, today);
  assert.equal(s.weightChangeLb, 202 - 205);
  assert.equal(s.avgIntake, 1750); // today included
  assert.equal(s.totalBurn, 450);
  assert.deepEqual(s.logged, { weight: 2, calories: 2, exercise: 2 });
  assert.equal(s.elapsed, 4);
  const past = C.weeklySummary(data, ws - 7, today);
  assert.equal(past.elapsed, 7);
  assert.equal(past.weightChangeLb, null); // no weigh-ins the week before
});

test('fasting rules', () => {
  const now = Date.UTC(2026, 8, 28, 12);
  const h = 3600000;
  const fasts = [{ id: 1, start: now - 30 * h, end: now - 14 * h }];
  assert.equal(C.fastError(now - 10 * h, now - 2 * h, fasts, now), null);
  assert.match(C.fastError(now - 20 * h, now - 2 * h, fasts, now), /overlaps/);
  assert.match(C.fastError(now - 2 * h, now - 5 * h, fasts, now), /after the start/);
  assert.match(C.fastError(now - 2 * h, now + h, fasts, now), /future/);
  assert.equal(C.fastError(now - 30 * h, now - 12 * h, fasts, now, 1), null); // editing itself
  assert.match(C.activeStartError(now - 15 * h, fasts, now), /before your last fast/);
  assert.equal(C.activeStartError(now - 13 * h, fasts, now), null);
  assert.equal(C.formatDuration(17 * h + 42 * 60000), '17h 42m');
  assert.equal(C.formatDuration(26 * h + 5000, true), '26:00:05');
});

test('year view: weekly averages of real weigh-ins', () => {
  const y = C.periodOf('year', C.dayNum('2026-06-01'));
  const pts = C.weeklyAverages([{ date: '2026-09-28', lb: 200 }, { date: '2026-09-30', lb: 198 }, { date: '2025-12-31', lb: 1 }], y.start, y.end);
  assert.equal(pts.length, 1);
  assert.equal(pts[0].lb, 199);
});
