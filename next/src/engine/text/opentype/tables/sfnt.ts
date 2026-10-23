// Old: chunk.vendor.js module 983 (opentype.js tables/sfnt.js, unchanged).
// The sfnt wrapper: the table directory and the tables of a whole font
// file. The writer always produces a CFF (OTTO) font.

import * as check from "../check.ts";
import type { Font } from "../font.ts";
import type { Glyph } from "../glyph.ts";
import { Record as TableRecord, Table } from "../table.ts";
import type { Field } from "../table.ts";
import * as cff from "./cff.ts";
import * as cmap from "./cmap.ts";
import * as gsub from "./gsub.ts";
import * as head from "./head.ts";
import * as hhea from "./hhea.ts";
import * as hmtx from "./hmtx.ts";
import * as ltag from "./ltag.ts";
import * as maxp from "./maxp.ts";
import * as meta from "./meta.ts";
import * as nameTable from "./name.ts";
import type { NameTable } from "./name.ts";
import * as os2 from "./os2.ts";
import type { Os2Table } from "./os2.ts";
import * as post from "./post.ts";

function log2(v: number): number {
  return (Math.log(v) / Math.log(2)) | 0;
}

/** The sum of the bytes as big endian 32-bit words, modulo 2^32. Pads bytes to a multiple of 4. */
export function computeCheckSum(bytes: number[]): number {
  while (bytes.length % 4 !== 0) {
    bytes.push(0);
  }
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 4) {
    sum +=
      ((bytes[i] as number) << 24) +
      ((bytes[i + 1] as number) << 16) +
      ((bytes[i + 2] as number) << 8) +
      (bytes[i + 3] as number);
  }
  sum %= Math.pow(2, 32);
  return sum;
}

function makeTableRecord(tag?: string, checkSum?: number, offset?: number, length?: number): Table {
  return new TableRecord("Table Record", [
    { name: "tag", type: "TAG", value: tag !== undefined ? tag : "" },
    { name: "checkSum", type: "ULONG", value: checkSum !== undefined ? checkSum : 0 },
    { name: "offset", type: "ULONG", value: offset !== undefined ? offset : 0 },
    { name: "length", type: "ULONG", value: length !== undefined ? length : 0 },
  ]);
}

/** The sfnt table: header, table records sorted by tag, then the tables, 4-byte aligned. */
export function make(tables: Table[]): Table {
  const sfnt = new Table("sfnt", [
    { name: "version", type: "TAG", value: "OTTO" },
    { name: "numTables", type: "USHORT", value: 0 },
    { name: "searchRange", type: "USHORT", value: 0 },
    { name: "entrySelector", type: "USHORT", value: 0 },
    { name: "rangeShift", type: "USHORT", value: 0 },
  ]);
  sfnt.tables = tables;
  sfnt.numTables = tables.length;
  const highestPowerOf2 = Math.pow(2, log2(tables.length));
  sfnt.searchRange = 16 * highestPowerOf2;
  sfnt.entrySelector = log2(highestPowerOf2);
  sfnt.rangeShift = tables.length * 16 - (sfnt.searchRange as number);

  const recordFields: Field[] = [];
  const tableFields: Field[] = [];

  let offset = sfnt.sizeOf() + makeTableRecord().sizeOf() * tables.length;
  while (offset % 4 !== 0) {
    offset += 1;
    tableFields.push({ name: "padding", type: "BYTE", value: 0 });
  }

  for (let i = 0; i < tables.length; i += 1) {
    const t = tables[i] as Table;
    check.argument(t.tableName.length === 4, "Table name" + t.tableName + " is invalid.");
    const tableLength = t.sizeOf();
    const tableRecord = makeTableRecord(
      t.tableName,
      computeCheckSum(t.encode()),
      offset,
      tableLength,
    );
    recordFields.push({
      name: tableRecord.tag + " Table Record",
      type: "RECORD",
      value: tableRecord,
    });
    tableFields.push({ name: t.tableName + " table", type: "RECORD", value: t });
    offset += tableLength;
    check.argument(!isNaN(offset), "Something went wrong calculating the offset.");
    while (offset % 4 !== 0) {
      offset += 1;
      tableFields.push({ name: "padding", type: "BYTE", value: 0 });
    }
  }

  // Table records are sorted by tag.
  recordFields.sort(function (r1, r2) {
    if (((r1.value as Table).tag as string) > ((r2.value as Table).tag as string)) {
      return 1;
    }
    return -1;
  });

  sfnt.fields = sfnt.fields.concat(recordFields);
  sfnt.fields = sfnt.fields.concat(tableFields);
  return sfnt;
}

interface GlyphMetrics {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

/** The metrics of the first of the characters the font has, else notFound. */
function metricsForChar(font: Font, chars: string, notFound: GlyphMetrics | { yMax: number }) {
  for (let i = 0; i < chars.length; i += 1) {
    const glyphIndex = font.charToGlyphIndex(chars[i] as string) as number;
    if (glyphIndex > 0) {
      const glyph = font.glyphs.get(glyphIndex) as Glyph;
      return glyph.getMetrics();
    }
  }
  return notFound;
}

function average(vs: number[]): number {
  let sum = 0;
  for (let i = 0; i < vs.length; i += 1) {
    sum += vs[i] as number;
  }
  return sum / vs.length;
}

/** All tables of a CFF font file for the font, with the head checksum adjusted. */
export function fontToTable(font: Font): Table {
  const xMins: number[] = [];
  const yMins: number[] = [];
  const xMaxs: number[] = [];
  const yMaxs: number[] = [];
  const advanceWidths: number[] = [];
  const leftSideBearings: number[] = [];
  const rightSideBearings: number[] = [];
  let firstCharIndex: number | undefined;
  let lastCharIndex = 0;
  let ulUnicodeRange1 = 0;
  let ulUnicodeRange2 = 0;
  let ulUnicodeRange3 = 0;
  let ulUnicodeRange4 = 0;

  for (let i = 0; i < font.glyphs.length; i += 1) {
    const glyph = font.glyphs.get(i) as Glyph;
    const unicode = (glyph.unicode as number) | 0;

    if (isNaN(glyph.advanceWidth as number)) {
      throw new Error("Glyph " + glyph.name + " (" + i + "): advanceWidth is not a number.");
    }

    if ((firstCharIndex as number) > unicode || firstCharIndex === undefined) {
      if (unicode > 0) {
        firstCharIndex = unicode;
      }
    }
    if (lastCharIndex < unicode) {
      lastCharIndex = unicode;
    }

    const position = os2.getUnicodeRange(unicode);
    if (position < 32) {
      ulUnicodeRange1 |= 1 << position;
    } else if (position < 64) {
      ulUnicodeRange2 |= 1 << (position - 32);
    } else if (position < 96) {
      ulUnicodeRange3 |= 1 << (position - 64);
    } else if (position < 123) {
      ulUnicodeRange4 |= 1 << (position - 96);
    } else {
      throw new Error("Unicode ranges bits > 123 are reserved for internal usage");
    }
    if (glyph.name === ".notdef") continue;
    const metrics = glyph.getMetrics();
    xMins.push(metrics.xMin);
    yMins.push(metrics.yMin);
    xMaxs.push(metrics.xMax);
    yMaxs.push(metrics.yMax);
    leftSideBearings.push(metrics.leftSideBearing as number);
    rightSideBearings.push(metrics.rightSideBearing as number);
    advanceWidths.push(glyph.advanceWidth as number);
  }

  const globals = {
    xMin: Math.min.apply(null, xMins),
    yMin: Math.min.apply(null, yMins),
    xMax: Math.max.apply(null, xMaxs),
    yMax: Math.max.apply(null, yMaxs),
    advanceWidthMax: Math.max.apply(null, advanceWidths),
    advanceWidthAvg: average(advanceWidths),
    minLeftSideBearing: Math.min.apply(null, leftSideBearings),
    maxLeftSideBearing: Math.max.apply(null, leftSideBearings),
    minRightSideBearing: Math.min.apply(null, rightSideBearings),
    ascender: font.ascender,
    descender: font.descender,
  };

  const headTable = head.make({
    flags: 3, // baseline at y=0, left sidebearing point at x=0
    unitsPerEm: font.unitsPerEm,
    xMin: globals.xMin,
    yMin: globals.yMin,
    xMax: globals.xMax,
    yMax: globals.yMax,
    lowestRecPPEM: 3,
    createdTimestamp: font.createdTimestamp,
  });

  const hheaTable = hhea.make({
    ascender: globals.ascender,
    descender: globals.descender,
    advanceWidthMax: globals.advanceWidthMax,
    minLeftSideBearing: globals.minLeftSideBearing,
    minRightSideBearing: globals.minRightSideBearing,
    xMaxExtent: globals.maxLeftSideBearing + (globals.xMax - globals.xMin),
    numberOfHMetrics: font.glyphs.length,
  });

  const maxpTable = maxp.make(font.glyphs.length);

  const fontOs2 = font.tables.os2 as Os2Table;
  const os2Table = os2.make({
    xAvgCharWidth: Math.round(globals.advanceWidthAvg),
    usWeightClass: fontOs2.usWeightClass,
    usWidthClass: fontOs2.usWidthClass,
    usFirstCharIndex: firstCharIndex,
    usLastCharIndex: lastCharIndex,
    ulUnicodeRange1: ulUnicodeRange1,
    ulUnicodeRange2: ulUnicodeRange2,
    ulUnicodeRange3: ulUnicodeRange3,
    ulUnicodeRange4: ulUnicodeRange4,
    fsSelection: fontOs2.fsSelection,
    sTypoAscender: globals.ascender,
    sTypoDescender: globals.descender,
    sTypoLineGap: 0,
    usWinAscent: globals.yMax,
    usWinDescent: Math.abs(globals.yMin),
    ulCodePageRange1: 1, // Latin 1 only, hard-coded as in opentype.js
    sxHeight: metricsForChar(font, "xyvw", { yMax: Math.round(globals.ascender / 2) }).yMax,
    sCapHeight: metricsForChar(font, "HIKLEFJMNTZBDPRAGOQSUVWXY", globals).yMax,
    usDefaultChar: font.hasChar(" ") ? 32 : 0,
    usBreakChar: font.hasChar(" ") ? 32 : 0,
  });

  const hmtxTable = hmtx.make(font.glyphs);
  const cmapTable = cmap.make(font.glyphs);

  const englishFamilyName = font.getEnglishName("fontFamily") as string;
  const englishStyleName = font.getEnglishName("fontSubfamily");
  const englishFullName = englishFamilyName + " " + englishStyleName;
  let postScriptName = font.getEnglishName("postScriptName");
  if (!postScriptName) {
    postScriptName = englishFamilyName.replace(/\s/g, "") + "-" + englishStyleName;
  }

  const names: NameTable = {};
  for (const n in font.names) {
    names[n] = font.names[n] as Record<string, string>;
  }
  if (!names.uniqueID) {
    names.uniqueID = { en: font.getEnglishName("manufacturer") + ":" + englishFullName };
  }
  if (!names.postScriptName) {
    names.postScriptName = { en: postScriptName };
  }
  if (!names.preferredFamily) {
    names.preferredFamily = font.names.fontFamily as Record<string, string>;
  }
  if (!names.preferredSubfamily) {
    names.preferredSubfamily = font.names.fontSubfamily as Record<string, string>;
  }

  const languageTags: string[] = [];
  const nameTableTable = nameTable.make(names, languageTags);
  const ltagTable = languageTags.length > 0 ? ltag.make(languageTags) : undefined;

  const postTable = post.make();
  const cffTable = cff.make(font.glyphs, {
    version: font.getEnglishName("version"),
    fullName: englishFullName,
    familyName: englishFamilyName,
    weightName: englishStyleName,
    postScriptName: postScriptName,
    unitsPerEm: font.unitsPerEm,
    fontBBox: [0, globals.yMin, globals.ascender, globals.advanceWidthMax],
  });

  const metaTable =
    font.metas && Object.keys(font.metas).length > 0 ? meta.make(font.metas) : undefined;

  // The order of the tables doesn't matter; the records are sorted by tag.
  const tables = [
    headTable,
    hheaTable,
    maxpTable,
    os2Table,
    nameTableTable,
    cmapTable,
    postTable,
    cffTable,
    hmtxTable,
  ];
  if (ltagTable) {
    tables.push(ltagTable);
  }
  if (font.tables.gsub) {
    tables.push(gsub.make(font.tables.gsub));
  }
  if (metaTable) {
    tables.push(metaTable);
  }

  const sfntTable = make(tables);

  // The whole font's checksum goes into the head table.
  const bytes = sfntTable.encode();
  const checkSum = computeCheckSum(bytes);
  const tableFields = sfntTable.fields;
  let checkSumAdjusted = false;
  for (let i = 0; i < tableFields.length; i += 1) {
    const field = tableFields[i] as Field;
    if (field.name === "head table") {
      (field.value as Table).checkSumAdjustment = 0xb1b0afba - checkSum;
      checkSumAdjusted = true;
      break;
    }
  }
  if (!checkSumAdjusted) {
    throw new Error("Could not find head table with checkSum to adjust.");
  }
  return sfntTable;
}
