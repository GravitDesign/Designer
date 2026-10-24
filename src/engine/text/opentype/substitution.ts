// Old: chunk.vendor.js module 986 (opentype.js substitution.js).
// Gravit change: getFeature also answers locl (single substitutions) and
// numr / dnom (single substitutions plus alternates), which Font uses for
// localized forms and fractions.

import * as check from "./check.ts";
import type { Font } from "./font.ts";
import { Layout } from "./layout.ts";
import type { CoverageFormat1, LookupTable } from "./parse.ts";
import type {
  AlternateSubst,
  GsubSubtable,
  Ligature,
  LigatureSubst,
  SingleSubstFormat1,
  SingleSubstFormat2,
} from "./tables/gsub.ts";

/** A single substitution: glyph sub becomes glyph by. */
export interface SingleSubstitution {
  sub: number;
  by: number;
}

/** An alternate substitution: glyph sub can become any glyph of by. */
export interface AlternateSubstitution {
  sub: number;
  by: number[];
}

/** A ligature: the glyphs of sub become glyph by. */
export interface LigatureSubstitution {
  sub: number[];
  by: number;
}

export type FeatureSubstitution = SingleSubstitution | AlternateSubstitution | LigatureSubstitution;

/** Checks whether two arrays of primitives are equal. */
function arraysEqual(ar1: readonly number[], ar2: readonly number[]): boolean {
  const n = ar1.length;
  if (n !== ar2.length) {
    return false;
  }
  for (let i = 0; i < n; i++) {
    if (ar1[i] !== ar2[i]) {
      return false;
    }
  }
  return true;
}

/** The first subtable of the lookup with the format; adds defaultSubtable when there is none. */
function getSubstFormat<S extends GsubSubtable>(
  lookupTable: LookupTable<GsubSubtable>,
  format: number,
  defaultSubtable: S,
): S {
  const subtables = lookupTable.subtables;
  for (let i = 0; i < subtables.length; i++) {
    const subtable = subtables[i] as { substFormat: number };
    if (subtable.substFormat === format) {
      return subtable as S;
    }
  }
  subtables.push(defaultSubtable);
  return defaultSubtable;
}

/** Reads and edits the GSUB table. */
export class Substitution extends Layout<GsubSubtable> {
  constructor(font: Font) {
    super(font, "gsub");
  }

  /** All single substitutions (lookup type 1) of a feature. */
  getSingle(feature: string, script?: string, language?: string): SingleSubstitution[] {
    const substitutions: SingleSubstitution[] = [];
    const lookupTables = this.getLookupTables(script, language, feature, 1);
    for (let idx = 0; idx < lookupTables.length; idx++) {
      const subtables = (lookupTables[idx] as LookupTable<GsubSubtable>).subtables;
      for (let i = 0; i < subtables.length; i++) {
        const subtable = subtables[i] as SingleSubstFormat1 | SingleSubstFormat2;
        const glyphs = this.expandCoverage(subtable.coverage);
        let j: number;
        if (subtable.substFormat === 1) {
          const delta = subtable.deltaGlyphId;
          for (j = 0; j < glyphs.length; j++) {
            const glyph = glyphs[j] as number;
            substitutions.push({ sub: glyph, by: glyph + delta });
          }
        } else {
          const substitute = subtable.substitute;
          for (j = 0; j < glyphs.length; j++) {
            substitutions.push({ sub: glyphs[j] as number, by: substitute[j] as number });
          }
        }
      }
    }
    return substitutions;
  }

  /** All alternates (lookup type 3) of a feature. */
  getAlternates(feature: string, script?: string, language?: string): AlternateSubstitution[] {
    const alternates: AlternateSubstitution[] = [];
    const lookupTables = this.getLookupTables(script, language, feature, 3);
    for (let idx = 0; idx < lookupTables.length; idx++) {
      const subtables = (lookupTables[idx] as LookupTable<GsubSubtable>).subtables;
      for (let i = 0; i < subtables.length; i++) {
        const subtable = subtables[i] as AlternateSubst;
        const glyphs = this.expandCoverage(subtable.coverage);
        const alternateSets = subtable.alternateSets;
        for (let j = 0; j < glyphs.length; j++) {
          alternates.push({ sub: glyphs[j] as number, by: alternateSets[j] as number[] });
        }
      }
    }
    return alternates;
  }

  /** All ligatures (lookup type 4) of a feature, as { sub: [ids], by: id }. */
  getLigatures(feature: string, script?: string, language?: string): LigatureSubstitution[] {
    const ligatures: LigatureSubstitution[] = [];
    const lookupTables = this.getLookupTables(script, language, feature, 4);
    for (let idx = 0; idx < lookupTables.length; idx++) {
      const subtables = (lookupTables[idx] as LookupTable<GsubSubtable>).subtables;
      for (let i = 0; i < subtables.length; i++) {
        const subtable = subtables[i] as LigatureSubst;
        const glyphs = this.expandCoverage(subtable.coverage);
        const ligatureSets = subtable.ligatureSets;
        for (let j = 0; j < glyphs.length; j++) {
          const startGlyph = glyphs[j] as number;
          const ligSet = ligatureSets[j] as Ligature[];
          for (let k = 0; k < ligSet.length; k++) {
            const lig = ligSet[k] as Ligature;
            ligatures.push({
              sub: [startGlyph].concat(lig.components),
              by: lig.ligGlyph,
            });
          }
        }
      }
    }
    return ligatures;
  }

  /** Adds or changes a single substitution; always writes format 2. */
  addSingle(
    feature: string,
    substitution: SingleSubstitution,
    script?: string,
    language?: string,
  ): void {
    const lookupTable = this.getLookupTables(
      script,
      language,
      feature,
      1,
      true,
    )[0] as LookupTable<GsubSubtable>;
    const subtable = getSubstFormat<SingleSubstFormat2>(lookupTable, 2, {
      substFormat: 2,
      coverage: { format: 1, glyphs: [] },
      substitute: [],
    });
    check.assert(
      subtable.coverage.format === 1,
      "Ligature: unable to modify coverage table format " + subtable.coverage.format,
    );
    const coverage = subtable.coverage as CoverageFormat1;
    const coverageGlyph = substitution.sub;
    let pos = this.binSearch(coverage.glyphs, coverageGlyph);
    if (pos < 0) {
      pos = -1 - pos;
      coverage.glyphs.splice(pos, 0, coverageGlyph);
      subtable.substitute.splice(pos, 0, 0);
    }
    subtable.substitute[pos] = substitution.by;
  }

  /** Adds or changes an alternate substitution. */
  addAlternate(
    feature: string,
    substitution: AlternateSubstitution,
    script?: string,
    language?: string,
  ): void {
    const lookupTable = this.getLookupTables(
      script,
      language,
      feature,
      3,
      true,
    )[0] as LookupTable<GsubSubtable>;
    const subtable = getSubstFormat<AlternateSubst>(lookupTable, 1, {
      substFormat: 1,
      coverage: { format: 1, glyphs: [] },
      alternateSets: [],
    });
    check.assert(
      subtable.coverage.format === 1,
      "Ligature: unable to modify coverage table format " + subtable.coverage.format,
    );
    const coverage = subtable.coverage as CoverageFormat1;
    const coverageGlyph = substitution.sub;
    let pos = this.binSearch(coverage.glyphs, coverageGlyph);
    if (pos < 0) {
      pos = -1 - pos;
      coverage.glyphs.splice(pos, 0, coverageGlyph);
      // A 0 placeholder, replaced right below (as in opentype.js).
      subtable.alternateSets.splice(pos, 0, 0 as unknown as number[]);
    }
    subtable.alternateSets[pos] = substitution.by;
  }

  /** Adds a ligature unless it exists. Longer ligatures must come first to be found. */
  addLigature(
    feature: string,
    ligature: LigatureSubstitution,
    script?: string,
    language?: string,
  ): void {
    const lookupTable = this.getLookupTables(
      script,
      language,
      feature,
      4,
      true,
    )[0] as LookupTable<GsubSubtable>;
    let subtable = lookupTable.subtables[0] as LigatureSubst | undefined;
    if (!subtable) {
      subtable = {
        substFormat: 1,
        coverage: { format: 1, glyphs: [] },
        ligatureSets: [],
      };
      lookupTable.subtables[0] = subtable;
    }
    check.assert(
      subtable.coverage.format === 1,
      "Ligature: unable to modify coverage table format " + subtable.coverage.format,
    );
    const coverage = subtable.coverage as CoverageFormat1;
    const coverageGlyph = ligature.sub[0] as number;
    const ligComponents = ligature.sub.slice(1);
    const ligatureTable: Ligature = {
      ligGlyph: ligature.by,
      components: ligComponents,
    };
    let pos = this.binSearch(coverage.glyphs, coverageGlyph);
    if (pos >= 0) {
      const ligatureSet = subtable.ligatureSets[pos] as Ligature[];
      for (let i = 0; i < ligatureSet.length; i++) {
        if (arraysEqual((ligatureSet[i] as Ligature).components, ligComponents)) {
          return;
        }
      }
      ligatureSet.push(ligatureTable);
    } else {
      pos = -1 - pos;
      coverage.glyphs.splice(pos, 0, coverageGlyph);
      subtable.ligatureSets.splice(pos, 0, [ligatureTable]);
    }
  }

  /**
   * The substitutions of a feature for a script and language, or undefined
   * for a feature this doesn't read.
   */
  getFeature(
    feature: string,
    script?: string,
    language?: string,
  ): FeatureSubstitution[] | undefined {
    if (/ss\d\d/.test(feature)) {
      // ss01 - ss20
      return this.getSingle(feature, script, language);
    }
    // Gravit change: locl (localized forms) and numr / dnom (fractions).
    switch (feature) {
      case "locl":
        return this.getSingle(feature, script, language);
      case "aalt":
      case "salt":
      case "numr":
      case "dnom":
        return (this.getSingle(feature, script, language) as FeatureSubstitution[]).concat(
          this.getAlternates(feature, script, language),
        );
      case "dlig":
      case "liga":
      case "rlig":
        return this.getLigatures(feature, script, language);
    }
    return undefined;
  }

  /** Adds a substitution to a feature. */
  add(feature: string, sub: FeatureSubstitution, script?: string, language?: string): void {
    if (/ss\d\d/.test(feature)) {
      // ss01 - ss20
      return this.addSingle(feature, sub as SingleSubstitution, script, language);
    }
    switch (feature) {
      case "aalt":
      case "salt":
        if (typeof sub.by === "number") {
          return this.addSingle(feature, sub as SingleSubstitution, script, language);
        }
        return this.addAlternate(feature, sub as AlternateSubstitution, script, language);
      case "dlig":
      case "liga":
      case "rlig":
        return this.addLigature(feature, sub as LigatureSubstitution, script, language);
    }
    return undefined;
  }
}
