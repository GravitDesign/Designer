// Old: chunk.vendor.js module 1434 (GPDFGlyph).
import type { Font as OpenTypeJsFont } from "../../../engine/text/opentype/font.ts";

/** A glyph used by a CID font: its id (the glyph index), width in 1/1000 em and code point. */
export class PDFGlyph {
  declare cid: number;
  declare width: number;
  declare unicode: number | undefined;

  constructor(cid: number, width: number, unicode: number | undefined) {
    this.cid = cid;
    this.width = width;
    this.unicode = unicode;
  }

  static from(font: OpenTypeJsFont, index: number): PDFGlyph | null {
    const glyph = font.glyphs.get(index) as
      { advanceWidth?: number; unicode?: number } | null | undefined;
    return glyph
      ? new PDFGlyph(
          index,
          Math.ceil((1e3 * (glyph.advanceWidth as number)) / headOf(font).unitsPerEm),
          glyph.unicode,
        )
      : null;
  }

  toString(): string {
    return "[GPDFGlyph]";
  }
}

Object.assign(PDFGlyph.prototype, { cid: 0, width: 0, unicode: 0 });

function headOf(font: OpenTypeJsFont): { unitsPerEm: number } {
  return (font.tables as unknown as { head: { unitsPerEm: number } }).head;
}
