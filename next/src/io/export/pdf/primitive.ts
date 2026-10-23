// Old: chunk.vendor.js module 1110 (the PDF primitive).
import { PDFNumber } from "./pdf-number.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput, PDFToken } from "./output.ts";

/** A plain value written as its string form; numbers go through normalizeNumber. */
export class PDFPrimitive extends PDFObject {
  // Sic: the old field name.
  primitve: unknown;

  constructor(value: unknown) {
    super();
    this.primitve = value;
  }

  override write(output: PDFOutput): void {
    let value = this.primitve;
    if ("number" == typeof value) value = PDFNumber.normalizeNumber(value);
    output.write(value as PDFToken);
  }
}
