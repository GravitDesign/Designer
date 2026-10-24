/**
 * What GDocument uses of GDesigner, GContainer, GWindow and the dialogs of
 * later clusters. The old code reached them through the globals gDesigner
 * and gContainer and through requires of modules that are ported in later
 * clusters; here they are small structural interfaces:
 *
 * - DocumentDesigner and DocumentContainer are what Designer
 *   (app-designer-main, src/app/shell/designer.ts) and Container
 *   (app-shell-storage) provide; gDesigner() and gContainer() return the
 *   singletons from src/app/shell/globals.ts typed as these.
 * - DocumentWindow is GWindow as the document uses it. Windows writes the
 *   document's `_windows` and `_activeWindow` itself, as before.
 * - The dialogs: the message dialog (dialogs/message-dialog.ts) and the
 *   missing-fonts dialog (dialogs/missing-fonts-dialog.ts) are looked up
 *   late, as the shell does (shell/late.ts); the SVG unsupported-features
 *   dialog registers itself through registerDocumentDialogs. Without the
 *   app modules (unit tests) a message goes to the console.
 */
import type { Node } from "../../engine/scene/node.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import type { EditorWorkspace } from "../../editor/editor-workspace.ts";
import type { StorageItem } from "../storage/storage.ts";
import { containerOrNull, designer } from "../shell/globals.ts";
import { lateExport } from "../shell/late.ts";

/** The view of a window (GEditorWidget) as the document uses it. */
export interface DocumentView {
  getViewConfiguration(): { paintMode: unknown; multiPageView?: unknown };
  invalidate(): void;
}

/** GWindow as the document uses it. */
export interface DocumentWindow {
  getView(): DocumentView | null;
  centerAndZoom(): void;
  /** Shows the progress overlay; the returned element holds its <progress>. */
  activateProgress(message: string, cancelable?: boolean): Element | null;
  deactivateProgress(): void;
  /** Shows the Cancel button of the loading overlay, which calls `cancel`. */
  activateCancelLoading(cancel: () => void): void;
}

/** GDesigner as the document uses it. */
export interface DocumentDesigner {
  hasEventListeners(eventClass: abstract new (...args: never[]) => unknown): boolean;
  trigger(event: object): void;
  createScene(noPage?: boolean): Scene;
  getWorkspace(): EditorWorkspace;
  getActiveDocument(): unknown;
  activateDocument(document: never, fromWindows?: boolean): void;
  getWindows(): { getActiveWindow(): DocumentWindow | null };
  getSetting(key: string, defaultValue?: unknown): unknown;
  /** Not every designer build has recent files yet; missing means nothing is recorded. */
  addToRecentFiles?(item: StorageItem): void;
}

/** The runtimes GContainer.getRuntime reports (module 85). */
export const Runtime = {
  Browser: "browser",
  PWA: "pwa",
  Electron: "electron",
  IPad: "ipad",
} as const;

/** GContainer as the document uses it. */
export interface DocumentContainer {
  getRuntime(): string;
  verifyEnoughMemoryToSave(document: unknown): void;
  /** The Electron system fonts provider class, or null. */
  getSystemFontsProvider(): unknown;
}

/** The old global gDesigner, as the document uses it. */
export function gDesigner(): DocumentDesigner {
  return designer() as unknown as DocumentDesigner;
}

/** The old global gContainer, or null before the container exists. */
export function gContainer(): DocumentContainer | null {
  return containerOrNull() as unknown as DocumentContainer | null;
}

/** The dialogs later clusters provide. */
export interface DocumentDialogs {
  /** new GMessageDialog(text, detail).open() (module 219). */
  message(text: string, detail?: unknown): void;
  /**
   * new GMissingFontsDialog(document, fonts, null, done).open() (module
   * 841); `done` gets the replaced fonts, or null when the user kept them.
   */
  missingFonts(document: unknown, fonts: unknown[], done?: (replaced: unknown) => void): void;
  /** The SVG export's unsupported-features dialog (module 1238). */
  unsupportedFeatures(features: unknown[]): void;
}

type MessageDialogClass = new (text: string, detail?: unknown) => { open(): void };
type MissingFontsDialogClass = new (
  document: unknown,
  fonts: unknown[],
  enablers: null,
  done?: (replaced: unknown) => void,
) => { open(): void };

const fallbackDialogs: DocumentDialogs = {
  message(text, detail) {
    const MessageDialog = lateExport<MessageDialogClass>(
      "dialogs/message-dialog.ts",
      "MessageDialog",
    );
    // The old dialog set its text with jQuery .html(), which shows nothing
    // for a value that is not a string or a node: an import error object
    // (a PDF exception) gave an empty dialog. See "An import error shows an
    // empty message dialog" in QUESTIONS.md.
    if (MessageDialog) new MessageDialog(typeof text === "string" ? text : "", detail).open();
    else console.warn("message dialog:", text);
  },
  missingFonts(document, fonts, done) {
    const MissingFontsDialog = lateExport<MissingFontsDialogClass>(
      "dialogs/missing-fonts-dialog.ts",
      "MissingFontsDialog",
    );
    if (MissingFontsDialog) new MissingFontsDialog(document, fonts, null, done).open();
    else console.warn("missing fonts:", fonts);
  },
  unsupportedFeatures(features) {
    console.warn("unsupported SVG features:", features);
  },
};

let dialogs: Partial<DocumentDialogs> = {};

/** The dialog clusters register their dialogs here when they load. */
export function registerDocumentDialogs(value: Partial<DocumentDialogs>): void {
  dialogs = { ...dialogs, ...value };
}

export function documentDialogs(): DocumentDialogs {
  return { ...fallbackDialogs, ...dialogs };
}

/** What insertElement and placeOrImport insert (an element of the scene). */
export type InsertableNode = Node;
