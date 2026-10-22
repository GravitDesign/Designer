/* eslint-disable @typescript-eslint/no-explicit-any -- scene nodes and exportables are engine objects, typed loosely like ParityHandle */
/**
 * Hooks the import-export scenarios need from both apps, at
 * window.__parity.app.importExport. The old app's version is old-hooks.js
 * in this folder; the new app must implement the same functions with the
 * same results. Each one is the code path a UI element uses, so the new
 * app should route them through the same functions its UI calls.
 */

/**
 * What the export dialog, the Export panel and "Export Page" pass to the
 * exporter (old GExporter, module 1253). Colors are engine GColor objects.
 */
export interface Exportable {
  element: any;
  format: "png" | "jpg" | "svg" | "pdf" | string;
  /** "1x", "2x", "512w", "128h", "100x50", "300dpi" ... */
  size?: string;
  suffix?: string;
  name?: string;
  jpegQuality?: number;
  backgroundColor?: any;
  backgroundOpacity?: number;
  colorSpace?: "rgb" | "cmyk";
  configuration?: {
    ignoreEffects?: boolean;
    forceEffectsWhenZoomed?: boolean;
    sceneBackground?: boolean;
    isOutline?: () => boolean;
  };
  convertTextToPath?: boolean;
  decimalPlacesPrecision?: number;
  preserveEditingCapabilities?: boolean;
  layerNamesAsId?: boolean;
  overrideBackground?: boolean;
  downsampleImages?: boolean;
}

export interface FileTypeRow {
  /** Table key, e.g. "GVDESIGN". */
  key: string;
  ext: string;
  mime: string;
  category?: string;
  load?: boolean;
  store?: boolean;
  import_image?: boolean;
  pro?: boolean;
}

export interface ImportExportHooks {
  /**
   * Resolves once every image of the active scene (or of `root`) has
   * loaded or failed, no font is pending, the boxes of all texts stopped
   * changing (texts lay out again once their font loads) and that held
   * for a few frames. Rejects after 30 s.
   */
  settle(root?: any): Promise<void>;
  /**
   * Exports one exportable like the export dialog does and resolves with
   * the Blob handed to the save step (old GExporter.exportExportable).
   * Rejects when the exporter throws (unknown format) or produces nothing
   * within `timeoutMs` (default 30 s).
   */
  exportExportable(exportable: Exportable, timeoutMs?: number): Promise<Blob | null>;
  /**
   * The export list for a target (old GExporter.generateExportables):
   * a scene expands to its visible pages; `defaults` (dialog settings) or,
   * when null, each element's "__export" rows; `assets` recurses into
   * containers.
   */
  generateExportables(
    target: any,
    defaults: Partial<Exportable> | null,
    assets: boolean,
  ): Exportable[];
  /**
   * File name for an exportable (old GExporter.generateExportName):
   * sanitized name + suffix + "(n)" for duplicates in `used` + "." + format.
   * `used` is updated in place.
   */
  generateExportName(
    exportable: Exportable,
    name?: string | null,
    used?: { name: string; format: string }[],
  ): string;
  /** Scale and dpi for a size spec: [scaleX, scaleY, dpi] (old GBitmapExport.convertSizeToScale). */
  convertSizeToScale(
    width: number,
    height: number,
    spec: string,
    dpi?: number,
  ): [number, number, number];
  /** Exported pixel area for a node and size spec: [x, y, w, h] (old GBitmapExport.getBitmapPaintArea). */
  bitmapPaintArea(node: any, spec: string, dpi: number): [number, number, number, number];
  /** The largest canvas the bitmap exporter allows: { width, height, area }. */
  maximumCanvasSize(): { width: number; height: number; area: number };
  /** Feature names the SVG exporter can't represent (shown after an SVG export). */
  svgUnsupportedFeatures(node: any): unknown[];
  /** Whether the PDF exporter accepts the node (raster size guard). */
  pdfIsSupported(node: any, withEffects: boolean, size: string): boolean;
  /** Class names in the importer registry, in registry order. */
  importerNames(): string[];
  /** Class names in the exporter registry, in registry order. */
  exporterNames(): string[];
  /** The file-type table in table order. */
  fileTypes(): FileTypeRow[];
  /** Extensions offered by open, place and drop, in order. */
  openFileTypes(): string[];
  /** The worker URL the PDF importer gives pdf.js. */
  pdfWorkerSrc(): string;
  /** A Blob's bytes as base64 (no data: prefix). */
  blobToBase64(blob: Blob): Promise<string>;
}
