/**
 * app.bitmapExport for the io-export-bitmap scenarios (contract in
 * parity/scenarios/io-export-bitmap/contract.ts): BitmapExport.export
 * through the exporter registry, as old-hooks.js calls GBitmapExport.export
 * in the old app.
 */
import type { PaintStyle } from "../../engine/paint/paint-canvas.ts";
import type { Bitmap } from "../../engine/paint/bitmap.ts";
import type { BitmapExportNode } from "../../io/export/bitmap-export.ts";
import { exporters } from "../../io/export/index.ts";

function exportBitmap(
  node: BitmapExportNode,
  size: string,
  backgroundColor: PaintStyle | null,
  configuration: Record<string, unknown> | null,
  dpi: number,
  backgroundOpacity: number,
  clampToMax: boolean,
): Bitmap | null {
  return exporters.BitmapExport.export(
    node,
    size,
    backgroundColor,
    configuration,
    dpi,
    backgroundOpacity,
    clampToMax,
  );
}

export const bitmapExportHooks = {
  bitmapExport: { export: exportBitmap },
};
