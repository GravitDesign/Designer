const { launch, shot, URL, ROOT } = require('./common');
(async () => {
  const { browser, page, logs } = await launch();
  await page.goto(URL);
  await page.waitForTimeout(5000);
  await page.click('text=Create!');
  await page.waitForTimeout(2000);
  const r = await page.evaluate(() => {
    const sk = (el, d = 0, max = 4) => {
      if (d > max) return '';
      let s = '  '.repeat(d) + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') + (el.title ? ` [title="${el.title}"]` : '') + '\n';
      for (const c of el.children) s += sk(c, d + 1, max);
      return s;
    };
    return sk(document.body, 0, 5);
  });
  require('fs').writeFileSync(ROOT + '/dom-skeleton.txt', r);
  console.log(r.length);
  await browser.close();
})();
