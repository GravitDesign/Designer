// Old: chunk.vendor.js module 1421 (the PDF DCTDecode data).
import { JpegEncoder, type JpegColorSpace } from "../jpeg-encoder.ts";
import { PDFFilter } from "./pdf-filter.ts";
import type { PDFOutput } from "./output.ts";

/**
 * JPEG data, encoded here with the old app's own encoder (quality 85
 * when none is given), or set later from a worker's result.
 */
export class PDFDCTDecode extends PDFFilter {
  declare _compressed: Uint8Array | Uint8ClampedArray;

  constructor(
    width?: number,
    height?: number,
    pixels?: ArrayLike<number>,
    colorSpace?: JpegColorSpace,
    quality?: number,
  ) {
    super("DCTDecode");
    if (0 !== arguments.length) {
      this.setBuffer(
        new JpegEncoder().encode(
          pixels as ArrayLike<number>,
          width as number,
          height as number,
          quality || 85,
          colorSpace as JpegColorSpace,
        ),
      );
    }
  }

  setBuffer(buffer: Uint8Array | Uint8ClampedArray): void {
    this._compressed = buffer;
  }

  override getBuffer(): Uint8Array | Uint8ClampedArray {
    return this._compressed;
  }

  override write(output: PDFOutput): void {
    output.writeBuffer(this._compressed);
  }

  override length(): number {
    return this._compressed.length;
  }
}
