// Old: chunk.vendor.js module 416 (the GTL OpenType text meter).
import type { Font } from "../fonts/font.ts";
import type { FontManager } from "../fonts/font-manager.ts";
import type { GlyphOptions, OpenTypeFont } from "../fonts/open-type-font.ts";
import { Formatting } from "./formatting.ts";
import { Measurement } from "./measurement.ts";
import type { AdditionalProps } from "./run-draw.ts";
import { TLUtil } from "./tl-util.ts";

/** The OpenType font tables the meter reads. */
interface FontTables {
  _openTypeFont: { unitsPerEm: number; ascender: number; descender: number };
}

/**
 * Measures a text with the font of a CSS style through the font's glyphs:
 * the advance width (pen position after the last glyph, with letter
 * spacing and kerning), the font's ascent, descent and height, and the
 * ink extents of the glyphs. Super- and subscript take their metrics from
 * the run's full font size. Returns null while the font isn't resolved,
 * or when there is no font manager.
 */
function measureText(
  text: string,
  style: string,
  props?: AdditionalProps | null,
  fontManager?: FontManager | null,
): Measurement | null {
  const result = new Measurement();
  const font = TLUtil.parseFont(TLUtil.cssProperty(style, "font") as string);
  if (!(fontManager = fontManager || measureText.fontManager)) return null;
  const otFont = fontManager.getFont(
    font.fontFamily,
    font.fontStyle as string,
    font.fontWeight as number,
  ) as Font & FontTables;
  if (!otFont.isResolved()) return null;
  let transformation: string | null | undefined;
  let script: string | undefined;
  let runFontSize: number | undefined;
  let langScript: string | null | undefined;
  let variant: string | null | undefined;
  const fontSize = font.fontSize;
  const scale = (1 / otFont._openTypeFont.unitsPerEm) * fontSize;
  let maxY = -Number.MAX_VALUE;
  let maxX = -Number.MAX_VALUE;
  let minY = Number.MAX_VALUE;
  let minX = Number.MAX_VALUE;
  let letterSpacing = 0;
  let ligatures = Formatting.defaultFormatting.ligatures;
  let fractions = Formatting.defaultFormatting.fractions;
  let stylisticSet = Formatting.defaultFormatting.stylisticSet;
  let localizedForm = Formatting.defaultFormatting.localizedForm;
  if (props) {
    letterSpacing = props.charSpacing;
    transformation = props.transformation;
    script = props.script;
    langScript = props.langScript && "auto" !== props.langScript ? props.langScript : null;
    variant = props.variant || Formatting.defaultFormatting.variant;
    runFontSize = props.fontSize;
    ligatures =
      void 0 === props.ligatures ? Formatting.defaultFormatting.ligatures : props.ligatures;
    fractions =
      void 0 === props.fractions ? Formatting.defaultFormatting.fractions : props.fractions;
    stylisticSet =
      void 0 === props.stylisticSet
        ? Formatting.defaultFormatting.stylisticSet
        : props.stylisticSet;
    localizedForm =
      void 0 === props.localizedForm
        ? Formatting.defaultFormatting.localizedForm
        : props.localizedForm;
  }
  if (transformation) text = TLUtil.transformText(text, transformation, otFont);
  result.ascent = otFont._openTypeFont.ascender * scale;
  result.height = otFont.getMaxFontHeight(fontSize);
  result.descent = -otFont._openTypeFont.descender * scale;
  if (script && runFontSize) {
    switch (script) {
      case "sub":
      case "super": {
        const runScale = (1 / otFont._openTypeFont.unitsPerEm) * runFontSize;
        result.ascent = otFont._openTypeFont.ascender * runScale;
        result.height = otFont.getMaxFontHeight(runFontSize);
        result.descent = -otFont._openTypeFont.descender * runScale;
      }
    }
  }
  const options: GlyphOptions = {
    letterSpacing,
    kerning: true,
    direction: "ltr",
    features: {
      liga: ligatures,
      rlig: ligatures,
      frac: true === fractions,
      stylisticSet,
    } as GlyphOptions["features"],
  };
  if (localizedForm) options.language = localizedForm;
  if (langScript) options.script = langScript;
  if (variant) options.variant = variant;
  const glyphs = (otFont as unknown as OpenTypeFont).stringToGlyphs(text, 0, 0, fontSize, options);
  const last = glyphs.length - 1;
  for (let i = 0; i < last; i++) {
    const glyph = glyphs[i] as (typeof glyphs)[number];
    const box = otFont.getGlyphBoundingRect(fontSize, glyph.glyph, true);
    result.descent = Math.max(result.descent, box.getY() + box.getHeight());
    const area = box.getWidth() * box.getHeight();
    if (0 !== area && !Number.isNaN(area) && Number.isFinite(area)) {
      maxY = Math.max(maxY, box.getY() + box.getHeight());
      minY = Math.min(minY, box.getY());
      minX = Math.min(minX, glyph.x + box.getX());
      maxX = Math.max(maxX, glyph.x + box.getX() + box.getWidth());
    }
    const advance = (glyphs[i + 1] as (typeof glyphs)[number]).x - glyph.x;
    if (i === last - 1) {
      result.lastGlyphWidth = box.getX() + box.getWidth();
      result.lastGlyphAdvance = advance;
    }
  }
  result.width = (glyphs[last] as (typeof glyphs)[number]).x;
  result.minY = Number.isNaN(minY) ? Number.MAX_VALUE : minY;
  result.maxY = Number.isNaN(maxY) ? -Number.MAX_VALUE : maxY;
  result.minX = Number.isNaN(minX) ? Number.MAX_VALUE : minX;
  result.maxX = Number.isNaN(maxX) ? -Number.MAX_VALUE : maxX;
  if (
    result.minY !== Number.MAX_VALUE &&
    result.maxY !== -Number.MAX_VALUE &&
    result.maxY - result.minY > result.height
  ) {
    console.warn("open type measure: wrong metrics");
  }
  return result;
}

/** The font manager the meter falls back to; TLCore.initialize sets it once. */
measureText.fontManager = null as FontManager | null;

/** The OpenType text meter (TLCore.textMeter). */
export const openTypeMeasure = measureText;
