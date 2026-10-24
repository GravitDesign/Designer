// Old: chunk.vendor.js module 1417 (the PDF exponential function).
import { PDFFunction } from "./function.ts";

/** Type 2: interpolates between /C0 and /C1 (the gradient fills those in). */
export class PDFExponentialFunction extends PDFFunction {
  constructor() {
    super(2);
  }
}
