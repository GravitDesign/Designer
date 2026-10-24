/* eslint-disable @typescript-eslint/no-explicit-any -- scene nodes and colors are engine objects, typed loosely like ParityHandle */
/**
 * Hooks the io-export-pdf scenarios need from both apps, at
 * window.__parity.app.pdfExport. The old app's version is old-hooks.js in
 * this folder; the new app's is src/parity/app/pdf-export.ts.
 */

/** The option object GExporter.exportExportable builds for GPDFExport.export. */
export interface PdfExportOptions {
  dpi: number;
  colorSpace?: "rgb" | "cmyk";
  jpegQuality: number;
  configuration?: Record<string, unknown> | null;
  backgroundColor?: any;
  backgroundOpacity?: number;
  convertTextToPath?: boolean;
  /** The signed-in user's full name; the PDF's /Author. */
  user: string;
  /** The window title; the PDF's /Title. */
  title: string;
  downsampleImages?: boolean;
}

export interface PdfExportOutcome {
  /** Whether the exporter called its callback before the timeout. */
  called: boolean;
  /** The callback's first argument (null on success), or what export threw. */
  error: unknown;
  /** The callback's second argument: the file's bytes. */
  data: any;
}

export interface PdfExportHooks {
  /**
   * GPDFExport.export(element, options, callback) with no writer and no
   * dialog (old module 1406, reached through the exporter registry, module
   * 797). `element` is a page, an element or an array of pages. Resolves
   * with what the callback received, or `called: false` when it didn't run
   * within `timeoutMs` (default 120 s).
   */
  export(element: any, options: PdfExportOptions, timeoutMs?: number): Promise<PdfExportOutcome>;
}
