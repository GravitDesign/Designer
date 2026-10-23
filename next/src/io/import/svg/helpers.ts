// Old: chunk.vendor.js module 1392 (the SVG importer's arc helpers, after
// the svg-arc-to-cubic-bezier package).
import { GMath } from "../../../engine/math/math.ts";

export interface ArcPoint {
  x: number;
  y: number;
}

/** One cubic segment: control points (x1, y1), (x2, y2) and end point (x, y). */
export interface CubicSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x: number;
  y: number;
}

export interface ArcParameters {
  /** Start point. */
  px: number;
  py: number;
  /** End point. */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** In the unit the caller passes; see arcToBezier. */
  xAxisRotation?: number;
  largeArcFlag?: number;
  sweepFlag?: number;
}

function mapToEllipse(
  point: ArcPoint,
  rx: number,
  ry: number,
  cosPhi: number,
  sinPhi: number,
  centerX: number,
  centerY: number,
): ArcPoint {
  let x = point.x;
  let y = point.y;
  x *= rx;
  y *= ry;
  return {
    x: cosPhi * x - sinPhi * y + centerX,
    y: sinPhi * x + cosPhi * y + centerY,
  };
}

/** The cubic that approximates the unit-circle arc from `angle` over `sweep`. */
function approxUnitArc(angle: number, sweep: number): [ArcPoint, ArcPoint, ArcPoint] {
  const k = (4 / 3) * Math.tan(sweep / 4);
  const x1 = Math.cos(angle);
  const y1 = Math.sin(angle);
  const x2 = Math.cos(angle + sweep);
  const y2 = Math.sin(angle + sweep);
  return [
    { x: x1 - y1 * k, y: y1 + x1 * k },
    { x: x2 + y2 * k, y: y2 - x2 * k },
    { x: x2, y: y2 },
  ];
}

/**
 * The signed angle from (ux, uy) to (vx, vy). The old code divided by the
 * length of u twice instead of |u| * |v|, kept as it is; the callers pass
 * points on the unit circle, so both lengths are 1 up to rounding.
 */
function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  let dot = (ux * vx + uy * vy) / (Math.sqrt(ux * ux + uy * uy) * Math.sqrt(ux * ux + uy * uy));
  if (dot > 1) dot = 1;
  if (dot < -1) dot = -1;
  return sign * Math.acos(dot);
}

/** [centerX, centerY, startAngle, sweepAngle] of the arc in unit-circle space. */
function getArcCenter(
  px: number,
  py: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  largeArcFlag: number,
  sweepFlag: number,
  sinPhi: number,
  cosPhi: number,
  pxp: number,
  pyp: number,
): [number, number, number, number] {
  const rxSq = Math.pow(rx, 2);
  const rySq = Math.pow(ry, 2);
  const pxpSq = Math.pow(pxp, 2);
  const pypSq = Math.pow(pyp, 2);
  let radicant = rxSq * rySq - rxSq * pypSq - rySq * pxpSq;
  if (radicant < 0) radicant = 0;
  radicant /= rxSq * pypSq + rySq * pxpSq;
  radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);
  const centerXp = ((radicant * rx) / ry) * pyp;
  const centerYp = ((radicant * -ry) / rx) * pxp;
  const centerX = cosPhi * centerXp - sinPhi * centerYp + (px + cx) / 2;
  const centerY = sinPhi * centerXp + cosPhi * centerYp + (py + cy) / 2;
  const vx1 = (pxp - centerXp) / rx;
  const vy1 = (pyp - centerYp) / ry;
  const vx2 = (-pxp - centerXp) / rx;
  const vy2 = (-pyp - centerYp) / ry;
  const startAngle = vectorAngle(1, 0, vx1, vy1);
  let sweepAngle = vectorAngle(vx1, vy1, vx2, vy2);
  if (0 === sweepFlag && sweepAngle > 0) sweepAngle -= GMath.PI2;
  if (1 === sweepFlag && sweepAngle < 0) sweepAngle += GMath.PI2;
  return [centerX, centerY, startAngle, sweepAngle];
}

/**
 * The cubic segments of an SVG elliptical arc, at most a quarter turn
 * each. Empty when a radius is 0 or the end point is the start point.
 * `xAxisRotation` is turned into radians as if it were degrees
 * (`* 2π / 360`); the path parser already passes radians, so the
 * rotation of rotated arcs comes out 57 times too small, as in the old
 * app (QUESTIONS.md "SVG import arc rotation").
 */
export function arcToBezier(params: ArcParameters): CubicSegment[] {
  const px = params.px;
  const py = params.py;
  const cx = params.cx;
  const cy = params.cy;
  let rx = params.rx;
  let ry = params.ry;
  const xAxisRotation = params.xAxisRotation === undefined ? 0 : params.xAxisRotation;
  const largeArcFlag = params.largeArcFlag === undefined ? 0 : params.largeArcFlag;
  const sweepFlag = params.sweepFlag === undefined ? 0 : params.sweepFlag;
  const curves: [ArcPoint, ArcPoint, ArcPoint][] = [];
  if (0 === rx || 0 === ry) return [];
  const sinPhi = Math.sin((xAxisRotation * GMath.PI2) / 360);
  const cosPhi = Math.cos((xAxisRotation * GMath.PI2) / 360);
  const pxp = (cosPhi * (px - cx)) / 2 + (sinPhi * (py - cy)) / 2;
  const pyp = (-sinPhi * (px - cx)) / 2 + (cosPhi * (py - cy)) / 2;
  if (0 === pxp && 0 === pyp) return [];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = Math.pow(pxp, 2) / Math.pow(rx, 2) + Math.pow(pyp, 2) / Math.pow(ry, 2);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const [centerX, centerY, startAngle, sweepAngle] = getArcCenter(
    px,
    py,
    cx,
    cy,
    rx,
    ry,
    largeArcFlag,
    sweepFlag,
    sinPhi,
    cosPhi,
    pxp,
    pyp,
  );
  let angle = startAngle;
  let sweep = sweepAngle;
  const segments = Math.max(Math.ceil(Math.abs(sweep) / (GMath.PI2 / 4)), 1);
  sweep /= segments;
  for (let i = 0; i < segments; i++) {
    curves.push(approxUnitArc(angle, sweep));
    angle += sweep;
  }
  return curves.map((curve) => {
    const first = mapToEllipse(curve[0], rx, ry, cosPhi, sinPhi, centerX, centerY);
    const second = mapToEllipse(curve[1], rx, ry, cosPhi, sinPhi, centerX, centerY);
    const end = mapToEllipse(curve[2], rx, ry, cosPhi, sinPhi, centerX, centerY);
    return { x1: first.x, y1: first.y, x2: second.x, y2: second.y, x: end.x, y: end.y };
  });
}
