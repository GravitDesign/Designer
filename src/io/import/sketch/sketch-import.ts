// Old: chunk.vendor.js module 1121 (GSketchImport).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { renderPdfImage } from "../pdf/pdf-import.ts";
import { SketchFile, type SketchImportResult, type SketchLoadOptions } from "./sketch-file.ts";
import { SketchTexturePattern } from "./sketch-texture-pattern.ts";

// The old image fill called pdf.js itself (module 1132), so every Sketch
// import can render PDF image fills, whichever entry point loaded it.
SketchTexturePattern.pdfRenderer = renderPdfImage;

/**
 * What the callback receives: the result on success; on failure the zip
 * reader's message (an unknown format becomes the localized
 * "unsupported version" text), `{ v50error: true }` for Sketch 50 and
 * later, or whatever else was thrown.
 */
export type SketchImportCallback = (result: SketchImportResult | unknown) => void;

/**
 * Imports a Sketch 49 file (FMT-IMPORT-015). The file picker never offers
 * .sketch (FMT-IMPORT-002, QUESTIONS.md Q-008).
 */
export const SketchImport = {
  import(
    source: ArrayBuffer | Uint8Array | Blob | null | undefined,
    options: SketchLoadOptions | null | undefined,
    callback: SketchImportCallback,
  ): void {
    if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
      const bytes = source instanceof ArrayBuffer ? new Uint8Array(source) : source;
      SketchImport.import(
        new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/zip" }),
        options,
        callback,
      );
      return;
    }
    // The old test was `!source || (!source) instanceof Blob`, so anything
    // truthy passes.
    if (!source) {
      callback("Invalid sketch file.");
      return;
    }
    const fail = (error: unknown): void => {
      if ("File format is not recognized." === error)
        error = Locale.get(new LocaleKey("GSketchImport", "text.unsupported-version"));
      if ("Sketch file v50+ is not supproted yet." === error) error = { v50error: true };
      callback(error);
    };
    const file = new SketchFile(source);
    file
      .load(options)
      .then(() => {
        file.parse().then(callback).catch(fail);
      })
      .catch(fail);
  },
};
