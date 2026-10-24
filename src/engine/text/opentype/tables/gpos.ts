// Old: chunk.vendor.js module 995 (opentype.js tables/gpos.js, unchanged).
// The GPOS table: kerning pairs and other glyph positioning. Only lookup
// types 1 and 2 are read; the others give an { error } placeholder.
// https://docs.microsoft.com/en-us/typography/opentype/spec/gpos

import * as check from "../check.ts";
import type { LayoutTable } from "../layout.ts";
import { Parser } from "../parse.ts";
import type { ClassDef, Coverage, FeatureRecord, ParseFn, ValueRecord } from "../parse.ts";
import * as table from "../table.ts";

/** Lookup type 1, format 1: one value record for all covered glyphs. */
export interface SinglePosFormat1 {
  posFormat: 1;
  coverage: Coverage;
  value: ValueRecord | undefined;
}

/** Lookup type 1, format 2: one value record per covered glyph. */
export interface SinglePosFormat2 {
  posFormat: 2;
  coverage: Coverage;
  values: (ValueRecord | undefined)[];
}

export interface PairValueRecord {
  secondGlyph: number;
  value1: ValueRecord | undefined;
  value2: ValueRecord | undefined;
}

/** Lookup type 2, format 1: adjustments per glyph pair. */
export interface PairPosFormat1 {
  posFormat: 1;
  coverage: Coverage;
  valueFormat1: number;
  valueFormat2: number;
  pairSets: (PairValueRecord[] | undefined)[];
}

export interface Class2Record {
  value1: ValueRecord | undefined;
  value2: ValueRecord | undefined;
}

/** Lookup type 2, format 2: adjustments per pair of glyph classes. */
export interface PairPosFormat2 {
  posFormat: 2;
  coverage: Coverage;
  valueFormat1: number;
  valueFormat2: number;
  classDef1: ClassDef;
  classDef2: ClassDef;
  class1Count: number;
  class2Count: number;
  classRecords: Class2Record[][];
}

/** Lookup types 3 to 9 are not read. */
export interface UnsupportedPos {
  error: string;
}

export type PairPosSubtable = PairPosFormat1 | PairPosFormat2;

export type GposSubtable = SinglePosFormat1 | SinglePosFormat2 | PairPosSubtable | UnsupportedPos;

export type GposTable = LayoutTable<GposSubtable>;

// subtableParsers[0] is unused.
const subtableParsers = new Array<ParseFn<GposSubtable | undefined> | undefined>(10);

subtableParsers[1] = function parseLookup1(this: Parser): GposSubtable | undefined {
  const start = this.offset + this.relativeOffset;
  const posformat = this.parseUShort();
  if (posformat === 1) {
    return {
      posFormat: 1,
      coverage: this.parsePointer(Parser.coverage) as Coverage,
      value: this.parseValueRecord(),
    };
  } else if (posformat === 2) {
    return {
      posFormat: 2,
      coverage: this.parsePointer(Parser.coverage) as Coverage,
      values: this.parseValueRecordList(),
    };
  }
  check.assert(false, "0x" + start.toString(16) + ": GPOS lookup type 1 format must be 1 or 2.");
};

subtableParsers[2] = function parseLookup2(this: Parser): PairPosSubtable | undefined {
  const start = this.offset + this.relativeOffset;
  const posFormat = this.parseUShort();
  check.assert(
    posFormat === 1 || posFormat === 2,
    "0x" + start.toString(16) + ": GPOS lookup type 2 format must be 1 or 2.",
  );
  const coverage = this.parsePointer(Parser.coverage) as Coverage;
  const valueFormat1 = this.parseUShort();
  const valueFormat2 = this.parseUShort();
  if (posFormat === 1) {
    return {
      posFormat: posFormat,
      coverage: coverage,
      valueFormat1: valueFormat1,
      valueFormat2: valueFormat2,
      pairSets: this.parseList(
        Parser.pointer(
          Parser.list(function (this: Parser): PairValueRecord {
            return {
              secondGlyph: this.parseUShort(),
              value1: this.parseValueRecord(valueFormat1),
              value2: this.parseValueRecord(valueFormat2),
            };
          }),
        ),
      ),
    };
  } else if (posFormat === 2) {
    const classDef1 = this.parsePointer(Parser.classDef) as ClassDef;
    const classDef2 = this.parsePointer(Parser.classDef) as ClassDef;
    const class1Count = this.parseUShort();
    const class2Count = this.parseUShort();
    return {
      posFormat: posFormat,
      coverage: coverage,
      valueFormat1: valueFormat1,
      valueFormat2: valueFormat2,
      classDef1: classDef1,
      classDef2: classDef2,
      class1Count: class1Count,
      class2Count: class2Count,
      classRecords: this.parseList(
        class1Count,
        Parser.list(class2Count, function (this: Parser): Class2Record {
          return {
            value1: this.parseValueRecord(valueFormat1),
            value2: this.parseValueRecord(valueFormat2),
          };
        }),
      ),
    };
  }
  return undefined;
};

for (let lookupType = 3; lookupType <= 9; lookupType++) {
  const error = "GPOS Lookup " + lookupType + " not supported";
  subtableParsers[lookupType] = function (): UnsupportedPos {
    return { error: error };
  };
}

/** Parses a GPOS table (version 1.0 or 1.1). */
export function parse(data: DataView, start?: number): GposTable {
  start = start || 0;
  const p = new Parser(data, start);
  const tableVersion = p.parseVersion(1);
  check.argument(
    tableVersion === 1 || tableVersion === 1.1,
    "Unsupported GPOS table version " + tableVersion,
  );
  const parsers = subtableParsers as ReadonlyArray<ParseFn<GposSubtable> | undefined>;
  if (tableVersion === 1) {
    return {
      version: tableVersion,
      scripts: p.parseScriptList(),
      features: p.parseFeatureList(),
      lookups: p.parseLookupList(parsers),
    };
  }
  return {
    version: tableVersion,
    scripts: p.parseScriptList(),
    features: p.parseFeatureList(),
    lookups: p.parseLookupList(parsers),
    variations: p.parseFeatureVariationsList(),
  };
}

// GPOS writing has no subtable makers: a table with lookups fails to encode.
const subtableMakers = new Array<((subtable: GposSubtable) => table.Table) | undefined>(10);

/** Builds a GPOS table for writing. */
export function make(gpos: GposTable): table.Table {
  return new table.Table("GPOS", [
    { name: "version", type: "ULONG", value: 0x10000 },
    { name: "scripts", type: "TABLE", value: new table.ScriptList(gpos.scripts) },
    {
      name: "features",
      type: "TABLE",
      value: new table.FeatureList(gpos.features as FeatureRecord[]),
    },
    {
      name: "lookups",
      type: "TABLE",
      value: new table.LookupList(
        gpos.lookups as table.WritableLookup<GposSubtable>[],
        subtableMakers,
      ),
    },
  ]);
}
