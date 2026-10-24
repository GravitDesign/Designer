// Old: chunk.vendor.js module 996 (opentype.js tables/kern.js, unchanged).
// The kern table: pair kerning, Windows (version 0) and Mac (version 1) layouts.

import * as check from "../check.ts";
import { Parser } from "../parse.ts";

/** Kerning by "leftIndex,rightIndex". */
export type KerningPairs = Record<string, number>;

function parseWindowsKernTable(p: Parser): KerningPairs {
  const pairs: KerningPairs = {};
  // nTables
  p.skip("uShort");
  const subtableVersion = p.parseUShort();
  check.argument(subtableVersion === 0, "Unsupported kern sub-table version.");
  // subtableLength, subtableCoverage
  p.skip("uShort", 2);
  const nPairs = p.parseUShort();
  // searchRange, entrySelector, rangeShift
  p.skip("uShort", 3);
  for (let i = 0; i < nPairs; i += 1) {
    const leftIndex = p.parseUShort();
    const rightIndex = p.parseUShort();
    const value = p.parseShort();
    pairs[leftIndex + "," + rightIndex] = value;
  }
  return pairs;
}

function parseMacKernTable(p: Parser): KerningPairs {
  const pairs: KerningPairs = {};
  // The Mac version is a 32-bit fixed; only its first 16 bits were read.
  p.skip("uShort");
  const nTables = p.parseULong();
  if (nTables > 1) {
    console.warn("Only the first kern subtable is supported.");
  }
  p.skip("uLong");
  const coverage = p.parseUShort();
  const subtableVersion = coverage & 0xff;
  p.skip("uShort");
  if (subtableVersion === 0) {
    const nPairs = p.parseUShort();
    // searchRange, entrySelector, rangeShift
    p.skip("uShort", 3);
    for (let i = 0; i < nPairs; i += 1) {
      const leftIndex = p.parseUShort();
      const rightIndex = p.parseUShort();
      const value = p.parseShort();
      pairs[leftIndex + "," + rightIndex] = value;
    }
  }
  return pairs;
}

export function parse(data: DataView, start: number): KerningPairs {
  const p = new Parser(data, start);
  const tableVersion = p.parseUShort();
  if (tableVersion === 0) {
    return parseWindowsKernTable(p);
  } else if (tableVersion === 1) {
    return parseMacKernTable(p);
  }
  throw new Error("Unsupported kern table version (" + tableVersion + ").");
}
