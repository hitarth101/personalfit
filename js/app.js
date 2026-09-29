// Start-up, tab switching, and keeping date fields on "today".
import { state, load } from './db.js';
import { $, $$, paintIcons, applyTheme, clampDateInput, today } from './ui.js';
import * as weight from './weight.js';
import * as calories from './calories.js';
import * as exercise from './exercise.js';
import * as fasting from './fasting.js';
import * as summary from './summary.js';
import * as settings from './settings.js';

const modules = { weight, calories, exercise, fasting, summary, settings };
const scrollPos = {};
let current = 'weight';
let currentDay = today();

// Re-draw every tab from the in-memory data. Cheap: the data is small.
function refreshAll() {
  for (const m of Object.values(modules)) m.render();
}

export function showTab(name) {
  if (name === current) { window.scrollTo(0, 0); return; }
  scrollPos[current] = window.scrollY;
  $$('.tab').forEach(s => { s.hidden = s.id !== `tab-${name}`; });
  $$('.tabbar button').forEach(b => {
    if (b.dataset.tab === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  current = name;
  // Leaving a tab with a past date picked puts every entry date back on today,
  // so a later entry can't land on the wrong day by accident.
  if (resetDates()) { exercise.newDay(); refreshAll(); }
  window.scrollTo(0, scrollPos[name] || 0);
  for (const m of Object.values(modules)) m.onTab && m.onTab(name);
}

// Opens a tracker's form with a date filled in (from the Summary calendar).
function prefill(tab, date) {
  showTab(tab);
  modules[tab].prefill(date);
}

// Every entry date field defaults to today and resets when a new day starts.
// Returns true if any field changed.
function resetDates() {
  let changed = false;
  $$('input[type=date][data-today]').forEach(inp => {
    if (inp.value !== today()) { inp.value = today(); changed = true; }
    inp.max = today();
  });
  return changed;
}

function checkNewDay() {
  const t = today();
  $$('input[type=date]').forEach(inp => { inp.max = t; });
  if (t !== currentDay) {
    currentDay = t;
    resetDates();
    weight.resetPeriod();
    for (const m of Object.values(modules)) m.newDay && m.newDay();
    refreshAll();
  }
}

async function start() {
  paintIcons();
  try {
    await load();
  } catch (e) {
    document.body.innerHTML = `<main><section class="tab"><h1 class="large-title">PersonalFit</h1><p class="empty">Storage isn't available, so the app can't load your data. If you're in a private browsing window, open PersonalFit from your home screen instead.</p></section></main>`;
    return;
  }
  // ?theme=light|dark previews a theme without saving it (used by tools/preview.html).
  const forced = new URLSearchParams(location.search).get('theme');
  if (forced === 'light' || forced === 'dark') document.documentElement.dataset.theme = forced;
  else applyTheme(state.settings.theme);
  const ctx = { refreshAll, showTab, prefill };
  for (const m of Object.values(modules)) m.init(refreshAll, ctx);
  resetDates();
  refreshAll();
  // ?tab=name opens a tab directly (used by tools/capture.html for screenshots).
  const startTab = new URLSearchParams(location.search).get('tab');
  if (startTab && modules[startTab]) showTab(startTab);

  $('.tabbar').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (b) showTab(b.dataset.tab);
  });
  // Any date field typed or picked into the future is pulled back to today.
  document.addEventListener('change', e => {
    if (e.target.matches('input[type=date]')) clampDateInput(e.target);
  }, true);

  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkNewDay(); });
  window.addEventListener('focus', checkNewDay);
  setInterval(checkNewDay, 60000);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

start();
