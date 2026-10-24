// Old: chunk.vendor.js module 390 (the PDF color base).
import { Color } from "../../../engine/color/color.ts";
import type { PDFArray } from "./pdf-array.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/**
 * A color in one of the PDF color spaces, written as its components
 * each followed by a space (the operator comes after).
 *
 * The old color classes were GBaseObject subclasses with this as a mixin,
 * so they weren't GPDFObjects; nothing wraps a color in a value, so
 * making them PDFObjects changes no output.
 */
export abstract class PDFColor extends PDFObject {
  hasTransparency(): boolean {
    return (null != this.getAlpha() ? this.getAlpha() : 1) < 1;
  }

  getAlpha(): number {
    return 1;
  }

  override equals(other: unknown): boolean {
    return other instanceof PDFColor && this.asArray().equals(other.asArray());
  }

  override write(output: PDFOutput): void {
    this.asArray().forEach((value) => {
      value.write(output);
      output.writeSpace();
    });
  }

  abstract asArray(): PDFArray;

  /** The CMYK components (0..1) of a packed RGBA value. */
  static rgbToCMYK(rgba: number): number[] {
    return Color.rgbToCMYK([(rgba >> 24) & 255, (rgba >> 16) & 255, (rgba >> 8) & 255]);
  }
}
