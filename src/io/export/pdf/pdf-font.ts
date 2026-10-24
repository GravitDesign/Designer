// Old: chunk.vendor.js module 1231 (GPDFFont).
import type { PDFEncoding } from "./encoding.ts";
import { PDFEncodings } from "./encodings.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";
import type { PDFTextEncodeOptions } from "./text-writer.ts";

/** A font dictionary with the encoding its text is written in; equal by resource name. */
export class PDFFont extends PDFDictionary {
  name: string;
  declare _encoding: PDFEncoding;

  constructor(name: string) {
    super();
    this.name = name;
    this._encoding = PDFEncodings.WINANSI;
  }

  encode(text: string, options?: PDFTextEncodeOptions): unknown[] {
    return this._encoding.encode(text, options);
  }

  override equals(other: unknown): boolean {
    return this.name === (other as PDFFont).name;
  }

  getName(): string {
    return this.name;
  }

  override toString(): string {
    return "[GPDFFont]";
  }
}
