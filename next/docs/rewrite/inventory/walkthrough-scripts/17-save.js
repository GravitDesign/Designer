// File > Save and File > Download File / Save to Local File as... produce a .gvdesign download.
// Saves a sample into samples/ and re-opens it through File > Open Local File.
// Also checks the File System Access path by stubbing showSaveFilePicker.
const { launch, shot, URL, ROOT } = require('./common');
const HARNESS = require('./harness');
const { clickMenu, dialogDump } = require('./menu');
const fs = require('fs');
const path = require('path');

async function setup(opts) {
  const s = await launch(opts);
  s.page.setDefaultTimeout(8000);
  await s.page.goto(URL); await s.page.waitForTimeout(5000);
  await s.page.click('text=Create!'); await s.page.waitForTimeout(2000);
  await s.page.evaluate(HARNESS);
  await s.page.evaluate(() => { H.rect(100, 100, 200, 120); H.ellipse(400, 100, 150, 150); H.clear(); });
  return s;
}

(async () => {
  const out = {};
  // 1) Fallback path (FSA hidden) -> Blob download
  {
    const { browser, page, logs } = await setup();
    out.fileMenuLabels = await (async () => { await page.click('nav.g-menu-bar >> text="File"'); await page.waitForTimeout(300); const t = await page.evaluate(() => [...document.querySelectorAll('ul.g-menu:not(.g-menu-root)')].filter(m => m.offsetParent).map(m => m.innerText.split(/\s*\n\s*/).join(' | '))); await page.keyboard.press('Escape'); await page.mouse.click(1000, 18); return t; })();
    for (const [name, p] of [['save', ['File', 'Save']], ['download', ['File', 'Download File']]]) {
      const dlP = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
      await clickMenu(page, p);
      await page.waitForTimeout(1000);
      await shot(page, `60-${name}-after-click`);
      const dialogs = await dialogDump(page);
      let dl = await dlP;
      const r = out[name] = { dialogs };
      if (!dl) {
        // a name prompt may come first
        const ok = page.locator('.g-dialog:visible button:text-is("OK"), .g-dialog:visible button:text-is("Save")').first();
        if (await ok.count()) { const dl2 = page.waitForEvent('download', { timeout: 8000 }).catch(() => null); await ok.click(); dl = await dl2; r.neededConfirm = true; }
      }
      if (dl) {
        r.suggestedFilename = dl.suggestedFilename();
        const target = path.join(ROOT, 'samples', `sample-${name}-${dl.suggestedFilename()}`);
        await dl.saveAs(target);
        const buf = fs.readFileSync(target);
        r.savedTo = target; r.size = buf.length; r.head = buf.slice(0, 16).toString('hex'); r.headAscii = buf.slice(0, 40).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
      }
      r.title = await page.evaluate(() => H.doc().getTitle());
      r.tabs = await page.$$eval('#header .section.windows .tabs > *', e => e.map(x => x.innerText.trim()));
      r.modified = await page.evaluate(() => H.doc().isModified());
    }
    out.fallbackLogs = logs.filter(l => !/GL Driver|willReadFrequently|ERR_NAME_NOT_RESOLVED|404|ServiceWorker/.test(l));
    await browser.close();
  }
  // 2) Re-open the saved sample via File > Open Local File
  {
    const sample = out.download && out.download.savedTo || out.save && out.save.savedTo;
    const { browser, page, logs } = await launch();
    page.setDefaultTimeout(8000);
    await page.goto(URL); await page.waitForTimeout(5000);
    const fcP = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
    await page.click('.g-new-document-dialog .option.local-option');
    const fc = await fcP;
    out.reopen = { fileChooser: !!fc, multiple: fc && fc.isMultiple() };
    if (fc && sample) {
      await fc.setFiles(sample); await page.waitForTimeout(3000);
      await page.evaluate(HARNESS);
      out.reopen.title = await page.evaluate(() => H.doc() && H.doc().getTitle());
      out.reopen.nodes = await page.evaluate(() => H.nodes().filter(n => !/style/.test(n)));
      await shot(page, '61-reopened-sample');
    }
    out.reopen.accept = await page.evaluate(() => { const i = document.getElementById('file-input'); return i && i.getAttribute('accept'); });
    out.reopenLogs = logs.filter(l => !/GL Driver|willReadFrequently|ERR_NAME_NOT_RESOLVED|404|ServiceWorker/.test(l));
    await browser.close();
  }
  // 3) Real Chromium path: File System Access API. Stub showSaveFilePicker and capture the bytes written.
  {
    const { browser, context, page, logs } = await launch({ noFSA: false });
    await context.addInitScript(() => {
      window.__fsaWrites = [];
      window.showSaveFilePicker = async (opts) => {
        window.__fsaOpts = JSON.parse(JSON.stringify(opts || {}));
        const name = (opts && opts.suggestedName) || 'file';
        return {
          name, kind: 'file',
          getFile: async () => new File([], name),
          queryPermission: async () => 'granted', requestPermission: async () => 'granted',
          createWritable: async () => ({
            write: async (d) => { const b = d instanceof Blob ? new Uint8Array(await d.arrayBuffer()) : (d && d.data ? new Uint8Array(await new Blob([d.data]).arrayBuffer()) : new Uint8Array(d)); window.__fsaWrites.push(b.length); window.__fsaLast = b; },
            close: async () => {}, truncate: async () => {}, seek: async () => {},
          }),
        };
      };
    });
    page.setDefaultTimeout(8000);
    await page.goto(URL); await page.waitForTimeout(5000);
    await page.click('text=Create!'); await page.waitForTimeout(2000);
    await page.evaluate(HARNESS);
    await page.evaluate(() => { H.rect(100, 100, 200, 120); H.clear(); });
    await page.click('nav.g-menu-bar >> text="File"'); await page.waitForTimeout(300);
    out.fsaFileMenu = await page.evaluate(() => [...document.querySelectorAll('ul.g-menu:not(.g-menu-root)')].filter(m => m.offsetParent).map(m => m.innerText.split(/\s*\n\s*/).join(' | ')));
    await page.keyboard.press('Escape'); await page.mouse.click(1000, 18);
    await clickMenu(page, ['File', 'Save']); await page.waitForTimeout(2500);
    out.fsa = await page.evaluate(() => ({ opts: window.__fsaOpts, writes: window.__fsaWrites, title: H.doc().getTitle(), modified: H.doc().isModified(), head: window.__fsaLast ? Array.from(window.__fsaLast.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join('') : null }));
    out.fsa.dialogs = await dialogDump(page);
    await shot(page, '62-fsa-save-chooser');
    const toFile = page.locator('.g-save-chooser-dialog').getByText('Save to File').first();
    if (await toFile.count()) {
      await toFile.click(); await page.waitForTimeout(3000);
      await shot(page, '63-fsa-after-save-to-file');
      out.fsaAfterSaveToFile = await page.evaluate(() => ({ opts: window.__fsaOpts, writes: window.__fsaWrites, title: H.doc().getTitle(), modified: H.doc().isModified(), head: window.__fsaLast ? Array.from(window.__fsaLast.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('') : null }));
      out.fsaAfterSaveToFile.dialogs = await dialogDump(page);
      // second save with Ctrl+S after a change: should write to the same handle without a chooser
      await page.evaluate(() => { H.rect(400, 400, 50, 50); });
      await page.keyboard.press('Control+s'); await page.waitForTimeout(2500);
      out.fsaSecondSave = await page.evaluate(() => ({ writes: window.__fsaWrites, modified: H.doc().isModified() }));
      out.fsaSecondSave.dialogs = await dialogDump(page);
    }
    out.fsaLogs = logs.filter(l => !/GL Driver|willReadFrequently|ERR_NAME_NOT_RESOLVED|404|ServiceWorker/.test(l));
    await browser.close();
  }
  fs.writeFileSync(ROOT + '/save.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
})();
