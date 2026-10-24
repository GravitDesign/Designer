// Old: chunk.vendor.js module 1416 (the PDF stitching function).
import type { PDFArray } from "./pdf-array.ts";
import { PDFFunction } from "./function.ts";

/** Type 3: one function per gradient segment. */
export class PDFStitchingFunction extends PDFFunction {
  constructor(encode: PDFArray, bounds: PDFArray, functions: PDFArray) {
    super(3);
    this.put("/Encode", encode);
    this.put("/Bounds", bounds);
    this.put("/Functions", functions);
  }
}
