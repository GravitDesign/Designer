/**
 * What the new app must provide as `window.__parity.app.editorActions` for
 * the editor-actions scenarios. The old app's implementation is in
 * old-hooks.js next to this file.
 *
 * The scenarios also use these documented `app` hooks: document(),
 * scene(), editor(), view(), serialize(), actionIds(), canExecute(),
 * execute(), activateTool(), activeTool(), selection(), setting(),
 * setSetting(), newInfiniteDocument().
 */

/** Menu state of a registered action. */
export interface ActionInfo {
  /** Resolved (English) title, e.g. "Undo Group Selection". */
  title: string | null;
  /** isAvailable() without a context (false hides it from the main menu). */
  available: boolean;
  /** isVisible(); false for shortcut-only actions. */
  visible: boolean;
  /** canExecute(id): available and enabled. */
  enabled: boolean;
  checkable: boolean;
  /** null unless checkable. */
  checked: boolean | null;
  /** Whether the shortcut also fires inside text inputs. */
  global: boolean;
  /** Shortcut hint on Windows/Linux, e.g. "Shift+Ctrl+Z"; null without one. */
  shortcut: string | null;
  /** Additional shortcuts rendered the same way. */
  additional: string[];
}

export interface SidebarState {
  /** Active left sidebar id ("outline", "library", "symbols") or null. */
  left: string | null;
  /** Active right sidebar id ("inspector", "annotations") or null. */
  right: string | null;
  leftVisible: boolean;
  rightVisible: boolean;
}

export interface EditorActionsHooks {
  /** Menu state of an action; null when the id is not registered. */
  actionInfo(id: string): ActionInfo | null;
  /** MIME types held by the app's internal clipboard, sorted. */
  clipboardTypes(): string[];
  /** Internal clipboard content for a MIME type, or null. */
  clipboardGet(mime: string): string | null;
  clipboardSet(mime: string, data: string | null): void;
  /** Empties the internal clipboard (no MIME types left). */
  clipboardClear(): void;
  /** Open documents: count and index of the active one. */
  documents(): { count: number; activeIndex: number };
  /** Windows (tabs) of all documents in tab order. */
  windows(): { count: number; activeIndex: number; activeDocumentIndex: number };
  /** A GEditorOptions value, or "<undefined>" when the option does not exist. */
  editorOption(name: string): unknown;
  /** Closes every document except the active one, without asking. */
  closeOtherDocuments(): void;
  sidebars(): SidebarState;
  setSidebars(state: SidebarState): void;
  /**
   * Makes the given anchor points (by index) the path editor's part
   * selection on a selected path, as clicking them with the Subselect tool
   * would.
   */
  // The path is an engine node; typed loosely like ParityHandle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectAnchorPoints(path: any, indices: number[]): boolean;
  /** Turns image crop mode on/off for a selected image, as a double click does. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setImageCropMode(image: any, on: boolean): boolean;
}
