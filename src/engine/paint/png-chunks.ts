// Old: chunk.vendor.js module 895.
//
// Writes the DPI of a PNG: inserts a pHYs chunk (pixels per metre, unit
// metre) in front of the first IDAT chunk.

const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = 1 & c ? 3988292384 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

/** The four big-endian bytes of a 32-bit value. */
function bytesOf(value: number): number[] {
  return [
    (4278190080 & value) >>> 24,
    (16711680 & value) >>> 16,
    (65280 & value) >>> 8,
    255 & value,
  ];
}

function crc32(start: number, bytes: Uint8Array): number {
  let crc = start;
  for (let i = 0; i < bytes.length; i++) {
    crc = (CRC_TABLE[255 & (crc ^ (bytes[i] as number))] as number) ^ (crc >>> 8);
  }
  return crc;
}

/** One PNG chunk: length, four-letter type and data; getBuffer adds the CRC. */
export class PngChunk {
  length: number;
  type: Uint8Array;
  data: Uint8Array;

  constructor(length: number, type: string, data: Uint8Array) {
    this.length = length;
    this.data = data;
    const codes: number[] = [];
    for (let i = 0; i < type.length; i++) codes.push(type.charCodeAt(i));
    this.type = new Uint8Array(codes);
  }

  getBuffer(): Uint8Array {
    const buffer = new Uint8Array(4 + this.type.byteLength + this.data.byteLength + 4);
    buffer.set(bytesOf(this.length), 0);
    buffer.set(this.type, 4);
    buffer.set(this.data, 4 + this.type.byteLength);
    const typeAndData = new Uint8Array(this.type.length + this.data.length);
    typeAndData.set(this.type, 0);
    typeAndData.set(this.data, this.type.length);
    buffer.set(
      bytesOf(4294967295 ^ crc32(4294967295, typeAndData)),
      4 + this.type.byteLength + this.data.length,
    );
    return buffer;
  }
}

export class PngChunks {
  static Chunk = PngChunk;

  /** An ArrayBuffer until a chunk is added, a Uint8Array after. */
  _buffer: ArrayBuffer | Uint8Array;
  /** A view of the original buffer; the old code never refreshed it. */
  _view: DataView;

  constructor(buffer: ArrayBuffer) {
    this._buffer = buffer;
    this._view = new DataView(this._buffer);
  }

  setDPI(dpi: number): void {
    const data = bytesOf(Math.floor(dpi / 0.0254))
      .concat(bytesOf(Math.floor(dpi / 0.0254)))
      .concat(1);
    const chunk = new PngChunk(data.length, "pHYs", new Uint8Array(data));
    const position = this.findChunk("IDAT", 8);
    if (-1 !== position) this.addChunk(chunk, position);
  }

  /**
   * The offset of the first chunk of `type` at or after `offset`. Walks the
   * chunks recursively and throws (RangeError) past the end of the file.
   */
  findChunk(type: string, offset: number): number {
    const length = this._view.getUint32(offset);
    return String.fromCharCode(
      this._view.getUint8(offset + 4),
      this._view.getUint8(offset + 5),
      this._view.getUint8(offset + 6),
      this._view.getUint8(offset + 7),
    ) === type
      ? offset
      : this.findChunk(type, offset + 8 + length + 4);
  }

  addChunk(chunk: PngChunk, position: number): void {
    const inserted = chunk.getBuffer();
    const before = new Uint8Array(this._buffer.slice(0, position));
    const after = new Uint8Array(this._buffer.slice(position, this._buffer.byteLength));
    const result = new Uint8Array(before.byteLength + after.byteLength + inserted.byteLength);
    result.set(before, 0);
    result.set(inserted, before.byteLength);
    result.set(after, before.byteLength + inserted.byteLength);
    this._buffer = result;
  }

  getBlob(): Blob {
    return new Blob([this._buffer as BlobPart], { type: "image/png" });
  }
}
