const { launch, shot, URL } = require('./common');
(async () => {
  const { browser, page, logs } = await launch();
  await page.goto(URL);
  await page.waitForTimeout(6000);
  await shot(page, '01-load');
  const globals = await page.evaluate(() => {
    const ifr = document.createElement('iframe'); document.body.appendChild(ifr);
    const base = new Set(Object.getOwnPropertyNames(ifr.contentWindow)); ifr.remove();
    return Object.getOwnPropertyNames(window).filter(k => !base.has(k));
  });
  console.log('GLOBALS', JSON.stringify(globals));
  const body = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  console.log('TEXT', body);
  const html = await page.evaluate(() => document.body.innerHTML.length);
  console.log('HTMLLEN', html);
  console.log('LOGS', logs.join('\n'));
  await browser.close();
})();
