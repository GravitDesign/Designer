/* eslint-disable @typescript-eslint/no-explicit-any -- scene nodes and font managers are engine objects, typed loosely like ParityHandle */
/**
 * Hooks the io-import-svg scenarios need from both apps, at
 * window.__parity.app.svgImport. The old app's version is old-hooks.js in
 * this folder; the new app's is src/parity/app/svg-import.ts.
 */

/** What GSVGImport.import receives as its source. */
export type SvgSource = { text: string } | { base64: string };

export interface SvgImportOutcome {
  /** Whether the importer called its callback before the timeout. */
  called: boolean;
  /** The callback's first argument (null on success), or what import threw. */
  error: unknown;
  /** The imported node (GGroup, GPage, a single element) or null. */
  node: any;
  /** The callback's third argument: { width, height, unit }. */
  info: { width?: number; height?: number; unit?: string | null } | null;
}

export interface SvgImportHooks {
  /**
   * GSVGImport.import(source, options, fontManager, callback) with
   * `fontManager` also installed as the font manager of the OpenType text
   * meter (old module 416, `fontManager` property) until the callback
   * runs, so text measured during the import uses the same fonts in both
   * apps. Text sources are passed as strings, base64 sources as a
   * Uint8Array. Resolves with what the callback received, or with
   * `called: false` when it didn't run within `timeoutMs` (default 10 s).
   */
  import(
    source: SvgSource,
    options: Record<string, unknown>,
    fontManager: any,
    timeoutMs?: number,
  ): Promise<SvgImportOutcome>;
}
