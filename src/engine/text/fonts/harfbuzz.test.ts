import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DIRECTIONS,
  HarfBuzz,
  HarfBuzzBuffer,
  SCRIPTS,
  createFontFromArrayBuffer,
  scriptNameToOpenTypeScriptTagString,
  stringTagToName,
  stringToTag,
  tagToName,
  variationsByteSize,
} from "./harfbuzz.ts";

const here = dirname(fileURLToPath(import.meta.url));
const arabic = readFileSync(
  resolve(here, "../../../../assets/font/noto/NotoSansArabic-Regular.ttf"),
);

function shape(text: string, size: number, stylisticSet?: string) {
  const font = createFontFromArrayBuffer(new Uint8Array(arabic).buffer);
  font.setScale(size);
  if (stylisticSet) font.setStylistcSet(stylisticSet);
  const buffer = new HarfBuzzBuffer(text);
  try {
    return font
      .getGlyphs(buffer)
      .map((g) => [g.codepoint, g.cluster, g.xAdvance, g.yAdvance, g.xOffset, g.yOffset]);
  } finally {
    buffer.destroy();
  }
}

describe("HarfBuzz 2.2.0 shaping", () => {
  it("shapes Arabic like the old asm.js build (newer HarfBuzz rounds the last advance to 10)", () => {
    // Recorded from vendor module 998; harfbuzzjs (HarfBuzz 15) gives 10
    // for the last glyph's advance at this size.
    expect(shape("مرحبا بالعالم", 20)).toEqual([
      [533, 23, 11, 0, 0, 0],
      [510, 21, 5, 0, 0, 0],
      [9, 19, 6, 0, 0, 0],
      [356, 17, 10, 0, 0, 0],
      [510, 15, 5, 0, 0, 0],
      [9, 13, 6, 0, 0, 0],
      [38, 11, 5, 0, 0, 0],
      [3, 10, 5, 0, 0, 0],
      [9, 8, 6, 0, 0, 0],
      [37, 6, 7, 0, 0, 0],
      [158, 4, 11, 0, 0, 0],
      [239, 2, 8, 0, 0, 0],
      [535, 0, 11, 0, 0, 0],
    ]);
  });

  it("reports clusters as UTF-8 byte offsets", () => {
    expect(shape("لا", 100).map((g) => g[1])).toEqual([0]);
    expect(shape("ab", 100).map((g) => g[1])).toEqual([0, 1]);
    expect(shape("éa", 100).map((g) => g[1])).toEqual([0, 2]);
  });
});

describe("HarfBuzzBuffer", () => {
  it("guesses script, direction and language from the text", () => {
    const buffer = new HarfBuzzBuffer("שלום");
    expect(tagToName(buffer.getScript())).toBe("HEBREW");
    expect(buffer.getDirection()).toBe("rtl");
    expect(buffer.directionForScript(buffer.getScript())).toBe(DIRECTIONS.RTL);
    // The default language of a C locale, as in the old build.
    expect(buffer.getLanguage()).toBe("c");
    buffer.setLanguage("de");
    expect(buffer.getLanguage()).toBe("de");
    buffer.setDirection("ttb");
    expect(buffer.getDirection()).toBe("ttb");
    buffer.destroy();
  });

  it("treats a text of halfwidth forms without a script as Katakana", () => {
    const buffer = new HarfBuzzBuffer("！");
    expect(buffer.getScript()).toBe(SCRIPTS.KATAKANA);
    buffer.destroy();
    const digits = new HarfBuzzBuffer("123");
    expect(digits.getScript()).toBe(SCRIPTS.INVALID);
    digits.destroy();
  });

  it("validates scripts like the old wrapper", () => {
    const buffer = new HarfBuzzBuffer("abc");
    expect(() => buffer.setScript("Latn" as unknown as number)).toThrow("32bit integer");
    expect(() => buffer.setScript(12345)).toThrow("Unknown script type");
    buffer.setScript(SCRIPTS.ARABIC as number);
    expect(buffer.getScript()).toBe(SCRIPTS.ARABIC);
    buffer.destroy();
    const empty = new HarfBuzzBuffer("");
    expect(() => empty.getScript()).toThrow("Text not set");
    empty.destroy();
  });
});

describe("tags", () => {
  it("converts between names, tags and tag strings", () => {
    expect(stringToTag("arab")).toBe(0x61726162);
    expect(() => stringToTag("DEU")).toThrow(TypeError);
    expect(tagToName(SCRIPTS.HAN as number)).toBe("HAN");
    expect(tagToName(1)).toBe(null);
    expect(stringTagToName("arab")).toBe("ARABIC");
    expect(stringTagToName("DFLT")).toBe(null);
    expect(stringTagToName("lao")).toBe(null);
    expect(scriptNameToOpenTypeScriptTagString("CYRILLIC")).toBe("cyrl");
    expect(scriptNameToOpenTypeScriptTagString("NOPE")).toBe("\0\0\0\0");
  });

  it("keeps the static entity shape and the BBT typo", () => {
    expect(() => (HarfBuzz as unknown as () => void)()).toThrow("static entity");
    expect(HarfBuzz.Buffer).toBe(HarfBuzzBuffer);
    expect(DIRECTIONS.BBT).toBe("bbt");
  });
});

describe("BUG-001: HarfBuzz variations memory", () => {
  it("allocates a tag and a float per axis", () => {
    expect(variationsByteSize({})).toBe(0);
    expect(variationsByteSize({ wght: 700 })).toBe(8);
    expect(variationsByteSize({ wght: 700, wdth: 100, opsz: 12 })).toBe(24);
  });
});
