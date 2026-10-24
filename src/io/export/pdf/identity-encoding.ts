// Old: chunk.vendor.js module 1433 (GPDFIdentityEncoding).
import type { OpenTypeFont } from "../../../engine/text/fonts/open-type-font.ts";
import { PDFEncoding } from "./encoding.ts";
import { PDFGlyph } from "./glyph.ts";
import { PDFString } from "./pdf-string.ts";
import type { PDFTextEncodeOptions } from "./text-writer.ts";
import { PDFUnicode } from "./unicode.ts";

/**
 * Identity-H: text is shaped with the font (at 24 px) and written as
 * glyph ids, two bytes each, split where the shaping kerns (the kerning
 * goes between the strings, negated). Every glyph used is remembered for
 * the widths and the ToUnicode map.
 */
export class PDFIdentityEncoding extends PDFEncoding {
  declare _glyphMap: Record<number, PDFGlyph>;
  // Sic: the old name; it holds the engine font, whose own
  // `_openTypeFont` is the opentype.js font.
  declare _openTypeFont: OpenTypeFont;

  constructor(font: OpenTypeFont) {
    super();
    this._glyphMap = {};
    this._openTypeFont = font;
  }

  /** The glyphs used so far, by glyph id. */
  getGlyphs(): PDFGlyph[] {
    return Object.keys(this._glyphMap).map(
      (key) => this._glyphMap[key as unknown as number] as PDFGlyph,
    );
  }

  override encode(text: string, options?: PDFTextEncodeOptions): unknown[] {
    const out: unknown[] = [];
    let run: number[] | null = null;
    const glyphs = this._openTypeFont.stringToGlyphs(
      text,
      0,
      0,
      24,
      (options || {}) as Parameters<OpenTypeFont["stringToGlyphs"]>[4],
    );
    const count = glyphs.length - 1;
    for (let i = 0; i < count; ++i) {
      const placed = glyphs[i] as (typeof glyphs)[number] & { kerning?: number };
      const index = (placed.glyph as { index: number }).index;
      const glyph = PDFGlyph.from(this._openTypeFont._openTypeFont, index);
      if (glyph) {
        if (!this._glyphMap[glyph.cid]) this._glyphMap[glyph.cid] = glyph;
        if (!run) run = [];
        run.push(glyph.cid);
        if (placed.kerning) {
          out.push(PDFString.newFromBytes(PDFUnicode.encodeToUTF16BE(run)));
          out.push(-1 * placed.kerning);
          run = null;
        }
      }
    }
    if (run) out.push(PDFString.newFromBytes(PDFUnicode.encodeToUTF16BE(run)));
    return out;
  }

  override toString(): string {
    return "[GPDFIdentityEncoding]";
  }
}

Object.assign(PDFIdentityEncoding.prototype, { _glyphMap: null, _openTypeFont: null });
