// Old: chunk.vendor.js module 713 (opentype.js tables/head.js, unchanged).
// The head table: global information about the font.

import * as check from "../check.ts";
import { Parser } from "../parse.ts";
import { Table } from "../table.ts";

export interface HeadTable {
  version: number;
  fontRevision: number;
  checkSumAdjustment: number;
  magicNumber: number;
  flags: number;
  unitsPerEm: number;
  created: number;
  modified: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  macStyle: number;
  lowestRecPPEM: number;
  fontDirectionHint: number;
  indexToLocFormat: number;
  glyphDataFormat: number;
}

export function parse(data: DataView, start: number): HeadTable {
  const p = new Parser(data, start);
  const version = p.parseVersion();
  const fontRevision = Math.round(p.parseFixed() * 1000) / 1000;
  const checkSumAdjustment = p.parseULong();
  const magicNumber = p.parseULong();
  check.argument(magicNumber === 0x5f0f3cf5, "Font header has wrong magic number.");
  return {
    version,
    fontRevision,
    checkSumAdjustment,
    magicNumber,
    flags: p.parseUShort(),
    unitsPerEm: p.parseUShort(),
    created: p.parseLongDateTime(),
    modified: p.parseLongDateTime(),
    xMin: p.parseShort(),
    yMin: p.parseShort(),
    xMax: p.parseShort(),
    yMax: p.parseShort(),
    macStyle: p.parseUShort(),
    lowestRecPPEM: p.parseUShort(),
    fontDirectionHint: p.parseShort(),
    indexToLocFormat: p.parseShort(),
    glyphDataFormat: p.parseShort(),
  };
}

/** A head table; created defaults to now unless options.createdTimestamp is set. */
export function make(options: Record<string, unknown>): Table {
  // 2082844800 seconds between 1904 (Mac epoch) and 1970 (Unix epoch).
  const timestamp = Math.round(new Date().getTime() / 1000) + 2082844800;
  let createdTimestamp = timestamp;
  if (options.createdTimestamp) {
    createdTimestamp = (options.createdTimestamp as number) + 2082844800;
  }
  return new Table(
    "head",
    [
      { name: "version", type: "FIXED", value: 0x00010000 },
      { name: "fontRevision", type: "FIXED", value: 0x00010000 },
      { name: "checkSumAdjustment", type: "ULONG", value: 0 },
      { name: "magicNumber", type: "ULONG", value: 0x5f0f3cf5 },
      { name: "flags", type: "USHORT", value: 0 },
      { name: "unitsPerEm", type: "USHORT", value: 1000 },
      { name: "created", type: "LONGDATETIME", value: createdTimestamp },
      { name: "modified", type: "LONGDATETIME", value: timestamp },
      { name: "xMin", type: "SHORT", value: 0 },
      { name: "yMin", type: "SHORT", value: 0 },
      { name: "xMax", type: "SHORT", value: 0 },
      { name: "yMax", type: "SHORT", value: 0 },
      { name: "macStyle", type: "USHORT", value: 0 },
      { name: "lowestRecPPEM", type: "USHORT", value: 0 },
      { name: "fontDirectionHint", type: "SHORT", value: 2 },
      { name: "indexToLocFormat", type: "SHORT", value: 0 },
      { name: "glyphDataFormat", type: "SHORT", value: 0 },
    ],
    options,
  );
}
