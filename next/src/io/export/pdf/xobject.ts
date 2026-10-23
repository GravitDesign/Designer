// Old: chunk.vendor.js module 1225 (the PDF form XObject).
import { Transform } from "../../../engine/math/transform.ts";
import { PDFByteStream } from "./byte-stream.ts";
import { PDFConcatMatrix } from "./op-cm.ts";
import { PDFArray } from "./pdf-array.ts";
import type { PDFStreamData } from "./pdf-filter.ts";
import type { PDFObject } from "./pdf-object.ts";
import { PDFStream } from "./pdf-stream.ts";
import type { PDFOutput } from "./output.ts";

/** The uncompressed content of a form: the matrix (unless identity), then the drawing. */
class FormContent implements PDFStreamData {
  _out: PDFByteStream | null = null;

  constructor(
    private readonly _content: PDFObject,
    private readonly _matrix: Transform | null | undefined,
  ) {}

  write(output: PDFOutput): void {
    output.concat(this.getWriter());
  }

  length(): number {
    return this.getWriter().getPosition();
  }

  getWriter(): PDFByteStream {
    if (!this._out) {
      this._out = new PDFByteStream();
      if (this._matrix && !this._matrix.isIdentity()) {
        new PDFConcatMatrix(this._matrix).write(this._out);
        this._out.writeln();
      }
      this._content.write(this._out);
    }
    return this._out;
  }
}

/**
 * A form XObject with an identity /Matrix, the given /BBox and an
 * optional /Group. The drawing is written once, on the first length or
 * write.
 */
export class PDFFormXObject extends PDFStream {
  static FormType = { DEFAULT: 1 } as const;

  constructor(
    _document: unknown,
    content: PDFObject,
    group: PDFObject | null | undefined,
    bbox: PDFArray,
    matrix?: Transform | null,
  ) {
    super(new FormContent(content, matrix));
    const identity = new PDFArray(new Transform().getMatrix());
    this.putDictionary("/Type", "/XObject");
    this.putDictionary("/Subtype", "/Form");
    this.putDictionary("/Matrix", identity);
    this.putDictionary("/BBox", bbox);
    this.putDictionary("/FormType", PDFFormXObject.FormType.DEFAULT);
    if (group) this.putDictionary("/Group", group);
  }
}
