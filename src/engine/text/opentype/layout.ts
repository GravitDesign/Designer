// Old: chunk.vendor.js module 723 (opentype.js layout.js).
// Gravit changes:
// - getTable gives a table without scripts an empty scripts list.
// - getLangSysTags lists the language system tags of a script.
//
// In opentype.js Position and Substitution share Layout's prototype object,
// so every layout object has every method. The port uses subclasses; only
// createDefaultTable (defined by Substitution in the old code) lives here,
// since getTable(true) on any layout object reaches it.

import * as check from "./check.ts";
import type { Font } from "./font.ts";
import type {
  ClassDef,
  ClassRange,
  Coverage,
  CoverageRange,
  FeatureTable,
  FeatureVariationRecord,
  LangSysTable,
  LookupTable,
  ScriptRecord,
  ScriptTable,
} from "./parse.ts";

/** A feature table created by getFeatureTable(..., true); it has `params`, not `featureParams`. */
export interface CreatedFeatureTable {
  params: number;
  lookupListIndexes: number[];
}

export type LayoutFeature = FeatureTable | CreatedFeatureTable;

export interface LayoutFeatureRecord {
  tag: string;
  feature: LayoutFeature | undefined;
}

/** A parsed (or created) GSUB or GPOS table. */
export interface LayoutTable<Subtable> {
  version: number;
  scripts: ScriptRecord[];
  features: LayoutFeatureRecord[];
  lookups: LookupTable<Subtable>[];
  variations?: FeatureVariationRecord[];
}

interface Tagged {
  tag: string;
}

/** Binary search by tag. Not found: -1 - insertion point. */
function searchTag(arr: readonly Tagged[], tag: string): number {
  let imin = 0;
  let imax = arr.length - 1;
  while (imin <= imax) {
    const imid = (imin + imax) >>> 1;
    const val = (arr[imid] as Tagged).tag;
    if (val === tag) {
      return imid;
    } else if (val < tag) {
      imin = imid + 1;
    } else {
      imax = imid - 1;
    }
  }
  return -imin - 1;
}

/** Binary search in a sorted list of numbers. Not found: -1 - insertion point. */
function binSearch(arr: readonly number[], value: number): number {
  let imin = 0;
  let imax = arr.length - 1;
  while (imin <= imax) {
    const imid = (imin + imax) >>> 1;
    const val = arr[imid] as number;
    if (val === value) {
      return imid;
    } else if (val < value) {
      imin = imid + 1;
    } else {
      imax = imid - 1;
    }
  }
  return -imin - 1;
}

/**
 * Binary search in a list of ranges (coverage, class definition). Returns
 * the range holding the value, 0 when the value is past the range before
 * it, undefined when it is before the first range.
 */
function searchRange<R extends { start: number; end: number }>(
  ranges: readonly R[],
  value: number,
): R | 0 | undefined {
  let range: R;
  let imin = 0;
  let imax = ranges.length - 1;
  while (imin <= imax) {
    const imid = (imin + imax) >>> 1;
    range = ranges[imid] as R;
    const start = range.start;
    if (start === value) {
      return range;
    } else if (start < value) {
      imin = imid + 1;
    } else {
      imax = imid - 1;
    }
  }
  if (imin > 0) {
    range = ranges[imin - 1] as R;
    if (value > range.end) return 0;
    return range;
  }
  return undefined;
}

/** Helpers shared by the GSUB (Substitution) and GPOS (Position) objects. */
export class Layout<Subtable> {
  font: Font;
  tableName: "gsub" | "gpos";

  constructor(font: Font, tableName: "gsub" | "gpos") {
    this.font = font;
    this.tableName = tableName;
  }

  searchTag(arr: readonly Tagged[], tag: string): number {
    return searchTag(arr, tag);
  }

  binSearch(arr: readonly number[], value: number): number {
    return binSearch(arr, value);
  }

  /** The layout table of the font, created when missing and create is set. */
  getTable(create?: boolean): LayoutTable<Subtable> | undefined {
    const tables = this.font.tables as Record<string, unknown>;
    let layout = tables[this.tableName] as LayoutTable<Subtable> | undefined;
    // Gravit change: a table without scripts gets an empty list.
    if (layout && !layout.scripts) layout.scripts = [];
    if (!layout && create) {
      layout = tables[this.tableName] = this.createDefaultTable() as LayoutTable<Subtable>;
    }
    return layout;
  }

  /**
   * An empty table with a DFLT script and default language system. In the
   * old code this comes from Substitution, which shares the prototype with
   * Position, so a created GPOS table looks the same.
   */
  createDefaultTable(): LayoutTable<unknown> {
    return {
      version: 1,
      scripts: [
        {
          tag: "DFLT",
          script: {
            defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [] },
            langSysRecords: [],
          },
        },
      ],
      features: [],
      lookups: [],
    };
  }

  getScriptNames(): string[] {
    const layout = this.getTable();
    if (!layout) {
      return [];
    }
    return layout.scripts.map(function (script) {
      return script.tag;
    });
  }

  /** DFLT if the table has it, else latn if it has that, else undefined. */
  getDefaultScriptName(): string | undefined {
    const layout = this.getTable();
    if (!layout) {
      return undefined;
    }
    let hasLatn = false;
    for (let i = 0; i < layout.scripts.length; i++) {
      const name = (layout.scripts[i] as ScriptRecord).tag;
      if (name === "DFLT") return name;
      if (name === "latn") hasLatn = true;
    }
    return hasLatn ? "latn" : undefined;
  }

  /** The script table (default DFLT), created when missing and create is set. */
  getScriptTable(script?: string, create?: boolean): ScriptTable | undefined {
    const layout = this.getTable(create);
    if (layout) {
      script = script || "DFLT";
      const scripts = layout.scripts;
      const pos = searchTag(layout.scripts, script);
      if (pos >= 0) {
        return (scripts[pos] as ScriptRecord).script;
      } else if (create) {
        const scr = {
          tag: script,
          script: {
            defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [] },
            langSysRecords: [],
          },
        };
        scripts.splice(-1 - pos, 0, scr);
        return scr.script;
      }
    }
    return undefined;
  }

  /** Gravit change: the language system tags of a script, [] when there are none. */
  getLangSysTags(script?: string): string[] {
    const scriptTable = this.getScriptTable(script, false);
    return scriptTable && scriptTable.langSysRecords
      ? scriptTable.langSysRecords.map(function (record) {
          return record.tag;
        })
      : [];
  }

  /** A language system table (default dflt), created when missing and create is set. */
  getLangSysTable(script?: string, language?: string, create?: boolean): LangSysTable | undefined {
    const scriptTable = this.getScriptTable(script, create);
    if (scriptTable) {
      if (!language || language === "dflt" || language === "DFLT") {
        return scriptTable.defaultLangSys;
      }
      const pos = searchTag(scriptTable.langSysRecords, language);
      if (pos >= 0) {
        return (scriptTable.langSysRecords[pos] as { langSys: LangSysTable | undefined }).langSys;
      } else if (create) {
        const langSysRecord = {
          tag: language,
          langSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [] },
        };
        scriptTable.langSysRecords.splice(-1 - pos, 0, langSysRecord);
        return langSysRecord.langSys;
      }
    }
    return undefined;
  }

  /** A feature table, created when missing and create is set. */
  getFeatureTable(
    script: string | undefined,
    language: string | undefined,
    feature: string,
    create?: boolean,
  ): LayoutFeature | undefined {
    const langSysTable = this.getLangSysTable(script, language, create);
    if (langSysTable) {
      let featureRecord: LayoutFeatureRecord;
      const featIndexes = langSysTable.featureIndexes;
      const allFeatures = (this.font.tables[this.tableName] as LayoutTable<Subtable>).features;
      // The feature indexes are in arbitrary order.
      for (let i = 0; i < featIndexes.length; i++) {
        featureRecord = allFeatures[featIndexes[i] as number] as LayoutFeatureRecord;
        if (featureRecord.tag === feature) {
          return featureRecord.feature;
        }
      }
      if (create) {
        const index = allFeatures.length;
        // Sorting the features would mean renumbering the indexes in the script list.
        check.assert(
          index === 0 || feature >= (allFeatures[index - 1] as LayoutFeatureRecord).tag,
          "Features must be added in alphabetical order.",
        );
        featureRecord = {
          tag: feature,
          feature: { params: 0, lookupListIndexes: [] },
        };
        allFeatures.push(featureRecord);
        featIndexes.push(index);
        return featureRecord.feature;
      }
    }
    return undefined;
  }

  /**
   * The lookup tables of a type for a script, language and feature. With
   * create, a missing lookup is added (without subtables).
   */
  getLookupTables(
    script: string | undefined,
    language: string | undefined,
    feature: string,
    lookupType: number,
    create?: boolean,
  ): LookupTable<Subtable>[] {
    const featureTable = this.getFeatureTable(script, language, feature, create);
    const tables: LookupTable<Subtable>[] = [];
    if (featureTable) {
      let lookupTable: LookupTable<Subtable>;
      const lookupListIndexes = featureTable.lookupListIndexes;
      const allLookups = (this.font.tables[this.tableName] as LayoutTable<Subtable>).lookups;
      for (let i = 0; i < lookupListIndexes.length; i++) {
        lookupTable = allLookups[lookupListIndexes[i] as number] as LookupTable<Subtable>;
        if (lookupTable.lookupType === lookupType) {
          tables.push(lookupTable);
        }
      }
      if (tables.length === 0 && create) {
        lookupTable = {
          lookupType: lookupType,
          lookupFlag: 0,
          subtables: [],
          markFilteringSet: undefined,
        };
        const index = allLookups.length;
        allLookups.push(lookupTable);
        lookupListIndexes.push(index);
        return [lookupTable];
      }
    }
    return tables;
  }

  /** The class of a glyph in a class definition table; 0 when it has none. */
  getGlyphClass(classDefTable: ClassDef, glyphIndex: number): number | undefined {
    switch (classDefTable.format) {
      case 1:
        if (
          classDefTable.startGlyph <= glyphIndex &&
          glyphIndex < classDefTable.startGlyph + classDefTable.classes.length
        ) {
          return classDefTable.classes[glyphIndex - classDefTable.startGlyph];
        }
        return 0;
      case 2: {
        const range = searchRange<ClassRange>(classDefTable.ranges, glyphIndex);
        return range ? range.classId : 0;
      }
    }
    return undefined;
  }

  /** The coverage index of a glyph, -1 when not covered. */
  getCoverageIndex(coverageTable: Coverage, glyphIndex: number): number | undefined {
    switch (coverageTable.format) {
      case 1: {
        const index = binSearch(coverageTable.glyphs, glyphIndex);
        return index >= 0 ? index : -1;
      }
      case 2: {
        const range = searchRange<CoverageRange>(coverageTable.ranges, glyphIndex);
        return range ? range.index + glyphIndex - range.start : -1;
      }
    }
    return undefined;
  }

  /** The glyph indexes a coverage table covers. Format 1 returns its own list. */
  expandCoverage(coverageTable: Coverage): number[] {
    if (coverageTable.format === 1) {
      return coverageTable.glyphs;
    }
    const glyphs: number[] = [];
    const ranges = coverageTable.ranges;
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i] as CoverageRange;
      const start = range.start;
      const end = range.end;
      for (let j = start; j <= end; j++) {
        glyphs.push(j);
      }
    }
    return glyphs;
  }
}
