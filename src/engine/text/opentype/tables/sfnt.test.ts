import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Font } from "../font.ts";
import { Glyph } from "../glyph.ts";
import { parse } from "../opentype.ts";
import { Path } from "../path.ts";
import { readFixture } from "../test-fonts.ts";
import { computeCheckSum } from "./sfnt.ts";

// The font writer: a small font written by the old fork (fixed clock
// 1700000000000 ms for head.modified) and by the port must be the same bytes.

interface WriterFixture {
  length: number;
  sha256: string;
  head: unknown;
  hhea: unknown;
  os2: unknown;
  name: unknown;
  meta: unknown;
  cmap: { format: number; map: unknown };
}

function makeFont(): Font {
  const notdef = new Glyph({ name: ".notdef", unicode: 0, advanceWidth: 650, path: new Path() });
  const aPath = new Path();
  aPath.moveTo(100, 0);
  aPath.lineTo(300, 700);
  aPath.lineTo(500, 0);
  aPath.lineTo(420, 0);
  aPath.quadTo(300, 300, 180, 0);
  aPath.close();
  const a = new Glyph({ name: "A", unicode: 65, advanceWidth: 600, path: aPath });
  const oPath = new Path();
  oPath.moveTo(300, 0);
  oPath.curveTo(450, 0, 550, 120, 550, 260);
  oPath.curveTo(550, 400, 450, 520, 300, 520);
  oPath.curveTo(150, 520, 50, 400, 50, 260.5);
  oPath.curveTo(50, 120, 150, 0, 300, 0);
  oPath.close();
  const o = new Glyph({ name: "o", unicode: 111, advanceWidth: 600.25, path: oPath });
  const space = new Glyph({ name: "space", unicode: 32, advanceWidth: 250, path: new Path() });
  const euro = new Glyph({ name: "Euro", unicode: 0x20ac, advanceWidth: 600, path: aPath });
  const font = new Font({
    familyName: "Gravit Test",
    styleName: "Medium",
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    createdTimestamp: 1600000000,
    designer: "Gravit",
    glyphs: [notdef, a, o, space, euro],
  });
  const family = font.names.fontFamily as Record<string, string>;
  family.de = "Gravit Prüfung";
  family.ar = "غرافيت";
  font.metas = { dlng: "Latn", slng: "Latn,Arab" };
  return font;
}

describe("font writer", () => {
  const expected = readFixture<WriterFixture>("tables-writer.json");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1700000000000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes the same bytes as the old fork", () => {
    const bytes = new Uint8Array(makeFont().toArrayBuffer());
    expect(bytes.length).toBe(expected.length);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(expected.sha256);
  });

  it("writes tables that parse back to the old values", () => {
    const font = parse(makeFont().toArrayBuffer());
    const plain = (v: unknown): unknown => JSON.parse(JSON.stringify(v));
    const cmap = font.tables.cmap as NonNullable<typeof font.tables.cmap>;
    expect(
      plain({
        head: font.tables.head,
        hhea: font.tables.hhea,
        os2: font.tables.os2,
        name: font.tables.name,
        meta: font.tables.meta,
        cmap: { format: cmap.format, map: cmap.glyphIndexMap },
      }),
    ).toEqual(
      plain({
        head: expected.head,
        hhea: expected.hhea,
        os2: expected.os2,
        name: expected.name,
        meta: expected.meta,
        cmap: expected.cmap,
      }),
    );
  });

  it("adds the ltag table for names without a Macintosh encoding", () => {
    const font = parse(makeFont().toArrayBuffer());
    expect((font.tables.name as Record<string, Record<string, string>>).fontFamily?.ar).toBe(
      "غرافيت",
    );
  });
});

describe("computeCheckSum", () => {
  it("pads to whole words and wraps at 2^32", () => {
    expect(computeCheckSum([0, 0, 1])).toBe(256);
    expect(computeCheckSum([0xff, 0xff, 0xff, 0xff, 0, 0, 0, 2])).toBe(1);
  });
});
