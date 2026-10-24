// Welcome / new document screen: structure, unit list, preset lists per category, Open Recent, and File > New Design dialog.
const { launch, shot, URL, ROOT } = require('./common');
const fs = require('fs');
(async () => {
  const { browser, page, logs } = await launch();
  await page.goto(URL); await page.waitForTimeout(5000);
  const out = {};
  out.html = await page.evaluate(() => { const d = [...document.querySelectorAll('.g-dialog, .new-document-dialog, [class*=welcome]')].filter(x => x.offsetParent); return d.map(x => x.className); });
  const dlgSel = await page.evaluate(() => { let el = [...document.querySelectorAll('*')].find(e => e.textContent.trim() === 'Create!' && e.children.length === 0); let p = el; for (let i = 0; i < 12 && p; i++) { if (p.offsetWidth > 800) break; p = p.parentElement; } return p ? p.className : null; });
  out.dialogClass = dlgSel;
  const full = await page.evaluate(() => { let el = [...document.querySelectorAll('*')].find(e => e.textContent.trim() === 'Create!' && e.children.length === 0); let p = el; for (let i = 0; i < 12 && p; i++) { if (p.offsetWidth > 800) break; p = p.parentElement; } return p.outerHTML; });
  fs.writeFileSync(ROOT + '/welcome.html', full);
  fs.writeFileSync(ROOT + '/welcome.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
  await browser.close();
})();
