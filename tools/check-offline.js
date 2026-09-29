// Development only: proves the app loads with no network after the first visit.
// Starts its own server on port 5174, then shuts it down before reloading. Usage: node tools/check-offline.js
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port = 9334;
const server = spawn(process.execPath, ['tools/dev-server.js'], { env: { ...process.env, PORT: '5174' }, stdio: 'ignore' });
const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'pf-off-'))}`, 'about:blank'], { stdio: 'ignore' });
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
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send('Page.enable'); await send('Network.enable');
await send('Page.navigate', { url: 'http://localhost:5174/' });
await sleep(1500);
// The app registers the worker only on https; register it here the same way.
console.log('register:', await ev(`navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(r => r.active.state)`));
await sleep(1000);
console.log('cached files:', await ev(`caches.keys().then(k => caches.open(k[0])).then(c => c.keys()).then(r => r.length)`));
server.kill();
await sleep(800);
console.log('server reachable (should be offline):', await ev(`fetch('http://localhost:5174/nope-' + Date.now(), { cache: 'no-store' }).then(() => 'online', () => 'offline')`));
await send('Page.reload', { ignoreCache: false });
await sleep(2000);
console.log('offline page:', await ev(`JSON.stringify({ title: document.title, heading: document.querySelector('#h-weight')?.textContent, hero: document.querySelector('#w-hero')?.innerText.split('\\n').slice(0,2).join(' '), tabs: document.querySelectorAll('.tabbar button').length, controlled: !!navigator.serviceWorker.controller })`));
ws.close(); edge.kill(); process.exit(0);
