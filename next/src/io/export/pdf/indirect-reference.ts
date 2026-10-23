// Old: chunk.vendor.js module 391 (the PDF indirect reference).
import { PDFObject } from "./pdf-object.ts";
import type { PDFIndirectObject } from "./xref-entry.ts";
import type { PDFOutput } from "./output.ts";

/** `n 0 R`: a reference to a numbered object. */
export class PDFIndirectReference<T extends PDFObject = PDFObject> extends PDFObject {
  pdfIndirectObject: PDFIndirectObject<T>;

  constructor(indirectObject: PDFIndirectObject<T>) {
    super();
    this.pdfIndirectObject = indirectObject;
  }

  override write(output: PDFOutput): void {
    output.write(this.getPDFIndirectObject().number);
    output.write(" ");
    output.write(this.getPDFIndirectObject().type);
    output.write(" R");
  }

  getPDFIndirectObject(): PDFIndirectObject<T> {
    return this.pdfIndirectObject;
  }

  getPDFObject(): T {
    return this.getPDFIndirectObject().getPDFObject();
  }
}
