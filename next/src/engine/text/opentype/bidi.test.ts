import { describe, expect, it } from "vitest";
import { Bidi } from "./bidi.ts";
import { FeatureQuery } from "./features/feature-query.ts";
import type { Feature } from "./features/feature-query.ts";
import { parseTestFont, readFixture } from "./test-fonts.ts";
import type { ContextRange } from "./tokenizer.ts";

// Reference values: the old bundle's opentype fork (scratch script layout-dump.cjs).

const TEXTS = [
  "مرحبا",
  "السلام عليكم",
  "لا إله",
  "abc مرحبا 123",
  "بِسْمِ اللَّهِ",
  "ب",
  "لله",
  "Hello, world",
  "ܫܠܡܐ",
  "مرحبا\nعالم",
  "a",
  "",
  "ـبـ",
  "😀مرحبا",
];

type FeatureQueryFixture = Record<string, Record<string, unknown>>;

describe("FeatureQuery", () => {
  const fixture = readFixture<FeatureQueryFixture>("layout-featurequery.json");
  for (const [file, expected] of Object.entries(fixture)) {
    it("finds the GSUB features of " + file + " per script", () => {
      const font = parseTestFont(file);
      const query = new FeatureQuery(font);
      const got: Record<string, unknown> = {};
      for (const script of ["arab", "syrc", "latn", "DFLT", "URD ", "zzzz"]) {
        for (const tag of ["init", "medi", "fina", "rlig", "liga", "isol", "calt", "locl"]) {
          const feature = query.getFeature({ tag, script }) as Feature | null;
          got[script + "/" + tag] = feature
            ? {
                tag: feature.tag,
                script: feature.script,
                lookups: feature.lookups.map((l) => ({
                  index: l.index,
                  subtables: l.subtables.map((s) => [
                    s.lookupTable.lookupType,
                    (s.subtable as { substFormat: number }).substFormat,
                    !!s.coverage,
                    s.inputCoverage ? s.inputCoverage.length : -1,
                    s.backtrackCoverage ? s.backtrackCoverage.length : -1,
                    s.lookaheadCoverage ? s.lookaheadCoverage.length : -1,
                    !!s.ligatureSets,
                  ]),
                })),
              }
            : feature;
        }
      }
      got.indexes = Object.fromEntries(
        ["arab", "syrc", "latn", "DFLT", "URD ", "MOL ", ""].map((s) => [
          s,
          query.getScriptFeaturesIndexes(s),
        ]),
      );
      expect(got).toEqual(expected);
    });
  }
});

interface BidiResult {
  glyphs: number[];
  chars: string[];
  text: string;
  states: [string | null, boolean][];
  ranges: { word: unknown[]; sentence: unknown[] };
}

describe("Bidi", () => {
  const fixture = readFixture<Record<string, Record<string, BidiResult>>>("layout-bidi.json");
  for (const [file, expected] of Object.entries(fixture)) {
    it("shapes Arabic text with " + file + " like the old code", () => {
      const font = parseTestFont(file);
      const got: Record<string, BidiResult> = {};
      for (const direction of [undefined, "rtl"]) {
        for (const text of TEXTS) {
          const bidi = new Bidi(direction);
          bidi.registerModifier("glyphIndex", null, (token) => font.charToGlyphIndex(token.char));
          const query = new FeatureQuery(font, direction);
          bidi.applyFeatures(
            ["init", "medi", "fina", "rlig"].map((tag) => {
              const feature = query.getFeature({ tag, script: "arab" });
              if (feature) return feature;
              return undefined;
            }),
          );
          const chars: string[] = [];
          const glyphs = bidi.getTextGlyphs(text, chars);
          const ranges = (name: string): ContextRange[] =>
            bidi.tokenizer.getContextRanges(name) as ContextRange[];
          got[String(direction) + "|" + text] = {
            glyphs,
            chars,
            text: bidi.getBidiText(text),
            states: bidi.tokenizer.tokens.map((k) => [
              k.activeState && k.activeState.key,
              k.state.deleted || false,
            ]),
            ranges: {
              word: ranges("arabicWord").map((x) => [x.startIndex, x.endOffset, x.rangeId]),
              sentence: ranges("arabicSentence").map((x) => [x.startIndex, x.endOffset]),
            },
          };
        }
      }
      expect(got).toEqual(expected);
    });
  }

  it("applies init, medi, fina and the lam-alef ligature", () => {
    const font = parseTestFont("noto/NotoSansArabic-Regular.ttf");
    const result = fixture["noto/NotoSansArabic-Regular.ttf"] as Record<string, BidiResult>;
    const word = result["undefined|مرحبا"] as BidiResult;
    expect(word.states.map((s) => s[0])).toEqual(["init", "fina", "init", "medi", "fina"]);
    const lamAlef = result["undefined|لا إله"] as BidiResult;
    expect(lamAlef.states.slice(0, 2)).toEqual([
      ["rlig", false],
      ["fina", true],
    ]);
    expect(lamAlef.chars).not.toContain("ا");
    // Gravit: the Arabic run is not reversed.
    const bidi = new Bidi();
    bidi.registerModifier("glyphIndex", null, (token) => font.charToGlyphIndex(token.char));
    expect(bidi.getBidiText("abc مر")).toBe("abc مر");
  });

  it("needs the glyphIndex modifier for Arabic features", () => {
    const font = parseTestFont("noto/NotoSansArabic-Regular.ttf");
    const bidi = new Bidi();
    bidi.applyFeatures([new FeatureQuery(font).getFeature({ tag: "init", script: "arab" })]);
    expect(() => bidi.getTextGlyphs("مر")).toThrow(
      "glyphIndex modifier is required to apply arabic presentation features.",
    );
  });
});
