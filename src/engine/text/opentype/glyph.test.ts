import { describe, expect, it } from "vitest";
import { Glyph } from "./glyph.ts";
import { asJson, glyphInfo, sampleGlyphs } from "./outline-info.ts";
import type { OutlineFixture } from "./outline-info.ts";
import { Path } from "./path.ts";
import { parseTestFont, readFixture } from "./test-fonts.ts";

// TrueType outlines (glyf, loca, glyphset, glyph) against values from the old bundle.
const trueTypeFixtures = [
  "outlines-opensans-regular.json",
  "outlines-opensans-bolditalic.json",
  "outlines-noto-arabic.json",
];

describe("TrueType glyph outlines", () => {
  for (const file of trueTypeFixtures) {
    const fixture = readFixture<OutlineFixture>(file);
    it(`match the old code for ${fixture.font}`, () => {
      const font = parseTestFont(fixture.font);
      expect(font.outlinesFormat).toBe("truetype");
      expect(font.numGlyphs).toBe(fixture.numGlyphs);
      expect(font.glyphs.length).toBe(fixture.glyphsLength);
      const actual = sampleGlyphs(font, fixture);
      for (let i = 0; i < actual.length; i++) {
        expect(actual[i]).toEqual(fixture.glyphs[i]);
      }
    });
  }

  it("include composite glyphs and a lineTo before each curve", () => {
    const fixture = readFixture<OutlineFixture>("outlines-opensans-regular.json");
    const composites = fixture.glyphs.filter((g) => (g as { isComposite?: boolean }).isComposite);
    expect(composites.length).toBeGreaterThan(1);
    const font = parseTestFont(fixture.font);
    const commands = font.charToGlyph("o").path.commands;
    expect(commands.some((c) => c.type === "Q")).toBe(true);
    // Gravit: every Q is preceded by an L to the start of the curve.
    for (let i = 0; i < commands.length; i++) {
      if (commands[i]?.type === "Q") expect(commands[i - 1]?.type).toBe("L");
    }
  });

  it("load the outline when xMin is read", () => {
    const font = parseTestFont("OpenSans-Regular.ttf");
    const glyph = font.charToGlyph("H");
    expect(Object.keys(glyph)).toContain("xMin");
    expect(typeof glyph.xMin).toBe("number");
    expect(glyph.numberOfContours).toBeGreaterThan(0);
  });
});

describe("Glyph", () => {
  it("keeps the old unicodes precedence quirk", () => {
    expect(new Glyph({ unicode: 65 }).unicodes).toEqual([65]);
    // A given unicodes list is replaced by [unicode].
    expect(new Glyph({ unicodes: [1, 2] }).unicodes).toEqual([undefined]);
    expect(new Glyph({}).unicodes).toEqual([]);
    const glyph = new Glyph({});
    glyph.addUnicode(66);
    glyph.addUnicode(67);
    expect(glyph.unicode).toBe(66);
    expect(glyph.unicodes).toEqual([66, 67]);
  });

  it("runs a path loader once", () => {
    let calls = 0;
    const glyph = new Glyph({
      index: 3,
      path: () => {
        calls++;
        const p = new Path();
        p.moveTo(0, 0);
        p.lineTo(10, 20);
        p.unitsPerEm = 100;
        return p;
      },
    });
    expect(calls).toBe(0);
    expect(glyph.path.commands.length).toBe(2);
    expect(glyph.path.commands.length).toBe(2);
    expect(calls).toBe(1);
    expect(asJson(glyph.getPath(1, 2, 50).commands)).toEqual([
      { type: "M", x: 1, y: 2 },
      { type: "L", x: 6, y: -8 },
    ]);
  });

  it("gives an empty glyph zero metrics and the advance width as xMax", () => {
    const glyph = new Glyph({ advanceWidth: 500 });
    glyph.leftSideBearing = 0;
    expect(glyph.getMetrics()).toEqual({
      xMin: 0,
      yMin: 0,
      xMax: 500,
      yMax: 0,
      leftSideBearing: 0,
      rightSideBearing: 0,
    });
    expect(glyphInfo(glyph)).toBeTruthy();
  });
});
