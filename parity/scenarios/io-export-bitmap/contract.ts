/* eslint-disable @typescript-eslint/no-explicit-any -- scene nodes, colors and bitmaps are engine objects, typed loosely like ParityHandle */
/**
 * Hooks the io-export-bitmap scenarios need from both apps, at
 * window.__parity.app.bitmapExport. The old app's version is old-hooks.js
 * in this folder; the new app's is src/parity/app/bitmap-export.ts.
 */
export interface BitmapExportHooks {
  /**
   * GBitmapExport.export(node, size, backgroundColor, configuration, dpi,
   * backgroundOpacity, clampToMax) (old module 798, reached through the
   * exporter registry, module 797): the GBitmap to encode, or null. The
   * scenarios encode it with GBitmap.toImageBlob, as GExporter does.
   */
  export(
    node: any,
    size: string,
    backgroundColor: any,
    configuration: Record<string, unknown> | null,
    dpi: number,
    backgroundOpacity: number,
    clampToMax: boolean,
  ): any;
}
