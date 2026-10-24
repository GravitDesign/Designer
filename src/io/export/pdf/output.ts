// Old: chunk.vendor.js module 1215 (the PDF output base).

/** What the writer accepts as a token: it is written as its string form. */
export type PDFToken = string | number | boolean;

/** Bytes as the writer takes them (typed arrays or plain byte lists). */
export type PDFBytes = ArrayLike<number> & { byteLength?: number };

/**
 * Where a PDF is written to. Every write checks for an abort first and
 * throws "AbortError" once `abort()` was called.
 */
export class PDFOutput {
  declare _abort: boolean;

  constructor() {
    this._abort = false;
  }

  getPosition(): number {
    return 0;
  }

  writeSpace(): void {
    this.write(" ");
  }

  /** Writes `value` (when truthy, so 0 is skipped as in the old code) and a newline. */
  writeln(value?: PDFToken | null): void {
    if (value) this.write(value);
    this.write("\n");
  }

  write(value: PDFToken): void {
    this._checkAbort();
    this._write(value);
  }

  writeBuffer(buffer: PDFBytes): void {
    this._checkAbort();
    this._writeBuffer(buffer);
  }

  concat(other: PDFOutput): void {
    this._checkAbort();
    this._concat(other);
  }

  _checkAbort(): void {
    if (this._abort) throw new Error("AbortError");
  }

  asArray(): unknown {
    return undefined;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- the outputs implement these */
  _write(_value: PDFToken): void {}

  _writeBuffer(_buffer: PDFBytes): void {}

  _concat(_other: PDFOutput): void {}
  /* eslint-enable @typescript-eslint/no-unused-vars */

  abort(): void {
    this._abort = true;
  }
}

PDFOutput.prototype._abort = false;
