// Old: chunk.vendor.js module 717 (opentype.js tables/maxp.js, unchanged).
// The maxp table: the number of glyphs and (version 1, TrueType) memory limits.

import { Parser } from "../parse.ts";
import { Table } from "../table.ts";

export interface MaxpTable {
  version: number;
  numGlyphs: number;
  maxPoints?: number;
  maxContours?: number;
  maxCompositePoints?: number;
  maxCompositeContours?: number;
  maxZones?: number;
  maxTwilightPoints?: number;
  maxStorage?: number;
  maxFunctionDefs?: number;
  maxInstructionDefs?: number;
  maxStackElements?: number;
  maxSizeOfInstructions?: number;
  maxComponentElements?: number;
  maxComponentDepth?: number;
}

export function parse(data: DataView, start: number): MaxpTable {
  const p = new Parser(data, start);
  const version = p.parseVersion();
  const maxp: MaxpTable = { version: version, numGlyphs: p.parseUShort() };
  if (maxp.version === 1.0) {
    maxp.maxPoints = p.parseUShort();
    maxp.maxContours = p.parseUShort();
    maxp.maxCompositePoints = p.parseUShort();
    maxp.maxCompositeContours = p.parseUShort();
    maxp.maxZones = p.parseUShort();
    maxp.maxTwilightPoints = p.parseUShort();
    maxp.maxStorage = p.parseUShort();
    maxp.maxFunctionDefs = p.parseUShort();
    maxp.maxInstructionDefs = p.parseUShort();
    maxp.maxStackElements = p.parseUShort();
    maxp.maxSizeOfInstructions = p.parseUShort();
    maxp.maxComponentElements = p.parseUShort();
    maxp.maxComponentDepth = p.parseUShort();
  }
  return maxp;
}

/** A version 0.5 (CFF) maxp table. */
export function make(numGlyphs: number): Table {
  return new Table("maxp", [
    { name: "version", type: "FIXED", value: 0x00005000 },
    { name: "numGlyphs", type: "USHORT", value: numGlyphs },
  ]);
}
