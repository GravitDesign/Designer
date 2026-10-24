// Old: chunk.vendor.js module 856 (GPDFFlateDecode).
import { deflate } from "pako";
import { PDFFilter } from "./pdf-filter.ts";
import type { PDFOutput } from "./output.ts";

/** Data compressed with pako's deflate at its defaults (zlib header, level 6). */
export class PDFFlateDecode extends PDFFilter {
  declare _compressed: Uint8Array;

  constructor(data?: Uint8Array | Uint8ClampedArray | string | null) {
    super("FlateDecode");
    if (data) this.setBuffer(deflate(data as Uint8Array));
  }

  setBuffer(buffer: Uint8Array): void {
    this._compressed = buffer;
  }

  override getBuffer(): Uint8Array {
    return this._compressed;
  }

  override write(output: PDFOutput): void {
    output.writeBuffer(this._compressed);
  }

  override length(): number {
    return this._compressed.length;
  }

  override toString(): string {
    return "[Object GPDFFlateDecode]";
  }
}
