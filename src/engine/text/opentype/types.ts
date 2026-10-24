// Old: chunk.vendor.js module 377 (opentype.js types.js, unchanged).
// The data types of OpenType and CFF files and their big endian encoders.

import * as check from "./check.ts";

const LIMIT16 = 32768; // 2^15: where a 16-bit number switches sign
const LIMIT32 = 2147483648; // 2^31: where a 32-bit number switches sign

/** A table field or CFF INDEX entry: a typed value (type names an encoder). */
export interface TypedValue {
  name?: string;
  type: string;
  value: unknown;
}

/** One entry of a CFF DICT to encode, keyed by operator. */
export interface DictEntry {
  name?: string;
  type: string | string[];
  value: unknown;
}

/** One charstring operation, encoded by encode[type]. */
export interface CharStringOp {
  name?: string;
  type: string;
  value: number;
}

/** Something encode.TABLE can write: its fields, with values overridable on the object. */
export interface TableLike {
  tableName: string;
  fields: TypedValue[];
  [field: string]: unknown;
}

type Encoder = (value: unknown) => number[];
type SizeOf = (value: unknown) => number;

function constant(v: number): () => number {
  return function () {
    return v;
  };
}

function encoderFor(type: string): Encoder | undefined {
  return (encode as unknown as Record<string, Encoder | undefined>)[type];
}

function sizeOfFor(type: string): SizeOf | undefined {
  return (sizeOf as unknown as Record<string, SizeOf | undefined>)[type];
}

// Encoders ////////////////////////////////////////////////////////////////

function encodeBYTE(v: number): number[] {
  check.argument(v >= 0 && v <= 255, "Byte value should be between 0 and 255.");
  return [v];
}

function encodeCHAR(v: string): number[] {
  return [v.charCodeAt(0)];
}

function encodeCHARARRAY(v: string): number[] {
  const b: number[] = [];
  for (let i = 0; i < v.length; i += 1) {
    b[i] = v.charCodeAt(i);
  }
  return b;
}

function encodeUSHORT(v: number): number[] {
  return [(v >> 8) & 0xff, v & 0xff];
}

function encodeSHORT(v: number): number[] {
  // Two's complement
  if (v >= LIMIT16) {
    v = -(2 * LIMIT16 - v);
  }
  return [(v >> 8) & 0xff, v & 0xff];
}

function encodeUINT24(v: number): number[] {
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function encodeULONG(v: number): number[] {
  return [(v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function encodeLONG(v: number): number[] {
  // Two's complement
  if (v >= LIMIT32) {
    v = -(2 * LIMIT32 - v);
  }
  return [(v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function encodeLONGDATETIME(v: number): number[] {
  return [0, 0, 0, 0, (v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function encodeTAG(v: string): number[] {
  check.argument(v.length === 4, "Tag should be exactly 4 ASCII characters.");
  return [v.charCodeAt(0), v.charCodeAt(1), v.charCodeAt(2), v.charCodeAt(3)];
}

/** A CFF numeric operand or charstring number in its shortest form. */
function encodeNUMBER(v: number): number[] {
  if (v >= -107 && v <= 107) {
    return [v + 139];
  } else if (v >= 108 && v <= 1131) {
    v = v - 108;
    return [(v >> 8) + 247, v & 0xff];
  } else if (v >= -1131 && v <= -108) {
    v = -v - 108;
    return [(v >> 8) + 251, v & 0xff];
  } else if (v >= -32768 && v <= 32767) {
    return encodeNUMBER16(v);
  } else {
    return encodeNUMBER32(v);
  }
}

function encodeNUMBER16(v: number): number[] {
  return [28, (v >> 8) & 0xff, v & 0xff];
}

function encodeNUMBER32(v: number): number[] {
  return [29, (v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

/** A CFF real number as packed BCD nibbles. */
function encodeREAL(v: number): number[] {
  let value = v.toString();

  // Undo float noise like 0.30000000000000004 or 1e-7 representations.
  const m = /\.(\d*?)(?:9{5,20}|0{5,20})\d{0,2}(?:e(.+)|$)/.exec(value);
  if (m) {
    const epsilon = parseFloat("1e" + ((m[2] ? +m[2] : 0) + (m[1] as string).length));
    value = (Math.round(v * epsilon) / epsilon).toString();
  }

  let nibbles = "";
  for (let i = 0, ii = value.length; i < ii; i += 1) {
    const c = value[i];
    if (c === "e") {
      nibbles += value[++i] === "-" ? "c" : "b";
    } else if (c === ".") {
      nibbles += "a";
    } else if (c === "-") {
      nibbles += "e";
    } else {
      nibbles += c;
    }
  }

  nibbles += nibbles.length & 1 ? "f" : "ff";
  const out = [30];
  for (let i = 0, ii = nibbles.length; i < ii; i += 2) {
    out.push(parseInt(nibbles.substr(i, 2), 16));
  }
  return out;
}

function encodeUTF16(v: string): number[] {
  const b: number[] = [];
  for (let i = 0; i < v.length; i += 1) {
    const codepoint = v.charCodeAt(i);
    b[b.length] = (codepoint >> 8) & 0xff;
    b[b.length] = codepoint & 0xff;
  }
  return b;
}

// Old eight-bit Macintosh encodings: the characters for bytes 0x80..0xFF,
// keyed by IANA character set name. Bytes 0x00..0x7F are ASCII.
const eightBitMacEncodings: Record<string, string> = {
  "x-mac-croatian":
    "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®Š™´¨≠ŽØ∞±≤≥∆µ∂∑∏š∫ªºΩžø" +
    "¿¡¬√ƒ≈Ć«Č… ÀÃÕŒœĐ—“”‘’÷◊©⁄€‹›Æ»–·‚„‰ÂćÁčÈÍÎÏÌÓÔđÒÚÛÙıˆ˜¯πË˚¸Êæˇ",
  "x-mac-cyrillic":
    "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ†°Ґ£§•¶І®©™Ђђ≠Ѓѓ∞±≤≥іµґЈЄєЇїЉљЊњ" +
    "јЅ¬√ƒ≈∆«»… ЋћЌќѕ–—“”‘’÷„ЎўЏџ№Ёёяабвгдежзийклмнопрстуфхцчшщъыьэю",
  "x-mac-gaelic":
    "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØḂ±≤≥ḃĊċḊḋḞḟĠġṀæø" +
    "ṁṖṗɼƒſṠ«»… ÀÃÕŒœ–—“”‘’ṡẛÿŸṪ€‹›Ŷŷṫ·Ỳỳ⁊ÂÊÁËÈÍÎÏÌÓÔ♣ÒÚÛÙıÝýŴŵẄẅẀẁẂẃ",
  "x-mac-greek":
    "Ä¹²É³ÖÜ΅àâä΄¨çéèêë£™îï•½‰ôö¦€ùûü†ΓΔΘΛΞΠß®©ΣΪ§≠°·Α±≤≥¥ΒΕΖΗΙΚΜΦΫΨΩ" +
    "άΝ¬ΟΡ≈Τ«»… ΥΧΆΈœ–―“”‘’÷ΉΊΌΎέήίόΏύαβψδεφγηιξκλμνοπώρστθωςχυζϊϋΐΰ­",
  "x-mac-icelandic":
    "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûüÝ°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø" +
    "¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€ÐðÞþý·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ",
  "x-mac-inuit":
    "ᐃᐄᐅᐆᐊᐋᐱᐲᐳᐴᐸᐹᑉᑎᑏᑐᑑᑕᑖᑦᑭᑮᑯᑰᑲᑳᒃᒋᒌᒍᒎᒐᒑ°ᒡᒥᒦ•¶ᒧ®©™ᒨᒪᒫᒻᓂᓃᓄᓅᓇᓈᓐᓯᓰᓱᓲᓴᓵᔅᓕᓖᓗ" +
    "ᓘᓚᓛᓪᔨᔩᔪᔫᔭ… ᔮᔾᕕᕖᕗ–—“”‘’ᕘᕙᕚᕝᕆᕇᕈᕉᕋᕌᕐᕿᖀᖁᖂᖃᖄᖅᖏᖐᖑᖒᖓᖔᖕᙱᙲᙳᙴᙵᙶᖖᖠᖡᖢᖣᖤᖥᖦᕼŁł",
  "x-mac-ce":
    "ÄĀāÉĄÖÜáąČäčĆćéŹźĎíďĒēĖóėôöõúĚěü†°Ę£§•¶ß®©™ę¨≠ģĮįĪ≤≥īĶ∂∑łĻļĽľĹĺŅ" +
    "ņŃ¬√ńŇ∆«»… ňŐÕőŌ–—“”‘’÷◊ōŔŕŘ‹›řŖŗŠ‚„šŚśÁŤťÍŽžŪÓÔūŮÚůŰűŲųÝýķŻŁżĢˇ",
  macintosh:
    "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø" +
    "¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ",
  "x-mac-romanian":
    "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ĂȘ∞±≤≥¥µ∂∑∏π∫ªºΩăș" +
    "¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›Țț‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ",
  "x-mac-turkish":
    "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø" +
    "¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸĞğİıŞş‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙˆ˜¯˘˙˚¸˝˛ˇ",
};

// Unicode to Mac byte tables for encode.MACSTRING, built on first use.
// (opentype.js caches them in a WeakMap keyed by String objects; a Map gives
// the same results.)
const macEncodingTableCache = new Map<string, Record<number, number>>();

function getMacEncodingTable(encoding: string): Record<number, number> | undefined {
  const cached = macEncodingTableCache.get(encoding);
  if (cached !== undefined) {
    return cached;
  }
  if (!Object.prototype.hasOwnProperty.call(eightBitMacEncodings, encoding)) {
    return undefined;
  }
  const decodingTable = eightBitMacEncodings[encoding] as string;
  const encodingTable: Record<number, number> = {};
  for (let i = 0; i < decodingTable.length; i++) {
    encodingTable[decodingTable.charCodeAt(i)] = i + 0x80;
  }
  macEncodingTableCache.set(encoding, encodingTable);
  return encodingTable;
}

/** The string in an eight-bit Mac encoding, or undefined if a character can't be encoded. */
function encodeMACSTRING(str: string, encoding: string): number[] | undefined {
  const table = getMacEncodingTable(encoding);
  if (table === undefined) {
    return undefined;
  }
  const result: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c: number | undefined = str.charCodeAt(i);
    if (c >= 0x80) {
      c = table[c];
      if (c === undefined) {
        return undefined;
      }
    }
    result[i] = c;
  }
  return result;
}

function isByteEncodable(value: number): boolean {
  return value >= -128 && value <= 127;
}

function encodeVarDeltaRunAsZeroes(deltas: number[], pos: number, result: number[]): number {
  let runLength = 0;
  const numDeltas = deltas.length;
  while (pos < numDeltas && runLength < 64 && deltas[pos] === 0) {
    ++pos;
    ++runLength;
  }
  result.push(0x80 | (runLength - 1));
  return pos;
}

function encodeVarDeltaRunAsBytes(deltas: number[], offset: number, result: number[]): number {
  let runLength = 0;
  const numDeltas = deltas.length;
  let pos = offset;
  while (pos < numDeltas && runLength < 64) {
    const value = deltas[pos] as number;
    if (!isByteEncodable(value)) {
      break;
    }
    // Two or more zeroes are cheaper as their own run.
    if (value === 0 && pos + 1 < numDeltas && deltas[pos + 1] === 0) {
      break;
    }
    ++pos;
    ++runLength;
  }
  result.push(runLength - 1);
  for (let i = offset; i < pos; ++i) {
    result.push(((deltas[i] as number) + 256) & 0xff);
  }
  return pos;
}

function encodeVarDeltaRunAsWords(deltas: number[], offset: number, result: number[]): number {
  let runLength = 0;
  const numDeltas = deltas.length;
  let pos = offset;
  while (pos < numDeltas && runLength < 64) {
    const value = deltas[pos] as number;
    if (value === 0) {
      break;
    }
    // Two byte-sized values in a row are cheaper as a byte run.
    if (
      isByteEncodable(value) &&
      pos + 1 < numDeltas &&
      isByteEncodable(deltas[pos + 1] as number)
    ) {
      break;
    }
    ++pos;
    ++runLength;
  }
  result.push(0x40 | (runLength - 1));
  for (let i = offset; i < pos; ++i) {
    const val = deltas[i] as number;
    result.push(((val + 0x10000) >> 8) & 0xff, (val + 0x100) & 0xff);
  }
  return pos;
}

/** Packed deltas of a gvar or cvar table. */
function encodeVARDELTAS(deltas: number[]): number[] {
  let pos = 0;
  const result: number[] = [];
  while (pos < deltas.length) {
    const value = deltas[pos] as number;
    if (value === 0) {
      pos = encodeVarDeltaRunAsZeroes(deltas, pos, result);
    } else if (value >= -128 && value <= 127) {
      pos = encodeVarDeltaRunAsBytes(deltas, pos, result);
    } else {
      pos = encodeVarDeltaRunAsWords(deltas, pos, result);
    }
  }
  return result;
}

/** A CFF INDEX of typed values. */
function encodeINDEX(l: TypedValue[]): number[] {
  // The offset size depends on the total data size, so the data is encoded first.
  let offset = 1;
  const offsets = [offset];
  const data: number[] = [];
  for (let i = 0; i < l.length; i += 1) {
    const v = encodeOBJECT(l[i] as TypedValue);
    Array.prototype.push.apply(data, v);
    offset += v.length;
    offsets.push(offset);
  }

  if (data.length === 0) {
    return [0, 0];
  }

  const encodedOffsets: number[] = [];
  const offSize = (1 + Math.floor(Math.log(offset) / Math.log(2)) / 8) | 0;
  const offsetEncoder = [undefined, encodeBYTE, encodeUSHORT, encodeUINT24, encodeULONG][
    offSize
  ] as (v: number) => number[];
  for (let i = 0; i < offsets.length; i += 1) {
    const encodedOffset = offsetEncoder(offsets[i] as number);
    Array.prototype.push.apply(encodedOffsets, encodedOffset);
  }

  return Array.prototype.concat(
    encodeUSHORT(l.length),
    encodeBYTE(offSize),
    encodedOffsets,
    data,
  ) as number[];
}

/** A CFF DICT: operator number to operand. */
function encodeDICT(m: Record<number, DictEntry>): number[] {
  let d: number[] = [];
  const keys = Object.keys(m);
  const length = keys.length;
  for (let i = 0; i < length; i += 1) {
    // Object.keys gives strings, the keys are operator numbers.
    const k = parseInt(keys[i] as string, 0);
    const v = m[k] as DictEntry;
    // The operand comes before the operator.
    d = d.concat(encodeOPERAND(v.value, v.type));
    d = d.concat(encodeOPERATOR(k));
  }
  return d;
}

function encodeOPERATOR(v: number): number[] {
  if (v < 1200) {
    return [v];
  }
  return [12, v - 1200];
}

function encodeOPERAND(v: unknown, type: string | string[]): number[] {
  let d: number[] = [];
  if (Array.isArray(type)) {
    const values = v as unknown[];
    for (let i = 0; i < type.length; i += 1) {
      check.argument(values.length === type.length, "Not enough arguments given for type" + type);
      d = d.concat(encodeOPERAND(values[i], type[i] as string));
    }
  } else {
    if (type === "SID") {
      d = d.concat(encodeNUMBER(v as number));
    } else if (type === "offset") {
      // Offsets always take 4 bytes, which keeps the top dict size fixed.
      d = d.concat(encodeNUMBER32(v as number));
    } else if (type === "number") {
      d = d.concat(encodeNUMBER(v as number));
    } else if (type === "real") {
      d = d.concat(encodeREAL(v as number));
    } else {
      throw new Error("Unknown operand type " + type);
    }
  }
  return d;
}

// Charstring encodings, cached per ops array like opentype.js.
const charStringCache = new WeakMap<CharStringOp[], number[]>();

function encodeCHARSTRING(ops: CharStringOp[]): number[] {
  const cachedValue = charStringCache.get(ops);
  if (cachedValue !== undefined) {
    return cachedValue;
  }
  let d: number[] = [];
  const length = ops.length;
  for (let i = 0; i < length; i += 1) {
    const op = ops[i] as CharStringOp;
    d = d.concat((encoderFor(op.type) as Encoder)(op.value));
  }
  charStringCache.set(ops, d);
  return d;
}

function encodeOBJECT(v: TypedValue): number[] {
  const encodingFunction = encoderFor(v.type);
  check.argument(encodingFunction !== undefined, "No encoding function for type " + v.type);
  return encodingFunction(v.value);
}

/** A table: plain fields in order, subtables (type TABLE) after them with 16-bit offsets. */
function encodeTABLE(table: TableLike): number[] {
  let d: number[] = [];
  const length = table.fields.length;
  const subtables: number[][] = [];
  const subtableOffsets: number[] = [];

  for (let i = 0; i < length; i += 1) {
    const field = table.fields[i] as TypedValue;
    const encodingFunction = encoderFor(field.type);
    check.argument(
      encodingFunction !== undefined,
      "No encoding function for field type " + field.type + " (" + field.name + ")",
    );
    let value = table[field.name as string];
    if (value === undefined) {
      value = field.value;
    }
    const bytes = encodingFunction(value);
    if (field.type === "TABLE") {
      subtableOffsets.push(d.length);
      d = d.concat([0, 0]);
      subtables.push(bytes);
    } else {
      d = d.concat(bytes);
    }
  }

  for (let i = 0; i < subtables.length; i += 1) {
    const o = subtableOffsets[i] as number;
    const offset = d.length;
    check.argument(offset < 65536, "Table " + table.tableName + " too big.");
    d[o] = offset >> 8;
    d[o + 1] = offset & 0xff;
    d = d.concat(subtables[i] as number[]);
  }
  return d;
}

function encodeLITERAL(v: number[]): number[] {
  return v;
}

/** Encoders by type name. Each returns the value's bytes. */
export const encode = {
  BYTE: encodeBYTE,
  CHAR: encodeCHAR,
  CHARARRAY: encodeCHARARRAY,
  USHORT: encodeUSHORT,
  SHORT: encodeSHORT,
  UINT24: encodeUINT24,
  ULONG: encodeULONG,
  LONG: encodeLONG,
  FIXED: encodeULONG,
  FWORD: encodeSHORT,
  UFWORD: encodeUSHORT,
  LONGDATETIME: encodeLONGDATETIME,
  TAG: encodeTAG,
  Card8: encodeBYTE,
  Card16: encodeUSHORT,
  OffSize: encodeBYTE,
  SID: encodeUSHORT,
  NUMBER: encodeNUMBER,
  NUMBER16: encodeNUMBER16,
  NUMBER32: encodeNUMBER32,
  REAL: encodeREAL,
  NAME: encodeCHARARRAY,
  STRING: encodeCHARARRAY,
  UTF16: encodeUTF16,
  MACSTRING: encodeMACSTRING,
  VARDELTAS: encodeVARDELTAS,
  INDEX: encodeINDEX,
  DICT: encodeDICT,
  OPERATOR: encodeOPERATOR,
  OPERAND: encodeOPERAND,
  OP: encodeBYTE,
  CHARSTRING: encodeCHARSTRING,
  OBJECT: encodeOBJECT,
  TABLE: encodeTABLE,
  RECORD: encodeTABLE,
  LITERAL: encodeLITERAL,
};

// Sizes ///////////////////////////////////////////////////////////////////

function sizeOfTABLE(table: TableLike): number {
  let numBytes = 0;
  const length = table.fields.length;
  for (let i = 0; i < length; i += 1) {
    const field = table.fields[i] as TypedValue;
    const sizeOfFunction = sizeOfFor(field.type);
    check.argument(
      sizeOfFunction !== undefined,
      "No sizeOf function for field type " + field.type + " (" + field.name + ")",
    );
    let value = table[field.name as string];
    if (value === undefined) {
      value = field.value;
    }
    numBytes += sizeOfFunction(value);
    // Subtables take 2 more bytes for their offset.
    if (field.type === "TABLE") {
      numBytes += 2;
    }
  }
  return numBytes;
}

/** Encoded sizes in bytes by type name. */
export const sizeOf = {
  BYTE: constant(1),
  CHAR: constant(1),
  CHARARRAY: (v: string): number => v.length,
  USHORT: constant(2),
  SHORT: constant(2),
  UINT24: constant(3),
  ULONG: constant(4),
  LONG: constant(4),
  FIXED: constant(4),
  FWORD: constant(2),
  UFWORD: constant(2),
  LONGDATETIME: constant(8),
  TAG: constant(4),
  Card8: constant(1),
  Card16: constant(2),
  OffSize: constant(1),
  SID: constant(2),
  NUMBER: (v: number): number => encodeNUMBER(v).length,
  NUMBER16: constant(3),
  NUMBER32: constant(5),
  REAL: (v: number): number => encodeREAL(v).length,
  NAME: (v: string): number => v.length,
  STRING: (v: string): number => v.length,
  UTF16: (v: string): number => v.length * 2,
  MACSTRING: (str: string, encoding: string): number => {
    const b = encodeMACSTRING(str, encoding);
    return b !== undefined ? b.length : 0;
  },
  INDEX: (v: TypedValue[]): number => encodeINDEX(v).length,
  DICT: (m: Record<number, DictEntry>): number => encodeDICT(m).length,
  OP: constant(1),
  CHARSTRING: (ops: CharStringOp[]): number => encodeCHARSTRING(ops).length,
  OBJECT: (v: TypedValue): number => {
    const sizeOfFunction = sizeOfFor(v.type);
    check.argument(sizeOfFunction !== undefined, "No sizeOf function for type " + v.type);
    return sizeOfFunction(v.value);
  },
  TABLE: sizeOfTABLE,
  RECORD: sizeOfTABLE,
  LITERAL: (v: number[]): number => v.length,
};

// Decoders ////////////////////////////////////////////////////////////////

/** One char per byte (despite the name, no UTF-8 decoding). */
function decodeUTF8(data: DataView, offset: number, numBytes: number): string {
  const codePoints: number[] = [];
  const numChars = numBytes;
  for (let j = 0; j < numChars; j++, offset += 1) {
    codePoints[j] = data.getUint8(offset);
  }
  return String.fromCharCode.apply(null, codePoints);
}

/** UTF-16 code units, big endian. */
function decodeUTF16(data: DataView, offset: number, numBytes: number): string {
  const codePoints: number[] = [];
  const numChars = numBytes / 2;
  for (let j = 0; j < numChars; j++, offset += 2) {
    codePoints[j] = data.getUint16(offset);
  }
  return String.fromCharCode.apply(null, codePoints);
}

/** A string in an eight-bit Mac encoding, or undefined for an unknown encoding. */
function decodeMACSTRING(
  dataView: DataView,
  offset: number,
  dataLength: number,
  encoding: string,
): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(eightBitMacEncodings, encoding)) {
    return undefined;
  }
  const table = eightBitMacEncodings[encoding] as string;
  let result = "";
  for (let i = 0; i < dataLength; i++) {
    const c = dataView.getUint8(offset + i);
    if (c <= 0x7f) {
      result += String.fromCharCode(c);
    } else {
      result += table[c & 0x7f];
    }
  }
  return result;
}

export const decode = {
  UTF8: decodeUTF8,
  UTF16: decodeUTF16,
  MACSTRING: decodeMACSTRING,
};
