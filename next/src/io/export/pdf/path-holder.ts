// Old: chunk.vendor.js module 854 (the PDF clip path).
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/** A path used as clip: the path, then `W n`. */
export class PDFClipPath extends PDFObject {
  _path: PDFObject | null;

  constructor(path: PDFObject | null) {
    super();
    this._path = path;
  }

  getPath(): PDFObject | null {
    return this._path;
  }

  override write(output: PDFOutput): void {
    if (this._path) {
      this._path.write(output);
      output.writeln();
      output.write("W n");
    }
  }
}
