// Old: chunk.vendor.js module 1441 (the PDF cross-reference table).
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";
import type { PDFIndirectObject } from "./xref-entry.ts";

/** `xref`: one 20-byte line per object, in the order the body wrote them. */
export class PDFXref extends PDFObject {
  references: PDFIndirectObject[];
  declare offset: number;

  constructor(references: PDFIndirectObject[]) {
    super();
    this.references = references;
  }

  override write(output: PDFOutput): void {
    this.offset = output.getPosition();
    output.writeln("xref");
    output.write(0);
    output.write(" ");
    output.writeln(this.references.length + 1);
    output.writeln("0000000000 65535 f ");
    for (const reference of this.references) {
      const offset = "0000000000".substr(reference.offset.toString().length) + reference.offset;
      output.write(offset);
      output.writeln(" 00000 n ");
    }
  }
}
