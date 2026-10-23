// Old: chunk.vendor.js module 918 (line breaking, carota's wrap.js).
import type { TextCode } from "./inline.ts";
import { Line } from "./line.ts";
import type { TLNode } from "./node.ts";
import type { Run } from "./formatting.ts";
import type { Word } from "./word.ts";

/** Receives each finished line or block node, and at the end the frame height. */
export type LineSink = (item: TLNode | number) => unknown;

/** Takes the words of a block code (a list) until it returns the finished block node. */
export type BlockConsumer = (word: Word) => TLNode | undefined;

/** A block code as the line buffer starts it. */
interface BlockCode extends TextCode {
  block(
    left: number,
    top: number,
    width: number,
    ordinal: number,
    parent: TLNode,
    formatting: Run | false,
    noWrap: boolean | undefined,
  ): BlockConsumer;
}

/**
 * Collects words into lines. A word that no longer fits sends the line
 * (unless wrapping is off); a line break word ends it and adds the line
 * and paragraph spacing; block codes hand the following words to the
 * block's own layout; the eof word sends the last line and the height.
 */
export class LineBuffer {
  _lineBuffer: Word[];
  _lineWidth = 0;
  _maxAscent = 0;
  _maxDescent = 0;
  _quit: unknown = false;
  _lastNewLineHeight = 0;
  _tempLastAscent = 0;
  _tempLastDescent = 0;
  _y = 0;
  _top = 0;
  _consumer: BlockConsumer | null = null;
  _parent: TLNode | null = null;
  _ordinal = 0;
  _width = 0;
  _noWrap: boolean | undefined = false;
  _left = 0;
  _includeTerminator: ((code: TextCode) => boolean) | undefined = void 0;
  _lastInputWord: Word | null = null;
  _lastParagraphSpacing = 0;
  _spacingPadding: number | null | undefined;

  constructor(
    left: number,
    top: number,
    width: number,
    ordinal: number,
    parent: TLNode,
    includeTerminator?: (code: TextCode) => boolean,
    initialAscent?: number,
    initialDescent?: number,
    noWrap?: boolean,
    spacingPadding?: number | null,
  ) {
    this._lineBuffer = [];
    this._maxAscent = initialAscent || 0;
    this._maxDescent = initialDescent || 0;
    this._top = top;
    this._y = top;
    this._parent = parent;
    this._ordinal = ordinal;
    this._left = left;
    this._width = width;
    this._noWrap = noWrap;
    this._includeTerminator = includeTerminator;
    this._spacingPadding = spacingPadding;
    this._lineWidth = left;
  }

  _store(word: Word, sink: LineSink, spacingPadding?: number | null): void {
    this._lineBuffer.push(word);
    this._lineWidth += word.width;
    if (word.eof) {
      this._maxAscent = Math.max(this._maxAscent, this._tempLastAscent || word.ascent);
      this._maxDescent = Math.max(this._maxDescent, this._tempLastDescent || word.descent);
    } else {
      this._maxAscent = Math.max(this._maxAscent, word.ascent);
      this._maxDescent = Math.max(this._maxDescent, word.descent);
    }
    this._tempLastAscent = word.ascent;
    this._tempLastDescent = word.descent;
    if (word.isNewLine()) {
      const lineSpacing = (this._lineBuffer[0] as Word).lineSpacing();
      const paragraphSpacing = (this._lineBuffer[0] as Word).paragraphSpacing();
      this._send(sink, spacingPadding);
      if ("number" == typeof lineSpacing) {
        this._lastNewLineHeight = word.eof
          ? (this._tempLastAscent + this._tempLastDescent) * lineSpacing
          : (word.ascent + word.descent) * lineSpacing;
      } else {
        this._lastNewLineHeight = parseFloat(lineSpacing);
      }
      if (paragraphSpacing && !word.isSoftBreak()) {
        if ("number" == typeof paragraphSpacing) {
          this._y += word.eof
            ? (this._tempLastAscent + this._tempLastDescent) * paragraphSpacing
            : (word.ascent + word.descent) * paragraphSpacing;
        } else {
          this._y += Math.max(parseFloat(paragraphSpacing), 0);
        }
      }
    }
  }

  _send(sink: LineSink, spacingPadding?: number | null, lastLine?: boolean): void {
    if (this._quit || 0 === this._lineBuffer.length) return;
    if (1 === this._lineBuffer.length && (this._lineBuffer[0] as Word).eof) {
      // A lone eof word after a code that ends the text adds no height.
      const code = this._lastInputWord && this._lastInputWord.code();
      if (code && code.eof) {
        this._maxAscent = this._maxDescent = 0;
        this._y -= this._lastParagraphSpacing || 0;
      }
    }
    const line = new Line(
      this._parent,
      this._left,
      this._width,
      this._y + this._maxAscent,
      this._maxAscent,
      this._maxDescent,
      this._lineBuffer,
      this._ordinal,
      !this._noWrap,
      spacingPadding,
      !!lastLine,
    );
    this._ordinal += line.length;
    this._quit = sink(line);
    let height: number;
    if ("number" == typeof line.lineSpacing) {
      height = this._maxAscent + this._maxDescent;
      height *= line.lineSpacing;
    } else {
      height = parseFloat(line.lineSpacing);
    }
    this._y += height;
    this._lineBuffer.length = 0;
    this._maxAscent = this._maxDescent = 0;
    this._lineWidth = this._left;
  }

  /** Takes the next word; returns whether layout is done. */
  wrap(sink: LineSink, word: Word, spacingPadding?: number | null): unknown {
    if (this._consumer) {
      this._lastNewLineHeight = 0;
      const block = this._consumer(word);
      if (block) {
        this._consumer = null;
        this._ordinal += block.length;
        this._y += block.bounds().h;
        const paragraphSpacing = word.paragraphSpacing();
        this._lastParagraphSpacing =
          "number" == typeof paragraphSpacing
            ? (this._tempLastAscent + this._tempLastDescent) * paragraphSpacing
            : Math.max(parseFloat(paragraphSpacing), 0);
        this._y += this._lastParagraphSpacing;
        Object.defineProperty(block, "block", { value: true });
        sink(block);
      }
    } else {
      const code = word.code();
      if (code && code.block) {
        if (this._lineBuffer.length) {
          this._send(sink, spacingPadding);
          const paragraphSpacing = word.paragraphSpacing();
          this._y +=
            "number" == typeof paragraphSpacing
              ? (this._tempLastAscent + this._tempLastDescent) * paragraphSpacing
              : Math.max(parseFloat(paragraphSpacing), 0);
        } else {
          this._y += this._lastNewLineHeight;
        }
        this._consumer = (code as BlockCode).block(
          this._left,
          this._y,
          this._width,
          this._ordinal,
          this._parent as TLNode,
          word.codeFormatting(),
          this._noWrap,
        );
        this._lastNewLineHeight = 0;
      } else if ((code && code.eof) || word.eof) {
        if (!code || (this._includeTerminator && this._includeTerminator(code))) {
          this._store(word, sink, spacingPadding);
        }
        if (this._lineBuffer.length) {
          this._send(sink, spacingPadding, !!code && !!code.eof);
          sink(this._y - this._top);
        } else {
          sink(this._y + this._lastNewLineHeight - this._top);
        }
        this._quit = true;
      } else {
        this._lastNewLineHeight = 0;
        if (this._lineBuffer.length) {
          const indent = word.paragraphIndent() || 0;
          if (
            !this._noWrap &&
            this._lineWidth + word.text.width + indent > this._width + (spacingPadding || 0)
          ) {
            this._send(sink, spacingPadding);
          }
          this._store(word, sink, spacingPadding);
        } else {
          this._store(word, sink, spacingPadding);
        }
      }
    }
    this._lastInputWord = word;
    return this._quit;
  }
}
