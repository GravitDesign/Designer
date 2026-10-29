// Old: chunk.vendor.js module 510 (a measured run piece, carota's part.js).
import type { Run } from "./formatting.ts";
import { Measurement } from "./measurement.ts";
import { RunDraw, type RunDrawContext, type ShapedTextHolder } from "./run-draw.ts";

/** What a code's measure returns; list codes leave the ink extents out. */
export interface CodeMeasurement {
  width: number;
  ascent: number;
  descent: number;
  height?: number;
  minY?: number;
  maxY?: number;
  minX?: number;
  maxX?: number;
  lastGlyphAdvance?: number;
  lastGlyphWidth?: number;
}

/**
 * A code instance: what a code object in a run's text turns into (list
 * codes, list markers, custom inlines). Block codes (ListStart) lay out
 * their own frame; eof codes end one.
 */
export interface TextCode {
  $?: string;
  eof?: boolean;
  measure?(run: Run): CodeMeasurement | null;
  draw?(
    context: RunDrawContext,
    x: number,
    y: number,
    width: number,
    ascent: number,
    descent: number,
    run: Run,
  ): void;
  block?(...args: never[]): unknown;
}

/** Turns a code object into a code instance (TLDocument.codes). */
export type CodeResolver = (obj: unknown, data?: unknown) => TextCode | null | undefined;

/**
 * Stands in for code objects no code understands: a silver box with a
 * question mark. Its draw calls fillText, which TLCanvasContext doesn't
 * have, so it would throw; the word splitter already throws on such codes,
 * so it isn't reached (QUESTIONS.md "GTL unknown code objects").
 */
const DefaultInline: TextCode = {
  measure(run: Run): CodeMeasurement {
    const measured = RunDraw.measure("?", run) as Measurement;
    return {
      width: measured.width + 4,
      ascent: measured.width + 2,
      descent: measured.width + 2,
      minY: -measured.width - 2,
      maxY: measured.width + measured.width + 4,
      minX: 0,
      maxX: measured.width + 4,
    };
  },
  draw(context, x, y, width, ascent, descent) {
    context.fillStyle = "silver";
    context.fillRect(x, y - ascent, width, ascent + descent);
    context.strokeRect(x, y - ascent, width, ascent + descent);
    context.fillStyle = "black";
    (context.fillText as (text: string, x: number, y: number) => void)("?", x + 2, y);
  },
};

/**
 * One run, measured: a word's text or spaces are made of parts. A part of
 * one character knows whether it is a line break (or a soft line break)
 * or a space; spaces add the run's word spacing.
 */
export class Part implements ShapedTextHolder {
  /** Stands in for code objects no code understands. */
  static DefaultInline = DefaultInline;
  /** When false, string parts are not measured (every metric undefined). */
  static DoMeasure = true;

  run: Run;
  isNewLine: boolean | undefined = false;
  isSoftBreak: boolean | undefined = false;
  width = 0;
  ascent = 0;
  descent = 0;
  minY = 0;
  maxY = 0;
  minX = 0;
  maxX = 0;
  code: TextCode | null = null;
  lastGlyphWidth: number | undefined = 0;
  lastGlyphAdvance: number | undefined = 0;
  /** What the drawing context keeps for this part (ShapedText in tl-canvas-context.ts). */
  _shaped: unknown = null;

  constructor(run: Run, codes: CodeResolver) {
    let measured: CodeMeasurement | null;
    let isNewLine: boolean | undefined;
    let isSpace: boolean | undefined;
    let code: TextCode | undefined;
    let isSoftBreak: boolean | undefined;
    if ("string" == typeof run.text) {
      if (1 === run.text.length) {
        if ("\n" === run.text[0] || run.text[0] === RunDraw.LS) {
          isNewLine = true;
          isSoftBreak = run.text[0] === RunDraw.LS;
        } else {
          isNewLine = false;
        }
        isSpace = " " === run.text[0];
      }
      measured = Part.DoMeasure
        ? RunDraw.measure(isNewLine ? RunDraw.NBSP : run.text, run)
        : new Measurement();
    } else {
      code = codes(run.text) || Part.DefaultInline;
      measured = code.measure ? code.measure(run) : new Measurement();
    }
    if (!measured) throw new Error("Measurement failed.");
    this.run = run;
    this.isNewLine = isNewLine;
    this.isSoftBreak = isSoftBreak;
    this.width = isNewLine ? 0 : measured.width;
    if (isSpace && "number" == typeof run.wordSpacing) this.width += run.wordSpacing;
    this.ascent = measured.ascent;
    this.descent = measured.descent;
    this.minY = measured.minY as number;
    this.maxY = measured.maxY as number;
    this.minX = measured.minX as number;
    this.maxX = measured.maxX as number;
    this.lastGlyphAdvance = measured.lastGlyphAdvance;
    this.lastGlyphWidth = measured.lastGlyphWidth;
    if (code) this.code = code;
  }

  draw(context: RunDrawContext, x: number, y: number): void {
    if ("string" == typeof this.run.text) {
      RunDraw.draw(
        context,
        this.run.text,
        this.run,
        x,
        y,
        this.width,
        this.ascent,
        this.descent,
        this,
      );
    } else if (this.code && this.code.draw) {
      context.save();
      this.code.draw(context, x, y, this.width, this.ascent, this.descent, this.run);
      context.restore();
    }
  }
}
