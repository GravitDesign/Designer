// Old: chunk.vendor.js module 293 (GPDFGraphics, the PDF graphics block).
import { PDFLineDash } from "./dash.ts";
import { PDFLineCap } from "./line-cap.ts";
import { PDFLineJoin } from "./line-join.ts";
import type { PDFMediaBox } from "./media-box.ts";
import { PDFObjectCollection } from "./object-collection.ts";
import { OPERATIONFLAG_FILL, OPERATIONFLAG_STROKE } from "./operation-flags.ts";
import { PDFOperators } from "./operators.ts";
import type { PDFOutput } from "./output.ts";
import { PDFValue } from "./pdf-name.ts";
import { PDFObject } from "./pdf-object.ts";
import { PDFSetLineWidthOperation } from "./set-line-width.ts";
import { PDFText } from "./text-writer.ts";

/** What a graphics block needs from the document. */
export interface PDFGraphicsDocument {
  getPageSize(): PDFMediaBox;
}

/**
 * Fills the path in front of it: the paint, then `f` (`f*` for even-odd).
 * With `workaroundStroke` it strokes the path in the fill paint first.
 */
export class PDFFill extends PDFObject {
  declare _fillStyle: PDFObject | null;
  declare _rule: string | null | undefined;
  declare _workaroundStroke: boolean | null;
  declare _path: PDFObject | null;
  declare _lineWidth: number | null;

  constructor() {
    super();
    this._workaroundStroke = false;
  }

  get fillStyle(): PDFObject | null {
    return this._fillStyle;
  }
  set fillStyle(style: PDFObject | null) {
    this._fillStyle = style;
  }

  get lineWidth(): number | null {
    return this._lineWidth;
  }
  set lineWidth(width: number | null) {
    this._lineWidth = width;
  }

  get rule(): string | null | undefined {
    return this._rule;
  }
  set rule(rule: string | null | undefined) {
    this._rule = rule;
  }

  get workaroundStroke(): boolean | null {
    return this._workaroundStroke;
  }
  set workaroundStroke(value: boolean | null) {
    this._workaroundStroke = value;
  }

  get path(): PDFObject | null {
    return this._path;
  }
  set path(path: PDFObject | null) {
    this._path = path;
  }

  override write(output: PDFOutput): void {
    const collection = new PDFObjectCollection();
    if (this._workaroundStroke) {
      const stroke = new PDFStroke();
      stroke.lineWidth = this._lineWidth;
      stroke.strokeStyle = this._fillStyle;
      collection.add(stroke);
      collection.add(this._path);
    }
    collection.add(this._fillStyle);
    collection.add("evenodd" === this._rule ? PDFOperators.f$ : PDFOperators.f);
    collection.write(output);
  }
}

Object.assign(PDFFill.prototype, {
  _fillStyle: null,
  _rule: null,
  _workaroundStroke: null,
  _path: null,
  _lineWidth: null,
});

/**
 * Strokes the path in front of it: width, dash, cap, join, paint and
 * miter limit as far as set, then `S`, then dash, cap and join reset.
 */
export class PDFStroke extends PDFObject {
  declare _strokeStyle: PDFObject | null;
  declare _lineWidth: number | null;
  declare _lineDash: PDFLineDash | null;
  declare _lineCap: PDFLineCap | null;
  declare _lineJoin: PDFLineJoin | null;
  declare _miterLimit: number | null;

  get miterlimit(): number | null {
    return this._miterLimit;
  }
  set miterlimit(limit: number | null) {
    this._miterLimit = limit;
  }

  get strokeStyle(): PDFObject | null {
    return this._strokeStyle;
  }
  set strokeStyle(style: PDFObject | null) {
    this._strokeStyle = style;
  }

  get lineWidth(): number | null {
    return this._lineWidth;
  }
  set lineWidth(width: number | null) {
    this._lineWidth = width;
  }

  get lineDash(): PDFLineDash | null {
    return this._lineDash;
  }
  set lineDash(dash: PDFLineDash | null) {
    this._lineDash = dash;
  }

  get lineCap(): PDFLineCap | null {
    return this._lineCap;
  }
  set lineCap(cap: PDFLineCap | null) {
    this._lineCap = cap;
  }

  get lineJoin(): PDFLineJoin | null {
    return this._lineJoin;
  }
  set lineJoin(join: PDFLineJoin | null) {
    this._lineJoin = join;
  }

  override write(output: PDFOutput): void {
    const collection = new PDFObjectCollection();
    if (this._lineWidth) collection.add(new PDFSetLineWidthOperation(this._lineWidth));
    if (this._lineDash) collection.add(this._lineDash);
    if (this._lineCap) collection.add(this._lineCap);
    if (this._lineJoin) collection.add(this._lineJoin);
    if (this._strokeStyle) collection.add(this._strokeStyle);
    if (this._miterLimit) collection.add(this._miterLimit + " M");
    collection.add(PDFOperators.S);
    if (this._lineDash) collection.add(new PDFLineDash());
    if (this._lineCap) collection.add(new PDFLineCap());
    if (this._lineJoin) collection.add(new PDFLineJoin());
    collection.write(output);
  }
}

Object.assign(PDFStroke.prototype, {
  _strokeStyle: null,
  _lineWidth: null,
  _lineDash: null,
  _lineCap: null,
  _lineJoin: null,
  _miterLimit: null,
});

/**
 * A graphics block `q ... Q`: an optional clip, then its objects one per
 * line (empty ones, such as node markers, write nothing). An empty block
 * writes nothing at all. A graphics state set on it goes first.
 */
export class PDFGraphics extends PDFObject {
  static OPERATIONFLAG_STROKE = OPERATIONFLAG_STROKE;
  static OPERATIONFLAG_FILL = OPERATIONFLAG_FILL;
  static Fill = PDFFill;
  static Stroke = PDFStroke;

  doc: PDFGraphicsDocument;
  declare _pageSize: PDFMediaBox | null;
  pdfObjects: PDFValue[];
  lastObject: unknown;
  _gs: PDFObject | null;
  declare _clip: PDFObject | null | undefined;

  constructor(document: PDFGraphicsDocument) {
    super();
    this.doc = document;
    this._pageSize = document.getPageSize();
    this.pdfObjects = [];
    this.lastObject = null;
    this._gs = null;
  }

  setClip(clip: PDFObject | null): void {
    this._clip = clip;
  }

  /** Calls `visit` for each object (on a copy of the list) until it returns false. */
  accept(visit: (value: PDFValue, index: number) => unknown): void {
    const objects = this.pdfObjects.slice();
    for (let i = 0; i < objects.length && false !== visit(objects[i] as PDFValue, i); i++);
  }

  clear(): PDFValue[] {
    return this.pdfObjects.splice(0, this.pdfObjects.length);
  }

  size(): number {
    return this.pdfObjects.length;
  }

  override isEmpty(): boolean {
    return 0 === this.size();
  }

  setGStateResource(gstate: PDFObject): void {
    this._gs = gstate;
    this.add(gstate, 0);
  }

  getGSStateResource(): PDFObject | null {
    return this._gs;
  }

  /** Adds a word to the text object at the end, starting a new one if needed. */
  addText(word: Parameters<PDFText["add"]>[0]): PDFText {
    let text = this.getPDFText();
    if (!text) {
      text = new PDFText();
      this.add(text);
    }
    text.add(word);
    return text;
  }

  getDocument(): PDFGraphicsDocument {
    return this.doc;
  }

  getPDFText(): PDFText | null {
    return this.lastObject instanceof PDFText ? this.lastObject : null;
  }

  /** Adds an object (each item of an array), at `index` or at the end. */
  add(object: unknown, index?: number | null): void {
    if (Array.isArray(object)) {
      // forEach like the old GUtil.each: holes of a sparse array are skipped.
      object.forEach((item) => this.add(item));
    } else {
      const value = new PDFValue(object);
      if (null != index) this.pdfObjects.splice(index, 0, value);
      else this.pdfObjects.push(value);
      this.lastObject = object;
    }
  }

  set(object: unknown, index: number): void {
    this.remove(index);
    this.add(object, index);
  }

  get(index: number): PDFValue | undefined {
    return this.pdfObjects[index];
  }

  remove(index: number): PDFValue[] {
    return this.pdfObjects.splice(index, 1);
  }

  peek(): PDFValue {
    return this.get(this.pdfObjects.length - 1) || new PDFValue.Null();
  }

  pop(): PDFValue | undefined {
    return this.pdfObjects.pop();
  }

  fill(rule?: string | null): void {
    this.add("evenodd" === rule ? PDFOperators.f$ : PDFOperators.f);
  }

  stroke(): void {
    this.add(PDFOperators.S);
  }

  relativeY(y: number): number {
    return (this._pageSize as PDFMediaBox).relativeY(y);
  }

  override write(output: PDFOutput): void {
    if (this.pdfObjects.length) {
      output.writeln("q");
      if (this._clip) {
        this._clip.write(output);
        output.writeln();
      }
      for (const value of this.pdfObjects) {
        if (!value.isEmpty()) {
          value.write(output);
          output.writeln();
        }
      }
      output.write("Q");
    }
  }
}

PDFGraphics.prototype._pageSize = null;
