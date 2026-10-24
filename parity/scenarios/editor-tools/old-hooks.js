/* global window, document */
// Editor-tools hooks for the old app (window.__parity.app.editorTools).
// The TypeScript contract is in contract.ts; the new app must provide the
// same functions with the same results. Plain JavaScript on purpose: it is
// evaluated in the page as is.
(() => {
  const parity = window.__parity;
  if (!parity || parity.app.editorTools) return;
  const app = parity.app;
  const G = parity.G;

  // Stable description of a node: "<index>/<index>:<nodeName>" from the scene root.
  const nodePath = (node) => {
    const parts = [];
    let n = node;
    while (n && n.getParent && n.getParent()) {
      const parent = n.getParent();
      parts.unshift(parent.getIndexOfChild(n));
      n = parent;
    }
    return parts.join("/") + ":" + node.getNodeName();
  };

  // Part ids are plain values or objects that point at scene nodes (anchor
  // points); nodes are replaced by their index in their parent.
  // Part ids of several editors are random uuids stored as static class
  // fields (GPolygonEditor.INSIDE_PART_ID ...). Replace such a string by the
  // field name, found on the editor's class chain.
  const staticName = (ed, value) => {
    for (let proto = ed && Object.getPrototypeOf(ed); proto; proto = Object.getPrototypeOf(proto)) {
      const ctor = proto.constructor;
      if (!ctor) continue;
      for (const key of Object.keys(ctor)) {
        if (ctor[key] === value) return key;
      }
      // Ids kept on a mixin namespace of the class, e.g.
      // GBlockEditor.LabelHolder.LABEL_PART_ID (page and symbol labels).
      for (const key of Object.keys(ctor)) {
        const inner = ctor[key];
        if (!inner || (typeof inner !== "function" && typeof inner !== "object")) continue;
        for (const sub of Object.keys(inner)) {
          if (inner[sub] === value) return `${key}.${sub}`;
        }
      }
    }
    return value;
  };

  const plainPart = (part, depth, ed) => {
    if (part === null || part === undefined) return null;
    if (typeof part === "string") return staticName(ed, part);
    if (typeof part !== "object") return part;
    if (depth > 2) return "<deep>";
    if (G.GNode && part instanceof G.GNode) {
      const parent = part.getParent && part.getParent();
      return { node: part.getNodeName(), index: parent ? parent.getIndexOfChild(part) : -1 };
    }
    if (Array.isArray(part)) return part.map((p) => plainPart(p, depth + 1, ed));
    const out = {};
    for (const key of Object.keys(part).sort()) {
      const value = part[key];
      if (typeof value === "function") continue;
      out[key] = plainPart(value, depth + 1, ed);
    }
    return out;
  };

  const editorOf = (node) => node && node.__editor__;

  const selectedAnchors = (node) => {
    if (!node.getAnchorPoints) return undefined;
    const out = [];
    const points = node.getAnchorPoints();
    let i = 0;
    for (let p = points.getFirstChild(); p; p = p.getNext(), i++) {
      if (p.hasFlag(G.GNode.Flag.Selected)) out.push(i);
    }
    return out;
  };

  // Only for worldToView, which maps input coordinates and is never
  // recorded; everything a probe records keeps the engine's own numbers.
  const round = (v) => Math.round(v * 1e6) / 1e6;

  // The outline the editor paints for a preview: the element's vertices
  // as [command, x, y] (GVertex numbering of commands), at most 400 of
  // them. Coordinates are rounded to 1e-9: a preview built from the
  // pointer moves came out a last bit apart between runs
  // (204.04274849909712 vs 204.0427484990971 in subselect/drag-handle).
  const outline = (el) => {
    if (!el || !el.rewindVertices || !el.rewindVertices(0)) return null;
    const v = new G.GVertex();
    const out = [];
    const r9 = (n) => Math.round(n * 1e9) / 1e9;
    while (out.length < 400 && el.readVertex(v)) out.push([v.command, r9(v.x), r9(v.y)]);
    return out;
  };

  // Every ToolChangedEvent of the tool manager since the last
  // toolChanges() call (the hooks are installed once per page).
  const toolChangeLog = [];
  {
    const tm = app.designer.getToolManager();
    const name = (t) => (t ? String(t).replace(/^\[Object (.*)\]$/, "$1") : null);
    tm.addEventListener(tm.constructor.ToolChangedEvent, (e) => {
      toolChangeLog.push({ previous: name(e.previousTool), next: name(e.newTool), light: e.light });
    });
  }

  app.editorTools = {
    toolChanges() {
      return toolChangeLog.splice(0, toolChangeLog.length);
    },
    prepareView(zoom, originX, originY) {
      // The renderer caches a tile when painting it took longer than 50 ms
      // of wall-clock time (GRendererConfig, module 166), and a cached tile
      // can come back with other edge antialiasing. Under load that made
      // shots differ from run to run, so time-based caching is turned off.
      app.require(166).CACHE_WHEN_DRAWING_LONGER_THAN = Infinity;
      const view = app.view();
      view.transform(-originX, -originY, zoom);
      view.invalidate();
    },
    worldToView() {
      return app.view().getWorldTransform().getMatrix().map(round);
    },
    state() {
      const editor = app.editor();
      const tm = app.designer.getToolManager();
      const view = app.view();
      const selection = editor.getSelection() || [];
      const tool = tm.getActiveTool();
      const out = {
        tool: app.activeTool(),
        temporaryTool: tm.getTemporaryActiveTool()
          ? String(tm.getTemporaryActiveTool()).replace(/^\[Object (.*)\]$/, "$1")
          : null,
        selection: selection.map(nodePath),
        parts: selection.map((n) => {
          const ed = editorOf(n);
          const ps = ed && ed.getPartSelection ? ed.getPartSelection() : null;
          return ps ? ps.map((p) => plainPart(p, 0, ed)) : null;
        }),
        anchors: selection.map((n) => {
          const a = selectedAnchors(n);
          return a === undefined ? null : a;
        }),
        preview: selection.map((n) => {
          // What the element editor paints right now: the preview clone
          // during a drag, else the element itself.
          const ed = editorOf(n);
          const el = ed && ed.getPaintElement ? ed.getPaintElement() : n;
          const bbox = el && el.getGeometryBBox ? el.getGeometryBBox() : null;
          const box = bbox ? [bbox.getX(), bbox.getY(), bbox.getWidth(), bbox.getHeight()] : null;
          const trf = el && el.getProperty ? el.getProperty("trf") : null;
          const isPreview = el !== n;
          const out = { box, trf: trf ? trf.getMatrix() : null, isPreview };
          if (isPreview) out.outline = outline(el);
          return out;
        }),
        selectEditMode: tool && typeof tool.getEditMode === "function" ? tool.getEditMode() : null,
        inlineEditing: editor.isInlineEditing(),
        textSelection: null,
        zoom: view.getZoom(),
        scroll: [view.getScrollX(), view.getScrollY()],
        undo: editor.hasUndoState() ? editor.getUndoStateName() : null,
      };
      if (editor.isInlineEditing()) {
        const node = editor._currentInlineEditorNode;
        const core = node && node.getTLCore && node.getTLCore();
        const sel = core && core.getSelection && core.getSelection();
        if (sel) out.textSelection = [sel.start, sel.end];
      }
      return out;
    },
    document() {
      // The whole scene, styles included. lmd (save time) is dropped; the
      // shared normalizer renames the random ids.
      const scene = JSON.parse(app.serialize({ save: true }));
      delete scene.lmd;
      return scene;
    },
    activateToolAt(index) {
      // For tools that share a name with another one (the connector tool
      // reports "GPenTool"), so activateTool(name) can't reach them.
      // Registration order is recorded by toolmgr/registry.
      const tm = app.designer.getToolManager();
      if (index < 0 || index >= tm.getToolCount()) return false;
      tm.activateTool(tm.getTool(index));
      return tm.getActiveTool() === tm.getTool(index);
    },
    toolRegistry() {
      // Every tool in the tool manager: its name, default cursor and the
      // indices of the tools whose class it is an instance of (itself, and
      // e.g. the pen for the connector tool, which extends it and reuses
      // its name). Two entries sharing a class list each other.
      const tm = app.designer.getToolManager();
      const tools = [];
      for (let i = 0; i < tm.getToolCount(); i++) tools.push(tm.getTool(i));
      return tools.map((tool, index) => ({
        index,
        name: String(tool).replace(/^\[Object (.*)\]$/, "$1"),
        cursor: tool.getCursor ? tool.getCursor() : null,
        instanceOf: tools
          .map((other, j) => (tool instanceof other.constructor ? j : -1))
          .filter((j) => j >= 0),
      }));
    },
    repaint() {
      // Full repaint of scene and editor overlay, e.g. after lazily loaded
      // handle icons arrived.
      app.view().invalidate();
    },
    fontsReady() {
      // The font family list arrives asynchronously after the app is ready;
      // until it does, text tools behave differently (no _tff, bold/italic
      // toggles skip the variant check). Also wait for pending font loads.
      const fm = app.scene().getWorkspace().getFontManager();
      const family = fm.getDefaultFont();
      const variants = fm.queryFontFamily(typeof family === "string" ? family : "Open Sans");
      return (
        document.fonts.status === "loaded" &&
        Array.isArray(variants) &&
        variants.length > 0 &&
        !fm.hasPendingFonts() &&
        !fm.hasUnresolvedFonts()
      );
    },
    toolTable() {
      // The app's tool table (gravit.tools): everything except the class.
      return window.gravit.tools.map((entry) => {
        const out = {};
        for (const key of Object.keys(entry).sort()) {
          if (key === "tool" || typeof entry[key] === "function") continue;
          out[key] = JSON.parse(JSON.stringify(entry[key]));
        }
        return out;
      });
    },
    setEditorOptions(options) {
      // GEditorOptions is module 24 of the engine bundle (not in G).
      const opts = app.require(24);
      for (const key of Object.keys(options)) opts[key] = options[key];
    },
    freezeCaret() {
      // The caret blinks every 500 ms (GTextEditor._caretUpdate compares the
      // wall clock with _nextCaretToggle). Push the next toggle out of reach
      // and make the caret visible so screenshots are stable.
      const editor = app.editor();
      const node = editor._currentInlineEditorNode;
      if (!node) return false;
      const ed = editorOf(node);
      if (ed) ed._nextCaretToggle = Number.MAX_SAFE_INTEGER;
      const core = node.getTLCore && node.getTLCore();
      if (core && !core.isCaretVisible()) core.toggleCaret();
      if (node.repaint) node.repaint(true);
      return true;
    },
  };
})();
