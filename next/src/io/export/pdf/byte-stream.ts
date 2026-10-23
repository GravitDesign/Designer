// Old: chunk.vendor.js module 1143 (the byte output of the PDF writer).
import { ByteBuffer } from "../byte-buffer.ts";
import { PDFOutput, type PDFBytes, type PDFToken } from "./output.ts";

/**
 * Writes into a growing byte buffer. Tokens are written as UTF-8 (the old
 * code went through encodeURIComponent, which also throws on a lone
 * surrogate).
 */
export class PDFByteStream extends PDFOutput {
  declare _byteBuffer: ByteBuffer;

  constructor(initialCapacity?: number) {
    super();
    this._byteBuffer = new ByteBuffer(initialCapacity || 10240);
  }

  override getPosition(): number {
    return this._byteBuffer.getBytePosition();
  }

  override asArray(): Uint8ClampedArray {
    return this._byteBuffer.getBuffer();
  }

  override _write(value: PDFToken): void {
    const latin = encodeURIComponent(value.toString()).replace(/%([0-9A-F]{2})/g, (_match, hex) =>
      String.fromCharCode(parseInt(hex as string, 16)),
    );
    const bytes = new Uint8Array(latin.length);
    for (let i = 0; i < latin.length; i++) bytes[i] = latin.charCodeAt(i);
    this.writeBuffer(bytes);
  }

  override _concat(other: PDFOutput): void {
    this.writeBuffer(other.asArray() as PDFBytes);
  }

  override _writeBuffer(buffer: PDFBytes): void {
    this._byteBuffer.writeArray(buffer);
  }
}
