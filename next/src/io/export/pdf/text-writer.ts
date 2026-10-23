// Old: chunk.vendor.js module 1223 (GPDFText, the PDF text object).
import { Point } from "../../../engine/math/point.ts";
import { Transform } from "../../../engine/math/transform.ts";
import type { PDFFontSelection } from "./font-key.ts";
import { PDFTextMatrix } from "./op-tm.ts";
import type { PDFOutput } from "./output.ts";
import { PDFArray } from "./pdf-array.ts";
import { PDFNumber } from "./pdf-number.ts";
import { PDFObject } from "./pdf-object.ts";
import { PDFShowText } from "./show-text.ts";

/** Text render modes (`Tr`). */
const Mode = { FILL: 0, STROKE: 1, BOTH: 2 } as const;

/** The shaping options a word is encoded with. */
export interface PDFTextEncodeOptions {
  letterSpacing: number;
  kerning: boolean;
  features: {
    liga: boolean | undefined;
    rlig: boolean | undefined;
    frac: boolean | undefined;
    stylisticSet: string | null | undefined;
  };
  script?: string;
  language?: string;
  direction?: string;
  generateText?: boolean;
  variant?: string;
}

/** The style a word or line carries: what changed is written before the word. */
interface TextState {
  font: PDFFontSelection | null;
  fillColor: PDFObject | null;
  strokeColor: PDFObject | null;
  charSpacing: number | null;
  wordSpacing: number | null;
  mode: number | null;
}

/** One run of text with one style, positioned by its own text matrix. */
export class PDFTextWord {
  declare text: string;
  declare mode: number;
  declare lineWidth: number | undefined;
  declare charSpacing: number;
  declare wordSpacing: number;
  declare fontReference: PDFFontSelection;
  declare fillColor: PDFObject | null;
  declare strokeColor: PDFObject | null;
  declare origin: Transform;
  declare align: unknown;
  declare textEncoded: unknown;
  declare textLigatures: boolean | undefined;
  declare textFractions: boolean | undefined;
  declare script: string | null | undefined;
  declare textStylisticSet: string | null | undefined;
  declare textLocalizedForm: string | null | undefined;

  constructor(values: Partial<PDFTextWord>) {
    for (const key in values) {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        (this as unknown as Record<string, unknown>)[key] = (values as Record<string, unknown>)[
          key
        ];
      }
    }
  }

  append(word: PDFTextWord): void {
    this.text += word.text;
  }

  /** Words never merge (the old hook always said no). */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  merge(_word: PDFTextWord): boolean {
    return false;
  }
}

Object.assign(PDFTextWord.prototype, {
  text: "",
  mode: Mode.BOTH,
  lineWidth: 0,
  charSpacing: 0,
  wordSpacing: 0,
  fontReference: null,
  fillColor: null,
  strokeColor: null,
  origin: new Transform(),
  textLigatures: false,
  textFractions: false,
  script: null,
  textStylisticSet: null,
  textLocalizedForm: null,
});

/**
 * The words on one baseline. Each word is written with its text matrix,
 * the style that changed since the word before (font, colors, character
 * spacing, render mode and line width) and its glyphs as `TJ`. The
 * glyphs are encoded again at write time, with the spacing of the line.
 */
export class PDFTextLine extends PDFObject implements TextState {
  origin: Transform;
  align: unknown;
  words: PDFTextWord[];
  declare font: PDFFontSelection | null;
  declare strokeColor: PDFObject | null;
  declare fillColor: PDFObject | null;
  declare charSpacing: number | null;
  declare wordSpacing: number | null;
  declare mode: number | null;

  constructor(origin: Transform) {
    super();
    this.origin = origin;
    this.align = null;
    this.words = [];
  }

  override write(output: PDFOutput): void {
    for (const word of this.words) {
      new PDFTextMatrix(word.origin).write(output);
      output.writeln();
      if (!(this.font && this.font.equals(word.fontReference))) word.fontReference.write(output);
      if (word.strokeColor) {
        if (!(this.strokeColor && this.strokeColor.equals(word.strokeColor))) {
          word.strokeColor.write(output);
          output.writeln();
        }
      }
      if (word.fillColor) {
        if (!(this.fillColor && this.fillColor.equals(word.fillColor))) {
          word.fillColor.write(output);
          output.writeln();
        }
      }
      if (this.charSpacing !== word.charSpacing) {
        output.write(PDFNumber.normalizeNumber(word.charSpacing));
        output.writeSpace();
        output.writeln("Tc");
      }
      if (this.mode !== word.mode) {
        output.write(word.mode);
        output.writeSpace();
        output.writeln("Tr");
        if (word.mode >= Mode.STROKE) {
          output.write(PDFNumber.normalizeNumber(word.lineWidth));
          output.writeSpace();
          output.writeln("w");
        }
      }
      this.font = word.fontReference;
      this.fillColor = word.fillColor;
      this.strokeColor = word.strokeColor;
      this.charSpacing = PDFNumber.normalizeNumber(word.charSpacing);
      this.wordSpacing = PDFNumber.normalizeNumber(word.wordSpacing);
      this.mode = word.mode;
      const options: PDFTextEncodeOptions = {
        letterSpacing: this.charSpacing,
        kerning: true,
        features: {
          liga: word.textLigatures,
          rlig: word.textLigatures,
          frac: word.textFractions,
          stylisticSet: word.textStylisticSet,
        },
      };
      if (word.script && "auto" !== word.script) options.script = word.script;
      if (word.textLocalizedForm) options.language = word.textLocalizedForm;
      const encoded = this.font.getFont().encode(word.text, options);
      new PDFShowText(new PDFArray(encoded)).write(output);
    }
  }

  add(word: PDFTextWord): void {
    const last = this.words.slice(-1).pop();
    if (!(last && last.merge(word))) this.words.push(word);
    if (!this.align) this.align = word.align;
  }
}

Object.assign(PDFTextLine.prototype, {
  font: null,
  strokeColor: null,
  fillColor: null,
  charSpacing: null,
  wordSpacing: null,
  mode: null,
  align: null,
});

const STATE_KEYS = [
  "font",
  "fillColor",
  "strokeColor",
  "charSpacing",
  "wordSpacing",
  "mode",
] as const satisfies readonly (keyof TextState)[];

/** Writes the lines in order, carrying the text state from line to line. */
export class PDFTextParagraph {
  lines: PDFTextLine[];

  constructor(lines: PDFTextLine[]) {
    this.lines = lines;
  }

  write(output: PDFOutput): void {
    const state: TextState = {
      font: null,
      fillColor: null,
      strokeColor: null,
      charSpacing: 0,
      wordSpacing: 0,
      mode: 0,
    };
    const carried = state as unknown as Record<string, unknown>;
    for (const line of this.lines) {
      const target = line as unknown as Record<string, unknown>;
      for (const key of STATE_KEYS) target[key] = carried[key];
      line.write(output);
      for (const key of STATE_KEYS) carried[key] = target[key];
    }
  }
}

/** A text object `BT ... ET`; words with another baseline start a new line. */
export class PDFText extends PDFObject {
  static Mode = Mode;
  static Word = PDFTextWord;
  static Line = PDFTextLine;
  static Paragraph = PDFTextParagraph;

  _doc: unknown;
  _lines: PDFTextLine[];
  declare origin: PDFObject | undefined;

  constructor(document?: unknown) {
    super();
    this._doc = document;
    this._lines = [];
  }

  add(word: PDFTextWord): void {
    let line = this._lines.slice(-1).pop();
    if (line) {
      if (
        line.origin.mapPoint(new Point(0, 0)).getY() !==
        word.origin.mapPoint(new Point(0, 0)).getY()
      ) {
        line = new PDFTextLine(word.origin);
        this._lines.push(line);
      }
    } else {
      line = new PDFTextLine(word.origin);
      this._lines.push(line);
    }
    line.add(word);
  }

  setOrigin(origin: PDFObject): void {
    this.origin = origin;
  }

  getCurrentWord(): PDFTextWord | undefined {
    const line = this._lines.slice(-1).pop();
    if (line) return line.words.slice(-1).pop();
    return undefined;
  }

  override write(output: PDFOutput): void {
    if (this.origin) {
      this.origin.write(output);
      output.writeln();
    }
    output.writeln("BT");
    new PDFTextParagraph(this._lines).write(output);
    output.write("ET");
  }
}
