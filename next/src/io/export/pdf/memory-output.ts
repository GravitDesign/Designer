// Old: chunk.vendor.js module 1443 (the in-memory PDF output).
import { PDFOutput, type PDFBytes, type PDFToken } from "./output.ts";

/**
 * Keeps every token and buffer in a list instead of encoding them; the
 * position counts characters for tokens and bytes for buffers. It is the
 * document's default writer (PDFDocument.newWriter), which the export
 * itself doesn't use.
 */
export class PDFMemoryOutput extends PDFOutput {
  out: unknown[];
  position: number;

  constructor() {
    super();
    this.out = [];
    this.position = 0;
  }

  override getPosition(): number {
    return this.position;
  }

  override _write(value: PDFToken): void {
    this.position += value.toString().length;
    this.out.push(value);
  }

  override _writeBuffer(buffer: PDFBytes): void {
    this.position += buffer.length || (buffer.byteLength as number);
    this.out.push(buffer);
  }

  override _concat(other: PDFOutput): void {
    this.position += other.getPosition();
    this.out = this.out.concat(other.asArray());
  }

  override asArray(): unknown[] {
    return this.out;
  }
}
