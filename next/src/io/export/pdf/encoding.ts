// Old: chunk.vendor.js module 1233 (the PDF text encoding base).
import type { PDFTextEncodeOptions } from "./text-writer.ts";

/** Turns text into what goes into `TJ`: strings and kerning numbers. */
export class PDFEncoding {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the subclasses encode
  encode(_text: string | number[], _options?: PDFTextEncodeOptions): unknown[] {
    throw "Not implemented";
  }
}
