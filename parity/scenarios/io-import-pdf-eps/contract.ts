/* eslint-disable @typescript-eslint/no-explicit-any -- scene nodes, fonts and font managers are engine objects, typed loosely like ParityHandle */
/**
 * Hooks the io-import-pdf-eps scenarios need from both apps, at
 * window.__parity.app.pdfEpsImport. The old app's version is old-hooks.js
 * in this folder; the new app's is src/parity/app/pdf-eps-import.ts.
 *
 * Every hook installs `fontManager` (when given) as the font manager of
 * the OpenType text meter (old module 416) while the import runs, so text
 * measured during the import uses the scenario's fonts in both apps, and
 * resolves with `called: false` when the importer doesn't answer within
 * `timeoutMs` (default 15 s).
 */

/** File bytes, base64 encoded (with a MIME type for bitmaps). */
export interface BinarySource {
  base64: string;
  type?: string;
}

export interface PdfImportFlags {
  /** Passed to GPDFImport.updateFontFamilies before the import; the old list comes back afterwards. */
  families?: string[] | null;
  /** Pass a progress callback and record its calls. */
  progress?: boolean;
  /** Pass the AI callback: "continue" runs the import when asked, "stop" ends the hook. */
  ai?: "continue" | "stop";
}

export interface PdfImportOutcome {
  called: boolean;
  /** The callback's error (strings as is, objects as "<name: message>"). */
  error: string | null;
  /** One GPage per imported page. */
  pages: any[] | null;
  missingFonts: string[] | null;
  /** The embedded fonts (GOpenTypeFont subclasses) the import registered. */
  embeddedFonts: any[] | null;
  /** [page or operator index, total] per progress call. */
  progress: [number, number][];
  /** Whether the AI callback was asked. */
  aiAsked: boolean;
  /** Set when import threw synchronously. */
  threw?: boolean;
}

export interface EpsImportOutcome {
  called: boolean;
  error: string | null;
  /** The GGroup with the imported elements. */
  node: any;
  size: unknown;
  /** The page background the EPS defined (a GPattern), or null. */
  background: any;
  /** Messages the error callback received (localized texts). */
  errors: string[];
  progress: number[];
  threw?: boolean;
}

export interface BitmapImportOutcome {
  called: boolean;
  error: string | null;
  url: string | null;
  width: number | null;
  height: number | null;
}

export interface PdfEpsImportHooks {
  /** GPDFImport.import(bytes, options, fontManager, callback, progress?, aiCallback?). */
  importPdf(
    source: BinarySource,
    options: Record<string, unknown>,
    fontManager: any,
    flags: PdfImportFlags,
    timeoutMs?: number,
  ): Promise<PdfImportOutcome>;
  /** GPDFImport.isAIFormat(bytes). */
  isAIFormat(
    source: BinarySource,
    timeoutMs?: number,
  ): Promise<{ called: boolean; result: boolean | null; error: string | null }>;
  /** GEPSImport.import(bytes, outlineFonts, fontManager, drawCallback, errorCallback, progress). */
  importEps(
    source: BinarySource,
    outlineFonts: boolean,
    fontManager: any,
    timeoutMs?: number,
  ): Promise<EpsImportOutcome>;
  /** GBitmapImport.import(blob, callback). */
  importBitmap(source: BinarySource, timeoutMs?: number): Promise<BitmapImportOutcome>;
}
