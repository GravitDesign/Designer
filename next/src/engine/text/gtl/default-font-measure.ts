// Old: chunk.vendor.js module 928 (the GTL default font meter).
import type { Font } from "../fonts/font.ts";
import type { FontManager } from "../fonts/font-manager.ts";
import { Measurement } from "./measurement.ts";
import { TLUtil } from "./tl-util.ts";

/** The OpenType font tables the meter reads. */
interface FontTables {
  _openTypeFont: { unitsPerEm: number; ascender: number; descender: number };
}

/**
 * Measures a text with the default font, character by character with
 * pair advances. Unused by the layout (TLCore installs the OpenType
 * meter), kept with its module. The ink height it computes is unused.
 */
function measureWithDefaultFont(text: string, style: string): Measurement {
  const result = new Measurement();
  const font = TLUtil.parseFont(TLUtil.cssProperty(style, "font") as string);
  const defaultFont = (measureWithDefaultFont.fontManager as FontManager).getDefaultFont() as Font &
    FontTables;
  if (!defaultFont.isResolved()) return result;
  const size = font.fontSize;
  const scale = (1 / defaultFont._openTypeFont.unitsPerEm) * size;
  let width = 0;
  const length = text.length;
  let inkHeight = 0;
  for (let i = 0; i < length; i++) {
    width += defaultFont.getAdvance(size, text.charAt(i), i > 0 ? text.charAt(i - 1) : null);
    const box = defaultFont.getGlyphBoundingRect(size, text.charAt(i));
    inkHeight = Math.max(inkHeight, box.getHeight());
  }
  result.width = width;
  result.ascent = defaultFont._openTypeFont.ascender * scale;
  result.height = defaultFont.getMaxFontHeight(size);
  result.descent = -defaultFont._openTypeFont.descender * scale;
  return result;
}

/** The font manager whose default font is measured; TLCore.initialize sets it once. */
measureWithDefaultFont.fontManager = null as FontManager | null;

export const defaultFontMeasure = measureWithDefaultFont;
