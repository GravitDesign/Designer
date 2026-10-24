// Old: designer.browser.dev.js module 1253 (GExporter).
//
// The exporter behind the export dialog, the Export panel and "Export
// Page": builds the export list, runs one export per item, names the
// files and writes several of them into a directory or a ZIP.
//
// Changes from the old module:
// - The commercial-file paywall check (_validateCommercialDocument,
//   FMT-EXPORT-049) is gone with the marketplace.
// - The PRO gate (watchDog.check) is gone; the old local app had
//   subscriptions off, so the check always passed the value through.
// - What came from the app (the user name, the active window title, the
//   storage classes and the file-type table) comes through ExportHost and
//   the small storage interfaces below, until the app shell (phase 7)
//   provides them.

import { getTypeId } from "../../engine/core/object.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { extend, parseNumber } from "../../engine/core/util.ts";
import { Length } from "../../engine/math/length.ts";
import { Bitmap } from "../../engine/paint/bitmap.ts";
import type { PaintStyle } from "../../engine/paint/paint-canvas.ts";
import { Element } from "../../engine/scene/element.ts";
import type { Node } from "../../engine/scene/node.ts";
import { hasContainer } from "../../engine/scene/node-container.ts";
import { hasProperties } from "../../engine/scene/node-properties.ts";
import { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { FS, type ZipDirectoryEntry } from "../zip/zip-fs.ts";
import type { BitmapExportNode } from "./bitmap-export.ts";
import { exporters, type PdfExportJob } from "./index.ts";
import { sanitizeFilename } from "./sanitize-filename.ts";

/** The node property with an element's export rows (old module 442). */
export const EXPORT_PROPERTY_NAME = "__export";

/** The JPEG quality the PDF export uses when none is given (old module 10). */
export const JPEG_EXPORT_QUALITY_DEFAULT = 92;

/** One export row as the Export panel stores it in "__export". */
export interface ExportRow {
  sz: string;
  sf: string;
  fm: string;
}

/** One item to export: what the dialog, the panel and "Export Page" pass. */
export interface Exportable {
  element: Node | Node[];
  format: string;
  size?: string;
  suffix?: string;
  name?: string;
  jpegQuality?: number;
  backgroundColor?: PaintStyle | null;
  backgroundOpacity?: number;
  colorSpace?: string;
  configuration?: {
    ignoreEffects?: boolean;
    forceEffectsWhenZoomed?: boolean;
    sceneBackground?: boolean;
    isOutline?: () => boolean;
    [key: string]: unknown;
  } | null;
  convertTextToPath?: boolean;
  decimalPlacesPrecision?: number;
  preserveEditingCapabilities?: boolean;
  layerNamesAsId?: boolean;
  overrideBackground?: boolean;
  downsampleImages?: boolean;
  [key: string]: unknown;
}

/** A file type as GDocument.FileTypes lists it. */
export interface ExportFileType {
  ext: string;
  mime: string;
}

/** A file to write into (old storage Item). */
export interface ExportFile {
  write(data: Uint8Array, onDone?: () => unknown, onError?: unknown): unknown;
}

/** A directory to write into (old storage Directory). */
export interface ExportDirectory {
  addDirectory(name: string): Promise<ExportDirectory>;
  addFile(name: string): Promise<ExportFile>;
}

/** A storage the files go to (old GStorage): save prompt, download or a directory. */
export interface ExportStorage {
  canPromptSave(): boolean;
  savePrompt(
    name: string,
    types: (ExportFileType | undefined)[],
    callback: (file: ExportFile) => void,
    owner: unknown,
    options: unknown,
  ): void;
  canDownload(): boolean;
  download(name: string, callback: (file: ExportFile) => void, options: unknown): void;
  canChooseDirectory(): boolean;
  chooseDirectory(
    callback: (directory: ExportDirectory) => void,
    owner: unknown,
    fallback: () => void,
  ): void;
}

/** Progress and cancel hooks of a PDF export (the dialog's messenger). */
export interface ExportMessenger {
  close?(): void;
  error?(error: unknown): void;
  abort?: () => void;
  [key: string]: unknown;
}

/** What the exporter needs from the app. */
export interface ExportHost {
  /** The signed-in user's full name, the PDF author (gDesigner.getUser). */
  getUserFullName(): Promise<string | null | undefined>;
  /** The active window's title, the PDF title. */
  getActiveWindowTitle(): string | null | undefined;
  /** GDocument.FileTypes. */
  getFileTypes(): readonly ExportFileType[];
}

/**
 * GDocument.FileTypes (old module 389, getFileTypesArray: GVDESIGN, PNG,
 * HEIC, JPG, JPEG, SVG, PDF, EPS), ext and mime only, until the app shell
 * provides the real table. Exporter.export looks up the first item's
 * format here; svgz and zip are not in the old list either.
 */
const DOCUMENT_FILE_TYPES: readonly ExportFileType[] = [
  { ext: "gvdesign", mime: "application/gravit+design" },
  { ext: "png", mime: "image/png" },
  { ext: "heic", mime: "image/heic" },
  { ext: "jpg", mime: "image/jpeg" },
  { ext: "jpeg", mime: "image/jpeg" },
  { ext: "svg", mime: "image/svg+xml" },
  { ext: "pdf", mime: "application/pdf" },
  { ext: "eps", mime: "application/postscript" },
];

const PDF_TYPE: ExportFileType = { ext: "pdf", mime: "application/pdf" };

let host: ExportHost = {
  getUserFullName: () => Promise.resolve(null),
  getActiveWindowTitle: () => null,
  getFileTypes: () => DOCUMENT_FILE_TYPES,
};

function isStorage(target: unknown): target is ExportStorage {
  return (
    typeof target === "object" &&
    target !== null &&
    typeof (target as ExportStorage).canDownload === "function"
  );
}

function isFile(target: unknown): target is ExportFile {
  return (
    !isStorage(target) &&
    typeof target === "object" &&
    target !== null &&
    typeof (target as ExportFile).write === "function"
  );
}

/** A file in a ZipDirectory: write adds it to the archive. */
interface ZipFile extends ExportFile {
  _zipDirectory: ZipDirectoryEntry;
  _name: string;
}

/** A directory inside a ZIP being built (zip.js fs); exportBlob gives the archive. */
export class ZipDirectory implements ExportDirectory {
  _storage: unknown;
  _zipRoot: FS | null;
  _zipDirectory: ZipDirectoryEntry;

  constructor(storage?: unknown, zipDirectory?: ZipDirectoryEntry) {
    this._storage = storage;
    this._zipRoot = zipDirectory ? null : new FS();
    this._zipDirectory = zipDirectory || (this._zipRoot as FS).root;
  }

  async addDirectory(name: string): Promise<ExportDirectory> {
    return new ZipDirectory(this._storage, this._zipDirectory.addDirectory(name));
  }

  async addFile(name: string): Promise<ExportFile> {
    const file: ZipFile = {
      _zipDirectory: this._zipDirectory,
      _name: name,
      write(data: Uint8Array, onDone?: () => unknown): unknown {
        this._zipDirectory.addBlob(this._name, new Blob([data as Uint8Array<ArrayBuffer>]));
        if (onDone) return onDone();
        return undefined;
      },
    };
    return file;
  }

  exportBlob(callback: (blob: Blob) => void): void {
    this._zipDirectory.exportBlob(callback);
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old GExporter was a static-only object
export class Exporter {
  static ZipDirectory = ZipDirectory;

  /** Lets the app provide the user, the window title and the file types. */
  static setHost(newHost: ExportHost): void {
    host = newHost;
  }

  static getHost(): ExportHost {
    return host;
  }

  /**
   * The export list for `target` (a node, a list of nodes or a scene,
   * which stands for its visible pages). With `defaults` (the dialog's
   * settings) every target becomes one item; otherwise each element's
   * "__export" rows with a format become items. `assets` walks into
   * containers. A single target keeps the name in `defaults`; other
   * items are named after the element, or its type name with "_2", "_3",
   * ... for the second and later unnamed elements of a type.
   */
  static generateExportables(
    target: Node | Node[],
    defaults: Partial<Exportable> | null | undefined,
    assets: boolean,
  ): Exportable[] {
    let targets: Node[] = target instanceof Array ? target : [target];
    if (target instanceof Scene) {
      targets = target.getChildren().filter((node) => node instanceof Page && node.isVisible());
    }
    const out: Exportable[] = [];
    const unnamedCounts: Record<string, number> = {};
    const nameOf = (node: Node): string => {
      let name = hasProperties(node) ? (node.getProperty("name") as string) : "";
      if (!name) {
        const typeId = String(getTypeId(node));
        if (!Object.prototype.hasOwnProperty.call(unnamedCounts, typeId)) {
          unnamedCounts[typeId] = 0;
        }
        name = node.getNodeNameTranslated();
        const count = (unnamedCounts[typeId] as number) + 1;
        unnamedCounts[typeId] = count;
        if (count > 1) name += "_" + count;
      }
      return name;
    };
    const visit = (node: Node): void => {
      if (defaults) {
        out.push(
          extend({}, defaults, {
            element: node,
            name: 1 === targets.length && defaults.name ? defaults.name : nameOf(node),
          }) as Exportable,
        );
      } else if (hasProperties(node)) {
        const rows = node.getProperty(EXPORT_PROPERTY_NAME, true);
        if (rows && rows instanceof Array && rows.length) {
          const name = nameOf(node);
          for (const row of rows as ExportRow[]) {
            if (row.fm) {
              out.push(
                extend(
                  {},
                  { size: row.sz, suffix: row.sf, format: row.fm, element: node, name },
                ) as Exportable,
              );
            }
          }
        }
      }
      if (assets && hasContainer(node)) {
        for (let child = node.getFirstChild(); null !== child; child = child.getNext()) {
          if (child instanceof Element) visit(child);
        }
      }
    };
    for (const node of targets) visit(node);
    return out;
  }

  /**
   * Runs one export and calls `callback` with the Blob: PNG/JPEG through
   * BitmapExport at 72 dpi (JPEG quality jpegQuality/100, default 1),
   * SVG and PDF through their exporters. Throws "Unknown format." for
   * anything else (formats are lower case).
   */
  static exportExportable(
    exportable: Exportable,
    callback: (blob: Blob | null) => void,
    progress?: unknown,
    messenger?: ExportMessenger | null,
  ): void {
    const element = exportable.element;
    const format = exportable.format;
    if ("png" === format || "jpg" === format) {
      let type: string | null = null;
      let quality: number | null = null;
      switch (format) {
        case "png":
          type = Bitmap.ImageType.PNG;
          break;
        case "jpg":
          type = Bitmap.ImageType.JPEG;
          quality = (exportable.jpegQuality || 100) / 100;
      }
      const dpi = Length.DPI;
      const bitmap = exporters.BitmapExport.export(
        element as unknown as BitmapExportNode,
        exportable.size,
        exportable.backgroundColor,
        exportable.configuration,
        dpi,
        exportable.backgroundOpacity,
        true,
      );
      if (bitmap) bitmap.toImageBlob(type as string, callback, quality);
    } else if ("svg" === format) {
      exporters.SVGExport.export(
        element,
        {
          convertTextToPath: exportable.convertTextToPath,
          decimalPlacesPrecision: exportable.decimalPlacesPrecision,
          preserveEditingCapabilities: exportable.preserveEditingCapabilities,
          backgroundColor: exportable.backgroundColor,
          backgroundOpacity: exportable.backgroundOpacity,
          sceneBackground:
            !exportable.configuration ||
            exportable.configuration.sceneBackground ||
            !!exportable.backgroundColor,
          layerNamesAsId: exportable.layerNamesAsId,
        },
        (error, data) => {
          if (!error && data) callback(new Blob([data], { type: "image/svg+xml" }));
          // Reported like a PDF export error; the old code dropped it
          // (BUGS-FIXED.md "BUG-086 A broken image makes the SVG export
          // never finish").
          else if (error && messenger && messenger.error) messenger.error(error);
        },
      );
    } else {
      if (format !== PDF_TYPE.ext) throw new Error("Unknown format.");
      void host.getUserFullName().then((userName) => {
        const author = userName
          ? userName
          : (Locale.get(new LocaleKey("GDocument", "text.default-export-author")) as string);
        const options = {
          dpi: parseNumber(exportable.size),
          colorSpace: exportable.colorSpace,
          jpegQuality: exportable.jpegQuality || JPEG_EXPORT_QUALITY_DEFAULT,
          configuration: exportable.configuration,
          backgroundColor: exportable.backgroundColor,
          backgroundOpacity: exportable.backgroundOpacity,
          convertTextToPath: exportable.convertTextToPath,
          progress,
          user: author,
          title: host.getActiveWindowTitle(),
          downsampleImages: exportable.downsampleImages,
        };
        const job: PdfExportJob | null | undefined = exporters.PDFExport.export(
          element,
          options,
          (error, data) => {
            if (!error && data) callback(new Blob([data], { type: PDF_TYPE.mime }));
            if (messenger) {
              if ((job as PdfExportJob).isAbort()) {
                if (messenger.close) messenger.close();
              } else if (error && messenger.error) messenger.error(error);
            }
          },
          null,
          messenger,
        );
        if (messenger) messenger.abort = () => job && job.abort();
      });
    }
  }

  /**
   * sanitized name (`name` or the item's) + suffix + "." + format. With
   * `used`, a name and format already in it gets "(n)" before the
   * extension, n being the count so far plus one; `used` grows by the
   * name without the "(n)".
   */
  static generateExportName(
    exportable: Pick<Exportable, "name" | "suffix" | "format">,
    name?: string | null,
    used?: { name: string; format: string }[] | null,
  ): string {
    let fileName =
      sanitizeFilename((name || exportable.name) as string) + (exportable.suffix || "");
    if (used) {
      const same = used.filter(
        (entry) => entry.name === fileName && entry.format === exportable.format,
      );
      used.push({ name: fileName, format: exportable.format });
      if (same.length) fileName += "(" + (same.length + 1) + ")";
    }
    return (fileName += "." + exportable.format);
  }

  /**
   * Exports every item into `directory`. "/" in a name makes
   * subdirectories (reused case-insensitively). `onDone` runs once every
   * item is written; an item without a name is skipped and then `onDone`
   * never runs (old behaviour).
   */
  static async exportToDirectory(
    exportables: Exportable[],
    directory: ExportDirectory,
    onDone?: (() => void) | null,
    progress?: unknown,
  ): Promise<void> {
    const directories: Record<string, ExportDirectory> = {};
    let written = 0;
    const used: { name: string; format: string }[] = [];
    const countWritten = (): void => {
      if (++written === exportables.length && onDone) onDone();
    };
    const writeInto =
      (target: ExportDirectory, fileName: string) =>
      (blob: Blob | null): void => {
        const reader = new FileReader();
        reader.onload = () => {
          target
            .addFile(fileName)
            .then((file) => {
              file.write(new Uint8Array(reader.result as ArrayBuffer), countWritten);
            })
            .catch(countWritten);
        };
        if (blob instanceof Blob || (blob as unknown) instanceof File) {
          try {
            reader.readAsArrayBuffer(blob as Blob);
          } catch {
            countWritten();
          }
        } else countWritten();
      };
    for (let i = 0; i < exportables.length; ++i) {
      const exportable = exportables[i] as Exportable;
      let name: string | null | undefined = exportable.name;
      let target: ExportDirectory = directory;
      if (name) {
        if (name.indexOf("/") >= 0) {
          const parts: string[] = [];
          for (const part of name.split("/")) {
            const cleaned = sanitizeFilename(part.trim());
            if (cleaned) parts.push(cleaned);
          }
          if (parts.length > 1) {
            name = parts.pop() as string;
            let path = "";
            for (const part of parts) {
              if (path) path += "/";
              path += part.toLowerCase();
              const existing = directories[path];
              if (existing) target = existing;
              else {
                try {
                  target = await target.addDirectory(part);
                  directories[path] = target;
                } catch {
                  // Keep writing into the parent.
                }
              }
            }
          } else if (parts.length) name = parts[0] as string;
        } else name = sanitizeFilename(name.trim());
        if (name && target) {
          Exporter.exportExportable(
            exportable,
            writeInto(target, Exporter.generateExportName(exportable, name, used)),
            progress,
          );
        }
      }
    }
  }

  /**
   * Exports `exportables` to `target` (a file or a storage): one item is
   * saved (prompt or download), several PDF items outside assets mode are
   * merged into one PDF named `documentName`, other lists go into a
   * chosen directory or "<documentName>.zip".
   */
  static export(
    exportables: Exportable[],
    target: ExportFile | ExportStorage,
    documentName: string,
    onDone?: (() => void) | null,
    owner?: unknown,
    assets?: boolean,
    progress?: unknown,
    messenger?: ExportMessenger | null,
    onWriteError?: unknown,
    saveOptions?: unknown,
  ): void {
    const writeBlob = (blob: Blob, file: ExportFile, done?: (() => void) | null): void => {
      const reader = new FileReader();
      reader.onload = () => {
        file.write(
          new Uint8Array(reader.result as ArrayBuffer),
          () => (done ? done() : undefined),
          onWriteError,
        );
      };
      reader.readAsArrayBuffer(blob);
    };
    const save = (
      blob: Blob,
      name: string,
      done: (() => void) | null | undefined,
      type: ExportFileType | undefined,
      noPrompt: boolean,
      options: unknown,
    ): void => {
      if (isFile(target)) writeBlob(blob, target, done);
      else if (isStorage(target)) {
        if (!noPrompt && target.canPromptSave()) {
          target.savePrompt(name, [type], (file) => writeBlob(blob, file, done), owner, options);
        } else if (target.canDownload()) {
          target.download(name, (file) => writeBlob(blob, file, done), options);
        }
      }
    };
    let first = exportables[0] as Exportable;
    let several = exportables.length > 1;
    const fileType = host.getFileTypes().find((type) => type.ext === first.format);
    if (several && first.format === PDF_TYPE.ext && !assets) {
      several = false;
      first = extend({}, first) as Exportable;
      first.name = documentName;
      first.element = exportables.map((exportable) => exportable.element as Node);
    }
    if (several) {
      if (isStorage(target) && target.canChooseDirectory()) {
        target.chooseDirectory(
          (chosen) => {
            void Exporter.exportToDirectory(exportables, chosen, onDone, progress);
          },
          owner,
          () => {
            const zipDirectory = new ZipDirectory();
            void Exporter.exportToDirectory(
              exportables,
              zipDirectory,
              () => {
                zipDirectory.exportBlob((blob) => {
                  // The format's file type, not ZIP (old behaviour).
                  save(blob, documentName + ".zip", onDone, fileType, true, saveOptions);
                });
              },
              progress,
            );
          },
        );
      } else {
        const zipDirectory = new ZipDirectory();
        void Exporter.exportToDirectory(
          exportables,
          zipDirectory,
          () => {
            zipDirectory.exportBlob((blob) => {
              save(
                blob,
                documentName + ".zip",
                onDone,
                { ext: "zip", mime: "application/zip" },
                false,
                saveOptions,
              );
            });
          },
          progress,
        );
      }
    } else {
      const item = first;
      Exporter.exportExportable(
        item,
        (blob) => {
          const noPrompt =
            isStorage(target) &&
            target.canDownload() &&
            !!fileType &&
            fileType.ext === PDF_TYPE.ext;
          save(
            blob as Blob,
            Exporter.generateExportName(item),
            onDone,
            fileType,
            noPrompt,
            saveOptions,
          );
        },
        progress,
        messenger,
      );
    }
  }
}
