// Old: chunk.vendor.js module 1440 (the PDF page box).
import { PDFArray } from "./pdf-array.ts";
import { PDFNumber } from "./pdf-number.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/**
 * A page box. It is written as `[top left width height]`: the old code
 * put y first and the size where PDF expects the upper right corner.
 * Pages start at 0 0 so the media box comes out right; the bleed box
 * doesn't (kept, see "PDF bleed box is written as x y width height" in
 * QUESTIONS.md).
 */
export class PDFMediaBox extends PDFObject {
  declare left: number;
  declare top: number;
  declare width: number;
  declare height: number;

  constructor(left: number, top: number, width: number, height: number) {
    super();
    this.top = top;
    this.left = left;
    this.width = width;
    this.height = height;
  }

  /** A y coordinate measured from the bottom of the page, as PDF counts. */
  relativeY(y: number): number {
    return PDFNumber.normalizeNumber(this.height - y);
  }

  override write(output: PDFOutput): void {
    const array = new PDFArray();
    array.push(this.top);
    array.push(this.left);
    array.push(this.width);
    array.push(this.height);
    array.write(output);
  }
}

Object.assign(PDFMediaBox.prototype, { left: null, top: null, width: null, height: null });
