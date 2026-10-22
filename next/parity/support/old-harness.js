// Injected into the old app's page after gDesigner is ready. Defines
// window.__parity with the same shape the new app defines in its parity
// build (see next/src/parity/bridge.ts), so a scenario can run unchanged in
// both apps. Plain JavaScript on purpose: it is evaluated in the page as is.
(() => {
  if (window.__parity) return Object.keys(window.__parity.G).length;
  if (!window.__wpRequire) {
    // The scene classes are not globals. Pushing a fake chunk into the
    // webpack JSONP queue hands us webpack's require function.
    window.webpackJsonpGravitDesigner.push([
      [987654],
      {
        gdParityHarness: (module, exports, require) => {
          window.__wpRequire = require;
        },
      },
      [["gdParityHarness"]],
    ]);
  }
  // Module 1 is the engine namespace (GScene, GRectangle, GTransform, ...).
  const G = window.__wpRequire(1);
  const designer = window.gDesigner;
  const doc = () => designer.getActiveDocument();
  const toolName = (tool) => String(tool).replace(/^\[Object (.*)\]$/, "$1");
  const app = {
    kind: "old",
    designer,
    require: window.__wpRequire,
    document: doc,
    scene: () => doc().getScene(),
    editor: () => doc().getEditor(),
    view: () => designer.getWindows().getActiveWindow().getView(),
    newInfiniteDocument() {
      designer.newInfiniteDocument();
      designer.closeNewDocumentDialog();
    },
    serialize(options) {
      return G.GNode.serialize(doc().getScene(), options);
    },
    deserialize(json) {
      return G.GNode.deserialize(json);
    },
    actionIds() {
      return designer.getActions().map((a) => a.getId());
    },
    canExecute(id, args) {
      return designer.canExecuteAction(id, args);
    },
    execute(id, args) {
      return designer.executeAction(id, args);
    },
    toolNames() {
      const tm = designer.getToolManager();
      const names = [];
      for (let i = 0; i < tm.getToolCount(); i++) names.push(toolName(tm.getTool(i)));
      return names;
    },
    activateTool(name) {
      const tm = designer.getToolManager();
      for (let i = 0; i < tm.getToolCount(); i++) {
        const tool = tm.getTool(i);
        if (toolName(tool) === name) {
          tm.activateTool(tool);
          return true;
        }
      }
      return false;
    },
    activeTool() {
      return toolName(designer.getToolManager().getActiveTool());
    },
    selection() {
      return doc().getEditor().getSelection() || [];
    },
    setting(key) {
      return designer.getSetting(key);
    },
    setSetting(key, value) {
      designer.setSetting(key, value);
    },
    /**
     * The type id (GObject.getTypeId) of every class reachable from G,
     * including nested classes such as GStylable.FillPaintLayer, keyed by
     * their G path. The ids are saved in documents (`_sdf`), so the new
     * engine must use the same numbers.
     */
    typeIds() {
      const out = {};
      const seen = new Set();
      const visit = (value, name, depth) => {
        if (typeof value !== "function" || seen.has(value) || depth > 2) return;
        seen.add(value);
        if (
          value.prototype &&
          Object.prototype.hasOwnProperty.call(value.prototype, "__gtype_id__")
        ) {
          out[name] = value.prototype.__gtype_id__;
        }
        for (const key of Object.keys(value)) {
          if (/^[A-Z]/.test(key)) visit(value[key], `${name}.${key}`, depth + 1);
        }
      };
      for (const key of Object.keys(G).sort()) visit(G[key], key, 0);
      return out;
    },
  };
  window.__parity = { G, app };
  return Object.keys(G).length;
})();
