// drawText keeps the outlines it shaped for a part (ShapedText) and draws
// them again while nothing they depend on changes. These tests check that
// a kept part draws exactly what shaping it again draws, and that every
// input of the outlines makes it shape again.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Transform } from "../math/transform.ts";
import type { Context2D } from "../paint/context-2d.ts";
import { Font } from "./fonts/font.ts";
import { FontManager } from "./fonts/font-manager.ts";
import { HarfBuzzFont } from "./fonts/harfbuzz.ts";
import { OpenTypeFont } from "./fonts/open-type-font.ts";
import { Formatting } from "./gtl/formatting.ts";
import { RenderFlags } from "./gtl/render-flags.ts";
import type { ShapedTextHolder } from "./gtl/run-draw.ts";
import { TextTransformer } from "./gtl/transformer-util.ts";
import { ShapedText, TLCanvasContext, type TLCanvasCore } from "./tl-canvas-context.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, "../../../assets/font");

const FILL = RenderFlags.RENDERFLAG_FILL | RenderFlags.RENDERFLAG_VERTEX;

function readFont(name: string): ArrayBuffer {
  const bytes = readFileSync(resolve(fontDir, name));
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/** Open Sans regular (400) and bold (700); `regularFile` replaces the 400 font's outlines. */
function makeFontManager(regularFile = "OpenSans-Regular.ttf"): FontManager {
  const manager = new FontManager();
  const regular = OpenTypeFont.create("Open Sans", Font.Style.Normal, 400, readFont(regularFile));
  const bold = OpenTypeFont.create(
    "Open Sans",
    Font.Style.Normal,
    700,
    readFont("OpenSans-Bold.ttf"),
  );
  manager._fonts.push(regular as OpenTypeFont, bold as OpenTypeFont);
  manager.setDefaultFont(regular as OpenTypeFont);
  return manager;
}

/** A context that only records calls. */
function recordingContext(): { ctx: Context2D; log: string[] } {
  const log: string[] = [];
  const target: Record<string, unknown> = { fillStyle: "#000000", strokeStyle: "#000000" };
  const ctx = new Proxy(target, {
    get(object, key: string) {
      if (key in object) return object[key];
      return (...args: unknown[]) => log.push(key + "(" + args.join(",") + ")");
    },
    set(object, key: string, value: unknown) {
      object[key] = value;
      log.push(key + "=" + String(value));
      return true;
    },
  });
  return { ctx: ctx as unknown as Context2D, log };
}

/** Moves every glyph 5 to the right, as a path or direction transformer moves glyphs. */
class ShiftTransformer extends TextTransformer {
  override getMatrix(): Transform {
    return new Transform(1, 0, 0, 1, 5, 0);
  }
}

interface Settings {
  manager: FontManager;
  font: string;
  text: string;
  x: number;
  y: number;
  scale: number;
  charSpacing: number;
  ligatures: boolean | undefined;
  stylisticSet: string | null;
  fractions: boolean;
  localizedForm: string | null;
  langScript: string | null;
  variant: string | null;
  underline: boolean;
  transformer: TextTransformer | null;
  mode: number;
}

let manager: FontManager;
let shapings = 0;
let original: OpenTypeFont["stringToGlyphs"];
let saved: [string, string, number];

function base(): Settings {
  return {
    manager,
    font: "normal 400 20px Open Sans",
    text: "Waffle",
    x: 3,
    y: 20,
    scale: 1,
    charSpacing: 0,
    ligatures: true,
    stylisticSet: null,
    fractions: false,
    localizedForm: null,
    langScript: null,
    variant: null,
    underline: false,
    transformer: null,
    mode: FILL,
  };
}

/** Draws the text as RunDraw.draw does and returns the canvas calls. */
function draw(settings: Settings, holder: ShapedTextHolder | null): string[] {
  const { ctx, log } = recordingContext();
  const core: TLCanvasCore = { _fontManager: settings.manager, requireFont() {} };
  const context = new TLCanvasContext(core, ctx);
  context.setScale(settings.scale, settings.scale);
  context.renderMode(settings.mode);
  context.font = settings.font;
  context.charSpacing = settings.charSpacing;
  context.textLigatures = settings.ligatures;
  context.textStylisticSet = settings.stylisticSet;
  context.textFractions = settings.fractions;
  context.textLocalizedForm = settings.localizedForm;
  context.langScript = settings.langScript;
  context.textVariant = settings.variant;
  context.textUnderline = settings.underline;
  context.textTransformer = settings.transformer;
  context.drawText(settings.text, settings.x, settings.y, 15, 60, holder);
  return log;
}

beforeAll(() => {
  manager = makeFontManager();
  const d = Formatting.defaultFormatting;
  saved = [d.fontFamily, d.fontStyle, d.fontWeight] as [string, string, number];
  d.fontFamily = "Open Sans";
  d.fontStyle = "normal";
  d.fontWeight = 400;
  original = OpenTypeFont.prototype.stringToGlyphs;
  OpenTypeFont.prototype.stringToGlyphs = function (this: OpenTypeFont, ...args) {
    shapings++;
    return original.apply(this, args);
  };
});

afterAll(() => {
  OpenTypeFont.prototype.stringToGlyphs = original;
  const d = Formatting.defaultFormatting;
  [d.fontFamily, d.fontStyle, d.fontWeight] = saved;
});

/** Draws until the holder keeps the path calls. */
function settle(settings: Settings, holder: ShapedTextHolder): string[] {
  draw(settings, holder);
  draw(settings, holder);
  const calls = draw(settings, holder);
  expect(holder._shaped).toBeInstanceOf(ShapedText);
  return calls;
}

describe("TLCanvasContext kept outlines", () => {
  it("draws a kept part without shaping it again, with the same calls", () => {
    const holder: ShapedTextHolder = { _shaped: null };
    const first = draw(base(), holder);
    expect(first.some((entry) => entry.startsWith("quadraticCurveTo("))).toBe(true);
    expect(draw(base(), holder)).toEqual(first);
    // Nothing is kept for a part drawn once or twice.
    expect(holder._shaped).not.toBeInstanceOf(ShapedText);
    expect(draw(base(), holder)).toEqual(first);
    const before = shapings;
    expect(draw(base(), holder)).toEqual(first);
    expect(draw(base(), holder)).toEqual(first);
    expect(shapings).toBe(before);
    expect(draw(base(), null)).toEqual(first);
  });

  it("keeps the calls of a stroke and an underline", () => {
    const holder: ShapedTextHolder = { _shaped: null };
    const stroke = {
      ...base(),
      underline: true,
      mode: RenderFlags.RENDERFLAG_STROKE | RenderFlags.RENDERFLAG_VERTEX,
    };
    settle(stroke, holder);
    const before = shapings;
    expect(draw(stroke, holder)).toEqual(draw(stroke, null));
    expect(shapings).toBe(before + 1);
  });

  it("draws the same at another scale", () => {
    const holder: ShapedTextHolder = { _shaped: null };
    settle(base(), holder);
    const scaled = { ...base(), scale: 2.5 };
    const before = shapings;
    expect(draw(scaled, holder)).toEqual(draw(scaled, null));
    expect(shapings).toBe(before + 1);
  });

  const changes: [string, Partial<Settings>][] = [
    ["the text", { text: "Wafflf" }],
    ["the x position", { x: 4 }],
    ["the y position", { y: 21 }],
    ["the weight", { font: "normal 700 20px Open Sans" }],
    ["the size", { font: "normal 400 21px Open Sans" }],
    ["the letter spacing", { charSpacing: 2 }],
    ["the ligatures", { ligatures: false }],
    ["the stylistic set", { stylisticSet: "ss01" }],
    ["the fractions", { fractions: true }],
    ["the localized form", { localizedForm: "TRK" }],
    ["the script", { langScript: "latn" }],
    ["the variant", { variant: '{"wght":700}' }],
  ];
  for (const [what, change] of changes) {
    it("shapes again after a change of " + what, () => {
      const holder: ShapedTextHolder = { _shaped: null };
      settle(base(), holder);
      const changed = { ...base(), ...change };
      const before = shapings;
      const kept = draw(changed, holder);
      expect(shapings).toBe(before + 1);
      expect(kept).toEqual(draw(changed, null));
      // And back: what was drawn for the change isn't drawn for the old settings.
      settle(changed, holder);
      expect(draw(base(), holder)).toEqual(draw(base(), null));
    });
  }

  it("shapes again with a replaced font", () => {
    const holder: ShapedTextHolder = { _shaped: null };
    const before = settle(base(), holder);
    // The same family, style and weight, now another font (other outlines).
    const replaced = { ...base(), manager: makeFontManager("OpenSans-Light.ttf") };
    const after = draw(replaced, holder);
    expect(after).toEqual(draw(replaced, null));
    expect(after).not.toEqual(before);
  });

  it("shapes again with the font once it has loaded", () => {
    const holder: ShapedTextHolder = { _shaped: null };
    // Bold isn't there yet: the context draws in the default font.
    const loading = makeFontManager();
    loading._fonts.splice(1, 1);
    const bold = { ...base(), font: "normal 700 20px Open Sans" };
    const fallback = settle({ ...bold, manager: loading }, holder);
    const loaded = draw(bold, holder);
    expect(loaded).toEqual(draw(bold, null));
    expect(loaded).not.toEqual(fallback);
  });

  it("shapes again after variations were set on a font", () => {
    const holder: ShapedTextHolder = { _shaped: null };
    settle(base(), holder);
    const before = shapings;
    HarfBuzzFont.variationsSet++;
    expect(draw(base(), holder)).toEqual(draw(base(), null));
    expect(shapings).toBe(before + 2);
  });

  it("doesn't keep outlines a text transformer placed", () => {
    const holder: ShapedTextHolder = { _shaped: null };
    settle(base(), holder);
    const shifted = { ...base(), transformer: new ShiftTransformer(null) };
    const after = draw(shifted, holder);
    expect(after).toEqual(draw(shifted, null));
    expect(after).not.toEqual(draw(base(), null));
    // Nor are transformed outlines kept for a later draw without one.
    draw(shifted, holder);
    draw(shifted, holder);
    expect(draw(base(), holder)).toEqual(draw(base(), null));
  });

  it("doesn't keep outlines it only collects", () => {
    const holder: ShapedTextHolder = { _shaped: null };
    const collect = { ...base(), mode: RenderFlags.RENDERFLAG_VERTEX };
    draw(collect, holder);
    draw(collect, holder);
    draw(collect, holder);
    expect(holder._shaped).toBe(null);
  });

  it("keeps the most recently drawn parts within the limit", () => {
    const limit = ShapedText.keptLimit;
    try {
      const first: ShapedTextHolder = { _shaped: null };
      const second: ShapedTextHolder = { _shaped: null };
      const third: ShapedTextHolder = { _shaped: null };
      for (const [holder, shaped] of ShapedText.kept) ShapedText.release(holder, shaped);
      expect(ShapedText.keptSize).toBe(0);
      settle(base(), first);
      const size = (first._shaped as ShapedText).ops.length;
      // Room for two of the three.
      ShapedText.keptLimit = 2 * size + 1;
      settle({ ...base(), x: 30 }, second);
      draw(base(), first);
      settle({ ...base(), x: 60 }, third);
      expect(second._shaped).not.toBeInstanceOf(ShapedText);
      expect(first._shaped).toBeInstanceOf(ShapedText);
      expect(third._shaped).toBeInstanceOf(ShapedText);
      expect(ShapedText.keptSize).toBeLessThanOrEqual(ShapedText.keptLimit);
      const moved = { ...base(), x: 30 };
      expect(draw(moved, second)).toEqual(draw(moved, null));
    } finally {
      ShapedText.keptLimit = limit;
    }
  });
});
