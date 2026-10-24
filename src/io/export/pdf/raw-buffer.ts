// Old: chunk.vendor.js module 1218 (GPDFRawBuffer).
import { PDFFilter } from "./pdf-filter.ts";
import type { PDFOutput } from "./output.ts";

/** Bytes written as they are (no filter name, so no /Filter entry). */
export class PDFRawBuffer extends PDFFilter {
  _buffer: Uint8Array;

  constructor(buffer: Uint8Array) {
    // The old constructor didn't call the base, so the name stayed unset.
    super(null);
    this._buffer = buffer;
  }

  override write(output: PDFOutput): void {
    output.writeBuffer(this._buffer);
  }

  override length(): number {
    return this._buffer.byteLength;
  }

  override getBuffer(): Uint8Array {
    return this._buffer;
  }

  override toString(): string {
    return "[Object GPDFRawBuffer]";
  }
}
