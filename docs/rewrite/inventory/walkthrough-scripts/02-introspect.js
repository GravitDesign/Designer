const { launch, shot, URL } = require('./common');
(async () => {
  const { browser, page, logs } = await launch();
  await page.goto(URL);
  await page.waitForTimeout(5000);
  const r = await page.evaluate(() => {
    const methods = o => { const s = new Set(); let p = o; while (p && p !== Object.prototype) { Object.getOwnPropertyNames(p).forEach(k => s.add(k)); p = Object.getPrototypeOf(p); } return [...s]; };
    const out = {};
    out.gDesignerCtor = gDesigner.constructor && gDesigner.constructor.name;
    out.gDesigner = methods(gDesigner);
    out.gravit = Object.keys(window.gravit || {});
    out.GravitDesigner = Object.keys(window.GravitDesigner || {});
    out.core = Object.keys(window.core || {}).slice(0, 50);
    out.gContainer = typeof gContainer, out.gContainerKeys = methods(gContainer).slice(0, 80);
    out.gQA = methods(gQA);
    out.gApi = methods(gApi).slice(0, 80);
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
