// Old: chunk.vendor.js module 659 (JPEG decoder, a fork of pdf.js' jpg.js).
import { Color } from "./color.ts";

// Gravit decodes JPEGs itself only for CMYK images, which browsers draw
// without color management. Everything here must stay bit-identical to
// the old decoder: the integer IDCT, the plain nearest-neighbour
// resampling and the CMYK → RGB conversion through Color.cmykToRGB (which
// uses the ICC profile once it has loaded).

/** Zig-zag order of the 64 DCT coefficients. */
const DCT_ZIG_ZAG = new Int32Array([
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20,
  13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52,
  45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
]);

// Fixed-point IDCT constants (scaled by 4096).
const DCT_COS1 = 4017; // cos(pi/16)
const DCT_SIN1 = 799; // sin(pi/16)
const DCT_COS3 = 3406; // cos(3*pi/16)
const DCT_SIN3 = 2276; // sin(3*pi/16)
const DCT_COS6 = 1567; // cos(6*pi/16)
const DCT_SIN6 = 3784; // sin(6*pi/16)
const DCT_SQRT2 = 5793; // sqrt(2)
const DCT_SQRT1D2 = 2896; // sqrt(2) / 2

/** A Huffman tree: nested arrays indexed by bit, with symbols at the leaves. */
type HuffmanNode = (number | HuffmanNode)[];

interface JpegComponent {
  h: number;
  v: number;
  quantizationIdx?: number;
  quantizationTable?: Int32Array;
  blocksPerLine: number;
  blocksPerColumn: number;
  blocks: Int32Array[][];
  huffmanTableDC: HuffmanNode;
  huffmanTableAC: HuffmanNode;
  pred: number;
}

interface JpegFrame {
  extended: boolean;
  progressive: boolean;
  precision: number;
  scanLines: number;
  samplesPerLine: number;
  components: Record<number, JpegComponent>;
  componentsOrder: number[];
  maxH: number;
  maxV: number;
  mcusPerLine: number;
  mcusPerColumn: number;
}

interface Jfif {
  version: { major: number; minor: number };
  densityUnits: number;
  xDensity: number;
  yDensity: number;
  thumbWidth: number;
  thumbHeight: number;
  thumbData: Uint8Array;
}

interface Adobe {
  version: number;
  flags0: number;
  flags1: number;
  transformCode: number;
}

interface DecodedComponent {
  lines: Uint8Array[];
  scaleX: number;
  scaleY: number;
}

/** The target of copyToImageData: an ImageData or the same shape. */
export interface ImageDataLike {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

type DecodeBlock = (component: JpegComponent, block: Int32Array) => void;

function buildHuffmanTable(codeLengths: Uint8Array, values: Uint8Array): HuffmanNode {
  interface Code {
    children: HuffmanNode;
    index: number;
  }
  let k = 0;
  const code: Code[] = [];
  let length = 16;
  while (length > 0 && !codeLengths[length - 1]) length--;
  code.push({ children: [], index: 0 });
  let p = code[0] as Code;
  let q: Code;
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < (codeLengths[i] as number); j++) {
      p = code.pop() as Code;
      p.children[p.index] = values[k] as number;
      while (p.index > 0) p = code.pop() as Code;
      p.index++;
      code.push(p);
      while (code.length <= i) {
        code.push((q = { children: [], index: 0 }));
        p.children[p.index] = q.children;
        p = q;
      }
      k++;
    }
    if (i + 1 < length) {
      // p here points to the last code
      code.push((q = { children: [], index: 0 }));
      p.children[p.index] = q.children;
      p = q;
    }
  }
  return (code[0] as Code).children;
}

function decodeScan(
  data: Uint8Array,
  offset: number,
  frame: JpegFrame,
  components: JpegComponent[],
  resetInterval: number | undefined,
  spectralStart: number,
  spectralEnd: number,
  successivePrev: number,
  successive: number,
): number {
  const mcusPerLine = frame.mcusPerLine;
  const progressive = frame.progressive;
  const startOffset = offset;
  let bitsData = 0;
  let bitsCount = 0;

  function readBit(): number {
    if (bitsCount > 0) {
      bitsCount--;
      return (bitsData >> bitsCount) & 1;
    }
    bitsData = data[offset++] as number;
    if (bitsData == 0xff) {
      const nextByte = data[offset++] as number;
      if (nextByte) {
        throw "unexpected marker: " + ((bitsData << 8) | nextByte).toString(16);
      }
      // unstuff 0
    }
    bitsCount = 7;
    return bitsData >>> 7;
  }

  function decodeHuffman(tree: HuffmanNode): number | null {
    let node: number | HuffmanNode | undefined = tree;
    let bit: number | null;
    while ((bit = readBit()) !== null) {
      node = (node as HuffmanNode)[bit];
      if (typeof node === "number") return node;
      if (typeof node !== "object") throw "invalid huffman sequence";
    }
    return null;
  }

  function receive(length: number): number | undefined {
    let n = 0;
    while (length > 0) {
      const bit = readBit();
      if (bit === null) return undefined;
      n = (n << 1) | bit;
      length--;
    }
    return n;
  }

  function receiveAndExtend(length: number): number {
    const n = receive(length) as number;
    if (n >= 1 << (length - 1)) return n;
    return n + (-1 << length) + 1;
  }

  let eobrun = 0;
  let successiveACState = 0;
  let successiveACNextValue = 0;

  function decodeBaseline(component: JpegComponent, zz: Int32Array): void {
    const t = decodeHuffman(component.huffmanTableDC);
    const diff = t === 0 ? 0 : receiveAndExtend(t as number);
    zz[0] = component.pred += diff;
    let k = 1;
    while (k < 64) {
      const rs = decodeHuffman(component.huffmanTableAC) as number;
      const s = rs & 15;
      const r = rs >> 4;
      if (s === 0) {
        if (r < 15) break;
        k += 16;
        continue;
      }
      k += r;
      const z = DCT_ZIG_ZAG[k] as number;
      zz[z] = receiveAndExtend(s);
      k++;
    }
  }

  function decodeDCFirst(component: JpegComponent, zz: Int32Array): void {
    const t = decodeHuffman(component.huffmanTableDC);
    const diff = t === 0 ? 0 : receiveAndExtend(t as number) << successive;
    zz[0] = component.pred += diff;
  }

  function decodeDCSuccessive(_component: JpegComponent, zz: Int32Array): void {
    zz[0] = (zz[0] as number) | (readBit() << successive);
  }

  function decodeACFirst(component: JpegComponent, zz: Int32Array): void {
    if (eobrun > 0) {
      eobrun--;
      return;
    }
    let k = spectralStart;
    const e = spectralEnd;
    while (k <= e) {
      const rs = decodeHuffman(component.huffmanTableAC) as number;
      const s = rs & 15;
      const r = rs >> 4;
      if (s === 0) {
        if (r < 15) {
          eobrun = (receive(r) as number) + (1 << r) - 1;
          break;
        }
        k += 16;
        continue;
      }
      k += r;
      const z = DCT_ZIG_ZAG[k] as number;
      zz[z] = receiveAndExtend(s) * (1 << successive);
      k++;
    }
  }

  function decodeACSuccessive(component: JpegComponent, zz: Int32Array): void {
    let k = spectralStart;
    const e = spectralEnd;
    let r = 0;
    while (k <= e) {
      const z = DCT_ZIG_ZAG[k] as number;
      switch (successiveACState) {
        case 0: {
          // initial state
          const rs = decodeHuffman(component.huffmanTableAC) as number;
          const s = rs & 15;
          r = rs >> 4;
          if (s === 0) {
            if (r < 15) {
              eobrun = (receive(r) as number) + (1 << r);
              successiveACState = 4;
            } else {
              r = 16;
              successiveACState = 1;
            }
          } else {
            if (s !== 1) throw "invalid ACn encoding";
            successiveACNextValue = receiveAndExtend(s);
            successiveACState = r ? 2 : 3;
          }
          continue;
        }
        case 1: // skipping r zero items
        case 2:
          if (zz[z]) {
            zz[z] = (zz[z] as number) + (readBit() << successive);
          } else {
            r--;
            if (r === 0) successiveACState = successiveACState == 2 ? 3 : 0;
          }
          break;
        case 3: // set value for a zero item
          if (zz[z]) {
            zz[z] = (zz[z] as number) + (readBit() << successive);
          } else {
            zz[z] = successiveACNextValue << successive;
            successiveACState = 0;
          }
          break;
        case 4: // eob
          if (zz[z]) zz[z] = (zz[z] as number) + (readBit() << successive);
          break;
      }
      k++;
    }
    if (successiveACState === 4) {
      eobrun--;
      if (eobrun === 0) successiveACState = 0;
    }
  }

  function decodeMcu(
    component: JpegComponent,
    decode: DecodeBlock,
    mcu: number,
    row: number,
    col: number,
  ): void {
    const mcuRow = (mcu / mcusPerLine) | 0;
    const mcuCol = mcu % mcusPerLine;
    const blockRow = mcuRow * component.v + row;
    const blockCol = mcuCol * component.h + col;
    decode(component, (component.blocks[blockRow] as Int32Array[])[blockCol] as Int32Array);
  }

  function decodeBlock(component: JpegComponent, decode: DecodeBlock, mcu: number): void {
    const blockRow = (mcu / component.blocksPerLine) | 0;
    const blockCol = mcu % component.blocksPerLine;
    decode(component, (component.blocks[blockRow] as Int32Array[])[blockCol] as Int32Array);
  }

  const componentsLength = components.length;
  let decodeFn: DecodeBlock;
  if (progressive) {
    if (spectralStart === 0) {
      decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
    } else {
      decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
    }
  } else {
    decodeFn = decodeBaseline;
  }

  let mcu = 0;
  const mcuExpected =
    componentsLength == 1
      ? (components[0] as JpegComponent).blocksPerLine *
        (components[0] as JpegComponent).blocksPerColumn
      : mcusPerLine * frame.mcusPerColumn;
  if (!resetInterval) resetInterval = mcuExpected;

  while (mcu < mcuExpected) {
    // reset interval stuff
    for (let i = 0; i < componentsLength; i++) (components[i] as JpegComponent).pred = 0;
    eobrun = 0;

    if (componentsLength == 1) {
      const component = components[0] as JpegComponent;
      for (let n = 0; n < resetInterval; n++) {
        decodeBlock(component, decodeFn, mcu);
        mcu++;
      }
    } else {
      for (let n = 0; n < resetInterval; n++) {
        for (let i = 0; i < componentsLength; i++) {
          const component = components[i] as JpegComponent;
          const h = component.h;
          const v = component.v;
          for (let j = 0; j < v; j++) {
            for (let k = 0; k < h; k++) decodeMcu(component, decodeFn, mcu, j, k);
          }
        }
        mcu++;
        // If we've reached our expected MCU's, stop decoding
        if (mcu === mcuExpected) break;
      }
    }

    // find marker
    bitsCount = 0;
    const marker = ((data[offset] as number) << 8) | (data[offset + 1] as number);
    if (marker < 0xff00) throw "marker was not found";
    if (marker >= 0xffd0 && marker <= 0xffd7) {
      // RSTx
      offset += 2;
    } else {
      break;
    }
  }

  return offset - startOffset;
}

/** Dequantizes and inverse-transforms every block of a component into 8-bit lines. */
function buildComponentData(component: JpegComponent): Uint8Array[] {
  const lines: Uint8Array[] = [];
  const blocksPerLine = component.blocksPerLine;
  const blocksPerColumn = component.blocksPerColumn;
  const samplesPerLine = blocksPerLine << 3;
  const workspace = new Int32Array(64);
  const blockOut = new Uint8Array(64);

  // A port of poppler's IDCT method which in turn is taken from:
  //   Christoph Loeffler, Adriaan Ligtenberg, George S. Moschytz,
  //   "Practical Fast 1-D DCT Algorithms with 11 Multiplications",
  //   IEEE Intl. Conf. on Acoustics, Speech & Signal Processing, 1989, 988-991.
  function quantizeAndInverse(zz: Int32Array, dataOut: Uint8Array, dataIn: Int32Array): void {
    const qt = component.quantizationTable as Int32Array;
    let v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number;
    let v7: number, t: number;
    const p = dataIn;
    let i: number;

    // dequant
    for (i = 0; i < 64; i++) p[i] = (zz[i] as number) * (qt[i] as number);

    // inverse DCT on rows
    for (i = 0; i < 8; ++i) {
      const row = 8 * i;

      // check for all-zero AC coefficients
      if (
        p[1 + row] == 0 &&
        p[2 + row] == 0 &&
        p[3 + row] == 0 &&
        p[4 + row] == 0 &&
        p[5 + row] == 0 &&
        p[6 + row] == 0 &&
        p[7 + row] == 0
      ) {
        t = (DCT_SQRT2 * (p[0 + row] as number) + 512) >> 10;
        p[0 + row] = t;
        p[1 + row] = t;
        p[2 + row] = t;
        p[3 + row] = t;
        p[4 + row] = t;
        p[5 + row] = t;
        p[6 + row] = t;
        p[7 + row] = t;
        continue;
      }

      // stage 4
      v0 = (DCT_SQRT2 * (p[0 + row] as number) + 128) >> 8;
      v1 = (DCT_SQRT2 * (p[4 + row] as number) + 128) >> 8;
      v2 = p[2 + row] as number;
      v3 = p[6 + row] as number;
      v4 = (DCT_SQRT1D2 * ((p[1 + row] as number) - (p[7 + row] as number)) + 128) >> 8;
      v7 = (DCT_SQRT1D2 * ((p[1 + row] as number) + (p[7 + row] as number)) + 128) >> 8;
      v5 = (p[3 + row] as number) << 4;
      v6 = (p[5 + row] as number) << 4;

      // stage 3
      t = (v0 - v1 + 1) >> 1;
      v0 = (v0 + v1 + 1) >> 1;
      v1 = t;
      t = (v2 * DCT_SIN6 + v3 * DCT_COS6 + 128) >> 8;
      v2 = (v2 * DCT_COS6 - v3 * DCT_SIN6 + 128) >> 8;
      v3 = t;
      t = (v4 - v6 + 1) >> 1;
      v4 = (v4 + v6 + 1) >> 1;
      v6 = t;
      t = (v7 + v5 + 1) >> 1;
      v5 = (v7 - v5 + 1) >> 1;
      v7 = t;

      // stage 2
      t = (v0 - v3 + 1) >> 1;
      v0 = (v0 + v3 + 1) >> 1;
      v3 = t;
      t = (v1 - v2 + 1) >> 1;
      v1 = (v1 + v2 + 1) >> 1;
      v2 = t;
      t = (v4 * DCT_SIN3 + v7 * DCT_COS3 + 2048) >> 12;
      v4 = (v4 * DCT_COS3 - v7 * DCT_SIN3 + 2048) >> 12;
      v7 = t;
      t = (v5 * DCT_SIN1 + v6 * DCT_COS1 + 2048) >> 12;
      v5 = (v5 * DCT_COS1 - v6 * DCT_SIN1 + 2048) >> 12;
      v6 = t;

      // stage 1
      p[0 + row] = v0 + v7;
      p[7 + row] = v0 - v7;
      p[1 + row] = v1 + v6;
      p[6 + row] = v1 - v6;
      p[2 + row] = v2 + v5;
      p[5 + row] = v2 - v5;
      p[3 + row] = v3 + v4;
      p[4 + row] = v3 - v4;
    }

    // inverse DCT on columns
    for (i = 0; i < 8; ++i) {
      const col = i;

      // check for all-zero AC coefficients
      if (
        p[1 * 8 + col] == 0 &&
        p[2 * 8 + col] == 0 &&
        p[3 * 8 + col] == 0 &&
        p[4 * 8 + col] == 0 &&
        p[5 * 8 + col] == 0 &&
        p[6 * 8 + col] == 0 &&
        p[7 * 8 + col] == 0
      ) {
        t = (DCT_SQRT2 * (dataIn[i + 0] as number) + 8192) >> 14;
        p[0 * 8 + col] = t;
        p[1 * 8 + col] = t;
        p[2 * 8 + col] = t;
        p[3 * 8 + col] = t;
        p[4 * 8 + col] = t;
        p[5 * 8 + col] = t;
        p[6 * 8 + col] = t;
        p[7 * 8 + col] = t;
        continue;
      }

      // stage 4
      v0 = (DCT_SQRT2 * (p[0 * 8 + col] as number) + 2048) >> 12;
      v1 = (DCT_SQRT2 * (p[4 * 8 + col] as number) + 2048) >> 12;
      v2 = p[2 * 8 + col] as number;
      v3 = p[6 * 8 + col] as number;
      v4 = (DCT_SQRT1D2 * ((p[1 * 8 + col] as number) - (p[7 * 8 + col] as number)) + 2048) >> 12;
      v7 = (DCT_SQRT1D2 * ((p[1 * 8 + col] as number) + (p[7 * 8 + col] as number)) + 2048) >> 12;
      v5 = p[3 * 8 + col] as number;
      v6 = p[5 * 8 + col] as number;

      // stage 3
      t = (v0 - v1 + 1) >> 1;
      v0 = (v0 + v1 + 1) >> 1;
      v1 = t;
      t = (v2 * DCT_SIN6 + v3 * DCT_COS6 + 2048) >> 12;
      v2 = (v2 * DCT_COS6 - v3 * DCT_SIN6 + 2048) >> 12;
      v3 = t;
      t = (v4 - v6 + 1) >> 1;
      v4 = (v4 + v6 + 1) >> 1;
      v6 = t;
      t = (v7 + v5 + 1) >> 1;
      v5 = (v7 - v5 + 1) >> 1;
      v7 = t;

      // stage 2
      t = (v0 - v3 + 1) >> 1;
      v0 = (v0 + v3 + 1) >> 1;
      v3 = t;
      t = (v1 - v2 + 1) >> 1;
      v1 = (v1 + v2 + 1) >> 1;
      v2 = t;
      t = (v4 * DCT_SIN3 + v7 * DCT_COS3 + 2048) >> 12;
      v4 = (v4 * DCT_COS3 - v7 * DCT_SIN3 + 2048) >> 12;
      v7 = t;
      t = (v5 * DCT_SIN1 + v6 * DCT_COS1 + 2048) >> 12;
      v5 = (v5 * DCT_COS1 - v6 * DCT_SIN1 + 2048) >> 12;
      v6 = t;

      // stage 1
      p[0 * 8 + col] = v0 + v7;
      p[7 * 8 + col] = v0 - v7;
      p[1 * 8 + col] = v1 + v6;
      p[6 * 8 + col] = v1 - v6;
      p[2 * 8 + col] = v2 + v5;
      p[5 * 8 + col] = v2 - v5;
      p[3 * 8 + col] = v3 + v4;
      p[4 * 8 + col] = v3 - v4;
    }

    // convert to 8-bit integers
    for (i = 0; i < 64; ++i) {
      const sample = 128 + (((p[i] as number) + 8) >> 4);
      dataOut[i] = sample < 0 ? 0 : sample > 0xff ? 0xff : sample;
    }
  }

  for (let blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
    const scanLine = blockRow << 3;
    for (let i = 0; i < 8; i++) lines.push(new Uint8Array(samplesPerLine));
    for (let blockCol = 0; blockCol < blocksPerLine; blockCol++) {
      quantizeAndInverse(
        (component.blocks[blockRow] as Int32Array[])[blockCol] as Int32Array,
        blockOut,
        workspace,
      );
      let offset = 0;
      const sample = blockCol << 3;
      for (let j = 0; j < 8; j++) {
        const line = lines[scanLine + j] as Uint8Array;
        for (let i = 0; i < 8; i++) line[sample + i] = blockOut[offset++] as number;
      }
    }
  }
  return lines;
}

function clampTo8bit(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

/** Sets up the block buffers of every component once the frame header is read. */
function prepareComponents(frame: JpegFrame): void {
  let maxH = 0;
  let maxV = 0;
  for (const id in frame.components) {
    if (Object.hasOwn(frame.components, id)) {
      const component = frame.components[id] as JpegComponent;
      if (maxH < component.h) maxH = component.h;
      if (maxV < component.v) maxV = component.v;
    }
  }
  const mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / maxH);
  const mcusPerColumn = Math.ceil(frame.scanLines / 8 / maxV);
  for (const id in frame.components) {
    if (Object.hasOwn(frame.components, id)) {
      const component = frame.components[id] as JpegComponent;
      const blocksPerLine = Math.ceil((Math.ceil(frame.samplesPerLine / 8) * component.h) / maxH);
      const blocksPerColumn = Math.ceil((Math.ceil(frame.scanLines / 8) * component.v) / maxV);
      const blocksPerLineForMcu = mcusPerLine * component.h;
      const blocksPerColumnForMcu = mcusPerColumn * component.v;
      const blocks: Int32Array[][] = [];
      for (let i = 0; i < blocksPerColumnForMcu; i++) {
        const row: Int32Array[] = [];
        for (let j = 0; j < blocksPerLineForMcu; j++) row.push(new Int32Array(64));
        blocks.push(row);
      }
      component.blocksPerLine = blocksPerLine;
      component.blocksPerColumn = blocksPerColumn;
      component.blocks = blocks;
    }
  }
  frame.maxH = maxH;
  frame.maxV = maxV;
  frame.mcusPerLine = mcusPerLine;
  frame.mcusPerColumn = mcusPerColumn;
}

/** The jpg.js decoder itself: parse() reads the file, getData() resamples. */
export class JpegImage {
  width = 0;
  height = 0;
  jfif: Jfif | null = null;
  adobe: Adobe | null = null;
  components: DecodedComponent[] = [];
  /** Forces (true) or disables (false) the YCbCr transform when there is no Adobe marker. */
  colorTransform: boolean | undefined;
  onload: (() => void) | undefined;

  load(path: string): void {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", path, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = () => {
      const data = new Uint8Array(xhr.response as ArrayBuffer);
      this.parse(data);
      if (this.onload) this.onload();
    };
    xhr.send(null);
  }

  parse(data: Uint8Array): void {
    let offset = 0;

    function readUint16(): number {
      const value = ((data[offset] as number) << 8) | (data[offset + 1] as number);
      offset += 2;
      return value;
    }

    function readDataBlock(): Uint8Array {
      const length = readUint16();
      const array = data.subarray(offset, offset + length - 2);
      offset += array.length;
      return array;
    }

    let jfif: Jfif | null = null;
    let adobe: Adobe | null = null;
    let frame: JpegFrame | undefined;
    let resetInterval: number | undefined;
    const quantizationTables: Int32Array[] = [];
    const frames: JpegFrame[] = [];
    const huffmanTablesAC: HuffmanNode[] = [];
    const huffmanTablesDC: HuffmanNode[] = [];
    let fileMarker = readUint16();
    if (fileMarker != 0xffd8) {
      // SOI (Start of Image)
      throw "SOI not found";
    }

    fileMarker = readUint16();
    while (fileMarker != 0xffd9) {
      // EOI (End of image)
      switch (fileMarker) {
        case 0xff00:
          break;
        case 0xffe0: // APP0 (Application Specific)
        case 0xffe1: // APP1
        case 0xffe2: // APP2
        case 0xffe3: // APP3
        case 0xffe4: // APP4
        case 0xffe5: // APP5
        case 0xffe6: // APP6
        case 0xffe7: // APP7
        case 0xffe8: // APP8
        case 0xffe9: // APP9
        case 0xffea: // APP10
        case 0xffeb: // APP11
        case 0xffec: // APP12
        case 0xffed: // APP13
        case 0xffee: // APP14
        case 0xffef: // APP15
        case 0xfffe: {
          // COM (Comment)
          const appData = readDataBlock();

          if (fileMarker === 0xffe0) {
            if (
              appData[0] === 0x4a &&
              appData[1] === 0x46 &&
              appData[2] === 0x49 &&
              appData[3] === 0x46 &&
              appData[4] === 0
            ) {
              // 'JFIF\x00'
              jfif = {
                version: { major: appData[5] as number, minor: appData[6] as number },
                densityUnits: appData[7] as number,
                xDensity: ((appData[8] as number) << 8) | (appData[9] as number),
                yDensity: ((appData[10] as number) << 8) | (appData[11] as number),
                thumbWidth: appData[12] as number,
                thumbHeight: appData[13] as number,
                thumbData: appData.subarray(
                  14,
                  14 + 3 * (appData[12] as number) * (appData[13] as number),
                ),
              };
            }
          }
          // TODO APP1 - Exif
          if (fileMarker === 0xffee) {
            if (
              appData[0] === 0x41 &&
              appData[1] === 0x64 &&
              appData[2] === 0x6f &&
              appData[3] === 0x62 &&
              appData[4] === 0x65 &&
              appData[5] === 0
            ) {
              // 'Adobe\x00'
              adobe = {
                version: appData[6] as number,
                flags0: ((appData[7] as number) << 8) | (appData[8] as number),
                flags1: ((appData[9] as number) << 8) | (appData[10] as number),
                transformCode: appData[11] as number,
              };
            }
          }
          break;
        }

        case 0xffdb: {
          // DQT (Define Quantization Tables)
          const quantizationTablesEnd = readUint16() + offset - 2;
          while (offset < quantizationTablesEnd) {
            const quantizationTableSpec = data[offset++] as number;
            const tableData = new Int32Array(64);
            if (quantizationTableSpec >> 4 === 0) {
              // 8 bit values
              for (let j = 0; j < 64; j++) {
                const z = DCT_ZIG_ZAG[j] as number;
                tableData[z] = data[offset++] as number;
              }
            } else if (quantizationTableSpec >> 4 === 1) {
              // 16 bit
              for (let j = 0; j < 64; j++) {
                const z = DCT_ZIG_ZAG[j] as number;
                tableData[z] = readUint16();
              }
            } else {
              throw "DQT: invalid table spec";
            }
            quantizationTables[quantizationTableSpec & 15] = tableData;
          }
          break;
        }

        case 0xffc0: // SOF0 (Start of Frame, Baseline DCT)
        case 0xffc1: // SOF1 (Start of Frame, Extended DCT)
        case 0xffc2: {
          // SOF2 (Start of Frame, Progressive DCT)
          readUint16(); // skip data length
          const newFrame = {
            extended: fileMarker === 0xffc1,
            progressive: fileMarker === 0xffc2,
            precision: data[offset++] as number,
          } as JpegFrame;
          newFrame.scanLines = readUint16();
          newFrame.samplesPerLine = readUint16();
          newFrame.components = {};
          newFrame.componentsOrder = [];
          frame = newFrame;
          const componentsCount = data[offset++] as number;
          for (let i = 0; i < componentsCount; i++) {
            const componentId = data[offset] as number;
            const h = (data[offset + 1] as number) >> 4;
            const v = (data[offset + 1] as number) & 15;
            const qId = data[offset + 2] as number;
            newFrame.componentsOrder.push(componentId);
            newFrame.components[componentId] = {
              h: h,
              v: v,
              quantizationIdx: qId,
            } as JpegComponent;
            offset += 3;
          }
          prepareComponents(newFrame);
          frames.push(newFrame);
          break;
        }

        case 0xffc4: {
          // DHT (Define Huffman Tables)
          const huffmanLength = readUint16();
          for (let i = 2; i < huffmanLength;) {
            const huffmanTableSpec = data[offset++] as number;
            const codeLengths = new Uint8Array(16);
            let codeLengthSum = 0;
            for (let j = 0; j < 16; j++, offset++) {
              codeLengthSum += codeLengths[j] = data[offset] as number;
            }
            const huffmanValues = new Uint8Array(codeLengthSum);
            for (let j = 0; j < codeLengthSum; j++, offset++) {
              huffmanValues[j] = data[offset] as number;
            }
            i += 17 + codeLengthSum;

            (huffmanTableSpec >> 4 === 0 ? huffmanTablesDC : huffmanTablesAC)[
              huffmanTableSpec & 15
            ] = buildHuffmanTable(codeLengths, huffmanValues);
          }
          break;
        }

        case 0xffdd: // DRI (Define Restart Interval)
          readUint16(); // skip data length
          resetInterval = readUint16();
          break;

        case 0xffda: {
          // SOS (Start of Scan)
          readUint16(); // scanLength
          const selectorsCount = data[offset++] as number;
          const components: JpegComponent[] = [];
          const currentFrame = frame as JpegFrame;
          for (let i = 0; i < selectorsCount; i++) {
            const component = currentFrame.components[data[offset++] as number] as JpegComponent;
            const tableSpec = data[offset++] as number;
            component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4] as HuffmanNode;
            component.huffmanTableAC = huffmanTablesAC[tableSpec & 15] as HuffmanNode;
            components.push(component);
          }
          const spectralStart = data[offset++] as number;
          const spectralEnd = data[offset++] as number;
          const successiveApproximation = data[offset++] as number;
          const processed = decodeScan(
            data,
            offset,
            currentFrame,
            components,
            resetInterval,
            spectralStart,
            spectralEnd,
            successiveApproximation >> 4,
            successiveApproximation & 15,
          );
          offset += processed;
          break;
        }

        default:
          if (
            data[offset - 3] == 0xff &&
            (data[offset - 2] as number) >= 0xc0 &&
            (data[offset - 2] as number) <= 0xfe
          ) {
            // could be incorrect encoding -- last 0xFF byte of the previous
            // block was eaten by the encoder
            offset -= 3;
            break;
          }
          throw "unknown JPEG marker " + fileMarker.toString(16);
      }
      fileMarker = readUint16();
    }
    if (frames.length != 1) throw "only single frame JPEGs supported";

    // set each frame's components quantization table
    for (let i = 0; i < frames.length; i++) {
      const cp = (frames[i] as JpegFrame).components;
      for (const j in cp) {
        const component = cp[j] as JpegComponent;
        component.quantizationTable = quantizationTables[component.quantizationIdx as number];
        delete component.quantizationIdx;
      }
    }

    const decodedFrame = frame as JpegFrame;
    this.width = decodedFrame.samplesPerLine;
    this.height = decodedFrame.scanLines;
    this.jfif = jfif;
    this.adobe = adobe;
    this.components = [];
    for (let i = 0; i < decodedFrame.componentsOrder.length; i++) {
      const component = decodedFrame.components[
        decodedFrame.componentsOrder[i] as number
      ] as JpegComponent;
      this.components.push({
        lines: buildComponentData(component),
        scaleX: component.h / decodedFrame.maxH,
        scaleY: component.v / decodedFrame.maxV,
      });
    }
  }

  /** The samples resampled to width × height, one byte per component (CMYK inverted back). */
  getData(width: number, height: number): Uint8Array {
    const scaleX = this.width / width;
    const scaleY = this.height / height;
    let offset = 0;
    const dataLength = width * height * this.components.length;
    const data = new Uint8Array(dataLength);
    let component1: DecodedComponent;
    let component2: DecodedComponent;
    let component3: DecodedComponent;
    let component4: DecodedComponent;
    let line1: Uint8Array, line2: Uint8Array, line3: Uint8Array, line4: Uint8Array;
    let Y: number, Cb: number, Cr: number, K: number, C: number, M: number, Ye: number;
    let R: number, G: number, B: number;
    let colorTransform: boolean;
    const sample = (line: Uint8Array, component: DecodedComponent, x: number) =>
      line[0 | (x * component.scaleX * scaleX)] as number;
    const lineAt = (component: DecodedComponent, y: number) =>
      component.lines[0 | (y * component.scaleY * scaleY)] as Uint8Array;
    switch (this.components.length) {
      case 1:
        component1 = this.components[0] as DecodedComponent;
        for (let y = 0; y < height; y++) {
          line1 = lineAt(component1, y);
          for (let x = 0; x < width; x++) {
            Y = sample(line1, component1, x);
            data[offset++] = Y;
          }
        }
        break;
      case 2:
        // PDF might compress two component data in custom colorspace
        component1 = this.components[0] as DecodedComponent;
        component2 = this.components[1] as DecodedComponent;
        for (let y = 0; y < height; y++) {
          line1 = lineAt(component1, y);
          line2 = lineAt(component2, y);
          for (let x = 0; x < width; x++) {
            Y = sample(line1, component1, x);
            data[offset++] = Y;
            Y = sample(line2, component2, x);
            data[offset++] = Y;
          }
        }
        break;
      case 3:
        // The default transform for three components is true
        colorTransform = true;
        // The adobe transform marker overrides any previous setting
        if (this.adobe && this.adobe.transformCode) colorTransform = true;
        else if (typeof this.colorTransform !== "undefined") colorTransform = !!this.colorTransform;

        component1 = this.components[0] as DecodedComponent;
        component2 = this.components[1] as DecodedComponent;
        component3 = this.components[2] as DecodedComponent;
        for (let y = 0; y < height; y++) {
          line1 = lineAt(component1, y);
          line2 = lineAt(component2, y);
          line3 = lineAt(component3, y);
          for (let x = 0; x < width; x++) {
            if (!colorTransform) {
              R = sample(line1, component1, x);
              G = sample(line2, component2, x);
              B = sample(line3, component3, x);
            } else {
              Y = sample(line1, component1, x);
              Cb = sample(line2, component2, x);
              Cr = sample(line3, component3, x);

              R = clampTo8bit(Y + 1.402 * (Cr - 128));
              G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
              B = clampTo8bit(Y + 1.772 * (Cb - 128));
            }

            data[offset++] = R;
            data[offset++] = G;
            data[offset++] = B;
          }
        }
        break;
      case 4:
        if (!this.adobe) throw "Unsupported color mode (4 components)";
        // The default transform for four components is false
        colorTransform = false;
        // The adobe transform marker overrides any previous setting
        if (this.adobe && this.adobe.transformCode) colorTransform = true;
        else if (typeof this.colorTransform !== "undefined") colorTransform = !!this.colorTransform;

        component1 = this.components[0] as DecodedComponent;
        component2 = this.components[1] as DecodedComponent;
        component3 = this.components[2] as DecodedComponent;
        component4 = this.components[3] as DecodedComponent;
        for (let y = 0; y < height; y++) {
          line1 = lineAt(component1, y);
          line2 = lineAt(component2, y);
          line3 = lineAt(component3, y);
          line4 = lineAt(component4, y);
          for (let x = 0; x < width; x++) {
            if (!colorTransform) {
              C = sample(line1, component1, x);
              M = sample(line2, component2, x);
              Ye = sample(line3, component3, x);
              K = sample(line4, component4, x);
            } else {
              Y = sample(line1, component1, x);
              Cb = sample(line2, component2, x);
              Cr = sample(line3, component3, x);
              K = sample(line4, component4, x);

              C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
              M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
              Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
            }
            data[offset++] = 255 - C;
            data[offset++] = 255 - M;
            data[offset++] = 255 - Ye;
            data[offset++] = 255 - K;
          }
        }
        break;
      default:
        throw "Unsupported color mode";
    }
    return data;
  }

  /** Fills RGBA image data; CMYK goes through Color.cmykToRGB. */
  copyToImageData(imageData: ImageDataLike): void {
    const width = imageData.width;
    const height = imageData.height;
    const imageDataArray = imageData.data;
    const data = this.getData(width, height);
    let i = 0;
    let j = 0;
    switch (this.components.length) {
      case 1:
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const value = data[i++] as number;
            imageDataArray[j++] = value;
            imageDataArray[j++] = value;
            imageDataArray[j++] = value;
            imageDataArray[j++] = 255;
          }
        }
        break;
      case 3:
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const r = data[i++] as number;
            const g = data[i++] as number;
            const b = data[i++] as number;
            imageDataArray[j++] = r;
            imageDataArray[j++] = g;
            imageDataArray[j++] = b;
            imageDataArray[j++] = 255;
          }
        }
        break;
      case 4:
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const cmyk = [
              (data[i++] as number) / 255,
              (data[i++] as number) / 255,
              (data[i++] as number) / 255,
              (data[i++] as number) / 255,
            ];
            const rgb = Color.cmykToRGB(cmyk);
            imageDataArray[j++] = rgb[0] as number;
            imageDataArray[j++] = rgb[1] as number;
            imageDataArray[j++] = rgb[2] as number;
            imageDataArray[j++] = 255;
          }
        }
        break;
      default:
        throw "Unsupported color mode";
    }
  }
}

/**
 * A decoded JPEG with its color space. Gravit uses it to draw CMYK JPEGs,
 * which browsers render without converting through a profile.
 */
export class JpegDecoder {
  static ColorSpace = { CMYK: "cmyk", RGB: "rgb", GRAY: "gray" } as const;

  _decoder: JpegImage;
  _data: Uint8Array | null = null;

  constructor(data: Uint8Array) {
    this._decoder = new JpegImage();
    this._decoder.parse(data);
  }

  getColorSpace(): string | null {
    switch (this._decoder.components.length) {
      case 1:
        return JpegDecoder.ColorSpace.GRAY;
      case 3:
        return JpegDecoder.ColorSpace.RGB;
      case 4:
        return JpegDecoder.ColorSpace.CMYK;
      default:
        return null;
    }
  }

  /** RGBA pixels at the image's own size, decoded once. */
  getData(): Uint8Array {
    if (!this._data) {
      const imageData = {
        width: this._decoder.width,
        height: this._decoder.height,
        data: new Uint8Array(this._decoder.width * this._decoder.height * 4),
      };
      this._decoder.copyToImageData(imageData);
      this._data = imageData.data;
    }
    return this._data;
  }
}
