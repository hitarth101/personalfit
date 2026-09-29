// On-device storage (IndexedDB). Everything is loaded into memory at start-up;
// every change is written straight through to the database.
import { DEFAULT_PROFILE } from './calc.js';

const DB_NAME = 'personalfit';
const STORES = ['weights', 'calories', 'exercise', 'fasts', 'meta'];
let db;

export const state = {
  weights: [],   // {date, lb}            one per day, keyed by date
  calories: [],  // {id, date, kcal}
  exercise: [],  // {id, date, type: walk|jog|run|direct, minutes, km, note, kcal}
  fasts: [],     // {id, start, end}      timestamps in ms
  profile: { ...DEFAULT_PROFILE },
  settings: { weightUnit: 'lb', distUnit: 'km', theme: 'dark' },
  activeFast: null, // {start}
  lastBackup: null  // timestamp of the last Export press
};

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      d.createObjectStore('weights', { keyPath: 'date' });
      d.createObjectStore('calories', { keyPath: 'id', autoIncrement: true });
      d.createObjectStore('exercise', { keyPath: 'id', autoIncrement: true });
      d.createObjectStore('fasts', { keyPath: 'id', autoIncrement: true });
      d.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(stores, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result;
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
    result = fn(t);
  });
}

const reqValue = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export async function load() {
  if (!db) {
    db = await open();
    // Ask the phone not to clear this app's storage under pressure.
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }
  const t = db.transaction(STORES, 'readonly');
  const [weights, calories, exercise, fasts, meta] = await Promise.all(STORES.map(s => reqValue(t.objectStore(s).getAll())));
  state.weights = weights;
  state.calories = calories;
  state.exercise = exercise;
  state.fasts = fasts;
  for (const m of meta) {
    if (m.key === 'profile') state.profile = { ...DEFAULT_PROFILE, ...m.value };
    if (m.key === 'settings') state.settings = { ...state.settings, ...m.value };
    if (m.key === 'activeFast') state.activeFast = m.value;
    if (m.key === 'lastBackup') state.lastBackup = m.value;
  }
}

// ---------- Generic writes ----------

async function put(store, obj) {
  let key;
  await tx([store], 'readwrite', t => {
    const r = t.objectStore(store).put(obj);
    r.onsuccess = () => { key = r.result; };
  });
  return key;
}

async function del(store, key) {
  await tx([store], 'readwrite', t => { t.objectStore(store).delete(key); });
}

function replaceIn(list, obj, keyName) {
  const i = list.findIndex(x => x[keyName] === obj[keyName]);
  if (i >= 0) list[i] = obj; else list.push(obj);
}

// ---------- Weights ----------

export async function saveWeight(date, lb) {
  const w = { date, lb };
  await put('weights', w);
  replaceIn(state.weights, w, 'date');
}

// Editing may move an entry to another date (replacing whatever is there).
export async function updateWeight(oldDate, date, lb) {
  if (oldDate !== date) await deleteWeight(oldDate);
  await saveWeight(date, lb);
}

export async function deleteWeight(date) {
  await del('weights', date);
  state.weights = state.weights.filter(w => w.date !== date);
}

// ---------- Calories, exercise, fasts (auto-numbered) ----------

async function saveRow(store, row) {
  const copy = { ...row };
  if (copy.id == null) delete copy.id;
  const id = await put(store, copy);
  copy.id = id;
  replaceIn(state[store], copy, 'id');
  return copy;
}

async function deleteRow(store, id) {
  await del(store, id);
  state[store] = state[store].filter(x => x.id !== id);
}

export const saveCalorie = row => saveRow('calories', row);
export const deleteCalorie = id => deleteRow('calories', id);
export const saveExercise = row => saveRow('exercise', row);
export const deleteExercise = id => deleteRow('exercise', id);
export const saveFast = row => saveRow('fasts', row);
export const deleteFast = id => deleteRow('fasts', id);

// ---------- Meta ----------

async function putMeta(key, value) { await put('meta', { key, value }); }

// Any profile save from Settings also marks the placeholder values as replaced.
export async function saveProfile(p) { state.profile = { ...state.profile, ...p, confirmed: true }; await putMeta('profile', state.profile); }
export async function saveSettings(s) { state.settings = { ...state.settings, ...s }; await putMeta('settings', state.settings); }
export async function setActiveFast(v) {
  state.activeFast = v;
  if (v) await putMeta('activeFast', v); else await del('meta', 'activeFast');
}
export async function setLastBackup(t) { state.lastBackup = t; await putMeta('lastBackup', t); }

// ---------- Backup ----------

export function exportData() {
  return {
    app: 'PersonalFit',
    format: 1,
    exportedAt: new Date().toISOString(),
    data: {
      weights: state.weights, calories: state.calories, exercise: state.exercise, fasts: state.fasts,
      profile: state.profile, settings: state.settings, activeFast: state.activeFast
    }
  };
}

// Checks a parsed backup file. Returns an error message or null.
export function backupError(obj) {
  if (!obj || obj.app !== 'PersonalFit' || !obj.data) return 'This file isn’t a PersonalFit backup.';
  const d = obj.data;
  for (const k of ['weights', 'calories', 'exercise', 'fasts']) if (!Array.isArray(d[k])) return 'This backup file is incomplete or damaged.';
  return null;
}

// Replaces all data with the backup. The "last backup" note is left unchanged.
export async function importData(obj) {
  const d = obj.data;
  await tx(STORES, 'readwrite', t => {
    for (const s of ['weights', 'calories', 'exercise', 'fasts']) {
      const store = t.objectStore(s);
      store.clear();
      for (const row of d[s]) store.put(row);
    }
    const meta = t.objectStore('meta');
    meta.put({ key: 'profile', value: { ...DEFAULT_PROFILE, ...(d.profile || {}) } });
    meta.put({ key: 'settings', value: { ...state.settings, ...(d.settings || {}) } });
    if (d.activeFast) meta.put({ key: 'activeFast', value: d.activeFast }); else meta.delete('activeFast');
  });
  await load();
}
