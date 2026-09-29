// Settings tab: profile, units, appearance, backup.
import { state, saveProfile, saveSettings, setLastBackup, exportData, backupError, importData } from './db.js';
import { ageOn, maintenance, dayNum, localDayStr } from './calc.js';
import {
  $, today, todayNum, parseNum, wUnit, fmtWeight, fromDisplayWeight, fmtInt, dateLabel,
  segmented, applyTheme, confirmSheet, setHint, clampDateInput
} from './ui.js';
import { resetChartUnit } from './weight.js';

let refreshAll = () => {};

export function init(refresh) {
  refreshAll = refresh;
  $('#set-root').innerHTML = `
    <h2 class="section-title first">Profile</h2>
    <div class="list settings">
      <div class="row"><span class="main">Sex</span>
        <div class="seg compact" role="group" aria-label="Sex" id="set-sex">
          <button type="button" data-v="male" aria-pressed="true">Male</button>
          <button type="button" data-v="female" aria-pressed="false">Female</button>
        </div></div>
      <label class="row"><span class="main">Date of birth<span class="s" id="set-age"></span></span>
        <input class="field-input compact" type="date" id="set-dob"></label>
      <div class="row"><span class="main">Height<span class="s" id="set-cm"></span></span>
        <span class="height" id="set-height"></span></div>
      <label class="row"><span class="main">Starting weight</span>
        <span class="num-field compact"><input type="text" inputmode="decimal" autocomplete="off" id="set-start"><span class="unit" data-unit="weight">lb</span></span></label>
    </div>
    <p class="hint set-hint" id="set-hint" aria-live="polite"></p>
    <p class="footnote" id="set-maint"></p>
    <div class="confirm-profile" id="set-confirm" hidden><p class="footnote">These are placeholder values. Change any that are wrong, or confirm them if they’re already right.</p><button type="button" class="btn block" id="set-confirm-btn">These are correct</button></div>

    <h2 class="section-title">Units</h2>
    <div class="list settings">
      <div class="row"><span class="main">Weight</span>
        <div class="seg compact" role="group" aria-label="Weight unit" id="set-wu">
          <button type="button" data-v="lb" aria-pressed="true">lb</button>
          <button type="button" data-v="kg" aria-pressed="false">kg</button>
        </div></div>
      <div class="row"><span class="main">Distance</span>
        <div class="seg compact" role="group" aria-label="Distance unit" id="set-du">
          <button type="button" data-v="km" aria-pressed="true">km</button>
          <button type="button" data-v="mi" aria-pressed="false">mi</button>
        </div></div>
    </div>

    <h2 class="section-title">Appearance</h2>
    <div class="list settings">
      <label class="row toggle"><span class="main">Light mode</span><span></span><input type="checkbox" role="switch" id="set-light"></label>
    </div>

    <h2 class="section-title">Backup</h2>
    <div class="list settings">
      <div class="row backup-row"><span class="main">Export backup<span class="s" id="set-last"></span></span>
        <button type="button" class="btn small" id="set-export">Export</button></div>
      <div class="row backup-row"><span class="main">Import backup<span class="s">Replaces all current data</span></span>
        <button type="button" class="btn small" id="set-import">Import</button></div>
    </div>
    <input type="file" id="set-file" accept="application/json,.json" hidden>
    <p class="hint set-hint" id="set-bhint" aria-live="polite"></p>
    <p class="footnote">Your data is stored only on this phone. Export a backup now and then, and choose “Save to Files” when the share sheet opens.</p>
    <p class="footnote about">PersonalFit · version 1</p>`;

  const hint = $('#set-hint');
  $('#set-confirm-btn').onclick = async () => { await saveProfile({}); refreshAll(); };
  segmented($('#set-sex'), async v => { await saveProfile({ sex: v }); refreshAll(); });
  const dob = $('#set-dob');
  dob.addEventListener('change', async () => {
    clampDateInput(dob);
    await saveProfile({ dob: dob.value });
    refreshAll();
  });
  $('#set-start').addEventListener('change', async e => {
    const v = parseNum(e.target.value), lb = fromDisplayWeight(v);
    if (!isFinite(v) || lb < 50 || lb > 700) { setHint(hint, 'Enter a starting weight, like 180.', true); renderProfile(); return; }
    setHint(hint, '');
    await saveProfile({ startLb: Math.round(lb * 100) / 100 });
    refreshAll();
  });
  $('#set-height').addEventListener('change', async () => {
    let cm;
    if (wUnit() === 'kg') cm = parseNum($('#set-hcm').value);
    else {
      const ft = parseNum($('#set-hft').value || '0'), inch = parseNum($('#set-hin').value || '0');
      cm = (ft * 12 + inch) * 2.54;
    }
    if (!isFinite(cm) || cm < 100 || cm > 250) { setHint(hint, 'Enter a height between 3′4″ and 8′2″ (100–250 cm).', true); renderProfile(); return; }
    setHint(hint, '');
    await saveProfile({ heightCm: Math.round(cm * 100) / 100 });
    refreshAll();
  });

  segmented($('#set-wu'), async v => { await saveSettings({ weightUnit: v }); resetChartUnit(); refreshAll(); });
  segmented($('#set-du'), async v => { await saveSettings({ distUnit: v }); refreshAll(); });

  $('#set-light').addEventListener('change', async e => {
    const theme = e.target.checked ? 'light' : 'dark';
    applyTheme(theme);
    await saveSettings({ theme });
  });

  $('#set-export').addEventListener('click', exportBackup);
  $('#set-import').addEventListener('click', () => $('#set-file').click());
  $('#set-file').addEventListener('change', importBackup);
}

export function render() {
  $('#set-sex').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state.profile.sex)));
  $('#set-wu').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state.settings.weightUnit)));
  $('#set-du').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state.settings.distUnit)));
  $('#set-light').checked = state.settings.theme === 'light';
  renderProfile();
  $('#set-last').textContent = `Last backup: ${lastBackupText()}`;
}

function renderProfile() {
  const p = state.profile;
  const dob = $('#set-dob');
  dob.max = today();
  dob.value = p.dob;
  $('#set-age').textContent = `Age ${ageOn(p.dob, today())}`;
  const totalIn = p.heightCm / 2.54;
  let ft = Math.floor(totalIn / 12), inch = Math.round(totalIn - ft * 12);
  if (inch === 12) { ft += 1; inch = 0; }
  const active = document.activeElement && $('#set-height').contains(document.activeElement);
  if (!active) {
    $('#set-height').innerHTML = wUnit() === 'kg'
      ? `<span class="num-field compact"><input type="text" inputmode="decimal" autocomplete="off" id="set-hcm" value="${Math.round(p.heightCm * 10) / 10}" aria-label="Height in centimeters"><span class="unit">cm</span></span>`
      : `<span class="num-field compact tiny"><input type="text" inputmode="numeric" autocomplete="off" id="set-hft" value="${ft}" aria-label="Height, feet"><span class="unit">ft</span></span>
         <span class="num-field compact tiny"><input type="text" inputmode="numeric" autocomplete="off" id="set-hin" value="${inch}" aria-label="Height, inches"><span class="unit">in</span></span>`;
  }
  $('#set-cm').textContent = wUnit() === 'kg' ? `${ft}′${inch}″` : `${Math.round(p.heightCm * 10) / 10} cm`;
  if (document.activeElement !== $('#set-start')) $('#set-start').value = fmtWeight(p.startLb);
  $('#set-confirm').hidden = !!p.confirmed;
  $('#set-maint').textContent = `These set your maintenance estimate: ${fmtInt(maintenance(state.weights, state.profile, today()))} cal/day right now.`;
}

function lastBackupText() {
  if (!state.lastBackup) return 'never';
  const days = todayNum() - dayNum(localDayStr(state.lastBackup));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function exportBackup() {
  const json = JSON.stringify(exportData(), null, 2);
  const name = `PersonalFit-backup-${today()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  // Recorded when Export is pressed; iPhone doesn't report whether the file was saved.
  setLastBackup(Date.now()).then(render);
  render();
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: 'PersonalFit backup' }).catch(() => {});
  } else {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

async function importBackup(e) {
  const hint = $('#set-bhint');
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  let obj;
  try { obj = JSON.parse(await f.text()); } catch { setHint(hint, 'That file couldn’t be read. Choose a PersonalFit backup (.json).', true); return; }
  const err = backupError(obj);
  if (err) { setHint(hint, err, true); return; }
  const d = obj.data;
  const when = obj.exportedAt ? dateLabel(localDayStr(new Date(obj.exportedAt))) : 'an unknown date';
  const counts = `${d.weights.length} weigh-ins, ${d.calories.length} calorie entries, ${d.exercise.length} workouts, ${d.fasts.length} fasts`;
  const ok = await confirmSheet({
    title: 'Replace all data?',
    message: `This replaces everything in the app with the backup from ${when} (${counts}). Your current data will be lost. This can’t be undone.`,
    confirm: 'Replace with backup'
  });
  if (!ok) return;
  try {
    await importData(obj);
  } catch {
    setHint(hint, 'The backup couldn’t be restored. Your data was not changed.', true);
    return;
  }
  applyTheme(state.settings.theme);
  resetChartUnit();
  setHint(hint, `Backup restored: ${counts}.`);
  refreshAll();
}

