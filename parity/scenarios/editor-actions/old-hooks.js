// Helpers for the editor-actions scenarios, injected into the old app after
// old-harness.js. The new app provides the same functions (see contract.ts).
// Plain JavaScript on purpose: it is evaluated in the page as is.
/* global window */
(() => {
  const P = window.__parity;
  if (!P || P.app.editorActions) return;
  const designer = P.app.designer;
  const action = (id) => designer.getAction(id);
  const titleText = (t) => {
    if (t == null) return null;
    if (typeof t === "string") return t;
    try {
      return P.G.GLocale.get(t);
    } catch {
      return String(t);
    }
  };
  // Module 53 is the editor namespace (GElementEditor, GPathEditor, ...).
  const editorNs = () => P.app.require(53);
  let bootSidebars = null;
  P.app.editorActions = {
    /**
     * Puts the sidebars back the way they were when the page booted. The
     * shared page reset does not restore them, and their width changes
     * where an infinite-canvas paste lands (the centre of the view).
     */
    resetSidebars() {
      if (bootSidebars) P.app.editorActions.setSidebars(bootSidebars);
    },
    /** Selects anchor points of a path (by index) as the path editor's part selection. */
    selectAnchorPoints(path, indices) {
      const Ed = editorNs();
      const editor = Ed.GElementEditor.getEditor(path);
      if (!editor) return false;
      const anchors = path.getAnchorPoints();
      editor.updatePartSelection(
        false,
        indices.map((i) => ({
          type: Ed.GPathEditor.PartType.Point,
          point: anchors.getChildByIndex(i),
        })),
      );
      return true;
    },
    /**
     * Edit mode of the active tool when it is the pointer or subselect
     * tool ("Select", "Transform" or "Edit"), otherwise null. Double
     * clicking an image switches it to "Edit" (crop); Confirm Cropping
     * switches back to "Select".
     */
    toolEditMode() {
      const tool = designer.getToolManager().getActiveTool();
      const modes = editorNs().GSelectTool.EditMode;
      if (!(tool instanceof editorNs().GSelectTool)) return null;
      const mode = tool.getEditMode();
      return Object.keys(modes).find((k) => modes[k] === mode) || String(mode);
    },
    /** Whether the transform box (pointer tool in Transform mode) is open on the selection. */
    transformBoxActive() {
      const doc = designer.getActiveDocument();
      const editor = doc && editorNs().GElementEditor.getEditor(doc.getScene());
      return !!editor && !!editor.isTransformBoxActive();
    },
    /**
     * Sets a GEditorOptions entry. The app fills these from its build
     * configuration (propertiesExcludedFromCopying is null in this build),
     * so a scenario sets one to check the code that reads it.
     */
    setEditorOption(name, value) {
      editorNs().GEditorOptions[name] = value;
    },
    /** Value of a GEditorOptions entry (e.g. propertiesExcludedFromCopying). */
    editorOption(name) {
      const v = editorNs().GEditorOptions[name];
      return v === undefined ? "<undefined>" : v;
    },
    /** Closes every document except the active one, without asking. */
    closeOtherDocuments() {
      const active = designer.getActiveDocument();
      // The third argument closes the windows without the unsaved-changes prompt.
      for (const d of designer.getDocuments().slice()) {
        if (d !== active) designer.removeDocument(d, null, true);
      }
      // Removing documents can leave the remaining view unpainted until the
      // window is laid out again.
      designer.relayout();
      const w = designer.getWindows().getActiveWindow();
      if (w) w.getView().invalidate(null, true);
    },
    /** Restores the state returned by sidebars(). */
    setSidebars(state) {
      const l = designer.getLeftSidebars();
      const r = designer.getRightSidebars();
      l.setActiveSidebar(state.left);
      r.setActiveSidebar(state.right);
      designer.setPartVisible(l.getSidebarsPart(), state.leftVisible);
      designer.setPartVisible(r.getSidebarsPart(), state.rightVisible);
    },
    /** State of an action as the menu would show it; null when not registered. */
    actionInfo(id) {
      const a = action(id);
      if (!a) return null;
      let checked = null;
      if (a.isCheckable()) checked = !!a.isChecked();
      // Category path from the top-level menu down, e.g. ["Edit", "Paste"].
      const category = [];
      for (let c = a.getCategory(); c; c = c.parent) category.unshift(titleText(c.label));
      return {
        title: titleText(a.getTitle()),
        fullTitle: titleText(a.getFullTitle()),
        info: titleText(a.getInfo()),
        icon: a.getIcon() || null,
        category,
        group: a.getGroup() || null,
        pro: !!a.isPro(),
        available: !!a.isAvailable(),
        visible: !!a.isVisible(),
        enabled: !!designer.canExecuteAction(id),
        checkable: !!a.isCheckable(),
        checked,
        global: !!a.isShortcutGlobal(),
        // Windows/Linux rendering of the shortcut, e.g. "Ctrl+Shift+Z".
        shortcut: a.getShortcutHint() || null,
        additional: (a.getAdditionalShortcuts() || []).map((s) =>
          // Module 31 is GAction; its static helper renders a key array.
          P.app.require(31).getActionShortcutHint(Array.isArray(s) ? s : [s]),
        ),
      };
    },
    /** MIME types currently in the app's internal clipboard. */
    clipboardTypes() {
      return (designer.getClipboardMimeTypes() || []).slice().sort();
    },
    clipboardGet(mime) {
      const v = designer.getClipboardContent(mime);
      return v == null ? null : v;
    },
    clipboardSet(mime, data) {
      designer.setClipboardContent(mime, data);
    },
    /** Empties the internal clipboard. */
    clipboardClear() {
      designer._clipboardMimeTypes = {};
    },
    /** Number of open documents and the index of the active one. */
    documents() {
      const docs = designer.getDocuments();
      return { count: docs.length, activeIndex: docs.indexOf(designer.getActiveDocument()) };
    },
    /** Windows (tabs) of all documents in tab order and the active one. */
    windows() {
      const ws = designer.getWindows();
      const active = ws.getActiveWindow();
      const list = [];
      for (const d of designer.getDocuments()) {
        for (const w of d.getWindows()) list.push(w);
      }
      return {
        count: list.length,
        activeIndex: list.indexOf(active),
        activeDocumentIndex: active ? designer.getDocuments().indexOf(active.getDocument()) : -1,
      };
    },
    /** Active left/right sidebar ids ("outline", "inspector", ...) and part visibility. */
    sidebars() {
      const l = designer.getLeftSidebars();
      const r = designer.getRightSidebars();
      return {
        left: l.getActiveSidebar() || null,
        right: r.getActiveSidebar() || null,
        leftVisible: !!designer.isPartVisible(l.getSidebarsPart()),
        rightVisible: !!designer.isPartVisible(r.getSidebarsPart()),
      };
    },
  };
  bootSidebars = P.app.editorActions.sidebars();
})();
