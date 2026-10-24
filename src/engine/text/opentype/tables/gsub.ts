// Old: chunk.vendor.js module 721 (opentype.js tables/gsub.js, unchanged).
// The GSUB table: ligatures, alternates and other glyph substitutions.
// https://www.microsoft.com/typography/OTSPEC/gsub.htm

import * as check from "../check.ts";
import type { LayoutTable } from "../layout.ts";
import { Parser } from "../parse.ts";
import type { ClassDef, Coverage, FeatureRecord, ParseFn } from "../parse.ts";
import * as table from "../table.ts";

export interface LookupRecord {
  sequenceIndex: number;
  lookupListIndex: number;
}

/** Lookup type 1, format 1: add deltaGlyphId to every covered glyph. */
export interface SingleSubstFormat1 {
  substFormat: 1;
  coverage: Coverage;
  deltaGlyphId: number;
}

/** Lookup type 1, format 2: one substitute per covered glyph. */
export interface SingleSubstFormat2 {
  substFormat: 2;
  coverage: Coverage;
  substitute: number[];
}

/** Lookup type 2. */
export interface MultipleSubst {
  substFormat: number;
  coverage: Coverage;
  sequences: (number[] | undefined)[];
}

/** Lookup type 3: a set of alternates per covered glyph. */
export interface AlternateSubst {
  substFormat: number;
  coverage: Coverage;
  alternateSets: (number[] | undefined)[];
}

export interface Ligature {
  ligGlyph: number;
  components: number[];
}

/** Lookup type 4: ligatures, one set per covered first glyph. */
export interface LigatureSubst {
  substFormat: number;
  coverage: Coverage;
  ligatureSets: (Ligature[] | undefined)[];
}

export interface ContextRule {
  input: number[];
  lookupRecords: LookupRecord[];
}

export interface ContextClassRule {
  classes: number[];
  lookupRecords: LookupRecord[];
}

/** Lookup type 5, formats 1 to 3. */
export type ContextSubst =
  | { substFormat: 1; coverage: Coverage; ruleSets: (ContextRule[] | undefined)[] }
  | {
      substFormat: 2;
      coverage: Coverage;
      classDef: ClassDef;
      classSets: (ContextClassRule[] | undefined)[];
    }
  | { substFormat: 3; coverages: (Coverage | undefined)[]; lookupRecords: LookupRecord[] };

export interface ChainRule {
  backtrack: number[];
  input: number[];
  lookahead: number[];
  lookupRecords: LookupRecord[];
}

/** Lookup type 6, formats 1 to 3. */
export type ChainContextSubst =
  | { substFormat: 1; coverage: Coverage; chainRuleSets: (ChainRule[] | undefined)[] }
  | {
      substFormat: 2;
      coverage: Coverage;
      backtrackClassDef: ClassDef;
      inputClassDef: ClassDef;
      lookaheadClassDef: ClassDef;
      chainClassSet: (ChainRule[] | undefined)[];
    }
  | {
      substFormat: 3;
      backtrackCoverage: (Coverage | undefined)[];
      inputCoverage: (Coverage | undefined)[];
      lookaheadCoverage: (Coverage | undefined)[];
      lookupRecords: LookupRecord[];
    };

/** Lookup type 7: wraps a subtable of another type behind a 32-bit offset. */
export interface ExtensionSubst {
  substFormat: 1;
  lookupType: number;
  extension: GsubSubtable | undefined;
}

/** Lookup type 8. */
export interface ReverseChainSingleSubst {
  substFormat: number;
  coverage: Coverage;
  backtrackCoverage: (Coverage | undefined)[];
  lookaheadCoverage: (Coverage | undefined)[];
  substitutes: number[];
}

/** Any GSUB subtable; which one depends on the lookup type and substFormat. */
export type GsubSubtable =
  | SingleSubstFormat1
  | SingleSubstFormat2
  | MultipleSubst
  | AlternateSubst
  | LigatureSubst
  | ContextSubst
  | ChainContextSubst
  | ExtensionSubst
  | ReverseChainSingleSubst;

export type GsubTable = LayoutTable<GsubSubtable>;

// subtableParsers[0] is unused. A parser that falls through check.assert
// returns undefined.
const subtableParsers = new Array<ParseFn<GsubSubtable | undefined> | undefined>(9);

subtableParsers[1] = function parseLookup1(this: Parser): GsubSubtable | undefined {
  const start = this.offset + this.relativeOffset;
  const substFormat = this.parseUShort();
  if (substFormat === 1) {
    return {
      substFormat: 1,
      coverage: this.parsePointer(Parser.coverage) as Coverage,
      deltaGlyphId: this.parseUShort(),
    };
  } else if (substFormat === 2) {
    return {
      substFormat: 2,
      coverage: this.parsePointer(Parser.coverage) as Coverage,
      substitute: this.parseOffset16List(),
    };
  }
  check.assert(false, "0x" + start.toString(16) + ": lookup type 1 format must be 1 or 2.");
};

subtableParsers[2] = function parseLookup2(this: Parser): MultipleSubst {
  const substFormat = this.parseUShort();
  check.argument(
    substFormat === 1,
    "GSUB Multiple Substitution Subtable identifier-format must be 1",
  );
  return {
    substFormat: substFormat,
    coverage: this.parsePointer(Parser.coverage) as Coverage,
    sequences: this.parseListOfLists(),
  };
};

subtableParsers[3] = function parseLookup3(this: Parser): AlternateSubst {
  const substFormat = this.parseUShort();
  check.argument(
    substFormat === 1,
    "GSUB Alternate Substitution Subtable identifier-format must be 1",
  );
  return {
    substFormat: substFormat,
    coverage: this.parsePointer(Parser.coverage) as Coverage,
    alternateSets: this.parseListOfLists(),
  };
};

subtableParsers[4] = function parseLookup4(this: Parser): LigatureSubst {
  const substFormat = this.parseUShort();
  check.argument(substFormat === 1, "GSUB ligature table identifier-format must be 1");
  return {
    substFormat: substFormat,
    coverage: this.parsePointer(Parser.coverage) as Coverage,
    ligatureSets: this.parseListOfLists(function (this: Parser): Ligature {
      return {
        ligGlyph: this.parseUShort(),
        components: this.parseUShortList(this.parseUShort() - 1),
      };
    }),
  };
};

const lookupRecordDesc = {
  sequenceIndex: Parser.uShort,
  lookupListIndex: Parser.uShort,
};

subtableParsers[5] = function parseLookup5(this: Parser): ContextSubst | undefined {
  const start = this.offset + this.relativeOffset;
  const substFormat = this.parseUShort();

  if (substFormat === 1) {
    return {
      substFormat: substFormat,
      coverage: this.parsePointer(Parser.coverage) as Coverage,
      ruleSets: this.parseListOfLists(function (this: Parser): ContextRule {
        const glyphCount = this.parseUShort();
        const substCount = this.parseUShort();
        return {
          input: this.parseUShortList(glyphCount - 1),
          lookupRecords: this.parseRecordList(substCount, lookupRecordDesc),
        };
      }),
    };
  } else if (substFormat === 2) {
    return {
      substFormat: substFormat,
      coverage: this.parsePointer(Parser.coverage) as Coverage,
      classDef: this.parsePointer(Parser.classDef) as ClassDef,
      classSets: this.parseListOfLists(function (this: Parser): ContextClassRule {
        const glyphCount = this.parseUShort();
        const substCount = this.parseUShort();
        return {
          classes: this.parseUShortList(glyphCount - 1),
          lookupRecords: this.parseRecordList(substCount, lookupRecordDesc),
        };
      }),
    };
  } else if (substFormat === 3) {
    const glyphCount = this.parseUShort();
    const substCount = this.parseUShort();
    return {
      substFormat: substFormat,
      coverages: this.parseList(glyphCount, Parser.pointer(Parser.coverage)),
      lookupRecords: this.parseRecordList(substCount, lookupRecordDesc),
    };
  }
  check.assert(false, "0x" + start.toString(16) + ": lookup type 5 format must be 1, 2 or 3.");
};

function parseChainRule(this: Parser): ChainRule {
  return {
    backtrack: this.parseUShortList(),
    input: this.parseUShortList(this.parseShort() - 1),
    lookahead: this.parseUShortList(),
    lookupRecords: this.parseRecordList(lookupRecordDesc),
  };
}

subtableParsers[6] = function parseLookup6(this: Parser): ChainContextSubst | undefined {
  const start = this.offset + this.relativeOffset;
  const substFormat = this.parseUShort();
  if (substFormat === 1) {
    return {
      substFormat: 1,
      coverage: this.parsePointer(Parser.coverage) as Coverage,
      chainRuleSets: this.parseListOfLists(parseChainRule),
    };
  } else if (substFormat === 2) {
    return {
      substFormat: 2,
      coverage: this.parsePointer(Parser.coverage) as Coverage,
      backtrackClassDef: this.parsePointer(Parser.classDef) as ClassDef,
      inputClassDef: this.parsePointer(Parser.classDef) as ClassDef,
      lookaheadClassDef: this.parsePointer(Parser.classDef) as ClassDef,
      chainClassSet: this.parseListOfLists(parseChainRule),
    };
  } else if (substFormat === 3) {
    return {
      substFormat: 3,
      backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
      inputCoverage: this.parseList(Parser.pointer(Parser.coverage)),
      lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
      lookupRecords: this.parseRecordList(lookupRecordDesc),
    };
  }
  check.assert(false, "0x" + start.toString(16) + ": lookup type 6 format must be 1, 2 or 3.");
};

subtableParsers[7] = function parseLookup7(this: Parser): ExtensionSubst {
  const substFormat = this.parseUShort();
  check.argument(
    substFormat === 1,
    "GSUB Extension Substitution subtable identifier-format must be 1",
  );
  const extensionLookupType = this.parseUShort();
  const extensionParser = new Parser(this.data, this.offset + this.parseULong());
  return {
    substFormat: 1,
    lookupType: extensionLookupType,
    extension: (subtableParsers[extensionLookupType] as ParseFn<GsubSubtable | undefined>).call(
      extensionParser,
    ),
  };
};

subtableParsers[8] = function parseLookup8(this: Parser): ReverseChainSingleSubst {
  const substFormat = this.parseUShort();
  check.argument(
    substFormat === 1,
    "GSUB Reverse Chaining Contextual Single Substitution Subtable identifier-format must be 1",
  );
  return {
    substFormat: substFormat,
    coverage: this.parsePointer(Parser.coverage) as Coverage,
    backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
    lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
    substitutes: this.parseUShortList(),
  };
};

/** Parses a GSUB table (version 1.0 or 1.1). */
export function parse(data: DataView, start?: number): GsubTable {
  start = start || 0;
  const p = new Parser(data, start);
  const tableVersion = p.parseVersion(1);
  check.argument(tableVersion === 1 || tableVersion === 1.1, "Unsupported GSUB table version.");
  // Subtables that failed check.assert (it throws) never get here, so the
  // lookups hold GsubSubtable values.
  const parsers = subtableParsers as ReadonlyArray<ParseFn<GsubSubtable> | undefined>;
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

// GSUB writing: lookup types 1, 3 and 4 only.

type SubtableMaker = (subtable: GsubSubtable) => table.Table;

const subtableMakers = new Array<SubtableMaker | undefined>(9);

subtableMakers[1] = function makeLookup1(subtable: GsubSubtable): table.Table {
  const single = subtable as SingleSubstFormat1 | SingleSubstFormat2;
  if (single.substFormat === 1) {
    return new table.Table("substitutionTable", [
      { name: "substFormat", type: "USHORT", value: 1 },
      { name: "coverage", type: "TABLE", value: new table.Coverage(single.coverage) },
      { name: "deltaGlyphID", type: "USHORT", value: single.deltaGlyphId },
    ]);
  }
  const fields: table.Field[] = [
    { name: "substFormat", type: "USHORT", value: 2 },
    { name: "coverage", type: "TABLE", value: new table.Coverage(single.coverage) },
  ];
  return new table.Table(
    "substitutionTable",
    fields.concat(table.ushortList("substitute", single.substitute)),
  );
};

subtableMakers[3] = function makeLookup3(subtable: GsubSubtable): table.Table {
  const alternate = subtable as AlternateSubst;
  check.assert(alternate.substFormat === 1, "Lookup type 3 substFormat must be 1.");
  const fields: table.Field[] = [
    { name: "substFormat", type: "USHORT", value: 1 },
    { name: "coverage", type: "TABLE", value: new table.Coverage(alternate.coverage) },
  ];
  return new table.Table(
    "substitutionTable",
    fields.concat(
      table.tableList(
        "altSet",
        alternate.alternateSets as number[][],
        function (alternateSet: number[]) {
          return new table.Table("alternateSetTable", table.ushortList("alternate", alternateSet));
        },
      ),
    ),
  );
};

subtableMakers[4] = function makeLookup4(subtable: GsubSubtable): table.Table {
  const ligatures = subtable as LigatureSubst;
  check.assert(ligatures.substFormat === 1, "Lookup type 4 substFormat must be 1.");
  const fields: table.Field[] = [
    { name: "substFormat", type: "USHORT", value: 1 },
    { name: "coverage", type: "TABLE", value: new table.Coverage(ligatures.coverage) },
  ];
  return new table.Table(
    "substitutionTable",
    fields.concat(
      table.tableList(
        "ligSet",
        ligatures.ligatureSets as Ligature[][],
        function (ligatureSet: Ligature[]) {
          return new table.Table(
            "ligatureSetTable",
            table.tableList("ligature", ligatureSet, function (ligature: Ligature) {
              return new table.Table(
                "ligatureTable",
                (
                  [{ name: "ligGlyph", type: "USHORT", value: ligature.ligGlyph }] as table.Field[]
                ).concat(
                  table.ushortList(
                    "component",
                    ligature.components,
                    ligature.components.length + 1,
                  ),
                ),
              );
            }),
          );
        },
      ),
    ),
  );
};

/** Builds a GSUB table for writing. */
export function make(gsub: GsubTable): table.Table {
  return new table.Table("GSUB", [
    { name: "version", type: "ULONG", value: 0x10000 },
    { name: "scripts", type: "TABLE", value: new table.ScriptList(gsub.scripts) },
    {
      name: "features",
      type: "TABLE",
      value: new table.FeatureList(gsub.features as FeatureRecord[]),
    },
    {
      name: "lookups",
      type: "TABLE",
      value: new table.LookupList(
        gsub.lookups as table.WritableLookup<GsubSubtable>[],
        subtableMakers,
      ),
    },
  ]);
}
