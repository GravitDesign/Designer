// Old: chunk.vendor.js module 800 (the PDF stream).
import { PDFDictionary } from "./pdf-dictionary.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFStreamData } from "./pdf-filter.ts";
import type { PDFOutput } from "./output.ts";

/** A stream object: its dictionary (with /Length and /Filter added on write) and data. */
export class PDFStream extends PDFObject {
  filter: PDFStreamData;
  dictionary: PDFDictionary;

  constructor(filter: PDFStreamData) {
    super();
    this.filter = filter;
    this.dictionary = new PDFDictionary();
  }

  getFilter(): PDFStreamData {
    return this.filter;
  }

  putDictionary(key: string, value: unknown): void {
    this.dictionary.put(key, value);
  }

  length(): number {
    return this.filter.length();
  }

  override write(output: PDFOutput): void {
    this.putDictionary("/Length", this.length());
    if (this.filter.name) this.putDictionary("/Filter", "/" + this.filter.name);
    this.dictionary.write(output);
    output.writeln("stream");
    this.filter.write(output);
    output.writeln();
    output.write("endstream");
  }
}
