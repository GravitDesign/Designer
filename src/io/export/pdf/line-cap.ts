// Old: chunk.vendor.js module 1221 (the PDF line cap).
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/** `n J`; no style means butt, which also resets it after a stroke. */
export class PDFLineCap extends PDFObject {
  static Style = { BUTT: 0, ROUND: 1, SQUARE: 2 } as const;

  declare _style: number;

  constructor(style?: number) {
    super();
    this._style = style || PDFLineCap.Style.BUTT;
  }

  override write(output: PDFOutput): void {
    output.write(this._style);
    output.writeSpace();
    output.write("J");
  }
}

PDFLineCap.prototype._style = PDFLineCap.Style.BUTT;
