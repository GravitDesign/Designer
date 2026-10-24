// Language check: the UI language follows the locale returned by GET /user (non-anonymous user).
// Intercept /user and return locale de-DE to see the German UI.
const { launch, shot, URL, ROOT } = require('./common');
const HARNESS = require('./harness');
const fs = require('fs');
(async () => {
  const { browser, context, page, logs } = await launch({ locale: 'en-US' });
  const loc = process.argv[2] || 'de-DE';
  await page.route(/\/user\?/, async route => {
    const resp = await route.fetch(); const j = await resp.json(); j.locale = loc;
    await route.fulfill({ response: resp, json: j });
  });
  await page.goto(URL); await page.waitForTimeout(6000);
  await shot(page, `54-lang-${loc}-welcome`);
  await page.click('.g-new-document-dialog .cloud-button'); await page.waitForTimeout(2000);
  await page.evaluate(HARNESS);
  const r = await page.evaluate(() => ({ lang: G.GLocale.getLanguage(), setting: gDesigner.getSetting('language'), menu: [...document.querySelectorAll('nav.g-menu-bar .g-menu-item-caption')].map(e => e.textContent), tabs: [...document.querySelectorAll('.sidebar-option')].map(e => e.innerText) }));
  await page.click('nav.g-menu-bar > ul > li >> nth=0'); await page.waitForTimeout(400);
  await shot(page, `54-lang-${loc}-file-menu`);
  r.fileMenu = await page.evaluate(() => [...document.querySelectorAll('ul.g-menu:not(.g-menu-root)')].filter(m => m.offsetParent).map(m => m.innerText.split(/\s*\n\s*/).join(' | ')));
  r.ls = await page.evaluate(() => JSON.parse(localStorage.getItem('designer.settings') || '{}').language);
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
