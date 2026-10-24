// Old: chunk.vendor.js module 1393 (GPDFImport).
//
// Imports PDF pages as GPages: pdf.js (with Gravit's CMYK patch) renders
// each page into the canvas bridge, which turns the drawing into nodes.
// The callback gets (error, pages, missingFonts, embeddedFonts) once the
// fonts the texts asked for have resolved (FMT-IMPORT-009). AI files are
// PDFs too; with an aiCallback the import first checks the XMP format and
// lets the caller decide (FMT-IMPORT-011).
//
// A document pdf.js can't open calls back with the error (the old loading
// promise had no rejection handler; "A broken or encrypted PDF never
// finishes loading" in BUGS-FIXED.md).
//
// Kept: a font that resolves is added to the resolved list as a
// one-element slice that is never matched, so readiness only depends on
// the counts.
import { extend } from "../../../engine/core/util.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Page } from "../../../engine/scene/page.ts";
import { Font } from "../../../engine/text/fonts/font.ts";
import {
  FontAvailableEvent,
  FontUnavailableEvent,
  type FontManager,
} from "../../../engine/text/fonts/font-manager.ts";
import { CanvasHolder } from "../../export/canvas-holder.ts";
import { updateList } from "../fonts/google-font-names.ts";
import { PdfCanvasFactory } from "./canvas-factory.ts";
import { getImportCanvasGraphicsClass } from "./canvas-graphics.ts";
import { PdfCanvasBridge } from "./pdf-canvas-bridge.ts";
import { getDocument, getPdfJs } from "./pdfjs.ts";

export interface PdfImportOptions {
  startPage?: number;
  endPage?: number;
  /** Extra getDocument parameters. */
  pdfjsOptions?: Record<string, unknown>;
}

export type PdfImportCallback = (
  error: unknown,
  pages?: Page[],
  missingFonts?: string[],
  embeddedFonts?: Font[],
) => void;

/** (page or operator index, total). */
export type PdfImportProgress = (done: number, total: number) => void;

/** Asked for AI files; calling `proceed` runs the import. */
export type PdfAiCallback = (proceed: () => void) => void;

/**
 * Hands the bridge the scenario's or app's font manager and waits until
 * every font the import asked for and that wasn't resolved yet has become
 * available or failed.
 */
export class FontManagerProxy {
  _fontManager: FontManager;
  _unresolvedFonts: Font[];
  _resolvedFonts: unknown[];
  _promise: Promise<void>;
  _promiseCapability: { resolve: () => void; reject: (reason: unknown) => void };

  constructor(fontManager: FontManager) {
    this._fontManager = fontManager;
    this._fontManager.addEventListener(FontAvailableEvent, this._fontEvent, this);
    this._fontManager.addEventListener(FontUnavailableEvent, this._fontEvent, this);
    this._unresolvedFonts = [];
    this._resolvedFonts = [];
    const capability = {} as FontManagerProxy["_promiseCapability"];
    this._promise = new Promise<void>((resolve, reject) => {
      capability.resolve = resolve;
      capability.reject = reject;
    });
    this._promiseCapability = capability;
  }

  getFont(family: string, style: string, weight: number): Font {
    const font = this._fontManager.getFont(family, style, weight) as Font;
    if (
      !font.isResolved() &&
      !this._unresolvedFonts.some(
        (known) =>
          known.getFamily() === family &&
          known.getStyle() === style &&
          known.getWeight() === weight,
      )
    )
      this._unresolvedFonts.push(font);
    return font;
  }

  getDefaultFont(): Font | null {
    return this._fontManager.getDefaultFont();
  }

  getFonts(): Font[] {
    return this._fontManager._fonts;
  }

  release(): void {
    this._promiseCapability.resolve();
    this._fontManager.removeEventListener(FontAvailableEvent, this._fontEvent, this);
    this._fontManager.removeEventListener(FontUnavailableEvent, this._fontEvent, this);
  }

  _fontEvent(event: { font: Font }): void {
    let index = -1;
    if (
      this._unresolvedFonts.some((font, i) => {
        if (!Font.equals(event.font, font)) return false;
        index = i;
        return true;
      })
    )
      // Sic: slice, not splice (see the file comment).
      this._resolvedFonts.push(this._unresolvedFonts.slice(index, 1));
    this._checkUnresolvedFonts();
  }

  ready(callback: () => void): void {
    void this._promise.then(callback);
    this._checkUnresolvedFonts();
  }

  _checkUnresolvedFonts(): void {
    if (this._resolvedFonts.length >= this._unresolvedFonts.length)
      this._promiseCapability.resolve();
  }
}

export const PDFImport = {
  FontManagerProxy: FontManagerProxy,

  /** Replaces the family list embedded fonts are matched against (FMT-IMPORT-028). */
  updateFontFamilies(families: readonly string[] | null | undefined): void {
    updateList(families);
  },

  /**
   * Whether the PDF's XMP metadata says it was saved by Illustrator.
   *
   * Differs from the old code, which never destroyed the document: the
   * worker is ended once the metadata is read. A load or getMetadata
   * rejection still leaves the worker running, as before (and so does a
   * failed render in import()). Nothing users see changes.
   */
  isAIFormat(data: unknown): Promise<boolean> {
    const { task, terminate } = getDocument({ data });
    return task.promise.then((document): Promise<boolean> =>
      document.getMetadata().then((info) => {
        terminate();
        const format = info && info.metadata && info.metadata.get("dc:format");
        return !!format && "application/vnd.adobe.illustrator" === format;
      }),
    );
  },

  import(
    data: Blob | ArrayBuffer | Uint8Array,
    options: PdfImportOptions,
    fontManager: FontManager,
    callback: PdfImportCallback,
    progress?: PdfImportProgress | null,
    aiCallback?: PdfAiCallback | null,
  ): void {
    if (data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = () => {
        PDFImport.import(
          reader.result as ArrayBuffer,
          options,
          fontManager,
          callback,
          progress,
          aiCallback,
        );
      };
      reader.readAsArrayBuffer(data);
      return;
    }
    if (aiCallback) {
      PDFImport.isAIFormat(data)
        .then((isAI) => {
          if (isAI)
            aiCallback(() =>
              PDFImport.import(data, options, fontManager, callback, progress, null),
            );
          else PDFImport.import(data, options, fontManager, callback, progress, null);
        })
        .catch((error: unknown) => {
          callback(error);
        });
      return;
    }
    const fonts = new FontManagerProxy(fontManager);
    const done: PdfImportCallback = (...args) => {
      fonts.release();
      callback(...args);
    };
    const params = extend({ data, disableCMYKToRGB: true }, options.pdfjsOptions || {});
    const pdfjs = getPdfJs();
    const { task, terminate } = getDocument(params);
    // A document pdf.js can't open (broken, or locked with a user
    // password) or a page it can't load calls back with the error ("A
    // broken or encrypted PDF never finishes loading" in BUGS-FIXED.md).
    const fail = (error: unknown): void => {
      terminate();
      done(error || new Error("the PDF could not be read"));
    };
    task.then((document) => {
      const missingFonts: string[] = [];
      let embeddedFonts: Font[] = [];
      const pages: Page[] = [];
      let pageNumber = options.startPage || 1;
      const firstPage = pageNumber;
      const lastPage = options.endPage || options.startPage || document.numPages;
      const count = lastPage - firstPage;
      const nextPage = () => {
        const page = new Page();
        pages.push(page);
        if (progress && count > 1) progress(pageNumber, count);
        document.getPage(pageNumber).then((pdfPage) => {
          const viewport = pdfPage.getViewport({ scale: 1 });
          const canvas = new CanvasHolder(viewport.width, viewport.height);
          page.setProperties(["w", "h", "bck"], [viewport.width, viewport.height, RGBColor.WHITE]);
          const bridge = new PdfCanvasBridge(page, canvas, fonts as unknown as FontManager);
          const renderOptions: Record<string, unknown> = {
            canvasContext: bridge,
            viewport,
            canvasGraphicsClass: getImportCanvasGraphicsClass(pdfjs),
            canvasFactory: new PdfCanvasFactory(),
          };
          // Single pages report progress per operator.
          if (document.numPages === 1) renderOptions.progress = progress;
          pdfPage
            .render(renderOptions)
            .promise.then(() => {
              for (const name of bridge.getMissingFonts()) {
                if (missingFonts.indexOf(name) === -1) missingFonts.push(name);
              }
              const added: Font[] = [];
              for (const font of bridge.getEmbeddedFonts()) {
                if (!embeddedFonts.some((known) => Font.equals(known, font))) added.push(font);
              }
              embeddedFonts = embeddedFonts.concat(added);
              pdfPage.cleanup();
              if (pageNumber + 1 > lastPage) {
                fonts.ready(() => {
                  document.cleanup();
                  void document.destroy();
                  terminate();
                  done(null, pages, missingFonts, embeddedFonts);
                });
              } else {
                pageNumber++;
                nextPage();
              }
            })
            .catch((error: unknown) => {
              if (error) console.log((error as { stack?: string }).stack || error);
              done(error);
            });
        }, fail);
      };
      nextPage();
    }, fail);
  },
};

/**
 * Old: chunk.vendor.js module 1132 (Sketch image fills that hold a PDF):
 * renders the PDF's first page to a PNG data URL with plain pdf.js.
 *
 * Kept: the old code asked for page `{scale: 1}` instead of page 1, which
 * pdf.js rejects, so the promise never settles and the fill keeps its
 * placeholder.
 */
export function renderPdfImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const { task } = getDocument({ url: dataUrl });
    void task.promise.then((document) => {
      void document.getPage({ scale: 1 } as unknown as number).then((page) => {
        const viewport = page.getViewport({ scale: 1 });
        const canvas = window.document.createElement("canvas");
        const options = { canvasContext: canvas.getContext("2d"), viewport };
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        void page.render(options).promise.then(() => resolve(canvas.toDataURL()));
      });
    });
  });
}
