// Checks of the run plan content and how its check marks are backed up.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../js/runplan.js';
import { state, exportData, backupError } from '../js/db.js';

// Plan text uses no-break spaces between numbers and units; compare with plain spaces.
const sp = s => s.replace(/\u00a0/g, ' ');

test('run plan: 10 weeks with the agreed session times', () => {
  assert.equal(R.WEEKS.length, 10);
  assert.deepEqual(R.WEEKS.map(w => w.session), [54, 54, 54, 53, 53, 52, 52, 51, 51, 51]);
  assert.equal(R.WEEKS[0].sets[0].main, '1:00 / 2:00 × 8');
  assert.equal(R.WEEKS[7].sets[0].main, '12:00 / 1:30 × 2, then 6:00');
});

test('run plan: week 10 runs on Mon & Wed, with the 30 min non-stop run on Sat', () => {
  const w10 = R.WEEKS[9].sets;
  assert.equal(w10[0].main, 'Mon & Wed: 20:00 / 1:00 / 10:00');
  assert.equal(w10[0].then, 'then walk 15 min');
  assert.equal(w10[1].main, 'Sat: 30:00 non-stop');
  assert.equal(w10[1].then, 'then walk 16 min');
  assert.ok(!JSON.stringify(R.WEEKS).includes('Thu'));
});

test('run plan: run days are Mon, Wed, Sat with a non-run day between each', () => {
  assert.deepEqual(R.RUN_DAYS.map(d => d[1]), ['Mon', 'Wed', 'Sat']);
  const days = R.weekDays('km');
  assert.deepEqual(days.map(d => d[0]), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const runs = days.filter(([, x]) => x.where === 'Track').map(d => d[0]);
  assert.deepEqual(runs, ['Mon', 'Wed', 'Sat']);
  assert.equal(days[4][1].what, 'Brisk walk + strength routine');
  assert.ok(days[1][1].rest && days[3][1].rest);
});

test('run plan: 30 distinct check boxes', () => {
  const keys = R.WEEKS.flatMap((_, i) => R.RUN_DAYS.map(([d]) => R.checkKey(i + 1, d)));
  assert.equal(new Set(keys).size, 30);
  assert.equal(R.checkKey(3, 'wed'), 'w3-wed');
});

test('run plan: distances and pace follow the Settings unit', () => {
  assert.equal(sp(R.distText(5, 'km')), '5 km');
  assert.equal(sp(R.distText(5, 'mi')), '3.1 mi');
  assert.equal(sp(R.distText(8, 'mi')), '5.0 mi');
  assert.equal(sp(R.paceText(11, 'km')), '~11 min/km');
  assert.equal(sp(R.paceText(11, 'mi')), '~17:42 min/mi'); // 11 × 1.60934 = 17.70 min
  assert.equal(sp(R.weekDays('mi')[6][1].what), 'Long easy walk, 5.0 mi at ~17:42 min/mi + strength routine');
  assert.equal(sp(R.weekDays('km')[0][1].what), 'Run/walk intervals, at least 5 km');
});

test('run plan: strength routine keeps all five exercises with how-to text', () => {
  assert.equal(R.STRENGTH.length, 5);
  for (const [name, reps, how] of R.STRENGTH) assert.ok(name && reps && how);
});

test('backup: export includes run-plan check marks; older backups without them still import', () => {
  state.runChecks = { 'w1-mon': true, 'w2-sat': true };
  const b = exportData();
  assert.deepEqual(b.data.runChecks, { 'w1-mon': true, 'w2-sat': true });
  const old = { app: 'PersonalFit', data: { weights: [], calories: [], exercise: [], fasts: [] } };
  assert.equal(backupError(old), null);
});
