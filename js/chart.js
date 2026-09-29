// Weight chart, drawn as plain SVG. No libraries.
import { dailySeries, movingAverage7, linearFit, weeklyAverages, dayNum, dayStr, lbToKg, weekday } from './calc.js';
import { esc, dateLabel, shortDate, MONTHS_SHORT } from './ui.js';

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];

function niceTicks(min, max, target = 4) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / target;
  const step = STEPS.find(s => s >= raw) || 100;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(4)));
  return { lo, hi, ticks, step };
}

// opts: {kind, period:{start,end}, unit, showFit, showAvg, weights}
// Returns {hasData}. Tapping the chart calls opts.onPick(text).
export function drawWeightChart(el, opts) {
  const { kind, period, unit, showFit, showAvg, weights } = opts;
  const conv = lb => unit === 'kg' ? lbToKg(lb) : lb;
  const series = dailySeries(weights);
  const nDays = period.end - period.start + 1;

  // Points to plot
  let pts;
  if (kind === 'year') {
    pts = weeklyAverages(weights, period.start, period.end).map(p => ({ d: p.d, v: conv(p.lb), real: true, week: true }));
  } else {
    pts = [];
    for (let d = period.start; d <= period.end; d++) {
      const s = series.get(d);
      if (s) pts.push({ d, v: conv(s.lb), real: s.real });
    }
  }

  if (!pts.length) {
    const what = kind === 'week' ? 'week' : kind === 'month' ? 'month' : 'year';
    const msg = !weights.length ? 'Log a weight above to start your chart.'
      : opts.isCurrent ? `No weigh-ins yet this ${what}. Log one above, or tap the back arrow to see last ${what}.`
      : `No weigh-ins this ${what}.`;
    el.innerHTML = `<div class="chart-empty">${msg}</div>`;
    return { hasData: false };
  }

  // Trendlines
  const realIn = weights.filter(w => { const d = dayNum(w.date); return d >= period.start && d <= period.end; })
    .map(w => ({ x: dayNum(w.date), y: conv(w.lb) }));
  let fitLine = null;
  if (showFit) {
    const f = linearFit(realIn);
    if (f) {
      const x0 = Math.min(...realIn.map(p => p.x)), x1 = Math.max(...realIn.map(p => p.x));
      fitLine = [{ d: x0, v: f.intercept + f.slope * x0 }, { d: x1, v: f.intercept + f.slope * x1 }];
    }
  }
  let avgLine = null;
  if (showAvg) {
    avgLine = [];
    for (let d = period.start; d <= period.end; d++) {
      const a = movingAverage7(series, d);
      if (a != null) avgLine.push({ d, v: conv(a) });
    }
    if (avgLine.length < 2) avgLine = null;
  }

  // Scales
  const W = Math.max(260, el.clientWidth || 320), H = el.clientHeight || 220;
  const pl = 6, pr = 40, pt = 12, pb = 24;
  const vals = pts.map(p => p.v).concat(fitLine ? fitLine.map(p => p.v) : [], avgLine ? avgLine.map(p => p.v) : []);
  const { lo, hi, ticks, step } = niceTicks(Math.min(...vals), Math.max(...vals));
  const decimals = step < 1 ? 1 : 0;
  const plotW = W - pl - pr, plotH = H - pt - pb;
  const x = d => pl + (d - period.start + 0.5) * plotW / nDays;
  const y = v => pt + (hi - v) / (hi - lo) * plotH;
  const path = list => list.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)} ${y(p.v).toFixed(1)}`).join('');

  // Spoken summary for screen readers: what the chart shows, not just "chart".
  const realPts = pts.filter(p => p.real);
  const lo2 = Math.min(...pts.map(p => p.v)), hi2 = Math.max(...pts.map(p => p.v));
  const summary = `Weight chart: ${realPts.length} ${kind === 'year' ? 'weekly averages' : realPts.length === 1 ? 'weigh-in' : 'weigh-ins'}, from ${pts[0].v.toFixed(1)} to ${pts[pts.length - 1].v.toFixed(1)} ${unit}, lowest ${lo2.toFixed(1)}, highest ${hi2.toFixed(1)}.`;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(summary)}">`;
  for (const t of ticks) {
    svg += `<line class="grid" x1="${pl}" x2="${W - pr + 4}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`;
    svg += `<text class="axis" x="${W - pr + 8}" y="${(y(t) + 4).toFixed(1)}">${t.toFixed(decimals)}</text>`;
  }
  // x labels
  const lab = (d, text, anchor = 'middle') => `<text class="axis" x="${x(d).toFixed(1)}" y="${H - 6}" text-anchor="${anchor}">${text}</text>`;
  if (kind === 'week') for (let i = 0; i < 7; i++) svg += lab(period.start + i, WD[i]);
  else if (kind === 'month') for (const k of [0, 7, 14, 21, 28]) { if (k < nDays) svg += lab(period.start + k, String(k + 1)); }
  else {
    const y0 = Number(dayStr(period.start).slice(0, 4));
    for (let m = 0; m < 12; m++) {
      const ms = dayNum(`${y0}-${String(m + 1).padStart(2, '0')}-01`);
      const me = m < 11 ? dayNum(`${y0}-${String(m + 2).padStart(2, '0')}-01`) - 1 : period.end;
      svg += lab((ms + me) / 2, MONTHS_SHORT[m][0]);
    }
  }

  if (pts.length > 1) svg += `<path class="series" d="${path(pts)}"/>`;
  if (avgLine) svg += `<path class="avg" d="${path(avgLine)}"/>`;
  if (fitLine) svg += `<path class="fit" d="${path(fitLine)}"/>`;

  const r = kind === 'week' ? 5 : kind === 'month' ? 3.6 : 3.2;
  for (const p of pts) {
    svg += p.real
      ? `<circle class="real" cx="${x(p.d).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${r}"/>`
      : `<circle class="interp" cx="${x(p.d).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${r - 0.6}"/>`;
  }
  svg += `<g class="pick"></g></svg>`;
  el.innerHTML = svg;

  // Tap to read a value
  const svgEl = el.querySelector('svg');
  const pickLayer = el.querySelector('.pick');
  const describe = p => {
    const val = `${p.v.toFixed(1)} ${unit}`;
    if (p.week) {
      const ws = Math.round(p.d) - weekday(Math.round(p.d));
      return `Week of ${shortDate(dayStr(Math.max(ws, period.start)))} · average ${val}`;
    }
    return `${dateLabel(dayStr(p.d))} · ${val}${p.real ? '' : ' (filled in)'}`;
  };
  svgEl.addEventListener('pointerdown', e => {
    const box = svgEl.getBoundingClientRect();
    const px = (e.clientX - box.left) * W / box.width;
    let best = pts[0];
    for (const p of pts) if (Math.abs(x(p.d) - px) < Math.abs(x(best.d) - px)) best = p;
    pickLayer.innerHTML = `<line class="cursor" x1="${x(best.d)}" x2="${x(best.d)}" y1="${pt}" y2="${H - pb}"/><circle class="picked" cx="${x(best.d)}" cy="${y(best.v)}" r="${r + 3.5}"/>`;
    opts.onPick && opts.onPick(esc(describe(best)));
  });
  return { hasData: true };
}

// "Sep 22 – 28, 2026", "Sep 29 – Oct 5, 2026", "September 2026", "2026"
export function periodLabel(kind, p, monthsLong) {
  const a = dayStr(p.start), b = dayStr(p.end);
  const [ay, am, ad] = a.split('-').map(Number), [by, bm, bd] = b.split('-').map(Number);
  if (kind === 'year') return String(ay);
  if (kind === 'month') return `${monthsLong[am - 1]} ${ay}`;
  const left = `${MONTHS_SHORT[am - 1]} ${ad}`;
  const right = am === bm ? `${bd}` : `${MONTHS_SHORT[bm - 1]} ${bd}`;
  return `${left} – ${right}, ${by}`;
}
