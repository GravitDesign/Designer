// Old: chunk.vendor.js module 715 (opentype.js tables/hmtx.js, unchanged).
// The hmtx table: advance width and left side bearing of every glyph.

import type { Glyph } from "../glyph.ts";
import type { GlyphSet } from "../glyphset.ts";
import { Parser } from "../parse.ts";
import { Table } from "../table.ts";

/**
 * Sets advanceWidth and leftSideBearing on the glyphs. Glyphs after the
 * last metric (monospaced tails) reuse the last one.
 */
export function parse(
  data: DataView,
  start: number,
  numMetrics: number,
  numGlyphs: number,
  glyphs: GlyphSet,
): void {
  let advanceWidth: number | undefined;
  let leftSideBearing: number | undefined;
  const p = new Parser(data, start);
  for (let i = 0; i < numGlyphs; i += 1) {
    if (i < numMetrics) {
      advanceWidth = p.parseUShort();
      leftSideBearing = p.parseShort();
    }
    const glyph = glyphs.get(i) as Glyph;
    glyph.advanceWidth = advanceWidth as number;
    glyph.leftSideBearing = leftSideBearing as number;
  }
}

export function make(glyphs: GlyphSet): Table {
  const t = new Table("hmtx", []);
  for (let i = 0; i < glyphs.length; i += 1) {
    const glyph = glyphs.get(i) as Glyph;
    const advanceWidth = glyph.advanceWidth || 0;
    const leftSideBearing = glyph.leftSideBearing || 0;
    t.fields.push({ name: "advanceWidth_" + i, type: "USHORT", value: advanceWidth });
    t.fields.push({ name: "leftSideBearing_" + i, type: "SHORT", value: leftSideBearing });
  }
  return t;
}
