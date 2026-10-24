// Old: chunk.vendor.js module 711 (opentype.js tables/cff.js).
// Gravit change: the charstring interpreter treats a missing nominalWidthX
// (no Private DICT) as 0, so such glyphs get a number width instead of NaN.
//
// The CFF table holds the glyph outlines in PostScript (Type 2 charstring)
// format. Specs: Adobe TN #5176 (CFF) and TN #5177 (Type 2 charstrings).

import {
  CffEncoding,
  cffExpertEncoding,
  cffStandardEncoding,
  cffStandardStrings,
} from "../encoding.ts";
import type { Font } from "../font.ts";
import type { Glyph } from "../glyph.ts";
import { cffGlyphLoader, GlyphSet } from "../glyphset.ts";
import * as parseUtil from "../parse.ts";
import { Path } from "../path.ts";
import type { PathCommand } from "../path.ts";
import * as table from "../table.ts";
import type { Field } from "../table.ts";

/** A value of a raw DICT: one operand, or several. */
type DictOperands = number | number[];

/** An interpreted DICT value (strings are resolved SIDs). */
type DictValue = number | string | undefined | null | (number | string | undefined | null)[];

interface DictMeta {
  name: string;
  op: number;
  type: string | string[];
  value?: number | number[] | null;
}

/** The parsed Private DICT, only the entries opentype.js needs. */
export interface CffPrivateDict {
  subrs: number;
  defaultWidthX: number;
  nominalWidthX: number;
}

/**
 * A parsed Top DICT (also used for the FDArray dicts of CID fonts), with
 * the private dict's subroutines and widths copied in under underscore keys.
 */
export interface CffTopDict {
  version: string | undefined;
  notice: string | undefined;
  copyright: string | undefined;
  fullName: string | undefined;
  familyName: string | undefined;
  weight: string | undefined;
  isFixedPitch: number;
  italicAngle: number;
  underlinePosition: number;
  underlineThickness: number;
  paintType: number;
  charstringType: number;
  fontMatrix: number[];
  uniqueId: number | null;
  fontBBox: number[];
  strokeWidth: number;
  xuid: number[];
  charset: number;
  encoding: number;
  charStrings: number;
  private: [number, number];
  /** Registry, ordering, supplement; the first two are undefined unless this is a CID font. */
  ros: [string | undefined, string | undefined, number | null];
  cidFontVersion: number;
  cidFontRevision: number;
  cidFontType: number;
  cidCount: number;
  uidBase: number | null;
  fdArray: number | null;
  fdSelect: number | null;
  fontName: string | undefined;
  _subrs: number[][];
  _subrsBias: number;
  _defaultWidthX?: number;
  _nominalWidthX?: number;
  _privateDict?: CffPrivateDict;
  _fdArray?: CffTopDict[];
  _fdSelect?: number[];
}

/** font.tables.cff */
export interface CffTable {
  topDict?: CffTopDict;
}

/** What make() needs to write a CFF table. */
export interface CffMakeOptions {
  unitsPerEm: number;
  version?: string;
  fullName?: string;
  familyName?: string;
  weightName?: string;
  fontBBox?: number[];
  postScriptName?: string;
}

/** Equality that also compares lists element by element. */
function equals(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  } else if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (!equals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

/** Subroutine numbers are biased by the subroutine count (Type 2 section 4.7). */
function calcCFFSubroutineBias(subrs: unknown[]): number {
  let bias: number;
  if (subrs.length < 1240) {
    bias = 107;
  } else if (subrs.length < 33900) {
    bias = 1131;
  } else {
    bias = 32768;
  }
  return bias;
}

interface CffIndex<T> {
  objects: T[];
  startOffset: number;
  endOffset: number;
}

/** Parses a CFF INDEX: a list of offsets, then the objects at those offsets. */
function parseCFFIndex(data: DataView, start: number): CffIndex<number[]>;
function parseCFFIndex<T>(
  data: DataView,
  start: number,
  conversionFn: (bytes: number[]) => T,
): CffIndex<T>;
function parseCFFIndex<T>(
  data: DataView,
  start: number,
  conversionFn?: (bytes: number[]) => T,
): CffIndex<T | number[]> {
  const offsets: number[] = [];
  const objects: (T | number[])[] = [];
  const count = parseUtil.getCard16(data, start);
  let objectOffset = 0;
  let endOffset: number;
  if (count !== 0) {
    const offsetSize = parseUtil.getByte(data, start + 2);
    objectOffset = start + (count + 1) * offsetSize + 2;
    let pos = start + 3;
    for (let i = 0; i < count + 1; i += 1) {
      offsets.push(parseUtil.getOffset(data, pos, offsetSize));
      pos += offsetSize;
    }
    // The index is 4 header bytes plus the last offset long.
    endOffset = objectOffset + (offsets[count] as number);
  } else {
    endOffset = start + 2;
  }

  for (let i = 0; i < offsets.length - 1; i += 1) {
    let value: T | number[] = parseUtil.getBytes(
      data,
      objectOffset + (offsets[i] as number),
      objectOffset + (offsets[i + 1] as number),
    );
    if (conversionFn) {
      value = conversionFn(value);
    }
    objects.push(value);
  }

  return { objects: objects, startOffset: start, endOffset: endOffset };
}

/** A DICT real number: packed decimal nibbles up to the 0xf nibble. */
function parseFloatOperand(parser: parseUtil.Parser): number {
  let s = "";
  const eof = 15;
  const lookup = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "E", "E-", null, "-"];
  for (;;) {
    const b = parser.parseByte();
    const n1 = b >> 4;
    const n2 = b & 15;
    if (n1 === eof) {
      break;
    }
    s += lookup[n1];
    if (n2 === eof) {
      break;
    }
    s += lookup[n2];
  }
  return parseFloat(s);
}

/** A DICT operand starting with byte b0. */
function parseOperand(parser: parseUtil.Parser, b0: number): number {
  let b1: number;
  let b2: number;
  let b3: number;
  let b4: number;
  if (b0 === 28) {
    b1 = parser.parseByte();
    b2 = parser.parseByte();
    return (b1 << 8) | b2;
  }
  if (b0 === 29) {
    b1 = parser.parseByte();
    b2 = parser.parseByte();
    b3 = parser.parseByte();
    b4 = parser.parseByte();
    return (b1 << 24) | (b2 << 16) | (b3 << 8) | b4;
  }
  if (b0 === 30) {
    return parseFloatOperand(parser);
  }
  if (b0 >= 32 && b0 <= 246) {
    return b0 - 139;
  }
  if (b0 >= 247 && b0 <= 250) {
    b1 = parser.parseByte();
    return (b0 - 247) * 256 + b1 + 108;
  }
  if (b0 >= 251 && b0 <= 254) {
    b1 = parser.parseByte();
    return -(b0 - 251) * 256 - b1 - 108;
  }
  throw new Error("Invalid b0 " + b0);
}

/** Operator to operands; a single operand is unpacked from its list. */
function entriesToObject(entries: [number, number[]][]): Record<number, DictOperands> {
  const o: Record<number, DictOperands> = {};
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i] as [number, number[]];
    const key = entry[0];
    const values = entry[1];
    let value: DictOperands;
    if (values.length === 1) {
      value = values[0] as number;
    } else {
      value = values;
    }
    // isNaN coerces: a repeated list-valued key is allowed, a repeated number is not.
    if (Object.prototype.hasOwnProperty.call(o, key) && !isNaN(o[key] as number)) {
      throw new Error("Object " + String(o) + " already has key " + key);
    }
    o[key] = value;
  }
  return o;
}

/** Parses a DICT: operands come before their operator; bytes <= 21 are operators. */
function parseCFFDict(data: DataView, start: number, size: number): Record<number, DictOperands> {
  const parser = new parseUtil.Parser(data, start);
  const entries: [number, number[]][] = [];
  let operands: number[] = [];

  while (parser.relativeOffset < size) {
    let op = parser.parseByte();
    if (op <= 21) {
      // Two-byte operators start with the escape byte 12.
      if (op === 12) {
        op = 1200 + parser.parseByte();
      }
      entries.push([op, operands]);
      operands = [];
    } else {
      operands.push(parseOperand(parser, op));
    }
  }

  return entriesToObject(entries);
}

/** Resolves a String ID: up to 390 a standard string, else from the font's string index. */
function getCFFString(strings: string[], index: number | null | undefined): string | undefined {
  if ((index as number) <= 390) {
    return cffStandardStrings[index as number];
  }
  return strings[(index as number) - 391];
}

/**
 * Turns a raw DICT into readable keys, with defaults for missing entries
 * (null when the meta has no default) and SIDs resolved to strings.
 */
function interpretDict(
  dict: Record<number, DictOperands>,
  meta: DictMeta[],
  strings: string[],
): Record<string, DictValue> {
  const newDict: Record<string, DictValue> = {};
  let value: DictValue;

  for (let i = 0; i < meta.length; i += 1) {
    const m = meta[i] as DictMeta;
    if (Array.isArray(m.type)) {
      const values: DictValue[] = [];
      values.length = m.type.length;
      for (let j = 0; j < m.type.length; j++) {
        const operands = dict[m.op];
        value = operands !== undefined ? (operands as number[])[j] : undefined;
        if (value === undefined) {
          // A null default (xuid) would throw here, but xuid has no element types.
          const defaults = m.value as number[] | undefined;
          value = defaults !== undefined && defaults[j] !== undefined ? defaults[j] : null;
        }
        if (m.type[j] === "SID") {
          value = getCFFString(strings, value as number | null);
        }
        values[j] = value;
      }
      newDict[m.name] = values as DictValue;
    } else {
      value = dict[m.op];
      if (value === undefined) {
        value = m.value !== undefined ? m.value : null;
      }
      if (m.type === "SID") {
        value = getCFFString(strings, value as number | null);
      }
      newDict[m.name] = value;
    }
  }

  return newDict;
}

interface CffHeader {
  formatMajor: number;
  formatMinor: number;
  size: number;
  offsetSize: number;
  startOffset: number;
  endOffset: number;
}

function parseCFFHeader(data: DataView, start: number): CffHeader {
  return {
    formatMajor: parseUtil.getCard8(data, start),
    formatMinor: parseUtil.getCard8(data, start + 1),
    size: parseUtil.getCard8(data, start + 2),
    offsetSize: parseUtil.getCard8(data, start + 3),
    startOffset: start,
    endOffset: start + 4,
  };
}

const TOP_DICT_META: DictMeta[] = [
  { name: "version", op: 0, type: "SID" },
  { name: "notice", op: 1, type: "SID" },
  { name: "copyright", op: 1200, type: "SID" },
  { name: "fullName", op: 2, type: "SID" },
  { name: "familyName", op: 3, type: "SID" },
  { name: "weight", op: 4, type: "SID" },
  { name: "isFixedPitch", op: 1201, type: "number", value: 0 },
  { name: "italicAngle", op: 1202, type: "number", value: 0 },
  { name: "underlinePosition", op: 1203, type: "number", value: -100 },
  { name: "underlineThickness", op: 1204, type: "number", value: 50 },
  { name: "paintType", op: 1205, type: "number", value: 0 },
  { name: "charstringType", op: 1206, type: "number", value: 2 },
  {
    name: "fontMatrix",
    op: 1207,
    type: ["real", "real", "real", "real", "real", "real"],
    value: [0.001, 0, 0, 0.001, 0, 0],
  },
  { name: "uniqueId", op: 13, type: "number" },
  { name: "fontBBox", op: 5, type: ["number", "number", "number", "number"], value: [0, 0, 0, 0] },
  { name: "strokeWidth", op: 1208, type: "number", value: 0 },
  { name: "xuid", op: 14, type: [], value: null },
  { name: "charset", op: 15, type: "offset", value: 0 },
  { name: "encoding", op: 16, type: "offset", value: 0 },
  { name: "charStrings", op: 17, type: "offset", value: 0 },
  { name: "private", op: 18, type: ["number", "offset"], value: [0, 0] },
  { name: "ros", op: 1230, type: ["SID", "SID", "number"] },
  { name: "cidFontVersion", op: 1231, type: "number", value: 0 },
  { name: "cidFontRevision", op: 1232, type: "number", value: 0 },
  { name: "cidFontType", op: 1233, type: "number", value: 0 },
  { name: "cidCount", op: 1234, type: "number", value: 8720 },
  { name: "uidBase", op: 1235, type: "number" },
  { name: "fdArray", op: 1236, type: "offset" },
  { name: "fdSelect", op: 1237, type: "offset" },
  { name: "fontName", op: 1238, type: "SID" },
];

const PRIVATE_DICT_META: DictMeta[] = [
  { name: "subrs", op: 19, type: "offset", value: 0 },
  { name: "defaultWidthX", op: 20, type: "number", value: 0 },
  { name: "nominalWidthX", op: 21, type: "number", value: 0 },
];

function parseCFFTopDict(data: DataView, strings: string[]): CffTopDict {
  const dict = parseCFFDict(data, 0, data.byteLength);
  return interpretDict(dict, TOP_DICT_META, strings) as unknown as CffTopDict;
}

function parseCFFPrivateDict(
  data: DataView,
  start: number,
  size: number,
  strings: string[],
): CffPrivateDict {
  const dict = parseCFFDict(data, start, size);
  return interpretDict(dict, PRIVATE_DICT_META, strings) as unknown as CffPrivateDict;
}

/**
 * Reads the Top DICTs of an INDEX (the font's, or the FDArray of a CID
 * font). A dict's Private DICT is read too and its subroutines and widths
 * saved as _subrs, _subrsBias, _defaultWidthX, _nominalWidthX and _privateDict.
 */
function gatherCFFTopDicts(
  data: DataView,
  start: number,
  cffIndex: number[][],
  strings: string[],
): CffTopDict[] {
  const topDictArray: CffTopDict[] = [];
  for (let iTopDict = 0; iTopDict < cffIndex.length; iTopDict += 1) {
    const topDictData = new DataView(new Uint8Array(cffIndex[iTopDict] as number[]).buffer);
    const topDict = parseCFFTopDict(topDictData, strings);
    topDict._subrs = [];
    topDict._subrsBias = 0;
    const privateSize = topDict.private[0];
    const privateOffset = topDict.private[1];
    if (privateSize !== 0 && privateOffset !== 0) {
      const privateDict = parseCFFPrivateDict(data, privateOffset + start, privateSize, strings);
      topDict._defaultWidthX = privateDict.defaultWidthX;
      topDict._nominalWidthX = privateDict.nominalWidthX;
      if (privateDict.subrs !== 0) {
        const subrOffset = privateOffset + privateDict.subrs;
        const subrIndex = parseCFFIndex(data, subrOffset + start);
        topDict._subrs = subrIndex.objects;
        topDict._subrsBias = calcCFFSubroutineBias(topDict._subrs);
      }
      topDict._privateDict = privateDict;
    }
    topDictArray.push(topDict);
  }
  return topDictArray;
}

/** The charset: the glyph names, .notdef first (TN #5176 chapter 13). */
function parseCFFCharset(
  data: DataView,
  start: number,
  nGlyphs: number,
  strings: string[],
): (string | undefined)[] {
  let sid: number;
  let count: number;
  const parser = new parseUtil.Parser(data, start);

  // .notdef is not stored.
  nGlyphs -= 1;
  const charset: (string | undefined)[] = [".notdef"];

  const format = parser.parseCard8();
  if (format === 0) {
    for (let i = 0; i < nGlyphs; i += 1) {
      sid = parser.parseSID();
      charset.push(getCFFString(strings, sid));
    }
  } else if (format === 1) {
    while (charset.length <= nGlyphs) {
      sid = parser.parseSID();
      count = parser.parseCard8();
      for (let i = 0; i <= count; i += 1) {
        charset.push(getCFFString(strings, sid));
        sid += 1;
      }
    }
  } else if (format === 2) {
    while (charset.length <= nGlyphs) {
      sid = parser.parseSID();
      count = parser.parseCard16();
      for (let i = 0; i <= count; i += 1) {
        charset.push(getCFFString(strings, sid));
        sid += 1;
      }
    }
  } else {
    throw new Error("Unknown charset format " + format);
  }

  return charset;
}

/**
 * A custom CFF encoding (TN #5176 chapter 12). Like opentype.js it maps
 * char codes to code indexes, not glyph names, so CffEncoding's name
 * lookup in the charset rarely matches (old quirk, kept).
 */
function parseCFFEncoding(data: DataView, start: number, charset: string[]): CffEncoding {
  let code: number;
  const enc: Record<number, number> = {};
  const parser = new parseUtil.Parser(data, start);
  const format = parser.parseCard8();
  if (format === 0) {
    const nCodes = parser.parseCard8();
    for (let i = 0; i < nCodes; i += 1) {
      code = parser.parseCard8();
      enc[code] = i;
    }
  } else if (format === 1) {
    const nRanges = parser.parseCard8();
    code = 1;
    for (let i = 0; i < nRanges; i += 1) {
      const first = parser.parseCard8();
      const nLeft = parser.parseCard8();
      for (let j = first; j <= first + nLeft; j += 1) {
        enc[j] = code;
        code += 1;
      }
    }
  } else {
    throw new Error("Unknown encoding format " + format);
  }

  return new CffEncoding(enc as unknown as Record<number, string>, charset);
}

/**
 * Runs a Type 2 charstring and returns the glyph's path. Also sets the
 * glyph's advanceWidth. Hint operators only count stems (for the mask bytes).
 */
function parseCFFCharstring(font: Font, glyph: Glyph, code: number[]): Path {
  let c1x: number;
  let c1y: number;
  let c2x: number;
  let c2y: number;
  const p = new Path();
  const stack: number[] = [];
  let nStems = 0;
  let haveWidth = false;
  let open = false;
  let x = 0;
  let y = 0;
  let subrs: number[][];
  let subrsBias: number;
  let defaultWidthX: number | undefined;
  let nominalWidthX: number;
  const topDict = font.tables.cff?.topDict as CffTopDict;
  if (font.isCIDFont) {
    const fdIndex = (topDict._fdSelect as number[])[glyph.index] as number;
    const fdDict = (topDict._fdArray as CffTopDict[])[fdIndex] as CffTopDict;
    subrs = fdDict._subrs;
    subrsBias = fdDict._subrsBias;
    defaultWidthX = fdDict._defaultWidthX;
    // Gravit change: || 0.
    nominalWidthX = fdDict._nominalWidthX || 0;
  } else {
    subrs = topDict._subrs;
    subrsBias = topDict._subrsBias;
    defaultWidthX = topDict._defaultWidthX;
    // Gravit change: || 0.
    nominalWidthX = topDict._nominalWidthX || 0;
  }
  let width = defaultWidthX;

  // An empty stack gives undefined, which turns the arithmetic into NaN as in the old code.
  const shift = (): number => stack.shift() as number;
  const pop = (): number => stack.pop() as number;

  function newContour(cx: number, cy: number): void {
    if (open) {
      p.closePath();
    }
    p.moveTo(cx, cy);
    open = true;
  }

  function parseStems(): void {
    // Stem arguments come in pairs; an odd count means a width comes first.
    const hasWidthArg = stack.length % 2 !== 0;
    if (hasWidthArg && !haveWidth) {
      width = shift() + nominalWidthX;
    }
    nStems += stack.length >> 1;
    stack.length = 0;
    haveWidth = true;
  }

  function run(charstring: number[]): void {
    let b1: number;
    let b2: number;
    let b3: number;
    let b4: number;
    let codeIndex: number;
    let subrCode: number[] | undefined;
    let jpx: number;
    let jpy: number;
    let c3x: number;
    let c3y: number;
    let c4x: number;
    let c4y: number;

    let i = 0;
    while (i < charstring.length) {
      let v = charstring[i] as number;
      i += 1;
      switch (v) {
        case 1: // hstem
          parseStems();
          break;
        case 3: // vstem
          parseStems();
          break;
        case 4: // vmoveto
          if (stack.length > 1 && !haveWidth) {
            width = shift() + nominalWidthX;
            haveWidth = true;
          }
          y += pop();
          newContour(x, y);
          break;
        case 5: // rlineto
          while (stack.length > 0) {
            x += shift();
            y += shift();
            p.lineTo(x, y);
          }
          break;
        case 6: // hlineto
          while (stack.length > 0) {
            x += shift();
            p.lineTo(x, y);
            if (stack.length === 0) {
              break;
            }
            y += shift();
            p.lineTo(x, y);
          }
          break;
        case 7: // vlineto
          while (stack.length > 0) {
            y += shift();
            p.lineTo(x, y);
            if (stack.length === 0) {
              break;
            }
            x += shift();
            p.lineTo(x, y);
          }
          break;
        case 8: // rrcurveto
          while (stack.length > 0) {
            c1x = x + shift();
            c1y = y + shift();
            c2x = c1x + shift();
            c2y = c1y + shift();
            x = c2x + shift();
            y = c2y + shift();
            p.curveTo(c1x, c1y, c2x, c2y, x, y);
          }
          break;
        case 10: // callsubr
          codeIndex = pop() + subrsBias;
          subrCode = subrs[codeIndex];
          if (subrCode) {
            run(subrCode);
          }
          break;
        case 11: // return
          return;
        case 12: // flex operators
          v = charstring[i] as number;
          i += 1;
          switch (v) {
            case 35: // flex: dx1 dy1 ... dx6 dy6 fd
              c1x = x + shift();
              c1y = y + shift();
              c2x = c1x + shift();
              c2y = c1y + shift();
              jpx = c2x + shift();
              jpy = c2y + shift();
              c3x = jpx + shift();
              c3y = jpy + shift();
              c4x = c3x + shift();
              c4y = c3y + shift();
              x = c4x + shift();
              y = c4y + shift();
              shift(); // flex depth
              p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
              p.curveTo(c3x, c3y, c4x, c4y, x, y);
              break;
            case 34: // hflex: dx1 dx2 dy2 dx3 dx4 dx5 dx6
              c1x = x + shift();
              c1y = y;
              c2x = c1x + shift();
              c2y = c1y + shift();
              jpx = c2x + shift();
              jpy = c2y;
              c3x = jpx + shift();
              c3y = c2y;
              c4x = c3x + shift();
              c4y = y;
              x = c4x + shift();
              p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
              p.curveTo(c3x, c3y, c4x, c4y, x, y);
              break;
            case 36: // hflex1: dx1 dy1 dx2 dy2 dx3 dx4 dx5 dy5 dx6
              c1x = x + shift();
              c1y = y + shift();
              c2x = c1x + shift();
              c2y = c1y + shift();
              jpx = c2x + shift();
              jpy = c2y;
              c3x = jpx + shift();
              c3y = c2y;
              c4x = c3x + shift();
              c4y = c3y + shift();
              x = c4x + shift();
              p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
              p.curveTo(c3x, c3y, c4x, c4y, x, y);
              break;
            case 37: // flex1: dx1 dy1 ... dx5 dy5 d6
              c1x = x + shift();
              c1y = y + shift();
              c2x = c1x + shift();
              c2y = c1y + shift();
              jpx = c2x + shift();
              jpy = c2y + shift();
              c3x = jpx + shift();
              c3y = jpy + shift();
              c4x = c3x + shift();
              c4y = c3y + shift();
              if (Math.abs(c4x - x) > Math.abs(c4y - y)) {
                x = c4x + shift();
              } else {
                y = c4y + shift();
              }
              p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
              p.curveTo(c3x, c3y, c4x, c4y, x, y);
              break;
            default:
              console.log("Glyph " + glyph.index + ": unknown operator " + 1200 + v);
              stack.length = 0;
          }
          break;
        case 14: // endchar
          if (stack.length > 0 && !haveWidth) {
            width = shift() + nominalWidthX;
            haveWidth = true;
          }
          if (open) {
            p.closePath();
            open = false;
          }
          break;
        case 18: // hstemhm
          parseStems();
          break;
        case 19: // hintmask
        case 20: // cntrmask
          parseStems();
          i += (nStems + 7) >> 3;
          break;
        case 21: // rmoveto
          if (stack.length > 2 && !haveWidth) {
            width = shift() + nominalWidthX;
            haveWidth = true;
          }
          y += pop();
          x += pop();
          newContour(x, y);
          break;
        case 22: // hmoveto
          if (stack.length > 1 && !haveWidth) {
            width = shift() + nominalWidthX;
            haveWidth = true;
          }
          x += pop();
          newContour(x, y);
          break;
        case 23: // vstemhm
          parseStems();
          break;
        case 24: // rcurveline
          while (stack.length > 2) {
            c1x = x + shift();
            c1y = y + shift();
            c2x = c1x + shift();
            c2y = c1y + shift();
            x = c2x + shift();
            y = c2y + shift();
            p.curveTo(c1x, c1y, c2x, c2y, x, y);
          }
          x += shift();
          y += shift();
          p.lineTo(x, y);
          break;
        case 25: // rlinecurve
          while (stack.length > 6) {
            x += shift();
            y += shift();
            p.lineTo(x, y);
          }
          c1x = x + shift();
          c1y = y + shift();
          c2x = c1x + shift();
          c2y = c1y + shift();
          x = c2x + shift();
          y = c2y + shift();
          p.curveTo(c1x, c1y, c2x, c2y, x, y);
          break;
        case 26: // vvcurveto
          if (stack.length % 2) {
            x += shift();
          }
          while (stack.length > 0) {
            c1x = x;
            c1y = y + shift();
            c2x = c1x + shift();
            c2y = c1y + shift();
            x = c2x;
            y = c2y + shift();
            p.curveTo(c1x, c1y, c2x, c2y, x, y);
          }
          break;
        case 27: // hhcurveto
          if (stack.length % 2) {
            y += shift();
          }
          while (stack.length > 0) {
            c1x = x + shift();
            c1y = y;
            c2x = c1x + shift();
            c2y = c1y + shift();
            x = c2x + shift();
            y = c2y;
            p.curveTo(c1x, c1y, c2x, c2y, x, y);
          }
          break;
        case 28: // shortint
          b1 = charstring[i] as number;
          b2 = charstring[i + 1] as number;
          stack.push(((b1 << 24) | (b2 << 16)) >> 16);
          i += 2;
          break;
        case 29: // callgsubr
          codeIndex = pop() + font.gsubrsBias;
          subrCode = font.gsubrs[codeIndex];
          if (subrCode) {
            run(subrCode);
          }
          break;
        case 30: // vhcurveto
          while (stack.length > 0) {
            c1x = x;
            c1y = y + shift();
            c2x = c1x + shift();
            c2y = c1y + shift();
            x = c2x + shift();
            y = c2y + (stack.length === 1 ? shift() : 0);
            p.curveTo(c1x, c1y, c2x, c2y, x, y);
            if (stack.length === 0) {
              break;
            }
            c1x = x + shift();
            c1y = y;
            c2x = c1x + shift();
            c2y = c1y + shift();
            y = c2y + shift();
            x = c2x + (stack.length === 1 ? shift() : 0);
            p.curveTo(c1x, c1y, c2x, c2y, x, y);
          }
          break;
        case 31: // hvcurveto
          while (stack.length > 0) {
            c1x = x + shift();
            c1y = y;
            c2x = c1x + shift();
            c2y = c1y + shift();
            y = c2y + shift();
            x = c2x + (stack.length === 1 ? shift() : 0);
            p.curveTo(c1x, c1y, c2x, c2y, x, y);
            if (stack.length === 0) {
              break;
            }
            c1x = x;
            c1y = y + shift();
            c2x = c1x + shift();
            c2y = c1y + shift();
            x = c2x + shift();
            y = c2y + (stack.length === 1 ? shift() : 0);
            p.curveTo(c1x, c1y, c2x, c2y, x, y);
          }
          break;
        default:
          if (v < 32) {
            console.log("Glyph " + glyph.index + ": unknown operator " + v);
          } else if (v < 247) {
            stack.push(v - 139);
          } else if (v < 251) {
            b1 = charstring[i] as number;
            i += 1;
            stack.push((v - 247) * 256 + b1 + 108);
          } else if (v < 255) {
            b1 = charstring[i] as number;
            i += 1;
            stack.push(-(v - 251) * 256 - b1 - 108);
          } else {
            b1 = charstring[i] as number;
            b2 = charstring[i + 1] as number;
            b3 = charstring[i + 2] as number;
            b4 = charstring[i + 3] as number;
            i += 4;
            stack.push(((b1 << 24) | (b2 << 16) | (b3 << 8) | b4) / 65536);
          }
      }
    }
  }

  run(code);

  glyph.advanceWidth = width;
  return p;
}

/** FDSelect of a CID font: the FDArray index of each glyph (formats 0 and 3). */
function parseCFFFDSelect(
  data: DataView,
  start: number,
  nGlyphs: number,
  fdArrayCount: number,
): number[] {
  const fdSelect: number[] = [];
  let fdIndex: number;
  const parser = new parseUtil.Parser(data, start);
  const format = parser.parseCard8();
  if (format === 0) {
    for (let iGid = 0; iGid < nGlyphs; iGid++) {
      fdIndex = parser.parseCard8();
      if (fdIndex >= fdArrayCount) {
        throw new Error(
          "CFF table CID Font FDSelect has bad FD index value " +
            fdIndex +
            " (FD count " +
            fdArrayCount +
            ")",
        );
      }
      fdSelect.push(fdIndex);
    }
  } else if (format === 3) {
    const nRanges = parser.parseCard16();
    let first = parser.parseCard16();
    if (first !== 0) {
      throw new Error("CFF Table CID Font FDSelect format 3 range has bad initial GID " + first);
    }
    let next: number | undefined;
    for (let iRange = 0; iRange < nRanges; iRange++) {
      fdIndex = parser.parseCard8();
      next = parser.parseCard16();
      if (fdIndex >= fdArrayCount) {
        throw new Error(
          "CFF table CID Font FDSelect has bad FD index value " +
            fdIndex +
            " (FD count " +
            fdArrayCount +
            ")",
        );
      }
      if (next > nGlyphs) {
        throw new Error("CFF Table CID Font FDSelect format 3 range has bad GID " + next);
      }
      for (; first < next; first++) {
        fdSelect.push(fdIndex);
      }
      first = next;
    }
    if (next !== nGlyphs) {
      throw new Error("CFF Table CID Font FDSelect format 3 range has bad final GID " + next);
    }
  } else {
    throw new Error("CFF Table CID Font FDSelect table has unsupported format " + format);
  }
  return fdSelect;
}

/** Parses the CFF table into the font: top dict, subroutines, encoding and lazy glyphs. */
export function parse(data: DataView, start: number, font: Font): void {
  const cffTable: CffTable = {};
  font.tables.cff = cffTable;
  const header = parseCFFHeader(data, start);
  const nameIndex = parseCFFIndex(data, header.endOffset, parseUtil.bytesToString);
  const topDictIndex = parseCFFIndex(data, nameIndex.endOffset);
  const stringIndex = parseCFFIndex(data, topDictIndex.endOffset, parseUtil.bytesToString);
  const globalSubrIndex = parseCFFIndex(data, stringIndex.endOffset);
  font.gsubrs = globalSubrIndex.objects;
  font.gsubrsBias = calcCFFSubroutineBias(font.gsubrs);

  const topDictArray = gatherCFFTopDicts(data, start, topDictIndex.objects, stringIndex.objects);
  if (topDictArray.length !== 1) {
    throw new Error(
      "CFF table has too many fonts in 'FontSet' - count of fonts NameIndex.length = " +
        topDictArray.length,
    );
  }

  const topDict = topDictArray[0] as CffTopDict;
  cffTable.topDict = topDict;

  if (topDict._privateDict) {
    font.defaultWidthX = topDict._privateDict.defaultWidthX;
    font.nominalWidthX = topDict._privateDict.nominalWidthX;
  }

  if (topDict.ros[0] !== undefined && topDict.ros[1] !== undefined) {
    font.isCIDFont = true;
  }

  if (font.isCIDFont) {
    let fdArrayOffset = topDict.fdArray as number;
    let fdSelectOffset = topDict.fdSelect as number;
    if (fdArrayOffset === 0 || fdSelectOffset === 0) {
      throw new Error(
        "Font is marked as a CID font, but FDArray and/or FDSelect information is missing",
      );
    }
    fdArrayOffset += start;
    const fdArrayIndex = parseCFFIndex(data, fdArrayOffset);
    const fdArray = gatherCFFTopDicts(data, start, fdArrayIndex.objects, stringIndex.objects);
    topDict._fdArray = fdArray;
    fdSelectOffset += start;
    topDict._fdSelect = parseCFFFDSelect(data, fdSelectOffset, font.numGlyphs, fdArray.length);
  }

  const privateDictOffset = start + topDict.private[1];
  const privateDict = parseCFFPrivateDict(
    data,
    privateDictOffset,
    topDict.private[0],
    stringIndex.objects,
  );
  font.defaultWidthX = privateDict.defaultWidthX;
  font.nominalWidthX = privateDict.nominalWidthX;

  if (privateDict.subrs !== 0) {
    const subrOffset = privateDictOffset + privateDict.subrs;
    const subrIndex = parseCFFIndex(data, subrOffset);
    font.subrs = subrIndex.objects;
    font.subrsBias = calcCFFSubroutineBias(font.subrs);
  } else {
    font.subrs = [];
    font.subrsBias = 0;
  }

  // Top dict offsets are relative to the start of the CFF data.
  const charStringsIndex = parseCFFIndex(data, start + topDict.charStrings);
  font.nGlyphs = charStringsIndex.objects.length;

  const charset = parseCFFCharset(
    data,
    start + topDict.charset,
    font.nGlyphs,
    stringIndex.objects,
  ) as string[];
  if (topDict.encoding === 0) {
    font.cffEncoding = new CffEncoding(cffStandardEncoding, charset);
  } else if (topDict.encoding === 1) {
    font.cffEncoding = new CffEncoding(cffExpertEncoding, charset);
  } else {
    font.cffEncoding = parseCFFEncoding(data, start + topDict.encoding, charset);
  }

  // The cmap encoding wins over the CFF encoding.
  font.encoding = font.encoding || (font.cffEncoding as CffEncoding);

  font.glyphs = new GlyphSet(font);
  for (let i = 0; i < font.nGlyphs; i += 1) {
    const charString = charStringsIndex.objects[i] as number[];
    font.glyphs.push(i, cffGlyphLoader(font, i, parseCFFCharstring, charString));
  }
}

/** A string's SID; strings not yet known are added to the list. */
function encodeString(s: string, strings: string[]): number {
  let sid: number;
  // opentype.js first looks the string up in the standard strings, but then
  // overwrites that SID below, so custom SIDs are always used.
  const i = strings.indexOf(s);
  if (i >= 0) {
    sid = i + cffStandardStrings.length;
  } else {
    sid = cffStandardStrings.length + strings.length;
    strings.push(s);
  }
  return sid;
}

function makeHeader(): table.Table {
  return new table.Record("Header", [
    { name: "major", type: "Card8", value: 1 },
    { name: "minor", type: "Card8", value: 0 },
    { name: "hdrSize", type: "Card8", value: 4 },
    { name: "major", type: "Card8", value: 1 },
  ]);
}

function makeNameIndex(fontNames: (string | undefined)[]): table.Table {
  const t = new table.Record("Name INDEX", [{ name: "names", type: "INDEX", value: [] }]);
  const names: Field[] = [];
  for (let i = 0; i < fontNames.length; i += 1) {
    names.push({ name: "name_" + i, type: "NAME", value: fontNames[i] });
  }
  t.names = names;
  return t;
}

/** A DICT to write: the attributes that differ from the defaults, keyed by operator. */
function makeDict(
  meta: DictMeta[],
  attrs: Record<string, unknown>,
  strings: string[],
): Record<number, Field> {
  const m: Record<number, Field> = {};
  for (let i = 0; i < meta.length; i += 1) {
    const entry = meta[i] as DictMeta;
    let value = attrs[entry.name];
    if (value !== undefined && !equals(value, entry.value)) {
      if (entry.type === "SID") {
        value = encodeString(value as string, strings);
      }
      m[entry.op] = { name: entry.name, type: entry.type as string, value: value };
    }
  }
  return m;
}

function makeTopDict(attrs: Record<string, unknown>, strings: string[]): table.Table {
  const t = new table.Record("Top DICT", [{ name: "dict", type: "DICT", value: {} }]);
  t.dict = makeDict(TOP_DICT_META, attrs, strings);
  return t;
}

function makeTopDictIndex(topDict: table.Table): table.Table {
  const t = new table.Record("Top DICT INDEX", [{ name: "topDicts", type: "INDEX", value: [] }]);
  t.topDicts = [{ name: "topDict_0", type: "TABLE", value: topDict }];
  return t;
}

function makeStringIndex(strings: string[]): table.Table {
  const t = new table.Record("String INDEX", [{ name: "strings", type: "INDEX", value: [] }]);
  const entries: Field[] = [];
  for (let i = 0; i < strings.length; i += 1) {
    entries.push({ name: "string_" + i, type: "STRING", value: strings[i] });
  }
  t.strings = entries;
  return t;
}

function makeGlobalSubrIndex(): table.Table {
  // No subroutines are written.
  return new table.Record("Global Subr INDEX", [{ name: "subrs", type: "INDEX", value: [] }]);
}

function makeCharsets(glyphNames: string[], strings: string[]): table.Table {
  const t = new table.Record("Charsets", [{ name: "format", type: "Card8", value: 0 }]);
  for (let i = 0; i < glyphNames.length; i += 1) {
    const glyphName = glyphNames[i] as string;
    const glyphSID = encodeString(glyphName, strings);
    t.fields.push({ name: "glyph_" + i, type: "SID", value: glyphSID });
  }
  return t;
}

/** The charstring operations of a glyph: width, then absolute-to-relative moves, lines and curves. */
function glyphToOps(glyph: Glyph): Field[] {
  const ops: Field[] = [];
  const path = glyph.path;
  ops.push({ name: "width", type: "NUMBER", value: glyph.advanceWidth });
  let x = 0;
  let y = 0;
  for (let i = 0; i < path.commands.length; i += 1) {
    let dx: number;
    let dy: number;
    let cmd = path.commands[i] as PathCommand;
    if (cmd.type === "Q") {
      // CFF only has cubic curves: raise the quad to a cubic, as a new command.
      const _13 = 1 / 3;
      const _23 = 2 / 3;
      cmd = {
        type: "C",
        x: cmd.x,
        y: cmd.y,
        x1: _13 * x + _23 * cmd.x1,
        y1: _13 * y + _23 * cmd.y1,
        x2: _13 * cmd.x + _23 * cmd.x1,
        y2: _13 * cmd.y + _23 * cmd.y1,
      };
    }

    if (cmd.type === "M") {
      dx = Math.round(cmd.x - x);
      dy = Math.round(cmd.y - y);
      ops.push({ name: "dx", type: "NUMBER", value: dx });
      ops.push({ name: "dy", type: "NUMBER", value: dy });
      ops.push({ name: "rmoveto", type: "OP", value: 21 });
      x = Math.round(cmd.x);
      y = Math.round(cmd.y);
    } else if (cmd.type === "L") {
      dx = Math.round(cmd.x - x);
      dy = Math.round(cmd.y - y);
      ops.push({ name: "dx", type: "NUMBER", value: dx });
      ops.push({ name: "dy", type: "NUMBER", value: dy });
      ops.push({ name: "rlineto", type: "OP", value: 5 });
      x = Math.round(cmd.x);
      y = Math.round(cmd.y);
    } else if (cmd.type === "C") {
      const dx1 = Math.round(cmd.x1 - x);
      const dy1 = Math.round(cmd.y1 - y);
      const dx2 = Math.round(cmd.x2 - cmd.x1);
      const dy2 = Math.round(cmd.y2 - cmd.y1);
      dx = Math.round(cmd.x - cmd.x2);
      dy = Math.round(cmd.y - cmd.y2);
      ops.push({ name: "dx1", type: "NUMBER", value: dx1 });
      ops.push({ name: "dy1", type: "NUMBER", value: dy1 });
      ops.push({ name: "dx2", type: "NUMBER", value: dx2 });
      ops.push({ name: "dy2", type: "NUMBER", value: dy2 });
      ops.push({ name: "dx", type: "NUMBER", value: dx });
      ops.push({ name: "dy", type: "NUMBER", value: dy });
      ops.push({ name: "rrcurveto", type: "OP", value: 8 });
      x = Math.round(cmd.x);
      y = Math.round(cmd.y);
    }
    // Contours close by themselves.
  }

  ops.push({ name: "endchar", type: "OP", value: 14 });
  return ops;
}

function makeCharStringsIndex(glyphs: GlyphSet): table.Table {
  const t = new table.Record("CharStrings INDEX", [
    { name: "charStrings", type: "INDEX", value: [] },
  ]);
  const charStrings = t.charStrings as Field[];
  for (let i = 0; i < glyphs.length; i += 1) {
    const glyph = glyphs.get(i) as Glyph;
    const ops = glyphToOps(glyph);
    charStrings.push({ name: glyph.name as string, type: "CHARSTRING", value: ops });
  }
  return t;
}

function makePrivateDict(attrs: Record<string, unknown>, strings: string[]): table.Table {
  const t = new table.Record("Private DICT", [{ name: "dict", type: "DICT", value: {} }]);
  t.dict = makeDict(PRIVATE_DICT_META, attrs, strings);
  return t;
}

/** Writes a CFF table for the glyphs. */
export function make(glyphs: GlyphSet, options: CffMakeOptions): table.Table {
  const t = new table.Table("CFF ", [
    { name: "header", type: "RECORD", value: undefined },
    { name: "nameIndex", type: "RECORD", value: undefined },
    { name: "topDictIndex", type: "RECORD", value: undefined },
    { name: "stringIndex", type: "RECORD", value: undefined },
    { name: "globalSubrIndex", type: "RECORD", value: undefined },
    { name: "charsets", type: "RECORD", value: undefined },
    { name: "charStringsIndex", type: "RECORD", value: undefined },
    { name: "privateDict", type: "RECORD", value: undefined },
  ]);

  const fontScale = 1 / options.unitsPerEm;
  // Non-zero offsets so the DICT encodes them; the Top DICT's size must not
  // change once the real offsets are written.
  const attrs = {
    version: options.version,
    fullName: options.fullName,
    familyName: options.familyName,
    weight: options.weightName,
    fontBBox: options.fontBBox || [0, 0, 0, 0],
    fontMatrix: [fontScale, 0, 0, fontScale, 0, 0],
    charset: 999,
    encoding: 0,
    charStrings: 999,
    private: [0, 999],
  };

  const privateAttrs = {};

  const glyphNames: string[] = [];
  let glyph: Glyph;
  // Skip .notdef.
  for (let i = 1; i < glyphs.length; i += 1) {
    glyph = glyphs.get(i) as Glyph;
    glyphNames.push(glyph.name as string);
  }

  const strings: string[] = [];

  const header = makeHeader();
  const nameIndex = makeNameIndex([options.postScriptName]);
  t.header = header;
  t.nameIndex = nameIndex;
  let topDict = makeTopDict(attrs, strings);
  t.topDictIndex = makeTopDictIndex(topDict);
  const globalSubrIndex = makeGlobalSubrIndex();
  t.globalSubrIndex = globalSubrIndex;
  const charsets = makeCharsets(glyphNames, strings);
  t.charsets = charsets;
  const charStringsIndex = makeCharStringsIndex(glyphs);
  t.charStringsIndex = charStringsIndex;
  t.privateDict = makePrivateDict(privateAttrs, strings);

  // Last, so it holds every custom string used above.
  const stringIndex = makeStringIndex(strings);
  t.stringIndex = stringIndex;

  const startOffset =
    header.sizeOf() +
    nameIndex.sizeOf() +
    (t.topDictIndex as table.Table).sizeOf() +
    stringIndex.sizeOf() +
    globalSubrIndex.sizeOf();
  attrs.charset = startOffset;

  // The standard encoding; the real mapping is in cmap.
  attrs.encoding = 0;
  attrs.charStrings = attrs.charset + charsets.sizeOf();
  attrs.private[1] = attrs.charStrings + charStringsIndex.sizeOf();

  // Recreate the Top DICT INDEX with the right offsets.
  topDict = makeTopDict(attrs, strings);
  t.topDictIndex = makeTopDictIndex(topDict);

  return t;
}
