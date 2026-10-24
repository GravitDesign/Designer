// Opens every dialog reachable from the main menus and records its contents and defaults.
const { launch, shot, URL, ROOT } = require('./common');
const HARNESS = require('./harness');
const { clickMenu, dialogDump } = require('./menu');
const fs = require('fs');

const DIALOGS = [
  ['settings', ['Edit', 'Settings...']],
  ['advanced-export', ['File', 'Export', 'Advanced Export...']],
  ['export-png', ['File', 'Export', 'PNG Image (.png)']],
  ['export-jpg', ['File', 'Export', 'JPEG Image (.jpg)']],
  ['export-svg', ['File', 'Export', 'Scalable Vector Graphics (.svg)']],
  ['export-pdf-advanced', ['File', 'Export', 'PDF Document (.pdf)', 'Advanced Options...']],
  ['print', ['File', 'Print...']],
  ['add-fonts', ['File', 'Import', 'Add Fonts...']],
  ['expand-shrink', ['Modify', 'Path', 'Expand/Shrink']],
  ['shortcuts', ['Help', 'Learn', 'Show Keyboard Shortcuts']],
  ['welcome', ['Help', 'Show Welcome Screen']],
  ['play', ['View', 'Play/Present...']],
  ['contact-us', ['Help', 'Support', 'Contact Us']],
  ['request-feature', ['Help', 'Request New Feature']],
  ['user-guide', ['Help', 'Learn', 'User Guide']],
  ['save-as', ['File', 'Save to Local File as...']],
];

async function runOne(name, path) {
  const { browser, context, page, logs } = await launch();
  page.setDefaultTimeout(6000);
  const res = { path };
  try {
    await page.goto(URL); await page.waitForTimeout(5000);
    await page.click('text=Create!'); await page.waitForTimeout(2000);
    await page.evaluate(HARNESS);
    await page.evaluate(() => { window.__r = H.rect(300, 150, 200, 120); });
    const popups = []; context.on('page', p => popups.push(p));
    const downloads = []; page.on('download', d => downloads.push(d.suggestedFilename()));
    const fcs = []; page.on('filechooser', fc => fcs.push({ multiple: fc.isMultiple() }));
    await clickMenu(page, path);
    await page.waitForTimeout(1500);
    await shot(page, `40-dialog-${name}`);
    res.dialogs = await dialogDump(page);
    // "Do you want to save this file before exporting?" -> answer No and record the real dialog.
    const no = page.locator('.g-dialog:visible button:text-is("No")').first();
    if (res.dialogs.some(d => /save this file before/.test(d.text)) && await no.count()) {
      res.preConfirm = res.dialogs; await no.click(); await page.waitForTimeout(1500);
      await shot(page, `40-dialog-${name}-after-no`);
      res.dialogs = await dialogDump(page);
    }
    await page.waitForTimeout(500);
    res.popups = popups.map(p => p.url()); res.downloads = downloads; res.fileChooser = fcs;
    res.title = await page.title();
  } catch (e) { res.error = e.message.split(/\n/)[0]; await shot(page, `40-dialog-${name}-error`).catch(() => {}); }
  res.logs = logs.filter(l => !/GL Driver|willReadFrequently|ERR_NAME_NOT_RESOLVED|404|ServiceWorker/.test(l));
  await browser.close();
  return res;
}

(async () => {
  const only = process.argv[2];
  const out = {};
  for (const [name, path] of DIALOGS) {
    if (only && only !== name) continue;
    const res = out[name] = await runOne(name, path);
    console.log('##', name, res.error || '', 'popups', JSON.stringify(res.popups), 'dl', JSON.stringify(res.downloads), 'fc', JSON.stringify(res.fileChooser));
    if (res.preConfirm) console.log('   (pre-confirm)', res.preConfirm.map(d => d.text).join(' // '));
    for (const d of res.dialogs || []) console.log('   ', d.cls, '::', d.text.slice(0, 700), '\n     inputs:', d.inputs.join(', ').slice(0, 2000));
    if (res.logs.length) console.log('   logs:', res.logs.join(' // '));
  }
  fs.writeFileSync(ROOT + `/dialogs${only ? '-' + only : ''}.json`, JSON.stringify(out, null, 1));
})();
