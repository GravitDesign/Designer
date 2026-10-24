// Old: chunk.vendor.js module 1396.
//
// Turns the characters the canvas bridge collected during a PDF text
// object into GText nodes: characters on the same baseline with the same
// transform and color join into lines (gaps become letter spacing), and a
// new text starts otherwise. mergeTexts then joins a new text with the
// previous text node on the same clip when they continue the same line
// (horizontal) or the next line of a paragraph (vertical), and marks
// centered or indented lines.
//
// The words are the plain objects the bridge builds (see Word); GText
// stores them as its content, so their keys are kept as they are.
import { equals as utilEquals, extend } from "../../../engine/core/util.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform, type TransformDecomposition } from "../../../engine/math/transform.ts";
import { BorderPaintLayer } from "../../../engine/style/border-paint-layer.ts";
import type { Pattern } from "../../../engine/style/pattern.ts";
import { Text } from "../../../engine/text/text.ts";
import { TextMergerBase } from "../fonts/font-style-names.ts";

/** A pattern the bridge still has to turn into a Gravit gradient (marked by __pdfimportgradtype__). */
export interface PendingGradient {
  __pdfimportgradtype__: unknown;
  createGPattern(transform: Transform | null, bbox: Rect | null): Pattern | null;
}

/** One positioned run of characters, as the canvas bridge records it. */
export interface Word {
  text: string;
  ascent: number;
  descent: number;
  width: number;
  fontSize: number;
  fontSizeScale: number;
  wordSpacing: number;
  charSpacing: number;
  x: number;
  y: number;
  transform: Transform;
  startPoint: Point;
  endPoint: Point;
  fontColor?: unknown;
  borderColor?: unknown;
  borderWidth?: number;
  lineSpacing?: string;
  align?: string;
  [key: string]: unknown;
}

/** A GText made by the merger, with the block it was made from. */
export type MergedText = Text & { _$itext: TextBlock };

/** `key in value`, throwing like the old code did when value isn't an object. */
function has(value: unknown, key: string): boolean {
  return key in (value as object);
}

/** Whether two fills can share a text: equal, or neither a pending gradient. */
function canMergeFill(a: unknown, b: unknown): boolean {
  return !(
    !utilEquals(a, b) &&
    (has(a, "__pdfimportgradtype__") || has(b, "__pdfimportgradtype__"))
  );
}

/** The lines of one text node. */
export class TextBlock {
  lines: Line[] = [];
  defaultFill: unknown = null;
  defaultBorder: unknown = null;

  canMerge(other: TextBlock): boolean {
    return (
      canMergeFill(this.defaultFill, other.defaultFill) &&
      utilEquals(this.defaultBorder, other.defaultBorder)
    );
  }

  getFirstLine(): Line {
    return this.lines[0] as Line;
  }

  getLastLine(): Line {
    return this.lines[this.lines.length - 1] as Line;
  }

  merge(other: TextBlock): void {
    this.lines = this.lines.concat(other.lines);
  }

  add(line: Line): void {
    this.lines.push(line);
  }

  acceptLines(visitor: (line: Line) => void): void {
    for (const line of this.lines) visitor(line);
  }

  getGeometryBBox(): Rect {
    const first = this.getFirstLine();
    let topLeft = first.startPoint;
    let bottomRight = first.endPoint;
    for (const line of this.lines) {
      topLeft = Point.min(topLeft, line.startPoint);
      bottomRight = Point.max(bottomRight, line.endPoint);
    }
    return new Rect(
      topLeft.getX(),
      topLeft.getY(),
      bottomRight.getX() - topLeft.getX(),
      this.lines.length > 1 ? bottomRight.getY() - topLeft.getY() : (first.ascent as number),
    );
  }

  getContent(): Word[] {
    let words: Word[] = [];
    this.acceptLines((line) => {
      words = words.concat(line.words);
    });
    return words;
  }

  /** The text node for the block, or null when every line is blank. */
  toGText(): MergedText | null {
    let blank = true;
    this.acceptLines((line) => {
      if (!line.isEmpty()) blank = false;
    });
    if (blank) return null;
    const bbox = this.getGeometryBBox();
    const firstLine = this.getFirstLine();
    const translation = firstLine.transform.getTranslation();
    const transform = firstLine.transform
      .translated(-translation.getX(), -translation.getY())
      .translated(bbox.getX(), bbox.getY())
      .preMultiplied(new Transform().translated(0, -(firstLine.ascent as number)));
    const firstWord = firstLine.getFirstWord() as Word;
    let fill = firstWord.fontColor;
    const defaultFill = firstWord.fontColor || RGBColor.BLACK;
    if (has(defaultFill, "__pdfimportgradtype__")) {
      this.acceptLines((line) =>
        line.acceptWords((word) => {
          delete word.fontColor;
        }),
      );
      fill = (defaultFill as PendingGradient).createGPattern(null, bbox);
    }
    const borderWidth = firstWord.borderWidth || 1;
    let border = firstWord.borderColor;
    if (border && has(border, "__pdfimportgradtype__"))
      border = (border as PendingGradient).createGPattern(null, bbox);
    this.defaultFill = defaultFill;
    this.defaultBorder = border;
    const content = this.getContent();
    const text = new Text() as MergedText;
    text._$itext = this;
    text.setProperty("sc", true);
    text.transform(transform);
    text.setProperties(
      ["_tfi", "_aw", "_ah", "_fc"],
      [firstLine.defaultFontSize, true, true, fill],
    );
    if (border) {
      const layer = new BorderPaintLayer(border as Pattern);
      layer.setProperty("_bw", borderWidth);
      (text.getPaintLayers() as { appendChild(layer: unknown): void }).appendChild(layer);
    }
    text.setText(content);
    return text;
  }

  toString(): string {
    let text = "";
    for (const word of this.getContent()) text += word.text;
    return text;
  }
}

/** One line of a text block. */
export class Line {
  words: Word[] = [];
  transform: Transform = new Transform();
  startPoint: Point = new Point(0, 0);
  endPoint: Point = new Point(0, 0);
  defaultFontSize: number = 12;
  width: number | null = null;
  ascent: number | null = null;
  descent: number | null = null;

  constructor(word?: Word) {
    if (word) this.add(word);
  }

  isBreakLine(): boolean {
    const first = this.getFirstWord();
    return !!first && first.text.startsWith("\n");
  }

  isEmpty(): boolean {
    for (const word of this.words) if (word.text.trim() !== "") return false;
    return true;
  }

  getFirstWord(): Word | undefined {
    return this.words[0];
  }

  getLastWord(): Word | undefined {
    return this.words[this.words.length - 1];
  }

  acceptWords(visitor: (word: Word) => void): void {
    for (const word of this.words) visitor(word);
  }

  merge(other: Line): void {
    this.words = this.words.concat(other.words);
  }

  add(word: Word): void {
    if (!this.getLastWord()) {
      this.ascent = word.ascent;
      this.startPoint = word.startPoint;
      this.endPoint = word.endPoint.translated(0, word.ascent);
      this.transform = word.transform;
      this.defaultFontSize = word.fontSize;
    }
    this.words.push(word);
    this.ascent = Math.max(this.ascent as number, word.ascent);
    this.descent = Math.max(Math.abs(this.descent as number), Math.abs(word.descent));
    if (word.transform.getRotationFactor() <= 0) {
      this.endPoint = Point.max(this.endPoint, word.endPoint);
      this.startPoint = Point.min(this.startPoint, word.startPoint);
    } else {
      this.endPoint = Point.min(this.endPoint, word.endPoint);
      this.startPoint = Point.max(this.startPoint, word.startPoint);
    }
  }

  getHeight(): number {
    return (this.ascent as number) + (this.descent as number);
  }

  getWidth(): number {
    return this.endPoint.getX() - this.startPoint.getX();
  }

  toString(): string {
    const texts: string[] = [];
    this.acceptWords((word) => texts.push(word.text));
    return texts.join("");
  }
}

/** A word with the helpers the merger compares words by. */
class WordRef {
  word: Word;

  constructor(word: Word) {
    this.word = word;
  }

  get wordSpacing(): number {
    return this.word.wordSpacing || 0;
  }

  set wordSpacing(value: number) {
    this.word.wordSpacing = value;
  }

  get charSpacing(): number {
    return this.word.charSpacing || 0;
  }

  set charSpacing(value: number) {
    this.word.charSpacing = value;
  }

  get fontSizeScale(): number {
    return this.word.fontSizeScale;
  }

  get text(): string {
    return this.word.text;
  }

  set text(value: string) {
    this.word.text = value;
  }

  isSameTransformation(other: WordRef): boolean {
    return TextMergerBase.Transform.sameTransformation(this.word.transform, other.word.transform);
  }

  /** Same baseline once the rotation is taken out, to 4 decimals. */
  isSameLine(other: WordRef): boolean {
    let mine = this.word.transform
      .rotated(this.word.transform.getRotationFactor())
      .mapPoint(new Point(this.word.x, this.word.y))
      .getY();
    let theirs = other.word.transform
      .rotated(other.word.transform.getRotationFactor())
      .mapPoint(new Point(other.word.x, other.word.y))
      .getY();
    mine = parseFloat(mine.toFixed(4));
    theirs = parseFloat(theirs.toFixed(4));
    return mine === theirs;
  }

  canMergeColor(other: WordRef): boolean {
    return (
      canMergeFill(this.word.fontColor, other.word.fontColor) &&
      utilEquals(this.word.borderColor, other.word.borderColor)
    );
  }

  getHStartPoint(): number {
    return this.word.startPoint.getX();
  }

  /** The end of the word plus the spacing that follows its last character. */
  getHEndPoint(): number {
    const spacing = this.word.text.slice(-1) === " " ? this.wordSpacing : this.charSpacing;
    return this.word.endPoint.getX() + spacing;
  }

  clone(): WordRef {
    return new WordRef(extend({}, this.word) as Word);
  }

  /** Cuts characters off this word and returns them as a new word. */
  splice(start: number, end?: number): WordRef {
    const removed = this.slice(start, end);
    this.text =
      start < 0 ? this.text.substring(0, this.length() + start) : this.text.substring(start, end);
    return removed;
  }

  slice(start: number, end?: number): WordRef {
    const copy = this.clone();
    copy.text = this.text.slice(start, end || this.length());
    return copy;
  }

  length(): number {
    return this.text.length;
  }
}

export class TextMerger extends TextMergerBase {
  /** Groups words into text blocks. Consumes `words`. */
  override createTexts(words: Word[]): TextBlock[] {
    const blocks: TextBlock[] = [];
    let block: TextBlock | undefined;
    let line: Line | undefined;
    while (words.length) {
      const word = words.shift() as Word;
      if (!block) {
        block = new TextBlock();
        blocks.push(block);
      }
      if (line) {
        const previous = new WordRef(line.getLastWord() as Word);
        const current = new WordRef(word);
        if (
          current.isSameLine(previous) &&
          current.isSameTransformation(previous) &&
          current.canMergeColor(previous) &&
          current.getHStartPoint() > previous.getHStartPoint()
        ) {
          let gap = current.getHStartPoint() - previous.getHEndPoint();
          if (gap > 0) {
            gap *= previous.fontSizeScale;
            if (previous.length() > 1) {
              // The gap goes on the previous word's last character, split off as a word of its own.
              if (previous.slice(-1).charSpacing >= 0) {
                const last = previous.splice(-1);
                last.charSpacing = gap;
                line.add(last.word);
              }
            } else if (previous.charSpacing >= 0) {
              previous.charSpacing = gap;
            }
          }
        } else {
          line = new Line();
          block = new TextBlock();
          block.add(line);
          blocks.push(block);
        }
      } else {
        line = new Line();
        block.add(line);
      }
      line.add(word);
    }
    return blocks;
  }

  /** Merges `source` into `target` when it continues it. Returns whether it did. */
  override mergeTexts(target: MergedText, source: MergedText): boolean {
    let merged = false;
    const targetTransform = target.$trf as Transform;
    const sourceTransform = source.$trf as Transform;
    if (
      TextMergerBase.Transform.sameTransformation(targetTransform, sourceTransform) &&
      target._$itext.canMerge(source._$itext)
    ) {
      const horizontal = this._mergeHorizontalTexts(target, source);
      const vertical = this._mergeVerticalTexts(target, source);
      merged = horizontal || vertical;
    }
    this._applyAlignmentsAndIdentations(target);
    if (!merged) this._applyAlignmentsAndIdentations(source);
    return merged;
  }

  /** `source` starts the next line of `target`'s paragraph. */
  _mergeVerticalTexts(target: MergedText, source: MergedText): boolean {
    const targetBlock = target._$itext;
    const sourceBlock = source._$itext;
    let lastLine = targetBlock.getLastLine();
    const firstLine = sourceBlock.getFirstLine();
    if (lastLine.startPoint.getY() === firstLine.startPoint.getY()) return false;
    const targetBox = targetBlock.getGeometryBBox();
    const sourceBox = sourceBlock.getGeometryBBox();
    const sourceOnTargetRow = sourceBox
      .translated(0, -sourceBox.getY())
      .translated(0, targetBox.getY());
    if (targetBox.intersectsRect(sourceOnTargetRow)) {
      if (
        !targetBox.containsRect(sourceOnTargetRow) &&
        Math.abs(targetBox.getX() - sourceBox.getX()) > 2
      )
        return false;
      lastLine = targetBlock.getLastLine();
      const ascent = (lastLine.ascent as number) / lastLine.transform.getScaleFactor();
      const distance = sourceBox.getY() - targetBox.getSide(Rect.Side.BOTTOM_LEFT).getY();
      if (Math.abs(distance) <= (lastLine.ascent as number)) {
        const lastWord = lastLine.getLastWord() as Word;
        const firstWord = sourceBlock.getFirstLine().getFirstWord() as Word;
        if (!(lastWord.transform.decomposed() as TransformDecomposition).skew.isIdentity())
          return false;
        if (!new WordRef(lastWord).canMergeColor(new WordRef(firstWord))) return false;
        const line = lastLine;
        line.acceptWords((word) => {
          word.lineSpacing = ascent + distance / line.transform.getScaleFactor() + "";
        });
        const lineBreak = extend({}, lastWord) as Word;
        lineBreak.text = "\n";
        targetBlock.add(new Line(lineBreak));
        targetBlock.merge(sourceBlock);
        const translation = (target.getTransform() as Transform).getTranslation();
        const origin = Point.min(
          translation,
          sourceBlock.getGeometryBBox().getSide(Rect.Side.TOP_LEFT),
        );
        const move = new Transform()
          .translated(-translation.getX(), -translation.getY())
          .translated(origin.getX(), origin.getY());
        target.transform(move);
        target.setText(targetBlock.getContent());
        return true;
      }
    }
    return false;
  }

  /** `source` continues `target`'s last line within 10 points. */
  _mergeHorizontalTexts(target: MergedText, source: MergedText): boolean {
    const targetBlock = target._$itext;
    const sourceBlock = source._$itext;
    const lastLine = targetBlock.getLastLine();
    const firstLine = sourceBlock.getFirstLine();
    if (lastLine.startPoint.getY() !== firstLine.startPoint.getY()) return false;
    const lastWord = new WordRef(lastLine.getLastWord() as Word);
    const firstWord = new WordRef(firstLine.getFirstWord() as Word);
    if (!lastWord.canMergeColor(firstWord)) return false;
    const gap = firstWord.getHStartPoint() - lastWord.getHEndPoint();
    if (Math.abs(gap) <= 10) {
      if (gap > 0) {
        if (lastWord.length() > 1) {
          const last = lastWord.splice(-1);
          last.charSpacing = gap;
          lastLine.add(last.word);
        } else {
          lastWord.charSpacing = gap;
        }
      }
      lastLine.merge(firstLine);
      target.setText(targetBlock.getContent());
      return true;
    }
    return false;
  }

  /** Marks centered lines and indents lines that start right of the block. */
  _applyAlignmentsAndIdentations(text: MergedText): void {
    const block = text._$itext;
    const bbox = block.getGeometryBBox();
    let changed = false;
    block.acceptLines((line) => {
      if (!line.isBreakLine() && line.startPoint.getX() != bbox.getX()) {
        const right = bbox.getSide(Rect.Side.TOP_RIGHT).getX() - line.endPoint.getX();
        const left = line.startPoint.getX() - bbox.getX();
        const firstWord = line.getFirstWord() as Word;
        if (Math.abs(right - left) <= 2) {
          firstWord.align = "center";
          changed = true;
        }
        if (!firstWord.align) {
          const indent = extend({}, firstWord) as Word;
          indent.text = " ";
          indent.wordSpacing = parseInt(String(line.startPoint.getX() - bbox.getX()));
          line.startPoint = new Point(bbox.getX(), line.startPoint.getY());
          line.words.unshift(indent);
          changed = true;
        }
      }
    });
    if (changed) text.setText(block.getContent());
  }
}
