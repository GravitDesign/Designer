import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { probeFonts } from "./font-probe.ts";
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
    probeFonts({ GOpenTypeFont: OpenTypeFont, GOpenTypeUtil: OpenTypeUtil, readFont }),
  ),
) as Record<string, Record<string, unknown>>;

describe("OpenTypeUtil", () => {
  it("reads names, weights and styles like the old reader", () => {
    expect(actual.info).toEqual(expected.info);
  });

  it("finds the fonts of a collection and patches their offsets", () => {
    expect(actual.collection).toEqual(expected.collection);
  });

  it("handles truncated and missing data like the old reader", () => {
    expect(actual.odd).toEqual(expected.odd);
  });

  it("reports weight 400 for OpenSans SemiBoldItalic (subfamily only)", () => {
    const info = OpenTypeUtil.getOpenTypeInfo(readFont("OpenSans-SemiBoldItalic.ttf"));
    expect(info).toMatchObject({ name: "Open Sans Semibold", weight: 400, style: "I" });
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
