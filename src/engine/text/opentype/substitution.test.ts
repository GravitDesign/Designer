import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Font } from "./font.ts";
import { parse } from "./opentype.ts";
import type { FeatureSubstitution } from "./substitution.ts";
import * as gpos from "./tables/gpos.ts";
import type { GposTable } from "./tables/gpos.ts";
import * as gsub from "./tables/gsub.ts";
import type { GsubTable } from "./tables/gsub.ts";
import { parseTestFont, readFixture, readTestFont } from "./test-fonts.ts";

// Reference values: the old bundle's opentype fork (scratch script layout-dump.cjs).

const hash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function freshFont(file: string): Font {
  return parse(readTestFont(file));
}

const FEATURES = [
  "liga",
  "rlig",
  "dlig",
  "locl",
  "numr",
  "dnom",
  "aalt",
  "salt",
  "kern",
  "calt",
  ...Array.from({ length: 20 }, (_, i) => "ss" + String(i + 1).padStart(2, "0")),
];

type FeatureFixture = Record<
  string,
  Record<string, "undefined" | { count: number; first: unknown[]; hash: string }>
>;

describe("Substitution.getFeature", () => {
  const fixture = readFixture<FeatureFixture>("layout-substitution.json");
  for (const [file, expected] of Object.entries(fixture)) {
    it("lists the substitutions of " + file + " per script, language and feature", () => {
      const font = parseTestFont(file);
      const got: FeatureFixture[string] = {};
      const scripts = [undefined, ...font.substitution.getScriptNames()];
      for (const s of scripts) {
        const languages = [undefined, "dflt", ...font.substitution.getLangSysTags(s), "ZZZ "];
        for (const l of languages) {
          for (const feature of FEATURES) {
            const v = font.substitution.getFeature(feature, s, l);
            const key = feature + "/" + String(s) + "/" + String(l);
            if (v === undefined) {
              got[key] = "undefined";
              continue;
            }
            if (v.length === 0) continue;
            got[key] = { count: v.length, first: v.slice(0, 3), hash: hash(v) };
          }
        }
      }
      expect(got).toEqual(expected);
    });
  }

  it("reads locl, numr and dnom (Gravit) and ss01-ss20", () => {
    const font = parseTestFont("OpenSans-Regular.ttf");
    const locl = font.substitution.getFeature("locl", "latn", "ROM ") as FeatureSubstitution[];
    expect(locl.length).toBeGreaterThan(0);
    expect(font.substitution.getFeature("numr", "latn")).toEqual([]);
    expect(font.substitution.getFeature("dnom", "latn")).toEqual([]);
    expect(font.substitution.getFeature("ss20", "latn")).toEqual([]);
    expect(font.substitution.getFeature("kern", "latn")).toBeUndefined();
  });
});

interface WriteFixture {
  added: {
    gsub: unknown;
    err: string | null;
    back: Record<string, unknown>;
    bytes: string;
    reparsed: unknown;
  };
  [file: string]: unknown;
}

describe("Substitution.add and GSUB writing", () => {
  const fixture = readFixture<WriteFixture>("layout-write.json");

  function buildAdded(): Font {
    const font = freshFont("OpenSans-Regular.ttf");
    delete font.tables.gsub;
    const s = font.substitution;
    s.add("aalt", { sub: 5, by: 6 });
    s.add("aalt", { sub: 3, by: [7, 8] });
    s.add("aalt", { sub: 5, by: 9 });
    s.add("aalt", { sub: 2, by: [10] });
    s.add("liga", { sub: [73, 76], by: 300 });
    s.add("liga", { sub: [73, 73, 76], by: 301 });
    s.add("liga", { sub: [73, 76], by: 302 });
    s.add("liga", { sub: [70, 70], by: 303 });
    s.add("salt", { sub: 9, by: 10 }, "latn", "ROM ");
    s.add("ss01", { sub: 4, by: 44 });
    s.add("ss02", { sub: 4, by: 45 }, "cyrl");
    s.add("kern", { sub: 1, by: 2 });
    s.add("aaaa", { sub: 1, by: 2 });
    return font;
  }

  it("builds the same GSUB table as the old code", () => {
    const font = buildAdded();
    expect(JSON.parse(JSON.stringify(font.tables.gsub))).toEqual(fixture.added.gsub);
    const s = font.substitution;
    expect({
      aalt: s.getFeature("aalt"),
      liga: s.getFeature("liga"),
      ss01: s.getFeature("ss01"),
      salt: s.getFeature("salt", "latn", "ROM "),
    }).toEqual(fixture.added.back);
  });

  it("writes the added table to the old bytes and reads them back", () => {
    const font = buildAdded();
    const bytes = gsub.make(font.tables.gsub as GsubTable).encode();
    expect(Buffer.from(bytes).toString("base64")).toBe(fixture.added.bytes);
    const reparsed = gsub.parse(new DataView(new Uint8Array(bytes).buffer), 0);
    expect(JSON.parse(JSON.stringify(reparsed))).toEqual(fixture.added.reparsed);
  });

  for (const file of ["OpenSans-Regular.ttf", "noto/NotoSansArabic-Regular.ttf"]) {
    it("writes (or refuses to write) the parsed tables of " + file + " like the old code", () => {
      const font = parseTestFont(file);
      const expected = fixture[file] as Record<string, unknown>;
      const got: Record<string, unknown> = {};
      try {
        const bytes = gsub.make(font.tables.gsub as GsubTable).encode();
        got.gsubLength = bytes.length;
        got.gsubHash = hash(bytes);
      } catch (e) {
        got.gsubError = (e as Error).message;
      }
      const table = font.tables.gpos as GposTable;
      try {
        const bytes = gpos.make(table).encode();
        got.gposLength = bytes.length;
        got.gposHash = hash(bytes);
      } catch (e) {
        got.gposError = (e as Error).message;
      }
      const empty: GposTable = {
        version: 1,
        scripts: table.scripts,
        features: table.features,
        lookups: [],
      };
      try {
        const bytes = gpos.make(empty).encode();
        got.gposEmptyHash = hash(bytes);
        got.gposEmptyLength = bytes.length;
      } catch (e) {
        got.gposEmptyError = (e as Error).message;
      }
      expect(got).toEqual(expected);
    });
  }
});
