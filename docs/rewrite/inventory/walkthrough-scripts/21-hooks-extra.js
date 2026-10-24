// Extra checks for hook expressions not covered by 18-harness-verify.js.
const { launch, URL } = require('./common');
(async () => {
  const { browser, page } = await launch();
  await page.goto(URL);
  await page.waitForFunction(() => window.gDesigner && gDesigner.isReady(), null, { timeout: 30000 });
  await page.click('.g-new-document-dialog .cloud-button'); await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    webpackJsonpGravitDesigner.push([[987654], { gdHarness: (m, e, r) => { window.__wpRequire = r; } }, [['gdHarness']]]);
    const G = __wpRequire(1), doc = gDesigner.getActiveDocument(), scene = doc.getScene(), ed = doc.getEditor();
    const e1 = new G.GEllipse(); e1.setProperty('trf', new G.GTransform(10, 0, 0, 10, 50, 50)); ed.insertElements([e1]);
    const e2 = new G.GEllipse(); e2.setProperty('trf', new G.GTransform(10, 0, 0, 10, 150, 50)); ed.insertElements([e2]);
    const out = { queryAll: scene.queryAll('ellipse').length, querySingle: !!scene.querySingle('ellipse') };
    ed.clearSelection(); out.afterClear = ed.getSelection() ? ed.getSelection().length : 0;
    gDesigner.setSetting('rulers_visible', true); out.ls = JSON.parse(localStorage.getItem('designer.settings')).rulers_visible;
    out.children = scene.getActivePage().getChildren().map(n => n.getNodeName());
    return out;
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
