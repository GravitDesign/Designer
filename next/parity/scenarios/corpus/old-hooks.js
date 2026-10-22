/* global window, document, requestAnimationFrame, setTimeout */
// Corpus helpers for the old app, attached as window.__parity.app.corpus.
// The new app implements the same interface (see contract.ts).
(() => {
  const parity = window.__parity;
  if (!parity || parity.app.corpus) return;
  const { G, app } = parity;

  const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Every image and texture pattern in the scene has finished loading.
  function assetsReady() {
    const scene = app.scene();
    if (!scene) return false;
    let ready = true;
    const checkPattern = (pt) => {
      if (pt && typeof pt.isReady === "function" && !pt.isReady()) ready = false;
    };
    const visit = (node) => {
      if (node instanceof G.GImage && node.getStatus() !== G.GImage.ImageStatus.Loaded) {
        if (node.getStatus() !== G.GImage.ImageStatus.Error) ready = false;
      }
      if (typeof node.getPaintLayers === "function" && node.getPaintLayers()) {
        for (let l = node.getPaintLayers().getFirstChild(); l; l = l.getNext()) {
          checkPattern(l.getProperty("_pt"));
        }
      }
      if (typeof node.getProperty === "function" && node.hasProperty && node.hasProperty("bck")) {
        checkPattern(node.getProperty("bck"));
      }
      if (typeof node.getFirstChild === "function") {
        for (let c = node.getFirstChild(); c; c = c.getNext()) visit(c);
      }
    };
    visit(scene);
    return ready;
  }

  function fontsReady() {
    const fm = app.scene().getWorkspace().getFontManager();
    return !fm.hasPendingFonts() && document.fonts.status === "loaded";
  }

  // The view has no repaint scheduled and its tile renderer has no queued
  // or running render request.
  function viewIdle() {
    const view = app.view();
    const sceneCanvas = view._sceneCanvas;
    const queue = sceneCanvas._renderQueue;
    return view._repaintRequestFrameId == null && (!queue || queue.length === 0);
  }

  async function settle(options) {
    const quietFrames = (options && options.quietFrames) || 10;
    const timeout = (options && options.timeout) || 120000;
    const start = Date.now();
    let quiet = 0;
    while (quiet < quietFrames) {
      if (Date.now() - start > timeout) throw new Error("corpus.settle: timed out");
      await frame();
      if (assetsReady() && fontsReady() && viewIdle()) quiet++;
      else quiet = 0;
    }
  }

  // Waits until the document with the given title is active and loaded.
  async function waitForDocument(title, timeout) {
    const start = Date.now();
    for (;;) {
      const doc = app.designer.getActiveDocument();
      // Status Ready (1) comes after Loading (10) and Loaded (12); before
      // that the scene is still being restored in time slices.
      if (
        doc &&
        doc.getTitle() === title &&
        doc.getStatus() === 1 &&
        doc.getScene() &&
        doc.getEditor()
      )
        break;
      if (Date.now() - start > (timeout || 120000)) {
        throw new Error("corpus.waitForDocument: " + title + " did not open");
      }
      await sleep(50);
    }
    // The panels around the canvas may still change size (the theme style
    // sheet loads late, and the app relayouts 500 ms after a resize), which
    // moves the view box. Wait until it and the number of scene nodes have
    // not changed for a second.
    const layout = () => {
      const r = app.view().getViewBox(true);
      let nodes = 0;
      app.scene().acceptChildren(() => {
        nodes++;
      });
      return [
        nodes,
        window.innerWidth,
        window.innerHeight,
        r.getX(),
        r.getY(),
        r.getWidth(),
        r.getHeight(),
      ].join(",");
    };
    let last = layout();
    let stableSince = Date.now();
    while (Date.now() - stableSince < 1000) {
      if (Date.now() - start > (timeout || 120000)) {
        throw new Error("corpus.waitForDocument: layout of " + title + " does not settle");
      }
      await sleep(50);
      const now = layout();
      if (now !== last) {
        last = now;
        stableSince = Date.now();
      }
    }
    await settle();
  }

  app.corpus = { settle, waitForDocument, assetsReady, fontsReady, viewIdle };
})();
