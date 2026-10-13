// Drives igo inside the Android WebView over Chrome DevTools: taps through the main
// screens, saves a screenshot of each and records every JavaScript error and console
// line, so a blank screen comes with the error that caused it.
// Usage: node scripts/android-cdp.mjs PORT OUT_DIR   (after `adb forward tcp:PORT localabstract:webview_devtools_remote_PID`)
import { writeFileSync, appendFileSync } from 'node:fs';

const [port, out] = process.argv.slice(2);
const log = (line) => { console.log(line); appendFileSync(`${out}/js-log.txt`, `${line}\n`); };
writeFileSync(`${out}/js-log.txt`, '');

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find((t) => t.type === 'page' && t.url.startsWith('https://localhost')) ?? targets.find((t) => t.type === 'page');
if (!page) throw new Error(`No igo page among ${JSON.stringify(targets.map((t) => t.url))}`);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });

let next = 0;
const waiting = new Map();
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id) {
    waiting.get(msg.id)?.(msg);
    waiting.delete(msg.id);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    log(`EXCEPTION ${d.exception?.description ?? d.text}`);
  } else if (msg.method === 'Runtime.consoleAPICalled') {
    log(`console.${msg.params.type} ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
  } else if (msg.method === 'Log.entryAdded') {
    log(`log.${msg.params.entry.level} ${msg.params.entry.text}`);
  }
};
const send = (method, params = {}) => new Promise((ok) => {
  const id = ++next;
  waiting.set(id, ok);
  ws.send(JSON.stringify({ id, method, params }));
});
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');

const shot = async (name) => {
  const { result } = await send('Page.captureScreenshot', { format: 'png' });
  if (result?.data) writeFileSync(`${out}/${name}.png`, Buffer.from(result.data, 'base64'));
  const text = await evaluate(`(document.getElementById('root')?.innerText || '').replace(/\\s+/g, ' ').slice(0, 160)`);
  log(`shot ${name}: ${text ? text : 'BLANK SCREEN'}`);
};

// Clicks the first button, link or tab whose text or label starts with `label`, else whose text contains it.
const tap = async (label) => {
  for (let i = 0; i < 5; i++) {
    const hit = await evaluate(`(() => {
      const norm = (s) => (s || '').replace(/^[^\\p{L}\\p{N}]+/u, '').trim().toLowerCase();
      const want = norm(${JSON.stringify(label)});
      const all = [...document.querySelectorAll('button, a, [role=button], [role=tab]')];
      const el = all.find((e) => norm(e.innerText).startsWith(want) || norm(e.getAttribute('aria-label')).startsWith(want))
        ?? all.find((e) => norm(e.innerText).includes(want));
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    })()`);
    if (hit) {
      log(`tapped ${label}`);
      await sleep(2500);
      return true;
    }
    await sleep(1000);
  }
  log(`NOT FOUND: ${label}`);
  return false;
};

await shot('01-launch');
if (await tap('Addis and Harar')) await shot('02-example-trip');
if (await tap('Before you go')) await shot('03-before-you-go');
if (await tap('Places')) await shot('04-places');
if (await tap('Country')) await shot('05-country');
if (await tap('Days')) await shot('06-days');
if (await tap('Trip options')) await shot('07-trip-menu');
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
if (await tap('All trips')) await shot('08-back-to-list');
if (await tap('New trip')) await shot('09-new-trip-form');
if (await tap('Content creator')) await shot('10-creator');
if (await tap('Build my plan')) await shot('11-day-1');
if (await tap('Turn on reminders')) { await sleep(6000); await shot('12-reminders-on'); }
ws.close();
process.exit(0);
