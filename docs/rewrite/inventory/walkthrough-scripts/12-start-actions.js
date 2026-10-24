// Welcome screen actions: Open Recent, Open from Computer, links, custom size, preset pick, File > New Design, startup checkbox.
const { launch, shot, URL, ROOT } = require('./common');
const fs = require('fs');
const dump = page => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
(async () => {
  const { browser, context, page, logs } = await launch();
  const out = {};
  await page.goto(URL); await page.waitForTimeout(5000);
  out.lsInitial = await dump(page);
  await page.click('.g-new-document-dialog .option.recent-option'); await page.waitForTimeout(600);
  await shot(page, '06-open-recent'); out.recentText = await page.locator('.g-new-document-dialog .frame').innerText();
  const fcP = page.waitForEvent('filechooser', { timeout: 3000 }).then(fc => ({ multiple: fc.isMultiple() })).catch(e => 'none: ' + e.message.split('\n')[0]);
  await page.click('.g-new-document-dialog .option.local-option'); out.fileChooser = await fcP; await page.waitForTimeout(500);
  await shot(page, '06-open-local');
  for (const name of ['Tutorials', 'User Guide']) {
    const popP = context.waitForEvent('page', { timeout: 3000 }).then(p => p.url()).catch(() => null);
    await page.click(`.g-new-document-dialog .links-container a:text-is("${name}")`);
    out['link_' + name] = await popP;
    for (const p of context.pages()) if (p !== page) await p.close();
  }
  await page.click('.g-new-document-dialog .option.start-option'); await page.waitForTimeout(400);
  // startup checkbox
  const cb = page.locator('.g-new-document-dialog input[type=checkbox]');
  out.checkboxCount = await cb.count();
  out.footerHtml = await page.evaluate(() => { const e = [...document.querySelectorAll('.g-new-document-dialog *')].find(x => x.children.length === 0 && /Don't show anymore/.test(x.textContent)); return e ? e.parentElement.outerHTML : null; });
  if (out.checkboxCount) { await cb.first().click({ force: true }); await page.waitForTimeout(300); out.lsAfterCheckbox = await dump(page); await cb.first().click({ force: true }); }
  // custom size in mm
  await page.fill('.g-new-document-dialog input[name=width]', '210');
  await page.fill('.g-new-document-dialog input[name=height]', '297');
  await page.selectOption('.g-new-document-dialog select[name=unit]', 'mm');
  await page.click('text=Create!'); await page.waitForTimeout(2000);
  await shot(page, '07-custom-a4mm');
  out.customPage = await page.evaluate(() => { const s = gDesigner.getActiveDocument().getScene(); const p = s.getActivePage(); return { w: p.getProperty('w'), h: p.getProperty('h'), unit: s.getProperty('ut'), title: gDesigner.getActiveDocument().getTitle() }; });
  // File > New Design...
  await page.click('nav.g-menu-bar >> text="File"'); await page.waitForTimeout(300);
  await page.click('ul.g-menu >> text="New Design..."'); await page.waitForTimeout(800);
  await shot(page, '08-file-new-design-dialog');
  out.newDialogVisible = await page.locator('.g-new-document-dialog').isVisible();
  out.newDialogClose = await page.evaluate(() => [...document.querySelectorAll('.g-new-document-dialog-container [class*=close]')].map(e => e.className));
  // pick preset iPhone SE
  await page.locator('.g-new-document-dialog .presets > .preset').nth(0).locator('.icon').click(); await page.waitForTimeout(400);
  await page.click('.g-overlay.preset-select li:has-text("iPhone SE")'); await page.waitForTimeout(2000);
  await shot(page, '09-preset-iphone-se');
  out.presetPage = await page.evaluate(() => { const d = gDesigner.getActiveDocument(); const s = d.getScene(); const p = s.getActivePage(); return { w: p.getProperty('w'), h: p.getProperty('h'), name: p.getProperty('name'), unit: s.getProperty('ut'), title: d.getTitle(), docs: gDesigner.getDocuments().length, dialogVisible: !!document.querySelector('.g-new-document-dialog') && document.querySelector('.g-new-document-dialog').offsetParent !== null }; });
  out.tabs = await page.$$eval('#header .section.windows .tabs > *', e => e.map(x => x.innerText.trim()));
  out.lsEnd = await dump(page);
  out.logs = logs.filter(l => !/GL Driver|willReadFrequently/.test(l));
  fs.writeFileSync(ROOT + '/start-actions.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 8000));
  await browser.close();
})();
