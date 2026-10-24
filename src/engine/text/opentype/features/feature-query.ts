// Old: chunk.vendor.js module 993 (opentype.js features/featureQuery.js, unchanged).
// Looks up GSUB features of a script and applies their lookups to tokens;
// only single substitution format 2, chaining context format 3 and
// ligature format 1 are handled. Used for the arabic forms in bidi.ts.

import { isTashkeelArabicChar } from "../char.ts";
import type { Font } from "../font.ts";
import type { LayoutFeatureRecord } from "../layout.ts";
import type { Coverage as CoverageTable, LookupTable as GsubLookupTable } from "../parse.ts";
import type {
  ChainContextSubst,
  GsubSubtable,
  Ligature,
  SingleSubstFormat2,
} from "../tables/gsub.ts";
import { ContextParams } from "../tokenizer.ts";
import type { Token, TokenValue } from "../tokenizer.ts";

type GsubLookups = GsubLookupTable<GsubSubtable>[];

/**
 * A substitution found by a lookup. id is lookup type and format: 12 single
 * substitution format 2 (glyph indexes), 63 chaining context format 3
 * (nested substitutions), 41 ligature format 1 (ligatures).
 */
export type SubstitutionResult =
  | { id: 12; substitution: number[] }
  | { id: 63; substitution: SubstitutionResult[] }
  | { id: 41; substitution: Ligature[] };

export interface FeatureQueryInput {
  tag: string;
  script: string;
}

// The text base direction, shared by all queries: a FeatureQuery created
// with a direction changes it for every later ligature lookup.
let BASE_DIR = "ltr";

/** The value a token currently has; for a ligature its first glyph. */
function currentGlyph(contextParams: ContextParams<Token>): number | null {
  const value = (contextParams.current.activeState as { value: TokenValue }).value;
  return (Array.isArray(value) ? value[0] : value) as number | null;
}

/** A coverage table lookup. */
class Coverage {
  table: CoverageTable;

  constructor(coverageTable: CoverageTable) {
    this.table = coverageTable;
  }

  /** The coverage index of the glyph, -1 when not covered. Glyph 0 (or none) is never covered. */
  lookup(glyphIndex: number | null | undefined): number {
    if (!glyphIndex) return -1;
    switch (this.table.format) {
      case 1:
        return this.table.glyphs.indexOf(glyphIndex);
      case 2: {
        const ranges = this.table.ranges;
        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i] as { start: number; end: number; index: number };
          if (glyphIndex >= range.start && glyphIndex <= range.end) {
            const offset = glyphIndex - range.start;
            return range.index + offset;
          }
        }
        break;
      }
      default:
        return -1;
    }
    return -1;
  }
}

/** A ligature set lookup. */
class LigatureSets {
  ligatureSets: (Ligature[] | undefined)[];

  constructor(ligatureSets: (Ligature[] | undefined)[]) {
    this.ligatureSets = ligatureSets;
  }

  /** The first ligature whose components follow the current token. */
  lookup(contextParams: ContextParams<Token>, ligSetIndex: number): Ligature | null {
    const ligatureSet = this.ligatureSets[ligSetIndex] as Ligature[];
    const matchComponents = (components: number[], indexes: TokenValue[]): boolean | null => {
      if (components.length > indexes.length) return null;
      for (let c = 0; c < components.length; c++) {
        if (components[c] !== indexes[c]) return false;
      }
      return true;
    };
    for (let s = 0; s < ligatureSet.length; s++) {
      const ligSetItem = ligatureSet[s] as Ligature;
      const lookaheadIndexes = contextParams.lookahead.map(
        (token) => (token.activeState as { value: TokenValue }).value,
      );
      if (BASE_DIR === "rtl") lookaheadIndexes.reverse();
      if (matchComponents(ligSetItem.components, lookaheadIndexes)) return ligSetItem;
    }
    return null;
  }
}

/** One GSUB subtable, ready to look up tokens. */
class Substitution {
  lookups: GsubLookups;
  subtable: GsubSubtable;
  lookupTable: GsubLookupTable<GsubSubtable>;
  coverage?: Coverage;
  inputCoverage?: Coverage[];
  backtrackCoverage?: Coverage[];
  lookaheadCoverage?: Coverage[];
  ligatureSets?: LigatureSets;

  constructor(
    lookups: GsubLookups,
    lookupTable: GsubLookupTable<GsubSubtable>,
    subtable: GsubSubtable,
  ) {
    this.lookups = lookups;
    this.subtable = subtable;
    this.lookupTable = lookupTable;
    const fields = subtable as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(subtable, "coverage")) {
      this.coverage = new Coverage(fields.coverage as CoverageTable);
    }
    if (Object.prototype.hasOwnProperty.call(subtable, "inputCoverage")) {
      this.inputCoverage = (fields.inputCoverage as CoverageTable[]).map(
        (table) => new Coverage(table),
      );
    }
    if (Object.prototype.hasOwnProperty.call(subtable, "backtrackCoverage")) {
      this.backtrackCoverage = (fields.backtrackCoverage as CoverageTable[]).map(
        (table) => new Coverage(table),
      );
    }
    if (Object.prototype.hasOwnProperty.call(subtable, "lookaheadCoverage")) {
      this.lookaheadCoverage = (fields.lookaheadCoverage as CoverageTable[]).map(
        (table) => new Coverage(table),
      );
    }
    if (Object.prototype.hasOwnProperty.call(subtable, "ligatureSets")) {
      this.ligatureSets = new LigatureSets(fields.ligatureSets as (Ligature[] | undefined)[]);
    }
  }

  /** The substitutions this subtable makes for the current token. */
  lookup(contextParams: ContextParams<Token>): SubstitutionResult[] {
    const substitutions: SubstitutionResult[] = [];
    const lookupType = this.lookupTable.lookupType;
    const substFormat = (this.subtable as { substFormat: number }).substFormat;
    if (lookupType === 1 && substFormat === 2) {
      const substitution = singleSubstitutionFormat2.call(this, contextParams);
      if (substitution.length > 0) {
        substitutions.push({ id: 12, substitution: substitution });
      }
    }
    if (lookupType === 6 && substFormat === 3) {
      const substitution = chainingSubstitutionFormat3.call(this, contextParams);
      if (substitution.length > 0) {
        substitutions.push({ id: 63, substitution: substitution });
      }
    }
    if (lookupType === 4 && substFormat === 1) {
      const substitution = ligatureSubstitutionFormat1.call(this, contextParams);
      if (substitution.length > 0) {
        substitutions.push({ id: 41, substitution: substitution });
      }
    }
    return substitutions;
  }
}

/** A GSUB lookup table, ready to look up tokens. */
class LookupTable {
  index: number;
  subtables: Substitution[];

  constructor(index: number, lookups: GsubLookups) {
    this.index = index;
    const lookupTable = lookups[index] as GsubLookupTable<GsubSubtable>;
    this.subtables = lookupTable.subtables.map(
      (subtable) => new Substitution(lookups, lookupTable, subtable as GsubSubtable),
    );
  }

  lookup(contextParams: ContextParams<Token>): SubstitutionResult[] {
    let substitutions: SubstitutionResult[] = [];
    for (let i = 0; i < this.subtables.length; i++) {
      const substitution = (this.subtables[i] as Substitution).lookup(contextParams);
      // Always true in opentype.js too (an array is never null).
      substitutions = substitutions.concat(substitution);
    }
    return substitutions;
  }
}

class FeatureLookups {
  lookups: LookupTable[];

  constructor(lookups: GsubLookups, lookupListIndexes: number[]) {
    this.lookups = lookupListIndexes.map((index) => new LookupTable(index, lookups));
  }
}

function singleSubstitutionFormat2(
  this: Substitution,
  contextParams: ContextParams<Token>,
): number[] {
  const glyphIndex = currentGlyph(contextParams);
  const substituteIndex = (this.coverage as Coverage).lookup(glyphIndex);
  if (substituteIndex === -1) return [];
  return [(this.subtable as SingleSubstFormat2).substitute[substituteIndex] as number];
}

/** The coverage index of the current token in each coverage table, -1 unless all match. */
function lookupCoverageList(
  coverageList: Coverage[],
  contextParams: ContextParams<Token>,
): number[] | -1 {
  const lookupList: number[] = [];
  for (let i = 0; i < coverageList.length; i++) {
    const coverage = coverageList[i] as Coverage;
    const glyphIndex = currentGlyph(contextParams);
    const lookupIndex = coverage.lookup(glyphIndex);
    if (lookupIndex !== -1) {
      lookupList.push(lookupIndex);
    }
  }
  if (lookupList.length !== coverageList.length) return -1;
  return lookupList;
}

function chainingSubstitutionFormat3(
  this: Substitution,
  contextParams: ContextParams<Token>,
): SubstitutionResult[] {
  const inputCoverage = this.inputCoverage as Coverage[];
  const lookaheadCoverage = this.lookaheadCoverage as Coverage[];
  const backtrackCoverage = this.backtrackCoverage as Coverage[];
  const lookupsCount = inputCoverage.length + lookaheadCoverage.length + backtrackCoverage.length;
  if (contextParams.context.length < lookupsCount) return [];
  const inputLookups = lookupCoverageList(inputCoverage, contextParams);
  if (inputLookups === -1) return [];
  const lookaheadOffset = inputCoverage.length - 1;
  if (contextParams.lookahead.length < lookaheadCoverage.length) return [];
  const lookaheadContext = contextParams.lookahead.slice(lookaheadOffset);
  while (lookaheadContext.length && isTashkeelArabicChar((lookaheadContext[0] as Token).char)) {
    lookaheadContext.shift();
  }
  const lookaheadParams = new ContextParams(lookaheadContext, 0);
  const lookaheadLookups = lookupCoverageList(lookaheadCoverage, lookaheadParams);
  const backtrackContext = ([] as Token[]).concat(contextParams.backtrack);
  backtrackContext.reverse();
  while (backtrackContext.length && isTashkeelArabicChar((backtrackContext[0] as Token).char)) {
    backtrackContext.shift();
  }
  if (backtrackContext.length < backtrackCoverage.length) return [];
  const backtrackParams = new ContextParams(backtrackContext, 0);
  const backtrackLookups = lookupCoverageList(backtrackCoverage, backtrackParams);
  // A -1 result has no length, so it never matches a non-empty coverage list.
  const lengthOf = (lookups: number[] | -1): number | undefined =>
    lookups === -1 ? undefined : lookups.length;
  const contextRulesMatch =
    inputLookups.length === inputCoverage.length &&
    lengthOf(lookaheadLookups) === lookaheadCoverage.length &&
    lengthOf(backtrackLookups) === backtrackCoverage.length;
  let substitutions: SubstitutionResult[] = [];
  if (contextRulesMatch) {
    const lookupRecords = (this.subtable as ChainContextSubst & { substFormat: 3 }).lookupRecords;
    for (let i = 0; i < lookupRecords.length; i++) {
      const lookupRecord = lookupRecords[i] as { lookupListIndex: number };
      for (let j = 0; j < inputLookups.length; j++) {
        const inputContext = new ContextParams([contextParams.get(j) as Token], 0);
        const lookupTable = new LookupTable(lookupRecord.lookupListIndex, this.lookups);
        substitutions = substitutions.concat(lookupTable.lookup(inputContext));
      }
    }
  }
  return substitutions;
}

function ligatureSubstitutionFormat1(
  this: Substitution,
  contextParams: ContextParams<Token>,
): Ligature[] {
  // No array check here, unlike the other lookups.
  const glyphIndex = (contextParams.current.activeState as { value: TokenValue }).value;
  const ligSetIndex = (this.coverage as Coverage).lookup(glyphIndex as number | null);
  if (ligSetIndex === -1) return [];
  const ligGlyphs = (this.ligatureSets as LigatureSets).lookup(contextParams, ligSetIndex);
  return ligGlyphs ? [ligGlyphs] : [];
}

/** A GSUB feature of a script, ready to look up tokens. */
export class Feature {
  tag: string;
  featureRef: LayoutFeatureRecord["feature"];
  lookups: LookupTable[];
  script: string;

  constructor(
    tag: string,
    feature: LayoutFeatureRecord["feature"],
    featureLookups: FeatureLookups,
    script: string,
  ) {
    this.tag = tag;
    this.featureRef = feature;
    this.lookups = featureLookups.lookups;
    this.script = script;
  }

  lookup(contextParams: ContextParams<Token>): SubstitutionResult[] {
    let lookups: SubstitutionResult[] = [];
    for (let i = 0; i < this.lookups.length; i++) {
      const lookup = (this.lookups[i] as LookupTable).lookup(contextParams);
      lookups = lookups.concat(lookup);
    }
    return lookups;
  }
}

/** The features of a script, with their Feature objects by tag (set by mapTagsToFeatures). */
export type ScriptFeatures = LayoutFeatureRecord[] & { tags: Record<string, Feature> };

/** Finds GSUB features by tag and script. */
export class FeatureQuery {
  font: Font;
  features: Record<string, ScriptFeatures>;

  constructor(font: Font, baseDir?: string) {
    this.font = font;
    this.features = {};
    BASE_DIR = baseDir ? baseDir : BASE_DIR;
  }

  /**
   * The feature indexes of a script's default language system. Like
   * opentype.js it also compares langSysRecords on the script record, where
   * there are none, so a language tag never matches.
   */
  getScriptFeaturesIndexes(scriptTag: string): number[] {
    if (!scriptTag) return [];
    const gsub = this.font.tables.gsub;
    if (!gsub) return [];
    const scripts = gsub.scripts;
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i] as (typeof scripts)[number] & {
        langSysRecords?: { tag: string; langSys: { featureIndexes: number[] } }[];
      };
      if (script.tag === scriptTag) {
        return (script.script as { defaultLangSys: { featureIndexes: number[] } }).defaultLangSys
          .featureIndexes;
      }
      const langSysRecords = script.langSysRecords;
      if (langSysRecords) {
        for (let j = 0; j < langSysRecords.length; j++) {
          const langSysRecord = langSysRecords[j] as (typeof langSysRecords)[number];
          if (langSysRecord.tag === scriptTag) {
            return langSysRecord.langSys.featureIndexes;
          }
        }
      }
    }
    return [];
  }

  mapTagsToFeatures(features: LayoutFeatureRecord[], scriptTag: string): void {
    const tags: Record<string, Feature> = {};
    for (let i = 0; i < features.length; i++) {
      const record = features[i] as LayoutFeatureRecord;
      const feature = record.feature as { lookupListIndexes: number[] };
      const tag = record.tag;
      const lookups = (this.font.tables.gsub as { lookups: GsubLookups }).lookups;
      const featureLookups = new FeatureLookups(lookups, feature.lookupListIndexes);
      tags[tag] = new Feature(tag, record.feature, featureLookups, scriptTag);
    }
    (this.features[scriptTag] as ScriptFeatures).tags = tags;
  }

  getScriptFeatures(scriptTag: string): ScriptFeatures | null {
    let features = this.features[scriptTag];
    if (Object.prototype.hasOwnProperty.call(this.features, scriptTag))
      return features as ScriptFeatures;
    const featuresIndexes = this.getScriptFeaturesIndexes(scriptTag);
    if (!featuresIndexes) return null;
    const gsub = this.font.tables.gsub as { features: LayoutFeatureRecord[] };
    features = featuresIndexes.map(
      (index) => gsub.features[index] as LayoutFeatureRecord,
    ) as ScriptFeatures;
    this.features[scriptTag] = features;
    this.mapTagsToFeatures(features, scriptTag);
    return features;
  }

  /** The feature with the tag in the script, or null. */
  getFeature(query: FeatureQueryInput): Feature | null | { FAIL: string } {
    if (!this.font) return { FAIL: "No font was found" };
    if (!Object.prototype.hasOwnProperty.call(this.features, query.script)) {
      this.getScriptFeatures(query.script);
    }
    return (this.features[query.script] as ScriptFeatures).tags[query.tag] || null;
  }
}
