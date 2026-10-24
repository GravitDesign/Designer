// Old: chunk.vendor.js module 440 (the PDF `cm` operator).
import type { Transform } from "../../../engine/math/transform.ts";
import { PDFMatrixOperator } from "./operator.ts";

/** `a b c d e f cm`: concatenates a transform to the current matrix. */
export class PDFConcatMatrix extends PDFMatrixOperator {
  constructor(transform: Transform) {
    super("cm", transform);
  }
}
