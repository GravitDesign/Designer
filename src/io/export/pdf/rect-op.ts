// Old: chunk.vendor.js module 1230 (the PDF `re` operator).
import { PDFNumber } from "./pdf-number.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/** `x y width height re`, the numbers as given (already in page coordinates). */
export class PDFRectangle extends PDFObject {
  _x: number;
  _y: number;
  _width: number;
  _height: number;

  constructor(x: number, y: number, width: number, height: number) {
    super();
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
  }

  override write(output: PDFOutput): void {
    output.write(PDFNumber.normalizeNumber(this._x));
    output.writeSpace();
    output.write(PDFNumber.normalizeNumber(this._y));
    output.writeSpace();
    output.write(PDFNumber.normalizeNumber(this._width));
    output.writeSpace();
    output.write(PDFNumber.normalizeNumber(this._height));
    output.writeSpace();
    output.write("re");
  }
}
