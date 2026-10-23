// Old: chunk.vendor.js module 1412 (GPDFSetLineWidthOperation).
import { PDFNumber } from "./pdf-number.ts";
import { PDFObject } from "./pdf-object.ts";
import { PDFOperators } from "./operators.ts";
import type { PDFOutput } from "./output.ts";

/** `n w`. */
export class PDFSetLineWidthOperation extends PDFObject {
  declare _width: number | null;

  constructor(width: number) {
    super();
    this._width = width;
  }

  override write(output: PDFOutput): void {
    output.write(PDFNumber.normalizeNumber(this._width));
    output.writeSpace();
    output.write(PDFOperators.setLineWidth);
  }

  override toString(): string {
    return "[GPDFSetLineWidthOperation]";
  }
}

PDFSetLineWidthOperation.prototype._width = null;
