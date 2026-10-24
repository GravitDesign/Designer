// Old: chunk.vendor.js module 1398.
//
// pdf.js's TilingPattern without the clip to the pattern's bounding box:
// the import's canvas bridge records drawing instead of painting it, and
// a clip would wrap the tile's content in a clipping group.
import type { PdfJs, PdfTilingPatternClass } from "./pdfjs.ts";

const classes = new WeakMap<PdfJs, PdfTilingPatternClass>();

export function getTilingPatternClass(pdfjs: PdfJs): PdfTilingPatternClass {
  let TilingPattern = classes.get(pdfjs);
  if (!TilingPattern) {
    TilingPattern = class extends pdfjs.TilingPattern {
      clipBbox(): void {}
    };
    classes.set(pdfjs, TilingPattern);
  }
  return TilingPattern;
}
