// Verifies every console expression documented under "Harness hooks" against the running old app,
// and records extra shell info (gravit.* registries, full shortcut list, avatar menu, context menu).
const { launch, shot, URL, ROOT } = require('./common');
const fs = require('fs');

(async () => {
  const { browser, page, logs } = await launch({ noFSA: false });
  page.setDefaultTimeout(8000);
  await page.goto(URL);
  // 1. Wait for app ready
  await page.waitForFunction(() => window.gDesigner && gDesigner.isReady && gDesigner.isReady(), null, { timeout: 30000 });
  const R = {};
  const ev = async (label, expr) => {
    try { const v = await page.evaluate(expr); R[label] = { expr, ok: true, value: v }; }
    catch (e) { R[label] = { expr, ok: false, error: e.message.split('\n')[0] }; }
    return R[label];
  };
  await ev('ready', `gDesigner.isReady()`);
  await ev('version', `({ version: gDesigner.getVersion(), friendly: gDesigner.getVersionFriendlyName(), build: gDesigner.getBuildNum(), env: gDesigner.getEnv() })`);
  await ev('welcomeOpen', `!!document.querySelector('.g-new-document-dialog') && document.querySelector('.g-new-document-dialog').offsetParent !== null`);
  // 2. Create documents without the UI
  await ev('newInfiniteDocument', `(gDesigner.newInfiniteDocument(), gDesigner.closeNewDocumentDialog(), gDesigner.getDocuments().length)`);
  await page.waitForTimeout(1500);
  await ev('activeDocTitle', `gDesigner.getActiveDocument().getTitle()`);
  // 3. Webpack require + core namespace
  await ev('wpRequire', `(webpackJsonpGravitDesigner.push([[987654], { gdHarness: function (m, e, r) { window.__wpRequire = r; } }, [['gdHarness']]]), typeof window.__wpRequire)`);
  await ev('G', `(window.G = __wpRequire(1), ['GRectangle','GEllipse','GText','GPath','GGroup','GTransform','GNode','GScene','GPage','GLayer','GColor','GRGBColor'].map(k => k + ':' + typeof G[k]).join(' '))`);
  // 4. Create shapes
  await ev('createRect', `(() => { const r = new G.GRectangle(); r.setProperty('trf', new G.GTransform(100, 0, 0, 60, 200, 160)); gDesigner.getActiveDocument().getEditor().insertElements([r]); window.__rect = r; return String(r.getGeometryBBox()); })()`);
  await ev('createEllipse', `(() => { const e = new G.GEllipse(); e.setProperty('trf', new G.GTransform(75, 0, 0, 75, 475, 175)); gDesigner.getActiveDocument().getEditor().insertElements([e]); window.__ell = e; return String(e.getGeometryBBox()); })()`);
  await ev('selection', `gDesigner.getActiveDocument().getEditor().getSelection().map(n => n.getNodeName())`);
  await ev('select', `(gDesigner.getActiveDocument().getEditor().updateSelection(false, [__rect, __ell]), gDesigner.getActiveDocument().getEditor().getSelection().length)`);
  await ev('setFill', `(() => { const fl = new G.GStylable.FillPaintLayer(); fl.setProperty('_pt', new G.GRGBColor([255, 0, 0])); __rect.getPaintLayers().appendChild(fl); return __rect.getPaintLayers().getFillLayers ? __rect.getPaintLayers().getFillLayers().length : 'n/a'; })()`);
  await ev('rectProps', `({ trf: String(__rect.getProperty('trf')), name: __rect.getNodeName(), label: __rect.getLabel ? __rect.getLabel() : null, cornerRadius: __rect.getProperty('tl_uf') })`);
  // 5. Actions
  await ev('actionCount', `gDesigner.getActions().length`);
  await ev('canGroup', `gDesigner.canExecuteAction('modify.group')`);
  await ev('executeGroup', `(gDesigner.executeAction('modify.group'), gDesigner.getActiveDocument().getEditor().getSelection().map(n => n.getNodeName()))`);
  await ev('undo', `(gDesigner.executeAction('edit.undo'), gDesigner.getActiveDocument().getScene().getActivePage().getChildren().map(n => n.getNodeName()))`);
  await ev('redoState', `gDesigner.getActiveDocument().getEditor().hasRedoState()`);
  await ev('zoomAction', `(gDesigner.executeAction('view.magnification.200'), gDesigner.getWindows().getActiveWindow().getView().getZoom())`);
  await ev('zoomBack', `(gDesigner.executeAction('view.magnification.100'), gDesigner.getWindows().getActiveWindow().getView().getZoom())`);
  // 6. Tools
  await ev('toolList', `(() => { const tm = gDesigner.getToolManager(); const a = []; for (let i = 0; i < tm.getToolCount(); i++) a.push(String(tm.getTool(i))); return a; })()`);
  await ev('activateRectTool', `(() => { const tm = gDesigner.getToolManager(); for (let i = 0; i < tm.getToolCount(); i++) { const t = tm.getTool(i); if (String(t) === '[Object GRectangleTool]') tm.activateTool(t); } return String(tm.getActiveTool()); })()`);
  await ev('gravitTools', `gravit.tools.map(t => ({ group: t.group, category: t.category && String(t.category), tool: String(t.tool && t.tool.prototype && t.tool.prototype.toString ? t.tool.prototype.toString() : t.tool), keys: Object.keys(t) }))`);
  await ev('activateByClass', `(() => { const tm = gDesigner.getToolManager(); const entry = gravit.tools.find(t => String(t.tool.prototype) === '[Object GEllipseTool]'); tm.activateTool(entry.tool); return String(tm.getActiveTool()); })()`);
  // draw with the active tool via mouse
  await page.mouse.move(700, 400); await page.mouse.down(); await page.mouse.move(800, 480, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(500);
  await ev('drewWithTool', `gDesigner.getActiveDocument().getEditor().getSelection().map(n => n.getNodeName() + ' ' + String(n.getGeometryBBox()))`);
  await ev('backToPointer', `(() => { const tm = gDesigner.getToolManager(); tm.activateTool(tm.getTool(0)); return String(tm.getActiveTool()); })()`);
  // 7. Serialize
  await ev('serializeSave', `(() => { const s = G.GNode.serialize(gDesigner.getActiveDocument().getScene(), { save: true }); return { type: typeof s, len: s.length, head: s.slice(0, 120), hasTrf: s.includes('"trf"') }; })()`);
  await ev('serializePlain', `(() => { const s = G.GNode.serialize(gDesigner.getActiveDocument().getScene()); return { len: s.length, hasTrf: s.includes('"trf"') }; })()`);
  await ev('deserialize', `(() => { const s = G.GNode.serialize(gDesigner.getActiveDocument().getScene(), { save: true }); const n = G.GNode.deserialize(s); return n && n.getNodeName(); })()`);
  // 8. Settings / storage
  await ev('getSetting', `({ theme: gDesigner.getSetting('theme'), grid: gDesigner.getSetting('grid_visible') })`);
  await ev('storageKeys', `Object.keys(localStorage)`);
  // 9. Windows / view
  await ev('view', `(() => { const v = gDesigner.getWindows().getActiveWindow().getView(); return { zoom: v.getZoom(), scroll: [v.getScrollX(), v.getScrollY()] }; })()`);
  await ev('docModified', `gDesigner.getActiveDocument().isModified()`);
  await ev('documentsTitles', `gDesigner.getDocuments().map(d => d.getTitle())`);
  // 10. Registries
  await ev('gravitSidebars', `gravit.sidebars.map(s => String(s.prototype || s))`);
  await ev('gravitPanels', `gravit.panels.map(s => String(s.prototype || s))`);
  await ev('gravitProperties', `gravit.properties.map(s => String(s.prototype || s))`);
  await ev('gravitActionsCount', `gravit.actions.length`);
  await ev('leftSidebars', `(() => { const l = gDesigner.getLeftSidebars(); const s = new Set(); let p = l; while (p && p !== Object.prototype) { Object.getOwnPropertyNames(p).forEach(k => s.add(k)); p = Object.getPrototypeOf(p); } return [...s].filter(k => !k.startsWith('_')).slice(0, 40); })()`);
  // 11. Shortcuts dialog: full list
  await ev('openShortcuts', `(gDesigner.executeAction('help.shortcuts'), true)`);
  await page.waitForTimeout(800);
  await ev('shortcutsFull', `[...document.querySelectorAll('.g-shortcuts-dialog')].map(d => d.innerText)[0]`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.evaluate(() => { const c = [...document.querySelectorAll('.g-shortcuts-dialog button, .g-shortcuts-dialog .close, .g-shortcuts-dialog [class*=close]')]; c.forEach(b => b.click()); });
  // 12. Avatar menu and header "more" button
  await page.click('#header .section.login').catch(() => {}); await page.waitForTimeout(600);
  await shot(page, '70-avatar-menu');
  R.avatarMenu = await page.evaluate(() => [...document.querySelectorAll('ul.g-menu:not(.g-menu-root), .g-overlay, .user-menu')].filter(e => e.offsetParent).map(e => e.innerText.split(/\s*\n\s*/).join(' | ')));
  await page.keyboard.press('Escape'); await page.mouse.click(1000, 18); await page.waitForTimeout(300);
  await page.click('#header .more-button').catch(() => {}); await page.waitForTimeout(600);
  await shot(page, '71-more-button');
  R.moreMenu = await page.evaluate(() => [...document.querySelectorAll('ul.g-menu:not(.g-menu-root), .moreTab')].filter(e => e.offsetParent).map(e => e.innerText.split(/\s*\n\s*/).join(' | ')));
  await page.keyboard.press('Escape'); await page.mouse.click(1000, 18); await page.waitForTimeout(300);
  // 13. Context menu on a selected shape
  await page.evaluate(() => gDesigner.getActiveDocument().getEditor().updateSelection(false, [__ell]));
  await page.mouse.click(475, 175, { button: 'right' }); await page.waitForTimeout(600);
  await shot(page, '72-context-menu');
  R.contextMenu = await page.evaluate(() => [...document.querySelectorAll('ul.g-menu:not(.g-menu-root)')].filter(e => e.offsetParent).map(e => [...e.children].filter(li => li.offsetParent).map(li => li.classList.contains('g-menu-item-divider') ? '---' : ((li.querySelector('.g-menu-item-caption') || {}).textContent || '') + ((li.querySelector('.g-menu-item-shortcut') || {}).textContent ? ' [' + li.querySelector('.g-menu-item-shortcut').textContent + ']' : '') + (li.classList.contains('g-disabled') ? ' (disabled)' : '') + (li.classList.contains('g-menu-item-menu') ? ' >' : ''))));
  await page.keyboard.press('Escape'); await page.mouse.click(1000, 18);
  // tab context menu
  await page.click('#header .section.windows .tabs > * >> nth=0', { button: 'right' }).catch(() => {}); await page.waitForTimeout(600);
  await shot(page, '73-tab-context-menu');
  R.tabContextMenu = await page.evaluate(() => [...document.querySelectorAll('ul.g-menu:not(.g-menu-root)')].filter(e => e.offsetParent).map(e => e.innerText.split(/\s*\n\s*/).join(' | ')));
  await page.keyboard.press('Escape'); await page.mouse.click(1000, 18);
  R.logs = logs.filter(l => !/GL Driver|willReadFrequently/.test(l));
  fs.writeFileSync(ROOT + '/harness-verify.json', JSON.stringify(R, null, 1));
  for (const [k, v] of Object.entries(R)) {
    if (v && v.expr !== undefined) console.log((v.ok ? 'OK  ' : 'FAIL') + ' ' + k + ' => ' + (v.ok ? JSON.stringify(v.value) : v.error).slice(0, 400));
    else console.log('    ' + k + ' => ' + JSON.stringify(v).slice(0, 1500));
  }
  await browser.close();
})();
