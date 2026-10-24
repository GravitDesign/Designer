// Old: chunk.vendor.js module 654 (a laid out line, carota's line.js).
import type { Part } from "./inline.ts";
import { TLNode } from "./node.ts";
import { PositionedWord } from "./positioned-word.ts";
import { TLRect } from "./rect.ts";
import type { Word } from "./word.ts";

/**
 * A line of words at a baseline. The constructor aligns the words: right
 * and center shift them, justify spreads the free width over the gaps
 * (not on a paragraph's last line). The last word's trailing spaces don't
 * count, the letter spacing after the last character is given back, and
 * so is the spacing padding of lines that don't wrap.
 */
export class Line extends TLNode {
  doc: TLNode | null = null;
  left: number | null = null;
  width = NaN;
  baseline = 0;
  ascent = 0;
  descent = 0;
  minY = Number.MAX_VALUE;
  maxY = -Number.MAX_VALUE;
  minX = Number.MAX_VALUE;
  maxX = -Number.MAX_VALUE;
  align: string | null = null;
  lineSpacing: number | string = 1;
  paragraphSpacing: number | string = "0";
  paragraphIndent = 0;
  /** Set when the last glyph of the line's last word reaches past its advance. */
  declare rightPadding?: number;
  declare positionedWords: PositionedWord[];
  declare actualWidth: number;

  constructor(
    doc: TLNode | null,
    left: number,
    width: number,
    baseline: number,
    ascent: number,
    descent: number,
    words: Word[],
    ordinal: number,
    wrapping?: boolean,
    spacingPadding?: number | null,
    lastLine?: boolean,
  ) {
    super();
    const align = (words[0] as Word).align();
    this.doc = doc;
    this.left = left;
    this.width = width;
    this.baseline = baseline;
    this.ascent = ascent;
    this.descent = descent;
    this.ordinal = ordinal;
    this.align = align;
    this.lineSpacing = (words[0] as Word).lineSpacing();
    this.paragraphSpacing = (words[0] as Word).paragraphSpacing();
    this.paragraphIndent = (words[0] as Word).paragraphIndent() || 0;
    let actualWidth = this.paragraphIndent;
    words.forEach((word) => {
      this.minX = Math.min(word.minX + actualWidth, this.minX);
      this.maxX = Math.max(word.maxX + actualWidth, this.maxX);
      actualWidth += word.width;
      this.maxY = Math.max(word.maxY, this.maxY);
      this.minY = Math.min(word.minY, this.minY);
    });
    actualWidth -= (words[words.length - 1] as Word).space.width;
    const beforeLast = words[words.length - 2];
    if (
      beforeLast &&
      beforeLast.text &&
      beforeLast.text.lastGlyphWidth &&
      beforeLast.text.lastGlyphAdvance &&
      beforeLast.text.lastGlyphWidth > beforeLast.text.lastGlyphAdvance
    ) {
      Object.defineProperty(this, "rightPadding", {
        value: beforeLast.text.lastGlyphWidth - beforeLast.text.lastGlyphAdvance,
      });
    }
    const charSpacing = this.getLastValidCharSpacing(words);
    // The spacing padding only counts when the line doesn't wrap.
    if (!(spacingPadding && !wrapping)) spacingPadding = 0;
    let offset = this.paragraphIndent;
    let gap = 0;
    if (actualWidth - charSpacing < width) {
      switch (align) {
        case "right":
          offset = width - actualWidth - spacingPadding + charSpacing + this.paragraphIndent - left;
          break;
        case "center":
          offset =
            (width - actualWidth + charSpacing - spacingPadding) / 2 + this.paragraphIndent - left;
          break;
        case "justify":
          if (words.length > 1 && !(words[words.length - 1] as Word).isNewLine() && !lastLine) {
            gap = (width - actualWidth - left + charSpacing - spacingPadding) / (words.length - 1);
          }
      }
    }
    if (this.minX !== Number.MAX_VALUE) this.minX += offset;
    if (this.maxX !== -Number.MAX_VALUE) this.maxX += offset;
    let wordOrdinal = ordinal;
    Object.defineProperty(this, "positionedWords", {
      value: words.map((word) => {
        const wordLeft = offset;
        offset += word.width + gap;
        const start = wordOrdinal;
        wordOrdinal += word.text.length + word.space.length;
        return new PositionedWord(word, this, wordLeft, start, word.width + gap);
      }),
    });
    Object.defineProperty(this, "actualWidth", { value: actualWidth });
    Object.defineProperty(this, "length", { value: wordOrdinal - this.ordinal });
  }

  /**
   * With `actual`, the ink bounds of the words; with `tight`, from the
   * first to the end of the last word; else the line box.
   */
  override bounds(actual?: boolean, tight?: boolean): TLRect {
    if (actual) return super.bounds(actual);
    if (tight) {
      const first = (this.first() as TLNode).bounds();
      const last = (this.last() as TLNode).bounds();
      return new TLRect(
        first.l,
        this.baseline - this.ascent,
        last.l + last.w - first.l,
        this.ascent + this.descent,
      );
    }
    return new TLRect(
      this.left as number,
      this.baseline - this.ascent,
      this.width,
      this.ascent + this.descent,
    );
  }

  override parent(): TLNode | null {
    return this.doc;
  }

  override children(): TLNode[] {
    return this.positionedWords;
  }

  /** The letter spacing of the last run of the last word that isn't a line break. */
  override getLastValidCharSpacing(words?: Word[]): number {
    let last: Word | null = null;
    if (!words) {
      words = [];
      (this.children() || []).forEach((child) => {
        (words as Word[]).push((child as PositionedWord).word);
      });
    }
    words.forEach((word) => {
      if ("\n" !== word.text.plainText) last = word;
    });
    let spacing = 0;
    if (last) {
      const parts = (last as Word).text.parts;
      if (parts.length) spacing = (parts[parts.length - 1] as Part).run.charSpacing || 0;
    }
    return spacing;
  }

  /** A line that holds only the eof word. */
  isEOF(): boolean {
    if (this.positionedWords && 1 === this.positionedWords.length) {
      const first = this.positionedWords[0];
      return !!first && !!first.word && !!first.word.eof;
    }
    return false;
  }
}

Line.prototype.type = "line";
