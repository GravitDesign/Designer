/**
 * What the action classes use of GDesigner, GDocument and GContainer.
 *
 * The old actions reached these through the globals gDesigner and
 * gContainer. The app shell, GDocument and the container are ported in
 * parallel (app-designer-main, app-config-document, app-shell-storage), so
 * this file holds the smallest structural interface the actions need of
 * GDesigner and GDocument; gDesigner() is shell/globals.ts designer()
 * seen through it. Only the members the actions call are listed.
 */
import type { Node } from "../../engine/scene/node.ts";
import type { PropertiesApi } from "../../engine/scene/node-properties.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Transform } from "../../engine/math/transform.ts";
import type { Editor } from "../../editor/editor.ts";
import type { EditorWorkspace } from "../../editor/editor-workspace.ts";
import type { ToolManager } from "../../editor/tools/tool-manager.ts";
import type { Action } from "./action.ts";
import type { ClipboardBridge } from "../clipboard/clipboard-bridge.ts";
import type { Container } from "../shell/container.ts";
import { container, designer as appDesigner } from "../shell/globals.ts";

/** A node with the properties mixin (getProperty, setProperty, ...). */
export type PropertiesNode = Node & PropertiesApi;

/** `node` as a node with properties, where the old code just called getProperty. */
export function props(node: Node): PropertiesNode {
  return node as PropertiesNode;
}

/** The view of a window (GEditorWidget) as the actions use it. */
export interface ActionView {
  focus(): void;
  getViewTransform(page: Node | null): Transform;
  getViewBox(): Rect;
  getViewConfiguration(): { multiPageView?: unknown };
}

/** A document window (GWindow). */
export interface ActionWindow {
  getView(): ActionView;
  centerAndZoom(): void;
}

/** The style layers the properties panels show (GDocument.getActiveStylesList). */
export interface ActiveStylesList {
  Fill?: unknown;
  Border?: unknown;
  Effect?: unknown;
}

/** A storage item (the old GStorage Item). */
export interface ActionStorageItem {
  getId(): string;
  getName(): string;
  getExtension(): string | null;
  getUniqueId(): string;
  getStorage(): ActionStorage;
}

/** A storage (the old GStorage). */
export interface ActionStorage {
  canSave(): boolean;
  canPromptSave(): boolean;
  canPromptOpen(): boolean;
  canDownload(): boolean;
  openPrompt(
    fileTypes: unknown[],
    done: (item: ActionStorageItem) => void,
    multiple: boolean,
  ): void;
  savePrompt(
    name: string,
    fileTypes: unknown[],
    done: (item: ActionStorageItem) => void | Promise<void>,
    cancel: () => void,
  ): void;
  download(name: string, done: (item: ActionStorageItem | null) => void): void;
}

/** Save options passed to GDocument.store. */
export type SaveOptions = Record<string, unknown>;

/** Called when saving finished, failed or was cancelled. */
export type SaveCallback = (result?: { documentStatus?: number }) => void;

/** The part of GDocument the actions use. */
export interface ActionDocument {
  getEditor(): Editor;
  getScene(): Scene;
  getTitle(): string;
  getActiveWindow(): ActionWindow | null;
  getActiveStylesList(): ActiveStylesList;
  getStorageItem(): ActionStorageItem | null;
  setStorageItem(item: ActionStorageItem): void;
  getStorage(): ActionStorage | null;
  isNew(): boolean;
  isModified(): boolean;
  isEditingEnabled(): boolean;
  isSynchronizing(): boolean;
  /**
   * The old GDocument had no save(); only Save All called it, and that
   * action is never available. Kept in the type so the dead call reads as before.
   */
  save(): void;
  store(
    item: ActionStorageItem,
    done?: SaveCallback | null,
    error?: ((message?: string) => void) | null,
    options?: SaveOptions,
  ): void;
  placeOrImport(
    source: unknown,
    position?: unknown,
    noTransaction?: boolean,
    ignoreName?: boolean,
    callback?: (elements: Node[], isText?: boolean) => boolean,
  ): void;
  insertElement(element: Node, center?: boolean, fit?: boolean, noTransaction?: boolean): void;
  hasPagesWithInfiniteEmptyCanvas(): boolean;
  /**
   * The nodes a paste or copy may use; marketplace ("commercial product")
   * files restricted copying in the old app.
   */
  filterUnrestrictedCommercialFileElements(nodes: Node[]): Node[];
  isCommercialProductFile(): boolean;
  restrictElements(nodes: Node[]): Node[];
  updateSaveOptionsLastModifiedDate(options: SaveOptions): SaveOptions;
}

/** GDesigner.getMouseOverContext: the properties panel under the mouse. */
export interface MouseOverContext {
  context?: unknown;
  contextCallback?: ((event: unknown) => void) | null;
  prevEvt?: unknown;
}

/**
 * The feature switches of GApplicationManager (module 1569) the actions
 * check. The manager held the role and licence state of shared cloud
 * files and is dropped; the local app has everything enabled, as the old
 * one had for a local file.
 */
export interface ApplicationManager {
  isCopyPasteEnabled(): boolean;
  isEditingEnabled(): boolean;
  isExportEnabled(): boolean;
  isSavingAsEnabled(): boolean;
  isFileFormatEnabledForSaveAs(format: { ext: string }): boolean;
  isOpenFilesFromLocalEnabled(): boolean;
  isImportResourcesEnabled(): boolean;
  isCreatingNewDocumentEnabled(): boolean;
}

const LOCAL_APPLICATION_MANAGER: ApplicationManager = {
  isCopyPasteEnabled: () => true,
  isEditingEnabled: () => true,
  isExportEnabled: () => true,
  isSavingAsEnabled: () => true,
  isFileFormatEnabledForSaveAs: () => true,
  isOpenFilesFromLocalEnabled: () => true,
  isImportResourcesEnabled: () => true,
  isCreatingNewDocumentEnabled: () => true,
};

/** gDesigner.getApplicationManager() of the local app. */
export function applicationManager(): ApplicationManager {
  return LOCAL_APPLICATION_MANAGER;
}

/** The sidebars on one side (GSidebars). */
export interface ActionSidebars {
  getActiveSidebar(): string | null;
  getSidebar(id: string): unknown;
}

/** GDesigner as the actions use it. */
export interface ActionDesigner {
  getAction(id: string): Action | null;
  executeAction(id: string, args?: unknown[], source?: string, force?: boolean): unknown;
  canExecuteAction(id: string, args?: unknown[], source?: string, force?: boolean): boolean;
  getActiveDocument(): ActionDocument | null;
  getDocuments(): readonly ActionDocument[];
  addDocument(document: ActionDocument): void;
  createScene(): Scene;
  openDocument(item: ActionStorageItem): void;
  openNewDocumentDialog(options: { closable: boolean; defaultOption: string }): void;
  getWindows(): { getActiveWindow(): ActionWindow | null } | null;
  getLeftSidebars(): ActionSidebars;
  getRightSidebars(): ActionSidebars;
  getToolManager(): ToolManager;
  getPaste(): ClipboardBridge;
  getClipboardContent(mimeType: string): string | null | undefined;
  setClipboardContent(mimeType: string, content: string | null): void;
  getClipboardMimeTypes(): string[] | null;
  isTouchEnabled(): boolean;
  isTouchDevice(): boolean;
  isGravitIME(element: Element | null): boolean;
  getMouseOverContext(): MouseOverContext;
  getDefaultStorage(): ActionStorage;
  getWorkspace(): EditorWorkspace | null;
  getCursorManager(): { getLastCursorPoint(): Point | null };
  /** The old Pro licence check; File > Print prints at 300 dpi with it. */
  isEnabledProFeatures(): boolean;
}

let designer: ActionDesigner | null = null;

/**
 * Lets unit tests (and, until shell/designer.ts exists, the parity
 * bridge) give the actions a designer.
 */
export function setActionDesigner(value: ActionDesigner | null): void {
  designer = value;
}

/** The old global gDesigner. */
export function gDesigner(): ActionDesigner {
  if (designer) return designer;
  return appDesigner() as unknown as ActionDesigner;
}

/** The old global gContainer. */
export function gContainer(): Container {
  return container();
}

/**
 * gDesigner.getActiveDocument() where the old code assumed there is one
 * (isEnabled checked it before execute ran).
 */
export function activeDocument(): ActionDocument {
  return gDesigner().getActiveDocument() as ActionDocument;
}

/** The active window of the designer, or null (no window, or no windows part yet). */
export function activeWindow(): ActionWindow | null {
  const windows = gDesigner().getWindows();
  return windows ? windows.getActiveWindow() : null;
}

/** A node's parent where the old code knew it had one. */
export function parentOf(node: Node): { removeChild(child: Node): void } {
  return node.getParent() as unknown as { removeChild(child: Node): void };
}

/** GContainer as the actions use it (shell/container.ts). */
export type ActionContainer = Container;

/**
 * The shell's hook at boot (bootstrap.ts connectHosts). The container
 * comes from shell/globals.ts, so only the designer is kept.
 */
export function setActionHost(host: {
  designer: ActionDesigner;
  container: ActionContainer;
}): void {
  setActionDesigner(host.designer);
}
