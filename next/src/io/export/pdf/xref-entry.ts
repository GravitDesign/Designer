// Old: chunk.vendor.js module 1424 (the PDF indirect object).
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/**
 * A numbered object of the file body (`n 0 obj ... endobj`). `offset` is
 * set while the body is written and read by the xref table.
 */
export class PDFIndirectObject<T extends PDFObject = PDFObject> extends PDFObject {
  type: number;
  number: number;
  pdfobject: T;
  declare offset: number;

  constructor(type: number, number: number, object: T) {
    super();
    this.type = type;
    this.number = number;
    this.pdfobject = object;
  }

  override write(output: PDFOutput): void {
    output.write(this.number);
    output.write(" ");
    output.write(this.type);
    output.write(" ");
    output.write("obj");
    output.writeln();
    this.pdfobject.write(output);
    output.writeln();
    output.write("endobj");
  }

  override equals(other: unknown): boolean {
    return other instanceof PDFIndirectObject && this.getPDFObject().equals(other.getPDFObject());
  }

  getPDFObject(): T {
    return this.pdfobject;
  }
}
