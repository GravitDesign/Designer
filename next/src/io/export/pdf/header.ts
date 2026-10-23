// Old: chunk.vendor.js module 1442 (the PDF header).
import type { PDFOutput } from "./output.ts";

/**
 * `%PDF-1.7` and the binary marker line. The old constructor ignored the
 * version it was given, so every file says 1.7.
 */
export class PDFHeader {
  declare version: number;

  write(output: PDFOutput): void {
    output.write("%PDF-");
    output.write(this.version);
    output.writeln();
    output.writeBuffer(new Uint8Array([37, 226, 227, 207, 211]));
    output.writeln();
  }
}

PDFHeader.prototype.version = 1.7;
