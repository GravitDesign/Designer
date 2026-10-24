// Injected into the old app's page after gDesigner is ready. Defines
// window.__parity with the same shape the new app defines in its parity
// build (see src/parity/bridge.ts), so a scenario can run unchanged in
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
  const readStorage = () => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      out[key] = localStorage.getItem(key);
    }
    return out;
  };
  // State right after boot, which resetState() returns to.
  const boot = {
    storage: readStorage(),
    settings: JSON.parse(JSON.stringify(designer._settings || {})),
    tool: toolName(designer.getToolManager().getActiveTool()),
  };
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
    /**
     * Returns a shared page to the state right after boot, then opens one
     * empty document: closes every document without prompting, empties
     * the internal clipboard, restores the settings and localStorage and
     * selects the boot tool. Returns what still differs from boot (empty
     * when the reset worked); the harness then replaces the page.
     */
    resetState() {
      for (const d of designer.getDocuments().slice()) designer.removeDocument(d, null, true);
      designer._clipboardMimeTypes = {};
      // The live settings are designer._settings; getSetting falls back to
      // the caller's default when a key is missing, so keys that weren't
      // there at boot are deleted, not set to undefined.
      const settings = designer._settings;
      for (const key of Object.keys(settings)) {
        if (!(key in boot.settings)) Reflect.deleteProperty(settings, key);
      }
      for (const [key, value] of Object.entries(boot.settings)) {
        if (JSON.stringify(settings[key]) !== JSON.stringify(value))
          designer.setSetting(key, value);
      }
      const storage = readStorage();
      for (const key of Object.keys(storage)) {
        if (!(key in boot.storage)) localStorage.removeItem(key);
      }
      for (const [key, value] of Object.entries(boot.storage)) {
        if (storage[key] !== value) localStorage.setItem(key, value);
      }
      app.activateTool(boot.tool);
      app.newInfiniteDocument();
      const left = [];
      const after = readStorage();
      for (const key of new Set([...Object.keys(after), ...Object.keys(boot.storage)])) {
        if (after[key] !== boot.storage[key]) left.push(`localStorage ${key}`);
      }
      if (app.activeTool() !== boot.tool) left.push(`tool ${app.activeTool()}`);
      if (designer.getDocuments().length !== 1) {
        left.push(`${designer.getDocuments().length} documents`);
      }
      return left;
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
