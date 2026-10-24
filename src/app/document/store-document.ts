// Old: designer.browser.dev.js module 163 (GDocument.store).
/**
 * Writes a document to a storage item in the item's format: .gvdesign
 * through io/gvdesign/store.ts (FMT-GVD-002), and the quick exports
 * (FMT-EXPORT-041): SVG and SVGZ of the active page, PNG and JPG of the
 * active page at 1x and 72 dpi (JPG on white), PDF of the whole scene.
 * Without `options.export` the document goes Saving, then Saved and
 * Ready (or SaveFailed and Ready), and a .gvdesign save marks the
 * editor's save point and adds the file to the recent files.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Length } from "../../engine/math/length.ts";
import type { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { gzipJson } from "../../io/gvdesign/format.ts";
import { GvdesignStoreError, storeGvdesign } from "../../io/gvdesign/store.ts";
import { BitmapExport } from "../../io/export/bitmap-export.ts";
import { Exporter } from "../../io/export/exporter.ts";
import { exporters } from "../../io/export/index.ts";
import { config } from "../config.ts";
import type { StorageItem } from "../storage/storage.ts";
import { DocumentEvent } from "./document-event.ts";
import { documentDialogs, gContainer, gDesigner } from "./document-host.ts";
import { DocumentStatus } from "./document-status.ts";
import { FileTypes } from "./file-types.ts";

/** The save options callers pass (also handed to the serializer). */
export interface StoreOptions {
  /** Write without status changes or a save point (exports). */
  export?: boolean;
  filename?: string;
  referer?: unknown;
  exportOptions?: Record<string, unknown>;
  suppressMessages?: boolean;
  dpi?: number;
  jpegQuality?: number;
  [key: string]: unknown;
}

/** What store needs of the document. */
export interface StoreTarget {
  _scene: Scene | null;
  _storageItem: StorageItem | null;
  getEditor(): { markSavePoint(): unknown } | null;
  getTitle(): string;
  buildPreview(): Promise<Blob | null>;
  _updateStatus(status: number, data?: unknown): void;
}

const DEFAULT_EXTENSION = (
  config.FILE_FORMATS.find((format) => format.default) as { ext: string }
).ext.toUpperCase();
const SECONDARY_FORMATS = config.FILE_FORMATS.filter((format) => format.secondary);

const text = (group: string, key: string): string =>
  Locale.get(new LocaleKey(group, key)) as string;

/** The save's progress options (the old `u`); the window sets progress with the Saving status. */
interface SaveProgress {
  progress: ((percent: number) => void) | null;
  progressInfo?: (info: unknown) => void;
  filename?: string;
  ext: string | null;
  referer?: unknown;
}

export async function storeDocument(
  document: StoreTarget,
  target: StorageItem | null | undefined,
  done?: (() => void) | null,
  fail?: ((error?: unknown) => void) | null,
  options: StoreOptions = {},
): Promise<void> {
  const saving = !options.export;
  const failed = (error?: unknown): void => {
    if (saving) {
      document._updateStatus(DocumentStatus.SaveFailed, error);
      document._updateStatus(DocumentStatus.Ready);
    }
    if (fail) fail(error);
  };
  const container = gContainer();
  if (container) container.verifyEnoughMemoryToSave(document);
  if (!document._scene) return failed();
  const scene = document._scene;
  const item = target || document._storageItem;
  if (!item) throw new Error("Unable to save, no storage item available.");
  const extension = item.getExtension();
  const progress: SaveProgress = {
    progress: null,
    filename: options.filename,
    ext: extension && extension.toLowerCase(),
    referer: options.referer,
  };
  if (saving) document._updateStatus(DocumentStatus.Saving, progress);
  const written = (): void => {
    if (saving) {
      document._updateStatus(DocumentStatus.Saved);
      document._updateStatus(DocumentStatus.Ready);
    }
    const native =
      extension === DEFAULT_EXTENSION ||
      -1 !== SECONDARY_FORMATS.findIndex((format) => format.ext.toUpperCase() === extension);
    const editor = document.getEditor();
    if (native && editor && saving) editor.markSavePoint();
    if (saving && gDesigner().hasEventListeners(DocumentEvent)) {
      gDesigner().trigger(new DocumentEvent(DocumentEvent.Type.Modified, document));
    }
    try {
      if (extension === DEFAULT_EXTENSION) gDesigner().addToRecentFiles?.(item);
    } finally {
      if (done) done();
    }
  };
  const write = (bytes: Uint8Array): void => {
    item.write(bytes, written, failed, progress.progress, document as never);
  };
  const report = (percent: number): void => {
    if (progress.progress && progress.progress instanceof Function) progress.progress(percent);
  };
  const bitmapTypes = [FileTypes.JPEG.ext, FileTypes.JPG.ext, FileTypes.PNG.ext].map((ext) =>
    ext.toUpperCase(),
  );
  const jpegTypes = [FileTypes.JPEG.ext, FileTypes.JPG.ext].map((ext) => ext.toUpperCase());
  if (extension === DEFAULT_EXTENSION) {
    try {
      write(
        await storeGvdesign(scene, {
          ...options,
          progress: report,
          preview: () => document.buildPreview(),
        }),
      );
    } catch (error) {
      if (error instanceof GvdesignStoreError) {
        failed(error.localeKey ? text(error.localeKey.group, error.localeKey.key) : error.message);
      } else throw error;
    }
  } else if (SECONDARY_FORMATS.find((format) => format.ext.toUpperCase() === extension)) {
    failed(text("GDocument", "text.cannot-save"));
  } else if ("SVG" === extension || "SVGZ" === extension) {
    const page = scene.getActivePage() as Page;
    exporters.SVGExport.export(page, options.exportOptions || {}, (error, svg) => {
      if (error || !svg) return failed();
      if (
        !options.suppressMessages &&
        !gDesigner().getSetting("disable_warning_unsupported_features", false)
      ) {
        const features = exporters.SVGExport.getUnsupportedFeatures(scene.getActivePage());
        if (features && features.length) documentDialogs().unsupportedFeatures(features);
      }
      if ("SVGZ" === extension) write(gzipJson(svg));
      else write(new TextEncoder().encode(svg));
      return undefined;
    });
  } else if (extension && bitmapTypes.includes(extension)) {
    const page = scene.getActivePage() as Page;
    const bitmap = BitmapExport.export(
      page as never,
      null,
      jpegTypes.includes(extension) ? RGBColor.WHITE : null,
      null,
      Length.DPI,
      1,
      true,
    );
    if (bitmap) bitmap.toImageBuffer(extension, (buffer) => write(new Uint8Array(buffer)));
  } else if ("PDF" === extension) {
    void Exporter.getHost()
      .getUserFullName()
      .then((userName) => {
        const author = userName ? userName : text("GDocument", "text.default-export-author");
        exporters.PDFExport.export(
          scene,
          {
            dpi: options.dpi || 72,
            progress: progress.progress,
            user: author,
            jpegQuality: options.jpegQuality || config.JPEG_EXPORT_QUALITY_DEFAULT,
            title: document.getTitle(),
          },
          (error, data) => {
            if (error || !data) return failed(text("GCommonNames", "text.pdf-export-error"));
            void new Blob([data]).arrayBuffer().then((buffer) => write(new Uint8Array(buffer)));
            return undefined;
          },
          null,
          { message: (info: unknown) => progress.progressInfo && progress.progressInfo(info) },
        );
      });
  } else failed();
}
