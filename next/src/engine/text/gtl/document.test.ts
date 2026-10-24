import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installFakeCanvas } from "../../paint/testing/fake-canvas.ts";
import { FontManager, type ResolveFontEvent } from "../fonts/font-manager.ts";
import { OpenTypeFont } from "../fonts/open-type-font.ts";
import { defaultFontMeasure } from "./default-font-measure.ts";
import { probeGtlDocument } from "./gtl-document-probe.ts";
import { registerStylable } from "./late-bound.ts";
import { TLCodes } from "./tl-codes.ts";
import { TLCore } from "./tl-core.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fontFile = resolve(here, "../../../../../public/assets/font/OpenSans-Regular.ttf");

/** Recorded from the old app with gtl-document-probe.ts (old modules 367, 920 and 928). */
const expected = JSON.parse(
  readFileSync(resolve(here, "__fixtures__/old-gtl-document.json"), "utf8"),
) as Record<string, Record<string, unknown> | unknown[]>;

/**
 * The undo cases as the port gives them: the inverse of a splice puts the
 * removed words back where they were (BUGS-FIXED.md "BUG-025 Text core
 * undo splices at the start and rolls back in a cascade").
 */
const fixed = JSON.parse(
  readFileSync(resolve(here, "__fixtures__/old-gtl-document.fixed.json"), "utf8"),
) as { bug: string; undo: Record<string, unknown[]> };

let actual: typeof expected;
let uninstall: () => void;

beforeAll(() => {
  uninstall = installFakeCanvas();
  registerStylable({
    PropertySetInfo: {
      T: { geometryProperties: { _tfi: 20, _fc: undefined, _tcs: null, _tws: null } },
      P: { geometryProperties: { _plh: 1, _pal: null } },
    },
    PropertySet: { Text: "T", Paragraph: "P" },
    ParagraphAlignment: { Left: "l", Center: "c", Right: "r", Justify: "j" },
    BorderAlignment: { Inside: "I", Outside: "O" },
  });
  const bytes = readFileSync(fontFile);
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  const fontManager = new FontManager();
  const font = OpenTypeFont.create("Open Sans", "N", 400, buffer) as OpenTypeFont;
  fontManager._fonts.push(font);
  fontManager.setDefaultFont(font);
  fontManager.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
    event.failed();
  });
  const result = probeGtlDocument({ TLCore, TLCodes, defaultFontMeasure, fontManager });
  result.defaultFont = [font.getFamily(), font.getStyle(), font.getWeight()] as unknown as Record<
    string,
    unknown
  >;
  actual = JSON.parse(JSON.stringify(result)) as typeof expected;
}, 120_000);

afterAll(() => {
  uninstall();
});

describe("the GTL document against the old engine", () => {
  it("measures with the same default font", () => {
    expect(actual.defaultFont).toEqual(expected.defaultFont);
  });

  // The old inverse of a splice got the document as its start, so undo
  // broke the word list and the failed layouts rolled back until the undo
  // log was empty. Now undo restores the text before the edit and redo the
  // edited one, without any rollback (BUG-025).
  type Step = { words?: string[]; frame?: boolean; plain?: string; log?: { rollbacks: number } };
  for (const name of Object.keys(expected.undo as Record<string, unknown>)) {
    it(`undoes and redoes ${name} (BUG-025)`, () => {
      const steps = (actual.undo as Record<string, Step[]>)[name] as Step[];
      expect(steps).toEqual(fixed.undo[name]);
      const old = (expected.undo as Record<string, Step[]>)[name] as Step[];
      expect(old.some((step) => step.frame === false)).toBe(true);
      expect(steps.every((step) => step.frame !== false)).toBe(true);
      expect(steps.every((step) => !step.log || step.log.rollbacks === 0)).toBe(true);
    });
  }

  it("undoes a setText back to the text before it (BUG-025)", () => {
    const steps = (actual.undo as Record<string, Step[]>).setText as Step[];
    expect(steps[4]?.plain).toBe(steps[0]?.plain);
    expect(steps[6]?.plain).toBe("re me now");
  });

  for (const name of Object.keys(expected.filters as Record<string, unknown>)) {
    it(`repairs list codes: ${name}`, () => {
      expect((actual.filters as Record<string, unknown>)[name]).toEqual(
        (expected.filters as Record<string, unknown>)[name],
      );
    });
  }

  for (const name of Object.keys(expected.failures as Record<string, unknown>)) {
    it(`fails to load, splice or lay out: ${name}`, () => {
      expect((actual.failures as Record<string, unknown>)[name]).toEqual(
        (expected.failures as Record<string, unknown>)[name],
      );
    });
  }

  it("looks code names up like the old GTLCodes function object", () => {
    expect(actual.codeNames).toEqual(expected.codeNames);
  });

  it("numbers list items past the letter and roman tables", () => {
    expect(actual.numbering).toEqual(expected.numbering);
  });

  it("measures with the default font meter", () => {
    expect(actual.defaultMeter).toEqual(expected.defaultMeter);
  });
});
