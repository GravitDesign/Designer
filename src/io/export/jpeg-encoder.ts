// Old: chunk.vendor.js module 849 (Gravit's own baseline JPEG encoder).
//
// A port of the classic Java JpegEncoder (James R. Weeks) that the PDF
// exporter uses for DCT image streams, on the main thread or in the PDF
// export worker ("jpegencoder" command). Its output is the file format, so
// the quirks stay:
// - The luminance and chrominance quantization tables are Int32Array(32)
//   although 64 values are written into them. Entries 32..63 are lost, so
//   their divisors are NaN, those coefficients quantize to 0, and the DQT
//   segment writes 0 for them.
// - Pixels and colour components go through Int32Array blocks, which
//   truncates the YCbCr values and every value of the DCT row pass.
// - Blocks at the right edge read on into the next row; blocks below the
//   last row read past the buffer and get 0.
// - The final bits are flushed without the usual 1-bit padding.

import { uuid } from "../../engine/core/util.ts";
import { ByteBuffer } from "./byte-buffer.ts";

/** What the encoder's frame info gets from a colour space. */
export interface JpegComponentInfo {
  _componentsId: number[];
  _hsampFactor: number[];
  _vsampFactor: number[];
  _qtableNumber: number[];
  _dctableNumber: number[];
  _actableNumber: number[];
}

/** A colour space of the encoder: component setup and the per-pixel converter. */
export interface JpegColorSpace {
  /** Writes an Adobe APP14 marker instead of JFIF APP0. */
  APP14?: boolean;
  length: number;
  init(info: JpegComponentInfo): void;
  /** One packed pixel (byte 0 first component) to its component values. */
  converter(pixel: number): number[];
}

/** The part of a Worker the encoder talks to. */
export interface MessageWorker {
  postMessage(message: unknown, transfer: Transferable[]): void;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  addEventListener(type: "error", listener: (event: unknown) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  removeEventListener(type: "error", listener: (event: unknown) => void): void;
}

/** What makes the promises of a concurrent job (GPDFDocument.createPromise). */
export interface PromiseFactory {
  createPromise<T>(
    executor: (resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
  ): Promise<T>;
}

const ColorSpace = {
  RGBA: {
    length: 3,
    init(info: JpegComponentInfo): void {
      info._componentsId = [1, 2, 3];
      info._hsampFactor = [1, 1, 1];
      info._vsampFactor = [1, 1, 1];
      info._qtableNumber = [0, 1, 1];
      info._dctableNumber = [0, 1, 1];
      info._actableNumber = [0, 1, 1];
    },
    converter(pixel: number): number[] {
      const red = 255 & pixel;
      const green = (pixel >> 8) & 255;
      const blue = (pixel >> 16) & 255;
      return [
        0.299 * red + 0.587 * green + 0.114 * blue,
        -0.16874 * red - 0.33126 * green + 0.5 * blue + 128,
        0.5 * red - 0.41869 * green - 0.08131 * blue + 128,
      ];
    },
  },
  CMYK: {
    APP14: true,
    length: 4,
    init(info: JpegComponentInfo): void {
      info._componentsId = [67, 77, 89, 75];
      info._hsampFactor = [1, 1, 1, 1];
      info._vsampFactor = [1, 1, 1, 1];
      info._qtableNumber = [0, 0, 0, 0];
      info._dctableNumber = [0, 0, 0, 0];
      info._actableNumber = [0, 0, 0, 0];
    },
    converter(pixel: number): number[] {
      return [255 & pixel, (pixel >> 8) & 255, (pixel >> 16) & 255, (pixel >> 24) & 255];
    },
  },
} satisfies Record<string, JpegColorSpace>;

function zeros(length: number): number[] {
  const out = new Array<number>(length);
  for (let i = 0; i < length; i++) out[i] = 0;
  return out;
}

const AAN_SCALE_FACTORS = new Float64Array([
  1, 1.387039845, 1.306562965, 1.175875602, 1, 0.785694958, 0.5411961, 0.275899379,
]);

const LUMINANCE_TABLE = new Uint32Array([
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113,
  92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
]);

const CHROMINANCE_TABLE = new Uint32Array([
  17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99,
  47, 66, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
]);

/** Zig-zag order: the i-th coefficient written is block[JPEG_NATURAL_ORDER[i]]. */
const JPEG_NATURAL_ORDER = new Uint32Array([
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20,
  13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52,
  45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
]);

/** Quantization tables and the AAN forward DCT. */
class Dct {
  static N = 8;

  _divisorsLuminance: number[] = new Array<number>(Dct.N * Dct.N);
  _divisorsChrominance: number[] = new Array<number>(Dct.N * Dct.N);
  _divisors: number[][] = [[], []];
  _quantum: Int32Array[] = [];
  _YQT: Int32Array = new Int32Array(0);
  _UVQT: Int32Array = new Int32Array(0);

  constructor(quality: number) {
    this._initMatrix(quality);
  }

  private _initMatrix(quality: number): void {
    if (quality <= 0) quality = 1;
    if (quality > 100) quality = 100;
    quality = quality < 50 ? 5e3 / quality : 200 - 2 * quality;
    // 32 slots for 64 values: see the file comment.
    this._YQT = new Int32Array(32);
    this._UVQT = new Int32Array(32);
    for (let i = 0; i < 64; i++) {
      // The old parseInt truncates; the value is at least 0.5, never in exponent notation.
      let value = Math.trunc(((LUMINANCE_TABLE[i] as number) * quality + 50) / 100);
      if (value <= 0) value = 1;
      if (value > 255) value = 255;
      this._YQT[i] = value;
    }
    let index = 0;
    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 8; column++) {
        this._divisorsLuminance[index] =
          1 /
          ((this._YQT[index] as number) *
            (AAN_SCALE_FACTORS[row] as number) *
            (AAN_SCALE_FACTORS[column] as number) *
            8);
        index++;
      }
    }
    for (let i = 0; i < 64; i++) {
      let value = Math.trunc(((CHROMINANCE_TABLE[i] as number) * quality + 50) / 100);
      if (value <= 0) value = 1;
      if (value >= 255) value = 255;
      this._UVQT[i] = value;
    }
    index = 0;
    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 8; column++) {
        this._divisorsChrominance[index] =
          1 /
          ((this._UVQT[index] as number) *
            (AAN_SCALE_FACTORS[row] as number) *
            (AAN_SCALE_FACTORS[column] as number) *
            8);
        index++;
      }
    }
    this._divisors[0] = this._divisorsLuminance;
    this._divisors[1] = this._divisorsChrominance;
    this._quantum[0] = this._YQT;
    this._quantum[1] = this._UVQT;
  }

  /** In place on a copy; the Int32Array truncates every stored value. */
  forwardDCT(input: Int32Array): Int32Array {
    const data = input.map((value) => value - 128);
    let offset = 0;
    for (let row = 0; row < 8; row++) {
      const d0 = data[offset] as number;
      const d1 = data[offset + 1] as number;
      const d2 = data[offset + 2] as number;
      const d3 = data[offset + 3] as number;
      const d4 = data[offset + 4] as number;
      const d5 = data[offset + 5] as number;
      const d6 = data[offset + 6] as number;
      const d7 = data[offset + 7] as number;
      const tmp0 = d0 + d7;
      const tmp7 = d0 - d7;
      const tmp1 = d1 + d6;
      const tmp6 = d1 - d6;
      const tmp2 = d2 + d5;
      const tmp5 = d2 - d5;
      const tmp3 = d3 + d4;
      const tmp4 = d3 - d4;
      // Even part.
      const tmp10 = tmp0 + tmp3;
      const tmp13 = tmp0 - tmp3;
      const tmp11 = tmp1 + tmp2;
      const tmp12 = tmp1 - tmp2;
      data[offset] = tmp10 + tmp11;
      data[offset + 4] = tmp10 - tmp11;
      const z1 = 0.707106781 * (tmp12 + tmp13);
      data[offset + 2] = tmp13 + z1;
      data[offset + 6] = tmp13 - z1;
      // Odd part.
      const odd10 = tmp4 + tmp5;
      const odd12 = tmp6 + tmp7;
      const z5 = 0.382683433 * (odd10 - odd12);
      const z2 = 0.5411961 * odd10 + z5;
      const z4 = 1.306562965 * odd12 + z5;
      const z3 = 0.707106781 * (tmp5 + tmp6);
      const z11 = tmp7 + z3;
      const z13 = tmp7 - z3;
      data[offset + 5] = z13 + z2;
      data[offset + 3] = z13 - z2;
      data[offset + 1] = z11 + z4;
      data[offset + 7] = z11 - z4;
      offset += 8;
    }
    offset = 0;
    for (let column = 0; column < 8; column++) {
      const d0 = data[offset] as number;
      const d1 = data[offset + 8] as number;
      const d2 = data[offset + 16] as number;
      const d3 = data[offset + 24] as number;
      const d4 = data[offset + 32] as number;
      const d5 = data[offset + 40] as number;
      const d6 = data[offset + 48] as number;
      const d7 = data[offset + 56] as number;
      const tmp0 = d0 + d7;
      const tmp7 = d0 - d7;
      const tmp1 = d1 + d6;
      const tmp6 = d1 - d6;
      const tmp2 = d2 + d5;
      const tmp5 = d2 - d5;
      const tmp3 = d3 + d4;
      const tmp4 = d3 - d4;
      const tmp10 = tmp0 + tmp3;
      const tmp13 = tmp0 - tmp3;
      const tmp11 = tmp1 + tmp2;
      const tmp12 = tmp1 - tmp2;
      data[offset] = tmp10 + tmp11;
      data[offset + 32] = tmp10 - tmp11;
      const z1 = 0.707106781 * (tmp12 + tmp13);
      data[offset + 16] = tmp13 + z1;
      data[offset + 48] = tmp13 - z1;
      const odd10 = tmp4 + tmp5;
      const odd12 = tmp6 + tmp7;
      const z5 = 0.382683433 * (odd10 - odd12);
      const z2 = 0.5411961 * odd10 + z5;
      const z4 = 1.306562965 * odd12 + z5;
      const z3 = 0.707106781 * (tmp5 + tmp6);
      const z11 = tmp7 + z3;
      const z13 = tmp7 - z3;
      data[offset + 40] = z13 + z2;
      data[offset + 24] = z13 - z2;
      data[offset + 8] = z11 + z4;
      data[offset + 56] = z11 - z4;
      offset++;
    }
    return data;
  }

  quantizeBlock(block: Int32Array, table: number): Int32Array {
    const out = new Int32Array(64);
    const divisors = this._divisors[table] as number[];
    for (let i = 0; i < 64; i++)
      out[i] = Math.round((block[i] as number) * (divisors[i] as number));
    return out;
  }
}

/** A Huffman code table: for each symbol [code, length]. */
type HuffmanTable = number[][];

/** Code tables for one bits/values pair (JPEG spec, annex C). */
function buildHuffmanTable(bits: Uint32Array, values: Uint32Array): HuffmanTable {
  const sizes = zeros(257);
  const codes = zeros(257);
  let p = 0;
  for (let length = 1; length <= 16; length++) {
    for (let i = 1; i <= (bits[length] as number); i++) sizes[p++] = length;
  }
  sizes[p] = 0;
  const count = p;
  let code = 0;
  let size = sizes[0] as number;
  p = 0;
  while (0 != sizes[p]) {
    while (sizes[p] == size) {
      codes[p++] = code;
      code++;
    }
    code <<= 1;
    size++;
  }
  const table: HuffmanTable = [];
  for (p = 0; p < count; p++) {
    const symbol = values[p] as number;
    if (!table[symbol]) table[symbol] = [];
    (table[symbol] as number[])[0] = codes[p] as number;
    (table[symbol] as number[])[1] = sizes[p] as number;
  }
  return table;
}

/** The standard Huffman tables and the entropy coder. */
class Huffman {
  _bufferPutBits = 0;
  _bufferPutBuffer = 0;
  _imageWidth: number;
  _imageHeight: number;
  _bitsDCluminance = new Uint32Array([0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
  _valDCluminance = new Uint32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  _bitsDCchrominance = new Uint32Array([1, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0]);
  _valDCchrominance = new Uint32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  _bitsACluminance = new Uint32Array([16, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125]);
  _bitsACchrominance = new Uint32Array([17, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119]);
  _valACluminance = new Uint32Array([
    1, 2, 3, 0, 4, 17, 5, 18, 33, 49, 65, 6, 19, 81, 97, 7, 34, 113, 20, 50, 129, 145, 161, 8, 35,
    66, 177, 193, 21, 82, 209, 240, 36, 51, 98, 114, 130, 9, 10, 22, 23, 24, 25, 26, 37, 38, 39, 40,
    41, 42, 52, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89,
    90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122, 131, 132,
    133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163, 164, 165,
    166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196, 197, 198,
    199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 225, 226, 227, 228, 229, 230,
    231, 232, 233, 234, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250,
  ]);
  _valACchrominance = new Uint32Array([
    0, 1, 2, 3, 17, 4, 5, 33, 49, 6, 18, 65, 81, 7, 97, 113, 19, 34, 50, 129, 8, 20, 66, 145, 161,
    177, 193, 9, 35, 51, 82, 240, 21, 98, 114, 209, 10, 22, 36, 52, 225, 37, 241, 23, 24, 25, 26,
    38, 39, 40, 41, 42, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87,
    88, 89, 90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122, 130,
    131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163,
    164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196,
    197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 226, 227, 228, 229,
    230, 231, 232, 233, 234, 242, 243, 244, 245, 246, 247, 248, 249, 250,
  ]);
  /** DC/AC luminance, DC/AC chrominance, in DHT order. */
  _bits: Uint32Array[];
  _val: Uint32Array[];
  _DC_matrix: HuffmanTable[];
  _AC_matrix: HuffmanTable[];

  constructor(width: number, height: number) {
    this._bits = [
      this._bitsDCluminance,
      this._bitsACluminance,
      this._bitsDCchrominance,
      this._bitsACchrominance,
    ];
    this._val = [
      this._valDCluminance,
      this._valACluminance,
      this._valDCchrominance,
      this._valACchrominance,
    ];
    this._imageWidth = width;
    this._imageHeight = height;
    const dcChrominance = buildHuffmanTable(this._bitsDCchrominance, this._valDCchrominance);
    const acChrominance = buildHuffmanTable(this._bitsACchrominance, this._valACchrominance);
    const dcLuminance = buildHuffmanTable(this._bitsDCluminance, this._valDCluminance);
    const acLuminance = buildHuffmanTable(this._bitsACluminance, this._valACluminance);
    this._DC_matrix = [dcLuminance, dcChrominance];
    this._AC_matrix = [acLuminance, acChrominance];
  }

  blockEncoder(
    out: ByteBuffer,
    block: Int32Array,
    lastDC: number,
    dcTable: number,
    acTable: number,
  ): void {
    const dc = this._DC_matrix[dcTable] as HuffmanTable;
    const ac = this._AC_matrix[acTable] as HuffmanTable;
    let magnitude = (block[0] as number) - lastDC;
    let bitsValue = magnitude;
    if (magnitude < 0) {
      magnitude = -magnitude;
      bitsValue--;
    }
    let bitCount = 0;
    while (0 != magnitude) {
      bitCount++;
      magnitude >>= 1;
    }
    this._bufferIt(
      out,
      (dc[bitCount] as number[])[0] as number,
      (dc[bitCount] as number[])[1] as number,
    );
    if (0 != bitCount) this._bufferIt(out, bitsValue, bitCount);
    let run = 0;
    for (let k = 1; k < 64; k++) {
      magnitude = block[JPEG_NATURAL_ORDER[k] as number] as number;
      if (0 == magnitude) run++;
      else {
        while (run > 15) {
          this._bufferIt(
            out,
            (ac[240] as number[])[0] as number,
            (ac[240] as number[])[1] as number,
          );
          run -= 16;
        }
        bitsValue = magnitude;
        if (magnitude < 0) {
          magnitude = -magnitude;
          bitsValue--;
        }
        bitCount = 1;
        while (0 != (magnitude >>= 1)) bitCount++;
        const symbol = (run << 4) + bitCount;
        // An unknown symbol (a coefficient over 10 bits) throws a TypeError, as before.
        this._bufferIt(
          out,
          (ac[symbol] as number[])[0] as number,
          (ac[symbol] as number[])[1] as number,
        );
        this._bufferIt(out, bitsValue, bitCount);
        run = 0;
      }
    }
    if (run > 0)
      this._bufferIt(out, (ac[0] as number[])[0] as number, (ac[0] as number[])[1] as number);
  }

  private _bufferIt(out: ByteBuffer, code: number, size: number): void {
    let buffer = code;
    let bits = this._bufferPutBits;
    buffer &= (1 << size) - 1;
    bits += size;
    buffer <<= 24 - bits;
    buffer |= this._bufferPutBuffer;
    while (bits >= 8) {
      const byte = (buffer >> 16) & 255;
      out.writeByte(byte);
      if (255 == byte) out.writeByte(0);
      buffer <<= 8;
      bits -= 8;
    }
    this._bufferPutBuffer = buffer;
    this._bufferPutBits = bits;
  }

  flushBuffer(out: ByteBuffer): void {
    let buffer = this._bufferPutBuffer;
    let bits = this._bufferPutBits;
    while (bits >= 8) {
      const byte = (buffer >> 16) & 255;
      out.writeByte(byte);
      if (255 == byte) out.writeByte(0);
      buffer <<= 8;
      bits -= 8;
    }
    if (bits > 0) out.writeByte((buffer >> 16) & 255);
  }
}

/** Frame info: image, components, block counts. */
class JpegInfo implements JpegComponentInfo {
  ss = 0;
  se = 63;
  ah = 0;
  al = 0;
  precision = 8;
  _imageBuffer: ArrayLike<number>;
  _imageWidth: number;
  _imageHeight: number;
  _colorspace: JpegColorSpace;
  _numberOfComponents: number;
  _componentsId: number[] = [];
  _hsampFactor: number[] = [];
  _vsampFactor: number[] = [];
  _qtableNumber: number[] = [];
  _dctableNumber: number[] = [];
  _actableNumber: number[] = [];
  _lastColumnIsDummy: (number | boolean)[];
  _lastRowIsDummy: (number | boolean)[];
  _compWidth: number[];
  _compHeight: number[];
  _blockWidth: number[];
  _blockHeight: number[];
  _maxHsampFactor = 1;
  _maxVsampFactor = 1;

  constructor(
    buffer: ArrayLike<number>,
    width: number,
    height: number,
    colorspace: JpegColorSpace,
  ) {
    const count = colorspace.length;
    this._imageBuffer = buffer;
    this._imageWidth = width;
    this._imageHeight = height;
    this._colorspace = colorspace;
    this._numberOfComponents = count;
    this._lastColumnIsDummy = zeros(count);
    this._lastRowIsDummy = zeros(count);
    this._compWidth = zeros(count);
    this._compHeight = zeros(count);
    this._blockWidth = zeros(count);
    this._blockHeight = zeros(count);
    this._init();
  }

  private _init(): void {
    this._colorspace.init(this);
    for (let i = 0; i < this._numberOfComponents; i++) {
      this._maxHsampFactor = Math.max(this._maxHsampFactor, this._hsampFactor[i] as number);
      this._maxVsampFactor = Math.max(this._maxVsampFactor, this._vsampFactor[i] as number);
    }
    for (let i = 0; i < this._numberOfComponents; i++) {
      const hsamp = this._hsampFactor[i] as number;
      const vsamp = this._vsampFactor[i] as number;
      this._compWidth[i] =
        ((this._imageWidth % 8 != 0 ? 8 * Math.ceil(this._imageWidth / 8) : this._imageWidth) /
          this._maxHsampFactor) *
        hsamp;
      if (this._compWidth[i] != (this._imageWidth / this._maxHsampFactor) * hsamp) {
        this._lastColumnIsDummy[i] = true;
      }
      this._blockWidth[i] = Math.ceil((this._compWidth[i] as number) / 8);
      this._compHeight[i] =
        ((this._imageHeight % 8 != 0 ? 8 * Math.ceil(this._imageHeight / 8) : this._imageHeight) /
          this._maxVsampFactor) *
        vsamp;
      if (this._compHeight[i] != (this._imageHeight / this._maxVsampFactor) * vsamp) {
        this._lastRowIsDummy[i] = true;
      }
      this._blockHeight[i] = Math.ceil((this._compHeight[i] as number) / 8);
    }
  }

  /** The packed pixel at (x, y); x past the width reads into the next row. */
  getPixel(x: number, y: number): number | undefined {
    return this._imageBuffer[x + this._imageWidth * y];
  }
}

export class JpegEncoder {
  static ColorSpace = ColorSpace;

  _dct: Dct | null = null;
  _huf: Huffman | null = null;
  _info: JpegInfo | null = null;
  _colorspace: JpegColorSpace | null = null;
  _out: ByteBuffer | null = null;

  /**
   * Encodes in the PDF export worker: posts a "jpegencoder" request to the
   * first worker (the buffer is transferred) and resolves with the JPEG
   * bytes it answers with. (The name's typo is the old API.)
   */
  concurrenyEncode(
    factory: PromiseFactory,
    workers: MessageWorker[],
    buffer: ArrayBuffer,
    width: number,
    height: number,
    colorspace: JpegColorSpace,
    quality: number,
  ): Promise<ArrayBuffer> {
    const colorspaceName = Object.keys(ColorSpace).find(
      (name) => ColorSpace[name as keyof typeof ColorSpace] === colorspace,
    );
    return factory.createPromise<ArrayBuffer>((resolve, reject) => {
      const worker = workers[0] as MessageWorker;
      const id = uuid();
      worker.postMessage(
        {
          uuid: id,
          command: "jpegencoder",
          buffer,
          width,
          height,
          colorspace: colorspaceName,
          quality,
        },
        [buffer],
      );
      const onError = (error: unknown): void => {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        reject(error);
      };
      const onMessage = (event: MessageEvent): void => {
        const data = event.data as { uuid?: string; command?: string; buffer: ArrayBuffer };
        if (data.uuid === id && "jpegencoder" === data.command) {
          worker.removeEventListener("message", onMessage);
          worker.removeEventListener("error", onError);
          resolve(data.buffer);
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
    });
  }

  /**
   * Encodes `buffer` (one packed pixel per entry, first component in the
   * low byte) as a baseline JPEG. Quality 1..100 (clamped).
   */
  encode(
    buffer: ArrayLike<number>,
    width: number,
    height: number,
    quality: number,
    colorspace: JpegColorSpace,
  ): Uint8ClampedArray {
    this._colorspace = colorspace;
    this._out = new ByteBuffer(524288);
    this._info = new JpegInfo(buffer, width, height, colorspace);
    this._dct = new Dct(quality);
    this._huf = new Huffman(width, height);
    this._writeHeaders();
    this._writeCompressedData();
    this._writeEOI();
    return this._out.getBuffer();
  }

  private _writeHeaders(): void {
    this._writeWord(65496);
    if ((this._colorspace as JpegColorSpace).APP14) this._writeAPP14();
    else this._writeAPP0();
    this._writeDQT();
    this._writeSOF();
    this._writeDHT();
    this._writeSOS();
  }

  private _writeCompressedData(): void {
    const info = this._info as JpegInfo;
    const dct = this._dct as Dct;
    const huffman = this._huf as Huffman;
    const out = this._out as ByteBuffer;
    const colorspace = this._colorspace as JpegColorSpace;
    const lastDC = zeros(info._numberOfComponents);
    const block = new Int32Array(64);
    const width = info._imageWidth;
    const height = info._imageHeight;
    let blocksAcross = width % 8 != 0 ? 8 * (Math.floor(width / 8) + 1) : width;
    let blocksDown = height % 8 != 0 ? 8 * (Math.floor(height / 8) + 1) : height;
    for (let component = 0; component < info._numberOfComponents; component++) {
      blocksAcross = Math.min(blocksAcross, info._blockWidth[component] as number);
      blocksDown = Math.min(blocksDown, info._blockHeight[component] as number);
    }
    for (let blockRow = 0; blockRow < blocksDown; blockRow++) {
      for (let blockColumn = 0; blockColumn < blocksAcross; blockColumn++) {
        const x = 8 * blockColumn;
        const y = 8 * blockRow;
        let index = 0;
        for (let row = 0; row < 8; row++) {
          for (let column = 0; column < 8; column++) {
            block[index++] = info.getPixel(x + column, y + row) as number;
          }
        }
        for (let component = 0; component < info._numberOfComponents; component++) {
          // map on an Int32Array keeps an Int32Array: the values are truncated.
          const values = block
            .slice()
            .map((pixel) => colorspace.converter(pixel)[component] as number);
          const transformed = dct.forwardDCT(values);
          const quantized = dct.quantizeBlock(transformed, info._qtableNumber[component] as number);
          huffman.blockEncoder(
            out,
            quantized,
            lastDC[component] as number,
            info._dctableNumber[component] as number,
            info._actableNumber[component] as number,
          );
          lastDC[component] = quantized[0] as number;
        }
      }
    }
    huffman.flushBuffer(out);
  }

  private _writeAPP0(): void {
    this._writeWord(65504);
    this._writeWord(16);
    // "JFIF\0", version 1.1, no units, density 1x1, no thumbnail.
    this._writeByte(74);
    this._writeByte(70);
    this._writeByte(73);
    this._writeByte(70);
    this._writeByte(0);
    this._writeByte(1);
    this._writeByte(1);
    this._writeByte(0);
    this._writeWord(1);
    this._writeWord(1);
    this._writeByte(0);
    this._writeByte(0);
  }

  private _writeAPP14(): void {
    this._writeWord(65518);
    this._writeWord(14);
    // "Adobe", version 100, flags 0 0, transform 0 (no YCbCr/YCCK).
    this._writeByte(65);
    this._writeByte(100);
    this._writeByte(111);
    this._writeByte(98);
    this._writeByte(101);
    this._writeWord(100);
    this._writeWord(0);
    this._writeWord(0);
    this._writeByte(0);
  }

  private _writeDQT(): void {
    const dct = this._dct as Dct;
    this._writeWord(65499);
    this._writeByte(0);
    this._writeByte(132);
    for (let table = 0; table < 2; table++) {
      this._writeByte(0 + table);
      const quantum = dct._quantum[table] as Int32Array;
      // Entries 32..63 don't exist: undefined is written as 0.
      for (let i = 0; i < 64; i++) {
        this._writeByte(quantum[JPEG_NATURAL_ORDER[i] as number] as number);
      }
    }
  }

  private _writeSOF(): void {
    const info = this._info as JpegInfo;
    this._writeWord(65472);
    this._writeWord(3 * info._numberOfComponents + 2 + 5 + 1);
    this._writeByte(info.precision);
    this._writeWord(info._imageHeight);
    this._writeWord(info._imageWidth);
    this._writeByte(info._numberOfComponents);
    for (let i = 0; i < info._numberOfComponents; i++) {
      this._writeByte(info._componentsId[i] as number);
      this._writeByte(((info._hsampFactor[i] as number) << 4) + (info._vsampFactor[i] as number));
      this._writeByte(info._qtableNumber[i] as number);
    }
  }

  private _writeDHT(): void {
    const huffman = this._huf as Huffman;
    // The old code assembled the segment with splices into zero arrays; the
    // result is the marker, then per table its 17 count bytes and values.
    let segment: number[] = [255, 196, 0, 0];
    for (let table = 0; table < 4; table++) {
      const bits = huffman._bits[table] as Uint32Array;
      const counts: number[] = [bits[0] as number];
      let total = 0;
      for (let length = 1; length < 17; length++) {
        counts.push(bits[length] as number);
        total += bits[length] as number;
      }
      const values: number[] = [];
      for (let i = 0; i < total; i++)
        values.push((huffman._val[table] as Uint32Array)[i] as number);
      segment = segment.concat(counts, values);
    }
    segment[2] = ((segment.length - 2) >> 8) & 255;
    segment[3] = (segment.length - 2) & 255;
    this._writeArray(segment);
  }

  private _writeSOS(): void {
    const info = this._info as JpegInfo;
    this._writeWord(65498);
    this._writeWord(2 * info._numberOfComponents + 2 + 1 + 3);
    this._writeByte(info._numberOfComponents);
    for (let i = 0; i < info._numberOfComponents; i++) {
      this._writeByte(info._componentsId[i] as number);
      this._writeByte(
        ((info._dctableNumber[i] as number) << 4) + (info._actableNumber[i] as number),
      );
    }
    this._writeByte(info.ss);
    this._writeByte(info.se);
    this._writeByte((info.ah << 4) + info.al);
  }

  private _writeEOI(): void {
    this._writeWord(65497);
  }

  private _writeArray(values: ArrayLike<number>): void {
    (this._out as ByteBuffer).writeArray(values);
  }

  private _writeByte(value: number): void {
    (this._out as ByteBuffer).writeByte(value);
  }

  private _writeWord(value: number): void {
    (this._out as ByteBuffer).writeWord(value);
  }
}
