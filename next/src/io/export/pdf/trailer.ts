// Old: chunk.vendor.js module 1427 (the PDF trailer).
import { PDFDictionary } from "./pdf-dictionary.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFIndirectReference } from "./indirect-reference.ts";
import type { PDFOutput } from "./output.ts";
import type { PDFIndirectObject } from "./xref-entry.ts";

/** `trailer <</Root .../Info .../Size n>>`. */
export class PDFTrailer extends PDFObject {
  dictionary: PDFDictionary;

  constructor(
    root: PDFIndirectReference,
    info: PDFIndirectReference,
    references: PDFIndirectObject[],
  ) {
    super();
    this.dictionary = new PDFDictionary();
    this.dictionary.put("/Root", root);
    this.dictionary.put("/Info", info);
    this.dictionary.put("/Size", references.length + 1);
  }

  override write(output: PDFOutput): void {
    output.writeln("trailer");
    this.dictionary.write(output);
    output.writeln();
  }
}
