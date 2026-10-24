const { launch, shot, URL, ROOT } = require('./common');
const HARNESS = require('./harness');
(async () => {
  const { browser, page, logs } = await launch();
  await page.goto(URL);
  await page.waitForTimeout(5000);
  await page.click('text=Create!');
  await page.waitForTimeout(2000);
  console.log('G keys', await page.evaluate(HARNESS));
  const r = await page.evaluate(() => ({
    keys: Object.keys(G),
    m257: Object.keys(__wpRequire(257)), m1074: Object.keys(__wpRequire(1074)),
  }));
  console.log(JSON.stringify(r));
  await browser.close();
})();
