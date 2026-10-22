const { launch, shot, URL, ROOT } = require('./common');
const HARNESS = require('./harness');
(async () => {
  const { browser, page, logs } = await launch();
  await page.goto(URL);
  await page.waitForTimeout(5000);
  await page.click('text=Create!');
  await page.waitForTimeout(2000);
  await page.evaluate(HARNESS);
  const r = await page.evaluate(() => {
    const out = {};
    const doc = gDesigner.getActiveDocument();
    const ed = doc.getEditor();
    const rect = new G.GRectangle(100, 100, 200, 120);
    out.rectBBox = String(rect.getGeometryBBox());
    try { ed.insertElements([rect], true); out.inserted = true; } catch (e) { out.insErr = e.message; }
    out.sel = (ed.getSelection() || []).map(n => n.getNodeName());
    const s = G.GNode.serialize(doc.getScene());
    out.serType = typeof s; out.serLen = s.length; out.serHead = String(s).slice(0, 600);
    out.tools = []; const tm = gDesigner.getToolManager();
    for (let i = 0; i < tm.getToolCount(); i++) { const t = tm.getTool(i); out.tools.push([i, t.constructor.name, String(t), t.getId && t.getId()]); }
    out.active = String(tm.getActiveTool());
    out.editorMethods = (() => { const s = new Set(); let p = ed; while (p && p !== Object.prototype) { Object.getOwnPropertyNames(p).forEach(k => s.add(k)); p = Object.getPrototypeOf(p); } return [...s].filter(k => !k.startsWith('_')); })();
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await shot(page, '03-api-rect');
  console.log(logs.filter(l => !/GL Driver|ERR_NAME|willReadFrequently/.test(l)).join('\n'));
  await browser.close();
})();
