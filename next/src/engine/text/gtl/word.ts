// Old: chunk.vendor.js module 917 (a measured word, carota's word.js).
import type { WordSpan } from "./characters.ts";
import { Formatting, type Run } from "./formatting.ts";
import { Part, type CodeResolver, type TextCode } from "./inline.ts";
import { Per } from "./list-util.ts";
import type { RunDrawContext } from "./run-draw.ts";
import { TLCode } from "./tl-code.ts";

/** The measured parts of a word's text or of its trailing spaces. */
export interface WordSection {
  parts: Part[];
  ascent: number;
  descent: number;
  minY: number;
  maxY: number;
  minX: number;
  maxX: number;
  width: number;
  length: number;
  plainText: string;
  lastGlyphWidth?: number;
  lastGlyphAdvance?: number;
}

/** A start and end inside a word, in characters. */
export interface WordRange {
  start?: number;
  end?: number;
}

/**
 * A word: its text and trailing spaces, measured. Without a span it is
 * the end-of-file word, a line break.
 */
export class Word {
  /** Measures runs into parts; null when one can't be measured. */
  static section(runs: unknown, codes: CodeResolver): WordSection | null {
    let parts: Part[];
    try {
      parts = Per.create<Run>(runs)
        .map((run) => new Part(run, codes))
        .all();
    } catch {
      return null;
    }
    const section: WordSection = {
      parts,
      ascent: 0,
      descent: 0,
      minY: Number.MAX_VALUE,
      maxY: -Number.MAX_VALUE,
      minX: Number.MAX_VALUE,
      maxX: -Number.MAX_VALUE,
      width: 0,
      length: 0,
      plainText: "",
    };
    section.parts.forEach((part) => {
      section.ascent = Math.max(section.ascent, part.ascent);
      section.descent = Math.max(section.descent, part.descent);
      section.minY = Math.min(section.minY, part.minY);
      section.maxY = Math.max(section.maxY, part.maxY);
      section.minX = Math.min(section.minX, part.minX + section.width);
      section.maxX = Math.max(section.maxX, part.maxX + section.width);
      section.width += part.width;
      section.length += Formatting.getPieceLength(part.run.text);
      section.plainText += Formatting.getPiecePlainText(part.run.text);
    });
    const last = section.parts[section.parts.length - 1];
    if (last) {
      section.lastGlyphWidth = last.lastGlyphWidth;
      section.lastGlyphAdvance = last.lastGlyphAdvance;
    }
    return section;
  }

  text: WordSection;
  space: WordSection;
  ascent = 0;
  descent = 0;
  minY = 0;
  maxY = 0;
  minX = 0;
  maxX = 0;
  width = 0;
  length = 0;
  eof = false;

  constructor(span: WordSpan | null, codes: CodeResolver) {
    let textRuns: unknown;
    let spaceRuns: unknown;
    if (span) {
      textRuns = span.text.cut(span.spaces);
      spaceRuns = span.spaces.cut(span.end);
    } else {
      textRuns = [{ text: "\n" }];
      spaceRuns = [];
    }
    const text = Word.section(textRuns, codes);
    if (!text) throw new Error("Couldn't measure text");
    const space = Word.section(spaceRuns, codes);
    if (!space) throw new Error("Couldn't measure space");
    this.text = text;
    this.space = space;
    if (!span) this.eof = true;
    this.ascent = Math.max(text.ascent, space.ascent);
    this.descent = Math.max(text.descent, space.descent);
    this.minY = text.minY;
    this.maxY = text.maxY;
    this.minX = text.minX;
    this.maxX = text.maxX;
    this.width = text.width + space.width;
    this.length = text.length + space.length;
  }

  isNewLine(): boolean {
    return 1 == this.text.parts.length && !!(this.text.parts[0] as Part).isNewLine;
  }

  isEndOfList(): boolean {
    const code = this.code();
    return !!code && code.$ === TLCode.List.Close;
  }

  isStartOfList(): boolean {
    const code = this.code();
    return !!code && code.$ === TLCode.List.Open;
  }

  isSoftBreak(): boolean {
    return 1 == this.text.parts.length && !!(this.text.parts[0] as Part).isSoftBreak;
  }

  /** The code of a word made of one code part, else false or null. */
  code(): TextCode | false | null {
    return 1 == this.text.parts.length && (this.text.parts[0] as Part).code;
  }

  codeFormatting(): Run | false {
    return 1 == this.text.parts.length && (this.text.parts[0] as Part).run;
  }

  listDepth(): number {
    const first = this.text.parts[0];
    return first ? (isNaN(first.run.listDepth as number) ? 0 : (first.run.listDepth as number)) : 0;
  }

  listMarker(): unknown {
    const first = this.text.parts[0];
    return first && (first as unknown as { listMarker?: unknown }).listMarker;
  }

  draw(context: RunDrawContext, x: number, y: number): void {
    Per.create<Part>(this.text.parts)
      .concat(this.space.parts)
      .forEach((part: Part) => {
        part.draw(context, x, y);
        x += part.width;
      });
  }

  plainText(): string {
    return this.text.plainText + this.space.plainText;
  }

  /** The first part's run decides the paragraph formatting of a word. */
  _paragraphRun(): Run | undefined {
    const part = this.text.parts.length ? this.text.parts[0] : this.space.parts[0];
    return part && part.run;
  }

  align(): string {
    const run = this._paragraphRun();
    return run && run.align ? run.align : Formatting.defaultFormatting.align;
  }

  lineSpacing(): number | string {
    const run = this._paragraphRun();
    return run && run.lineSpacing ? run.lineSpacing : Formatting.defaultFormatting.lineSpacing;
  }

  paragraphSpacing(): number | string {
    const run = this._paragraphRun();
    return run && null !== run.paragraphSpacing && !isNaN(run.paragraphSpacing as number)
      ? (run.paragraphSpacing as number | string)
      : (Formatting.defaultFormatting.paragraphSpacing as string);
  }

  paragraphIndent(): number {
    const run = this._paragraphRun();
    return run && run.paragraphIndent
      ? parseFloat(run.paragraphIndent as string)
      : (Formatting.defaultFormatting.paragraphIndent as number);
  }

  /** Emits the runs of the word (text, then spaces) cut to the range. */
  runs(emit: (run: Run) => void, range?: WordRange): void {
    let start = (range && range.start) || 0;
    const end = range && range.end;
    let to: number = "number" != typeof end ? Number.MAX_VALUE : end;
    [this.text, this.space].forEach((section) => {
      section.parts.some((part) => {
        if (start >= to || to <= 0) return true;
        const run = part.run;
        const text = run.text;
        if ("string" == typeof text) {
          if (start <= 0 && to >= text.length) {
            emit(run);
          } else if (start < text.length) {
            const cut = Object.create(run) as Run;
            const from = Math.max(0, start);
            Reflect.set(cut, "text", text.substr(from, Math.min(text.length, to - from)));
            emit(cut);
          }
          start -= text.length;
          to -= text.length;
        } else {
          if (start <= 0 && to >= 1) emit(run);
          start--;
          to--;
        }
        return undefined;
      });
    });
  }
}
