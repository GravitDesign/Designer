/* global window, setTimeout, clearTimeout */
// SVG export helpers for the old app, attached as
// window.__parity.app.svgExport. The new app implements the same
// interface (see contract.ts). Module numbers are the old webpack module
// ids:
//   1455 GSVGExport (not in the G barrel; GExporter requires it directly)
//   1235 the export compatibility checks GSVGExport and GPDFExport share
//    416 the OpenType text meter; its `fontManager` is the font manager
//        text measurement falls back to
(() => {
  const parity = window.__parity;
  if (!parity || parity.app.svgExport) return;
  const { app } = parity;
  const svgExport = app.require(1455);
  const exportCompat = app.require(1235);
  const measure = app.require(416);

  app.svgExport = {
    exporter() {
      return svgExport;
    },

    exportCompat() {
      return exportCompat;
    },

    async withTextMeter(fontManager, body) {
      const previous = measure.fontManager;
      measure.fontManager = fontManager;
      try {
        return await body();
      } finally {
        measure.fontManager = previous;
      }
    },

    export(node, options, timeoutMs) {
      return new Promise((resolve) => {
        let done = false;
        let timer = null;
        const finish = (outcome) => {
          if (done) return;
          done = true;
          if (timer) clearTimeout(timer);
          resolve(outcome);
        };
        timer = setTimeout(
          () => finish({ called: false, error: null, svg: null }),
          timeoutMs || 30000,
        );
        try {
          svgExport.export(node, options, (error, svg) =>
            finish({
              called: true,
              error: error ? String(error) : null,
              svg: typeof svg === "string" ? svg : null,
            }),
          );
        } catch (error) {
          finish({
            called: false,
            error: "<" + String(error && error.name) + "> " + String(error && error.message),
            svg: null,
          });
        }
      });
    },
  };
})();
