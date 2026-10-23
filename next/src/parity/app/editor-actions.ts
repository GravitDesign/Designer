/**
 * The new app's side of parity/scenarios/editor-actions/contract.ts
 * (window.__parity.app.editorActions): thin wrappers over the designer,
 * doing what parity/scenarios/editor-actions/old-hooks.js does with the
 * old gDesigner.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import type { Node } from "../../engine/scene/node.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { PathEditor } from "../../editor/element-editors/path-editor.ts";
import { SelectTool } from "../../editor/tools/select-tool.ts";
import { Action } from "../../app/actions/action.ts";
import type { Category } from "../../app/actions/category.ts";
import { designer } from "../../app/shell/globals.ts";

/** A title or label as English text (titles may be LocaleKeys). */
function titleText(title: unknown): string | null {
  if (title == null) return null;
  if (typeof title === "string") return title;
  try {
    return Locale.get(title as Parameters<typeof Locale.get>[0]) as string;
  } catch {
    return String(title);
  }
}

interface SidebarState {
  left: string | null;
  right: string | null;
  leftVisible: boolean;
  rightVisible: boolean;
}

let bootSidebars: SidebarState | null = null;

/** The designer's internal clipboard table (the old hook emptied `_clipboardMimeTypes`). */
function clipboardTable(): Record<string, unknown> {
  return (designer() as unknown as { _clipboardMimeTypes: Record<string, unknown> })
    ._clipboardMimeTypes;
}

const editorActions = {
  resetSidebars(): void {
    if (bootSidebars) editorActions.setSidebars(bootSidebars);
  },

  selectAnchorPoints(
    path: Node & { getAnchorPoints(): { getChildByIndex(i: number): unknown } },
    indices: number[],
  ): boolean {
    const editor = ElementEditor.getEditor(path) as unknown as {
      updatePartSelection(toggle: boolean, parts: unknown[]): void;
    } | null;
    if (!editor) return false;
    const anchors = path.getAnchorPoints();
    editor.updatePartSelection(
      false,
      indices.map((i) => ({ type: PathEditor.PartType.Point, point: anchors.getChildByIndex(i) })),
    );
    return true;
  },

  toolEditMode(): string | null {
    const tool = designer().getToolManager().getActiveTool();
    if (!(tool instanceof SelectTool)) return null;
    const modes = SelectTool.EditMode as Record<string, unknown>;
    const mode = (tool as unknown as { getEditMode(): unknown }).getEditMode();
    return Object.keys(modes).find((key) => modes[key] === mode) || String(mode);
  },

  transformBoxActive(): boolean {
    const document = designer().getActiveDocument();
    const editor =
      document &&
      (ElementEditor.getEditor(document.getScene() as unknown as Node) as unknown as {
        isTransformBoxActive(): boolean;
      } | null);
    return !!editor && !!editor.isTransformBoxActive();
  },

  setEditorOption(name: string, value: unknown): void {
    (EditorOptions as unknown as Record<string, unknown>)[name] = value;
  },

  editorOption(name: string): unknown {
    const value = (EditorOptions as unknown as Record<string, unknown>)[name];
    return value === undefined ? "<undefined>" : value;
  },

  closeOtherDocuments(): void {
    const app = designer();
    const active = app.getActiveDocument();
    for (const document of app.getDocuments().slice()) {
      if (document !== active) app.removeDocument(document, null, true);
    }
    app.relayout();
    const window = app.getWindows().getActiveWindow();
    if (window) {
      const view = window.getView() as unknown as { invalidate(area: unknown, now: boolean): void };
      view.invalidate(null, true);
    }
  },

  setSidebars(state: SidebarState): void {
    const app = designer();
    const left = app.getLeftSidebars();
    const right = app.getRightSidebars();
    left.setActiveSidebar(state.left);
    right.setActiveSidebar(state.right);
    app.setPartVisible(left.getSidebarsPart(), state.leftVisible);
    app.setPartVisible(right.getSidebarsPart(), state.rightVisible);
  },

  actionInfo(id: string): unknown {
    const app = designer();
    const action = app.getAction(id);
    if (!action) return null;
    let checked: boolean | null = null;
    if (action.isCheckable()) checked = !!action.isChecked();
    const category: (string | null)[] = [];
    for (let c: Category | null = action.getCategory(); c; c = c.parent) {
      category.unshift(titleText(c.label));
    }
    return {
      title: titleText(action.getTitle()),
      fullTitle: titleText(action.getFullTitle()),
      info: titleText(action.getInfo()),
      icon: action.getIcon() || null,
      category,
      group: action.getGroup() || null,
      pro: !!action.isPro(),
      available: !!action.isAvailable(),
      visible: !!action.isVisible(),
      enabled: !!app.canExecuteAction(id),
      checkable: !!action.isCheckable(),
      checked,
      global: !!action.isShortcutGlobal(),
      shortcut: action.getShortcutHint() || null,
      additional: (action.getAdditionalShortcuts() || []).map((shortcut) =>
        Action.getActionShortcutHint(Array.isArray(shortcut) ? shortcut : [shortcut as never]),
      ),
    };
  },

  clipboardTypes(): string[] {
    return (designer().getClipboardMimeTypes() || []).slice().sort();
  },

  clipboardGet(mime: string): unknown {
    const value = designer().getClipboardContent(mime);
    return value == null ? null : value;
  },

  clipboardSet(mime: string, data: string | null): void {
    designer().setClipboardContent(mime, data);
  },

  clipboardClear(): void {
    const table = clipboardTable();
    for (const key of Object.keys(table)) Reflect.deleteProperty(table, key);
  },

  documents(): { count: number; activeIndex: number } {
    const app = designer();
    const documents = app.getDocuments();
    return {
      count: documents.length,
      activeIndex: documents.indexOf(app.getActiveDocument() as (typeof documents)[number]),
    };
  },

  windows(): { count: number; activeIndex: number; activeDocumentIndex: number } {
    const app = designer();
    const active = app.getWindows().getActiveWindow();
    const list: unknown[] = [];
    for (const document of app.getDocuments()) {
      for (const window of document.getWindows()) list.push(window);
    }
    const documents = app.getDocuments() as unknown[];
    return {
      count: list.length,
      activeIndex: list.indexOf(active),
      activeDocumentIndex: active ? documents.indexOf(active.getDocument()) : -1,
    };
  },

  sidebars(): SidebarState {
    const app = designer();
    const left = app.getLeftSidebars();
    const right = app.getRightSidebars();
    const state: SidebarState = {
      left: left.getActiveSidebar() || null,
      right: right.getActiveSidebar() || null,
      leftVisible: !!app.isPartVisible(left.getSidebarsPart()),
      rightVisible: !!app.isPartVisible(right.getSidebarsPart()),
    };
    return state;
  },
};

// The bridge loads the hooks once the app has booted: these are the
// sidebars of a freshly booted page (old-hooks.js records them the same way).
try {
  bootSidebars = editorActions.sidebars();
} catch {
  // Loaded without a designer (unit tests of other hooks).
}

export const editorActionsHooks = { editorActions };
