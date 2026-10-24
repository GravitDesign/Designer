import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Font } from "./font.ts";
import type { LayoutTable } from "./layout.ts";
import { parse } from "./opentype.ts";
import type { LookupTable } from "./parse.ts";
import { readFixture, readTestFont, parseTestFont } from "./test-fonts.ts";

// Reference values: the old bundle's opentype fork run on the same fonts
// (scratch script layout-dump.cjs).

const hash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function summary(table: LayoutTable<unknown> | undefined): unknown {
  if (!table) return null;
  return {
    version: table.version,
    scripts: table.scripts.map((s) => ({
      tag: s.tag,
      defaultLangSys: s.script?.defaultLangSys,
      langSys: s.script?.langSysRecords.map((l) => ({ tag: l.tag, langSys: l.langSys })),
    })),
    features: table.features.map((f) => ({
      tag: f.tag,
      lookupListIndexes: f.feature?.lookupListIndexes,
      featureParams: (f.feature as { featureParams?: number }).featureParams,
    })),
    lookups: table.lookups.map((l) => ({
      lookupType: l.lookupType,
      lookupFlag: l.lookupFlag,
      markFilteringSet: l.markFilteringSet,
      formats: l.subtables.map((s) => {
        const sub = s as { substFormat?: number; posFormat?: number; error?: string };
        return sub.substFormat !== undefined
          ? sub.substFormat
          : sub.posFormat !== undefined
            ? sub.posFormat
            : sub.error;
      }),
    })),
    variations: table.variations,
    hash: hash(table),
  };
}

type TablesFixture = Record<
  string,
  {
    gsub: unknown;
    gpos: unknown;
    layout: Record<
      string,
      { scriptNames: string[]; defaultScript: string | null; langSysTags: Record<string, string[]> }
    >;
  }
>;

describe("GSUB and GPOS parsing", () => {
  const fixture = readFixture<TablesFixture>("layout-tables.json");
  for (const [file, expected] of Object.entries(fixture)) {
    it("parses the tables of " + file + " like the old code", () => {
      const font = parseTestFont(file);
      // JSON round trip drops undefined values like the fixture did.
      expect(JSON.parse(JSON.stringify(summary(font.tables.gsub)))).toEqual(expected.gsub);
      expect(JSON.parse(JSON.stringify(summary(font.tables.gpos)))).toEqual(expected.gpos);
    });

    it("lists scripts and language systems of " + file, () => {
      const font = parseTestFont(file);
      for (const [name, layout] of [
        ["substitution", font.substitution],
        ["position", font.position],
      ] as const) {
        const want = expected.layout[name];
        expect(layout.getScriptNames()).toEqual(want?.scriptNames);
        expect(layout.getDefaultScriptName() ?? null).toEqual(want?.defaultScript);
        const tags = Object.fromEntries(
          layout
            .getScriptNames()
            .concat(["DFLT", "xxxx"])
            .map((s) => [s, layout.getLangSysTags(s)]),
        );
        expect(tags).toEqual(want?.langSysTags);
      }
    });
  }
});

type KerningFixture = Record<
  string,
  {
    defaultScript: string;
    defaultKerningTables: number[];
    kerningTables: Record<string, number[] | null>;
    pairs: Record<string, number>;
    fontKerning: Record<string, number>;
    glyph0: number;
  }
>;

describe("GPOS kerning", () => {
  const fixture = readFixture<KerningFixture>("layout-kerning.json");
  const chars = "AVTWYLPFKkoaeyvwr.,-'\"jfJ1749".split("");
  for (const [file, expected] of Object.entries(fixture)) {
    it("finds the kerning lookups of " + file, () => {
      const font = parseTestFont(file);
      const lookups = (font.tables.gpos as LayoutTable<unknown>).lookups as LookupTable<unknown>[];
      const indexesOf = (tables: LookupTable<unknown>[] | undefined): number[] | null =>
        tables ? tables.map((t) => lookups.indexOf(t)) : null;
      expect(font.position.getDefaultScriptName()).toBe(expected.defaultScript);
      expect(indexesOf(font.position.defaultKerningTables)).toEqual(expected.defaultKerningTables);
      const got: Record<string, number[] | null> = {};
      for (const [s, l] of [
        [undefined, undefined],
        ["latn", undefined],
        ["latn", "ROM "],
        ["DFLT", undefined],
        ["cyrl", undefined],
        ["grek", undefined],
        ["zzzz", undefined],
      ] as const) {
        got[String(s) + "/" + String(l)] = indexesOf(font.position.getKerningTables(s, l));
      }
      expect(got).toEqual(expected.kerningTables);
    });

    it("returns the old kerning values of " + file, () => {
      const font = parseTestFont(file);
      const tables = font.position.getKerningTables(expected.defaultScript) as LookupTable<never>[];
      const pairs: Record<string, number> = {};
      const fontKerning: Record<string, number> = {};
      for (const a of chars) {
        for (const b of chars) {
          const ia = font.charToGlyphIndex(a) as number;
          const ib = font.charToGlyphIndex(b) as number;
          const v = font.position.getKerningValue(tables, ia, ib);
          if (v) pairs[a + b] = v;
          fontKerning[a + b] = font.getKerningValue(
            font.glyphs.get(ia) as never,
            font.glyphs.get(ib) as never,
          );
        }
      }
      const step = font.numGlyphs < 400 ? 1 : 7;
      for (let ia = 0; ia < font.numGlyphs; ia += step) {
        for (let ib = 0; ib < font.numGlyphs; ib += step) {
          const v = font.position.getKerningValue(tables, ia, ib);
          if (v) pairs["#" + ia + "," + ib] = v;
        }
      }
      expect(pairs).toEqual(expected.pairs);
      expect(fontKerning).toEqual(expected.fontKerning);
      expect(font.getKerningValue(0, font.charToGlyphIndex("A") as number)).toBe(expected.glyph0);
    });
  }

  it("has real kerning pairs to compare", () => {
    expect(
      Object.keys(fixture["noto/NotoSansArmenian-Regular.ttf"]?.pairs ?? {}).length,
    ).toBeGreaterThan(100);
  });

  it("uses the empty GPOS kerning of OpenSans instead of its kern table (old quirk)", () => {
    const font = parseTestFont("OpenSans-Regular.ttf");
    const a = font.charToGlyphIndex("A") as number;
    const v = font.charToGlyphIndex("V") as number;
    expect(font.kerningPairs[a + "," + v]).toBeLessThan(0);
    expect(font.position.defaultKerningTables).toEqual([]);
    expect(font.getKerningValue(a, v)).toBe(0);
  });

  it("gives 0 for an empty lookup list and undefined tables without GPOS", () => {
    const font = parseTestFont("OpenSans-Regular.ttf");
    expect(font.position.getKerningValue([], 1, 2)).toBe(0);
    const noGpos = freshFont("OpenSans-Regular.ttf");
    delete noGpos.tables.gpos;
    expect(noGpos.position.getKerningTables("latn")).toBeUndefined();
  });
});

function freshFont(file: string): Font {
  return parse(readTestFont(file));
}

describe("Layout table editing", () => {
  it("creates scripts, language systems, features and lookups on demand", () => {
    const font = freshFont("OpenSans-Regular.ttf");
    delete font.tables.gsub;
    const layout = font.substitution;
    expect(layout.getTable()).toBeUndefined();
    expect(layout.getScriptNames()).toEqual([]);
    expect(layout.getDefaultScriptName()).toBeUndefined();

    const created = layout.getLookupTables("latn", "ROM ", "liga", 4, true);
    expect(created).toEqual([
      { lookupType: 4, lookupFlag: 0, subtables: [], markFilteringSet: undefined },
    ]);
    expect(layout.getScriptNames()).toEqual(["DFLT", "latn"]);
    expect(layout.getLangSysTags("latn")).toEqual(["ROM "]);
    expect(layout.getDefaultScriptName()).toBe("DFLT");
    const table = layout.getTable() as LayoutTable<unknown>;
    expect(table.features).toEqual([
      { tag: "liga", feature: { params: 0, lookupListIndexes: [0] } },
    ]);
    // The same lookup again, no new one.
    expect(layout.getLookupTables("latn", "ROM ", "liga", 4, true)[0]).toBe(created[0]);
    // Scripts stay sorted by tag.
    layout.getScriptTable("cyrl", true);
    expect(layout.getScriptNames()).toEqual(["DFLT", "cyrl", "latn"]);
    expect(() => layout.getFeatureTable("latn", undefined, "aalt", true)).toThrow(
      "Features must be added in alphabetical order.",
    );
  });

  it("gives a table without scripts an empty script list (Gravit)", () => {
    const font = freshFont("OpenSans-Regular.ttf");
    (font.tables as Record<string, unknown>).gsub = { version: 1, features: [], lookups: [] };
    expect(font.substitution.getScriptNames()).toEqual([]);
    expect((font.tables.gsub as LayoutTable<unknown>).scripts).toEqual([]);
  });

  it("finds classes and coverage indexes", () => {
    const font = parseTestFont("OpenSans-Regular.ttf");
    const layout = font.position;
    expect(layout.getGlyphClass({ format: 1, startGlyph: 10, classes: [3, 4] }, 11)).toBe(4);
    expect(layout.getGlyphClass({ format: 1, startGlyph: 10, classes: [3, 4] }, 12)).toBe(0);
    const ranges = [
      { start: 2, end: 4, classId: 7 },
      { start: 8, end: 9, classId: 5 },
    ];
    expect(layout.getGlyphClass({ format: 2, ranges }, 3)).toBe(7);
    expect(layout.getGlyphClass({ format: 2, ranges }, 6)).toBe(0);
    expect(layout.getGlyphClass({ format: 2, ranges }, 1)).toBe(0);
    expect(layout.getCoverageIndex({ format: 1, glyphs: [3, 5, 9] }, 9)).toBe(2);
    expect(layout.getCoverageIndex({ format: 1, glyphs: [3, 5, 9] }, 4)).toBe(-1);
    const coverage = {
      format: 2 as const,
      ranges: [
        { start: 2, end: 4, index: 0 },
        { start: 8, end: 9, index: 3 },
      ],
    };
    expect(layout.getCoverageIndex(coverage, 9)).toBe(4);
    expect(layout.getCoverageIndex(coverage, 5)).toBe(-1);
    expect(layout.expandCoverage(coverage)).toEqual([2, 3, 4, 8, 9]);
    expect(layout.binSearch([1, 3, 5], 4)).toBe(-3);
    expect(layout.searchTag([{ tag: "DFLT" }, { tag: "latn" }], "cyrl")).toBe(-2);
  });
});
