const { chromium } = require('playwright');
const path = require('path');
const ROOT = 'C:/Users/info/AppData/Local/Temp/gd-walkthrough';
const URL = process.env.GD_URL || 'http://localhost:3191/';
async function launch(opts = {}) {
  const { noFSA, ...ctxOpts } = opts;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true, ...ctxOpts });
  // The app prefers the File System Access API (showOpenFilePicker/showSaveFilePicker) in Chromium.
  // Hiding it makes the app fall back to <input type=file id=file-input> and Blob downloads,
  // which Playwright can drive (setInputFiles / 'download' event).
  if (opts.noFSA !== false) await context.addInitScript(() => { window.showOpenFilePicker = undefined; window.showSaveFilePicker = undefined; window.chooseFileSystemEntries = undefined; });
  const page = await context.newPage();
  const logs = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  return { browser, context, page, logs };
}
// Dump visible inspector/sidebar panels as text + inputs.
const panelDump = (page, root) => page.evaluate((root) => {
  const vis = e => e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
  const rootEl = document.querySelector(root);
  const out = [];
  rootEl.querySelectorAll('.panels > *').forEach(p => {
    if (!vis(p)) return;
    const inputs = [...p.querySelectorAll('input, select, textarea, button')].filter(vis).map(i => {
      if (i.tagName === 'SELECT') return `select[${i.name || i.className}]=${i.options[i.selectedIndex] ? i.options[i.selectedIndex].text : ''} {${[...i.options].map(o => o.text).join('|')}}`;
      if (i.tagName === 'BUTTON') return `button[${(i.dataset.title || i.title || i.innerText || i.className).trim().slice(0, 40)}]`;
      return `${i.type}[${i.name || i.placeholder || i.className}]=${i.type === 'checkbox' || i.type === 'radio' ? i.checked : i.value}`;
    });
    out.push({ cls: p.className, text: p.innerText.split(/\s*\n\s*/).join(' | ').trim().slice(0, 1500), inputs });
  });
  return out;
}, root);
const shot = (page, name) => page.screenshot({ path: path.join(ROOT, 'shots', name + '.png') });
module.exports = { launch, shot, panelDump, ROOT, URL };
