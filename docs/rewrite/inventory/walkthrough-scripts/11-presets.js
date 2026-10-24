// Clicks each preset category on the welcome screen and records the preset entries shown.
const { launch, shot, URL, ROOT } = require('./common');
const fs = require('fs');
(async () => {
  const { browser, page, logs } = await launch();
  await page.goto(URL); await page.waitForTimeout(5000);
  const out = {};
  const cats = await page.$$eval('.g-new-document-dialog .presets > .preset .title', e => e.map(x => x.textContent));
  for (let i = 0; i < cats.length; i++) {
    await page.locator('.g-new-document-dialog .presets > .preset').nth(i).locator('.icon').click();
    await page.waitForTimeout(700);
    await shot(page, `05-preset-${i}-${cats[i].replace(/\W+/g, '_')}`);
    out[cats[i]] = await page.evaluate(() => {
      const vis = [...document.querySelectorAll('.g-new-document-dialog *')].filter(e => e.offsetParent !== null);
      const lists = [...document.querySelectorAll('.g-new-document-dialog .presets-frame, .g-menu:not(.g-menu-root), .g-new-document-dialog ul, .g-new-document-dialog .preset-list')].filter(e => e.offsetParent !== null);
      return { list: [...document.querySelectorAll('.g-overlay.preset-select li')].filter(li => li.offsetParent !== null).map(li => li.textContent.trim()), selects: [].map(sel => ({ cls: sel.className, name: sel.name, visible: sel.offsetParent !== null, options: [...sel.options].map(o => o.value + ' = ' + o.textContent) })), menus: [...document.querySelectorAll('ul.g-menu:not(.g-menu-root)')].filter(m => m.offsetParent).map(m => m.innerText) };
    });
    // go back if there's a back button
    const back = page.locator('.g-new-document-dialog .back, .g-new-document-dialog [class*=back]').first();
    if (await back.count() && await back.isVisible()) { await back.click(); await page.waitForTimeout(400); }
    else { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  }
  fs.writeFileSync(ROOT + '/presets.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 6000));
  await browser.close();
})();
