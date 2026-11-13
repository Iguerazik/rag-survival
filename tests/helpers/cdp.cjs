'use strict';
// Controla um Chrome/Edge sem janela pelo protocolo DevTools usando só o Node (WebSocket nativo, sem dependências).
// Usado pelo teste de paridade (motor no Node x motor no navegador). Se não houver navegador, findBrowser() devolve null.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

function findBrowser() {
  const env = process.env.MIDGARD_BROWSER || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files', pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const local = process.env.LOCALAPPDATA || '';
  const candidates = [env,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    path.join(pf, 'Google/Chrome/Application/chrome.exe'), path.join(pf86, 'Google/Chrome/Application/chrome.exe'),
    path.join(local, 'Google/Chrome/Application/chrome.exe'),
    path.join(pf86, 'Microsoft/Edge/Application/msedge.exe'), path.join(pf, 'Microsoft/Edge/Application/msedge.exe')];
  return candidates.find(file => file && fs.existsSync(file)) || null;
}

async function launch({ width = 1280, height = 800 } = {}) {
  const exe = findBrowser();
  if (!exe) return null;
  if (typeof WebSocket !== 'function') return null;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'midgard-cdp-'));
  const child = spawn(exe, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, '--window-size=' + width + ',' + height, '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port = 0;
  for (let i = 0; i < 150 && !port; i++) {
    await new Promise(r => setTimeout(r, 100));
    try { port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]) || 0; } catch {}
  }
  if (!port) { child.kill(); return null; }
  const list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let seq = 0;
  const waiting = new Map(), listeners = [];
  ws.onmessage = msg => {
    const data = JSON.parse(msg.data);
    if (data.id && waiting.has(data.id)) { const w = waiting.get(data.id); waiting.delete(data.id); data.error ? w.reject(new Error(data.error.message)) : w.resolve(data.result); }
    else if (data.method) for (const fn of listeners) fn(data);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; waiting.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const errors = [];
  listeners.push(e => {
    if (e.method === 'Runtime.exceptionThrown') errors.push(e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text);
    if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') errors.push(e.params.args.map(a => a.value ?? a.description).join(' '));
  });
  await send('Runtime.enable'); await send('Page.enable');
  async function evaluate(expression, awaitPromise = true) {
    const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  async function goto(url) {
    const loaded = new Promise(resolve => listeners.push(e => { if (e.method === 'Page.loadEventFired') resolve(); }));
    await send('Page.navigate', { url });
    await Promise.race([loaded, new Promise(r => setTimeout(r, 15000))]);
  }
  async function screenshot(file) {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  }
  async function close() {
    try { ws.close(); } catch {}
    child.kill();
    await new Promise(r => setTimeout(r, 200));
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
  return { exe, send, evaluate, goto, screenshot, close, errors };
}

module.exports = { findBrowser, launch };
