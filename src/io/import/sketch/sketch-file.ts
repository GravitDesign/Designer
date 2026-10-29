// Old: chunk.vendor.js module 1122 (sketchfile).
import { AsyncExecutor } from "../../../engine/core/async-executor.ts";
import { EventTarget } from "../../../engine/core/event-target.ts";
import { Scene } from "../../../engine/scene/scene.ts";
import { Workspace } from "../../../engine/scene/workspace.ts";
import type { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import { Text } from "../../../engine/text/text.ts";
import { zip, type Writer, type ZipEntry, type ZipReader } from "../../zip/zip.ts";
import "./sketch-classes.ts";
import { sceneNode, type SceneNodeLike } from "./scene-node.ts";
import type { SketchBase } from "./sketch-base.ts";
import type { SketchLayerData, SketchMetaData } from "./sketch-data.ts";
import { SketchDocument } from "./sketch-document.ts";
import { SketchFontSearch, type SketchFontProvider } from "./sketch-font-search.ts";
import { SketchPage } from "./sketch-page.ts";
import { SketchProcessEvent } from "./sketch-shape.ts";
import { SketchSymbolInstance } from "./sketch-symbol-instance.ts";
import { SketchSymbolMaster } from "./sketch-symbol-master.ts";

/** The options of SketchImport.import (and SketchFile.load). */
export interface SketchLoadOptions {
  /** Called with 0..100 (it can pass 100, see _processEvent). */
  progress?: (value: number) => void;
  /** Leave out pages that contain a symbol master. */
  ignoreSymbolPage?: boolean;
  /** Its font manager loads the fonts; a new GWorkspace when missing. */
  workspace?: Workspace;
  fontProvider?: SketchFontProvider | null;
}

/** What parse() resolves with: the pages, and the missing fonts mapped to the default family. */
export interface SketchImportResult {
  pages: SceneNodeLike[];
  replacedFonts: Record<string, string> | null;
}

/**
 * A Sketch file: the zip, its meta.json and pages/*.json, the symbol
 * masters and instances by id, and the font search. load() reads the
 * zip, parse() turns the pages into GPages in frame-sized slices.
 */
export class SketchFile extends EventTarget {
  declare _promise: Promise<SketchImportResult> | null;
  declare _promiseCapability: {
    resolve: (result: SketchImportResult) => void;
    reject: (reason?: unknown) => void;
  } | null;
  declare _data: Blob;
  declare _pages: SketchLayerData[] | null;
  declare _document: SketchDocument | null;
  declare _symbolsMaster: Record<string, SketchLayerData>;
  declare _symbolsInstance: Record<string, SketchLayerData>;
  declare _objects: Record<string, SketchBase>;
  declare _reader: ZipReader | null;
  declare _entries: ZipEntry[] | null;
  declare _fontSearch: SketchFontSearch | null;
  declare _progress: ((value: number) => void) | null | undefined;
  declare _objectsTotal: number;
  declare _objectsProcessed: number;
  declare _ignoreSymbolPage: boolean | undefined;
  declare _progressStage: number;
  declare _progressValue: number;
  declare _blockedEvents: boolean | null;
  declare _workspace: Workspace;
  /** The image nodes of bitmap layers whose image hasn't loaded or failed yet. */
  declare _loadingBitmaps: Set<object>;
  /** What _whenBitmapsSettled waits to call. */
  declare _bitmapsSettled: (() => void) | null;
  /** True while the pages are appended to the scratch scene. */
  declare _appending: boolean;
  /** Bitmap loads that came in while appending, handled after it (SketchBitmap). */
  declare _afterAppend: Map<object, () => void>;

  /** How long the import waits at most for its bitmaps to settle (ms). */
  static BITMAP_WAIT = 5000;

  constructor(data: Blob) {
    super();
    this._data = data;
    this._objects = {};
    this._symbolsMaster = {};
    this._symbolsInstance = {};
    this._loadingBitmaps = new Set();
    this._afterAppend = new Map();
    this.addEventListener(SketchProcessEvent, this._processEvent, this);
  }

  /**
   * Not in the old app. A bitmap layer's name, bounds and transform are
   * set when its image loads (SketchBitmap), and its image data is read
   * from the zip, which the import closes when it calls back. The old
   * importer waited a frame after every list, so the images had always
   * loaded by then; it now goes on without frames, and waits for the
   * bitmaps (_whenBitmapsSettled) before it calls back.
   *
   * It also waits before it appends the pages, until every bitmap has its
   * image data (outside a scene an image with a url goes Delayed): a layer
   * appended with its url gets a dictionary url, sharing the entry of an
   * equal image, as in the old app, where the data had always arrived by
   * then. A url set after the append stays a plain url when another image
   * already has an entry with it (Image._updateUrl).
   */
  bitmapLoading(image: object): void {
    this._loadingBitmaps.add(image);
  }

  bitmapSettled(image: object): void {
    this._loadingBitmaps.delete(image);
    if (!this._loadingBitmaps.size && this._bitmapsSettled) this._bitmapsSettled();
  }

  /**
   * Handles the postponed load of `image` now, if it has one: a symbol
   * instance scales its layers once their images loaded, after the
   * bitmap took its own bounds (SketchSymbolInstance._imageStatusEvent).
   */
  handlePendingLoad(image: object): void {
    const handle = this._afterAppend.get(image);
    if (!handle) return;
    this._afterAppend.delete(image);
    handle();
  }

  /**
   * Calls `callback` once no bitmap is loading any more (right away when
   * none is), or after BITMAP_WAIT ms, so an image that never settles
   * can't keep the import from calling back (Q-386).
   */
  _whenBitmapsSettled(callback: () => void): void {
    if (!this._loadingBitmaps.size) {
      callback();
      return;
    }
    let called = false;
    const once = (): void => {
      if (called) return;
      called = true;
      this._bitmapsSettled = null;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(once, SketchFile.BITMAP_WAIT);
    this._bitmapsSettled = once;
  }

  canEventBeSent(eventClass: unknown): boolean {
    void eventClass;
    return !this._blockedEvents;
  }

  blockEvents(): void {
    this._blockedEvents = true;
  }

  releaseEvents(): void {
    this._blockedEvents = false;
  }

  /** Each parsed and each appended shape is worth 50 / objects of progress. */
  _processEvent(): void {
    let value = (++this._objectsProcessed / this._objectsTotal) * 50;
    value += this._progressStage;
    this._progressValue = Math.max(value, this._progressValue || 0);
    this.updateProgress(this._progressValue);
  }

  getMissingFonts(): string[] {
    return (this._fontSearch as SketchFontSearch)._missingFonts;
  }

  updateProgress(value: number): void {
    if (this._progress) this._progress(value);
  }

  getVersion(): number | null {
    return (this._document as SketchDocument).version;
  }

  getFontSearch(): SketchFontSearch {
    return this._fontSearch as SketchFontSearch;
  }

  getSymbolInstance(id: string): SketchSymbolInstance | undefined {
    const data = this._symbolsInstance[id];
    if (data) return new SketchSymbolInstance(data, this, null);
    console.warn("Could not find instance symbol: #" + id);
    return undefined;
  }

  /** A new, unparsed master for the symbol id (every call makes a new one). */
  getSymbolMaster(id: string | null | undefined): SketchSymbolMaster | undefined {
    const data = this._symbolsMaster[id as string];
    if (data) return new SketchSymbolMaster(data, this, null);
    console.warn("Could not find master symbol: #" + String(id));
    return undefined;
  }

  addObject(object: SketchBase): void {
    this._objects[object.getId() as string] = object;
  }

  getObject(id: string): SketchBase | undefined {
    return this._objects[id];
  }

  /** The first zip entry whose name starts with `name`, read with `writer` (a Blob by default). */
  getReference(name: string): Promise<Blob>;
  getReference<T>(name: string, writer: Writer<T>): Promise<T>;
  getReference(name: string, writer?: Writer<unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const entry = this._getEntry(name);
      if (entry)
        entry.getData(
          writer || new zip.BlobWriter(),
          (data) => {
            resolve(data);
          },
          () => {},
        );
      else reject();
    });
  }

  _getEntry(name: string): ZipEntry | null {
    const entries = this._entries as ZipEntry[];
    for (let i = 0; i < entries.length; i++)
      if (0 === (entries[i] as ZipEntry).filename.indexOf(name)) return entries[i] as ZipEntry;
    return null;
  }

  /**
   * Reads meta.json and every entry with "pages" in its name. A file saved
   * by Sketch 50 or later is rejected, but the pages are still read. A zip
   * without meta.json never settles.
   */
  load(options?: SketchLoadOptions | null): Promise<void> {
    options = options || {};
    this._progress = options.progress;
    this._ignoreSymbolPage = options.ignoreSymbolPage;
    this._workspace = options.workspace || new Workspace();
    this._fontSearch = new SketchFontSearch(
      options.fontProvider,
      this._workspace.getFontManager() as FontManager,
    );
    return new Promise<void>((resolve, reject) => {
      zip.createReader(
        new zip.BlobReader(this._data),
        (reader) => {
          this._reader = reader;
          reader.getEntries((entries) => {
            this._entries = entries;
            void this.getReference("meta.json", new zip.TextWriter()).then((text) => {
              this._document = new SketchDocument(JSON.parse(text) as SketchMetaData);
              this._document.parse();
              if ((this._document.version as number) >= 50)
                reject("Sketch file v50+ is not supproted yet.");
              this._pages = [];
              if (entries.length) {
                const next = (index: number): void => {
                  if (index >= entries.length) resolve();
                  else {
                    const entry = entries[index] as ZipEntry;
                    if (-1 !== entry.filename.indexOf("pages"))
                      entry.getData(
                        new zip.TextWriter(),
                        (json) => {
                          (this._pages as SketchLayerData[]).push(
                            JSON.parse(json) as SketchLayerData,
                          );
                          next(++index);
                        },
                        () => {},
                      );
                    else next(++index);
                  }
                };
                next(0);
              }
            });
          });
        },
        (...args: unknown[]) => {
          reject(args[0]);
        },
      );
    });
  }

  /** Indexes symbol masters and instances and counts the layers. */
  _preProcess(layers: SketchLayerData[]): void {
    layers.forEach((layer) => {
      if ("symbolMaster" === layer._class) this._symbolsMaster[layer.symbolID as string] = layer;
      if ("symbolInstance" === layer._class)
        this._symbolsInstance[layer.do_objectID as string] = layer;
      if (layer.layers) this._preProcess(layer.layers);
      this._objectsTotal++;
    });
  }

  /** Makes every text lay out again, a moment after the pages are handed out. */
  _postProcess(pages: SceneNodeLike[]): void {
    setTimeout(() => {
      pages.forEach((page) => {
        page.accept((node) => {
          if (node instanceof Text) {
            node._runsDirty = true;
            node.repaint();
          }
        });
      });
    }, 1);
  }

  _isSymbolPage(layer: SketchLayerData): boolean {
    if ("symbolMaster" === layer._class) return true;
    if (layer.layers)
      for (let i = 0; i < layer.layers.length; i++)
        if (this._isSymbolPage(layer.layers[i] as SketchLayerData)) return true;
    return false;
  }

  _createPromiseCapability(capability: {
    resolve?: (result: SketchImportResult) => void;
    reject?: (reason?: unknown) => void;
  }): Promise<SketchImportResult> {
    return new Promise((resolve, reject) => {
      capability.resolve = resolve;
      capability.reject = reject;
    });
  }

  /**
   * Parses the pages, then appends them to a scratch scene and takes them
   * out again. Resolves with the pages and, when fonts were missing, a
   * map from each missing font name to the default font's family.
   */
  parse(): Promise<SketchImportResult> {
    if (!this._promise) {
      const capability = {} as NonNullable<SketchFile["_promiseCapability"]>;
      this._promise = this._createPromiseCapability(capability);
      this._promiseCapability = capability;
      try {
        this._preProcess(this._pages as SketchLayerData[]);
        const pages: SketchPage[] = [];
        const result: SceneNodeLike[] = [];
        const scene = sceneNode(new Scene(this._workspace, true));
        const executor = new AsyncExecutor();
        this._objectsProcessed = 0;
        const parsePage = (data: SketchLayerData): void => {
          if (this._ignoreSymbolPage && this._isSymbolPage(data)) return;
          const page = new SketchPage(data, this, null);
          page.parse(true, executor);
          pages.push(page);
        };
        const appendPages = (): void => {
          this._objectsProcessed = 0;
          this._progressStage = 50;
          this._appending = true;
          executor.execute(pages, appendPage, appended);
        };
        const appended = (): void => {
          this._appending = false;
          const loaded = [...this._afterAppend.values()];
          this._afterAppend = new Map();
          loaded.forEach((handle) => {
            try {
              handle();
            } catch (error) {
              console.log(error);
            }
          });
          this._whenBitmapsSettled(finish);
        };
        const appendPage = (page: SketchPage): void => {
          page.appendTo(scene, executor);
        };
        const finish = (): void => {
          try {
            while (scene.getFirstChild()) {
              const page = scene.getFirstChild() as SceneNodeLike;
              scene.removeChild(page);
              result.push(page);
            }
            const defaultFont = this.getFontSearch().getDefaultFont();
            let replaced: Record<string, string> | null = null;
            if (this.getMissingFonts().length) {
              replaced = {};
              this.getMissingFonts().forEach((name) => {
                (replaced as Record<string, string>)[name] = defaultFont.family;
              });
            }
            capability.resolve({ pages: result, replacedFonts: replaced });
          } finally {
            (this._reader as ZipReader).close();
          }
          this._postProcess(result);
        };
        executor.execute(this._pages as SketchLayerData[], parsePage, () =>
          this._whenBitmapsSettled(appendPages),
        );
      } catch (error) {
        capability.reject(error);
      }
    }
    return this._promise;
  }
}

SketchFile.prototype._promise = null;
SketchFile.prototype._promiseCapability = null;
SketchFile.prototype._pages = null;
SketchFile.prototype._document = null;
SketchFile.prototype._reader = null;
SketchFile.prototype._entries = null;
SketchFile.prototype._fontSearch = null;
SketchFile.prototype._progress = null;
SketchFile.prototype._objectsTotal = 0;
SketchFile.prototype._objectsProcessed = 0;
SketchFile.prototype._ignoreSymbolPage = false;
SketchFile.prototype._progressStage = 0;
SketchFile.prototype._progressValue = 0;
SketchFile.prototype._blockedEvents = null;
SketchFile.prototype._bitmapsSettled = null;
SketchFile.prototype._appending = false;
