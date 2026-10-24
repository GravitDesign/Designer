/* global window, setTimeout, clearTimeout, atob */
// SVG import helpers for the old app, attached as window.__parity.app.svgImport.
// The new app implements the same interface (see contract.ts). Module
// numbers are the old webpack module ids:
//   1390 GSVGImport (not in the G barrel; the app requires it directly)
//    416 the OpenType text meter; its `fontManager` is the font manager
//        the importer's text measurement falls back to
(() => {
  const parity = window.__parity;
  if (!parity || parity.app.svgImport) return;
  const { app } = parity;
  const svgImport = app.require(1390);
  const measure = app.require(416);

  function decode(source) {
    if (typeof source.text === "string") return source.text;
    const binary = atob(source.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  app.svgImport = {
    import(source, options, fontManager, timeoutMs) {
      return new Promise((resolve) => {
        const previous = measure.fontManager;
        measure.fontManager = fontManager;
        let done = false;
        let timer = null;
        const finish = (outcome) => {
          if (done) return;
          done = true;
          measure.fontManager = previous;
          if (timer) clearTimeout(timer);
          resolve(outcome);
        };
        timer = setTimeout(
          () => finish({ called: false, error: null, node: null, info: null }),
          timeoutMs || 10000,
        );
        try {
          svgImport.import(decode(source), options, fontManager, (error, node, info) =>
            finish({ called: true, error: error || null, node: node || null, info: info || null }),
          );
        } catch (error) {
          finish({ called: false, error, node: null, info: null });
        }
      });
    },
  };
})();
