// Old: chunk.vendor.js module 850 (the JPEG encoder's output buffer).
//
// A growing byte buffer. Values are clamped to 0..255 on write, since the
// backing store is a Uint8ClampedArray.

export class ByteBuffer {
  private _bytePosition = 0;
  private _buffer: Uint8ClampedArray;

  constructor(initialCapacity: number) {
    this._buffer = new Uint8ClampedArray(initialCapacity);
  }

  getBytePosition(): number {
    return this._bytePosition;
  }

  writeByte(value: number): void {
    this._ensureCapacity(this._bytePosition + 1);
    this._buffer.set([value], this._bytePosition++);
  }

  /** Two bytes, big endian. */
  writeWord(value: number): void {
    this.writeByte((value >> 8) & 255);
    this.writeByte(255 & value);
  }

  writeArray(values: ArrayLike<number>): void {
    this._ensureCapacity(this._bytePosition + values.length);
    this._buffer.set(values, this._bytePosition);
    this._bytePosition += values.length;
  }

  /** The char codes of a string that has only ASCII characters. */
  writeAscii(text: string): void {
    const length = text.length;
    this._ensureCapacity(this._bytePosition + length);
    const buffer = this._buffer;
    const position = this._bytePosition;
    for (let i = 0; i < length; i++) buffer[position + i] = text.charCodeAt(i);
    this._bytePosition += length;
  }

  /** The bytes written so far (a copy). */
  getBuffer(): Uint8ClampedArray {
    return this._buffer.slice(0, this._bytePosition);
  }

  /** The size of the backing store (grows by half plus one, at least to what's needed). */
  getCapacity(): number {
    return this._buffer.byteLength;
  }

  private _ensureCapacity(needed: number): void {
    if (needed > this._buffer.byteLength) {
      let capacity = Math.ceil((3 * this._buffer.byteLength) / 2 + 1);
      capacity = Math.max(capacity, needed);
      const previous = this._buffer;
      this._buffer = new Uint8ClampedArray(capacity);
      this._buffer.set(previous);
    }
  }
}
