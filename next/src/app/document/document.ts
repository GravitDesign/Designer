// Old: designer.browser.dev.js module 163 (GDocument).
/**
 * One open design: its scene and editor, its storage item, its windows and
 * its status (module 86). GDocument was a god object; here it keeps the
 * document state, the status changes and the one entry point for paste
 * and drop (placeOrImport), while the file formats live in io/:
 *
 * - .gvdesign: io/gvdesign (load.ts reads, store.ts writes, preview.ts,
 *   save-checks.ts);
 * - opening an imported file as a document: ./open-import.ts builds the
 *   scene from the importers in io/import;
 * - placing a file into the document: ./place-import.ts;
 * - the import optimiser: ./import-optimizer.ts.
 *
 * Dropped with the cloud, licence and analytics: cloud and external
 * storage items, cloud synchronisation (loadFromCloud,
 * chooseLatestDocument, storeToCloud, performCloudSave), collaboration
 * and realtime publishing, cloud annotations, version history, the
 * paywall and Pro gates (every Pro feature is enabled), the "lts"
 * environment, the reserved cloud id, owners and sharing, commercial
 * product files, the analytics and GTM events, and the missing dictionary
 * entry report. Corel (CDR) support was stubbed in the old app already:
 * hasCDR is always false and the secondary formats always fail.
 */
import { EventTarget } from "../../engine/core/event-target.ts";
import { hasMixin } from "../../engine/core/object.ts";
import { uuid } from "../../engine/core/util.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Color } from "../../engine/color/color.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Annotation } from "../../engine/scene/annotations/annotation.ts";
import { Comment } from "../../engine/scene/annotations/comment.ts";
import { Block } from "../../engine/scene/block.ts";
import { Element } from "../../engine/scene/element.ts";
import { Group } from "../../engine/scene/group.ts";
import { Item } from "../../engine/scene/item.ts";
import { Node } from "../../engine/scene/node.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import type { PropertiesNode } from "../../engine/scene/node-properties.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Symbol as SymbolNode } from "../../engine/scene/symbol.ts";
import { Gradient } from "../../engine/style/gradient.ts";
import { PaintLayer } from "../../engine/style/paint-layer.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { Text } from "../../engine/text/text.ts";
import type { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { Editor } from "../../editor/editor.ts";
import { unzipData } from "../../io/gvdesign/format.ts";
import { deserializeScene } from "../../io/gvdesign/load.ts";
import { buildPreview } from "../../io/gvdesign/preview.ts";
import { hasPagesWithInfiniteEmptyCanvas } from "../../io/gvdesign/save-checks.ts";
import { config } from "../config.ts";
import { FontAvailabilityTracker } from "../fonts/font-availability-tracker.ts";
import { FontsProviderManager } from "../fonts/font-manager.ts";
import { MissingFontTracker } from "../fonts/missing-font-tracker.ts";
import { PageClip } from "../export/page-clip.ts";
import { StorageItem } from "../storage/storage.ts";
import { isSymbolInstance, sleep } from "../util/designer-util.ts";
import { DocumentEvent } from "./document-event.ts";
import {
  documentDialogs,
  gContainer,
  gDesigner,
  Runtime,
  type DocumentWindow,
} from "./document-host.ts";
import { DocumentStatus } from "./document-status.ts";
import { DocumentStatusEvent } from "./document-status-event.ts";
import { FileTypes, type FileType } from "./file-types.ts";
import { openImportedFile, type OpenImportContext } from "./open-import.ts";
import { placeOrImport, type PlaceCallback, type PlacePosition } from "./place-import.ts";
import { storeDocument, type StoreOptions } from "./store-document.ts";

/** The native format (FILE_FORMATS' default entry). */
const DEFAULT_FORMAT = config.FILE_FORMATS.find((format) => format.default) as {
  ext: string;
  type: string;
};
/** The secondary formats (Corel); none in this build. */
const SECONDARY_FORMATS = config.FILE_FORMATS.filter((format) => format.secondary);

/** What the progress options of a load or save hold (the old `t` object). */
export interface LoadOptions {
  progress: ((percent: number) => void) | null;
  progressInfo?: (info: unknown) => void;
  filename?: string | null;
  ext?: string | null;
  checkAnnotations?: boolean;
  referer?: unknown;
  text?: string | null;
  [key: string]: unknown;
}

/** The style layers the properties panels keep per document. */
export interface ActiveStylesList {
  Fill: unknown;
  Border: unknown;
  Effect: unknown;
}

// GDocument.getTitle numbers new documents per session the first time
// their title is asked for (the old V and H).
const untitledNumbers: Record<string, number> = {};
let nextUntitledNumber = 1;

/** The old W: calls `callback` after 10 ms. */
function waitToRendererProcess(callback: () => void): void {
  setTimeout(callback, 10);
}

/** A node with its stylable members, as the document colors read them. */
interface ColorSource {
  getProperty(name: string): unknown;
}

export class Document extends EventTarget {
  static FileTypes: FileType[] = FileTypes.getFileTypesArray();
  static waitToRendererProcess = waitToRendererProcess;

  _status: number | null = null;
  _errored = false;
  _storageItem: StorageItem | null = null;
  _documentColors: Record<string, number> | null = null;
  _scene: Scene | null = null;
  _editor: Editor | null = null;
  /** The document's windows; Windows adds and removes them. */
  _windows: DocumentWindow[];
  /** Set by Windows.activateWindow and removeWindow. */
  _activeWindow: DocumentWindow | null;
  _synchronizing = false;
  _title: string | null = null;
  _lockedSymbolInstances = false;
  _lockedByVersionHistory = false;
  _editable = true;
  _annotationsEditable: boolean = config.HAS_ANNOTATIONS;
  _documentFromTemplate = false;
  _focusAnnotationId: unknown = null;
  _annotationFocused = false;
  _colorModeElms: unknown = null;
  _lastDownloadSize = 0;
  _activeStylesList: ActiveStylesList;
  readonly sessionId: string;

  constructor(source?: StorageItem | Scene | null) {
    super();
    this._storageItem = source instanceof StorageItem ? source : null;
    this._windows = [];
    this._activeWindow = null;
    this._updateStatus(DocumentStatus.Init);
    this.sessionId = uuid();
    if (source instanceof Scene) this.setScene(source);
    else this.setScene(gDesigner().createScene());
    if (this._storageItem && gDesigner().hasEventListeners(DocumentEvent)) {
      gDesigner().trigger(new DocumentEvent(DocumentEvent.Type.StorageItemUpdated, this));
    }
    this._activeStylesList = { Fill: null, Border: null, Effect: null };
    this._lockedSymbolInstances = false;
  }

  updateActiveStylesList(type: keyof ActiveStylesList, value: unknown): void {
    if (Object.prototype.hasOwnProperty.call(this._activeStylesList, type)) {
      this._activeStylesList[type] = value;
    }
  }

  getActiveStylesList(): ActiveStylesList {
    return this._activeStylesList;
  }

  /**
   * Sic: the old method cleared `_selectedStylesList`, which nothing
   * sets, so it throws a TypeError (see "clearActiveStylesList throws" in
   * QUESTIONS.md).
   */
  clearActiveStylesList(): void {
    const list = (this as unknown as { _selectedStylesList: Record<string, unknown> })
      ._selectedStylesList;
    Object.keys(list).forEach((key) => {
      list[key] = null;
    });
  }

  setFocusAnnotationId(id: unknown): void {
    this._focusAnnotationId = id;
  }

  getFocusAnnotationId(): unknown {
    return this._focusAnnotationId;
  }

  setAnnotationFocused(focused = true): void {
    this._annotationFocused = focused;
  }

  isAnnotationFocused(): boolean {
    return this._annotationFocused;
  }

  setColorModeElms(elements: unknown): void {
    this._colorModeElms = elements;
  }

  getColorModeElms(): unknown {
    return this._colorModeElms;
  }

  setDocumentFromTemplate(fromTemplate: boolean): void {
    this._documentFromTemplate = fromTemplate;
  }

  isDocumentFromTemplate(): boolean {
    return this._documentFromTemplate;
  }

  getStatus(): number | null {
    return this._status;
  }

  isNew(): boolean {
    return !this._storageItem;
  }

  /**
   * Unsaved changes: the editor's modified state (ignoring annotations
   * and comments), an errored save, or annotations changed after the last
   * save.
   */
  isModified(): boolean {
    if (!this._editor) return false;
    if (this._errored) return true;
    const filter = config.HAS_ANNOTATIONS
      ? (node: unknown): boolean => hasMixin(node, Annotation) || node instanceof Comment
      : undefined;
    if (this._editor.isModified(filter)) return true;
    return !(
      !this._editable ||
      !this.getScene() ||
      (this.getStorageItem() && (this.getStorageItem() as StorageItem).getVersionId()) ||
      !(
        (this.getScene() as Scene).getLastTimeAnnotationsFromCloudModified() -
          (this.getScene() as Scene).getLastSavedTime() >
        0
      )
    );
  }

  getStorageItem(): StorageItem | null {
    return this._storageItem;
  }

  /** The storage item's extension (upper case), else the native one (lower case, as before). */
  getExtension(): string | null {
    const item = this.getStorageItem();
    return item ? item.getExtension() : DEFAULT_FORMAT.ext;
  }

  hasCDR(): boolean {
    return !!(
      PageClip.CDR_ORIGIN_PROPERTY_NAME &&
      this._scene &&
      this._scene.getProperty(PageClip.CDR_ORIGIN_PROPERTY_NAME, true)
    );
  }

  /** Without the cloud there is no temporary cloud item: the storage item. */
  getTempCloudStorageItem(): StorageItem | null {
    return this._storageItem;
  }

  getStorage(): ReturnType<StorageItem["getStorage"]> | null {
    return this._storageItem ? this._storageItem.getStorage() : null;
  }

  setStorageItem(item: StorageItem | null): void {
    if (item !== this._storageItem) {
      this._storageItem = item;
      if (this._storageItem && this.getFileFormatVersion()) {
        void this._storageItem.storeFileFormatVersion(this.getFileFormatVersion());
      }
      if (gDesigner().hasEventListeners(DocumentEvent)) {
        gDesigner().trigger(new DocumentEvent(DocumentEvent.Type.StorageItemUpdated, this));
      }
    }
  }

  getScene(): Scene | null {
    return this._scene;
  }

  /**
   * Replaces the scene (also the same one with `force`). An active document
   * is deactivated for it and activated again.
   */
  setScene(scene: Scene | null, force = false): void {
    if (scene !== this._scene || force) {
      let wasActive = false;
      if (gDesigner().getActiveDocument() === this) {
        gDesigner().activateDocument(null as never);
        wasActive = true;
      }
      this._updateScene(scene);
      this._updateStatus(DocumentStatus.Ready, scene);
      if (wasActive) gDesigner().activateDocument(this as never);
    }
  }

  /** Empty stubs in the old app: there is no file format version. */
  setFileFormatVersion(): void {}

  async saveFileFormatVersion(): Promise<void> {}

  getFileFormatVersion(): unknown {
    return null;
  }

  /** The colors used in the document, most used first, at most `limit`. */
  getDocumentColors(limit?: number): Pattern[] {
    const colors = this._documentColors as Record<string, number>;
    const keys = Object.keys(colors);
    keys.sort((a, b) => (colors[b] as number) - (colors[a] as number));
    let patterns = keys.map((key) => Pattern.deserialize(key) as Pattern);
    if ("number" == typeof limit && limit > 0) patterns = patterns.slice(0, limit);
    return patterns;
  }

  /**
   * Inspect and comment permissions came from the cloud's application
   * manager; locally both are always on, so nothing changes.
   */
  _checkPermissionsAndUpdateState(): void {}

  _updateScene(scene: Scene | null): void {
    if (this._scene) {
      const editor = this._editor as Editor;
      const old = this._scene;
      editor.release();
      editor.removeEventListener(Editor.FileDropEvent, this._dropFileEvent, this);
      editor.removeEventListener(Editor.ModifiedEvent, this._modifiedEvent, this);
      editor.removeAllEventListeners();
      old.removeEventListener(Node.AfterInsertEvent, this._afterInsertNodeEvent, this);
      old.removeEventListener(Node.AfterRemoveEvent, this._afterRemoveNodeEvent, this);
      old.removeEventListener(Node.BeforeRemoveEvent, this._beforeRemoveNodeEvent, this);
      old.removeEventListener(
        Node.BeforePropertiesChangeEvent,
        this._beforePropertiesChangeEvent,
        this,
      );
      old.removeEventListener(
        Node.AfterPropertiesChangeEvent,
        this._afterPropertiesChangeEvent,
        this,
      );
      old.removeAllEventListeners();
      old.iteratePages((page: Node) => {
        (page as unknown as EventTarget).removeAllEventListeners();
      }, true);
      old.getDictionary().removeAllEventListeners();
      old.getSymbolDictionary().removeAllEventListeners();
      this.removeEventListener(DocumentStatusEvent, this._handleDocumentStatusEvent, this);
      this._editor = null;
      this._scene = null;
    }
    this._documentColors = {};
    this._scene = scene;
    if (this._scene) {
      const editor = Editor.getEditor(scene) || new Editor(scene as Scene);
      this._editor = editor;
      editor.addEventListener(Editor.FileDropEvent, this._dropFileEvent, this, null, false, true);
      editor.addEventListener(Editor.ModifiedEvent, this._modifiedEvent, this, null, false, true);
      const current = this._scene;
      current.addEventListener(
        Node.AfterInsertEvent,
        this._afterInsertNodeEvent,
        this,
        null,
        false,
        true,
      );
      current.addEventListener(
        Node.AfterRemoveEvent,
        this._afterRemoveNodeEvent,
        this,
        null,
        false,
        true,
      );
      current.addEventListener(
        Node.BeforeRemoveEvent,
        this._beforeRemoveNodeEvent,
        this,
        null,
        false,
        true,
      );
      current.addEventListener(
        Node.BeforePropertiesChangeEvent,
        this._beforePropertiesChangeEvent,
        this,
        null,
        false,
        true,
      );
      current.addEventListener(
        Node.AfterPropertiesChangeEvent,
        this._afterPropertiesChangeEvent,
        this,
        null,
        false,
        true,
      );
      this.addEventListener(
        DocumentStatusEvent,
        this._handleDocumentStatusEvent,
        this,
        null,
        false,
        true,
      );
      current.acceptChildren((node: Node) => {
        if (hasMixin(node, Element.Stylable) && stylable(node).getPaintLayers()) {
          for (
            let layer = (
              stylable(node).getPaintLayers() as NonNullable<
                ReturnType<StylableView["getPaintLayers"]>
              >
            ).getFirstChild();
            null !== layer;
            layer = layer.getNext()
          ) {
            this._updateDocumentColorsFromElement(layer as unknown as ColorSource, ["_pt"]);
          }
        }
      });
      this._updateState();
    }
  }

  _handleDocumentStatusEvent(event: DocumentStatusEvent): void {
    switch (event.status) {
      case DocumentStatus.Ready:
        this._checkPermissionsAndUpdateState();
        break;
      case DocumentStatus.Saving:
        gDesigner().trigger(new DocumentEvent(DocumentEvent.Type.Saving, this, event.data));
        break;
    }
  }

  getEditor(): Editor | null {
    return this._editor;
  }

  getWindows(): DocumentWindow[] {
    return this._windows;
  }

  getActiveWindow(): DocumentWindow | null {
    return this._activeWindow;
  }

  /** A new document's title; a change counts as a modification. */
  setTitle(title: string | null): void {
    if (title !== this._title) {
      this._title = title;
      if (gDesigner().hasEventListeners(DocumentEvent)) {
        gDesigner().trigger(new DocumentEvent(DocumentEvent.Type.Modified, this));
      }
    }
  }

  /** "Untitled-<n>" (or the set title) for a new document, else the file name without extension. */
  getTitle(): string {
    if (this.isNew()) {
      untitledNumbers[this.sessionId] = untitledNumbers[this.sessionId]
        ? (untitledNumbers[this.sessionId] as number)
        : nextUntitledNumber++;
    }
    return this.isNew()
      ? this._title ||
          Locale.get(new LocaleKey("GDocument", "text.default-document-name")) +
            "-" +
            String(untitledNumbers[this.sessionId])
      : ((this._storageItem as StorageItem).getName() as string);
  }

  /**
   * Inserts an element. On a fixed-size scene it is scaled down to fit
   * (`fit`, keeping its ratio and scaling its border widths) and centered
   * (`center`) first.
   */
  insertElement(element: Node, center?: boolean, fit?: boolean, noTransaction?: boolean): void {
    const scene = this.getScene() as Scene;
    if (scene.isFixedSized() && hasMixin(element, Element.Transform)) {
      const transformable = element as unknown as TransformableNode;
      const box = transformable.getGeometryBBox();
      if (!box) return;
      let width = box.getWidth();
      let height = box.getHeight();
      const sceneWidth = scene.getProperty("w") as number;
      const sceneHeight = scene.getProperty("h") as number;
      let transform = new Transform();
      if (fit && (width > sceneWidth || height > sceneHeight)) {
        let scaleX = 1;
        let scaleY = 1;
        if (width > sceneWidth) scaleX = sceneWidth / width;
        if (height > sceneHeight) scaleY = sceneHeight / height;
        if (scaleX < scaleY) scaleY = scaleX;
        else scaleX = scaleY;
        transform = transform
          .translated(-box.getX(), -box.getY())
          .scaled(scaleX, scaleY)
          .translated(box.getX(), box.getY());
        width *= scaleX;
        height *= scaleY;
      }
      if (center) {
        transform = transform.translated(
          (sceneWidth - width) / 2 - box.getX(),
          (sceneHeight - height) / 2 - box.getY(),
        );
      }
      transformable.transform(transform, true);
      const factor = transform.getScaleFactor();
      const scaleBorders = (node: Node): void => {
        if (
          node instanceof Item &&
          hasMixin(node, Element.Stylable) &&
          stylable(node).hasStyleBorder()
        ) {
          const layers = stylable(node).getPaintLayers();
          if (layers) {
            for (const layer of layers.getBorderLayers()) {
              if (layer) {
                const border = layer as unknown as {
                  $_bw: number;
                  setProperty(n: string, v: unknown): void;
                };
                border.setProperty("_bw", border.$_bw * factor);
              }
            }
          }
        }
      };
      element.beginUpdate();
      scaleBorders(element);
      if (hasMixin(element, Node.Container)) tree(element).acceptChildren(scaleBorders);
      element.endUpdate();
    }
    (this._editor as Editor).insertElements(
      [element],
      true,
      noTransaction,
      element instanceof Item,
    );
  }

  /** Loads .gvdesign bytes into this document. */
  loadFromData(data: Uint8Array): void {
    const options: LoadOptions = { progress: null, checkAnnotations: false };
    this._updateStatus(DocumentStatus.Loading, options);
    void this._loadDataIntoDocument(data, options);
  }

  /**
   * GDocument._loadDataIntoDocument: wait, unpack, wait, then
   * deserializeData (the steps of io/gvdesign/load.ts, here with the
   * view centered between them as before).
   */
  async _loadDataIntoDocument(data: Uint8Array, options: LoadOptions): Promise<void> {
    if (options.progress) options.progress(5);
    await sleep(10);
    const json = unzipData(data);
    if (options.progress) options.progress(10);
    await sleep(10);
    return this.deserializeData(json, options);
  }

  /**
   * GDocument.deserializeData for JSON text: restores it as this
   * document's scene. A text that holds no scene, or a restore that
   * throws, shows "text.error-reading-file" and fails the load ("A
   * .gvdesign without a scene, or with cut-off JSON, stays Loading
   * forever" in BUGS-FIXED.md).
   */
  async deserializeData(json: string | null, options?: LoadOptions | null): Promise<void> {
    const window = this.getActiveWindow();
    if (window) window.centerAndZoom();
    if (!options) {
      options = { progress: null };
      this._updateStatus(DocumentStatus.Loading, options);
    }
    let scene: Scene;
    try {
      scene = await deserializeScene(json, gDesigner().getWorkspace(), options.progress);
    } catch (error) {
      console.log(error);
      documentDialogs().message(
        Locale.get(new LocaleKey("GDocument", "text.error-reading-file")) as string,
      );
      this._updateStatus(DocumentStatus.LoadFailed);
      return;
    }
    this._sceneLoaded(scene);
  }

  /** The end of deserializeData: the scene, Loaded, then setScene(scene, true). */
  private _sceneLoaded(scene: Scene): void {
    this._updateScene(scene);
    this._updateStatus(DocumentStatus.Loaded);
    this.setScene(scene, true);
  }

  isCloudFile(): boolean {
    return false;
  }

  isExternalFile(): boolean {
    return false;
  }

  isCollaborative(): boolean {
    return false;
  }

  isShareable(): boolean {
    return false;
  }

  /** Commercial product files came from the cloud shop; none locally. */
  isCommercialProductFile(): boolean {
    return false;
  }

  /** Marks elements as restricted to this file (only used for commercial files). */
  restrictElements<T extends Node>(elements: T[]): T[] {
    elements.forEach((element) => {
      props(element).setProperty(
        "restricted",
        (this.getStorageItem() as StorageItem).getId(),
        true,
      );
    });
    return elements;
  }

  /** The elements that aren't restricted to another file. */
  filterUnrestrictedCommercialFileElements<T extends Node>(
    elements: T[] | null | undefined,
  ): T[] | null | undefined {
    return (
      elements &&
      elements.filter((element) => {
        const restricted = props(element).getProperty("restricted", true) || false;
        if (!restricted) return true;
        const item = this.getStorageItem();
        return !!item && item.getId() === restricted;
      })
    );
  }

  isEditingEnabled(): boolean {
    const item = this.getStorageItem();
    return !item || item.isEditingEnabled();
  }

  /** The cloud id a local file may still carry in its scene ("cid"), else null. */
  getId(): string | null {
    return this.getCloudReferenceId() ? this.getCloudReferenceId() : null;
  }

  hasCloudReference(): boolean {
    return !this.isCloudFile() && !!this._getCloudSceneId();
  }

  getCloudReferenceId(): string | null {
    return (this.hasCloudReference() && this._getCloudSceneId()) || null;
  }

  _getCloudSceneId(): string | null {
    return (this.getScene() && (this.getScene() as Scene).getProperty("cid")) as string | null;
  }

  /** The save options with save: true. */
  updateSaveOptionsLastModifiedDate(
    options?: Record<string, unknown> | null,
    lastModifiedDate?: unknown,
  ): Record<string, unknown> {
    if (options) options.save = true;
    else options = { save: true };
    if (
      config.HAS_ANNOTATIONS &&
      this._scene &&
      this._scene.getLastTimeAnnotationsFromCloudModified()
    ) {
      options.lastModifiedDate = this._scene.getLastTimeAnnotationsFromCloudModified();
    }
    if (lastModifiedDate && !options.lastModifiedDate) options.lastModifiedDate = lastModifiedDate;
    return options;
  }

  /** Whether the document lives in a browser (local items of the web runtimes). */
  isWebFile(): boolean {
    const item = this.getStorageItem();
    if (item) return false;
    const runtime = gContainer()?.getRuntime();
    return runtime === Runtime.Browser || runtime === Runtime.PWA;
  }

  isExtensionAvailableForLoading(extension: string | null | undefined): boolean {
    return (
      !!extension &&
      !!Document.FileTypes.find(
        (type) => type.load && type.ext.toUpperCase() === extension.toUpperCase(),
      )
    );
  }

  /** Loads the storage item again. */
  reload(): void {
    if (gDesigner().hasEventListeners(DocumentEvent)) {
      gDesigner().trigger(new DocumentEvent(DocumentEvent.Type.BeforeReload, this));
    }
    this.load(this.getStorageItem());
  }

  /**
   * Opens `item` (the storage item when none is given) into this
   * document, by its extension: .gvdesign through io/gvdesign, the other
   * formats through ./open-import.ts. Unknown extensions fail the load.
   */
  load(item?: StorageItem | null, extra: Partial<LoadOptions> = {}): void {
    const source = item || this._storageItem;
    if (!source) return;
    const name = source.getName();
    const extension = source.getExtension();
    const options: LoadOptions = Object.assign(
      {},
      { progress: null, filename: name, ext: extension ? extension.toLowerCase() : null },
      extra,
    ) as LoadOptions;
    this._updateStatus(DocumentStatus.Loading, options);
    source.read(
      (data) => {
        void this._readLoaded(source, extension, data as Uint8Array, options);
      },
      (error?: unknown) => {
        if (error) {
          console.log(error);
          documentDialogs().message(
            Locale.get(new LocaleKey("GDocument", "text.error-reading-file")) as string,
          );
        }
        this._updateStatus(DocumentStatus.LoadFailed);
      },
      options.progress ?? undefined,
    );
  }

  private async _readLoaded(
    item: StorageItem,
    extension: string | null,
    data: Uint8Array,
    options: LoadOptions,
  ): Promise<void> {
    if ("GVDESIGN" === extension || extension === DEFAULT_FORMAT.ext.toUpperCase()) {
      options.checkAnnotations = true;
      const fonts = FontsProviderManager.getInstance();
      fonts.setShowMissingFontsDialog(false);
      const tracker = new MissingFontTracker();
      tracker.start();
      void this._loadDataIntoDocument(data, options).finally(async () => {
        try {
          const fontManager = gDesigner().getWorkspace().getFontManager() as FontManager;
          await new FontAvailabilityTracker(fontManager).waitForAllPendingFonts();
          const missing = tracker.getMissingFonts();
          if (missing && missing.length) documentDialogs().missingFonts(this, missing);
        } finally {
          tracker.stop();
          fonts.setShowMissingFontsDialog(true);
        }
      });
      gDesigner().addToRecentFiles?.(item);
    } else if (
      SECONDARY_FORMATS.length &&
      SECONDARY_FORMATS.find((format) => format.ext.toUpperCase() === extension)
    ) {
      await this._handleSecondaryFormatRead(item, data, options);
    } else {
      openImportedFile(this.openImportContext(), item, extension, data, options);
    }
  }

  /** What ./open-import.ts needs of this document. */
  private openImportContext(): OpenImportContext {
    return {
      document: this,
      updateStatus: (status, data) => this._updateStatus(status, data),
      setTitle: (title) => this.setTitle(title),
      setScene: (scene) => this.setScene(scene),
      preProcessFonts: (message) => this._preProcessFonts(message),
      postProcessFonts: () => this._postProcessFonts(),
      initCancelHandler: (cancel) => this.initCancelHandler(cancel),
    };
  }

  /** Corel formats: never available, the load fails. */
  async _handleSecondaryFormatRead(
    _item: StorageItem,
    _data: Uint8Array,
    options?: LoadOptions,
  ): Promise<void> {
    this._updateStatus(DocumentStatus.LoadFailed, options);
  }

  async _handleSecondaryFormatSave(
    _options: unknown,
    _write: unknown,
    fail?: ((message: string) => void) | null,
  ): Promise<void> {
    if (fail) fail(Locale.get(new LocaleKey("GDocument", "text.cannot-save")) as string);
  }

  /**
   * Writes the document to `item` (the storage item when none is given) in
   * the item's format. `options.export` writes without status changes or
   * a save point.
   */
  async store(
    item?: StorageItem | null,
    done?: (() => void) | null,
    fail?: ((error?: unknown) => void) | null,
    options: StoreOptions = {},
  ): Promise<void> {
    return storeDocument(this, item, done, fail, options);
  }

  /** Shows the window's Cancel button for a running import. */
  initCancelHandler(cancel: () => void): void {
    if (this._activeWindow) this._activeWindow.activateCancelLoading(cancel);
  }

  /**
   * The entry point for paste and drop: imports a file (a File, a Blob or
   * a storage item) into this document at `position`, or centered. See
   * ./place-import.ts.
   */
  placeOrImport(
    source: Blob | File | StorageItem,
    position?: PlacePosition | null,
    noTransaction?: boolean,
    ignoreName?: boolean,
    callback?: PlaceCallback | null,
  ): void {
    placeOrImport(this, source, position, noTransaction, ignoreName, callback);
  }

  /** Before an import: the system fonts (Electron) on, the missing-fonts dialog off. */
  _preProcessFonts(keepFontsMessage?: string): void {
    const container = gContainer();
    if (container && container.getRuntime() === Runtime.Electron) {
      const provider = container.getSystemFontsProvider();
      if (provider) FontsProviderManager.enableProviders([provider as never], true);
    }
    const fonts = FontsProviderManager.getInstance();
    if (fonts) {
      if (keepFontsMessage) fonts.keepFontsMessage = keepFontsMessage;
      fonts.setShowMissingFontsDialog(false);
    }
  }

  /** After an import: undoes _preProcessFonts. */
  _postProcessFonts(): void {
    const container = gContainer();
    if (container && container.getRuntime() === Runtime.Electron) {
      const provider = container.getSystemFontsProvider();
      if (provider) FontsProviderManager.disableProviders([provider as never]);
    }
    const fonts = FontsProviderManager.getInstance();
    if (fonts) fonts.setShowMissingFontsDialog(true);
  }

  /** The window's progress overlay; returns the function that sets the progress. */
  _activateProgress(message: string): (value: number) => void {
    if (this._activeWindow) {
      const overlay = this._activeWindow.activateProgress(message, true);
      const progress = overlay ? overlay.querySelector("progress") : null;
      return (value) => {
        if (progress) (progress as HTMLProgressElement).value = value;
      };
    }
    return (value) => console.info("progress", value);
  }

  _deactivateProgress(): void {
    if (this._activeWindow) this._activeWindow.deactivateProgress();
  }

  /**
   * Also what the dropped annotations UI did to the document on every
   * activation (see "The annotations lists come from the annotations
   * sidebar" in QUESTIONS.md): the annotations sidebar gave every page
   * its annotations list ("annlst", GAnnotationsSidebar._documentEvent
   * called scene.getAnnotations()), and the annotation panel it showed
   * cleared the program lock of each annotation the signed-in user owns
   * (GAnnotationPanel wrote `$plkt = null` directly). Without users every
   * annotation counts as the user's own.
   */
  activate(): void {
    this._updateState();
    if (this._scene) {
      for (const list of this._scene.getAnnotations()) {
        for (const node of tree(list as unknown as Node).getChildren()) {
          if (hasMixin(node, Annotation)) (node as unknown as { $plkt: unknown }).$plkt = null;
        }
      }
    }
  }

  isCollaborativeTextEditing(): boolean {
    return false;
  }

  getCollaborativeTextController(): null {
    return null;
  }

  deactivate(): void {}

  /** Closing: drops the scene, releases the storage item and every listener. */
  release(): void {
    if (this._scene) this.setScene(null);
    if (this.getStorageItem()) (this.getStorageItem() as StorageItem).release();
    this.removeAllEventListeners(true);
  }

  _afterInsertNodeEvent(event: { node: Node }): void {
    const node = event.node;
    if (node instanceof Group && node.getFirstChild()) this._updateDocumentColorsFromGroup(node);
    else if (node instanceof Element && hasMixin(node, Element.Stylable)) {
      this._updateDocumentColors(node);
    } else if (node instanceof PaintLayer) {
      this._updateDocumentColorsFromElement(node as unknown as ColorSource, ["_pt"]);
    }
    this._updateSymbolLock((this._scene as Scene).getActivePage());
  }

  _beforeRemoveNodeEvent(event: { node: Node }): void {
    this._updateSymbolLock(event.node, true);
  }

  _afterRemoveNodeEvent(event: { node: Node }): void {
    const node = event.node;
    if (node instanceof Group && node.getFirstChild()) {
      this._updateDocumentColorsFromGroup(node, true);
    } else if (node instanceof Element && hasMixin(node, Element.Stylable)) {
      this._updateDocumentColors(node, true);
    } else if (node instanceof PaintLayer) {
      this._updateDocumentColorsFromElement(node as unknown as ColorSource, ["_pt"], true);
    }
    if (node instanceof Text) {
      this._updateDocumentColorsFromElement(node as unknown as ColorSource, ["content"], true);
    }
  }

  _beforePropertiesChangeEvent(event: {
    node: Node;
    properties: string[];
    values: unknown[];
  }): void {
    if (
      event.node instanceof SymbolNode &&
      null === event.values[event.properties.indexOf("masterRef")]
    ) {
      this._updateSymbolLock(event.node, true);
    }
  }

  /**
   * Keeps the document colors in step with fill, border and text color
   * changes. The CDR warnings and the Pro symbol lock of the old handler
   * never run here (no CDR, every Pro feature on).
   */
  _afterPropertiesChangeEvent(event: {
    node: Node;
    properties: string[];
    values: unknown[];
    temporary?: boolean;
  }): void {
    if (!event.temporary) {
      if (event.node instanceof PaintLayer) {
        this._handlePropertiesChangedForDocumentColorsElement(
          event.node as unknown as ColorSource,
          ["_pt"],
          event.properties,
          event.values,
        );
      } else if (event.node instanceof Text) {
        this._handlePropertiesChangedForDocumentColorsElement(
          event.node as unknown as ColorSource,
          ["content"],
          event.properties,
          event.values,
        );
      }
    }
  }

  lock(): void {}

  unlock(): void {}

  isLocked(): boolean {
    return false;
  }

  lockByVersionHistory(): void {
    this._lockedByVersionHistory = true;
  }

  isLockedByVersionHistory(): boolean {
    return this._lockedByVersionHistory;
  }

  /**
   * Applies the edit permissions: an editable document unlocks every
   * element (program lock off, the saved lock type back), a read-only one
   * locks them all (keeping the old lock type in "_lkt").
   */
  _updateState(): void {
    const scene = this._scene;
    if (!scene) return;
    if (this._editable) {
      scene.accept((node: Node) => {
        if (node instanceof Element) {
          props(node).setProperty("plkt", Block.ProgramLck.NoLock);
          const saved = props(node).getProperty("_lkt", true);
          if (undefined !== saved) props(node).setProperty("lkt", saved);
        }
      });
    } else {
      scene.accept((node: Node) => {
        if (node instanceof Element) {
          if (undefined === props(node).getProperty("_lkt", true)) {
            props(node).setProperty("_lkt", props(node).getProperty("lkt") || null, true);
          }
          props(node).setProperty("lkt", Block.LockType.Full);
        }
      });
      if (this._annotationsEditable) {
        const lock =
          Block.ProgramLck.NoSizeChanges |
          Block.ProgramLck.NoEdit |
          Block.ProgramLck.NoMove |
          Block.ProgramLck.NoOrigChildrenEdit |
          Block.ProgramLck.NoNewChildren |
          Block.ProgramLck.NoDelete |
          Block.ProgramLck.NoDirectVisibilityChange |
          Block.ProgramLck.NoSelect;
        scene.iteratePages((page: Node) => {
          tree(page).acceptChildren((node: Node) => {
            if (node instanceof Element) props(node).setProperty("plkt", lock);
            if (hasMixin(node, Annotation)) {
              props(node).setProperty("lkt", null);
              props(node).setProperty("plkt", lock & ~Block.ProgramLck.NoSelect);
            }
          });
          (page as Page).setProperty("plkt", lock);
          (page as Page).setProperty("lkt", null);
        }, true);
      }
    }
    this._updateSymbolLock(scene);
  }

  /**
   * The free plan locked symbol instances; every Pro feature is on here,
   * so this only undoes a lock that was set, which never happens.
   */
  _updateSymbolLock(node?: Node | null, removing?: boolean): void {
    if (!this._editable) return;
    const set = !removing;
    const root = node || this._scene;
    if (root && this._lockedSymbolInstances) {
      root.accept((child: Node) => {
        if (isSymbolInstance(child)) {
          if (child instanceof SymbolNode && null === child.getProperty("masterRef")) return false;
          if (!(child instanceof SymbolNode) && child instanceof Element) {
            props(child).setProperty("lkt", props(child).getProperty("lkt"), set, true);
          }
        }
        return undefined;
      });
      this._lockedSymbolInstances = false;
    }
  }

  _modifiedEvent(event: { data?: unknown }): void {
    if (gDesigner().hasEventListeners(DocumentEvent)) {
      gDesigner().trigger(
        new DocumentEvent(DocumentEvent.Type.Modified, this, event.data ? event.data : null),
      );
    }
  }

  /** A file dropped on the canvas: placed at the drop point (EDT-DND, FMT-IMPORT-024). */
  _dropFileEvent(event: { file: File; position: { getX(): number; getY(): number } }): void {
    this.placeOrImport(event.file, { x: event.position.getX(), y: event.position.getY() });
  }

  _updateStatus(status: number, data?: unknown): void {
    if (status !== this._status) {
      this._status = status;
      if (this.hasEventListeners(DocumentStatusEvent)) {
        this.trigger(new DocumentStatusEvent(status, data));
      }
      FontsProviderManager.getInstance().trigger(new DocumentStatusEvent(status, data));
    }
  }

  updateStatus(status: number, data?: unknown): void {
    this._updateStatus(status, data || {});
  }

  /** Sic: always null; the old code stripped "document://" and dropped the result. */
  _extractUsedDocumentRef(reference: string | null): null {
    void reference;
    return null;
  }

  _addDocumentColors(colors: unknown[]): void {
    const counts = this._documentColors as Record<string, number>;
    for (let i = 0; i < colors.length; ++i) {
      const key = Pattern.serialize(colors[i] as Pattern) as string;
      if (Object.prototype.hasOwnProperty.call(counts, key))
        counts[key] = (counts[key] as number) + 1;
      else counts[key] = 1;
    }
  }

  _clearDocumentColors(colors: unknown[]): void {
    const counts = this._documentColors as Record<string, number>;
    for (let i = 0; i < colors.length; ++i) {
      const key = Pattern.serialize(colors[i] as Pattern) as string;
      if (Object.prototype.hasOwnProperty.call(counts, key)) {
        counts[key] = (counts[key] as number) - 1;
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- the counts are keyed by serialized color, as before
        if (0 == counts[key]) delete counts[key];
      }
    }
  }

  _updateDocumentColors(node: Node, removing?: boolean): void {
    const layers = stylable(node).getPaintLayers();
    if (layers) {
      for (const layer of layers.getLayers()) {
        if (removing) {
          this._updateDocumentColorsFromElement(layer as unknown as ColorSource, ["_pt"], removing);
        } else this._updateDocumentColorsFromElement(layer as unknown as ColorSource, ["_pt"]);
      }
    }
  }

  _updateDocumentColorsFromGroup(group: Node, removing?: boolean): void {
    const children = tree(group).getChildren();
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as Node;
      if (child instanceof Group || !hasMixin(child, Element.Stylable)) {
        this._updateDocumentColorsFromGroup(child, removing);
      } else this._updateDocumentColors(child, removing);
    }
  }

  _updateDocumentColorsFromElement(
    node: ColorSource,
    properties: string[],
    removing?: boolean,
  ): void {
    const colors: unknown[] = [];
    for (let i = 0; i < properties.length; ++i) {
      const value = node.getProperty(properties[i] as string);
      if (value) {
        const collect = (pattern: unknown, first: boolean, index: number): void => {
          if (pattern instanceof Color) colors.push(pattern);
          else if (pattern instanceof Gradient) {
            const stops = pattern.getStops();
            for (let k = 0; k < stops.length; ++k)
              colors.push((stops[k] as { color: unknown }).color);
          } else if ("content" === properties[index] && node instanceof Text && first) {
            const rich = (
              node.getTLCore() as { getRichContent(): { fontColor?: unknown }[] } | null
            )?.getRichContent();
            if (rich && rich.length) {
              collect(
                node._getGravitValue("fontColor", (rich[0] as { fontColor?: unknown }).fontColor),
                false,
                index,
              );
            }
          }
        };
        collect(value, true, i);
      }
    }
    if (colors.length) {
      if (removing) this._clearDocumentColors(colors);
      else this._addDocumentColors(colors);
    }
  }

  _handlePropertiesChangedForDocumentColorsElement(
    node: ColorSource,
    names: string[],
    properties: string[],
    values: unknown[],
  ): void {
    const changed: string[] = [];
    const removed: unknown[] = [];
    for (let l = 0; l < names.length; ++l) {
      const index = properties.indexOf(names[l] as string);
      if (index >= 0) {
        changed.push(names[l] as string);
        const collect = (pattern: unknown, first: boolean, at: number): void => {
          if (pattern instanceof Color) removed.push(pattern);
          else if (pattern instanceof Gradient) {
            const stops = pattern.getStops();
            for (let k = 0; k < stops.length; ++k)
              removed.push((stops[k] as { color: unknown }).color);
          } else if ("content" === properties[at] && node instanceof Text && pattern && first) {
            const content = JSON.parse(pattern as string) as { fontColor?: unknown }[];
            if (content[0] && content[0].fontColor) {
              collect(node._getGravitValue("fontColor", content[0].fontColor), false, at);
            }
          }
        };
        collect(values[index], true, index);
      }
    }
    if (removed.length) this._clearDocumentColors(removed);
    if (changed.length) this._updateDocumentColorsFromElement(node, changed);
  }

  setSynchronizing(synchronizing: boolean): void {
    if (synchronizing !== this._synchronizing) {
      this._synchronizing = synchronizing;
      if (gDesigner().hasEventListeners(DocumentEvent)) {
        gDesigner().trigger(new DocumentEvent(DocumentEvent.Type.SynchronismUpdated, this));
      }
    }
  }

  isSynchronizing(): boolean {
    return this._synchronizing;
  }

  setErrored(errored: boolean): void {
    if (errored !== this._errored) {
      this._errored = !!errored;
      if (gDesigner().hasEventListeners(DocumentEvent)) {
        gDesigner().trigger(new DocumentEvent(DocumentEvent.Type.Modified, this));
      }
    }
  }

  /** The JPEG preview a save embeds (io/gvdesign/preview.ts). */
  buildPreview(): Promise<Blob | null> {
    return buildPreview(this._scene as Scene);
  }

  hasPagesWithInfiniteEmptyCanvas(): boolean {
    return hasPagesWithInfiniteEmptyCanvas(this._scene as Scene);
  }

  getLastDownloadSize(): number {
    return this._lastDownloadSize;
  }

  setLastDownloadSize(size: number): void {
    this._lastDownloadSize = size;
  }
}

/** The stylable members the document reads. */
interface StylableView {
  getPaintLayers(): {
    getFirstChild(): Node | null;
    getLayers(): unknown[];
    getBorderLayers(): unknown[];
  } | null;
  hasStyleBorder(): boolean;
}

function stylable(node: Node): StylableView {
  return node as unknown as StylableView;
}

/** An element with the transform mixin. */
interface TransformableNode {
  getGeometryBBox(): {
    getX(): number;
    getY(): number;
    getWidth(): number;
    getHeight(): number;
  } | null;
  transform(transform: Transform, flag?: boolean): void;
}

/** A node with the container members. */
type TreeNode = Node & ContainerApi;

const tree = (node: Node): TreeNode => node as TreeNode;

const props = (node: unknown): PropertiesNode => node as PropertiesNode;
