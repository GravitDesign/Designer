// Lists failed network requests and console errors during startup + new document.
const { launch, URL } = require('./common');
(async () => {
  const { browser, page, logs } = await launch();
  const failed = [];
  page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => failed.push('FAILED ' + (r.failure() && r.failure().errorText) + ' ' + r.url().slice(0, 120)));
  await page.goto(URL); await page.waitForTimeout(6000);
  await page.click('text=Create!'); await page.waitForTimeout(3000);
  console.log([...new Set(failed)].join('\n'));
  console.log('--- console');
  console.log([...new Set(logs)].join('\n'));
  await browser.close();
})();
