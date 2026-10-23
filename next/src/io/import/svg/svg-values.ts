// Old: chunk.vendor.js module 1391, the value part of the canvg 1.x fork
// the SVG importer is built on: attribute values (canvg's svg.Property),
// the CSS font shorthand parser (svg.Font), canvg's bounding box
// (svg.Rect), points, transform lists (svg.Transform), viewBox fitting
// (svg.AspectRatio) and the view port stack. The elements are in
// svg-parser.ts.
//
// canvg drew SVG onto a canvas; Gravit's fork builds scene nodes instead
// and left the canvas half behind. Only the parts the scene building
// reaches are ported. Where that code still reaches the canvas (`svg.ctx`
// was never set), the port throws the TypeError the old code ran into.
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Length } from "../../../engine/math/length.ts";
import { Transform } from "../../../engine/math/transform.ts";

/** An attribute or style value; the importer itself also stores numbers. */
export type PropertyValue = string | number;

/** What a property needs from the parser: the view port stack and the defined elements. */
export interface PropertyContext {
  readonly ViewPort: ViewPort;
  readonly Definitions: Record<string, unknown>;
}

/** What a gradient or pattern element offers as a fill (see getFillStyleDefinition). */
export interface FillDefinition {
  createGradient?(ctx: undefined, element: unknown, opacity: SvgProperty): Promise<FillStyle>;
  createPattern?(ctx: undefined, element: unknown, opacity: SvgProperty): Promise<FillStyle>;
}

/** A fill from a gradient or pattern element: the engine pattern and its opacity. */
export interface FillStyle {
  color: unknown;
  opacity: number | null;
}

export function trim(text: string): string {
  return text.replace(/^\s+|\s+$/g, "");
}

export function compressSpaces(text: string): string {
  return text.replace(/[\s\r\t\n]+/gm, " ");
}

/** "1, 2 3" -> [1, 2, 3] (parseFloat of every part, NaN included). */
export function toNumberArray(text: string | null | undefined): number[] {
  const parts = trim(compressSpaces((text || "").replace(/,/g, " "))).split(" ");
  return parts.map((part) => parseFloat(part));
}

/** [color, alpha] of a CSS color, or null. */
export function getColor(text: string): [RGBColor, number] | null {
  const parsed = RGBColor.parseCSSColor(text);
  return parsed ? [new RGBColor(parsed.slice(0, 3)), parsed[3] as number] : null;
}

/** canvg's svg.Point. */
export class SvgPoint {
  constructor(
    public x: number,
    public y: number,
  ) {}

  angleTo(point: SvgPoint): number {
    return Math.atan2(point.y - this.y, point.x - this.x);
  }
}

/** The first two numbers of the text as a point. */
export function createPoint(text: string | null | undefined): SvgPoint {
  const numbers = toNumberArray(text);
  return new SvgPoint(numbers[0] as number, numbers[1] as number);
}

/** Every two numbers of the text as a point (the points of polylines). */
export function createPath(text: string | null | undefined): SvgPoint[] {
  const numbers = toNumberArray(text);
  const points: SvgPoint[] = [];
  for (let i = 0; i < numbers.length; i += 2) {
    points.push(new SvgPoint(numbers[i] as number, numbers[i + 1] as number));
  }
  return points;
}

/**
 * canvg's svg.Rect, the bounding boxes the elements remember for
 * gradients and patterns. An empty one starts at +-Infinity; expand()
 * moves the bottom edge to the x of a point below it, as the old code did
 * (QUESTIONS.md "SVG import line bounds").
 */
export class SvgBounds {
  _x0: number;
  _y0: number;
  _x1: number;
  _y1: number;

  constructor(x?: number, y?: number, width?: number, height?: number) {
    this._x0 = void 0 !== x ? x : 1 / 0;
    this._y0 = void 0 !== y ? y : 1 / 0;
    this._x1 = void 0 !== width ? (x as number) + width : Number.NEGATIVE_INFINITY;
    this._y1 = void 0 !== height ? (y as number) + height : Number.NEGATIVE_INFINITY;
  }

  width(): number {
    return this._x1 - this._x0;
  }

  height(): number {
    return this._y1 - this._y0;
  }

  x(): number {
    return this._x0;
  }

  y(): number {
    return this._y0;
  }

  expand(point: SvgPoint): void {
    if (point.x < this._x0) this._x0 = point.x;
    if (point.x > this._x1) this._x1 = point.x;
    if (point.y < this._y0) this._y0 = point.y;
    if (point.y > this._y1) this._y1 = point.x;
  }
}

/** The stack of view port sizes percentages resolve against. */
export class ViewPort {
  viewPorts: { width: number; height: number }[] = [];

  Clear(): void {
    this.viewPorts = [];
  }

  SetCurrent(width: number, height: number): void {
    this.viewPorts.push({ width, height });
  }

  RemoveCurrent(): void {
    this.viewPorts.pop();
  }

  Current(): { width: number; height: number } {
    // An empty stack gives undefined, and width() then throws, as before.
    return this.viewPorts[this.viewPorts.length - 1] as { width: number; height: number };
  }

  width(): number {
    return this.Current().width;
  }

  height(): number {
    return this.Current().height;
  }

  /** The size a length along `axis` ("x", "y", or the diagonal) is relative to. */
  ComputeSize(axis?: string | number): number {
    return null != axis && "number" == typeof axis
      ? axis
      : "x" == axis
        ? this.width()
        : "y" == axis
          ? this.height()
          : Math.sqrt(Math.pow(this.width(), 2) + Math.pow(this.height(), 2)) / Math.sqrt(2);
  }
}

/** svg.Font: the parsed parts of a CSS font shorthand. */
export interface ParsedFont {
  fontFamily?: string;
  fontSize?: string;
  fontStyle?: string;
  fontWeight?: string;
  fontVariant?: string;
}

const FONT_STYLES = "normal|italic|oblique|inherit";
const FONT_VARIANTS = "normal|small-caps|inherit";
const FONT_WEIGHTS = "normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900|inherit";

/**
 * Splits a CSS font shorthand ("italic bold 12px Open Sans") into its
 * parts, in canvg's order: style, variant, weight, size, family. A part
 * is matched with indexOf against the "a|b|c" lists, so any substring
 * ("bo", "1") counts too. The family is the remaining words joined
 * without spaces.
 */
export function parseFont(text: string | null | undefined): ParsedFont {
  const font: ParsedFont = {};
  const parts = trim(compressSpaces(text || "")).split(" ");
  const seen = { fontSize: false, fontStyle: false, fontWeight: false, fontVariant: false };
  let family = "";
  for (const part of parts) {
    if (!seen.fontStyle && -1 != FONT_STYLES.indexOf(part)) {
      if ("inherit" != part) font.fontStyle = part;
      seen.fontStyle = true;
    } else if (!seen.fontVariant && -1 != FONT_VARIANTS.indexOf(part)) {
      if ("inherit" != part) font.fontVariant = part;
      seen.fontStyle = seen.fontVariant = true;
    } else if (!seen.fontWeight && -1 != FONT_WEIGHTS.indexOf(part)) {
      if ("inherit" != part) font.fontWeight = part;
      seen.fontStyle = seen.fontVariant = seen.fontWeight = true;
    } else if (!seen.fontSize) {
      if ("inherit" != part) font.fontSize = part.split("/")[0] as string;
      seen.fontStyle = seen.fontVariant = seen.fontWeight = seen.fontSize = true;
    } else if ("inherit" != part) {
      family += part;
    }
  }
  if ("" != family) font.fontFamily = family;
  return font;
}

/** svg.Font.CreateFont with a font string (the importer always passes one). */
export function createFont(fontText: string): ParsedFont {
  return parseFont(fontText);
}

/** canvg's svg.Property: one attribute or style value of an element. */
export class SvgProperty {
  constructor(
    readonly context: PropertyContext,
    public name: string,
    public value: PropertyValue,
  ) {}

  getValue(): PropertyValue {
    return this.value;
  }

  hasValue(): boolean {
    return null != this.value && "" !== this.value;
  }

  /** The number, a percentage as a fraction; 0 without a value. */
  numValue(): number {
    if (!this.hasValue()) return 0;
    let value = parseFloat(this.value as string);
    if ((this.value + "").match(/%$/)) value /= 100;
    return value;
  }

  valueOrDefault<T>(fallback: T): PropertyValue | T {
    return this.hasValue() ? this.value : fallback;
  }

  numValueOrDefault(fallback: number): number {
    return this.hasValue() ? this.numValue() : fallback;
  }

  /** The color with the opacity's value as its alpha (stop-opacity on stop-color). */
  addOpacity(opacity: SvgProperty): SvgProperty {
    let value = this.value;
    if (null != opacity.value && "" != opacity.value && "string" == typeof this.value) {
      const color = this.value ? RGBColor.parseCSSColor(this.value) : null;
      if (color) {
        value =
          "rgba(" + color[0] + ", " + color[1] + ", " + color[2] + ", " + opacity.numValue() + ")";
      }
    }
    return new SvgProperty(this.context, this.name, value);
  }

  /** The element a "url(#id)" or "#id" value names, by its id. */
  getDefinition<T = unknown>(): T | undefined {
    // A number value throws here, as in the old code.
    let id: string | null = null;
    const match = (this.value as string).match(/#([^)'"]+)/);
    if (match) id = match[1] as string;
    if (!id) id = this.value as string;
    return this.context.Definitions[id] as T | undefined;
  }

  isUrlDefinition(): boolean {
    return 0 == (this.value as string).indexOf("url(");
  }

  /**
   * The gradient or pattern this "url(#id)" value names, as a fill for
   * `element`; anything else resolves to no color. The canvas context
   * canvg passed first was never set.
   */
  getFillStyleDefinition(element: unknown, opacity: SvgProperty): Promise<FillStyle> {
    const definition = this.getDefinition<FillDefinition>();
    if (null != definition && definition.createGradient) {
      return definition.createGradient(undefined, element, opacity);
    }
    if (null != definition && definition.createPattern) {
      return definition.createPattern(undefined, element, opacity);
    }
    return Promise.resolve({ color: null, opacity: null });
  }

  getDPI(): number {
    return Length.DPI;
  }

  /**
   * The font size em and ex units are relative to. canvg read it from the
   * canvas context's font; the importer never set a context, so any em or
   * ex length throws (QUESTIONS.md "SVG import em units").
   */
  getEM(): number {
    throw new TypeError("Cannot read properties of undefined (reading 'font')");
  }

  getUnits(): string {
    return (this.value + "").replace(/[0-9.-]/g, "");
  }

  /**
   * The length in pixels at 72 DPI (so 1pt = 1px and 1in = 72px). Percent
   * is relative to the current view port along `axis`; with
   * `scaleFractions`, a plain number below 1 is a fraction of it too.
   */
  toPixels(axis?: string, scaleFractions?: boolean): number {
    if (!this.hasValue()) return 0;
    const text = this.value + "";
    if (text.match(/em$/)) return this.numValue() * this.getEM();
    if (text.match(/ex$/)) return (this.numValue() * this.getEM()) / 2;
    if (text.match(/px$/)) return this.numValue();
    if (text.match(/pt$/)) return this.numValue() * this.getDPI() * (1 / 72);
    if (text.match(/pc$/)) return 15 * this.numValue();
    if (text.match(/cm$/)) return (this.numValue() * this.getDPI()) / 2.54;
    if (text.match(/mm$/)) return (this.numValue() * this.getDPI()) / 25.4;
    if (text.match(/in$/)) return this.numValue() * this.getDPI();
    if (text.match(/%$/)) return this.numValue() * this.context.ViewPort.ComputeSize(axis);
    const value = this.numValue();
    return scaleFractions && value < 1 ? value * this.context.ViewPort.ComputeSize(axis) : value;
  }

  toRadians(): number {
    if (!this.hasValue()) return 0;
    const text = this.value + "";
    return text.match(/deg$/)
      ? this.numValue() * (Math.PI / 180)
      : text.match(/grad$/)
        ? this.numValue() * (Math.PI / 200)
        : text.match(/rad$/)
          ? this.numValue()
          : this.numValue() * (Math.PI / 180);
  }
}

/** What transforms, viewBox fitting and the elements work on: the current transform. */
export interface SceneContext {
  transform: Transform;
  /** The clip path an element's clip-path style made, wrapped around it after its children. */
  clipPath?: unknown;
}

/** One function of a transform list. */
interface TransformStep {
  apply(context: SceneContext): void;
}

class TranslateStep implements TransformStep {
  p: SvgPoint;

  constructor(args: string) {
    this.p = createPoint(args);
  }

  apply(context: SceneContext): void {
    context.transform = context.transform.preMultiplied(
      new Transform().translated(this.p.x || 0, this.p.y || 0),
    );
  }
}

class RotateStep implements TransformStep {
  angle: SvgProperty;
  cx: number;
  cy: number;

  constructor(context: PropertyContext, args: string) {
    const numbers = toNumberArray(args);
    this.angle = new SvgProperty(context, "angle", numbers[0] as number);
    this.cx = numbers[1] || 0;
    this.cy = numbers[2] || 0;
  }

  apply(context: SceneContext): void {
    context.transform = context.transform.preMultiplied(
      new Transform()
        .translated(this.cx, this.cy)
        .preMultiplied(new Transform().rotated(this.angle.toRadians()))
        .preMultiplied(new Transform().translated(-this.cx, -this.cy)),
    );
  }
}

class ScaleStep implements TransformStep {
  p: SvgPoint;

  constructor(args: string) {
    this.p = createPoint(args);
  }

  apply(context: SceneContext): void {
    context.transform = context.transform.preMultiplied(
      new Transform().scaled(this.p.x || 1, this.p.y || this.p.x || 1),
    );
  }
}

/**
 * matrix(a b c d e f). Unlike the other steps it multiplies on the other
 * side (`multiplied`, not `preMultiplied`), so a matrix() after another
 * function applies in the opposite order (QUESTIONS.md "SVG import
 * matrix order").
 */
class MatrixStep implements TransformStep {
  m: number[];

  constructor(args: string | undefined) {
    this.m = toNumberArray(args);
  }

  apply(context: SceneContext): void {
    const m = this.m;
    context.transform = context.transform.multiplied(
      new Transform(
        m[0] as number,
        m[1] as number,
        m[2] as number,
        m[3] as number,
        m[4] as number,
        m[5] as number,
      ),
    );
  }
}

/** skewX/skewY (and canvg's SkewBase): a matrix step with the tangent of the angle. */
class SkewStep extends MatrixStep {
  angle: SvgProperty;

  constructor(context: PropertyContext, args: string, axis?: "x" | "y") {
    super(args);
    this.angle = new SvgProperty(context, "angle", args);
    if (axis === "x") this.m = [1, 0, Math.tan(this.angle.toRadians()), 1, 0, 0];
    else if (axis === "y") this.m = [1, Math.tan(this.angle.toRadians()), 0, 1, 0, 0];
  }
}

/**
 * svg.Transform: a transform attribute ("translate(10 20) rotate(45)")
 * as a list of steps applied in order to a context's transform. A name
 * canvg has no step for, or a function without "(", throws a TypeError
 * as before.
 */
export class SvgTransform {
  transforms: (TransformStep & { type: string })[] = [];

  constructor(context: PropertyContext, text: string) {
    const parts = trim(compressSpaces(text))
      .replace(/\)([a-zA-Z])/g, ") $1")
      .replace(/\)(\s?,\s?)/g, ") ")
      .split(/\s(?=[a-z])/);
    for (const part of parts) {
      const type = trim(part.split("(")[0] as string);
      const argsPart = part.split("(")[1];
      if (argsPart === undefined) {
        throw new TypeError("Cannot read properties of undefined (reading 'replace')");
      }
      const args = argsPart.replace(")", "");
      let step: TransformStep;
      switch (type) {
        case "translate":
          step = new TranslateStep(args);
          break;
        case "rotate":
          step = new RotateStep(context, args);
          break;
        case "scale":
          step = new ScaleStep(args);
          break;
        case "matrix":
          step = new MatrixStep(args);
          break;
        case "SkewBase":
          step = new SkewStep(context, args);
          break;
        case "skewX":
          step = new SkewStep(context, args, "x");
          break;
        case "skewY":
          step = new SkewStep(context, args, "y");
          break;
        default:
          throw new TypeError("this.Type[o] is not a constructor");
      }
      this.transforms.push(Object.assign(step, { type }));
    }
  }

  apply(context: SceneContext): void {
    for (const step of this.transforms) step.apply(context);
  }
}

/**
 * svg.AspectRatio: fits a viewBox (`viewWidth` x `viewHeight` at
 * `minX`, `minY`) into a `width` x `height` view port by
 * preserveAspectRatio, appending the translation and scale to the
 * context's transform. With refX and refY (markers) the alignment is
 * replaced by a shift of the scaled reference point.
 */
export function aspectRatio(
  propertyContext: PropertyContext,
  context: SceneContext,
  preserveAspectRatio: string,
  width: number,
  viewWidth: number,
  height: number,
  viewHeight: number,
  minX: number | null | undefined,
  minY: number | null | undefined,
  refX?: PropertyValue,
  refY?: PropertyValue,
): void {
  preserveAspectRatio = compressSpaces(preserveAspectRatio).replace(/^defer\s/, "");
  const align = preserveAspectRatio.split(" ")[0] || "xMidYMid";
  const meetOrSlice = preserveAspectRatio.split(" ")[1] || "meet";
  const scaleX = width / viewWidth;
  const scaleY = height / viewHeight;
  const scaleMin = Math.min(scaleX, scaleY);
  const scaleMax = Math.max(scaleX, scaleY);
  if ("meet" == meetOrSlice) {
    viewWidth *= scaleMin;
    viewHeight *= scaleMin;
  }
  if ("slice" == meetOrSlice) {
    viewWidth *= scaleMax;
    viewHeight *= scaleMax;
  }
  const refXProperty = new SvgProperty(propertyContext, "refX", refX as PropertyValue);
  const refYProperty = new SvgProperty(propertyContext, "refY", refY as PropertyValue);
  if (refXProperty.hasValue() && refYProperty.hasValue()) {
    context.transform = context.transform.translated(
      -scaleMin * refXProperty.toPixels("x"),
      -scaleMin * refYProperty.toPixels("y"),
    );
  } else {
    const fitsX =
      ("meet" == meetOrSlice && scaleMin == scaleY) ||
      ("slice" == meetOrSlice && scaleMax == scaleY);
    const fitsY =
      ("meet" == meetOrSlice && scaleMin == scaleX) ||
      ("slice" == meetOrSlice && scaleMax == scaleX);
    if (align.match(/^xMid/) && fitsX) {
      context.transform = context.transform.translated(width / 2 - viewWidth / 2, 0);
    }
    if (align.match(/YMid$/) && fitsY) {
      context.transform = context.transform.translated(0, height / 2 - viewHeight / 2);
    }
    if (align.match(/^xMax/) && fitsX) {
      context.transform = context.transform.translated(width - viewWidth, 0);
    }
    if (align.match(/YMax$/) && fitsY) {
      context.transform = context.transform.translated(0, height - viewHeight);
    }
  }
  if ("none" == align) context.transform = context.transform.scaled(scaleX, scaleY);
  else if ("meet" == meetOrSlice) context.transform = context.transform.scaled(scaleMin, scaleMin);
  else if ("slice" == meetOrSlice) context.transform = context.transform.scaled(scaleMax, scaleMax);
  context.transform = context.transform.translated(
    null == minX ? 0 : -minX,
    null == minY ? 0 : -minY,
  );
}
