/* eslint-disable @typescript-eslint/no-explicit-any -- pages and font managers are engine objects, typed loosely like ParityHandle */
/**
 * Hooks the io-import-sketch scenarios need from both apps, at
 * window.__parity.app.sketchImport. The old app's version is old-hooks.js
 * in this folder; the new app's is src/parity/app/sketch-import.ts.
 */

export interface SketchImportOutcome {
  /** Whether the importer called its callback before the timeout. */
  called: boolean;
  /**
   * The callback's argument: `{ pages, replacedFonts }` on success, a
   * message string or `{ v50error: true }` on failure, or what import threw.
   */
  result: any;
}

export interface SketchImportHooks {
  /**
   * GSketchImport.import(bytes, options, callback) with the file given as
   * base64 (passed to the importer as a Uint8Array). `options.workspace`
   * is set to a new GWorkspace whose font manager is `fontManager`, and
   * `fontManager` is also installed as the font manager of the OpenType
   * text meter (old module 416, `fontManager` property) until `release()`,
   * because symbol text overrides measure text after the callback.
   * Resolves with what the callback received, or with `called: false`
   * when it didn't run within `timeoutMs` (default 10 s).
   */
  import(
    base64: string,
    options: Record<string, unknown>,
    fontManager: any,
    timeoutMs?: number,
  ): Promise<SketchImportOutcome>;
  /** Puts the text meter's previous font manager back. */
  release(): void;
}
