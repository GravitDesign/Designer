// Old: chunk.vendor.js module 1148 (SVG gradient elements).
//
// The old module patched GLinearGradient and GRadialGradient: an export id
// counter on each class, `_setPosition` and `asSVG` on their prototypes.
// Here those are plain functions; the counters are module state that,
// like the old class fields, only a page reload resets.
import type { Color } from "../../../engine/color/color.ts";
import { Transform } from "../../../engine/math/transform.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import type { GradientStop } from "../../../engine/style/gradient.ts";
import type { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import type { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import type { SvgDocument, SvgElement } from "./svg-dom.ts";
import { SVG_NAMESPACE } from "./svg-dom.ts";
import { numberFormat } from "./number-format.ts";
import { toFill } from "./svg-paint-context.ts";

/** A color stop added through the canvas API (CanvasGradient.addColorStop): the color is a CSS string. */
export interface CanvasColorStop {
  position: number;
  color: Color | string;
  opacity?: number | null;
}

/**
 * The fields the SVG canvas context adds to the gradients it creates for
 * the paint code (createLinearGradient / createRadialGradient): the line
 * of a linear gradient and the stops added with addColorStop.
 */
export interface CanvasGradientFields {
  _x0?: number;
  _y0?: number;
  _x1?: number;
  _y1?: number;
  _stops2?: CanvasColorStop[];
}

type SvgLinearGradient = LinearGradient & CanvasGradientFields;
type SvgRadialGradient = RadialGradient & CanvasGradientFields;

/** The old GLinearGradient._nextExportId and GRadialGradient._nextExportId. */
export const gradientExportIds = { linear: 0, radial: 0 };

export const GradientUnits = {
  UserSpaceOnUse: "userSpaceOnUse",
  ObjectBoundingBox: "objectBoundingBox",
} as const;

/** GLinearGradient.prototype._setPosition. */
export function setGradientPosition(
  gradient: CanvasGradientFields,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  gradient._x0 = x0;
  gradient._x1 = x1;
  gradient._y0 = y0;
  gradient._y1 = y1;
}

function appendStops(
  document: SvgDocument,
  element: SvgElement,
  stops: readonly (CanvasColorStop | GradientStop)[] | undefined,
  opacityFirst: boolean,
): void {
  if (!stops) return;
  for (const stop of stops) {
    const node = document.createElementNS(SVG_NAMESPACE, "stop");
    element.appendChild(node);
    node.setAttribute("offset", 100 * stop.position + "%");
    if (opacityFirst) {
      if (null != stop.opacity) node.setAttribute("stop-opacity", stop.opacity);
      node.setAttribute("style", "stop-color:" + toFill(stop.color));
    } else {
      node.setAttribute("style", "stop-color:" + toFill(stop.color));
      if (null != stop.opacity) node.setAttribute("stop-opacity", stop.opacity);
    }
  }
}

/** GLinearGradient.prototype.asSVG: a canvas gradient in canvas coordinates. */
export function linearGradientAsSVG(
  gradient: SvgLinearGradient,
  document: SvgDocument,
): SvgElement {
  const id = "_lgradient_" + gradientExportIds.linear++;
  const element = document.createElementNS(SVG_NAMESPACE, "linearGradient");
  element.setAttribute("id", id);
  element.setAttribute("x1", gradient._x0);
  element.setAttribute("y1", gradient._y0);
  element.setAttribute("x2", gradient._x1);
  element.setAttribute("y2", gradient._y1);
  appendStops(document, element, gradient._stops2, false);
  return element;
}

/** GRadialGradient.prototype.asSVG: percentages of the bounding box. */
export function radialGradientAsSVG(
  gradient: SvgRadialGradient,
  document: SvgDocument,
): SvgElement {
  const id = "_rgradient_" + gradientExportIds.radial++;
  const element = document.createElementNS(SVG_NAMESPACE, "radialGradient");
  element.setAttribute("id", id);
  element.setAttribute("fx", 100 * gradient._fx + "%");
  element.setAttribute("fy", 100 * gradient._fy + "%");
  element.setAttribute("cx", 100 * gradient._cx + "%");
  element.setAttribute("cy", 100 * gradient._cy + "%");
  element.setAttribute("r", 100 * gradient._scale + "%");
  const transform = gradient._transform;
  if (transform && !transform.isIdentity()) {
    // [_sx, _shy, _shx, _sy, _tx, _ty], space separated and not rounded.
    const matrix = transform.getMatrix();
    element.setAttribute("gradientTransform", "matrix(" + matrix.join(" ") + ")");
  }
  appendStops(document, element, gradient._stops2, false);
  return element;
}

/** The gradient's transform, mapped into `rect`, then `extra`, then out of `inverse`. */
function gradientMatrixTransform(
  gradient: LinearGradient | RadialGradient,
  rect?: Rect | null,
  extra?: Transform | null,
  inverse?: Transform | null,
): Transform {
  let transform = gradient._transform || new Transform();
  if (rect) {
    const native = Transform.getNativeRectTransformation(rect);
    transform = transform.multiplied(native);
  }
  if (extra && !extra.isIdentity()) transform = transform.multiplied(extra);
  if (inverse && !inverse.isIdentity() && inverse.invertible()) {
    transform = transform.multiplied(inverse.inverted() as Transform);
  }
  return transform;
}

/** A gradient fill or border of an element as `<radialGradient>` in user space. */
export function createSvgRadialGradient(
  _context: unknown,
  document: SvgDocument,
  gradient: SvgRadialGradient,
  rect?: Rect | null,
  extra?: Transform | null,
  inverse?: Transform | null,
): SvgElement {
  const id = "_rgradient_" + gradientExportIds.radial++;
  const transform = gradientMatrixTransform(gradient, rect, extra, inverse);
  const element = document.createElementNS(SVG_NAMESPACE, "radialGradient");
  element.setAttribute("id", id);
  element.setAttribute("fx", gradient._fx);
  element.setAttribute("fy", gradient._fy);
  element.setAttribute("cx", gradient._cx);
  element.setAttribute("cy", gradient._cy);
  element.setAttribute("r", gradient._scale);
  if (!transform.isIdentity()) {
    element.setAttribute(
      "gradientTransform",
      "matrix(" + numberFormat.formatMatrix(transform.getMatrix()).join(",") + ")",
    );
    element.setAttribute("gradientUnits", GradientUnits.UserSpaceOnUse);
  }
  appendStops(document, element, gradient._stops2 || gradient._stops, true);
  return element;
}

/** A gradient fill or border of an element as `<linearGradient>` in user space. */
export function createSvgLinearGradient(
  _context: unknown,
  document: SvgDocument,
  gradient: SvgLinearGradient,
  rect?: Rect | null,
  extra?: Transform | null,
  inverse?: Transform | null,
): SvgElement {
  const id = "_lgradient_" + gradientExportIds.linear++;
  const element = document.createElementNS(SVG_NAMESPACE, "linearGradient");
  element.setAttribute("id", id);
  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;
  const transform = gradientMatrixTransform(gradient, rect, extra, inverse);
  const angle = gradient.getAngle();
  const scale = gradient.getScale();
  if (
    void 0 !== gradient._x0 &&
    void 0 !== gradient._x1 &&
    void 0 !== gradient._y0 &&
    void 0 !== gradient._y1
  ) {
    x1 = gradient._x0;
    x2 = gradient._x1;
    y1 = gradient._y0;
    y2 = gradient._y1;
  } else {
    x1 = gradient._fx;
    y1 = gradient._fy;
    y2 = gradient._fy + Math.sin(angle) * scale;
    x2 = gradient._fx + Math.cos(angle) * scale;
  }
  element.setAttribute("x1", x1);
  element.setAttribute("y1", y1);
  element.setAttribute("x2", x2);
  element.setAttribute("y2", y2);
  if (!transform.isIdentity()) {
    element.setAttribute(
      "gradientTransform",
      "matrix(" + numberFormat.formatMatrix(transform.getMatrix()).join(",") + ")",
    );
    element.setAttribute("gradientUnits", GradientUnits.UserSpaceOnUse);
  }
  appendStops(document, element, gradient._stops2 || gradient._stops, true);
  return element;
}

export const SvgGradients = {
  GradientUnits,
  createSvgRadialGradient,
  createSvgLinearGradient,
};
