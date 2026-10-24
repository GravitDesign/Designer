import { describe, expect, it } from "vitest";
import type { Font, RenderOptions } from "./font.ts";
import type { Glyph } from "./glyph.ts";
import { parse } from "./opentype.ts";
import { parseTestFont, readFixture, readTestFont } from "./test-fonts.ts";

// Font.stringToGlyphs / forEachGlyph / getAdvanceWidth with the layout
// features, against the old bundle (scratch script layout-dump.cjs).

const OPTS: Record<string, RenderOptions | undefined> = {
  default: undefined,
  noFeatures: { kerning: true },
  ligaOnly: { kerning: false, features: { liga: true } },
  rom: { kerning: true, script: "latn", language: "ROM ", features: { liga: true, rlig: true } },
  mol: { kerning: true, script: "latn", language: "MOL ", features: { liga: true } },
  ss01: { kerning: true, features: { liga: true, stylisticSet: "ss01" } },
  ss02: { kerning: true, features: { liga: true, stylisticSet: "ss02" } },
  ss03: { kerning: true, script: "latn", features: { stylisticSet: "ss03" } },
  salt: { kerning: true, features: { stylisticSet: "salt" } },
  rtl: { kerning: true, direction: "rtl", features: { liga: true, rlig: true } },
  urd: { kerning: true, script: "arab", language: "URD ", features: { rlig: true } },
  spacing: { kerning: true, letterSpacing: 0.1, features: { liga: true } },
  tracking: { kerning: true, tracking: 50, features: { liga: true } },
  gen: { kerning: true, generateText: true, features: { liga: true, rlig: true } },
};

interface TextResult {
  glyphs: number[];
  chars: string[];
  calls: unknown[][];
  end: number;
  adv: number;
  adv72: number;
}

type TextFixture = Record<string, Record<string, TextResult>> & {
  frac: Record<string, unknown> & { gsub: unknown };
};

describe("Font text layout", () => {
  const fixture = readFixture<TextFixture>("layout-text.json");
  for (const [file, expected] of Object.entries(fixture)) {
    if (file === "frac") continue;
    it("lays out text with " + file + " like the old code", () => {
      const font = parseTestFont(file);
      for (const [key, want] of Object.entries(expected as Record<string, TextResult>)) {
        const bar = key.indexOf("|");
        const options = OPTS[key.slice(0, bar)];
        const text = key.slice(bar + 1);
        const chars: string[] = [];
        const glyphs = font.stringToGlyphs(text, options, chars);
        const calls: unknown[][] = [];
        const end = font.forEachGlyph(
          text,
          10,
          20,
          36,
          options,
          function (g, x, y, size, _o, t, k) {
            calls.push([
              g.index,
              x,
              y,
              size,
              t === undefined ? null : t,
              k === undefined ? null : k,
            ]);
          },
        );
        expect({
          glyphs: glyphs.map((g: Glyph) => g.index),
          chars,
          calls,
          end,
          adv: font.getAdvanceWidth(text, 24, options),
          adv72: font.getAdvanceWidth(text),
        }).toEqual(want);
      }
    });
  }

  it("repeats the last pair's kerning on the last glyph (old quirk)", () => {
    const result = fixture["noto/NotoSansArmenian-Regular.ttf"] as Record<string, TextResult>;
    const run = Object.entries(result).find(([key]) => key.startsWith("default|Բ"));
    const calls = (run as [string, TextResult])[1].calls;
    const kernings = calls.map((c) => c[5]);
    expect(kernings).toContain(-55);
    const font = parseTestFont("noto/NotoSansArmenian-Regular.ttf");
    // Two glyphs with kerning: the second callback sees the same value again.
    const pair: number[] = [];
    const indexes = font.stringToGlyphs("Հա").map((g) => g.index);
    const kern = font.position.getKerningValue(
      font.position.defaultKerningTables ?? [],
      indexes[0] as number,
      indexes[1] as number,
    );
    font.forEachGlyph("Հա", 0, 0, 72, undefined, function (_g, _x, _y, _s, _o, _t, k) {
      pair.push(k as number);
    });
    expect(kern).not.toBe(0);
    expect(pair).toEqual([kern, kern]);
  });

  it("applies numr and dnom around fraction slashes (Gravit frac)", () => {
    const font: Font = parse(readTestFont("OpenSans-Regular.ttf"));
    delete font.tables.gsub;
    const d = (c: string): number => font.charToGlyphIndex(c) as number;
    for (const c of "0123456789")
      font.substitution.addSingle("dnom", { sub: d(c), by: d(c) + 100 }, "DFLT");
    for (const c of "0123456789")
      font.substitution.addSingle("numr", { sub: d(c), by: d(c) + 200 }, "DFLT");
    const got: Record<string, unknown> = { gsub: JSON.parse(JSON.stringify(font.tables.gsub)) };
    for (const s of ["1/2", "12/34 5", "3⁄4", "7∕8 9", "a/b", "1//2", "/", "10"]) {
      for (const frac of [true, false]) {
        const chars: string[] = [];
        got[frac + "|" + s] = {
          glyphs: font.stringToGlyphs(s, { features: { frac } }, chars).map((g) => g.index),
          chars,
        };
      }
    }
    expect(got).toEqual(fixture.frac);
  });
});
