// Old: chunk.vendor.js module 1217 (the PDF matrix operator).
import type { Transform } from "../../../engine/math/transform.ts";
import { PDFArray } from "./pdf-array.ts";
import { PDFNumber } from "./pdf-number.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/** `a b c d e f <operator>` for a transform. */
export class PDFMatrixOperator extends PDFObject {
  operator: string;
  gtransform: Transform;

  constructor(operator: string, transform: Transform) {
    super();
    this.operator = operator;
    this.gtransform = transform;
  }

  override write(output: PDFOutput): void {
    this.asArray().forEach((value) => {
      value.write(output);
      output.writeSpace();
    });
    output.write(this.operator);
  }

  asArray(): PDFArray {
    const matrix = this.gtransform.getMatrix();
    const array = new PDFArray();
    array.push(this._normalizeNumber(matrix[0] as number));
    array.push(this._normalizeNumber(matrix[1] as number));
    array.push(this._normalizeNumber(matrix[2] as number));
    array.push(this._normalizeNumber(matrix[3] as number));
    array.push(this._normalizeNumber(matrix[4] as number));
    array.push(this._normalizeNumber(matrix[5] as number));
    return array;
  }

  _normalizeNumber(value: number): number {
    return PDFNumber.normalizeNumber(value);
  }
}
