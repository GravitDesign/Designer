// Old: chunk.vendor.js module 1467 (the words, lines and paragraph of an exported text).
//
// The SVG text layout (svg-tl-render.ts) collects every drawn run as a
// Word with its position and style. Words on the same baseline form a
// Line, a word that follows with the same style is merged into the one
// before; whitespace is appended to the current word. Writing turns
// every word into a positioned <text> with its font and paint as inline
// CSS; gradient fills go on a group around all of them.
import { equals } from "../../../engine/core/util.ts";
import { Point } from "../../../engine/math/point.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Font } from "../../../engine/text/fonts/font.ts";
import {
  bcp47TagNumberToString,
  openTypeLanguageSystemTagNumberToBCP47TagNumber,
  stringToTag,
} from "../../../engine/text/fonts/harfbuzz.ts";
import { Length } from "../../../engine/math/length.ts";
import { Gradient } from "../../../engine/style/gradient.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import { ParagraphAlignment } from "../../../engine/style/stylable-sets.ts";
import type { SvgElement } from "./svg-dom.ts";
import { createSvgLinearGradient, createSvgRadialGradient } from "./svg-gradients.ts";
import type { SvgExportOptions, SvgRenderContext } from "./svg-images.ts";
import { numberFormat } from "./number-format.ts";
import { SvgStyle } from "./svg-style.ts";
import { SvgUtil, type SvgNamedNode } from "./svg-util.ts";

/** The font of a word as TLUtil.parseFont returns it. */
export interface FontReference {
  fontFamily: string;
  fontWeight: number | string;
  fontSize: number | string;
  fontStyle: string;
  [key: string]: unknown;
}

/** What a word is made from (the old code copied every field with jQuery.extend). */
export interface WordInit {
  text: string;
  mode: number;
  align?: unknown;
  origin: Transform;
  charSpacing?: number;
  wordSpacing?: number;
  fillColor?: unknown;
  strokeColor?: unknown;
  lineWidth?: number;
  fontReference: FontReference;
  textUnderline?: unknown;
  textStrikeout?: unknown;
  textLigatures?: unknown;
  textFractions?: unknown;
  textStylisticSet?: unknown;
  textLocalizedForm?: unknown;
}

const Mode = {
  FILL: 0,
  STROKE: 1,
  BOTH: 2,
} as const;

/** The characters XML can't hold (and lone surrogates). */
const INVALID_XML = new RegExp(
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  "((?:[\0-\x08\x0B\f\x0E-\x1F\uFFFD\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))",
  "g",
);

/** The characters XML discourages. */
const DISCOURAGED_XML =
  "([\\x7F-\\x84]|[\\x86-\\x9F]|[\\uFDD0-\\uFDEF]|(?:\\uD83F[\\uDFFE\\uDFFF])|(?:\\uD87F[\\uDFFE\\uDFFF])|(?:\\uD8BF[\\uDFFE\\uDFFF])|(?:\\uD8FF[\\uDFFE\\uDFFF])|(?:\\uD93F[\\uDFFE\\uDFFF])|(?:\\uD97F[\\uDFFE\\uDFFF])|(?:\\uD9BF[\\uDFFE\\uDFFF])|(?:\\uD9FF[\\uDFFE\\uDFFF])|(?:\\uDA3F[\\uDFFE\\uDFFF])|(?:\\uDA7F[\\uDFFE\\uDFFF])|(?:\\uDABF[\\uDFFE\\uDFFF])|(?:\\uDAFF[\\uDFFE\\uDFFF])|(?:\\uDB3F[\\uDFFE\\uDFFF])|(?:\\uDB7F[\\uDFFE\\uDFFF])|(?:\\uDBBF[\\uDFFE\\uDFFF])|(?:\\uDBFF[\\uDFFE\\uDFFF])(?:[\\0-\\t\\x0B\\f\\x0E-\\u2027\\u202A-\\uD7FF\\uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]))";

/** The text without characters XML can't hold or (with `discouraged`) discourages. */
function removeInvalidXmlCharacters(text: string, discouraged?: boolean): string {
  if (void 0 === discouraged) discouraged = true;
  text = text.replace(INVALID_XML, "");
  if (discouraged) text = text.replace(new RegExp(DISCOURAGED_XML, "g"), "");
  return text;
}

/** Two paints are the same: gradients by value, anything else by identity. */
function samePaint(a: unknown, b: unknown): boolean {
  return a instanceof Gradient && b instanceof Gradient ? Gradient.equals(a, b) : a === b;
}

export class SvgTextWord {
  declare text: string;
  declare mode: number;
  declare align: unknown;
  declare origin: Transform;
  declare lineWidth: number | undefined;
  declare charSpacing: number | undefined;
  declare wordSpacing: number | undefined;
  declare fontReference: FontReference;
  declare fillColor: unknown;
  declare strokeColor: unknown;
  declare textUnderline: unknown;
  declare textStrikeout: unknown;
  declare textLigatures: unknown;
  declare textFractions: unknown;
  declare textStylisticSet: unknown;
  declare textLocalizedForm: unknown;

  constructor(init: WordInit) {
    // jQuery.extend skipped undefined values, so those keep the defaults.
    for (const key of Object.keys(init) as (keyof WordInit)[]) {
      if (void 0 !== init[key]) (this as unknown as Record<string, unknown>)[key] = init[key];
    }
  }

  append(word: SvgTextWord): void {
    this.text += word.text;
  }

  /** Appends `word` when it has the same style (never in justified text); returns whether it did. */
  merge(word: SvgTextWord): boolean {
    if (word.align !== ParagraphAlignment.Justify) {
      if (
        this.mode === word.mode &&
        this.textUnderline === word.textUnderline &&
        this.textStrikeout === word.textStrikeout &&
        this.textLigatures === word.textLigatures &&
        this.textFractions === word.textFractions &&
        this.lineWidth === word.lineWidth &&
        this.charSpacing === word.charSpacing &&
        this.wordSpacing === word.wordSpacing &&
        equals(this.fontReference, word.fontReference, true) &&
        samePaint(this.fillColor, word.fillColor) &&
        samePaint(this.strokeColor, word.strokeColor)
      ) {
        this.append(word);
        return true;
      }
    }
    return false;
  }
}

Object.assign(SvgTextWord.prototype, {
  text: "",
  mode: Mode.BOTH,
  lineWidth: 0,
  charSpacing: 0,
  wordSpacing: 0,
  fontReference: null,
  fillColor: null,
  strokeColor: null,
  origin: new Transform(),
  textUnderline: null,
  textStrikeout: null,
  textLigatures: false,
  textFractions: false,
});

/** The words on one baseline. */
export class SvgTextLine {
  origin: Transform;
  align: unknown;
  words: SvgTextWord[];

  constructor(origin: Transform) {
    this.origin = origin;
    this.align = null;
    this.words = [];
  }

  _getGradient(key: "fillColor" | "strokeColor"): Gradient | null {
    for (let i = 0; i < this.words.length; i++) {
      const value = (this.words[i] as SvgTextWord)[key];
      if (value instanceof Gradient) return value;
    }
    return null;
  }

  /** One `<text>` per word, positioned by its origin (times the text's transform). */
  renderSVG(context: SvgRenderContext, options: SvgExportOptions, element: SvgNamedNode): void {
    this.words.forEach((word) => {
      let origin = word.origin;
      if (options.origin && options.origin instanceof Transform) {
        origin = word.origin.multiplied(options.origin);
      }
      const text = context.createSvgElement("text");
      text.setAttribute(
        "transform",
        "matrix(" + numberFormat.formatMatrix(origin.getMatrix()).join(",") + ")",
      );
      SvgUtil.setAttributeId(text, element, options);
      SvgUtil.exportAttributes(text, element, options);
      const content = context.svgDoc.createTextNode(removeInvalidXmlCharacters(word.text));
      const style = new SvgStyle();
      style.set("font-family", "'" + word.fontReference.fontFamily + "'");
      style.set("font-weight", word.fontReference.fontWeight);
      style.set("font-size", word.fontReference.fontSize + Length.Unit.PX);
      style.set(
        "font-style",
        word.fontReference.fontStyle === Font.Style.Normal ? "normal" : "italic",
      );
      if (word.textLigatures) {
        if ("auto" === word.textLigatures && (word.charSpacing as number) > 0) {
          style.set("font-variant-ligatures", "none");
        }
      } else style.set("font-variant-ligatures", "none");
      const features: string[] = [];
      if (word.textFractions) features.push('"frac"');
      if (word.textStylisticSet) features.push('"' + word.textStylisticSet + '"');
      if (word.textLocalizedForm) {
        const tag = stringToTag(word.textLocalizedForm as string);
        const language = openTypeLanguageSystemTagNumberToBCP47TagNumber(tag);
        if (language) {
          const code = bcp47TagNumberToString(language);
          features.push('"locl"');
          text.setAttribute("lang", code);
        }
      }
      if (features.length > 0) style.set("font-feature-settings", features.join(","));
      if (word.wordSpacing) style.set("word-spacing", word.wordSpacing);
      if (word.charSpacing) style.set("letter-spacing", word.charSpacing);
      const decorations: string[] = [];
      if (word.textUnderline) decorations.push("underline");
      if (word.textStrikeout) decorations.push("line-through");
      if (decorations.length) style.set("text-decoration", decorations.join(" "));
      const fill = word.fillColor || "none";
      if (!(fill instanceof Gradient)) style.set("fill", fill);
      const stroke = word.strokeColor || "none";
      if (!(stroke instanceof Gradient)) style.set("stroke", stroke);
      if (word.mode >= Mode.STROKE) {
        style.set("stroke-width", numberFormat.formatNumber(word.lineWidth as number));
      }
      style.setElementStyle(text);
      text.append(content);
      context.peek().append(text);
    });
  }

  add(word: SvgTextWord): void {
    const last = this.words.slice(-1).pop();
    if (!(last && last.merge(word))) this.words.push(word);
    if (!this.align) this.align = word.align;
  }
}

/** All lines of a text: one group, with the first gradient fill and stroke on it. */
export class SvgTextParagraph {
  constructor(public lines: SvgTextLine[]) {}

  _getGradient(key: "fillColor" | "strokeColor"): Gradient | null {
    for (let i = 0; i < this.lines.length; i++) {
      if ((this.lines[i] as SvgTextLine)._getGradient(key)) {
        return (this.lines[i] as SvgTextLine)._getGradient(key);
      }
    }
    return null;
  }

  renderSVG(context: SvgRenderContext, options: SvgExportOptions, element: SvgNamedNode): void {
    let defs: SvgElement | undefined;
    const fillGradient = this._getGradient("fillColor");
    const strokeGradient = this._getGradient("strokeColor");
    const parent = context.peek();
    const group = context.createSvgElement("g");
    context.peek().appendChild(group);
    context.push(group);
    const reference = (gradient: Gradient) => {
      let element: SvgElement | undefined;
      if (gradient instanceof LinearGradient) {
        element = createSvgLinearGradient(context, context.svgDoc, gradient);
      } else if (gradient instanceof RadialGradient) {
        element = createSvgRadialGradient(context, context.svgDoc, gradient);
      }
      if (!element) throw new Error("Unsupported GGradient: " + gradient);
      if (!defs) {
        defs = context.createSvgElement("defs");
        parent.appendChild(defs);
      }
      defs.appendChild(element);
      return SvgUtil.createIdUrl(element.getAttribute("id"));
    };
    if (fillGradient) group.setAttribute("fill", reference(fillGradient));
    if (strokeGradient) group.setAttribute("stroke", reference(strokeGradient));
    this.lines.forEach((line) => {
      line.renderSVG(context, options, element);
    });
    context.pop();
  }
}

/** The collected words of one text, by line. */
export class SvgText {
  static Mode = Mode;
  static Word = SvgTextWord;
  static Line = SvgTextLine;
  static Paragraph = SvgTextParagraph;

  _element: SvgNamedNode;
  _lines: SvgTextLine[];
  _origin: Transform | null = null;

  constructor(element: SvgNamedNode) {
    this._element = element;
    this._lines = [];
  }

  /** Adds a word to the last line, or to a new line when its baseline differs. */
  add(word: SvgTextWord): void {
    let line = this._lines.slice(-1).pop();
    if (line) {
      if (
        line.origin.mapPoint(new Point(0, 0)).getY() !==
        word.origin.mapPoint(new Point(0, 0)).getY()
      ) {
        line = new SvgTextLine(word.origin);
        this._lines.push(line);
      }
    } else {
      line = new SvgTextLine(word.origin);
      this._lines.push(line);
    }
    line.add(word);
  }

  setOrigin(origin: Transform | null | undefined): void {
    this._origin = origin ?? null;
  }

  getCurrentWord(): SvgTextWord | undefined {
    const line = this._lines.slice(-1).pop();
    if (line) return line.words.slice(-1).pop();
    return undefined;
  }

  renderSVG(context: SvgRenderContext, options?: SvgExportOptions | null): void {
    options = options || {};
    options.origin = this._origin;
    new SvgTextParagraph(this._lines).renderSVG(context, options, this._element);
  }
}
