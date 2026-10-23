/* global window, setTimeout, clearTimeout */
// PDF export helpers for the old app, attached as window.__parity.app.pdfExport.
// The new app implements the same interface (see contract.ts). Module
// numbers are the old webpack module ids:
//   797 exporter registry {GBitmapExport, GPDFExport, GSVGExport}
(() => {
  const parity = window.__parity;
  if (!parity || parity.app.pdfExport) return;
  const { app } = parity;
  const exporters = app.require(797);

  app.pdfExport = {
    export(element, options, timeoutMs) {
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
          () => finish({ called: false, error: null, data: null }),
          timeoutMs || 120000,
        );
        try {
          exporters.GPDFExport.export(element, options, (error, data) =>
            finish({ called: true, error: error || null, data: data || null }),
          );
        } catch (error) {
          finish({ called: false, error, data: null });
        }
      });
    },
  };
})();
