import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FULL_PROBE, probeFonts } from "./font-probe.ts";
import { OpenTypeFont, TextDirection } from "./open-type-font.ts";
import { OpenTypeUtil } from "./open-type-util.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, "../../../../../public/assets/font");

function readFont(name: string): ArrayBuffer {
  const bytes = readFileSync(resolve(fontDir, name));
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/** Recorded with font-probe.ts from the old bundle (GOpenTypeFont, GOpenTypeUtil, HarfBuzz 2.2.0 asm.js). */
const expected = JSON.parse(
  readFileSync(resolve(here, "__fixtures__/old-fonts.json"), "utf8"),
) as Record<string, Record<string, unknown>>;

// One run for all tests: the probe goes through every bundled test font.
const actual = JSON.parse(
  JSON.stringify(
    probeFonts({ GOpenTypeFont: OpenTypeFont, GOpenTypeUtil: OpenTypeUtil, readFont }, FULL_PROBE),
  ),
) as Record<string, Record<string, unknown>>;

/**
 * The weights the old reader got wrong: it read them from the subfamily
 * name (id 2) alone, which is "Regular" or "Italic" for these fonts
 * (BUGS-FIXED.md "BUG-015 Fonts whose weight is only in the typographic
 * subfamily get weight 400"). The test collection's first font is
 * OpenSans-Light.
 */
const FIXED_WEIGHTS: Record<string, number> = {
  "OpenSans-Light.ttf": 300,
  "OpenSans-LightItalic.ttf": 300,
  "OpenSans-SemiBold.ttf": 600,
  "OpenSans-SemiBoldItalic.ttf": 600,
  "OpenSans-ExtraBold.ttf": 800,
  "OpenSans-ExtraBoldItalic.ttf": 800,
  "noto/NotoSansCJKkr-Bold.otf": 700,
};

/** The old recording with the fixed weights. */
function fixedExpected(): Record<string, Record<string, unknown>> {
  type Listed = [string, number, ...unknown[]][];
  const out = JSON.parse(JSON.stringify(expected)) as {
    info: Record<string, { info: { weight: number }; listed: Listed }>;
    collection: { listed: Listed };
    collectionReversed: { listed: Listed };
    collectionTables: Listed;
  };
  for (const [file, weight] of Object.entries(FIXED_WEIGHTS)) {
    const entry = out.info[file] as { info: { weight: number }; listed: Listed };
    expect(entry.info.weight, file).toBe(400);
    entry.info.weight = weight;
    (entry.listed[0] as Listed[number])[1] = weight;
  }
  for (const listed of [
    out.collection.listed,
    out.collectionReversed.listed,
    out.collectionTables,
  ]) {
    expect(listed[0]?.[1]).toBe(400);
    (listed[0] as Listed[number])[1] = 300;
  }
  return out as unknown as Record<string, Record<string, unknown>>;
}

describe("OpenTypeUtil", () => {
  const fixed = fixedExpected();

  it("reads names and styles like the old reader, weights also from the typographic subfamily (BUG-015)", () => {
    expect(actual.info).toEqual(fixed.info);
  });

  it("finds the fonts of a collection and patches their offsets", () => {
    expect(actual.collection).toEqual(fixed.collection);
  });

  it("cuts collection fonts out with table offsets relative to the font", () => {
    expect(actual.collectionTables).toEqual(fixed.collectionTables);
    expect(actual.collectionReversed).toEqual(fixed.collectionReversed);
  });

  it("reads the sfnt resources and their names from a Mac resource fork", () => {
    expect(actual.resourceFork).toEqual(expected.resourceFork);
  });

  it("checks every part the probe recorded", () => {
    expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  });

  it("handles truncated and missing data like the old reader", () => {
    expect(actual.odd).toEqual(expected.odd);
  });

  it("reports weight 600 for OpenSans SemiBoldItalic from its typographic subfamily (BUG-015)", () => {
    const info = OpenTypeUtil.getOpenTypeInfo(readFont("OpenSans-SemiBoldItalic.ttf"));
    expect(info).toMatchObject({ name: "Open Sans Semibold", weight: 600, style: "I" });
    expect(OpenTypeUtil.getOpenTypeInfo(readFont("OpenSans-Light.ttf"))).toMatchObject({
      weight: 300,
      style: "N",
    });
    expect(OpenTypeUtil.getOpenTypeInfo(readFont("OpenSans-ExtraBold.ttf"))).toMatchObject({
      weight: 800,
    });
  });
});

describe("OpenTypeFont statics", () => {
  it("detects direction and script per string", () => {
    expect(actual.direction).toEqual(expected.direction);
    expect(actual.script).toEqual(expected.script);
    expect(OpenTypeFont.getDirectionForString("مرحبا")).toBe(TextDirection.RTL);
  });

  it("maps language and script tags", () => {
    expect(actual.bcp47).toEqual(expected.bcp47);
    expect(actual.scriptTags).toEqual(expected.scriptTags);
  });
});

describe("OpenTypeFont glyph API and shaping", () => {
  const fonts = expected.fonts as Record<string, Record<string, unknown> | null>;
  const actualFonts = actual.fonts as Record<string, Record<string, unknown> | null>;
  for (const name of Object.keys(fonts)) {
    it(name + ": metrics, outlines and features", () => {
      const withoutShaping = (entry: Record<string, unknown> | null | undefined) =>
        Object.fromEntries(Object.entries(entry ?? {}).filter(([key]) => key !== "shaping"));
      expect(withoutShaping(actualFonts[name])).toEqual(withoutShaping(fonts[name]));
    });
    it(name + ": stringToGlyphs (HarfBuzz and opentype.js paths)", () => {
      expect(actualFonts[name]?.shaping).toEqual(fonts[name]?.shaping);
    });
  }
});
