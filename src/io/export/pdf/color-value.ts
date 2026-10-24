// Old: chunk.vendor.js module 1109 (the PDF CMYK color).
import { CMYKColor } from "../../../engine/color/cmyk-color.ts";
import { PDFRGBColor } from "./cmyk-color-array.ts";
import { PDFArray } from "./pdf-array.ts";
import { PDFColor } from "./pdf-color.ts";

/**
 * A CMYK color (components 0..1): an engine CMYK color as it is, a
 * `cmyk(c,m,y,k[,a])` string, a component list, or anything PDFRGBColor
 * parses, converted from RGB.
 */
export class PDFCMYKColor extends PDFColor {
  _cmyk: number[];
  _alpha: number;

  constructor(value: unknown) {
    super();
    let alpha = 1;
    if (value instanceof CMYKColor) value = value.getValue();
    else if ("string" == typeof value && 0 === value.indexOf("cmyk")) {
      const parts = (value.match(/\d+(\.\d+)?/g) as RegExpMatchArray).map((part) =>
        parseFloat(part),
      );
      value = parts.slice(0, 4);
      if (5 == parts.length) alpha = parts[4] as number;
    }
    if (Array.isArray(value)) {
      this._cmyk = value as number[];
      this._alpha = alpha;
    } else {
      const rgb = new PDFRGBColor(value);
      this._cmyk = PDFColor.rgbToCMYK(rgb.asRGBA());
      this._alpha = rgb.getAlpha();
    }
  }

  override getAlpha(): number {
    return this._alpha;
  }

  asArray(): PDFArray {
    return new PDFArray([
      this._cmyk[0] || 0,
      this._cmyk[1] || 0,
      this._cmyk[2] || 0,
      this._cmyk[3] || 0,
    ]);
  }
}
