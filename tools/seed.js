// Test data for development only. In the browser console on the dev server:
//   const s = await import('/tools/seed.js'); await s.seed(); location.reload();
//   const s = await import('/tools/seed.js'); await s.wipe(); location.reload();
import * as db from '/js/db.js';
import { dayNum, dayStr, localDayStr, exerciseKcal } from '/js/calc.js';

// Deterministic pseudo-random numbers so every seed looks the same.
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

export async function seed(days = 75) {
  await db.load();
  const r = rng(42);
  const t = dayNum(localDayStr());
  for (let i = days; i >= 1; i--) {
    const date = dayStr(t - i);
    const trend = 186 - (days - i) * 0.08;
    if (r() > 0.25) await db.saveWeight(date, Math.round((trend + (r() - 0.5) * 1.6) * 10) / 10);
    if (r() > 0.15) {
      await db.saveCalorie({ date, kcal: Math.round(500 + r() * 400) });
      await db.saveCalorie({ date, kcal: Math.round(700 + r() * 600) });
      if (r() > 0.5) await db.saveCalorie({ date, kcal: Math.round(200 + r() * 300) });
    } else if (r() > 0.5) {
      await db.saveCalorie({ date, kcal: 0 });
    }
    if (r() > 0.55) {
      const type = ['walk', 'jog', 'run'][Math.floor(r() * 3)];
      const km = Math.round((2 + r() * 6) * 10) / 10;
      const minutes = Math.round(km * (type === 'walk' ? 11 : type === 'jog' ? 7 : 5.5));
      await db.saveExercise({ date, type, minutes, km, note: r() > 0.7 ? 'zone 2' : '', kcal: exerciseKcal(type, km, 182) });
    }
    if (r() > 0.85) await db.saveExercise({ date, type: 'direct', kcal: Math.round(100 + r() * 250), note: 'Cycling' });
    if (r() > 0.6) {
      const [y, m, d] = date.split('-').map(Number);
      const end = new Date(y, m - 1, d, 11 + Math.floor(r() * 3), Math.floor(r() * 60)).getTime();
      const start = end - (14 + r() * 6) * 3600000;
      const prevEnd = db.state.fasts.reduce((mx, f) => Math.max(mx, f.end), 0);
      if (start > prevEnd) await db.saveFast({ start, end });
    }
  }
}

export async function wipe() {
  await db.load();
  await db.importData({ app: 'PersonalFit', data: { weights: [], calories: [], exercise: [], fasts: [], profile: db.state.profile, settings: db.state.settings, activeFast: null } });
}
