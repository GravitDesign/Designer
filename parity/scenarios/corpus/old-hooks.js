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

  const toBase64 = (bytes) => {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(s);
  };
  const fromBase64 = (b64) => {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  };

  // Saves the active document through File > Download File (action
  // file.save-as.gvdesign), the same code a user runs. The local storage
  // hands the bytes to FileSaver, which turns them into a Blob URL and
  // clicks a download link; the Blob is taken from URL.createObjectURL on
  // the way, and the click is let through (Playwright accepts downloads).
  async function saveDocumentBytes(timeout) {
    const original = URL.createObjectURL;
    let captured = null;
    URL.createObjectURL = function (blob) {
      // The preview JPEG goes through a FileReader, not a Blob URL, so the
      // first non-image Blob is the file.
      if (!captured && blob instanceof Blob && !/^image\//.test(blob.type)) captured = blob;
      return original.apply(this, arguments);
    };
    try {
      app.execute("file.save-as.gvdesign");
      const start = Date.now();
      while (!captured) {
        if (Date.now() - start > (timeout || 60000)) {
          throw new Error("corpus.saveDocumentBytes: the save produced no file");
        }
        await sleep(20);
      }
    } finally {
      URL.createObjectURL = original;
    }
    return toBase64(new Uint8Array(await captured.arrayBuffer()));
  }

  // Opens bytes as a file through File > Open Local File (action
  // file.open): the action shows the hidden file input, which gets the
  // bytes as a File instead of a native picker, then the app reads it the
  // way it reads any chosen file. Resolves once the document is loaded
  // (waitForDocument).
  async function openDocumentBytes(base64, fileName) {
    const click = HTMLInputElement.prototype.click;
    let input = null;
    HTMLInputElement.prototype.click = function () {
      if (this.type === "file") {
        // Keep the input instead of opening the native file picker.
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        input = this;
      } else click.call(this);
    };
    try {
      app.execute("file.open");
      const start = Date.now();
      while (!input) {
        if (Date.now() - start > 10000) throw new Error("corpus.openDocumentBytes: no file input");
        await sleep(10);
      }
    } finally {
      HTMLInputElement.prototype.click = click;
    }
    const transfer = new DataTransfer();
    transfer.items.add(new File([fromBase64(base64)], fileName));
    input.files = transfer.files;
    input.dispatchEvent(new Event("change"));
    await waitForDocument(fileName.replace(/\.gvdesign$/, ""));
  }

  // Every open document with its load state.
  function documentStates() {
    const names = { 1: "ready", 10: "loading", 12: "loaded" };
    return app.designer.getDocuments().map((d) => ({
      title: d.getTitle(),
      status: names[d.getStatus()] || String(d.getStatus()),
      hasScene: !!d.getScene(),
    }));
  }

  app.corpus = {
    documentStates,
    settle,
    waitForDocument,
    assetsReady,
    fontsReady,
    viewIdle,
    saveDocumentBytes,
    openDocumentBytes,
  };
})();
