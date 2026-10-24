// Open a .gvdesign through the file input, then inspect Open Recent and storage; toggle View > Canvas > Show Rulers and check persistence.
const { launch, shot, URL, ROOT } = require('./common');
const { clickMenu } = require('./menu');
const path = require('path');
(async () => {
  const { browser, page } = await launch();
  page.setDefaultTimeout(8000);
  await page.goto(URL); await page.waitForTimeout(5000);
  const fcP = page.waitForEvent('filechooser');
  await page.click('.g-new-document-dialog .option.local-option');
  await (await fcP).setFiles(path.join(ROOT, 'samples', 'sample-download-Untitled-1.gvdesign'));
  await page.waitForTimeout(3000);
  const ls = () => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k).slice(0, 300); } return o; });
  const before = await ls();
  await page.click('nav.g-menu-bar >> text="File"'); await page.waitForTimeout(300);
  await page.locator('ul.g-menu:not(.g-menu-root) > li:visible', { hasText: 'Open Recent' }).last().hover(); await page.waitForTimeout(400);
  await shot(page, '64-open-recent-after-open');
  const recent = await page.evaluate(() => [...document.querySelectorAll('ul.g-menu:not(.g-menu-root)')].filter(m => m.offsetParent).map(m => m.innerText.split(/\s*\n\s*/).join(' | ')));
  await page.keyboard.press('Escape'); await page.mouse.click(1000, 18);
  const recentDocs = await page.evaluate(() => (gContainer.getRecentDocuments() || []).map(d => JSON.stringify(d).slice(0, 200)));
  await clickMenu(page, ['View', 'Canvas', 'Show Rulers']); await page.waitForTimeout(800);
  await shot(page, '65-rulers-on');
  const rulers = await page.evaluate(() => ({ setting: gDesigner.getSetting('rulers_visible'), ls: JSON.parse(localStorage.getItem('designer.settings')).rulers_visible }));
  console.log(JSON.stringify({ lsKeysAfterOpen: Object.keys(before), recent, recentDocs, rulers }, null, 1));
  await browser.close();
})();
