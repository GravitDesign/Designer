/**
 * Scenarios CI doesn't run. The expected output was recorded on a desktop
 * machine; GitHub's Windows runners render blend modes, effects and PDF
 * rasters a few pixels differently and give the old app's window other
 * frame sizes, and the set of affected scenarios changes from run to run.
 * The old app fails these there just like the new one, so they say nothing
 * about the port on CI. They still run everywhere else.
 */
const CI_SKIP: readonly RegExp[] = [
  // Blend modes and multiple fills (canvas compositing).
  /^engine-model\/render\/blend-(element|layer)-/,
  /^corpus\/(blend-modes|blend-layers-opacity|fills-multiple)\//,
  /^corpus\/matrix\/blend-and-composite$/,
  /^import-export\/corpus\/(blend-modes|blend-layers-opacity|fills-multiple)$/,
  // WebGL effects and their PDF rasters.
  /^import-export\/corpus\/effects-/,
  /^io-export-pdf\/(corpus|export)\/effects-/,
  /^import-export\/export\/pdf\/effects-150dpi(\.render)?$/,
  // Print and quick export PDFs (rasterized content).
  /^import-export\/ui\/(print|print-pdf|print-pdf\.render|quick-export-menu)$/,
  // The old desktop app's window frame and its Add Fonts timing.
  /^electron\/(window|settings-persist)$/,
];

/** Whether CI skips the scenario (only when the CI variable is set). */
export function skippedOnCi(id: string): boolean {
  return !!process.env.CI && CI_SKIP.some((pattern) => pattern.test(id));
}

export const CI_SKIP_REASON = "differs on the CI runners' renderer; see parity/support/ci-skip.ts";
