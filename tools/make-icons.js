// Regenerates icons/icon-{180,192,512}.png from tools/icon.html using headless Edge.
// Usage (from the project folder): node tools/make-icons.js
// Each size is rendered at its exact pixel size through the DevTools protocol.
// (Shrinking a larger render with a scale factor shifted the artwork off-center.)
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const src = pathToFileURL(resolve('tools/icon.html')).href;
const port = 9335;
const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'pf-icon-'))}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
  await sleep(200);
}
const ws = new WebSocket(wsUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Page.enable');
for (const s of [180, 192, 512]) {
  await send('Emulation.setDeviceMetricsOverride', { width: s, height: s, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: src });
  await sleep(700);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`icons/icon-${s}.png`, Buffer.from(shot.result.data, 'base64'));
  console.log(`icons/icon-${s}.png`);
}
ws.close(); edge.kill(); process.exit(0);
