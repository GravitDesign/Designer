// Old: chunk.vendor.js module 1237 (GSVGPaintContext).
import type { Color } from "../../../engine/color/color.ts";
import { CMYKColor } from "../../../engine/color/cmyk-color.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { registerClass } from "../../../engine/core/object.ts";
import { PaintContext } from "../../../engine/paint/paint-context.ts";
import { Gradient } from "../../../engine/style/gradient.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import type { SvgElement } from "./svg-dom.ts";
import type { SvgContext, SvgContextStyle, SvgPathEntry } from "./svg-context.ts";
import { linearGradientAsSVG, radialGradientAsSVG } from "./svg-gradients.ts";
import { SvgPaintCanvas } from "./svg-paint-canvas.ts";
import { SvgPaintConfiguration } from "./svg-paint-configuration.ts";
import { SvgStyle } from "./svg-style.ts";
import { RadialGradient } from "../../../engine/style/radial-gradient.ts";

/** A color as a CSS fill: "rgb(r,g,b)" for RGB and CMYK colors, anything else as it is. */
export function toFill(color: unknown): unknown {
  let fill: unknown;
  if (color instanceof RGBColor || color instanceof CMYKColor) {
    const values = (color as Color).toScreen().slice(0, 4);
    fill = values
      ? 4 == values.length
        ? "rgba(" + values.join(",") + ")"
        : "rgb(" + values.join(",") + ")"
      : "";
  } else fill = color;
  return fill;
}

/** The canvas gradient's SVG element (the old prototype asSVG). */
export function gradientAsSVG(
  gradient: Gradient,
  document: SvgElement["ownerDocument"],
): SvgElement {
  const owner = document as NonNullable<typeof document>;
  if (gradient instanceof LinearGradient) return linearGradientAsSVG(gradient, owner);
  if (gradient instanceof RadialGradient) return radialGradientAsSVG(gradient, owner);
  // Only the linear and the radial gradient had asSVG.
  throw new TypeError("o.fillStyle.asSVG is not a function");
}

/**
 * The paint context of an SVG export: paints into an SvgPaintCanvas and
 * reads the recorded paths back with their styles.
 */
export class SvgPaintContext extends PaintContext {
  static {
    registerClass(this, "GSVGPaintContext");
  }

  /** "rgba(...)" of a color's value (the old static; it assigned an undeclared global). */
  static patternToRGBA(color: { _value: number[] } | null | undefined): string | undefined {
    if (!color) return undefined;
    let out = "rgba(" + color._value.join(",");
    if (3 == color._value.length) out += ",1";
    out += ")";
    return out;
  }

  static toFill = toFill;

  _context2d: SvgContext;
  declare configuration: SvgPaintConfiguration;
  declare canvas: SvgPaintCanvas;
  /** Set by the exporter while it renders a node (a function skips the contents, see GShape). */
  _ignoreContents: unknown;
  _ignoreFillStyle?: boolean;

  constructor(context: SvgContext) {
    super();
    this._context2d = context;
    this.configuration = new SvgPaintConfiguration();
    this.configuration.annotations = !!context._options.annotations;
    this.canvas = new SvgPaintCanvas(this._context2d);
    this._context2d.canvas = this.canvas as unknown as SvgContext["canvas"];
    this.canvas._canvasContext = context as unknown as SvgPaintCanvas["_canvasContext"];
    this.canvasStack = [this.canvas];
    this.outlineColors = [];
  }

  private get _svgContext(): SvgContext {
    return this.canvas._canvasContext as unknown as SvgContext;
  }

  /** Closes the pending path and returns every recorded entry. */
  getSvgPaths(): SvgPathEntry[] {
    this._svgContext._push();
    return this._svgContext._svgs;
  }

  override isIncludingInvisible(): boolean {
    return !!(
      this._context2d &&
      this._context2d._options &&
      this._context2d._options.includeInvisible
    );
  }

  getGlobalCompositeOperation(index: number): string {
    return (this._svgContext._svgStyles[index] as SvgContextStyle).globalCompositeOperation;
  }

  getGlobalAlpha(index: number): number | string | undefined {
    return (this._svgContext._svgStyles[index] as SvgContextStyle).globalAlpha;
  }

  getSvgStyleObject(index: number): SvgContextStyle {
    return this._svgContext._svgStyles[index] as SvgContextStyle;
  }

  /**
   * The CSS of recorded path `index`. A gradient becomes an element in
   * `defs` and is referenced by url. Defaults (butt caps, miter joins,
   * miter limit 4, opacity 1) are left out; missing values are filled in
   * on the recorded style itself, as the old code did.
   */
  getSvgStyle(index: number, defs: SvgElement): SvgStyle {
    let value: string;
    const style = new SvgStyle();
    const recorded = this._svgContext._svgStyles[index] as SvgContextStyle;
    const document = defs.ownerDocument;
    if (!this._ignoreFillStyle) {
      if (recorded._isStroke) {
        style.set("fill", "none");
        if (recorded.strokeStyle instanceof Gradient) {
          const element = gradientAsSVG(recorded.strokeStyle, document);
          style.set("stroke", "url(#" + element.getAttribute("id") + ")");
          defs.appendChild(element);
        } else style.set("stroke", recorded.strokeStyle);
        style.set("stroke-width", recorded.lineWidth);
      } else {
        style.set("stroke", "none");
        if (recorded.fillStyle instanceof Gradient) {
          const element = gradientAsSVG(recorded.fillStyle, document);
          style.set("fill", "url(#" + element.getAttribute("id") + ")");
          defs.appendChild(element);
        } else style.set("fill", recorded.fillStyle);
      }
    }
    if (!recorded.lineCap) recorded.lineCap = "butt";
    switch (recorded.lineCap) {
      case "square":
        value = "square";
        break;
      case "round":
        value = "round";
        break;
      case "butt":
      default:
        value = "butt";
    }
    if ("butt" !== value) style.set("stroke-linecap", value);
    else style.remove("stroke-linecap");
    if (!recorded.lineJoin) recorded.lineJoin = "miter";
    switch (recorded.lineJoin) {
      case "bevel":
        value = "bevel";
        break;
      case "round":
        value = "round";
        break;
      case "miter":
      default:
        value = "miter";
    }
    if ("miter" !== value) style.set("stroke-linejoin", value);
    else style.remove("stroke-linejoin");
    if (!recorded._dashArray) recorded._dashArray = [];
    if (recorded._dashArray instanceof Array && recorded._dashArray.length) {
      style.set("stroke-dasharray", recorded._dashArray);
    } else style.remove("stroke-dasharray");
    if (!recorded.miterLimit) recorded.miterLimit = "10";
    if (4 !== recorded.miterLimit && "4" !== recorded.miterLimit) {
      style.set("stroke-miterlimit", recorded.miterLimit);
    } else style.remove("stroke-miterlimit");
    if (!recorded.globalAlpha) recorded.globalAlpha = 1;
    if (1 != recorded.globalAlpha && "1" !== recorded.globalAlpha) {
      style.set("opacity", recorded.globalAlpha);
    } else style.remove("opacity");
    if ("evenodd" === recorded._fillRule) style.set("fill-rule", "evenodd");
    return style;
  }

  override toString(): string {
    return "[Object GSVGPaintContext]";
  }
}
