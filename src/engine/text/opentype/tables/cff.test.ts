import { describe, expect, it } from "vitest";
import { Font } from "../font.ts";
import { Glyph } from "../glyph.ts";
import { parse } from "../opentype.ts";
import { asJson, sampleGlyphs } from "../outline-info.ts";
import type { OutlineFixture } from "../outline-info.ts";
import { Path } from "../path.ts";
import { parseTestFont, readFixture } from "../test-fonts.ts";
import type { CffTable, CffTopDict } from "./cff.ts";
import * as cff from "./cff.ts";

interface CffFixture extends OutlineFixture {
  nGlyphs: number;
  isCIDFont: boolean;
  gsubrs: number;
  gsubrsBias: number;
  defaultWidthX: number;
  nominalWidthX: number;
  subrs: number;
  subrsBias: number;
  topDict: unknown;
  cffEncodingSample: number[];
}

describe("CFF outlines", () => {
  const fixture = readFixture<CffFixture>("outlines-noto-cjk.json");

  it("parse a CID-keyed CFF font like the old code", { timeout: 60000 }, () => {
    const font = parseTestFont(fixture.font);
    expect(font.outlinesFormat).toBe("cff");
    expect(font.numGlyphs).toBe(fixture.numGlyphs);
    expect(font.nGlyphs).toBe(fixture.nGlyphs);
    expect(font.isCIDFont).toBe(fixture.isCIDFont);
    expect(font.gsubrs.length).toBe(fixture.gsubrs);
    expect(font.gsubrsBias).toBe(fixture.gsubrsBias);
    expect(font.defaultWidthX).toBe(fixture.defaultWidthX);
    expect(font.nominalWidthX).toBe(fixture.nominalWidthX);
    expect(font.subrs.length).toBe(fixture.subrs);
    expect(font.subrsBias).toBe(fixture.subrsBias);
    const td = (font.tables.cff as CffTable).topDict as CffTopDict;
    const fdArray = td._fdArray as CffTopDict[];
    const fdSelect = td._fdSelect as number[];
    expect(
      asJson({
        version: td.version,
        notice: td.notice,
        fullName: td.fullName,
        familyName: td.familyName,
        weight: td.weight,
        fontMatrix: td.fontMatrix,
        fontBBox: td.fontBBox,
        ros: td.ros,
        cidCount: td.cidCount,
        fontName: td.fontName,
        charStrings: td.charStrings,
        private: td.private,
        xuid: td.xuid,
        uniqueId: td.uniqueId,
        fdArrayCount: fdArray.length,
        fdSelectSample: [0, 1, 2, 1000, 20000, 65534].map((i) => fdSelect[i]),
        fdNames: fdArray.map((d) => d.fontName),
        fdWidths: fdArray.map((d) => [
          d._defaultWidthX,
          d._nominalWidthX,
          d._subrs.length,
          d._subrsBias,
        ]),
      }),
    ).toEqual(fixture.topDict);
    const cffEncoding = font.cffEncoding as { charToGlyphIndex(c: string): number };
    expect(["A", "a", "1"].map((c) => cffEncoding.charToGlyphIndex(c))).toEqual(
      fixture.cffEncodingSample,
    );
  });

  it("run charstrings to the old outlines and widths", { timeout: 60000 }, () => {
    const font = parseTestFont(fixture.font);
    const actual = sampleGlyphs(font, fixture);
    for (let i = 0; i < actual.length; i++) {
      expect(actual[i]).toEqual(fixture.glyphs[i]);
    }
  });
});

describe("cff.make", () => {
  interface MakeFixture {
    cffBytes: number[];
    cffSize: number;
    fontBytesLength: number | null;
    reparsed: unknown[];
  }
  const fixture = readFixture<MakeFixture>("outlines-cff-make.json");

  function testFont(): Font {
    const notdef = new Glyph({ name: ".notdef", unicode: 0, advanceWidth: 650, path: new Path() });
    const ap = new Path();
    ap.moveTo(100, 0);
    ap.lineTo(200, 700);
    ap.lineTo(300, 0);
    ap.close();
    const a = new Glyph({ name: "A", unicode: 65, advanceWidth: 400, path: ap });
    const op = new Path();
    op.moveTo(50, 50);
    op.curveTo(50, 300, 350, 300, 350.4, 50.6);
    op.quadTo(200, -100, 50, 50);
    op.close();
    const o = new Glyph({ name: "customGlyph", unicode: 0x263a, advanceWidth: 420, path: op });
    return new Font({
      familyName: "Test Family",
      styleName: "Medium",
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      glyphs: [notdef, a, o],
    });
  }

  it("writes the same CFF bytes as the old code", () => {
    const table = cff.make(testFont().glyphs, {
      version: "Version 0.1",
      fullName: "Test Family Medium",
      familyName: "Test Family",
      weightName: "Medium",
      postScriptName: "TestFamily-Medium",
      unitsPerEm: 1000,
      fontBBox: [0, -100, 350, 700],
    });
    expect(table.sizeOf()).toBe(fixture.cffSize);
    expect(table.encode()).toEqual(fixture.cffBytes);
  });

  it("round-trips a new font through toArrayBuffer and parse", () => {
    const buffer = testFont().toArrayBuffer();
    expect(buffer.byteLength).toBe(fixture.fontBytesLength);
    const reparsed = parse(buffer);
    const glyphs = [0, 1, 2].map((i) => {
      const g = reparsed.glyphs.get(i) as Glyph;
      return asJson({ name: g.name, advanceWidth: g.advanceWidth, commands: g.path.commands });
    });
    expect(glyphs).toEqual(fixture.reparsed);
  });
});
