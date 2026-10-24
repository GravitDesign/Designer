// Old: chunk.vendor.js module 1411 (GPDFShowText).
import type { PDFArray } from "./pdf-array.ts";
import { PDFObject } from "./pdf-object.ts";
import { PDFOperators } from "./operators.ts";
import type { PDFOutput } from "./output.ts";

/** `[strings and kerning] TJ` and a newline. */
export class PDFShowText extends PDFObject {
  _array: PDFArray;

  constructor(array: PDFArray) {
    super();
    this._array = array;
  }

  override write(output: PDFOutput): void {
    this._array.write(output);
    output.writeln(PDFOperators.TJ);
  }

  override toString(): string {
    return "[Object GPDFShowText]";
  }
}
