// In-page harness helpers for the old Gravit Designer build.
// Inject with `await page.evaluate(HARNESS)` after the app has loaded (gDesigner exists).
// Defines window.__wpRequire (webpack require), window.G (core namespace) and window.H (helpers).
module.exports = `(() => {
  if (!window.__wpRequire) {
    // Push a fake chunk into the webpack 4 JSONP queue; its entry module receives __webpack_require__.
    webpackJsonpGravitDesigner.push([[987654], { gdHarness: function (m, e, r) { window.__wpRequire = r; } }, [['gdHarness']]]);
  }
  // Module 1 is the core scene library namespace (GScene, GNode, GRectangle, GEllipse, GText, GPath, GTransform, ...).
  window.G = window.__wpRequire(1);
  const doc = () => gDesigner.getActiveDocument();
  const ed = () => doc().getEditor();
  const scene = () => doc().getScene();
  const tm = () => gDesigner.getToolManager();
  window.H = {
    doc, ed, scene,
    // Shapes are unit shapes (-1..1) mapped by the 'trf' transform: (w/2, 0, 0, h/2, cx, cy).
    rect(x, y, w, h) { const r = new G.GRectangle(); r.setProperty('trf', new G.GTransform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2)); ed().insertElements([r]); return r; },
    ellipse(x, y, w, h) { const r = new G.GEllipse(); r.setProperty('trf', new G.GTransform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2)); ed().insertElements([r]); return r; },
    select(nodes) { ed().updateSelection(false, nodes); },
    selection() { return ed().getSelection() || []; },
    clear() { ed().clearSelection(); },
    serialize() { return G.GNode.serialize(scene()); },
    tools() { const out = []; for (let i = 0; i < tm().getToolCount(); i++) out.push(String(tm().getTool(i)).replace(/^\\[Object (.*)\\]$/, '$1')); return out; },
    tool(name) { const m = tm(); for (let i = 0; i < m.getToolCount(); i++) { const t = m.getTool(i); if (String(t) === '[Object ' + name + ']') { m.activateTool(t); return true; } } return false; },
    activeTool() { return String(tm().getActiveTool()).replace(/^\\[Object (.*)\\]$/, '$1'); },
    // executeAction(id, argsArray, source, noStats): args are passed as an array to action.execute.
    action(id, args) { return gDesigner.executeAction(id, args); },
    canAction(id, args) { return gDesigner.canExecuteAction(id, args); },
    actionIds() { return gDesigner.getActions().map(a => a.getId()); },
    nodes() { const out = []; scene().accept(n => { out.push(n.getNodeName()); }); return out; },
  };
  return Object.keys(window.G).length;
})()`;
