/* eslint-disable @typescript-eslint/no-explicit-any -- scene nodes, font managers and the exporter are engine objects, typed loosely like ParityHandle */
/**
 * Hooks the io-export-svg scenarios need from both apps, at
 * window.__parity.app.svgExport. The old app's version is old-hooks.js in
 * this folder; the new app's is src/parity/app/svg-export.ts.
 *
 * The scenarios call the SVG exporter directly on scenes built with G
 * only (a workspace of their own with a fixed font setup), so they run
 * before the editor and the export dialog exist. The dialog's path
 * (GExporter.exportExportable) is in import-export/export-engine.spec.ts.
 */

/** What GSVGExport.export passed to its callback. */
export interface SvgExportOutcome {
  /** Whether the callback ran before the timeout (false also when export threw). */
  called: boolean;
  /** The callback's error as a string, or "<Name> message" when export threw. */
  error: string | null;
  /** The SVG text the callback received. */
  svg: string | null;
}

export interface SvgExportHooks {
  /** GSVGExport itself (old module 1455), for the static queries. */
  exporter(): any;
  /** The export compatibility checks (old module 1235). */
  exportCompat(): any;
  /**
   * Runs `body` with `fontManager` installed as the font manager of the
   * OpenType text meter (old module 416, `fontManager` property), so text
   * measured while building and exporting uses the scenario's fonts in
   * both apps. Restores the previous one afterwards.
   */
  withTextMeter<T>(fontManager: any, body: () => Promise<T>): Promise<T>;
  /**
   * GSVGExport.export(node, options, callback). Resolves with what the
   * callback received, or with `called: false` when it didn't run within
   * `timeoutMs` (default 30 s) or export threw.
   */
  export(
    node: any,
    options: Record<string, unknown> | null,
    timeoutMs?: number,
  ): Promise<SvgExportOutcome>;
}
