// Old: designer.browser.dev.js module 1472 (the heic2any loader).
/**
 * HEIC images (FMT-IMPORT-019): converted to a PNG blob by heic2any, which
 * is loaded on first use, then imported like any bitmap. Callers log
 * "HEIC conversion failed" when parse rejects.
 *
 * The converter comes from setHeicConverterLoader: heic2any is not a
 * dependency of the new app yet (the old one loaded its own chunk,
 * public/chunk.vendors~heic2any.js). Without a loader parse rejects, so
 * a HEIC file fails the way a broken one did.
 */

/** heic2any's call: options with the blob, a PNG blob (or several for a sequence) back. */
export type HeicConverter = (options: { blob: Blob }) => Promise<Blob | Blob[]>;

let loader: (() => Promise<HeicConverter>) | null = null;
let converter: HeicConverter | null = null;

/** Installs the function that loads heic2any (for example `() => import("heic2any").then(m => m.default)`). */
export function setHeicConverterLoader(load: (() => Promise<HeicConverter>) | null): void {
  loader = load;
  converter = null;
}

export class HeicImport {
  /** Loads the converter once; every call returns a new instance. */
  static async getInstance(): Promise<HeicImport> {
    if (!converter) {
      if (!loader) throw new Error("HEIC conversion is not available");
      converter = await loader();
    }
    return new HeicImport();
  }

  parse(blob: Blob): Promise<Blob | Blob[]> {
    return (converter as HeicConverter)({ blob });
  }
}
