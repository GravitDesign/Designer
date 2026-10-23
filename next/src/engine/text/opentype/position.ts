// Old: chunk.vendor.js module 985 (opentype.js position.js, unchanged).

import type { Font } from "./font.ts";
import { Layout } from "./layout.ts";
import type { LookupTable } from "./parse.ts";
import type {
  Class2Record,
  GposSubtable,
  PairPosSubtable,
  PairValueRecord,
} from "./tables/gpos.ts";

export type KerningLookups = LookupTable<GposSubtable>[];

/** Helpers for the GPOS table, mainly kerning. */
export class Position extends Layout<GposSubtable> {
  /** The kern lookups of the default script, set by init(). */
  declare defaultKerningTables: KerningLookups | undefined;

  constructor(font: Font) {
    super(font, "gpos");
  }

  /** Caches the kerning lookups of the default script. */
  init(): void {
    const script = this.getDefaultScriptName();
    this.defaultKerningTables = this.getKerningTables(script);
  }

  /**
   * The xAdvance of the first pair adjustment (lookup type 2) that has the
   * pair, 0 when none has it.
   */
  getKerningValue(kerningLookups: KerningLookups, leftIndex: number, rightIndex: number): number {
    for (let i = 0; i < kerningLookups.length; i++) {
      const subtables = (kerningLookups[i] as LookupTable<GposSubtable>).subtables;
      for (let j = 0; j < subtables.length; j++) {
        const subtable = subtables[j] as PairPosSubtable;
        const covIndex = this.getCoverageIndex(subtable.coverage, leftIndex) as number;
        if (covIndex < 0) continue;
        switch (subtable.posFormat) {
          case 1: {
            const pairSet = subtable.pairSets[covIndex] as PairValueRecord[];
            for (let k = 0; k < pairSet.length; k++) {
              const pair = pairSet[k] as PairValueRecord;
              if (pair.secondGlyph === rightIndex) {
                return (pair.value1 && pair.value1.xAdvance) || 0;
              }
            }
            // Left glyph found but not the right one: try the next subtable.
            break;
          }
          case 2: {
            const class1 = this.getGlyphClass(subtable.classDef1, leftIndex) as number;
            const class2 = this.getGlyphClass(subtable.classDef2, rightIndex) as number;
            const pair = (subtable.classRecords[class1] as Class2Record[])[class2] as Class2Record;
            return (pair.value1 && pair.value1.xAdvance) || 0;
          }
        }
      }
    }
    return 0;
  }

  /**
   * The kern lookups for a script and language: [] when there are none,
   * undefined when the font has no GPOS table (then the kern table applies).
   */
  getKerningTables(script?: string, language?: string): KerningLookups | undefined {
    if (this.font.tables.gpos) {
      return this.getLookupTables(script, language, "kern", 2);
    }
    return undefined;
  }
}
