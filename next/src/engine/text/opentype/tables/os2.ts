// Old: chunk.vendor.js module 719 (opentype.js tables/os2.js, unchanged).
// The OS/2 table: metrics and other data required by Windows.

import { Parser } from "../parse.ts";
import { Table } from "../table.ts";

export interface UnicodeRange {
  begin: number;
  end: number;
}

/** The Unicode blocks of the ulUnicodeRange bits, by bit number. */
export const unicodeRanges: UnicodeRange[] = [
  { begin: 0, end: 127 },
  { begin: 128, end: 255 },
  { begin: 256, end: 383 },
  { begin: 384, end: 591 },
  { begin: 592, end: 687 },
  { begin: 688, end: 767 },
  { begin: 768, end: 879 },
  { begin: 880, end: 1023 },
  { begin: 11392, end: 11519 },
  { begin: 1024, end: 1279 },
  { begin: 1328, end: 1423 },
  { begin: 1424, end: 1535 },
  { begin: 42240, end: 42559 },
  { begin: 1536, end: 1791 },
  { begin: 1984, end: 2047 },
  { begin: 2304, end: 2431 },
  { begin: 2432, end: 2559 },
  { begin: 2560, end: 2687 },
  { begin: 2688, end: 2815 },
  { begin: 2816, end: 2943 },
  { begin: 2944, end: 3071 },
  { begin: 3072, end: 3199 },
  { begin: 3200, end: 3327 },
  { begin: 3328, end: 3455 },
  { begin: 3584, end: 3711 },
  { begin: 3712, end: 3839 },
  { begin: 4256, end: 4351 },
  { begin: 6912, end: 7039 },
  { begin: 4352, end: 4607 },
  { begin: 7680, end: 7935 },
  { begin: 7936, end: 8191 },
  { begin: 8192, end: 8303 },
  { begin: 8304, end: 8351 },
  { begin: 8352, end: 8399 },
  { begin: 8400, end: 8447 },
  { begin: 8448, end: 8527 },
  { begin: 8528, end: 8591 },
  { begin: 8592, end: 8703 },
  { begin: 8704, end: 8959 },
  { begin: 8960, end: 9215 },
  { begin: 9216, end: 9279 },
  { begin: 9280, end: 9311 },
  { begin: 9312, end: 9471 },
  { begin: 9472, end: 9599 },
  { begin: 9600, end: 9631 },
  { begin: 9632, end: 9727 },
  { begin: 9728, end: 9983 },
  { begin: 9984, end: 10175 },
  { begin: 12288, end: 12351 },
  { begin: 12352, end: 12447 },
  { begin: 12448, end: 12543 },
  { begin: 12544, end: 12591 },
  { begin: 12592, end: 12687 },
  { begin: 43072, end: 43135 },
  { begin: 12800, end: 13055 },
  { begin: 13056, end: 13311 },
  { begin: 44032, end: 55215 },
  { begin: 55296, end: 57343 },
  { begin: 67840, end: 67871 },
  { begin: 19968, end: 40959 },
  { begin: 57344, end: 63743 },
  { begin: 12736, end: 12783 },
  { begin: 64256, end: 64335 },
  { begin: 64336, end: 65023 },
  { begin: 65056, end: 65071 },
  { begin: 65040, end: 65055 },
  { begin: 65104, end: 65135 },
  { begin: 65136, end: 65279 },
  { begin: 65280, end: 65519 },
  { begin: 65520, end: 65535 },
  { begin: 3840, end: 4095 },
  { begin: 1792, end: 1871 },
  { begin: 1920, end: 1983 },
  { begin: 3456, end: 3583 },
  { begin: 4096, end: 4255 },
  { begin: 4608, end: 4991 },
  { begin: 5024, end: 5119 },
  { begin: 5120, end: 5759 },
  { begin: 5760, end: 5791 },
  { begin: 5792, end: 5887 },
  { begin: 6016, end: 6143 },
  { begin: 6144, end: 6319 },
  { begin: 10240, end: 10495 },
  { begin: 40960, end: 42127 },
  { begin: 5888, end: 5919 },
  { begin: 66304, end: 66351 },
  { begin: 66352, end: 66383 },
  { begin: 66560, end: 66639 },
  { begin: 118784, end: 119039 },
  { begin: 119808, end: 120831 },
  { begin: 1044480, end: 1048573 },
  { begin: 65024, end: 65039 },
  { begin: 917504, end: 917631 },
  { begin: 6400, end: 6479 },
  { begin: 6480, end: 6527 },
  { begin: 6528, end: 6623 },
  { begin: 6656, end: 6687 },
  { begin: 11264, end: 11359 },
  { begin: 11568, end: 11647 },
  { begin: 19904, end: 19967 },
  { begin: 43008, end: 43055 },
  { begin: 65536, end: 65663 },
  { begin: 65856, end: 65935 },
  { begin: 66432, end: 66463 },
  { begin: 66464, end: 66527 },
  { begin: 66640, end: 66687 },
  { begin: 66688, end: 66735 },
  { begin: 67584, end: 67647 },
  { begin: 68096, end: 68191 },
  { begin: 119552, end: 119647 },
  { begin: 73728, end: 74751 },
  { begin: 119648, end: 119679 },
  { begin: 7040, end: 7103 },
  { begin: 7168, end: 7247 },
  { begin: 7248, end: 7295 },
  { begin: 43136, end: 43231 },
  { begin: 43264, end: 43311 },
  { begin: 43312, end: 43359 },
  { begin: 43520, end: 43615 },
  { begin: 65936, end: 65999 },
  { begin: 66000, end: 66047 },
  { begin: 66208, end: 66271 },
  { begin: 127024, end: 127135 },
];

/** The ulUnicodeRange bit for a code point, or -1. The range end is excluded, as in opentype.js. */
export function getUnicodeRange(unicode: number): number {
  for (let i = 0; i < unicodeRanges.length; i += 1) {
    const range = unicodeRanges[i] as UnicodeRange;
    if (unicode >= range.begin && unicode < range.end) {
      return i;
    }
  }
  return -1;
}

export interface Os2Table {
  version: number;
  xAvgCharWidth: number;
  usWeightClass: number;
  usWidthClass: number;
  fsType: number;
  ySubscriptXSize: number;
  ySubscriptYSize: number;
  ySubscriptXOffset: number;
  ySubscriptYOffset: number;
  ySuperscriptXSize: number;
  ySuperscriptYSize: number;
  ySuperscriptXOffset: number;
  ySuperscriptYOffset: number;
  yStrikeoutSize: number;
  yStrikeoutPosition: number;
  sFamilyClass: number;
  panose: number[];
  ulUnicodeRange1: number;
  ulUnicodeRange2: number;
  ulUnicodeRange3: number;
  ulUnicodeRange4: number;
  achVendID: string;
  fsSelection: number;
  usFirstCharIndex: number;
  usLastCharIndex: number;
  sTypoAscender: number;
  sTypoDescender: number;
  sTypoLineGap: number;
  usWinAscent: number;
  usWinDescent: number;
  ulCodePageRange1?: number;
  ulCodePageRange2?: number;
  sxHeight?: number;
  sCapHeight?: number;
  usDefaultChar?: number;
  usBreakChar?: number;
  /** Misspelled usMaxContext, as in opentype.js (make writes usMaxContext). */
  usMaxContent?: number;
}

export function parse(data: DataView, start: number): Os2Table {
  const p = new Parser(data, start);
  const os2 = {} as Os2Table;
  os2.version = p.parseUShort();
  os2.xAvgCharWidth = p.parseShort();
  os2.usWeightClass = p.parseUShort();
  os2.usWidthClass = p.parseUShort();
  os2.fsType = p.parseUShort();
  os2.ySubscriptXSize = p.parseShort();
  os2.ySubscriptYSize = p.parseShort();
  os2.ySubscriptXOffset = p.parseShort();
  os2.ySubscriptYOffset = p.parseShort();
  os2.ySuperscriptXSize = p.parseShort();
  os2.ySuperscriptYSize = p.parseShort();
  os2.ySuperscriptXOffset = p.parseShort();
  os2.ySuperscriptYOffset = p.parseShort();
  os2.yStrikeoutSize = p.parseShort();
  os2.yStrikeoutPosition = p.parseShort();
  os2.sFamilyClass = p.parseShort();
  os2.panose = [];
  for (let i = 0; i < 10; i++) {
    os2.panose[i] = p.parseByte();
  }
  os2.ulUnicodeRange1 = p.parseULong();
  os2.ulUnicodeRange2 = p.parseULong();
  os2.ulUnicodeRange3 = p.parseULong();
  os2.ulUnicodeRange4 = p.parseULong();
  os2.achVendID = String.fromCharCode(p.parseByte(), p.parseByte(), p.parseByte(), p.parseByte());
  os2.fsSelection = p.parseUShort();
  os2.usFirstCharIndex = p.parseUShort();
  os2.usLastCharIndex = p.parseUShort();
  os2.sTypoAscender = p.parseShort();
  os2.sTypoDescender = p.parseShort();
  os2.sTypoLineGap = p.parseShort();
  os2.usWinAscent = p.parseUShort();
  os2.usWinDescent = p.parseUShort();
  if (os2.version >= 1) {
    os2.ulCodePageRange1 = p.parseULong();
    os2.ulCodePageRange2 = p.parseULong();
  }
  if (os2.version >= 2) {
    os2.sxHeight = p.parseShort();
    os2.sCapHeight = p.parseShort();
    os2.usDefaultChar = p.parseUShort();
    os2.usBreakChar = p.parseUShort();
    os2.usMaxContent = p.parseUShort();
  }
  return os2;
}

export function make(options: Record<string, unknown>): Table {
  return new Table(
    "OS/2",
    [
      { name: "version", type: "USHORT", value: 3 },
      { name: "xAvgCharWidth", type: "SHORT", value: 0 },
      { name: "usWeightClass", type: "USHORT", value: 0 },
      { name: "usWidthClass", type: "USHORT", value: 0 },
      { name: "fsType", type: "USHORT", value: 0 },
      { name: "ySubscriptXSize", type: "SHORT", value: 650 },
      { name: "ySubscriptYSize", type: "SHORT", value: 699 },
      { name: "ySubscriptXOffset", type: "SHORT", value: 0 },
      { name: "ySubscriptYOffset", type: "SHORT", value: 140 },
      { name: "ySuperscriptXSize", type: "SHORT", value: 650 },
      { name: "ySuperscriptYSize", type: "SHORT", value: 699 },
      { name: "ySuperscriptXOffset", type: "SHORT", value: 0 },
      { name: "ySuperscriptYOffset", type: "SHORT", value: 479 },
      { name: "yStrikeoutSize", type: "SHORT", value: 49 },
      { name: "yStrikeoutPosition", type: "SHORT", value: 258 },
      { name: "sFamilyClass", type: "SHORT", value: 0 },
      { name: "bFamilyType", type: "BYTE", value: 0 },
      { name: "bSerifStyle", type: "BYTE", value: 0 },
      { name: "bWeight", type: "BYTE", value: 0 },
      { name: "bProportion", type: "BYTE", value: 0 },
      { name: "bContrast", type: "BYTE", value: 0 },
      { name: "bStrokeVariation", type: "BYTE", value: 0 },
      { name: "bArmStyle", type: "BYTE", value: 0 },
      { name: "bLetterform", type: "BYTE", value: 0 },
      { name: "bMidline", type: "BYTE", value: 0 },
      { name: "bXHeight", type: "BYTE", value: 0 },
      { name: "ulUnicodeRange1", type: "ULONG", value: 0 },
      { name: "ulUnicodeRange2", type: "ULONG", value: 0 },
      { name: "ulUnicodeRange3", type: "ULONG", value: 0 },
      { name: "ulUnicodeRange4", type: "ULONG", value: 0 },
      { name: "achVendID", type: "CHARARRAY", value: "XXXX" },
      { name: "fsSelection", type: "USHORT", value: 0 },
      { name: "usFirstCharIndex", type: "USHORT", value: 0 },
      { name: "usLastCharIndex", type: "USHORT", value: 0 },
      { name: "sTypoAscender", type: "SHORT", value: 0 },
      { name: "sTypoDescender", type: "SHORT", value: 0 },
      { name: "sTypoLineGap", type: "SHORT", value: 0 },
      { name: "usWinAscent", type: "USHORT", value: 0 },
      { name: "usWinDescent", type: "USHORT", value: 0 },
      { name: "ulCodePageRange1", type: "ULONG", value: 0 },
      { name: "ulCodePageRange2", type: "ULONG", value: 0 },
      { name: "sxHeight", type: "SHORT", value: 0 },
      { name: "sCapHeight", type: "SHORT", value: 0 },
      { name: "usDefaultChar", type: "USHORT", value: 0 },
      { name: "usBreakChar", type: "USHORT", value: 0 },
      { name: "usMaxContext", type: "USHORT", value: 0 },
    ],
    options,
  );
}
