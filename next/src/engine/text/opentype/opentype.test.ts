import { describe, expect, it } from "vitest";
import { parse, parseTableEntries, setInflate } from "./opentype.ts";
import { readFixture, readTestFont } from "./test-fonts.ts";

type Attempt<T> = { ok: T } | { error: string };

interface CoreFixture {
  tableEntries: Record<string, Attempt<unknown[]>>;
  parseErrors: Record<string, Attempt<string>>;
  openSansTags: string[];
  morx: Attempt<{ hasGHBTables: boolean; gsub: boolean }>;
  noCmap: Attempt<string>;
  noOutlines: Attempt<string>;
  dataView: Attempt<{ numGlyphs: number; unitsPerEm: number }>;
  numGlyphsClamp: Attempt<{ maxp: number; numGlyphs: number; glyphs: number }>;
  woff: {
    numGlyphs: number;
    outlinesFormat: string;
    unitsPerEm: number;
    family: Record<string, string>;
    path: string;
  };
}

const fixture = readFixture<CoreFixture>("core.json");

function attempt<T>(fn: () => T): Attempt<T> {
  try {
    return { ok: fn() };
  } catch (e) {
    return { error: String((e as Error).message || e) };
  }
}

/** A copy of the font with every table tag `from` in the directory renamed to `to`. */
function retag(name: string, from: string, to: string): ArrayBuffer {
  const buffer = readTestFont(name);
  const view = new DataView(buffer);
  const numTables = view.getUint16(4);
  for (let i = 0; i < numTables; i++) {
    const p = 12 + i * 16;
    let tag = "";
    for (let k = 0; k < 4; k++) tag += String.fromCharCode(view.getUint8(p + k));
    if (tag === from) {
      for (let k = 0; k < 4; k++) view.setUint8(p + k, to.charCodeAt(k));
    }
  }
  return buffer;
}

describe("parseTableEntries", () => {
  it("reads the table directory of TTF, OTF and WOFF files like the old code", () => {
    for (const [name, expected] of Object.entries(fixture.tableEntries)) {
      expect(
        attempt(() => parseTableEntries(readTestFont(name))),
        name,
      ).toEqual(JSON.parse(JSON.stringify(expected)));
    }
  });
});

describe("parse", () => {
  it("rejects files that are not OpenType, TrueType or WOFF with the old messages", () => {
    for (const [name, expected] of Object.entries(fixture.parseErrors)) {
      expect(
        attempt(() => {
          parse(readTestFont(name));
          return "parsed";
        }),
        name,
      ).toEqual(expected);
    }
  });

  it("marks fonts with a morx table for HarfBuzz", () => {
    const morx = attempt(() => {
      const font = parse(retag("OpenSans-Regular.ttf", "GSUB", "morx"));
      return { hasGHBTables: font.hasGHBTables, gsub: !!font.tables.gsub };
    });
    expect(morx).toEqual(fixture.morx);
    expect(parse(readTestFont("OpenSans-Regular.ttf")).hasGHBTables).toBeUndefined();
  });

  it("throws without a cmap table and without outlines", () => {
    expect(
      attempt(() => {
        parse(retag("OpenSans-Regular.ttf", "cmap", "xxxx"));
        return "parsed";
      }),
    ).toEqual(fixture.noCmap);
    expect(
      attempt(() => {
        parse(retag("OpenSans-Regular.ttf", "glyf", "xxxx"));
        return "parsed";
      }),
    ).toEqual(fixture.noOutlines);
  });

  it("accepts a DataView", () => {
    const font = parse(new DataView(readTestFont("OpenSans-Regular.ttf")));
    expect({ ok: { numGlyphs: font.numGlyphs, unitsPerEm: font.unitsPerEm } }).toEqual(
      fixture.dataView,
    );
  });

  it("reads a font whose maxp claims more glyphs", () => {
    const result = attempt(() => {
      const buffer = readTestFont("gravit-designer.ttf");
      const view = new DataView(buffer);
      const maxp = parseTableEntries(buffer).find((entry) => entry.tag === "maxp");
      const offset = (maxp as { offset: number }).offset;
      const count = view.getUint16(offset + 4);
      view.setUint16(offset + 4, count + 5);
      const font = parse(buffer);
      return { maxp: count + 5, numGlyphs: font.numGlyphs, glyphs: font.glyphs.length };
    });
    expect(result).toEqual(fixture.numGlyphsClamp);
  });

  it("inflates WOFF tables with pako", () => {
    const font = parse(readTestFont("gravit-designer.woff"));
    expect({
      numGlyphs: font.numGlyphs,
      outlinesFormat: font.outlinesFormat,
      unitsPerEm: font.unitsPerEm,
      family: font.names.fontFamily,
      path: (font.glyphs.get(3) as NonNullable<ReturnType<typeof font.glyphs.get>>)
        .getPath(0, 0, 100)
        .toPathData(3),
    }).toEqual(fixture.woff);
  });

  it("fails when a WOFF table inflates to the wrong length", () => {
    setInflate((data) => data.slice(0, 3));
    try {
      expect(() => parse(readTestFont("gravit-designer.woff"))).toThrow(
        /^Decompression error: \S{4} decompressed length doesn't match recorded length$/,
      );
    } finally {
      setInflate(null);
    }
  });
});
