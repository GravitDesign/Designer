// Old: chunk.vendor.js module 1222 (the PDF line join).
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/** `n j`; no style means miter, which also resets it after a stroke. */
export class PDFLineJoin extends PDFObject {
  static Style = { MITER: 0, ROUND: 1, BEVEL: 2 } as const;

  declare _style: number;

  constructor(style?: number) {
    super();
    this._style = style || PDFLineJoin.Style.MITER;
  }

  override write(output: PDFOutput): void {
    output.write(this._style);
    output.writeSpace();
    output.write("j");
  }
}

PDFLineJoin.prototype._style = PDFLineJoin.Style.MITER;
