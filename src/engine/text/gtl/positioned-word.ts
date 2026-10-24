// Old: chunk.vendor.js module 919 (a word placed on a line, carota's positionedword.js).
import { Formatting, type Run } from "./formatting.ts";
import { Part, type CodeResolver } from "./inline.ts";
import type { Line } from "./line.ts";
import { TLNode } from "./node.ts";
import { TLRect } from "./rect.ts";
import { RunDraw, type RunDrawContext } from "./run-draw.ts";
import type { Word } from "./word.ts";

/**
 * The width of a line break: a non-breaking space in the run's
 * formatting. The callers pass the Word itself, which has no run, so in
 * practice this measures with the default formatting.
 */
function newLineWidth(run: Run | undefined): number {
  return (RunDraw.measure(RunDraw.ENTER, run) as { width: number }).width;
}

/** The run of a Word, which words don't have (see newLineWidth). */
function runOfWord(word: Word): Run | undefined {
  return (word as unknown as { run?: Run }).run;
}

/** One character of a positioned word, made on demand for caret and selection geometry. */
export class PositionedChar extends TLNode {
  word: PositionedWord;
  left = NaN;
  part: Part;
  baseline = NaN;
  /** Only the last character of a word has a width of its own (up to the word's end). */
  declare width?: number;

  constructor(left: number, part: Part, word: PositionedWord, ordinal: number, length: number) {
    super();
    this.left = left;
    this.part = part;
    this.word = word;
    this.ordinal = ordinal;
    this.length = length;
    this.baseline = word.line.baseline;
  }

  override bounds(actual?: boolean): TLRect {
    const wordBounds = this.word.bounds(actual);
    const width = this.word.word.isNewLine()
      ? newLineWidth(runOfWord(this.word.word))
      : this.width || this.part.width;
    return new TLRect(wordBounds.l + this.left, wordBounds.t, width, wordBounds.h);
  }

  override parent(): TLNode {
    return this.word;
  }

  override byOrdinal(): TLNode {
    return this;
  }

  override byCoordinate(x: number): TLNode | null {
    return x <= this.bounds().center().x ? this : this.next();
  }
}

PositionedChar.prototype.type = "character";

/** A word at a horizontal position of a line. */
export class PositionedWord extends TLNode {
  word: Word;
  line: Line;
  left = NaN;
  width = NaN;
  _characters?: PositionedChar[];

  constructor(word: Word, line: Line, left: number, ordinal: number, width: number) {
    super();
    this.word = word;
    this.line = line;
    this.left = left;
    this.width = width;
    this.ordinal = ordinal;
    this.length = word.text.length + word.space.length;
  }

  override draw(context: unknown): void {
    this.word.draw(
      context as RunDrawContext,
      (this.line.left as number) + this.left,
      this.line.baseline,
    );
  }

  /** With `actual`, the word's ink box; else the word's box at the line's height. */
  override bounds(actual?: boolean): TLRect {
    const left = (this.line.left as number) + this.left;
    if (actual) {
      return new TLRect(
        left,
        this.line.baseline + this.word.minY,
        this.word.isNewLine()
          ? newLineWidth(runOfWord(this.word))
          : this.word.maxX - this.word.minX,
        this.word.maxY - this.word.minY,
      );
    }
    return new TLRect(
      left,
      this.line.baseline - this.line.ascent,
      this.word.isNewLine() ? newLineWidth(runOfWord(this.word)) : this.width,
      this.line.ascent + this.line.descent,
    );
  }

  /** Calls `fn` for each part of the text, then of the spaces, until it returns truthy. */
  parts(fn: (part: Part) => unknown): void {
    if (!this.word.text.parts.some(fn)) this.word.space.parts.some(fn);
  }

  realiseCharacters(): void {
    if (this._characters) return;
    const characters: PositionedChar[] = [];
    let left = 0;
    let ordinal = this.ordinal;
    const codes = (this.parentOfType("document") as unknown as { codes: CodeResolver }).codes;
    this.parts((part) => {
      Formatting.pieceCharacters((char, index) => {
        const run = Object.create(part.run) as Run;
        Reflect.set(run, "text", char);
        // Only the first character of a capitalized run is capitalized.
        if (index && "capitalize" === run.transformation) Reflect.set(run, "transformation", null);
        const charPart = new Part(run, codes);
        characters.push(new PositionedChar(left, charPart, this, ordinal, 1));
        left += charPart.width;
        ordinal++;
      }, part.run.text);
      return undefined;
    });
    const last = characters[characters.length - 1];
    if (last) {
      Object.defineProperty(last, "width", { value: this.width - last.left });
      const code = this.word.code();
      if (this.word.isNewLine() || (code && code.eof)) {
        Object.defineProperty(last, "newLine", { value: true });
      }
      if (this.word.isEndOfList()) Object.defineProperty(last, "endOfList", { value: true });
    }
    this._characters = characters;
  }

  override children(): TLNode[] {
    this.realiseCharacters();
    return this._characters as PositionedChar[];
  }

  override parent(): TLNode {
    return this.line;
  }
}

PositionedWord.prototype.type = "word";
