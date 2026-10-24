const { launch, shot, URL, ROOT } = require('./common');
(async () => {
  const { browser, page } = await launch();
  await page.goto(URL); await page.waitForTimeout(5000);
  await page.click('text=Create!'); await page.waitForTimeout(2000);
  const h = await page.evaluate(() => document.querySelector('nav.g-menu-bar').outerHTML);
  require('fs').writeFileSync(ROOT + '/menubar.html', h);
  await page.click('nav.g-menu-bar >> text=File'); await page.waitForTimeout(500);
  await shot(page, '10-menu-file');
  const h2 = await page.evaluate(() => [...document.querySelectorAll('.g-menu')].map(m => m.outerHTML.slice(0, 4000)).join('\n\n=====\n\n'));
  require('fs').writeFileSync(ROOT + '/menu-open.html', h2);
  const tb = await page.evaluate(() => document.querySelector('#toolbar').outerHTML);
  require('fs').writeFileSync(ROOT + '/toolbar.html', tb);
  await browser.close();
})();
