// Old: chunk.vendor.js module 1111 (the PDF gray color).
import { PDFRGBColor } from "./cmyk-color-array.ts";
import { PDFArray } from "./pdf-array.ts";
import { PDFColor } from "./pdf-color.ts";

/**
 * A DeviceGray color made from the alpha of a color: soft masks paint
 * opacity as gray.
 */
export class PDFGrayColor extends PDFColor {
  _alpha: number;

  constructor(value: unknown) {
    super();
    this._alpha = new PDFRGBColor(value).getAlpha();
  }

  override getAlpha(): number {
    return this._alpha;
  }

  asArray(): PDFArray {
    return new PDFArray([this._alpha]);
  }
}
