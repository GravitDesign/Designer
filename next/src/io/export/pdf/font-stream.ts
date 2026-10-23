// Old: chunk.vendor.js module 1430 (the PDF embedded font file).
import { PDFFlateDecode } from "./flate-decode.ts";
import { PDFStream } from "./pdf-stream.ts";
import { PDFRawBuffer } from "./raw-buffer.ts";

/**
 * The font file, deflated when the document compresses. /Length1 is the
 * length of the written (compressed) data, not of the font file as PDF
 * asks; kept from the old code.
 */
export class PDFFontStream extends PDFStream {
  constructor(buffer: ArrayBuffer | ArrayBufferView, compress: boolean) {
    const data = compress
      ? new PDFFlateDecode(buffer as Uint8Array)
      : new PDFRawBuffer(buffer as Uint8Array);
    super(data);
    this.putDictionary("/Length1", this.length());
  }
}
