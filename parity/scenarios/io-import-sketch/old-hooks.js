/* global window, setTimeout, clearTimeout, atob */
// Sketch import helpers for the old app, attached as
// window.__parity.app.sketchImport. The new app implements the same
// interface (see contract.ts). Module numbers are the old webpack ids:
//   1121 GSketchImport
//    280 GWorkspace
//    416 the OpenType text meter; its `fontManager` is the font manager
//        symbol text overrides measure with
(() => {
  const parity = window.__parity;
  if (!parity || parity.app.sketchImport) return;
  const { app } = parity;
  const sketchImport = app.require(1121);
  const Workspace = app.require(280);
  const measure = app.require(416);
  const saved = [];

  function decode(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  app.sketchImport = {
    import(base64, options, fontManager, timeoutMs) {
      return new Promise((resolve) => {
        saved.push(measure.fontManager);
        measure.fontManager = fontManager;
        const workspace = new Workspace();
        workspace._fontManager = fontManager;
        let done = false;
        let timer = null;
        const finish = (outcome) => {
          if (done) return;
          done = true;
          if (timer) clearTimeout(timer);
          resolve(outcome);
        };
        timer = setTimeout(() => finish({ called: false, result: null }), timeoutMs || 10000);
        try {
          sketchImport.import(decode(base64), { ...options, workspace }, (result) =>
            finish({ called: true, result }),
          );
        } catch (error) {
          finish({ called: false, result: error });
        }
      });
    },
    release() {
      if (saved.length) measure.fontManager = saved[0];
      saved.length = 0;
    },
  };
})();
