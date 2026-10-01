// Development only: full-page phone screenshots of every tab via headless Edge (Chrome DevTools Protocol).
// Needs the dev server running. Usage: node tools/shoot.js [outDir]
// Writes <tab>-<device>-<theme>.png, seeding test data first if the app is empty.
// "tab:view" captures a view inside a tab, e.g. TABS=exercise:plan for the run plan.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:5173/';
const out = process.argv[2] || '.impeccable/review';
const tabs = (process.env.TABS || 'weight,calories,exercise,exercise:plan,fasting,summary,settings').split(',');
const devices = [['14pro', 393, 852], ['18pro', 402, 874]];
const themes = (process.env.THEMES || 'dark,light').split(',');
mkdirSync(out, { recursive: true });

const port = 9333;
const profile = process.env.PROFILE || mkdtempSync(join(tmpdir(), 'pf-edge-'));
const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Edge did not start');
}

const ws = new WebSocket(await target());
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: BASE });
await sleep(1500);
if (!process.env.NOSEED) {
  const n = await evaluate(`(async () => { const db = await import('/js/db.js'); await db.load(); return db.state.weights.length; })()`);
  if (!n) {
    await evaluate(`(async () => { const s = await import('/tools/seed.js'); await s.seed(); const db = await import('/js/db.js'); await db.saveWeight(new Date().toLocaleDateString('en-CA'), 180.2); return 1; })()`);
  }
}

for (const [dev, w, h] of devices) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
  for (const theme of themes) {
    // Save the theme the way the Settings switch does, so captures show the switch state too.
    await evaluate(`(async () => { const db = await import('/js/db.js'); await db.load(); await db.saveSettings({ theme: '${theme}' }); localStorage.setItem('pf-theme', '${theme}'); return 1; })()`);
    for (const entry of tabs) {
      const [tab, view] = entry.split(':');
      await send('Page.navigate', { url: `${BASE}?tab=${tab}${view ? `&view=${view}` : ''}` });
      await sleep(900);
      // Full page: stretch the screen to the page height so the fixed tab bar sits at the bottom.
      const full = process.env.VIEWPORT ? h : Math.max(h, await evaluate('document.documentElement.scrollHeight'));
      if (full !== h) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: full, deviceScaleFactor: 2, mobile: true }); await sleep(300); }
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      if (full !== h) await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
      const file = join(out, `${entry.replace(':', '-')}-${dev}-${theme}.png`);
      writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
      console.log(file);
    }
  }
}
ws.close();
edge.kill();
process.exit(0);
