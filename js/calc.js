// All PersonalFit math. Pure functions only: no storage, no DOM.
// Dates are local calendar days written 'YYYY-MM-DD'. For arithmetic they are
// turned into day numbers (days since 1970-01-01), which avoids daylight-saving bugs.

export const LB_PER_KG = 2.20462;
export const KM_PER_MI = 1.60934;
// Placeholder profile until the owner enters real values in Settings (they stay on the phone).
export const DEFAULT_PROFILE = { sex: 'male', dob: '1995-01-01', heightCm: 175, startLb: 180, confirmed: false };

// ---------- Dates ----------

export function dayNum(str) {
  const [y, m, d] = str.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function dayStr(n) {
  const d = new Date(n * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Local calendar date of a JS Date or timestamp.
export function localDayStr(t = new Date()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 0 = Monday ... 6 = Sunday. 1970-01-01 was a Thursday.
export function weekday(n) { return (n + 3) % 7; }
export function weekStart(n) { return n - weekday(n); }

export function monthStart(n) { const s = dayStr(n); return dayNum(s.slice(0, 8) + '01'); }
export function addMonths(n, k) {
  const [y, m] = dayStr(n).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + k, 1));
  return Math.round(t.getTime() / 86400000);
}
export function monthEnd(n) { return addMonths(monthStart(n), 1) - 1; }
export function yearStart(n) { return dayNum(dayStr(n).slice(0, 4) + '-01-01'); }
export function yearEnd(n) { return dayNum(dayStr(n).slice(0, 4) + '-12-31'); }

// Calendar period containing day n. kind: 'week' | 'month' | 'year'.
export function periodOf(kind, n) {
  if (kind === 'week') { const s = weekStart(n); return { start: s, end: s + 6 }; }
  if (kind === 'month') return { start: monthStart(n), end: monthEnd(n) };
  return { start: yearStart(n), end: yearEnd(n) };
}
export function shiftPeriod(kind, p, k) {
  if (kind === 'week') return periodOf('week', p.start + 7 * k);
  if (kind === 'month') return periodOf('month', addMonths(p.start, k));
  return periodOf('year', dayNum(`${Number(dayStr(p.start).slice(0, 4)) + k}-01-01`));
}

export function ageOn(dob, today) {
  const [by, bm, bd] = dob.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age;
}

// ---------- Units ----------

export const lbToKg = lb => lb / LB_PER_KG;
export const kgToLb = kg => kg * LB_PER_KG;
export const kmToMi = km => km / KM_PER_MI;
export const miToKm = mi => mi * KM_PER_MI;

// ---------- Maintenance (functional spec section 4) ----------

// weights: [{date, lb}]. Returns the most recent actually entered weight, or null.
export function latestWeight(weights) {
  let best = null;
  for (const w of weights) if (!best || w.date > best.date) best = w;
  return best;
}

export function bmr({ lb, heightCm, age, sex }) {
  return 10 * lbToKg(lb) + 6.25 * heightCm - 5 * age + (sex === 'female' ? -161 : 5);
}

export function maintenance(weights, profile, today) {
  const latest = latestWeight(weights);
  const lb = latest ? latest.lb : profile.startLb;
  const age = ageOn(profile.dob, today);
  return Math.round(bmr({ lb, heightCm: profile.heightCm, age, sex: profile.sex }) * 1.2);
}

// ---------- Exercise (section 7) ----------

// Most recent entered weight on or before a date, else the starting weight.
export function weightOnOrBefore(weights, date, startLb) {
  let best = null;
  for (const w of weights) if (w.date <= date && (!best || w.date > best.date)) best = w;
  return best ? best.lb : startLb;
}

export const ACTIVITY_FACTOR = { walk: 0.5, jog: 1.0, run: 1.0 };

export function exerciseKcal(type, km, lb) {
  return Math.round(ACTIVITY_FACTOR[type] * lbToKg(lb) * km);
}

// Minutes per distance unit (km or mi). Returns null when not computable.
export function paceMinPerUnit(minutes, km, unit) {
  const dist = unit === 'mi' ? kmToMi(km) : km;
  if (!(minutes > 0) || !(dist > 0)) return null;
  return minutes / dist;
}

export function formatPace(minPerUnit) {
  if (minPerUnit == null || !isFinite(minPerUnit)) return '–';
  let m = Math.floor(minPerUnit);
  let s = Math.round((minPerUnit - m) * 60);
  if (s === 60) { m += 1; s = 0; }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------- Weight series (section 5) ----------

// Daily series from the first to the last entry, filling missed days by linear
// interpolation. Returns Map(dayNumber -> {lb, real}). Never extrapolates.
export function dailySeries(weights) {
  const pts = weights.map(w => ({ d: dayNum(w.date), lb: w.lb })).sort((a, b) => a.d - b.d);
  const out = new Map();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    out.set(a.d, { lb: a.lb, real: true });
    const b = pts[i + 1];
    if (!b) break;
    for (let d = a.d + 1; d < b.d; d++) {
      out.set(d, { lb: a.lb + (b.lb - a.lb) * (d - a.d) / (b.d - a.d), real: false });
    }
  }
  return out;
}

// Trailing 7-day moving average over the daily series (real + interpolated).
// Uses whatever days of the window exist, so it starts with the first entry.
export function movingAverage7(series, day) {
  let sum = 0, n = 0;
  for (let d = day - 6; d <= day; d++) {
    const v = series.get(d);
    if (v) { sum += v.lb; n++; }
  }
  return series.has(day) && n ? sum / n : null;
}

// Least-squares line through points [{x, y}]. Returns {slope, intercept} or null.
export function linearFit(points) {
  const n = points.length;
  if (n < 2) return null;
  let sx = 0, sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  const mx = sx / n, my = sy / n;
  let sxx = 0, sxy = 0;
  for (const p of points) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

// Year view: weekly averages of real weigh-ins, one point per Monday-started week.
export function weeklyAverages(weights, start, end) {
  const byWeek = new Map();
  for (const w of weights) {
    const d = dayNum(w.date);
    if (d < start || d > end) continue;
    const k = weekStart(d);
    const e = byWeek.get(k) || { sum: 0, n: 0 };
    e.sum += w.lb; e.n++;
    byWeek.set(k, e);
  }
  return [...byWeek.entries()].sort((a, b) => a[0] - b[0])
    .map(([k, e]) => ({ d: Math.max(k, start) + (Math.min(k + 6, end) - Math.max(k, start)) / 2, lb: e.sum / e.n }));
}

// ---------- Averages (sections 6 and 7) ----------

// Calories: logged days only, from the first logged day up to (not including) today.
// Optional [from, to] day-number bounds for use inside other windows.
export function calorieAverage(calories, todayNum, from = -Infinity, to = todayNum - 1) {
  const totals = new Map();
  for (const c of calories) {
    const d = dayNum(c.date);
    if (d < from || d > to || d >= todayNum) continue;
    totals.set(d, (totals.get(d) || 0) + c.kcal);
  }
  if (!totals.size) return null;
  let sum = 0;
  for (const v of totals.values()) sum += v;
  return { avg: sum / totals.size, days: totals.size };
}

// Exercise: every day counts, days without exercise are 0. Range starts at the first
// exercise entry ever (or `from`, whichever is later) and ends yesterday (or `to`).
export function exerciseAverage(exercise, todayNum, from = -Infinity, to = todayNum - 1) {
  if (!exercise.length) return null;
  let first = Infinity;
  for (const e of exercise) first = Math.min(first, dayNum(e.date));
  const start = Math.max(first, from);
  const end = Math.min(to, todayNum - 1);
  if (start > end) return null;
  let sum = 0;
  for (const e of exercise) {
    const d = dayNum(e.date);
    if (d >= start && d <= end) sum += e.kcal;
  }
  const days = end - start + 1;
  return { avg: sum / days, days };
}

// ---------- Energy balance check (section 9) ----------

// data: {weights, calories, exercise, fasts}. Returns either
// {ok: true, expected, actual, differs} in the chosen unit per week, or {ok: false, missing: [...]}.
export function energyBalance(data, profile, todayStr, unit = 'lb') {
  const today = dayNum(todayStr);
  const end = today - 1, start = today - 42;
  const earliest = earliestEntryDay(data);
  const historyDays = earliest == null ? 0 : Math.max(0, end - Math.max(earliest, start) + 1);
  const inPeriod = data.weights.filter(w => { const d = dayNum(w.date); return d >= start && d <= end; });
  const intake = calorieAverage(data.calories, today, start, end);
  const missing = [];
  if (historyDays < 14) missing.push({ kind: 'days', have: historyDays, need: 14 });
  if (inPeriod.length < 5) missing.push({ kind: 'weighins', have: inPeriod.length, need: 5 });
  if (!intake) missing.push({ kind: 'calories' });
  if (missing.length) return { ok: false, missing };

  const burn = exerciseAverage(data.exercise, today, start, end);
  const maint = maintenance(data.weights, profile, todayStr);
  const net = intake.avg - maint - (burn ? burn.avg : 0);
  const fit = linearFit(inPeriod.map(w => ({ x: dayNum(w.date), y: w.lb })));
  const actualLb = fit ? fit.slope * 7 : 0;
  const expected = unit === 'kg' ? net * 7 / 7700 : net * 7 / 3500;
  const actual = unit === 'kg' ? lbToKg(actualLb) : actualLb;
  const limit = unit === 'kg' ? 0.2 : 0.5;
  return { ok: true, expected, actual, differs: Math.abs(expected - actual) > limit, net, maint, intake: intake.avg, burn: burn ? burn.avg : 0 };
}

// Earliest day with an entry in any tracker (fasts count on their end day).
export function earliestEntryDay(data) {
  let min = null;
  const see = s => { const d = dayNum(s); if (min == null || d < min) min = d; };
  data.weights.forEach(w => see(w.date));
  data.calories.forEach(c => see(c.date));
  data.exercise.forEach(e => see(e.date));
  (data.fasts || []).forEach(f => see(localDayStr(f.end)));
  return min;
}

// ---------- Weekly summary (section 10) ----------

export function weeklySummary(data, weekStartNum, todayNum) {
  const s = weekStartNum, e = s + 6;
  const within = (str, a, b) => { const d = dayNum(str); return d >= a && d <= b; };
  const avgW = (a, b) => {
    const ws = data.weights.filter(w => within(w.date, a, b));
    return ws.length ? ws.reduce((t, w) => t + w.lb, 0) / ws.length : null;
  };
  const cur = avgW(s, e), prev = avgW(s - 7, s - 1);
  const cal = calorieAverage(data.calories, e + 1, s, e); // includes today for the current week
  const ex = data.exercise.filter(x => within(x.date, s, e));
  const elapsed = Math.max(0, Math.min(7, todayNum - s + 1));
  const daysWith = list => new Set(list.filter(x => within(x.date, s, e)).map(x => x.date)).size;
  return {
    weightChangeLb: cur != null && prev != null ? cur - prev : null,
    avgIntake: cal ? cal.avg : null,
    totalBurn: ex.reduce((t, x) => t + x.kcal, 0),
    logged: { weight: daysWith(data.weights), calories: daysWith(data.calories), exercise: daysWith(data.exercise) },
    elapsed
  };
}

// ---------- Fasting (section 8) ----------

// Validate a fast [start, end] (timestamps in ms) against saved fasts.
// Returns an error message or null. `ignoreId` skips the fast being edited.
export function fastError(start, end, fasts, now, ignoreId) {
  if (!(start > 0) || !(end > 0)) return 'Enter a start and end time.';
  if (start > now || end > now) return 'Times can’t be in the future.';
  if (end <= start) return 'The end must be after the start.';
  for (const f of fasts) {
    if (f.id === ignoreId) continue;
    if (start < f.end && f.start < end) return 'This overlaps another saved fast.';
  }
  return null;
}

// Validate the start time of an active fast.
export function activeStartError(start, fasts, now) {
  if (!(start > 0)) return 'Enter a start time.';
  if (start > now) return 'The start can’t be in the future.';
  const lastEnd = fasts.reduce((m, f) => Math.max(m, f.end), 0);
  if (start < lastEnd) return 'The start can’t be before your last fast ended.';
  return null;
}

export function formatDuration(ms, withSeconds = false) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  if (withSeconds) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${h}h ${m}m`;
}
