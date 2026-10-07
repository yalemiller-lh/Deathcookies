// Checks the production build in headless Chrome: the service worker installs,
// the app shell is cached, and the page still opens with the server offline.
// Usage: serve dist (e.g. `npx vite preview --port 5181`), then
//   node tools/check-pwa.mjs http://localhost:5181 "C:/Program Files/Google/Chrome/Application/chrome.exe"
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url = 'http://localhost:5181', browser = 'C:/Program Files/Google/Chrome/Application/chrome.exe'] = process.argv.slice(2);
const profile = mkdtempSync(join(tmpdir(), 'dc-pwa-'));
const port = 9333;
const proc = spawn(browser, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('browser did not start');
}

const ws = new WebSocket(await target());
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', e => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) => new Promise(r => { const id = nextId++; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

const results = {};
try {
  await send('Page.enable');
  await send('Page.navigate', { url });
  await sleep(3000);
  results.serviceWorker = await evaluate(`navigator.serviceWorker.ready.then(r => r.active && r.active.state)`);
  await send('Page.reload');
  await sleep(2000);
  results.controlled = await evaluate(`!!navigator.serviceWorker.controller`);
  results.cached = await evaluate(`caches.keys().then(k => caches.open(k[0])).then(c => c.keys()).then(r => r.map(x => new URL(x.url).pathname))`);
  await send('Network.enable');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await send('Page.reload');
  await sleep(2500);
  results.offlineText = await evaluate(`document.body.innerText.slice(0, 60)`);
} finally {
  ws.close();
  proc.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* browser still releasing files */ }
}
console.log(JSON.stringify(results, null, 2));
const ok = results.serviceWorker === 'activated' && results.controlled && /YOUR|DEATHCOOKIES/i.test(results.offlineText ?? '');
process.exit(ok ? 0 : 1);
