// Old: chunk.vendor.js module 1220 (the PDF line dash).
import { PDFArray } from "./pdf-array.ts";
import { PDFObject } from "./pdf-object.ts";
import { PDFOperators } from "./operators.ts";
import type { PDFOutput } from "./output.ts";

/**
 * `[dashes] 0 d`. Nothing is written when every dash is 0; an empty list
 * writes `[] 0 d`, which resets the dash.
 */
export class PDFLineDash extends PDFObject {
  declare _dashArray: PDFArray;
  declare _offset: number;

  constructor(dashes?: number[]) {
    super();
    this._offset = 0;
    this._dashArray = new PDFArray(dashes);
  }

  _isDashPatternValid(): boolean {
    return (
      !(this._dashArray.size() > 0) || !this._dashArray.every((value) => 0 === value.getValue())
    );
  }

  override write(output: PDFOutput): void {
    if (this._isDashPatternValid()) {
      this._dashArray.write(output);
      output.writeSpace();
      output.write(String(this._offset));
      output.writeSpace();
      output.write(PDFOperators.setLineDash);
    }
  }
}

PDFLineDash.prototype._offset = 0;
