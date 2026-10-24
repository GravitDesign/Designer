const { launch, shot, URL } = require('./common');
(async () => {
  const { browser, page, logs } = await launch();
  await page.goto(URL);
  await page.waitForTimeout(5000);
  await page.click('text=Create!');
  await page.waitForTimeout(2500);
  await shot(page, '02-new-infinite-doc');
  const r = await page.evaluate(() => {
    webpackJsonpGravitDesigner.push([[987654], { gdHarness: function (m, e, r) { window.__wpRequire = r; } }, [['gdHarness']]]);
    const req = window.__wpRequire;
    const out = { hasReq: !!req };
    if (req) {
      const ids = Object.keys(req.c || {});
      out.cacheCount = ids.length;
      const hits = [];
      for (const id of ids) { const ex = req.c[id].exports; if (ex && typeof ex === 'object' && ex.GNode && ex.GRectangle) hits.push({ id, keys: Object.keys(ex).length }); }
      out.hits = hits;
    }
    const doc = gDesigner.getActiveDocument();
    out.docCtor = doc && doc.constructor.name;
    const methods = o => { const s = new Set(); let p = o; while (p && p !== Object.prototype) { Object.getOwnPropertyNames(p).forEach(k => s.add(k)); p = Object.getPrototypeOf(p); } return [...s]; };
    out.docMethods = methods(doc);
    const scene = doc.getScene();
    out.sceneMethods = methods(scene).filter(k=>!k.startsWith('_')).slice(0, 200);
    out.actions = gDesigner.getActions().map(a => { try { return [a.getId(), String(a.getTitle && a.getTitle()), a.getCategory && String(a.getCategory()), a.getShortcut && JSON.stringify(a.getShortcut())]; } catch (e) { return [a.getId && a.getId(), 'ERR ' + e.message]; } });
    out.tm = methods(gDesigner.getToolManager()).filter(k=>!k.startsWith('_'));
    return out;
  });
  require('fs').writeFileSync(require('path').join(require('./common').ROOT, 'introspect-doc.json'), JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ hasReq: r.hasReq, cacheCount: r.cacheCount, hits: r.hits, docCtor: r.docCtor, nActions: r.actions.length, tm: r.tm }));
  await browser.close();
})();
