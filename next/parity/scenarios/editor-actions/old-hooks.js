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
  P.app.editorActions = {
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
    /** Turns image crop mode on or off for a selected image (what a double click does). */
    setImageCropMode(image, on) {
      const editor = editorNs().GElementEditor.getEditor(image);
      if (!editor) return false;
      editor.setEditMode(on);
      return true;
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
      return {
        title: titleText(a.getTitle()),
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
})();
