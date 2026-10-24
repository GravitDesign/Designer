// Old: chunk.vendor.js module 1145 (GPDFFilter).
import type { PDFBytes, PDFOutput } from "./output.ts";

/**
 * The data of a stream and how it is encoded (`/Filter /<name>`; no
 * filter entry when the name is empty).
 */
export interface PDFStreamData {
  name?: string | null;
  write(output: PDFOutput): void;
  length(): number;
}

/** The base of the stream encodings; the subclasses write the bytes. */
export class PDFFilter implements PDFStreamData {
  name: string | null;

  constructor(name: string | null) {
    this.name = name;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the subclasses write
  write(_output: PDFOutput): void {
    throw "Not implemented";
  }

  length(): number {
    throw "Not implemented";
  }

  getBuffer(): PDFBytes {
    throw "Not implemented";
  }

  toString(): string {
    return "[Object GPDFFilter]";
  }
}
