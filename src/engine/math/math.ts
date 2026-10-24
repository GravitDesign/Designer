// Old: chunk.vendor.js module 12 (GMath).
//
// The numeric helpers the whole engine shares: angles, rounding,
// intersections, distances, bezier evaluation and subdivision, and the
// polynomial root finders behind curve hit tests and boolean operations.
//
// Every expression keeps the old order of floating-point operations, and
// the places that go through Float32Array (Q_rsqrt, inversePolyInterval,
// inversePolyUnaryInterval) keep that precision loss, because the results
// end up in saved documents and hit tests.
//
// The export is called GMath rather than Math so it doesn't shadow the
// global Math object in modules that import it.
import { Point } from "./point.ts";

/** A plain or typed array of numbers that can be written by index. */
export interface NumberList {
  [index: number]: number;
  readonly length: number;
}

/** Sturm root counts at the two interval ends (null: not computed yet). */
export type SturmCache = (number | null | undefined)[];

/** Polynomial values at the two interval ends (null: not computed yet). */
export type SturmValues = (number | null | undefined)[];

/** [lo, hi, valueAtLo, valueAtHi] intervals that hold one root each. */
export type RootInterval = [number, number, number | null | undefined, number | null | undefined];

const PI2 = 2 * Math.PI;
const PIHALF = 0.5 * Math.PI;
const defaultEps = 1e-14;
const maxNewtonIterations = 100;

const rsqrtFloat = new Float32Array(1);
const rsqrtInt = new Int32Array(rsqrtFloat.buffer);

const combinations5 = [1, 5, 10, 10, 5, 1];
const combinations4 = [1, 4, 6, 4, 1];
const combinations3 = [1, 3, 3, 1];
const combinations2 = [1, 2, 1];
const combinations1 = [1, 1];

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (180 * radians) / Math.PI;
}

/** Maps an angle into [0, 2pi). */
function normalizeAngleRadians(angle: number): number {
  return angle >= 0 ? mod(angle, PI2) : angle + PI2 * Math.floor(-angle / PI2 + 1);
}

/** Maps an angle into [0, 360). */
function normalizeAngleDegrees(angle: number): number {
  return angle >= 0 ? mod(angle, 360) : angle + 360 * Math.floor(-angle / 360 + 1);
}

/**
 * With a target range, maps `value` linearly from [min, max] to
 * [newMin, newMax]; without one, clamps it to [min, max].
 */
function normalizeValue(
  value: number,
  min: number,
  max: number,
  newMin?: number,
  newMax?: number,
): number {
  if (typeof newMin === "number" && typeof newMax === "number") {
    return ((value - min) * (newMax - newMin)) / (max - min) + newMin;
  }
  return value < min ? min : value > max ? max : value;
}

/** Scales the vector to (roughly) unit length using the fast inverse square root. */
function normalizePoint(point: Point): Point {
  const lengthSquared = point.dot(point);
  const factor = (lengthSquared && Q_rsqrt(lengthSquared)) || 1;
  return point.scale(factor);
}

/**
 * |a - b| <= eps (default defaultEps). Called with one argument, as
 * Transform.decomposed does, it compares with undefined and is always false.
 */
function isEqualEps(a: number, b?: number, eps?: number): boolean {
  if (!eps) eps = defaultEps;
  return Math.abs(a - (b as number)) <= eps;
}

/** The signed angle between the directions a->b and c->d, in (-pi, pi]. */
function getTurnAngle(a: Point, b: Point, c: Point, d: Point): number {
  const first = b.subtract(a);
  const second = d.subtract(c);
  let angle = Math.atan2(first.getY(), first.getX()) - Math.atan2(second.getY(), second.getX());
  if (angle <= -Math.PI) angle = PI2 + angle;
  else if (angle > Math.PI) angle = -PI2 + angle;
  return angle;
}

/**
 * Rounds to `digits` decimals (the sign of `digits` is ignored). With
 * `halfDown`, x.5 rounds down instead of up.
 */
function round(value: number, halfDown?: boolean, digits?: number): number {
  digits = Math.abs(digits as number) || 0;
  const scale = digits ? Math.pow(10, digits) : 1;
  return halfDown ? Math.ceil(value * scale - 0.5) / scale : Math.round(value * scale) / scale;
}

/** Remainder that keeps the sign of `value` (like %, but via floor). */
function mod(value: number, divisor: number): number {
  return value < 0 ? -mod(-value, divisor) : value - Math.floor(value / divisor) * divisor;
}

/** Integer division rounding towards zero. */
function div(value: number, divisor: number): number {
  return value < 0 ? -Math.floor(-value / divisor) : Math.floor(value / divisor);
}

/** Smallest power of two >= value, in 32-bit integer arithmetic. */
function nextPowerOf2(value: number): number {
  value--;
  value |= value >> 1;
  value |= value >> 2;
  value |= value >> 4;
  value |= value >> 8;
  value |= value >> 16;
  // A shift by 32 is a shift by 0 in JavaScript; kept from the old code.
  value |= value >> 32;
  return value + 1;
}

/**
 * Intersection of the segments (x1,y1)-(x2,y2) and (x3,y3)-(x4,y4). With
 * `params` the lines are intersected instead (no range check) and the two
 * line parameters are written to params[0] and params[1].
 */
function getIntersectionPoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  params?: NumberList,
): Point | null {
  const denominator = (x1 - x2) * (y4 - y3) - (y1 - y2) * (x4 - x3);
  const numeratorA = (x1 - x3) * (y4 - y3) - (y1 - y3) * (x4 - x3);
  const numeratorB = (x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3);
  if (Math.abs(denominator) < defaultEps) return null;
  const ta = numeratorA / denominator;
  const tb = numeratorB / denominator;
  if ((!params && 0 <= ta && ta <= 1 && 0 <= tb && tb <= 1) || params) {
    if (params) {
      params[0] = ta;
      params[1] = tb;
    }
    return new Point(x1 + ta * (x2 - x1), y1 + ta * (y2 - y1));
  }
  return null;
}

/**
 * Intersects the line (px,py) + t*(dx,dy) with the circle around (cx,cy).
 * Writes the line parameters of the hits to out[0] (and out[1]).
 */
function circleLineIntersection(
  px: number,
  py: number,
  dx: number,
  dy: number,
  cx: number,
  cy: number,
  radius: number,
  out: NumberList,
): void {
  const radiusSquared = radius * radius;
  const lengthSquared = dx * dx + dy * dy;
  if (isEqualEps(lengthSquared, 0)) return;
  let cross = dx * (cy - py) - dy * (cx - px);
  const discriminant = radiusSquared * lengthSquared - cross * cross;
  if (isEqualEps(discriminant, 0)) {
    out[0] = (dx * (cx - px) + dy * (cy - py)) / lengthSquared;
  } else if (discriminant > 0) {
    cross = dx * (cx - px) + dy * (cy - py);
    out[0] = (cross - Math.sqrt(discriminant)) / lengthSquared;
    out[1] = (cross + Math.sqrt(discriminant)) / lengthSquared;
  }
}

/**
 * Intersection points of two circles, written to out[0] (and out[1]).
 * The distances are compared squared against the radius sum/difference,
 * which is not squared the same way; that is the old formula.
 */
function circleCircleIntersection(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
  out: Point[],
): void {
  const distanceSquared = ptSqrDist(x1, y1, x2, y2);
  const radiusDifference = Math.abs(r1 - r2);
  const differenceSquared = radiusDifference * radiusDifference;
  const radiusSum = r1 + r2;
  const sumSquared = radiusSum * radiusSum;
  if (isEqualEps(distanceSquared, 0)) return;
  let factor = (r1 * r1 - r2 * r2) / (2 * distanceSquared);
  const mx = (x1 + x2) / 2 + (x2 - x1) * factor;
  const my = (y1 + y2) / 2 + (y2 - y1) * factor;
  if (
    isEqualEps(distanceSquared, sumSquared) ||
    (!isEqualEps(distanceSquared, 0) && isEqualEps(distanceSquared, differenceSquared))
  ) {
    out[0] = new Point(mx, my);
  } else if (differenceSquared < distanceSquared && distanceSquared < sumSquared) {
    factor =
      Math.sqrt((sumSquared - distanceSquared) * (distanceSquared - differenceSquared)) /
      (2 * distanceSquared);
    const ox = (y2 - y1) * factor;
    const oy = (x1 - x2) * factor;
    out[0] = new Point(mx + ox, my + oy);
    out[1] = new Point(mx - ox, my - oy);
  }
}

/** Intersection of the lines a1*x + b1*y + c1 = 0 and a2*x + b2*y + c2 = 0. */
function getLinesIntersection(
  a1: number,
  b1: number,
  c1: number,
  a2: number,
  b2: number,
  c2: number,
): Point | null {
  const determinant = a1 * b2 - a2 * b1;
  return isEqualEps(determinant, 0)
    ? null
    : new Point((b1 * c2 - b2 * c1) / determinant, (c1 * a2 - c2 * a1) / determinant);
}

/** Intersection of the line through (x1,y1),(x2,y2) and the one through (x3,y3),(x4,y4). */
function getLinesFromPointsIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
): Point | null {
  return getLinesIntersection(
    y2 - y1,
    x1 - x2,
    y1 * x2 - x1 * y2,
    y4 - y3,
    x3 - x4,
    y3 * x4 - x3 * y4,
  );
}

/** Center of the circle through three points, or null when they are collinear. */
function getCircumcircleCenter(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): Point | null {
  const ax = x1 - x2;
  const ay = y1 - y2;
  const bx = x2 - x3;
  const by = y2 - y3;
  return getLinesIntersection(
    ax,
    ay,
    (-ax * (x1 + x2)) / 2 - (ay * (y1 + y2)) / 2,
    bx,
    by,
    (-bx * (x2 + x3)) / 2 - (by * (y2 + y3)) / 2,
  );
}

function getPointAtSegment(x1: number, y1: number, x2: number, y2: number, t: number): Point {
  return new Point(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
}

/** The point `length` along the segment, clamped to its end unless `extend`. */
function getPointAtLength(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  length: number,
  extend?: boolean,
): Point {
  if (length <= 0) return new Point(x1, y1);
  const segmentLength = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  if (!extend && length >= segmentLength) return new Point(x2, y2);
  const t = length / segmentLength;
  return getPointAtSegment(x1, y1, x2, y2, t);
}

/** One coordinate of a quadratic bezier at t. */
function getCurveAtT(start: number, end: number, control: number, t: number): number {
  const a = start + t * (control - start);
  return a + t * (control + t * (end - control) - a);
}

/** One coordinate of a cubic bezier at t. */
function getCubicCurveAtT(
  start: number,
  end: number,
  control1: number,
  control2: number,
  t: number,
): number {
  const a = start + t * (control1 - start);
  const b = control1 + t * (control2 - control1);
  const c = a + t * (b - a);
  return c + t * (b + t * (control2 + t * (end - control2) - b) - c);
}

/** Dot product; 0 when any value is null or undefined. */
function vDotProduct(x1: number, y1: number, x2: number, y2: number): number {
  return x1 == null || y1 == null || x2 == null || y2 == null ? 0 : x1 * x2 + y1 * y2;
}

/** The fast inverse square root, computed in Float32 like the original. */
function Q_rsqrt(value: number): number {
  const half = 0.5 * value;
  rsqrtFloat[0] = value;
  rsqrtInt[0] = 1597463007 - ((rsqrtInt[0] as number) >> 1);
  value = rsqrtFloat[0] as number;
  value *= 1.5 - half * value * value;
  return value;
}

/** Squared distance; 0 when any value is null or undefined. */
function ptSqrDist(x1: number, y1: number, x2: number, y2: number): number {
  if (x1 == null || y1 == null || x2 == null || y2 == null) return 0;
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

function ptDist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(ptSqrDist(x1, y1, x2, y2));
}

/** Which side of the line (x1,y1)->(x2,y2) the point is on: 1, -1 or 0. */
function segmentSide(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  px: number,
  py: number,
): number {
  const side = (py - y1) * (x2 - x1) + (px - x1) * (y1 - y2);
  return isEqualEps(side, 0) ? 0 : side > 0 ? 1 : -1;
}

/**
 * Squared distance of (px,py) from the segment. Writes the parameter of
 * the closest point to t[0]. With `tolerance`, points within it of an end
 * count as distance 0 at that end.
 */
function sqrSegmentDist(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  px: number,
  py: number,
  t?: NumberList,
  tolerance?: number,
): number {
  if (isEqualEps(x1, x2) && isEqualEps(y1, y2)) return ptSqrDist(x1, y1, px, py);
  let distance: number;
  const dx = px - x1;
  const dy = py - y1;
  if (x1 == x2 && y1 == y2) {
    distance = vDotProduct(dx, dy, dx, dy);
    if (t) t[0] = 0;
  } else if (t && tolerance && vDotProduct(dx, dy, dx, dy) <= tolerance) {
    t[0] = 0;
    distance = 0;
  } else if (t && tolerance && ptSqrDist(px, py, x2, y2) <= tolerance) {
    t[0] = 1;
    distance = 0;
  } else {
    const sx = x2 - x1;
    const sy = y2 - y1;
    const param = vDotProduct(dx, dy, sx, sy) / vDotProduct(sx, sy, sx, sy);
    if (param <= 0) {
      distance = vDotProduct(dx, dy, dx, dy);
      if (t) t[0] = 0;
    } else if (param >= 1) {
      distance = vDotProduct(px - x2, py - y2, px - x2, py - y2);
      if (t) t[0] = 1;
    } else {
      const ox = dx - sx * param;
      const oy = dy - sy * param;
      distance = vDotProduct(ox, oy, ox, oy);
      if (t) t[0] = param;
    }
  }
  return distance;
}

/**
 * Smallest squared distance between the segments a1-a2 and b1-b2, from
 * the four end point to segment distances (0 when they touch; crossing
 * segments are not detected).
 */
function getSegmToSegmSqrDist(a1: Point, a2: Point, b1: Point, b2: Point): number {
  let distance = sqrSegmentDist(a1.getX(), a1.getY(), a2.getX(), a2.getY(), b1.getX(), b1.getY());
  let min = distance;
  if (min > 0) {
    distance = sqrSegmentDist(a1.getX(), a1.getY(), a2.getX(), a2.getY(), b2.getX(), b2.getY());
    if (distance < min) min = distance;
    if (min > 0) {
      distance = sqrSegmentDist(b1.getX(), b1.getY(), b2.getX(), b2.getY(), a1.getX(), a1.getY());
      if (distance < min) min = distance;
      if (min > 0) {
        distance = sqrSegmentDist(b1.getX(), b1.getY(), b2.getX(), b2.getY(), a2.getX(), a2.getY());
        if (distance < min) min = distance;
      }
    }
  }
  return min;
}

/** Distance of (px,py) from the infinite line through the two points. */
function pointToLineDist(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  px: number,
  py: number,
): number {
  const projection = getVectorProjection(x1, y1, x2, y2, px, py);
  return ptDist(projection.getX(), projection.getY(), px, py);
}

/**
 * Projects (px,py) onto the line through (x1,y1),(x2,y2). `clampStart`
 * clamps to the start, `clampBoth` to both ends. A degenerate line returns
 * the point itself.
 */
function getVectorProjection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  px: number,
  py: number,
  clampStart?: boolean,
  clampBoth?: boolean,
): Point {
  const vx = px - x1;
  const vy = py - y1;
  const lx = x2 - x1;
  const ly = y2 - y1;
  const lengthSquared = vDotProduct(lx, ly, lx, ly);
  if (isEqualEps(lengthSquared, 0)) return new Point(px, py);
  const t = vDotProduct(vx, vy, lx, ly) / lengthSquared;
  if (t <= 0 && (clampStart || clampBoth)) return new Point(x1, y1);
  if (t >= 1 && clampBoth) return new Point(x2, y2);
  return new Point(lx * t + x1, ly * t + y1);
}

/** True when the vectors (x1,y1)->(x2,y2) and (x3,y3)->(x4,y4) point the same way. */
function isCoDirected(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
): boolean {
  if ((isEqualEps(x1, x2) && isEqualEps(y1, y2)) || (isEqualEps(x3, x4) && isEqualEps(y3, y4)))
    return true;
  const ex = x4 + x1 - x3;
  const ey = y4 + y1 - y3;
  const projection = getVectorProjection(x1, y1, x2, y2, ex, ey);
  return (x2 - x1) * (projection.getX() - x1) >= 0 && (y2 - y1) * (projection.getY() - y1) >= 0;
}

/** Sine of the angle at (x2,y2) between the point (x1,y1) and the line to (x3,y3). */
function getSin(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): number {
  if (isEqualEps(x1, x2) && isEqualEps(y1, y2)) return 1;
  const projection = getVectorProjection(x2, y2, x3, y3, x1, y1, false);
  return Math.sqrt(
    ptSqrDist(x1, y1, projection.getX(), projection.getY()) / ptSqrDist(x1, y1, x2, y2),
  );
}

/**
 * Solves a1*x + b1*y = c1, a2*x + b2*y = c2. When the system is singular
 * it tries a few special solutions (x = y, or one of them 0) and returns
 * the first that satisfies both equations, or null.
 */
function solveLinear2Pseudo(
  a1: number,
  b1: number,
  c1: number,
  a2: number,
  b2: number,
  c2: number,
): Point | null {
  let result = getLinesIntersection(a1, b1, -c1, a2, b2, -c2);
  if (result == null) {
    let x: number;
    let y: number;
    if (isEqualEps(a1 + b1, 0) || (isEqualEps(c1, 0) && !isEqualEps(c2, 0))) {
      if (isEqualEps(a2 + b2, 0) || (isEqualEps(c2, 0) && !isEqualEps(c1, 0))) {
        if (isEqualEps(b1, 0) && isEqualEps(b2, 0)) {
          if (isEqualEps(a1, 0) && isEqualEps(a2, 0)) {
            x = 0;
            y = 0;
          } else {
            y = 0;
            x = isEqualEps(a1, 0) ? c2 / a2 : c1 / a1;
          }
        } else {
          x = 0;
          y = isEqualEps(b1, 0) ? c2 / b2 : c1 / b1;
        }
      } else {
        y = x = c2 / (a2 + b2);
      }
    } else {
      y = x = c1 / (a1 + b1);
    }
    if (isEqualEps(a1 * x + b1 * y, c1) && isEqualEps(a2 * x + b2 * y, c2)) {
      result = new Point(x, y);
    }
  }
  return result;
}

/** Splits one coordinate of a quadratic bezier at t into `left` and `right`. */
function divideQuadraticCurve(
  start: number,
  control: number,
  end: number,
  t: number,
  left: NumberList | null | undefined,
  right: NumberList | null | undefined,
): void {
  const a = start + t * (control - start);
  const b = control + t * (end - control);
  const mid = a + t * (b - a);
  if (left) {
    left[0] = start;
    left[1] = a;
    left[2] = mid;
  }
  if (right) {
    right[0] = mid;
    right[1] = b;
    right[2] = end;
  }
}

/** a*t^3 + b*t^2 + c*t + d. */
function evalCubic(a: number, b: number, c: number, d: number, t: number): number {
  return 0 == t ? d : 1 == t ? a + b + c + d : ((t * a + b) * t + c) * t + d;
}

/**
 * Coefficients of the derivative of a cubic bezier (divided by 3): the
 * x polynomial goes to `ax` and the y polynomial to `ay`, highest power first.
 */
function getBezierDerivativeEquationCoeffs(
  x0: number,
  y0: number,
  x3: number,
  y3: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ax: NumberList,
  ay: NumberList,
): void {
  const cx = x1 - x0;
  const bx = 2 * (x2 - x1 - cx);
  const axValue = x3 - x2 - cx - bx;
  const cy = y1 - y0;
  const by = 2 * (y2 - y1 - cy);
  const ayValue = y3 - y2 - cy - by;
  ax[0] = axValue;
  ax[1] = bx;
  ax[2] = cx;
  ay[0] = ayValue;
  ay[1] = by;
  ay[2] = cy;
}

/**
 * Sorts `values` in place and appends the distinct ones within [lo, hi]
 * to `out`. Returns how many it added. A single value is compared only
 * with the range.
 */
function uSortSegment(lo: number, hi: number, values: number[], out: number[]): number {
  let count = 0;
  values.sort((a, b) => a - b);
  const first = values[0] as number;
  if (first >= lo && first <= hi) {
    out[0] = first;
    count = 1;
    if (1 == values.length) return count;
  }
  for (let i = 1; i < values.length; i++) {
    const value = values[i] as number;
    if (value != values[i - 1] && value >= lo && value <= hi) {
      out.push(value);
      ++count;
    }
  }
  return count;
}

/**
 * Parameters in [0, 1] where a cubic bezier, given by its derivative
 * coefficients, has extrema in x or y or an inflection; always includes
 * 0 and 1. Returns how many were written to `out`.
 */
function getCubicCurveSplits(ax: NumberList, ay: NumberList, out: number[]): number {
  const a = ax[0] as number;
  const b = ax[1] as number;
  const c = ax[2] as number;
  const d = ay[0] as number;
  const e = ay[1] as number;
  const f = ay[2] as number;
  const splits = [0, 1];
  getQuadraticRoots(a, b, c, splits);
  getQuadraticRoots(d, e, f, splits);
  const qa = b * d - e * a;
  const qb = 2 * (c * d - f * a);
  const qc = c * e - f * b;
  getQuadraticRoots(qa, qb, qc, splits);
  return uSortSegment(0, 1, splits, out);
}

/**
 * Self intersection of a cubic bezier from its control coordinates. A
 * cusp returns its parameter; a loop writes both parameters to `out` and
 * returns null.
 */
function getBezierSelfIntersections(
  xs: NumberList,
  ys: NumberList,
  out: NumberList,
): number | null {
  const sx = new Float64Array(4);
  const sy = new Float64Array(4);
  shiftPoly(xs, 3, 0.5, sx);
  shiftPoly(ys, 3, 0.5, sy);
  const a = -(sx[0] as number);
  const b = (sx[1] as number) / 3;
  const c = -(sx[2] as number) / 3;
  const d = -(sy[0] as number);
  const e = (sy[1] as number) / 3;
  const f = -(sy[2] as number) / 3;
  const p = a * f - c * d;
  const q = a * e - b * d;
  const discriminant = 12 * q * (b * f - c * e) - 3 * p * p;
  if (0 != q) {
    if (0 == discriminant) {
      const t = p / (2 * q);
      if (-0.5 < t && t < 0.5) return t + 0.5;
    } else if (discriminant > 0) {
      const root = Math.sqrt(discriminant);
      const t1 = (p - root) / (2 * q);
      const t2 = (p + root) / (2 * q);
      if (-0.5 <= t1 && t1 <= 0.5 && -0.5 <= t2 && t2 <= 0.5) {
        out[0] = t1 + 0.5;
        out[1] = t2 + 0.5;
      }
    }
  }
  return null;
}

/**
 * De Casteljau split of one coordinate of a cubic bezier at t. `part`
 * null writes both halves (left to `left`, right to `right`), 1 only the
 * left half to `left`, 2 only the right half, also to `left`.
 */
function getCtrlPtsCasteljau(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
  part: number | null | undefined,
  left: NumberList,
  right?: NumberList,
): void {
  const a = p0 + t * (p1 - p0);
  const b = p1 + t * (p2 - p1);
  const c = p2 + t * (p3 - p2);
  const ab = a + t * (b - a);
  const bc = b + t * (c - b);
  const mid = ab + t * (bc - ab);
  if (part == null || 1 == part) {
    left[0] = p0;
    left[1] = a;
    left[2] = ab;
    left[3] = mid;
  }
  if (part == null || 2 == part) {
    const target = 2 == part ? left : (right as NumberList);
    target[0] = mid;
    target[1] = bc;
    target[2] = c;
    target[3] = p3;
  }
}

/** Control coordinates of the part of a cubic bezier between t0 and t1. */
function getCtrlPts(
  start: number,
  end: number,
  control1: number,
  control2: number,
  t0: number,
  t1: number,
  out: NumberList,
): void {
  if (0 != t0) {
    if (1 != t1) {
      getCtrlPtsCasteljau(start, control1, control2, end, t0, 2, out);
      const t = (t1 - t0) / (1 - t0);
      getCtrlPtsCasteljau(
        out[0] as number,
        out[1] as number,
        out[2] as number,
        out[3] as number,
        t,
        1,
        out,
      );
    } else {
      getCtrlPtsCasteljau(start, control1, control2, end, t0, 2, out);
    }
  } else {
    getCtrlPtsCasteljau(start, control1, control2, end, t1, 1, out);
  }
}

/** Control coordinates of the part of a quadratic bezier between t0 and t1. */
function getCtrlPtsQuadratic(
  start: number,
  end: number,
  control: number,
  t0: number,
  t1: number,
  out: NumberList,
): void {
  if (0 != t0) {
    if (1 != t1) {
      divideQuadraticCurve(start, control, end, t0, null, out);
      const t = (t1 - t0) / (1 - t0);
      divideQuadraticCurve(out[0] as number, out[1] as number, out[2] as number, t, out, null);
    } else {
      divideQuadraticCurve(start, control, end, t0, null, out);
    }
  } else {
    divideQuadraticCurve(start, control, end, t1, out, null);
  }
}

/**
 * Length of a quadratic bezier, subdividing until the control polygon is
 * within `eps` (default defaultEps) of the chord.
 */
function getArcLengthQuadratic(start: Point, end: Point, control: Point, eps?: number): number {
  eps = eps || defaultEps;
  const measure = (
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number,
    tolerance: number,
  ): number => {
    const chord = ptDist(x0, y0, x1, y1);
    let length = ptDist(x0, y0, cx, cy);
    if ((length += ptDist(cx, cy, x1, y1)) - chord > tolerance) {
      const leftX = new Float64Array(3);
      const leftY = new Float64Array(3);
      const rightX = new Float64Array(3);
      const rightY = new Float64Array(3);
      divideQuadraticCurve(x0, cx, x1, 0.5, leftX, rightX);
      divideQuadraticCurve(y0, cy, y1, 0.5, leftY, rightY);
      length = measure(
        leftX[0] as number,
        leftY[0] as number,
        leftX[1] as number,
        leftY[1] as number,
        leftX[2] as number,
        leftY[2] as number,
        tolerance,
      );
      length += measure(
        rightX[0] as number,
        rightY[0] as number,
        rightX[1] as number,
        rightY[1] as number,
        rightX[2] as number,
        rightY[2] as number,
        tolerance,
      );
      return length;
    }
    return length;
  };
  return measure(
    start.getX(),
    start.getY(),
    control.getX(),
    control.getY(),
    end.getX(),
    end.getY(),
    eps,
  );
}

/**
 * Length of a cubic bezier, subdividing until the control polygon is
 * within `eps` (default 0.01) of the chord.
 */
function getArcLengthCubic(
  start: Point,
  end: Point,
  control1: Point,
  control2: Point,
  eps?: number,
): number {
  eps = eps || 0.01;
  const measure = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    tolerance: number,
  ): number => {
    const chord = ptDist(x0, y0, x3, y3);
    let length = ptDist(x0, y0, x1, y1);
    length += ptDist(x1, y1, x2, y2);
    if ((length += ptDist(x2, y2, x3, y3)) - chord > tolerance) {
      const leftX = new Float64Array(4);
      const leftY = new Float64Array(4);
      const rightX = new Float64Array(4);
      const rightY = new Float64Array(4);
      getCtrlPtsCasteljau(x0, x1, x2, x3, 0.5, null, leftX, rightX);
      getCtrlPtsCasteljau(y0, y1, y2, y3, 0.5, null, leftY, rightY);
      length = measure(
        leftX[0] as number,
        leftY[0] as number,
        leftX[1] as number,
        leftY[1] as number,
        leftX[2] as number,
        leftY[2] as number,
        leftX[3] as number,
        leftY[3] as number,
        tolerance,
      );
      length += measure(
        rightX[0] as number,
        rightY[0] as number,
        rightX[1] as number,
        rightY[1] as number,
        rightX[2] as number,
        rightY[2] as number,
        rightX[3] as number,
        rightY[3] as number,
        tolerance,
      );
    }
    return length;
  };
  return measure(
    start.getX(),
    start.getY(),
    control1.getX(),
    control1.getY(),
    control2.getX(),
    control2.getY(),
    end.getX(),
    end.getY(),
    eps,
  );
}

/**
 * Evaluates the polynomial with `degree + 1` coefficients (highest power
 * first) at x by Horner's rule. Null for a negative degree.
 */
function evalPoly(coeffs: ArrayLike<number>, degree: number, x: number): number | null {
  let result: number;
  if (degree < 0) return null;
  if (degree > 0) {
    if (0 != x) {
      result = coeffs[0] as number;
      if (1 == x) {
        for (let i = 1; i <= degree; ++i) result += coeffs[i] as number;
      } else {
        for (let i = 1; i <= degree; ++i) result = result * x + (coeffs[i] as number);
      }
    } else {
      result = coeffs[degree] as number;
    }
  } else {
    result = coeffs[degree] as number;
  }
  return result;
}

/** Coefficients of the derivative; false when the degree is below 1. */
function getCoeffPolyDeriv(coeffs: ArrayLike<number>, degree: number, out: NumberList): boolean {
  let done = false;
  if (degree >= 1) {
    for (let i = 0; i < degree; ++i) out[i] = (coeffs[i] as number) * (degree - i);
    done = true;
  }
  return done;
}

/**
 * Real roots of the cubic `coeffs` in [lo, hi], written to `out`; returns
 * their count. Roots at the interval ends are reported only with
 * `includeEnds` (except in one branch of the old code, kept as is).
 */
function getCubicRoots(
  coeffs: ArrayLike<number>,
  lo: number,
  hi: number,
  out: NumberList,
  includeEnds: boolean,
  eps: number,
): number {
  let count = 0;
  const poly = new Float64Array(4);
  const inverted = new Float64Array(4);
  const deriv = new Float64Array(3);
  const deriv2 = new Float64Array(2);
  const negEps = -eps;
  if (lo >= hi) return 0;
  if ((coeffs[0] as number) < 0) for (let i = 0; i < 4; ++i) poly[i] = -(coeffs[i] as number);
  else for (let i = 0; i < 4; ++i) poly[i] = coeffs[i] as number;
  const a = poly[0] as number;
  const b = poly[1] as number;
  const c = poly[2] as number;
  const d = poly[3] as number;
  if (0 == lo && 1 == hi) inversePolyUnaryInterval(poly, 3, inverted);
  else inversePolyInterval(poly, 3, lo, hi, inverted);
  if (0 == estimPositiveRootsDescartes(inverted, 3)) return 0;

  getCoeffPolyDeriv(poly, 3, deriv);
  deriv2[0] = 6 * a;
  deriv2[1] = 2 * b;
  const d0 = deriv[0] as number;
  // The critical points (roots of the derivative), crit1 <= crit2.
  let criticalCount = 0;
  let crit1 = 0;
  let crit2 = 0;
  const discriminant = b * b - d0 * c;
  if (0 == discriminant) {
    criticalCount = 1;
    crit2 = crit1 = -b / d0;
  } else if (discriminant > 0) {
    criticalCount = 2;
    const root = Math.sqrt(discriminant);
    crit1 = (-b - root) / d0;
    crit2 = (-b + root) / d0;
  }
  const atLo = evalCubic(a, b, c, d, lo);
  const atHi = evalCubic(a, b, c, d, hi);
  const isZero = (value: number): boolean => negEps <= value && value <= eps;
  const newton = (from: number, to: number, valueFrom: number, valueTo: number): void => {
    const root = locateByNewton(from, to, valueFrom, valueTo, poly, 3, deriv, deriv2, eps);
    out[count] = root != null ? root : (to + from) / 2;
    count += 1;
  };
  const push = (value: number): void => {
    out[count] = value;
    count += 1;
  };

  if (0 == criticalCount || crit1 >= hi || crit2 <= lo) {
    // Monotonic increasing on the interval.
    if (isZero(atLo)) {
      if (includeEnds) push(lo);
    } else if (isZero(atHi)) {
      if (includeEnds) push(hi);
    } else if (atLo < 0 && atHi > 0) {
      newton(lo, hi, atLo, atHi);
    }
  } else if (crit1 <= lo && crit2 >= hi) {
    // Monotonic decreasing on the interval.
    if (isZero(atLo)) {
      if (includeEnds) push(lo);
    } else if (isZero(atHi)) {
      if (includeEnds) push(hi);
    } else if (atLo > 0 && atHi < 0) {
      newton(lo, hi, atLo, atHi);
    }
  } else if (crit1 > lo && crit2 >= hi) {
    // Only the local maximum lies inside.
    const atCrit1 = evalCubic(a, b, c, d, crit1);
    if (isZero(atCrit1)) {
      push(crit1);
    } else if (atCrit1 > 0) {
      if (isZero(atLo)) {
        if (includeEnds) push(lo);
      } else if (atLo < 0) {
        const root = locateByNewton(lo, crit1, atLo, atCrit1, poly, 3, deriv, deriv2, eps);
        out[count] = root != null ? root : (lo + crit1) / 2;
        count += 1;
      }
      if (isZero(atHi)) {
        if (includeEnds) push(hi);
      } else if (atHi < 0) {
        const root = locateByNewton(crit1, hi, atCrit1, atHi, poly, 3, deriv, deriv2, eps);
        out[count] = root != null ? root : (crit1 + hi) / 2;
        count += 1;
      }
    }
  } else if (crit1 <= lo && crit2 < hi) {
    // Only the local minimum lies inside.
    const atCrit2 = evalCubic(a, b, c, d, crit2);
    if (isZero(atCrit2)) {
      push(crit2);
    } else if (atCrit2 < 0) {
      if (isZero(atLo)) {
        if (includeEnds) push(lo);
      } else if (atLo > 0) {
        const root = locateByNewton(lo, crit2, atLo, atCrit2, poly, 3, deriv, deriv2, eps);
        out[count] = root != null ? root : (lo + crit2) / 2;
        count += 1;
      }
      if (isZero(atHi)) {
        if (includeEnds) push(hi);
      } else if (atHi > 0) {
        const root = locateByNewton(crit2, hi, atCrit2, atHi, poly, 3, deriv, deriv2, eps);
        out[count] = root != null ? root : (crit2 + hi) / 2;
        count += 1;
      }
    }
  } else if (crit1 == crit2) {
    // A saddle point inside the interval.
    const atCrit = evalCubic(a, b, c, d, crit1);
    if (isZero(atCrit)) {
      push(crit1);
    } else if (isZero(atLo)) {
      if (includeEnds) push(lo);
    } else if (isZero(atHi)) {
      if (includeEnds) push(hi);
    } else if (atCrit < 0 && atHi > 0) {
      const root = locateByNewton(crit1, hi, atCrit, atHi, poly, 3, deriv, deriv2, eps);
      out[count] = root != null ? root : (crit1 + hi) / 2;
      count += 1;
    } else if (atLo < 0 && atCrit > 0) {
      const root = locateByNewton(lo, crit1, atLo, atCrit, poly, 3, deriv, deriv2, eps);
      out[count] = root != null ? root : (lo + crit1) / 2;
      count += 1;
    }
  } else {
    // Both critical points inside. The old code evaluates the minimum with
    // the second coefficient in place of the first; kept as is.
    const atCrit1 = evalCubic(a, b, c, d, crit1);
    const atCrit2 = evalCubic(b, b, c, d, crit2);
    if (atCrit1 <= 0 || atCrit2 >= 0) {
      if (isZero(atCrit1)) push(crit1);
      if (atCrit1 <= 0) {
        if (isZero(atHi)) {
          if (includeEnds) push(hi);
        } else if (atCrit2 < 0 && atHi > 0) {
          const root = locateByNewton(crit2, hi, atCrit2, atHi, poly, 3, deriv, deriv2, eps);
          out[count] = root != null ? root : (crit2 + hi) / 2;
          count += 1;
        }
      }
      if (isZero(atCrit2)) push(crit2);
      if (atCrit2 >= 0) {
        if (isZero(atLo)) {
          if (includeEnds) push(lo);
        } else if (atLo < 0 && atCrit1 > 0) {
          const root = locateByNewton(lo, crit1, atLo, atCrit1, poly, 3, deriv, deriv2, eps);
          out[count] = root != null ? root : (lo + crit1) / 2;
          count += 1;
        }
      }
    } else {
      newton(crit1, crit2, atCrit1, atCrit2);
      if (isZero(atLo)) {
        if (includeEnds) push(lo);
      } else if (atLo < 0 && atCrit1 > 0) {
        const root = locateByNewton(lo, crit1, atLo, atCrit1, poly, 3, deriv, deriv2, eps);
        out[count] = root != null ? root : (lo + crit1) / 2;
        count += 1;
      }
      if (isZero(atHi)) {
        // No includeEnds check here in the old code.
        push(hi);
      } else if (atCrit2 < 0 && atHi > 0) {
        const root = locateByNewton(crit2, hi, atCrit2, atHi, poly, 3, deriv, deriv2, eps);
        out[count] = root != null ? root : (crit2 + hi) / 2;
        count += 1;
      }
    }
  }
  return count;
}

/** Sign test the old code repeats everywhere: both positive or both negative. */
function sameSign(a: number, b: number): boolean {
  return (a > 0 && b > 0) || (a < 0 && b < 0);
}

/**
 * Finds one root of the polynomial (degree 3 or 5) in [lo, hi] by
 * bracketing (with Sturm sequences for degree 5 when `sturm` and `cache`
 * are given) and Newton steps. Returns null when it doesn't converge.
 */
function locateByNewton(
  lo: number,
  hi: number,
  valueLo: number,
  valueHi: number,
  coeffs: ArrayLike<number>,
  degree: number,
  deriv: ArrayLike<number>,
  deriv2: ArrayLike<number>,
  eps: number,
  sturm?: ArrayLike<number>[],
  cache?: SturmCache,
): number | null {
  let root: number | null = null;
  const derivDegree = degree - 1;
  const negEps = -eps;
  const derivZero = -defaultEps;
  let value = eps + 1;
  let step: number;
  if (negEps <= valueLo && valueLo <= eps) return lo;
  if (negEps <= valueHi && valueHi <= eps) return hi;
  let left = lo;
  let right = hi;
  const d20 = deriv2[0] as number;
  const d21 = deriv2[1] as number;

  if (3 == degree) {
    // deriv2 is linear: its root splits the interval into convex and
    // concave parts, and Newton starts from the end where it converges.
    const inflection = -d21 / d20;
    if (inflection < lo || inflection > hi) {
      if (sameSign(d20 * lo + d21, valueLo)) {
        root = lo;
        value = valueLo;
      } else if (sameSign(d20 * hi + d21, valueHi)) {
        root = hi;
        value = valueHi;
      } else root = null;
    } else if (negEps <= (value = evalPoly(coeffs, degree, inflection) as number) && value <= eps) {
      root = inflection;
    } else if (sameSign(value, valueLo)) {
      left = inflection + eps;
      value = evalPoly(coeffs, degree, left) as number;
      if (sameSign(d20 * left + d21, value)) root = left;
      else if (sameSign(d20 * hi + d21, valueHi)) {
        root = hi;
        value = valueHi;
      } else root = null;
    } else if (sameSign(value, valueHi)) {
      right = inflection - eps;
      value = evalPoly(coeffs, degree, right) as number;
      if (sameSign(d20 * right + d21, value)) root = right;
      else if (sameSign(d20 * lo + d21, valueLo)) {
        root = lo;
        value = valueLo;
      } else root = null;
    } else root = null;
  } else {
    if (5 != degree) throw new Error("Unsupported polynomial degree.");
    let useSturm = false;
    let signChange = false;
    if ((valueLo < 0 && valueHi > 0) || (valueLo > 0 && valueHi < 0)) signChange = true;
    else if (sturm && cache) useSturm = true;
    const sequence = sturm as ArrayLike<number>[];
    const ends = cache as SturmCache;
    let searching = true;
    // Roots of the second derivative split [lo, hi] into pieces where the
    // polynomial is convex or concave.
    const inflections: number[] = [];
    const pieces: number[] = [];
    let counts: SturmCache = [];
    let values: SturmValues = [];
    let piece = 0;
    getCubicRoots(deriv2, lo, hi, inflections, false, eps);
    if (0 == inflections.length) {
      left = lo;
      values[0] = valueLo;
      right = hi;
      values[1] = valueHi;
      if (useSturm) {
        counts[0] = ends[0];
        counts[1] = ends[1];
      }
    } else {
      uSortSegment(lo, hi, inflections, pieces);
      left = lo;
      values[0] = valueLo;
      if (useSturm) counts[0] = ends[0];
      // Find the first piece that holds a root.
      while (piece <= pieces.length) {
        if (piece > 0) {
          left = right;
          values[0] = values[1];
          if (useSturm) counts[0] = counts[1];
        }
        if (piece < pieces.length) {
          right = pieces[piece] as number;
          values[1] = null;
          if (useSturm) counts[1] = null;
        } else {
          right = hi;
          values[1] = valueHi;
          if (useSturm) counts[1] = ends[1];
        }
        if (signChange) {
          if (values[1] == null) values[1] = evalPoly(coeffs, degree, right);
          const atRight = values[1] as number;
          if (isEqualEps(atRight, 0, eps)) {
            root = right;
            value = atRight;
            searching = false;
          }
          const atLeft = values[0] as number;
          if ((atLeft > 0 && atRight < 0) || (atLeft < 0 && atRight > 0)) break;
        }
        if (
          useSturm &&
          0 != countRootsNSturm(coeffs, degree, deriv, left, right, sequence, counts, values)
        )
          break;
        ++piece;
      }
    }
    if (
      searching &&
      0 == piece &&
      sameSign(evalPoly(deriv2, deriv2.length - 1, lo) as number, valueLo)
    ) {
      root = lo;
      value = valueLo;
      searching = false;
    }
    if (
      searching &&
      piece == pieces.length &&
      sameSign(evalPoly(deriv2, deriv2.length - 1, hi) as number, valueHi)
    ) {
      root = hi;
      value = valueHi;
      searching = false;
    }
    if (searching) {
      // Bisect until the piece is convex or concave in the direction
      // Newton needs, or small enough.
      let valueLeft = values[0] as number;
      let valueRight = values[1] as number;
      let bisectCounts: SturmCache = [];
      if (useSturm) bisectCounts = counts;
      root = (left + right) / 2;
      const slope = evalPoly(deriv2, deriv2.length - 1, root) as number;
      while (right - left > eps && searching) {
        root = (left + right) / 2;
        if (
          (negEps <= (value = evalPoly(coeffs, degree, root) as number) && value <= eps) ||
          (slope > 0 && value > 0) ||
          (slope < 0 && value < 0)
        ) {
          searching = false;
        } else if ((value > 0 && valueLeft < 0) || (value < 0 && valueLeft > 0)) {
          right = root;
          valueRight = value;
          if (useSturm) bisectCounts[1] = null;
        } else if ((value > 0 && valueRight < 0) || (value < 0 && valueRight > 0)) {
          left = root;
          valueLeft = value;
          if (useSturm) bisectCounts[0] = null;
        } else if (signChange || !useSturm) {
          searching = false;
          root = null;
        } else {
          values = [valueLeft, value];
          counts = [bisectCounts[0], null];
          if (countRootsNSturm(coeffs, degree, deriv, left, root, sequence, counts, values) > 0) {
            right = root;
            valueRight = value;
            bisectCounts[0] = counts[0];
            bisectCounts[1] = counts[1];
          } else if (bisectCounts[1] != null && counts[1] == bisectCounts[1]) {
            searching = false;
          } else {
            left = root;
            valueLeft = value;
            bisectCounts[0] = counts[0];
          }
        }
      }
      if (searching) {
        root = (left + right) / 2;
        value = evalPoly(coeffs, degree, root) as number;
      }
    }
  }

  let iteration: number;
  for (
    iteration = 1;
    root != null && (value < negEps || eps < value) && iteration < maxNewtonIterations;
  ) {
    if (derivZero < (step = evalPoly(deriv, derivDegree, root) as number) && step < defaultEps) {
      // Flat derivative: stop, and give up if this isn't a root.
      if ((value = evalPoly(coeffs, degree, root) as number) < negEps || eps < value) root = null;
    } else {
      const previous: number = root;
      value = evalPoly(coeffs, degree, root) as number;
      step = value / step;
      root -= step;
      if (root <= left || root >= right) root = null;
      if (step > 0) right = previous;
      else if (step < 0) left = previous;
    }
    ++iteration;
  }
  if (iteration == maxNewtonIterations) root = null;
  return root;
}

/** Real roots of a*x^2 + b*x + c (or of b*x + c when a is 0), appended to `out`. */
function getQuadraticRoots(a: number, b: number, c: number, out: number[]): void {
  if (0 == a) {
    if (0 != b) out.push(-c / b);
    return;
  }
  const discriminant = b * b - 4 * a * c;
  if (0 == discriminant) {
    out.push(-b / (2 * a));
  } else if (discriminant > 0) {
    const root = Math.sqrt(discriminant);
    out.push((-b + root) / (2 * a));
    out.push((-b - root) / (2 * a));
  }
}

/**
 * Pseudo-remainder of dividend / divisor, written to `out` without
 * leading zeros. Returns the factor the dividend was scaled by.
 */
function _pseudoRem(
  dividend: ArrayLike<number>,
  divisor: ArrayLike<number>,
  out: number[],
): number {
  const lead = divisor[0] as number;
  let factor = lead;
  if (divisor.length > dividend.length) return 1;
  for (let i = 2; i <= dividend.length - divisor.length + 1; ++i) factor *= lead;
  let remainder: number[] = [];
  let next: number[] = [];
  for (let i = 0; i < dividend.length; ++i) remainder[i] = (dividend[i] as number) * factor;
  let dividing = true;
  while (dividing) {
    const quotient = (remainder[0] as number) / lead;
    let nonZeroSeen = false;
    for (let i = 1; i < divisor.length; ++i) {
      const term = (remainder[i] as number) - quotient * (divisor[i] as number);
      if (0 != term || nonZeroSeen) {
        next.push(term);
        if (0 != term) nonZeroSeen = true;
      }
    }
    for (let i = divisor.length; i < remainder.length; ++i) next.push(remainder[i] as number);
    if (next.length >= divisor.length) {
      remainder = next;
      next = [];
    } else dividing = false;
  }
  if (next.length > 0) for (let i = 0; i < next.length; ++i) out[i] = next[i] as number;
  return factor;
}

/**
 * Sturm sequence of `poly` (with derivative `deriv`) by the subresultant
 * pseudo-remainder sequence, written to `out` (out[0] is poly itself).
 */
function getSturmPRS(
  poly: ArrayLike<number>,
  degree: number,
  deriv: ArrayLike<number>,
  out: NumberList[],
): void {
  const leads: number[] = [];
  const beta: (number | null)[] = [];
  const degreeDrops: number[] = [];
  const psi: number[] = [];
  const signs: number[] = [];
  beta[0] = null;
  out[0] = poly as NumberList;
  out[1] = deriv as NumberList;
  leads[0] = poly[0] as number;
  leads[1] = deriv[0] as number;
  degreeDrops[0] = 1;
  beta[1] = 1;
  psi[0] = 1;
  psi[1] = leads[1];
  signs[0] = 1;
  signs[1] = 1;
  for (let i = 1; i < degree; ++i) {
    const remainder: number[] = [];
    const factor = _pseudoRem(out[i - 1] as NumberList, out[i] as NumberList, remainder);
    if (0 == remainder.length) break;
    const next: number[] = [];
    out[i + 1] = next;
    const b = beta[i] as number;
    for (let j = 0; j < remainder.length; ++j) next[j] = (remainder[j] as number) / b;
    const drop = next.length - (out[i] as NumberList).length;
    degreeDrops[i] = drop;
    leads[i + 1] = next[0] as number;
    let psiPower = 1;
    let sign = 1;
    let leadPower = leads[i + 1] as number;
    for (let k = 2; k <= drop; ++k) {
      psiPower *= psi[i] as number;
      sign = -sign;
      leadPower *= leads[i + 1] as number;
    }
    beta[i + 1] = sign * psiPower * (psi[i] as number) * (leads[i] as number);
    psi[i + 1] = leadPower / psiPower;
    if ((b > 0 && factor > 0) || (b < 0 && factor < 0)) signs[i + 1] = -(signs[i - 1] as number);
    else signs[i + 1] = signs[i - 1] as number;
  }
  for (let i = 2; i < out.length; ++i) {
    if ((signs[i] as number) < 0) {
      const entry = out[i] as NumberList;
      for (let j = 0; j < entry.length; ++j) entry[j] = -(entry[j] as number);
    }
  }
}

/** Sign changes of the Sturm sequence at x, starting from the value `first`. */
function sturmSignChanges(
  sequence: ArrayLike<ArrayLike<number>>,
  x: number,
  first: number,
): number {
  let changes = 0;
  let previous = first;
  for (let i = 1; i < sequence.length; ++i) {
    const entry = sequence[i] as ArrayLike<number>;
    const current = evalPoly(entry, entry.length - 1, x) as number;
    if (0 != current && ((previous < 0 && current > 0) || (previous > 0 && current < 0))) {
      ++changes;
      previous = current;
    }
  }
  return changes;
}

/**
 * Number of distinct real roots in (lo, hi] by Sturm's theorem. `cache`
 * holds the sign change counts at lo and hi, `values` the polynomial
 * values there; missing entries are computed and stored.
 */
function countRootsNSturm(
  _poly: ArrayLike<number>,
  _degree: number,
  _deriv: ArrayLike<number>,
  lo: number,
  hi: number,
  sequence: ArrayLike<ArrayLike<number>>,
  cache: SturmCache,
  values: SturmValues,
): number {
  let atLo: number;
  let atHi: number;
  const first = sequence[0] as ArrayLike<number>;
  if (cache[0] == null) {
    if (values[0] == null) values[0] = evalPoly(first, first.length - 1, lo);
    atLo = sturmSignChanges(sequence, lo, values[0] as number);
    cache[0] = atLo;
  } else atLo = cache[0];
  if (cache[1] == null) {
    if (values[1] == null) values[1] = evalPoly(first, first.length - 1, hi);
    atHi = sturmSignChanges(sequence, hi, values[1] as number);
    cache[1] = atHi;
  } else atHi = cache[1];
  return atLo > atHi ? atLo - atHi : atHi - atLo;
}

/**
 * Splits [lo, hi] (holding `count` roots) by bisection until every
 * interval holds one root, and appends them to `intervals`. Stops
 * splitting after 32 levels.
 */
function locRootsSturm(
  poly: ArrayLike<number>,
  degree: number,
  deriv: ArrayLike<number>,
  lo: number,
  hi: number,
  sequence: ArrayLike<ArrayLike<number>>,
  count: number,
  cache: SturmCache,
  values: SturmValues,
  intervals: RootInterval[],
  depth: number,
): void {
  if (count <= 1) return;
  const mid = (lo + hi) / 2;
  const leftCache: SturmCache = [cache[0], null];
  const leftValues: SturmValues = [values[0], null];
  const leftCount = countRootsNSturm(poly, degree, deriv, lo, mid, sequence, leftCache, leftValues);
  const rightCount = count - leftCount;
  if (1 == leftCount || depth > 31) {
    intervals.push([lo, mid, leftValues[0], leftValues[1]]);
  } else if (leftCount > 1) {
    ++depth;
    locRootsSturm(
      poly,
      degree,
      deriv,
      lo,
      mid,
      sequence,
      leftCount,
      leftCache,
      leftValues,
      intervals,
      depth,
    );
  }
  if (1 == rightCount || depth > 31) {
    intervals.push([mid, hi, leftValues[1], values[1]]);
  } else if (rightCount > 1) {
    ++depth;
    const rightCache: SturmCache = [leftCache[1], cache[1]];
    const rightValues: SturmValues = [leftValues[1], values[1]];
    locRootsSturm(
      poly,
      degree,
      deriv,
      mid,
      hi,
      sequence,
      rightCount,
      rightCache,
      rightValues,
      intervals,
      depth,
    );
  }
}

/** Coefficients of p(x + shift), written to `out`. */
function shiftPoly(
  coeffs: ArrayLike<number>,
  degree: number,
  shift: number,
  out: NumberList,
): void {
  const powers = [1];
  for (let i = 1; i <= degree; ++i) powers.push(shift * (powers[i - 1] as number));
  out[0] = coeffs[0] as number;
  for (let i = 1; i <= degree; ++i) {
    out[i] = coeffs[i] as number;
    for (let j = 0; j < i; ++j) {
      out[i] =
        (out[i] as number) +
        combNK(degree - j, i - j) * (coeffs[j] as number) * (powers[i - j] as number);
    }
  }
}

/** n choose k for n <= 5. combNK(0, 0) is 0 in the old table; kept. */
function combNK(n: number, k: number): number {
  if (!(n <= 5 && k <= n)) throw new Error("Combinations calculation not implemented");
  return (
    5 == n
      ? combinations5[k]
      : 4 == n
        ? combinations4[k]
        : 3 == n
          ? combinations3[k]
          : 2 == n
            ? combinations2[k]
            : 1 == n
              ? combinations1[k]
              : 0
  ) as number;
}

/** Coefficients of p(x + 1), written to `out`. */
function shiftPolyOne(coeffs: ArrayLike<number>, degree: number, out: NumberList): void {
  out[0] = coeffs[0] as number;
  for (let i = 1; i <= degree; ++i) {
    out[i] = coeffs[i] as number;
    for (let j = 0; j < i; ++j) {
      out[i] = (out[i] as number) + combNK(degree - j, i - j) * (coeffs[j] as number);
    }
  }
}

/**
 * Maps the roots in [lo, hi] to the positive roots of the result (for
 * Descartes' rule of signs). Works in Float32 like the old code.
 */
function inversePolyInterval(
  coeffs: ArrayLike<number>,
  degree: number,
  lo: number,
  hi: number,
  out: NumberList,
): void {
  const shifted = new Float32Array(degree + 1);
  for (let i = 0; i <= degree; ++i) shifted[i] = coeffs[i] as number;
  shiftPoly(coeffs, degree, lo, shifted);
  const width = hi - lo;
  if (0 != width) {
    let scale = 1;
    for (let i = 1; i <= degree; ++i) {
      scale /= width;
      shifted[degree - i] = (shifted[degree - i] as number) * scale;
    }
  }
  inversePolyUnaryInterval(shifted, degree, out);
}

/** Maps the roots in [0, 1] to the positive roots of the result, in Float32. */
function inversePolyUnaryInterval(
  coeffs: ArrayLike<number>,
  degree: number,
  out: NumberList,
): void {
  const reversed = new Float32Array(degree + 1);
  for (let i = 0; i <= degree; ++i) reversed[i] = coeffs[degree - i] as number;
  shiftPolyOne(reversed, degree, out);
}

/** Upper bound of the positive roots: sign changes of the nonzero coefficients. */
function estimPositiveRootsDescartes(coeffs: ArrayLike<number>, degree: number): number {
  const nonZero: number[] = [];
  let count = 0;
  let changes = 0;
  for (let i = 0; i <= degree; ++i) {
    if (0 != coeffs[i]) {
      nonZero.push(coeffs[i] as number);
      ++count;
    }
  }
  for (let i = 0; i < count - 1; ++i) {
    const a = nonZero[i] as number;
    const b = nonZero[i + 1] as number;
    if ((a > 0 && b < 0) || (a < 0 && b > 0)) changes += 1;
  }
  return changes;
}

/**
 * Which of eight 45-degree sectors the direction from `from` to `to`
 * falls into (0..7), sectors centered on the axes and diagonals; used to
 * pick rotation cursors.
 */
function getRotationSegment(from: Point, to: Point): number {
  let angle = Math.atan2(to.getY() - from.getY(), to.getX() - from.getX()) + (7 * Math.PI) / 8;
  if (angle < 0) angle += PI2;
  let segment = Math.floor(angle / (Math.PI / 4));
  if (segment < 0 || segment > 7) segment = 7;
  return segment;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(value, min));
}

export const GMath = {
  PI2,
  PIHALF,
  defaultEps,
  _maxIter: maxNewtonIterations,
  toRadians,
  toDegrees,
  normalizeAngleRadians,
  normalizeAngleDegrees,
  normalizeValue,
  normalizePoint,
  isEqualEps,
  getTurnAngle,
  round,
  mod,
  div,
  nextPowerOf2,
  getIntersectionPoint,
  circleLineIntersection,
  circleCircleIntersection,
  getLinesIntersection,
  getLinesFromPointsIntersection,
  getCircumcircleCenter,
  getPointAtSegment,
  getPointAtLength,
  getCurveAtT,
  getCubicCurveAtT,
  vDotProduct,
  Q_rsqrt,
  ptSqrDist,
  ptDist,
  segmentSide,
  sqrSegmentDist,
  getSegmToSegmSqrDist,
  pointToLineDist,
  getVectorProjection,
  isCoDirected,
  getSin,
  solveLinear2Pseudo,
  divideQuadraticCurve,
  evalCubic,
  getBezierDerivativeEquationCoeffs,
  uSortSegment,
  getCubicCurveSplits,
  getBezierSelfIntersections,
  getCtrlPtsCasteljau,
  getCtrlPts,
  getCtrlPtsQuadratic,
  getArcLengthQuadratic,
  getArcLengthCubic,
  evalPoly,
  getCoeffPolyDeriv,
  getCubicRoots,
  locateByNewton,
  getQuadraticRoots,
  _pseudoRem,
  getSturmPRS,
  countRootsNSturm,
  locRootsSturm,
  shiftPoly,
  combNK,
  shiftPolyOne,
  inversePolyInterval,
  inversePolyUnaryInterval,
  estimPositiveRootsDescartes,
  getRotationSegment,
  clamp,
} as const;
