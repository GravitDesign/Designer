/* global window */
// Bitmap export helpers for the old app, attached as
// window.__parity.app.bitmapExport. The new app implements the same
// interface (see contract.ts). Module numbers are the old webpack module ids:
//   797 exporter registry {GBitmapExport, GPDFExport, GSVGExport}
(() => {
  const parity = window.__parity;
  if (!parity || parity.app.bitmapExport) return;
  const { app } = parity;
  const exporters = app.require(797);

  app.bitmapExport = {
    export(node, size, backgroundColor, configuration, dpi, backgroundOpacity, clampToMax) {
      return exporters.GBitmapExport.export(
        node,
        size,
        backgroundColor,
        configuration,
        dpi,
        backgroundOpacity,
        clampToMax,
      );
    },
  };
})();
