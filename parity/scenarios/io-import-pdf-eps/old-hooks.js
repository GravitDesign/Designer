/* global window, setTimeout, clearTimeout, atob, Blob */
// PDF, EPS and bitmap import helpers for the old app, attached as
// window.__parity.app.pdfEpsImport. The new app implements the same
// interface (see contract.ts). Module numbers are the old webpack ids:
//   1393 GPDFImport, 1403 GEPSImport, 1405 GBitmapImport (not in the G
//        barrel; the app requires the importer index 1201)
//   1203 the Google font family list GPDFImport.updateFontFamilies replaces
//    416 the OpenType text meter; its `fontManager` is used by measureText
(() => {
  const parity = window.__parity;
  if (!parity || parity.app.pdfEpsImport) return;
  const { app } = parity;
  const pdfImport = app.require(1393);
  const epsImport = app.require(1403);
  const bitmapImport = app.require(1405);
  const fontNames = app.require(1203);
  const measure = app.require(416);

  function bytes(source) {
    const binary = atob(source.base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  function errorText(error) {
    if (error === null || error === undefined) return null;
    if (typeof error === "string") return error;
    if (typeof error === "object")
      return "<" + String(error.name) + ": " + String(error.message) + ">";
    return String(error);
  }

  // Runs `start(finish)` with the scenario's font manager in the text
  // meter and the given family list, resolving with what `finish` gets or
  // with `timedOut` after timeoutMs.
  function run(fontManager, families, timeoutMs, timedOut, start) {
    return new Promise((resolve) => {
      const previousManager = measure.fontManager;
      const previousList = fontNames._list;
      if (fontManager) measure.fontManager = fontManager;
      if (families) pdfImport.updateFontFamilies(families);
      let done = false;
      let timer = null;
      const finish = (outcome) => {
        if (done) return;
        done = true;
        measure.fontManager = previousManager;
        fontNames._list = previousList;
        if (timer) clearTimeout(timer);
        resolve(outcome);
      };
      timer = setTimeout(() => finish(timedOut()), timeoutMs || 15000);
      try {
        start(finish);
      } catch (error) {
        finish(Object.assign(timedOut(), { error: errorText(error), threw: true }));
      }
    });
  }

  app.pdfEpsImport = {
    importPdf(source, options, fontManager, flags, timeoutMs) {
      const progress = [];
      let aiAsked = false;
      return run(
        fontManager,
        flags.families || null,
        timeoutMs,
        () => ({
          called: false,
          error: null,
          pages: null,
          missingFonts: null,
          embeddedFonts: null,
          progress,
          aiAsked,
        }),
        (finish) => {
          const aiCallback = flags.ai
            ? (proceed) => {
                aiAsked = true;
                if (flags.ai === "continue") proceed();
                else
                  finish({
                    called: false,
                    error: null,
                    pages: null,
                    missingFonts: null,
                    embeddedFonts: null,
                    progress,
                    aiAsked,
                  });
              }
            : undefined;
          pdfImport.import(
            bytes(source),
            options,
            fontManager,
            (error, pages, missingFonts, embeddedFonts) =>
              finish({
                called: true,
                error: errorText(error),
                pages: pages || null,
                missingFonts: missingFonts || null,
                embeddedFonts: embeddedFonts || null,
                progress,
                aiAsked,
              }),
            flags.progress ? (done, total) => progress.push([done, total]) : undefined,
            aiCallback,
          );
        },
      );
    },

    isAIFormat(source, timeoutMs) {
      return run(
        null,
        null,
        timeoutMs,
        () => ({ called: false, result: null, error: null }),
        (finish) => {
          pdfImport
            .isAIFormat(bytes(source))
            .then((result) => finish({ called: true, result, error: null }))
            .catch((error) => finish({ called: true, result: null, error: errorText(error) }));
        },
      );
    },

    importEps(source, outlineFonts, fontManager, timeoutMs) {
      const progress = [];
      const errors = [];
      return run(
        fontManager,
        null,
        timeoutMs,
        () => ({
          called: false,
          error: null,
          node: null,
          size: null,
          background: null,
          errors,
          progress,
        }),
        (finish) => {
          epsImport.import(
            bytes(source),
            outlineFonts,
            fontManager,
            (error, node, size, background) =>
              // Queued errors are reported right after this callback.
              setTimeout(
                () =>
                  finish({
                    called: true,
                    error: errorText(error),
                    node: node || null,
                    size: size || null,
                    background: background || null,
                    errors,
                    progress,
                  }),
                0,
              ),
            (message) => errors.push(message),
            (percent) => progress.push(percent),
          );
        },
      );
    },

    importBitmap(source, timeoutMs) {
      return run(
        null,
        null,
        timeoutMs,
        () => ({ called: false, error: null, url: null, width: null, height: null }),
        (finish) => {
          bitmapImport.import(
            new Blob([bytes(source)], { type: source.type }),
            (error, url, width, height) =>
              finish({
                called: true,
                error: errorText(error),
                url: url || null,
                width: width === undefined ? null : width,
                height: height === undefined ? null : height,
              }),
          );
        },
      );
    },
  };
})();
