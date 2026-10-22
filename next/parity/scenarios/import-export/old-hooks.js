/* global window, document, requestAnimationFrame, setTimeout, clearTimeout, FileReader */
// Import/export helpers for the old app, attached as
// window.__parity.app.importExport. The new app implements the same
// interface (see contract.ts). Every function here calls the code path the
// old app's UI uses; module numbers are the old webpack module ids:
//   1253 GExporter (export dialog, Export panel, page "Export Page")
//    797 exporter registry {GBitmapExport, GPDFExport, GSVGExport}
//
// The registries and the file-type table are not exposed: scenarios read
// those facts from what the user sees (file chooser accept lists, the
// Export menu, the workers an import starts).
(() => {
  const parity = window.__parity;
  if (!parity || parity.app.importExport) return;
  const { G, app } = parity;
  const req = app.require;
  const exporter = () => req(1253);
  const exporters = () => req(797);
  // GDocument status numbers (module 163's status table) by name.
  const STATUS = {
    0: "Init",
    1: "Ready",
    10: "Loading",
    11: "LoadFailed",
    12: "Loaded",
    13: "LoadCancelled",
    20: "Saving",
    21: "SaveFailed",
    22: "Saved",
  };

  const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Every image and texture pattern under root has finished loading.
  function imagesReady(root) {
    let ready = true;
    const pattern = (pt) => {
      if (pt && typeof pt.isReady === "function" && !pt.isReady()) ready = false;
    };
    const visit = (node) => {
      if (node instanceof G.GImage) {
        const s = node.getStatus();
        if (s !== G.GImage.ImageStatus.Loaded && s !== G.GImage.ImageStatus.Error) ready = false;
      }
      if (typeof node.getPaintLayers === "function" && node.getPaintLayers()) {
        for (let l = node.getPaintLayers().getFirstChild(); l; l = l.getNext()) {
          pattern(l.getProperty("_pt"));
        }
      }
      if (typeof node.hasProperty === "function" && node.hasProperty("bck")) {
        pattern(node.getProperty("bck"));
      }
      if (typeof node.getFirstChild === "function") {
        for (let c = node.getFirstChild(); c; c = c.getNext()) visit(c);
      }
    };
    visit(root);
    return ready;
  }

  function textBoxes(root) {
    const out = [];
    const visit = (node) => {
      if (node instanceof G.GText) {
        const b = node.getGeometryBBox();
        out.push(b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()].join(",") : "-");
      }
      if (typeof node.getFirstChild === "function") {
        for (let c = node.getFirstChild(); c; c = c.getNext()) visit(c);
      }
    };
    visit(root);
    return out.join(";");
  }

  function fontsReady(scene) {
    const fm = scene.getWorkspace().getFontManager();
    return !fm.hasPendingFonts() && document.fonts.status === "loaded";
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ""));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  app.importExport = {
    /**
     * Waits until every image and texture pattern of the active scene (or
     * `root`) has loaded, no font is pending and a few frames passed
     * without either changing.
     */
    async settle(root) {
      const start = Date.now();
      let quiet = 0;
      let last = "";
      while (quiet < 5) {
        if (Date.now() - start > 30000) throw new Error("importExport.settle timed out");
        const scene = app.scene();
        // Texts lay themselves out again once their font has loaded; wait
        // until their boxes stop changing too.
        const sig = textBoxes(root || scene);
        const ok = imagesReady(root || scene) && fontsReady(scene) && sig === last;
        last = sig;
        quiet = ok ? quiet + 1 : 0;
        await frame();
        await sleep(20);
      }
    },

    /** GExporter.exportExportable: resolves with the Blob it produces. */
    exportExportable(exportable, timeoutMs) {
      return new Promise((resolve, reject) => {
        const t = setTimeout(
          () => reject(new Error("export produced no output")),
          timeoutMs || 30000,
        );
        try {
          exporter().exportExportable(exportable, (blob) => {
            clearTimeout(t);
            resolve(blob);
          });
        } catch (e) {
          clearTimeout(t);
          reject(e);
        }
      });
    },

    /** GExporter.generateExportables(target, defaults, assetsMode). */
    generateExportables(target, defaults, assets) {
      return exporter().generateExportables(target, defaults, assets);
    },

    /** GExporter.generateExportName(exportable, name, usedNames). */
    generateExportName(exportable, name, used) {
      return exporter().generateExportName(exportable, name, used);
    },

    /** GBitmapExport.convertSizeToScale(w, h, spec, dpi) -> [sx, sy, effective dpi]. */
    convertSizeToScale(w, h, spec, dpi) {
      const out = [0];
      const s = exporters().GBitmapExport.convertSizeToScale(w, h, spec, dpi, out);
      return [s.getX(), s.getY(), out[0]];
    },

    /** GBitmapExport.getBitmapPaintArea(node, spec, dpi) -> [x, y, w, h]. */
    bitmapPaintArea(node, spec, dpi) {
      const r = exporters().GBitmapExport.getBitmapPaintArea(node, spec, dpi);
      return [r.getX(), r.getY(), r.getWidth(), r.getHeight()];
    },

    /** GBitmapExport.getMaximumCanvasSize(). */
    maximumCanvasSize() {
      return exporters().GBitmapExport.getMaximumCanvasSize();
    },

    /** GSVGExport.getUnsupportedFeatures(node) (what the post-export dialog lists). */
    svgUnsupportedFeatures(node) {
      return exporters().GSVGExport.getUnsupportedFeatures(node);
    },

    /** GPDFExport.isSupported(node, withEffects, size). */
    pdfIsSupported(node, withEffects, size) {
      return exporters().GPDFExport.isSupported(node, withEffects, size);
    },

    /**
     * The open documents in tab order: title and load status
     * ("Loading", "Loaded", "LoadFailed", ...).
     */
    documents() {
      return app.designer.getDocuments().map((d) => ({
        title: d.getTitle(),
        status: STATUS[d.getStatus()] || String(d.getStatus()),
      }));
    },

    blobToBase64,
  };
})();
