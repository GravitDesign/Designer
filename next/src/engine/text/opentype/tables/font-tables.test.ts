import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Font } from "../font.ts";
import type { Glyph } from "../glyph.ts";
import { parse } from "../opentype.ts";
import { parseTestFont, readFixture, readTestFont } from "../test-fonts.ts";

// Reference values dumped from the old bundle's opentype fork for every
// bundled font: the simple tables whole, the cmap, names, metrics and kerning.

interface FontDump {
  error?: string;
  font: Record<string, unknown>;
  head: unknown;
  hhea: unknown;
  maxp: unknown;
  os2: unknown;
  post: Record<string, unknown> | null;
  name: unknown;
  names: boolean;
  meta: unknown;
  fvar: unknown;
  cvtLength?: number;
  cvtHash?: string;
  fpgmLength?: number;
  prepLength?: number;
  cmap: Record<string, unknown>;
  lookups: Record<string, number | null>;
  glyphs?: Record<string, Record<string, unknown>>;
  nameLookups: Record<string, number | null>;
  kerning: { count: number; hash: string; sample: [string, number][] };
}

const sha = (s: string): string => createHash("sha256").update(s).digest("hex");
const plain = (v: unknown): unknown => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

function dump(font: Font, withGlyphs: boolean): Omit<FontDump, "error"> {
  const t = font.tables;
  const cmap = t.cmap as NonNullable<typeof t.cmap>;
  const lookups: Record<string, number | null> = {};
  const fixtureLookups = Object.keys(
    (readFixture<Record<string, FontDump>>("tables-fonts.json")["OpenSans-Regular.ttf"] as FontDump)
      .lookups,
  );
  for (const c of fixtureLookups) {
    lookups[c] = font.charToGlyphIndex(String.fromCodePoint(Number(c)));
  }
  const n = font.glyphs.length;
  const glyphs: Record<string, Record<string, unknown>> = {};
  if (withGlyphs) {
    const sample: number[] = [];
    for (let i = 0; i < Math.min(n, 40); i++) sample.push(i);
    for (let i = 40; i < n; i += Math.max(1, Math.floor(n / 40))) sample.push(i);
    sample.push(n - 1);
    for (const i of sample) {
      const g = font.glyphs.get(i) as Glyph;
      glyphs[i] = plain({
        name: g.name,
        unicode: g.unicode,
        unicodes: g.unicodes,
        advanceWidth: g.advanceWidth,
        leftSideBearing: g.leftSideBearing,
        glyphIndexToName: font.glyphIndexToName(i),
      }) as Record<string, unknown>;
    }
  }
  const nameLookups: Record<string, number | null> = {};
  for (const nm of ["A", "a", "space", ".notdef", "uni0627", "fi", "nonexistent", "zero"]) {
    nameLookups[nm] = font.glyphNames && font.glyphNames.names ? font.nameToGlyphIndex(nm) : null;
  }
  const kernKeys = Object.keys(font.kerningPairs);
  const post = t.post;
  return {
    font: {
      supported: font.supported,
      outlinesFormat: font.outlinesFormat,
      unitsPerEm: font.unitsPerEm,
      ascender: font.ascender,
      descender: font.descender,
      numGlyphs: font.numGlyphs,
      numberOfHMetrics: font.numberOfHMetrics,
      glyphsLength: n,
      hasGHBTables: font.hasGHBTables,
      tableKeys: Object.keys(t),
    },
    head: plain(t.head),
    hhea: plain(t.hhea),
    maxp: plain(t.maxp),
    os2: plain(t.os2),
    post: post
      ? (plain({
          ...post,
          names: undefined,
          glyphNameIndex: undefined,
          namesLength: post.names && post.names.length,
          namesHash: post.names && sha(JSON.stringify(post.names)),
          glyphNameIndexHash: post.glyphNameIndex && sha(JSON.stringify(post.glyphNameIndex)),
        }) as Record<string, unknown>)
      : null,
    name: plain(t.name),
    names: font.names === t.name,
    meta: plain(t.meta),
    fvar: plain(t.fvar),
    cvtLength: t.cvt && t.cvt.length,
    cvtHash: t.cvt && sha(JSON.stringify(t.cvt)),
    fpgmLength: t.fpgm && t.fpgm.length,
    prepLength: t.prep && t.prep.length,
    cmap: {
      version: cmap.version,
      numTables: cmap.numTables,
      format: cmap.format,
      length: cmap.length,
      language: cmap.language,
      segCount: cmap.segCount,
      groupCount: cmap.groupCount,
      mappedCount: Object.keys(cmap.glyphIndexMap).length,
      mapHash: sha(JSON.stringify(cmap.glyphIndexMap)),
    },
    lookups,
    ...(withGlyphs ? { glyphs } : {}),
    nameLookups,
    kerning: {
      count: kernKeys.length,
      hash: sha(JSON.stringify(font.kerningPairs)),
      sample: kernKeys
        .slice(0, 20)
        .map((k): [string, number] => [k, font.kerningPairs[k] as number]),
    },
  };
}

describe("parsed font tables match the old fork", () => {
  const fixtures = readFixture<Record<string, FontDump>>("tables-fonts.json");
  for (const [name, expected] of Object.entries(fixtures)) {
    if (expected.error !== undefined) {
      it(`${name} fails like the old code`, () => {
        expect(() => parse(readTestFont(name))).toThrow(expected.error);
      });
      continue;
    }
    it(name, () => {
      const actual = plain(dump(parseTestFont(name), true));
      expect(actual).toEqual(plain(expected));
    });
  }
});

describe("CID-keyed CFF font", () => {
  it("NotoSansCJKsc-Regular.otf", () => {
    const name = "chinese-simplified/NotoSansCJKsc-Regular.otf";
    const expected = readFixture<Record<string, FontDump>>("tables-cjk.json")[name];
    const actual = plain(dump(parseTestFont(name), false));
    expect(actual).toEqual(plain(expected));
  }, 60000);
});
