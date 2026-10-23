// Old: chunk.vendor.js module 647.
//
// Segment/segment intersections for the polygon boolean code: Kevin
// Lindsey's intersection library (lines, quadratic and cubic beziers)
// with Gravit's changes. Cubic/line intersections go through big.js
// ("precise" variants) unless the caller asks for the fast path, the
// cubic/cubic case uses a Bezout resultant, and the polynomial roots come
// from a Jenkins-Traub solver (a JavaScript port of rpoly_ak1).
//
// The hand-tuned epsilons, the order of floating-point operations and the
// way the solver objects are shared between its steps all decide which
// intersections are found, so they are kept as they were.
import { GMath } from "../../math/math.ts";
import { Point } from "../../math/point.ts";
import { Big } from "./big.ts";
import { IntersectionPoint, type IntersectionSegment } from "./intersection-point.ts";

export type { IntersectionSegment };

/** A polynomial coefficient: a double, or a big.js number in the precise variants. */
export type Coefficient = number | Big;

/** An intersection of a curve with a line: curve parameter and point. */
export interface CurveLineHit {
  m: number;
  p: Point;
}

/**
 * An intersection of two curves: `m0` is the parameter on the curve the
 * polynomial was solved for (the second argument), `m1` on the other.
 */
export interface CurveCurveHit {
  m0: number;
  m1: number;
  p: Point;
}

const LARGE_EPS = 1e-4;
const SMALL_EPS = 1e-12;
// Not an integer (11.999999999999998); toFixed truncates it to 11 digits.
const LOG_EPS = -Math.log(SMALL_EPS) / Math.LN10;
const TINY_EPS = GMath.defaultEps;

/**
 * 1 for a line (no curve, or a quadratic whose control point lies on the
 * chord), 2 for a quadratic (or a cubic with a control point on an end
 * point) and 3 for a cubic.
 */
function _checkDegree(segment: IntersectionSegment): number {
  const curve = segment.currCurve;
  if (!curve) return 1;
  const curveEnd = (curve.nextCurve as IntersectionSegment).point as Point;
  if (curve.cp2 && !Point.equals(curve.cp2, curve.cp1)) {
    return Point.equals(curve.cp2, curveEnd) || Point.equals(curve.cp1, curve.point) ? 2 : 3;
  }
  const cp1 = curve.cp1 as Point;
  const controlX = cp1.getX();
  const controlY = cp1.getY();
  const start = curve.point as Point;
  const end = curveEnd;
  const cross =
    (controlY - start.getY()) * (end.getX() - start.getX()) -
    (controlX - start.getX()) * (end.getY() - start.getY());
  const pad = new Point(SMALL_EPS / 2, SMALL_EPS / 2);
  const min = Point.min(start, end).subtract(pad);
  const max = Point.max(start, end).add(pad);
  return GMath.isEqualEps(cross, 0, SMALL_EPS) &&
    controlY <= max.getY() &&
    controlY >= min.getY() &&
    controlX <= max.getX() &&
    controlX >= min.getX()
    ? 1
    : 2;
}

/** Hits of either kind, as the point builder of intersect() reads them. */
interface AnyHit {
  p: Point;
  m?: number;
  m0?: number;
  m1?: number;
}

/**
 * Intersects two poly segments. Each is a line, or a piece of the curve
 * its `currCurve` holds; the result points carry the parameter on each
 * curve and the poly segment of the flattened curve they fall on. Two
 * lines give null when they don't cross. `fast` uses the double
 * precision cubic/line intersection instead of the big.js one.
 */
function intersect<S extends IntersectionSegment>(
  seg0: S,
  seg1: S,
  fast?: boolean,
): IntersectionPoint<S>[] | null {
  // Parameter of `point` on the line start-end.
  const lineParameter = (start: Point, end: Point, point: Point): number => {
    const startX = start.getX();
    const startY = start.getY();
    const pointX = point.getX();
    const pointY = point.getY();
    const endX = end.getX();
    const endY = end.getY();
    return Math.sqrt(
      GMath.ptSqrDist(startX, startY, pointX, pointY) / GMath.ptSqrDist(startX, startY, endX, endY),
    );
  };

  // The poly segment of the flattened curve that holds parameter t.
  const segmentAt = (segment: S, t: number): S => {
    if (segment.currCurve) {
      let current = segment.currCurve;
      const end = segment.currCurve.nextCurve;
      while (current !== end) {
        const next = current.next as IntersectionSegment;
        if (t <= next.m || next === end) break;
        current = next;
      }
      return current as S;
    }
    return segment;
  };

  const toPoints = (
    hits: AnyHit[],
    a: S,
    b: S,
    lineIsFirst: boolean,
    lineIsSecond: boolean,
    swapped: boolean,
    lineStart?: Point,
    lineEnd?: Point,
  ): IntersectionPoint<S>[] => {
    const out: IntersectionPoint<S>[] = [];
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i] as AnyHit;
      const point = hit.p;
      let slope0: number;
      let slope1: number;
      if (lineIsFirst) {
        slope0 = lineParameter(lineStart as Point, lineEnd as Point, point);
        slope1 = hit.m as number;
      } else if (lineIsSecond) {
        slope0 = hit.m as number;
        slope1 = lineParameter(lineStart as Point, lineEnd as Point, point);
      } else if (swapped) {
        slope1 = hit.m1 as number;
        slope0 = hit.m0 as number;
      } else {
        slope1 = hit.m0 as number;
        slope0 = hit.m1 as number;
      }
      out.push(
        new IntersectionPoint<S>(point, slope0, slope1, segmentAt(a, slope0), segmentAt(b, slope1)),
      );
    }
    return out;
  };

  const curveStart = (s: S): Point => (s.currCurve as IntersectionSegment).point as Point;
  const curveCp1 = (s: S): Point => (s.currCurve as IntersectionSegment).cp1 as Point;
  const curveCp2 = (s: S): Point => (s.currCurve as IntersectionSegment).cp2 as Point;
  const curveEnd = (s: S): Point =>
    ((s.currCurve as IntersectionSegment).nextCurve as IntersectionSegment).point as Point;
  const lineStartOf = (s: S): Point =>
    s.currCurve ? (s.currCurve.point as Point) : (s.point as Point);
  const lineEndOf = (s: S): Point =>
    s.currCurve
      ? ((s.currCurve.nextCurve as IntersectionSegment).point as Point)
      : ((s.next as IntersectionSegment).point as Point);

  const degree0 = _checkDegree(seg0);
  const degree1 = _checkDegree(seg1);

  if (degree0 === 1 && degree1 === 1) {
    const start1 = lineStartOf(seg1);
    const end1 = lineEndOf(seg1);
    const start0 = lineStartOf(seg0);
    const end0 = lineEndOf(seg0);
    const params: number[] = [];
    const point = GMath.getIntersectionPoint(
      start0.getX(),
      start0.getY(),
      end0.getX(),
      end0.getY(),
      start1.getX(),
      start1.getY(),
      end1.getX(),
      end1.getY(),
      params,
    );
    const t0 = params[0] as number;
    const t1 = params[1] as number;
    return point && t0 >= 0 && t0 <= 1 && t1 >= 0 && t1 <= 1
      ? [new IntersectionPoint<S>(point, t0, t1, segmentAt(seg0, t0), segmentAt(seg1, t1))]
      : null;
  }
  if (degree0 === 1 && degree1 === 2) {
    const start = lineStartOf(seg0);
    const end = lineEndOf(seg0);
    const hits = intersectBezier2Line(curveStart(seg1), curveCp1(seg1), curveEnd(seg1), start, end);
    return toPoints(hits, seg0, seg1, true, false, false, start, end);
  }
  if (degree0 === 2 && degree1 === 1) {
    const start = lineStartOf(seg1);
    const end = lineEndOf(seg1);
    const hits = intersectBezier2Line(curveStart(seg0), curveCp1(seg0), curveEnd(seg0), start, end);
    return toPoints(hits, seg0, seg1, false, true, false, start, end);
  }
  if (degree0 === 2 && degree1 === 2) {
    const hits = intersectBezier2Bezier2(
      curveStart(seg0),
      curveCp1(seg0),
      curveEnd(seg0),
      curveStart(seg1),
      curveCp1(seg1),
      curveEnd(seg1),
    );
    return toPoints(hits, seg0, seg1, false, false, false);
  }
  if (degree0 === 2 && degree1 === 3) {
    const hits = intersectBezier2Bezier3(
      curveStart(seg0),
      curveCp1(seg0),
      curveEnd(seg0),
      curveStart(seg1),
      curveCp1(seg1),
      curveCp2(seg1),
      curveEnd(seg1),
    );
    return toPoints(hits, seg0, seg1, false, false, false);
  }
  if (degree0 === 3 && degree1 === 2) {
    const hits = intersectBezier2Bezier3(
      curveStart(seg1),
      curveCp1(seg1),
      curveEnd(seg1),
      curveStart(seg0),
      curveCp1(seg0),
      curveCp2(seg0),
      curveEnd(seg0),
    );
    return toPoints(hits, seg0, seg1, false, false, true);
  }
  if (degree0 === 1 && degree1 === 3) {
    const start = lineStartOf(seg0);
    const end = lineEndOf(seg0);
    const hits = fast
      ? intersectBezier3Line(
          curveStart(seg1),
          curveCp1(seg1),
          curveCp2(seg1),
          curveEnd(seg1),
          start,
          end,
        )
      : intersectBezier3LinePrecise(
          curveStart(seg1),
          curveCp1(seg1),
          curveCp2(seg1),
          curveEnd(seg1),
          start,
          end,
        );
    return toPoints(hits, seg0, seg1, true, false, false, start, end);
  }
  if (degree0 === 3 && degree1 === 1) {
    const start = lineStartOf(seg1);
    const end = lineEndOf(seg1);
    const hits = fast
      ? intersectBezier3Line(
          curveStart(seg0),
          curveCp1(seg0),
          curveCp2(seg0),
          curveEnd(seg0),
          start,
          end,
        )
      : intersectBezier3LinePrecise(
          curveStart(seg0),
          curveCp1(seg0),
          curveCp2(seg0),
          curveEnd(seg0),
          start,
          end,
        );
    return toPoints(hits, seg0, seg1, false, true, false, start, end);
  }
  // _checkDegree only returns 1, 2 or 3, so this is the cubic/cubic case.
  const hits = intersectBezier3Bezier3(
    curveStart(seg0),
    curveCp1(seg0),
    curveCp2(seg0),
    curveEnd(seg0),
    curveStart(seg1),
    curveCp1(seg1),
    curveCp2(seg1),
    curveEnd(seg1),
    true,
  );
  return toPoints(hits, seg0, seg1, false, false, false);
}

/**
 * Keeps a hit on the line a1-a2: inside the padded box, checking only y
 * for a vertical and only x for a horizontal line.
 */
function onLine(a1: Point, a2: Point, min: Point, max: Point, point: Point): boolean {
  if (a1.getX() == a2.getX()) {
    return min.getY() <= point.getY() && point.getY() <= max.getY();
  }
  if (a1.getY() == a2.getY()) {
    return min.getX() <= point.getX() && point.getX() <= max.getX();
  }
  return (
    min.getX() <= point.getX() &&
    point.getX() <= max.getX() &&
    min.getY() <= point.getY() &&
    point.getY() <= max.getY()
  );
}

function intersectBezier2Line(
  p1: Point,
  p2: Point,
  p3: Point,
  a1: Point,
  a2: Point,
): CurveLineHit[] {
  const pad = new Point(TINY_EPS, TINY_EPS);
  const min = Point.min(a1, a2).subtract(pad);
  const max = Point.max(a1, a2).add(pad);
  const result: CurveLineHit[] = [];
  const coefficients = _calcQuadraticCoefficients(p1, p2, p3);
  const c0 = coefficients[0] as Point;
  const c1 = coefficients[1] as Point;
  const c2 = coefficients[2] as Point;
  const normal = new Point(a1.getY() - a2.getY(), a2.getX() - a1.getX());
  const lineConstant = a1.getX() * a2.getY() - a2.getX() * a1.getY();
  const roots = new Polynomial([
    normal.dot(c2),
    normal.dot(c1),
    normal.dot(c0) + lineConstant,
  ]).getRoots();
  if (!roots) return [];
  for (let i = 0; i < roots.length; i++) {
    const t = roots[i] as number;
    if (0 <= t && t <= 1) {
      const p4 = p1.lerp(p2, t);
      const p5 = p2.lerp(p3, t);
      const p6 = p4.lerp(p5, t);
      if (onLine(a1, a2, min, max, p6)) result.push({ m: t, p: p6 });
    }
  }
  return result;
}

function intersectBezier2Bezier2(
  a1: Point,
  a2: Point,
  a3: Point,
  b1: Point,
  b2: Point,
  b3: Point,
): CurveCurveHit[] {
  const result: CurveCurveHit[] = [];
  a1 = _roundPoint(a1);
  a2 = _roundPoint(a2);
  a3 = _roundPoint(a3);
  b1 = _roundPoint(b1);
  b2 = _roundPoint(b2);
  b3 = _roundPoint(b3);
  let coefficients = _calcQuadraticCoefficients(a1, a2, a3);
  const ac0 = coefficients[0] as Point;
  const ac1 = coefficients[1] as Point;
  const ac2 = coefficients[2] as Point;
  coefficients = _calcQuadraticCoefficients(b1, b2, b3);
  const bc0 = coefficients[0] as Point;
  const bc1 = coefficients[1] as Point;
  const bc2 = coefficients[2] as Point;
  let poly: Polynomial;
  if (ac2.getY() == 0) {
    const v0 = ac2.getX() * (ac0.getY() - bc0.getY());
    const v1 = v0 - ac1.getX() * ac1.getY();
    const v2 = ac1.getY() * ac1.getY();
    poly = new Polynomial([
      ac2.getX() * bc2.getY() * bc2.getY(),
      2 * ac2.getX() * bc1.getY() * bc2.getY(),
      ac2.getX() * bc1.getY() * bc1.getY() - bc2.getX() * v2 - bc2.getY() * v0 - bc2.getY() * v1,
      -bc1.getX() * v2 - bc1.getY() * v0 - bc1.getY() * v1,
      (ac0.getX() - bc0.getX()) * v2 + (ac0.getY() - bc0.getY()) * v1,
    ]);
  } else {
    const v0 = ac2.getX() * bc2.getY() - ac2.getY() * bc2.getX();
    const v1 = ac2.getX() * bc1.getY() - bc1.getX() * ac2.getY();
    const v2 = ac1.getX() * ac2.getY() - ac1.getY() * ac2.getX();
    const v3 = ac0.getY() - bc0.getY();
    const v4 = ac2.getY() * (ac0.getX() - bc0.getX()) - ac2.getX() * v3;
    const v5 = -ac1.getY() * v2 + ac2.getY() * v4;
    const v6 = v2 * v2;
    poly = new Polynomial([
      v0 * v0,
      2 * v0 * v1,
      (-bc2.getY() * v6 + ac2.getY() * v1 * v1 + ac2.getY() * v0 * v4 + v0 * v5) / ac2.getY(),
      (-bc1.getY() * v6 + ac2.getY() * v1 * v4 + v1 * v5) / ac2.getY(),
      (v3 * v6 + v4 * v5) / ac2.getY(),
    ]);
  }
  const roots = poly.getRoots();
  if (!roots) return [];
  removeMultipleRoots(roots);
  for (let i = 0; i < roots.length; i++) {
    const s = roots[i] as number;
    if (0 <= s && s <= 1) {
      let xRoots = new Polynomial([
        ac2.getX(),
        ac1.getX(),
        ac0.getX() - bc0.getX() - s * bc1.getX() - s * s * bc2.getX(),
      ]).getRoots();
      let yRoots = new Polynomial([
        ac2.getY(),
        ac1.getY(),
        ac0.getY() - bc0.getY() - s * bc1.getY() - s * s * bc2.getY(),
      ]).getRoots();
      if (xRoots) {
        if (!yRoots) yRoots = xRoots;
      } else {
        if (!yRoots) return [];
        xRoots = yRoots;
      }
      if (xRoots.length > 0 && yRoots.length > 0) {
        found: for (let j = 0; j < xRoots.length; j++) {
          const xRoot = xRoots[j] as number;
          if (0 <= xRoot && xRoot <= 1) {
            for (let k = 0; k < yRoots.length; k++) {
              if (Math.abs(xRoot - (yRoots[k] as number)) < LARGE_EPS) {
                result.push({
                  m0: s,
                  m1: xRoot,
                  p: bc2.scale(s * s).add(bc1.scale(s).add(bc0)),
                });
                break found;
              }
            }
          }
        }
      }
    }
  }
  return result;
}

/**
 * Moves the points into the positive quadrant first: by the absolute
 * value of their minimum, which for a negative minimum adds instead of
 * subtracting. The hit points come from the unshifted cubic.
 */
function intersectBezier2Bezier3(
  a1: Point,
  a2: Point,
  a3: Point,
  b1: Point,
  b2: Point,
  b3: Point,
  b4: Point,
): CurveCurveHit[] {
  const result: CurveCurveHit[] = [];
  a1 = _roundPoint(a1);
  a2 = _roundPoint(a2);
  a3 = _roundPoint(a3);
  b1 = _roundPoint(b1);
  b2 = _roundPoint(b2);
  b3 = _roundPoint(b3);
  b4 = _roundPoint(b4);
  let shift = Point.min(a1, a2, a3, b1, b2, b3, b4);
  if (shift.getX() < 0) shift = new Point(-shift.getX(), shift.getY());
  if (shift.getY() < 0) shift = new Point(shift.getX(), -shift.getY());
  const cubic = _calcCubicCoefficients(b1, b2, b3, b4);
  const quadShifted = _calcQuadraticCoefficients(
    a1.subtract(shift),
    a2.subtract(shift),
    a3.subtract(shift),
  );
  const ac0 = quadShifted[0] as Point;
  const ac1 = quadShifted[1] as Point;
  const ac2 = quadShifted[2] as Point;
  const cubicShifted = _calcCubicCoefficients(
    b1.subtract(shift),
    b2.subtract(shift),
    b3.subtract(shift),
    b4.subtract(shift),
  );
  const bc0 = cubicShifted[0] as Point;
  const bc1 = cubicShifted[1] as Point;
  const bc2 = cubicShifted[2] as Point;
  const bc3 = cubicShifted[3] as Point;
  const a0x = ac0.getX();
  const a0y = ac0.getY();
  const a1x = ac1.getX();
  const a1y = ac1.getY();
  const a2x = ac2.getX();
  const a2y = ac2.getY();
  const b0x = bc0.getX();
  const b0y = bc0.getY();
  const b1x = bc1.getX();
  const b1y = bc1.getY();
  const b2x = bc2.getX();
  const b2y = bc2.getY();
  const b3x = bc3.getX();
  const b3y = bc3.getY();
  const a0xSq = a0x * a0x;
  const a0ySq = a0y * a0y;
  const a1xSq = a1x * a1x;
  const a1ySq = a1y * a1y;
  const a2xSq = a2x * a2x;
  const a2ySq = a2y * a2y;
  const b0xSq = b0x * b0x;
  const b0ySq = b0y * b0y;
  const b1xSq = b1x * b1x;
  const b1ySq = b1y * b1y;
  const b2xSq = b2x * b2x;
  const b2ySq = b2y * b2y;
  const b3xSq = b3x * b3x;
  const b3ySq = b3y * b3y;
  const roots = new Polynomial([
    -2 * a2x * a2y * b3x * b3y + a2xSq * b3ySq + a2ySq * b3xSq,
    2 * a2xSq * b2y * b3y + (-2 * b2x * b3y - 2 * b2y * b3x) * a2y * a2x + 2 * a2ySq * b2x * b3x,
    a2xSq * (2 * b1y * b3y + b2ySq) +
      (-2 * b1y * b3x - 2 * b2x * b2y - 2 * b1x * b3y) * a2y * a2x +
      (b2xSq + 2 * b1x * b3x) * a2ySq,
    (-2 * a2ySq * b3x + 2 * a2x * a2y * b3y) * a0x +
      (2 * a2x * a2y * b3x - 2 * a2xSq * b3y) * a0y -
      a1xSq * a2y * b3y +
      (a2y * b3x + a2x * b3y) * a1y * a1x -
      a1ySq * a2x * b3x +
      a2xSq * (2 * b0y * b3y + 2 * b1y * b2y) +
      (-2 * b0y * b3x - 2 * b1y * b2x - 2 * b0x * b3y - 2 * b1x * b2y) * a2y * a2x +
      (2 * b0x * b3x + 2 * b1x * b2x) * a2ySq,
    (-2 * a2ySq * b2x + 2 * a2x * a2y * b2y) * a0x +
      (-2 * a2xSq * b2y + 2 * a2x * a2y * b2x) * a0y -
      a1xSq * a2y * b2y +
      (a2y * b2x + a2x * b2y) * a1y * a1x -
      a1ySq * a2x * b2x +
      a2xSq * (2 * b0y * b2y + b1ySq) +
      (-2 * b1x * b1y - 2 * b0x * b2y - 2 * b0y * b2x) * a2y * a2x +
      (2 * b0x * b2x + b1xSq) * a2ySq,
    (2 * a2x * a2y * b1y - 2 * b1x * a2ySq) * a0x +
      (-2 * a2xSq * b1y + 2 * a2x * b1x * a2y) * a0y -
      a1xSq * a2y * b1y +
      (a2x * b1y + b1x * a2y) * a1y * a1x -
      a1ySq * a2x * b1x +
      2 * a2xSq * b0y * b1y +
      (-2 * b0x * b1y - 2 * b0y * b1x) * a2y * a2x +
      2 * b0x * b1x * a2ySq,
    a0xSq * a2ySq +
      (-a1x * a1y * a2y -
        2 * b0x * a2ySq +
        a1ySq * a2x +
        2 * a2x * b0y * a2y -
        2 * a0y * a2x * a2y) *
        a0x +
      a0ySq * a2xSq +
      (-a1x * a1y * a2x + 2 * b0x * a2x * a2y + a1xSq * a2y - 2 * a2xSq * b0y) * a0y -
      a1xSq * b0y * a2y +
      (b0x * a2y + a2x * b0y) * a1y * a1x -
      b0x * a1ySq * a2x +
      a2xSq * b0ySq -
      2 * b0x * a2x * b0y * a2y +
      b0xSq * a2ySq,
  ]).getRootsInInterval(0, 1);
  removeMultipleRoots(roots);
  for (let i = 0; i < roots.length; i++) {
    const s = roots[i] as number;
    let xRoots = new Polynomial([
      a2x,
      a1x,
      a0x - b0x - s * b1x - s * s * b2x - s * s * s * b3x,
    ]).getRoots();
    let yRoots = new Polynomial([
      a2y,
      a1y,
      a0y - b0y - s * b1y - s * s * b2y - s * s * s * b3y,
    ]).getRoots();
    if (xRoots) {
      if (!yRoots) yRoots = xRoots;
    } else {
      if (!yRoots) return [];
      xRoots = yRoots;
    }
    if (xRoots.length > 0 && yRoots.length > 0) {
      found: for (let j = 0; j < xRoots.length; j++) {
        const xRoot = xRoots[j] as number;
        if (0 <= xRoot && xRoot <= 1) {
          for (let k = 0; k < yRoots.length; k++) {
            if (Math.abs(xRoot - (yRoots[k] as number)) < LARGE_EPS) {
              result.push({
                m0: s,
                m1: xRoot,
                p: (cubic[3] as Point)
                  .scale(s * s * s)
                  .add(
                    (cubic[2] as Point)
                      .scale(s * s)
                      .add((cubic[1] as Point).scale(s).add(cubic[0] as Point)),
                  ),
              });
              break found;
            }
          }
        }
      }
    }
  }
  return result;
}

/**
 * The mean curve parameter of the points of the cubic p1..p4 within
 * `tolerance` (default 0.01) of `point`, or null when there are none.
 */
function hitTestBezier3(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
  point: Point,
  tolerance?: number,
): number | null {
  tolerance = tolerance || 0.01;
  p1 = _roundPoint(p1);
  p2 = _roundPoint(p2);
  p3 = _roundPoint(p3);
  p4 = _roundPoint(p4);
  point = _roundPoint(point);
  const coefficients = _calcCubicCoefficients(p1, p2, p3, p4);
  const c0 = coefficients[0] as Point;
  const c1 = coefficients[1] as Point;
  const c2 = coefficients[2] as Point;
  const c3 = coefficients[3] as Point;
  const tolSq = tolerance * tolerance;
  const roots = new Polynomial([
    c3.getX() * c3.getX() * tolSq + c3.getY() * c3.getY() * tolSq,
    2 * (c3.getX() * c2.getX() * tolSq + c3.getY() * c2.getY() * tolSq),
    2 * (c3.getX() * c1.getX() * tolSq + c3.getY() * c1.getY() * tolSq) +
      c2.getX() * c2.getX() * tolSq +
      c2.getY() * c2.getY() * tolSq,
    2 * c3.getX() * tolSq * (c0.getX() - point.getX()) +
      2 * c3.getY() * tolSq * (c0.getY() - point.getY()) +
      2 * (c2.getX() * c1.getX() * tolSq + c2.getY() * c1.getY() * tolSq),
    2 * c2.getX() * tolSq * (c0.getX() - point.getX()) +
      2 * c2.getY() * tolSq * (c0.getY() - point.getY()) +
      c1.getX() * c1.getX() * tolSq +
      c1.getY() * c1.getY() * tolSq,
    2 * c1.getX() * tolSq * (c0.getX() - point.getX()) +
      2 * c1.getY() * tolSq * (c0.getY() - point.getY()),
    c0.getX() * c0.getX() * tolSq -
      2 * c0.getY() * point.getY() * tolSq -
      2 * c0.getX() * point.getX() * tolSq +
      c0.getY() * c0.getY() * tolSq +
      point.getX() * point.getX() * tolSq +
      point.getY() * point.getY() * tolSq -
      tolSq * tolSq,
  ]).getRootsInInterval(0, 1);
  // The old code also evaluated the curve at each root and threw the
  // point away.
  let sum = 0;
  if (roots.length) {
    for (let i = 0; i < roots.length; i++) sum += roots[i] as number;
    return sum / roots.length;
  }
  return null;
}

function intersectBezier3Line(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
  a1: Point,
  a2: Point,
): CurveLineHit[] {
  p1 = _roundPoint(p1);
  p2 = _roundPoint(p2);
  p3 = _roundPoint(p3);
  p4 = _roundPoint(p4);
  a1 = _roundPoint(a1);
  a2 = _roundPoint(a2);
  const pad = new Point(SMALL_EPS, SMALL_EPS);
  const min = Point.min(a1, a2).subtract(pad);
  const max = Point.max(a1, a2).add(pad);
  const result: CurveLineHit[] = [];
  const coefficients = _calcCubicCoefficients(p1, p2, p3, p4);
  const c0 = coefficients[0] as Point;
  const c1 = coefficients[1] as Point;
  const c2 = coefficients[2] as Point;
  const c3 = coefficients[3] as Point;
  const normal = new Point(a1.getY() - a2.getY(), a2.getX() - a1.getX());
  const lineConstant = a1.getX() * a2.getY() - a2.getX() * a1.getY();
  const roots = new Polynomial([
    normal.dot(c3),
    normal.dot(c2),
    normal.dot(c1),
    normal.dot(c0) + lineConstant,
  ]).getRoots();
  if (!roots) return [];
  for (let i = 0; i < roots.length; i++) {
    const t = roots[i] as number;
    if (0 <= t && t <= 1) {
      const p5 = p1.lerp(p2, t);
      const p6 = p2.lerp(p3, t);
      const p7 = p3.lerp(p4, t);
      const p8 = p5.lerp(p6, t);
      const p9 = p6.lerp(p7, t);
      const p10 = p8.lerp(p9, t);
      if (onLine(a1, a2, min, max, p10)) result.push({ m: t, p: p10 });
    }
  }
  return result;
}

/** intersectBezier3Line with the polynomial set up in big.js numbers. */
function intersectBezier3LinePrecise(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
  a1: Point,
  a2: Point,
): CurveLineHit[] {
  const eps = SMALL_EPS;
  const pad = new Point(eps, eps);
  p1 = _roundPoint(p1);
  p2 = _roundPoint(p2);
  p3 = _roundPoint(p3);
  p4 = _roundPoint(p4);
  a1 = _roundPoint(a1);
  a2 = _roundPoint(a2);
  const min = Point.min(a1, a2).subtract(pad);
  const max = Point.max(a1, a2).add(pad);
  const result: CurveLineHit[] = [];
  const coefficients = _calcCubicCoefficientsPrecise(p1, p2, p3, p4);
  const c0 = coefficients[0];
  const c1 = coefficients[1];
  const c2 = coefficients[2];
  const c3 = coefficients[3];
  const normal = [
    new Big(a1.getY()).minus(new Big(a2.getY())),
    new Big(a2.getX()).minus(a1.getX()),
  ] as const;
  const lineConstant = new Big(a1.getX())
    .times(new Big(a2.getY()))
    .minus(new Big(a2.getX()).times(a1.getY()));
  const roots = new Polynomial([
    normal[0].times(c3[0]).plus(normal[1].times(c3[1])),
    normal[0].times(c2[0]).plus(normal[1].times(c2[1])),
    normal[0].times(c1[0]).plus(normal[1].times(c1[1])),
    normal[0].times(c0[0]).plus(normal[1].times(c0[1])).plus(lineConstant),
  ]).getRoots(true);
  if (!roots) return [];
  for (let i = 0; i < roots.length; i++) {
    const t = roots[i] as number;
    if (0 <= t && t <= 1) {
      const p5 = p1.lerp(p2, t);
      const p6 = p2.lerp(p3, t);
      const p7 = p3.lerp(p4, t);
      const p8 = p5.lerp(p6, t);
      const p9 = p6.lerp(p7, t);
      const p10 = _roundPoint(p8.lerp(p9, t));
      if (onLine(a1, a2, min, max, p10)) result.push({ m: t, p: p10 });
    }
  }
  return result;
}

/** [c0, c1, c2] with p(t) = c2*t^2 + c1*t + c0. */
function _calcQuadraticCoefficients(p1: Point, p2: Point, p3: Point): Point[] {
  let a = p2.scale(-2);
  const c2 = p1.add(a.add(p3));
  a = p1.scale(-2);
  const b = p2.scale(2);
  const c1 = a.add(b);
  return [new Point(p1.getX(), p1.getY()), c1, c2];
}

/** [c0, c1, c2, c3] with p(t) = c3*t^3 + c2*t^2 + c1*t + c0. */
function _calcCubicCoefficients(p1: Point, p2: Point, p3: Point, p4: Point): Point[] {
  let a = p1.scale(-1);
  let b = p2.scale(3);
  let c = p3.scale(-3);
  let d = a.add(b.add(c.add(p4)));
  const c3 = new Point(d.getX(), d.getY());
  a = p1.scale(3);
  b = p2.scale(-6);
  c = p3.scale(3);
  d = a.add(b.add(c));
  const c2 = new Point(d.getX(), d.getY());
  a = p1.scale(-3);
  b = p2.scale(3);
  c = a.add(b);
  const c1 = new Point(c.getX(), c.getY());
  return [new Point(p1.getX(), p1.getY()), c1, c2, c3];
}

type BigPair = [Big, Big];

/** _calcCubicCoefficients in big.js numbers, as [x, y] pairs. */
function _calcCubicCoefficientsPrecise(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
): [BigPair, BigPair, BigPair, BigPair] {
  const x1 = new Big(p1.getX());
  const y1 = new Big(p1.getY());
  const x2 = new Big(p2.getX());
  const y2 = new Big(p2.getY());
  const x3 = new Big(p3.getX());
  const y3 = new Big(p3.getY());
  const x4 = new Big(p4.getX());
  const y4 = new Big(p4.getY());
  let ax = x1.times(-1);
  let ay = y1.times(-1);
  let bx = x2.times(3);
  let by = y2.times(3);
  let cx = x3.times(-3);
  let cy = y3.times(-3);
  const c3: BigPair = [ax.plus(bx).plus(cx).plus(x4), ay.plus(by).plus(cy).plus(y4)];
  ax = x1.times(3);
  ay = y1.times(3);
  bx = x2.times(-6);
  by = y2.times(-6);
  cx = x3.times(3);
  cy = y3.times(3);
  const c2: BigPair = [ax.plus(bx).plus(cx), ay.plus(by).plus(cy)];
  ax = x1.times(-3);
  ay = y1.times(-3);
  bx = x2.times(3);
  by = y2.times(3);
  return [[x1, y1], [ax.plus(bx), ay.plus(by)], c2, c3];
}

/**
 * Cubic/cubic intersections from the Bezout resultant, solved for the
 * second curve's parameter. With `both` it solves for the first curve's
 * parameter too and adds the hits the first pass missed. Like
 * intersectBezier2Bezier3 it shifts by the absolute minimum first.
 */
function intersectBezier3Bezier3(
  a1: Point,
  a2: Point,
  a3: Point,
  a4: Point,
  b1: Point,
  b2: Point,
  b3: Point,
  b4: Point,
  both?: boolean,
): CurveCurveHit[] {
  const result: CurveCurveHit[] = [];
  a1 = _roundPoint(a1);
  a2 = _roundPoint(a2);
  a3 = _roundPoint(a3);
  a4 = _roundPoint(a4);
  b1 = _roundPoint(b1);
  b2 = _roundPoint(b2);
  b3 = _roundPoint(b3);
  b4 = _roundPoint(b4);
  let shift = Point.min(a1, a2, a3, a4, b1, b2, b3, b4);
  if (shift.getX() < 0) shift = new Point(-shift.getX(), shift.getY());
  if (shift.getY() < 0) shift = new Point(shift.getX(), -shift.getY());
  const cubic = _calcCubicCoefficients(b1, b2, b3, b4);
  const curveAt = (s: number): Point =>
    (cubic[3] as Point)
      .scale(s * s * s)
      .add(
        (cubic[2] as Point).scale(s * s).add((cubic[1] as Point).scale(s).add(cubic[0] as Point)),
      );
  let coefficients = _calcCubicCoefficients(
    a1.subtract(shift),
    a2.subtract(shift),
    a3.subtract(shift),
    a4.subtract(shift),
  );
  const ac0 = coefficients[0] as Point;
  const ac1 = coefficients[1] as Point;
  const ac2 = coefficients[2] as Point;
  const ac3 = coefficients[3] as Point;
  coefficients = _calcCubicCoefficients(
    b1.subtract(shift),
    b2.subtract(shift),
    b3.subtract(shift),
    b4.subtract(shift),
  );
  const bc0 = coefficients[0] as Point;
  const bc1 = coefficients[1] as Point;
  const bc2 = coefficients[2] as Point;
  const bc3 = coefficients[3] as Point;
  const a0x = ac0.getX();
  const a0y = ac0.getY();
  const a1x = ac1.getX();
  const a1y = ac1.getY();
  const a2x = ac2.getX();
  const a2y = ac2.getY();
  const a3x = ac3.getX();
  const a3y = ac3.getY();
  const b0x = bc0.getX();
  const b0y = bc0.getY();
  const b1x = bc1.getX();
  const b1y = bc1.getY();
  const b2x = bc2.getX();
  const b2y = bc2.getY();
  const b3x = bc3.getX();
  const b3y = bc3.getY();
  const tolerance = 1e-4;
  let roots = new Polynomial(
    bezoutResultant(a0x, a0y, a1x, a1y, a2x, a2y, a3x, a3y, b0x, b0y, b1x, b1y, b2x, b2y, b3x, b3y),
  ).getRootsInInterval(0, 1);
  removeMultipleRoots(roots);
  const firstPass: number[] = [];
  for (let i = 0; i < roots.length; i++) {
    const s = roots[i] as number;
    let xRoots = new Polynomial([
      a3x,
      a2x,
      a1x,
      a0x - b0x - s * b1x - s * s * b2x - s * s * s * b3x,
    ]).getRoots();
    let yRoots = new Polynomial([
      a3y,
      a2y,
      a1y,
      a0y - b0y - s * b1y - s * s * b2y - s * s * s * b3y,
    ]).getRoots();
    if (xRoots) {
      if (!yRoots) yRoots = xRoots;
    } else {
      if (!yRoots) return [];
      xRoots = yRoots;
    }
    if (xRoots.length > 0 && yRoots.length > 0) {
      found: for (let j = 0; j < xRoots.length; j++) {
        const xRoot = xRoots[j] as number;
        if (0 <= xRoot && xRoot <= 1) {
          for (let k = 0; k < yRoots.length; k++) {
            if (Math.abs(xRoot - (yRoots[k] as number)) < tolerance) {
              if (both) firstPass.push(xRoot);
              result.push({ m0: s, m1: xRoot, p: curveAt(s) });
              break found;
            }
          }
        }
      }
    }
  }
  if (both) {
    roots = new Polynomial(
      bezoutResultant(
        b0x,
        b0y,
        b1x,
        b1y,
        b2x,
        b2y,
        b3x,
        b3y,
        a0x,
        a0y,
        a1x,
        a1y,
        a2x,
        a2y,
        a3x,
        a3y,
      ),
    ).getRootsInInterval(0, 1);
    removeMultipleRoots(roots);
    for (let i = 0; i < roots.length; i++) {
      const q = roots[i] as number;
      let known = false;
      for (let j = 0; j < firstPass.length; j++) {
        if (Math.abs((firstPass[j] as number) - q) < tolerance) {
          known = true;
          break;
        }
      }
      if (!known) {
        let xRoots = new Polynomial([
          b3x,
          b2x,
          b1x,
          b0x - a0x - q * a1x - q * q * a2x - q * q * q * a3x,
        ]).getRoots();
        let yRoots = new Polynomial([
          b3y,
          b2y,
          b1y,
          b0y - a0y - q * a1y - q * q * a2y - q * q * q * a3y,
        ]).getRoots();
        if (xRoots) {
          if (!yRoots) yRoots = xRoots;
        } else {
          // Drops the hits of the first pass too.
          if (!yRoots) return [];
          xRoots = yRoots;
        }
        if (xRoots.length > 0 && yRoots.length > 0) {
          found: for (let j = 0; j < xRoots.length; j++) {
            const s = xRoots[j] as number;
            if (0 <= s && s <= 1) {
              for (let k = 0; k < yRoots.length; k++) {
                if (Math.abs(s - (yRoots[k] as number)) < tolerance) {
                  result.push({ m0: s, m1: q, p: curveAt(s) });
                  break found;
                }
              }
            }
          }
        }
      }
    }
  }
  return result;
}

/** Rounds both coordinates to LOG_EPS (in effect 11) decimal places. */
function _roundPoint(point: Point): Point {
  return new Point(Number(point.getX().toFixed(LOG_EPS)), Number(point.getY().toFixed(LOG_EPS)));
}

/**
 * Lerp of two [x, y] big.js pairs. Unused by the engine. Anything but
 * arrays makes big.js throw (the old code converts undefined variables),
 * and a second pair whose y isn't a Big takes the first pair's y.
 */
function _lerpPrecise(a: unknown, b: unknown, t: number): BigPair {
  let ax: Big;
  let ay: Big;
  let bx: Big;
  let by: unknown;
  if (Array.isArray(a)) {
    ax = a[0] as Big;
    ay = a[1] as Big;
  } else {
    throw new Error("[big.js] Invalid number");
  }
  if (Array.isArray(b)) {
    bx = b[0] as Big;
    by = b[1];
  } else {
    throw new Error("[big.js] Invalid number");
  }
  const byBig = by instanceof Big ? by : new Big(ay);
  return [ax.plus(bx.minus(ax).times(t)), ay.plus(byBig.minus(ay).times(t))];
}

/**
 * The resultant of the cubics a(t) = a3*t^3 + ... + a0 and b(s) with
 * respect to t: a degree 9 polynomial in s (highest coefficient first)
 * whose roots are the parameters of b at the intersections.
 */
function bezoutResultant(
  a0x: number,
  a0y: number,
  a1x: number,
  a1y: number,
  a2x: number,
  a2y: number,
  a3x: number,
  a3y: number,
  b0x: number,
  b0y: number,
  b1x: number,
  b1y: number,
  b2x: number,
  b2y: number,
  b3x: number,
  b3y: number,
): number[] {
  const a0xSq = a0x * a0x;
  const a0ySq = a0y * a0y;
  const a1xSq = a1x * a1x;
  const a1xCu = a1x * a1x * a1x;
  const a1ySq = a1y * a1y;
  const a1yCu = a1y * a1y * a1y;
  const a2xSq = a2x * a2x;
  const a2xCu = a2x * a2x * a2x;
  const a2ySq = a2y * a2y;
  const a2yCu = a2y * a2y * a2y;
  const a3xSq = a3x * a3x;
  const a3xCu = a3x * a3x * a3x;
  const a3ySq = a3y * a3y;
  const a3yCu = a3y * a3y * a3y;
  const b0xSq = b0x * b0x;
  const b0ySq = b0y * b0y;
  const b1xSq = b1x * b1x;
  const b1ySq = b1y * b1y;
  const b2xSq = b2x * b2x;
  const b2ySq = b2y * b2y;
  const b3xSq = b3x * b3x;
  const b3ySq = b3y * b3y;
  return [
    -a3xCu * (b3y * b3y * b3y) +
      a3yCu * (b3x * b3x * b3x) -
      3 * a3x * a3ySq * b3xSq * b3y +
      3 * a3xSq * a3y * b3x * b3ySq,
    -3 * a3xCu * b2y * b3ySq +
      (6 * b2y * b3x * b3y + 3 * b2x * b3ySq) * a3y * a3xSq +
      (-6 * b2x * b3x * b3y - 3 * b2y * b3xSq) * a3ySq * a3x +
      3 * b2x * a3yCu * b3xSq,
    (-3 * b1y * b3ySq - 3 * b2ySq * b3y) * a3xCu +
      (3 * b1x * b3ySq + 6 * b2x * b2y * b3y + 6 * b3x * b1y * b3y + 3 * b3x * b2ySq) *
        a3y *
        a3xSq +
      (-6 * b2x * b2y * b3x - 3 * b1y * b3xSq - 6 * b1x * b3x * b3y - 3 * b2xSq * b3y) *
        a3ySq *
        a3x +
      (3 * b2xSq * b3x + 3 * b1x * b3xSq) * a3yCu,
    (6 * a3x * a3ySq * b3x * b3y - 3 * a3xSq * a3y * b3ySq - 3 * a3yCu * b3xSq) * a0x +
      (3 * a3x * a3ySq * b3xSq - 6 * a3xSq * a3y * b3x * b3y + 3 * a3xCu * b3ySq) * a0y +
      ((-3 * a3ySq * b3x * b3y + 3 * a3x * a3y * b3ySq) * a2x +
        (a3ySq * b3xSq - 2 * a3xSq * b3ySq + a3x * a3y * b3x * b3y) * a2y) *
        a1x +
      ((-a3xSq * b3ySq + 2 * a3ySq * b3xSq - a3x * a3y * b3x * b3y) * a2x +
        (3 * a3xSq * b3x * b3y - 3 * a3x * a3y * b3xSq) * a2y) *
        a1y -
      a2xCu * a3y * b3ySq +
      (a3x * b3ySq + 2 * a3y * b3x * b3y) * a2y * a2xSq +
      (-a3y * b3xSq - 2 * a3x * b3x * b3y) * a2ySq * a2x +
      a2yCu * a3x * b3xSq +
      (-3 * b0y * b3ySq - 6 * b1y * b2y * b3y - b2y * b2y * b2y) * a3xCu +
      (3 * b0x * b3ySq +
        6 * b3x * b0y * b3y +
        6 * b1x * b2y * b3y +
        (6 * b2y * b3x + 6 * b2x * b3y) * b1y +
        3 * b2x * b2ySq) *
        a3y *
        a3xSq +
      (-6 * b0x * b3x * b3y -
        3 * b0y * b3xSq +
        (-6 * b2x * b3y - 6 * b2y * b3x) * b1x -
        6 * b1y * b2x * b3x -
        3 * b2xSq * b2y) *
        a3ySq *
        a3x +
      (3 * b0x * b3xSq + b2x * b2x * b2x + 6 * b1x * b2x * b3x) * a3yCu,
    (-6 * a3xSq * a3y * b2y * b3y +
      (6 * b2y * b3x + 6 * b2x * b3y) * a3ySq * a3x -
      6 * b2x * a3yCu * b3x) *
      a0x +
      (6 * a3xCu * b2y * b3y +
        (-6 * b2x * b3y - 6 * b2y * b3x) * a3y * a3xSq +
        6 * a3x * b2x * a3ySq * b3x) *
        a0y +
      ((6 * a3x * a3y * b2y * b3y + (-3 * b2x * b3y - 3 * b2y * b3x) * a3ySq) * a2x +
        (-4 * a3xSq * b2y * b3y + (b2x * b3y + b2y * b3x) * a3y * a3x + 2 * b2x * a3ySq * b3x) *
          a2y) *
        a1x +
      ((-2 * a3xSq * b2y * b3y + (-b2x * b3y - b2y * b3x) * a3y * a3x + 4 * b2x * a3ySq * b3x) *
        a2x +
        ((3 * b2y * b3x + 3 * b2x * b3y) * a3xSq - 6 * a3x * b2x * a3y * b3x) * a2y) *
        a1y -
      2 * a2xCu * a3y * b2y * b3y +
      (2 * a3x * b2y * b3y + (2 * b2y * b3x + 2 * b2x * b3y) * a3y) * a2y * a2xSq +
      ((-2 * b2y * b3x - 2 * b2x * b3y) * a3x - 2 * b2x * a3y * b3x) * a2ySq * a2x +
      2 * a2yCu * a3x * b2x * b3x +
      (-3 * b3y * b1ySq - 6 * b0y * b2y * b3y - 3 * b1y * b2ySq) * a3xCu +
      (6 * b0x * b2y * b3y +
        (6 * b2y * b3x + 6 * b2x * b3y) * b0y +
        (6 * b1y * b3y + 3 * b2ySq) * b1x +
        6 * b2x * b1y * b2y +
        3 * b3x * b1ySq) *
        a3y *
        a3xSq +
      ((-6 * b2x * b3y - 6 * b2y * b3x) * b0x -
        6 * b0y * b2x * b3x -
        3 * b1xSq * b3y +
        (-6 * b2x * b2y - 6 * b1y * b3x) * b1x -
        3 * b1y * b2xSq) *
        a3ySq *
        a3x +
      (3 * b1x * b2xSq + 3 * b1xSq * b3x + 6 * b0x * b2x * b3x) * a3yCu,
    ((-6 * b1y * b3y - 3 * b2ySq) * a3y * a3xSq +
      (6 * b1y * b3x + 6 * b1x * b3y + 6 * b2x * b2y) * a3ySq * a3x +
      (-6 * b1x * b3x - 3 * b2xSq) * a3yCu) *
      a0x +
      ((6 * b1y * b3y + 3 * b2ySq) * a3xCu +
        (-6 * b2x * b2y - 6 * b1y * b3x - 6 * b1x * b3y) * a3y * a3xSq +
        (3 * b2xSq + 6 * b1x * b3x) * a3ySq * a3x) *
        a0y +
      (((6 * b1y * b3y + 3 * b2ySq) * a3y * a3x +
        (-3 * b1y * b3x - 3 * b1x * b3y - 3 * b2x * b2y) * a3ySq) *
        a2x +
        ((-4 * b1y * b3y - 2 * b2ySq) * a3xSq +
          (b2x * b2y + b1x * b3y + b1y * b3x) * a3y * a3x +
          (2 * b1x * b3x + b2xSq) * a3ySq) *
          a2y) *
        a1x +
      (((-2 * b1y * b3y - b2ySq) * a3xSq +
        (-b1y * b3x - b2x * b2y - b1x * b3y) * a3y * a3x +
        (2 * b2xSq + 4 * b1x * b3x) * a3ySq) *
        a2x +
        ((3 * b2x * b2y + 3 * b1y * b3x + 3 * b1x * b3y) * a3xSq +
          (-6 * b1x * b3x - 3 * b2xSq) * a3y * a3x) *
          a2y) *
        a1y +
      a2xCu * a3y * (-2 * b1y * b3y - b2ySq) +
      ((2 * b1y * b3y + b2ySq) * a3x + (2 * b1x * b3y + 2 * b1y * b3x + 2 * b2x * b2y) * a3y) *
        a2y *
        a2xSq +
      ((-2 * b1x * b3y - 2 * b1y * b3x - 2 * b2x * b2y) * a3x + (-b2xSq - 2 * b1x * b3x) * a3y) *
        a2ySq *
        a2x +
      (2 * b1x * b3x + b2xSq) * a3x * a2yCu +
      ((-6 * b1y * b3y - 3 * b2ySq) * b0y - 3 * b2y * b1ySq) * a3xCu +
      ((6 * b1y * b3y + 3 * b2ySq) * b0x +
        (6 * b1y * b3x + 6 * b1x * b3y + 6 * b2x * b2y) * b0y +
        3 * b2x * b1ySq +
        6 * b1x * b1y * b2y) *
        a3y *
        a3xSq +
      ((-6 * b2x * b2y - 6 * b1y * b3x - 6 * b1x * b3y) * b0x +
        (-6 * b1x * b3x - 3 * b2xSq) * b0y -
        3 * b1xSq * b2y -
        6 * b1x * b1y * b2x) *
        a3ySq *
        a3x +
      ((3 * b2xSq + 6 * b1x * b3x) * b0x + 3 * b1xSq * b2x) * a3yCu,
    (-3 * a3x * a3ySq * b3y + 3 * a3yCu * b3x) * a0xSq +
      ((6 * a3xSq * a3y * b3y - 6 * a3x * a3ySq * b3x) * a0y +
        (3 * a2x * a3ySq * b3y + (-2 * a3ySq * b3x - a3x * a3y * b3y) * a2y) * a1x +
        ((-4 * a3ySq * b3x + a3x * a3y * b3y) * a2x +
          (6 * a3x * a3y * b3x - 3 * a3xSq * b3y) * a2y) *
          a1y -
        2 * a2xSq * a2y * a3y * b3y +
        (2 * a3x * b3y + 2 * a3y * b3x) * a2ySq * a2x -
        2 * a2yCu * a3x * b3x +
        (-6 * b0y * b3y - 6 * b1y * b2y) * a3y * a3xSq +
        (6 * b0y * b3x + 6 * b1y * b2x + 6 * b0x * b3y + 6 * b1x * b2y) * a3ySq * a3x +
        (-6 * b0x * b3x - 6 * b1x * b2x) * a3yCu) *
        a0x +
      (-3 * a3xCu * b3y + 3 * a3xSq * a3y * b3x) * a0ySq +
      (((3 * a3ySq * b3x - 6 * a3x * a3y * b3y) * a2x + (4 * a3xSq * b3y - a3x * a3y * b3x) * a2y) *
        a1x +
        ((a3x * a3y * b3x + 2 * a3xSq * b3y) * a2x - 3 * a2y * a3xSq * b3x) * a1y +
        2 * a2xCu * a3y * b3y +
        (-2 * a3y * b3x - 2 * a3x * b3y) * a2y * a2xSq +
        2 * a2x * a2ySq * a3x * b3x +
        (6 * b0y * b3y + 6 * b1y * b2y) * a3xCu +
        (-6 * b0x * b3y - 6 * b1x * b2y - 6 * b1y * b2x - 6 * b0y * b3x) * a3y * a3xSq +
        (6 * b0x * b3x + 6 * b1x * b2x) * a3ySq * a3x) *
        a0y -
      a1xCu * a3ySq * b3y +
      ((2 * a3x * a3y * b3y + a3ySq * b3x) * a1y - a2ySq * a3x * b3y + a2x * a2y * a3y * b3y) *
        a1xSq +
      ((-a3xSq * b3y - 2 * a3x * a3y * b3x) * a1ySq +
        (-a2xSq * a3y * b3y + (-a3y * b3x + a3x * b3y) * a2y * a2x + a2ySq * a3x * b3x) * a1y +
        ((6 * b0y * b3y + 6 * b1y * b2y) * a3y * a3x +
          (-3 * b1y * b2x - 3 * b1x * b2y - 3 * b0y * b3x - 3 * b0x * b3y) * a3ySq) *
          a2x +
        ((-4 * b0y * b3y - 4 * b1y * b2y) * a3xSq +
          (b0x * b3y + b1y * b2x + b1x * b2y + b0y * b3x) * a3y * a3x +
          (2 * b1x * b2x + 2 * b0x * b3x) * a3ySq) *
          a2y) *
        a1x +
      a1yCu * a3xSq * b3x +
      (-a2x * a2y * a3x * b3x + a2xSq * a3y * b3x) * a1ySq +
      (((-2 * b0y * b3y - 2 * b1y * b2y) * a3xSq +
        (-b1x * b2y - b0x * b3y - b0y * b3x - b1y * b2x) * a3y * a3x +
        (4 * b1x * b2x + 4 * b0x * b3x) * a3ySq) *
        a2x +
        ((3 * b1y * b2x + 3 * b1x * b2y + 3 * b0x * b3y + 3 * b0y * b3x) * a3xSq +
          (-6 * b0x * b3x - 6 * b1x * b2x) * a3y * a3x) *
          a2y) *
        a1y +
      a2xCu * a3y * (-2 * b0y * b3y - 2 * b1y * b2y) +
      ((2 * b0y * b3y + 2 * b1y * b2y) * a3x +
        (2 * b0x * b3y + 2 * b1x * b2y + 2 * b1y * b2x + 2 * b0y * b3x) * a3y) *
        a2y *
        a2xSq +
      ((-2 * b0x * b3y - 2 * b1y * b2x - 2 * b1x * b2y - 2 * b0y * b3x) * a3x +
        (-2 * b1x * b2x - 2 * b0x * b3x) * a3y) *
        a2ySq *
        a2x +
      (2 * b1x * b2x + 2 * b0x * b3x) * a3x * a2yCu +
      (-3 * b0ySq * b3y - b1y * b1y * b1y - 6 * b0y * b1y * b2y) * a3xCu +
      ((6 * b0y * b3y + 6 * b1y * b2y) * b0x +
        3 * b0ySq * b3x +
        (6 * b1y * b2x + 6 * b1x * b2y) * b0y +
        3 * b1x * b1ySq) *
        a3y *
        a3xSq +
      (-3 * b0xSq * b3y +
        (-6 * b1x * b2y - 6 * b1y * b2x - 6 * b0y * b3x) * b0x -
        6 * b0y * b1x * b2x -
        3 * b1xSq * b1y) *
        a3ySq *
        a3x +
      (3 * b0xSq * b3x + b1x * b1x * b1x + 6 * b0x * b1x * b2x) * a3yCu,
    (3 * b2x * a3yCu - 3 * a3x * a3ySq * b2y) * a0xSq +
      ((-6 * a3x * b2x * a3ySq + 6 * a3xSq * a3y * b2y) * a0y +
        (3 * a2x * a3ySq * b2y + (-2 * b2x * a3ySq - a3x * a3y * b2y) * a2y) * a1x +
        ((-4 * b2x * a3ySq + a3x * a3y * b2y) * a2x +
          (6 * a3x * b2x * a3y - 3 * a3xSq * b2y) * a2y) *
          a1y -
        2 * a2xSq * a2y * a3y * b2y +
        (2 * a3x * b2y + 2 * b2x * a3y) * a2ySq * a2x -
        2 * a2yCu * a3x * b2x +
        (-6 * b0y * b2y - 3 * b1ySq) * a3y * a3xSq +
        (6 * b1x * b1y + 6 * b0x * b2y + 6 * b0y * b2x) * a3ySq * a3x +
        (-3 * b1xSq - 6 * b0x * b2x) * a3yCu) *
        a0x +
      (-3 * a3xCu * b2y + 3 * a3xSq * b2x * a3y) * a0ySq +
      (((-6 * a3x * a3y * b2y + 3 * b2x * a3ySq) * a2x +
        (4 * a3xSq * b2y - a3x * b2x * a3y) * a2y) *
        a1x +
        ((a3x * b2x * a3y + 2 * a3xSq * b2y) * a2x - 3 * a2y * a3xSq * b2x) * a1y +
        2 * a2xCu * a3y * b2y +
        (-2 * b2x * a3y - 2 * a3x * b2y) * a2y * a2xSq +
        2 * a2x * a2ySq * a3x * b2x +
        (6 * b0y * b2y + 3 * b1ySq) * a3xCu +
        (-6 * b1x * b1y - 6 * b0y * b2x - 6 * b0x * b2y) * a3y * a3xSq +
        (3 * b1xSq + 6 * b0x * b2x) * a3ySq * a3x) *
        a0y -
      a1xCu * a3ySq * b2y +
      ((2 * a3x * a3y * b2y + b2x * a3ySq) * a1y - a2ySq * a3x * b2y + a2x * a2y * a3y * b2y) *
        a1xSq +
      ((-2 * a3x * b2x * a3y - a3xSq * b2y) * a1ySq +
        (-a2xSq * a3y * b2y + (a3x * b2y - b2x * a3y) * a2y * a2x + a2ySq * a3x * b2x) * a1y +
        ((6 * b0y * b2y + 3 * b1ySq) * a3y * a3x +
          (-3 * b1x * b1y - 3 * b0y * b2x - 3 * b0x * b2y) * a3ySq) *
          a2x +
        ((-4 * b0y * b2y - 2 * b1ySq) * a3xSq +
          (b0x * b2y + b0y * b2x + b1x * b1y) * a3y * a3x +
          (2 * b0x * b2x + b1xSq) * a3ySq) *
          a2y) *
        a1x +
      a1yCu * a3xSq * b2x +
      (-a2x * a2y * a3x * b2x + a2xSq * b2x * a3y) * a1ySq +
      (((-2 * b0y * b2y - b1ySq) * a3xSq +
        (-b0x * b2y - b1x * b1y - b0y * b2x) * a3y * a3x +
        (2 * b1xSq + 4 * b0x * b2x) * a3ySq) *
        a2x +
        ((3 * b1x * b1y + 3 * b0y * b2x + 3 * b0x * b2y) * a3xSq +
          (-3 * b1xSq - 6 * b0x * b2x) * a3y * a3x) *
          a2y) *
        a1y +
      a2xCu * a3y * (-2 * b0y * b2y - b1ySq) +
      ((2 * b0y * b2y + b1ySq) * a3x + (2 * b0x * b2y + 2 * b1x * b1y + 2 * b0y * b2x) * a3y) *
        a2y *
        a2xSq +
      ((-2 * b1x * b1y - 2 * b0y * b2x - 2 * b0x * b2y) * a3x + (-b1xSq - 2 * b0x * b2x) * a3y) *
        a2ySq *
        a2x +
      (2 * b0x * b2x + b1xSq) * a3x * a2yCu +
      (-3 * b0y * b1ySq - 3 * b0ySq * b2y) * a3xCu +
      ((6 * b0y * b2y + 3 * b1ySq) * b0x + 6 * b0y * b1x * b1y + 3 * b0ySq * b2x) * a3y * a3xSq +
      (-3 * b0xSq * b2y + (-6 * b1x * b1y - 6 * b0y * b2x) * b0x - 3 * b0y * b1xSq) * a3ySq * a3x +
      (3 * b0xSq * b2x + 3 * b0x * b1xSq) * a3yCu,
    (-3 * a3x * b1y * a3ySq + 3 * b1x * a3yCu) * a0xSq +
      ((-6 * b1x * a3x * a3ySq + 6 * a3xSq * b1y * a3y) * a0y +
        (3 * a2x * b1y * a3ySq + (-2 * b1x * a3ySq - a3x * b1y * a3y) * a2y) * a1x +
        ((a3x * b1y * a3y - 4 * b1x * a3ySq) * a2x +
          (-3 * a3xSq * b1y + 6 * b1x * a3x * a3y) * a2y) *
          a1y -
        2 * a2xSq * a2y * b1y * a3y +
        (2 * a3x * b1y + 2 * b1x * a3y) * a2ySq * a2x -
        2 * b1x * a2yCu * a3x -
        6 * b0y * a3xSq * b1y * a3y +
        (6 * b0x * b1y + 6 * b0y * b1x) * a3ySq * a3x -
        6 * b0x * b1x * a3yCu) *
        a0x +
      (-3 * a3xCu * b1y + 3 * b1x * a3xSq * a3y) * a0ySq +
      (((3 * b1x * a3ySq - 6 * a3x * b1y * a3y) * a2x + (4 * a3xSq * b1y - b1x * a3x * a3y) * a2y) *
        a1x +
        ((2 * a3xSq * b1y + b1x * a3x * a3y) * a2x - 3 * b1x * a2y * a3xSq) * a1y +
        2 * a2xCu * a3y * b1y +
        (-2 * b1x * a3y - 2 * a3x * b1y) * a2y * a2xSq +
        2 * a2x * b1x * a2ySq * a3x +
        6 * a3xCu * b0y * b1y +
        (-6 * b0x * b1y - 6 * b0y * b1x) * a3y * a3xSq +
        6 * b0x * b1x * a3x * a3ySq) *
        a0y -
      a1xCu * b1y * a3ySq +
      ((b1x * a3ySq + 2 * a3x * b1y * a3y) * a1y + a2x * a2y * b1y * a3y - a2ySq * a3x * b1y) *
        a1xSq +
      ((-2 * b1x * a3x * a3y - a3xSq * b1y) * a1ySq +
        (-a2xSq * b1y * a3y + (a3x * b1y - b1x * a3y) * a2y * a2x + b1x * a2ySq * a3x) * a1y +
        (6 * b0y * a3x * b1y * a3y + (-3 * b0y * b1x - 3 * b0x * b1y) * a3ySq) * a2x +
        (-4 * b0y * a3xSq * b1y + (b0x * b1y + b0y * b1x) * a3y * a3x + 2 * b0x * b1x * a3ySq) *
          a2y) *
        a1x +
      a1yCu * b1x * a3xSq +
      (a2xSq * b1x * a3y - a2x * b1x * a2y * a3x) * a1ySq +
      ((-2 * b0y * a3xSq * b1y + (-b0x * b1y - b0y * b1x) * a3y * a3x + 4 * b0x * b1x * a3ySq) *
        a2x +
        ((3 * b0x * b1y + 3 * b0y * b1x) * a3xSq - 6 * b0x * b1x * a3x * a3y) * a2y) *
        a1y -
      2 * a2xCu * b0y * b1y * a3y +
      (2 * b0y * a3x * b1y + (2 * b0x * b1y + 2 * b0y * b1x) * a3y) * a2y * a2xSq +
      ((-2 * b0y * b1x - 2 * b0x * b1y) * a3x - 2 * b0x * b1x * a3y) * a2ySq * a2x +
      2 * b0x * b1x * a2yCu * a3x -
      3 * b0ySq * a3xCu * b1y +
      (6 * b0x * b0y * b1y + 3 * b0ySq * b1x) * a3y * a3xSq +
      (-3 * b0xSq * b1y - 6 * b0x * b0y * b1x) * a3ySq * a3x +
      3 * b0xSq * b1x * a3yCu,
    -(a0x * a0x * a0x) * a3yCu +
      (3 * a0y * a3x * a3ySq +
        a1x * a2y * a3ySq +
        (2 * a2x * a3ySq - 3 * a2y * a3x * a3y) * a1y -
        a2x * a2ySq * a3y +
        3 * b0x * a3yCu +
        a2yCu * a3x -
        3 * b0y * a3x * a3ySq) *
        a0xSq +
      (-3 * a0ySq * a3xSq * a3y +
        ((a2y * a3x * a3y - 3 * a2x * a3ySq) * a1x +
          (-a2x * a3x * a3y + 3 * a2y * a3xSq) * a1y -
          6 * b0x * a3x * a3ySq +
          2 * a2xSq * a2y * a3y -
          2 * a2x * a2ySq * a3x +
          6 * b0y * a3xSq * a3y) *
          a0y -
        a1xSq * a1y * a3ySq +
        (2 * a1ySq * a3x * a3y +
          (a2x * a2y * a3y - a2ySq * a3x) * a1y +
          3 * a2x * b0y * a3ySq +
          (-b0y * a3x * a3y - 2 * b0x * a3ySq) * a2y) *
          a1x -
        a1yCu * a3xSq +
        (-a2xSq * a3y + a2x * a2y * a3x) * a1ySq +
        ((b0y * a3x * a3y - 4 * b0x * a3ySq) * a2x +
          (6 * b0x * a3x * a3y - 3 * b0y * a3xSq) * a2y) *
          a1y -
        2 * a2xSq * b0y * a2y * a3y +
        (2 * b0x * a3y + 2 * b0y * a3x) * a2ySq * a2x -
        3 * b0ySq * a3xSq * a3y +
        6 * b0x * b0y * a3x * a3ySq -
        3 * b0xSq * a3yCu -
        2 * b0x * a2yCu * a3x) *
        a0x +
      a0y * a0y * a0y * a3xCu +
      ((-2 * a2y * a3xSq + 3 * a2x * a3x * a3y) * a1x -
        3 * a3xCu * b0y +
        a2xSq * a2y * a3x -
        a2xCu * a3y +
        3 * b0x * a3xSq * a3y -
        a1y * a2x * a3xSq) *
        a0ySq +
      (a1xCu * a3ySq +
        (a2ySq * a3x - a2x * a2y * a3y - 2 * a1y * a3x * a3y) * a1xSq +
        (a1ySq * a3xSq +
          (-a2x * a2y * a3x + a2xSq * a3y) * a1y +
          (3 * b0x * a3ySq - 6 * b0y * a3x * a3y) * a2x +
          (4 * b0y * a3xSq - b0x * a3x * a3y) * a2y) *
          a1x +
        ((b0x * a3x * a3y + 2 * b0y * a3xSq) * a2x - 3 * b0x * a2y * a3xSq) * a1y +
        2 * a2xCu * a3y * b0y +
        (-2 * b0y * a3x - 2 * b0x * a3y) * a2y * a2xSq +
        2 * b0x * a2x * a2ySq * a3x -
        6 * b0x * a3xSq * a3y * b0y +
        3 * a3xCu * b0ySq +
        3 * b0xSq * a3x * a3ySq) *
        a0y -
      a1xCu * b0y * a3ySq +
      ((2 * b0y * a3x * a3y + b0x * a3ySq) * a1y - b0y * a2ySq * a3x + a2x * b0y * a2y * a3y) *
        a1xSq +
      ((-2 * b0x * a3x * a3y - b0y * a3xSq) * a1ySq +
        (-a2xSq * b0y * a3y + (-b0x * a3y + b0y * a3x) * a2y * a2x + b0x * a2ySq * a3x) * a1y +
        (3 * b0ySq * a3x * a3y - 3 * b0x * b0y * a3ySq) * a2x +
        (b0x * b0y * a3x * a3y - 2 * b0ySq * a3xSq + b0xSq * a3ySq) * a2y) *
        a1x +
      b0x * a1yCu * a3xSq +
      (b0x * a2xSq * a3y - b0x * a2x * a2y * a3x) * a1ySq +
      ((-b0ySq * a3xSq - b0x * b0y * a3x * a3y + 2 * b0xSq * a3ySq) * a2x +
        (-3 * b0xSq * a3x * a3y + 3 * b0x * b0y * a3xSq) * a2y) *
        a1y -
      a2xCu * b0ySq * a3y +
      (2 * b0x * a3y * b0y + b0ySq * a3x) * a2y * a2xSq +
      (-b0xSq * a3y - 2 * b0x * b0y * a3x) * a2ySq * a2x +
      b0x * b0x * b0x * a3yCu +
      b0xSq * a2yCu * a3x -
      3 * b0xSq * b0y * a3x * a3ySq -
      b0y * b0y * b0y * a3xCu +
      3 * b0x * b0ySq * a3xSq * a3y,
  ];
}

/** Sorts the roots and removes the ones within TINY_EPS of the previous one. */
function removeMultipleRoots(roots: number[]): void {
  roots.sort(function (a, b) {
    return a - b;
  });
  for (let i = 1; i < roots.length;) {
    if (Math.abs((roots[i] as number) - (roots[i - 1] as number)) < TINY_EPS) roots.splice(i, 1);
    else i++;
  }
}

/** Cube root that keeps the sign. */
function signedCubeRoot(value: number): number {
  const root = Math.pow(Math.abs(value), 1 / 3);
  return value < 0 ? -root : root;
}

/**
 * A polynomial with coefficients stored lowest degree first. The
 * constructor takes them highest degree first and reverses the given
 * array in place. The "precise" methods expect big.js coefficients.
 */
export class Polynomial {
  static TOLERANCE = 1e-6;
  static ACCURACY = 10;

  coefs: Coefficient[];
  _scaled = false;
  jt: JenkinsTraub;

  constructor(coefficients?: Coefficient[]) {
    this.coefs = coefficients ? coefficients.reverse() : [];
    this._scaled = false;
    this.jt = new JenkinsTraub();
  }

  /**
   * Divides the coefficients by the leading one. The old code then
   * divides by powers of the largest root bound through a variable that
   * doesn't exist, which throws a ReferenceError; the precise variant
   * swallows it. Nothing in the engine calls this.
   */
  scale(precise?: boolean): void {
    const degree = this.getDegree();
    const leading = this.coefs[degree] as Coefficient;
    let i = degree;
    if (this._scaled) return;
    this._scaled = true;
    if (precise) {
      while (--i >= 0) this.coefs[i] = (this.coefs[i] as Big).div(leading as Big);
    } else {
      while (--i >= 0) this.coefs[i] = (this.coefs[i] as number) / (leading as number);
      if (degree >= 1) throw new ReferenceError("n is not defined");
    }
  }

  /**
   * Drops leading coefficients that are zero (precise) or within
   * TOLERANCE of zero.
   */
  simplify(precise?: boolean): void {
    if (precise) {
      for (let i = this.getDegree(); i >= 0 && (this.coefs[i] as Big).abs().lte(0); i--) {
        this.coefs.pop();
      }
    } else {
      for (
        let i = this.getDegree();
        i >= 0 && Math.abs(this.coefs[i] as number) <= Polynomial.TOLERANCE;
        i--
      ) {
        this.coefs.pop();
      }
    }
  }

  getDegree(): number {
    return this.coefs.length - 1;
  }

  /**
   * The real roots, after simplify(): closed forms up to degree 2,
   * Jenkins-Traub above. Null when every coefficient was dropped.
   */
  getRoots(precise?: boolean): number[] | null {
    this.simplify(precise);
    let roots: number[] | null = null;
    switch (this.getDegree()) {
      case -1:
        break;
      case 0:
        roots = [];
        break;
      case 1:
        roots = precise ? this.getLinearRootPrecise() : this.getLinearRoot();
        break;
      case 2:
        roots = precise ? this.getQuadraticRootsPrecise() : this.getQuadraticRoots();
        break;
      default: {
        roots = [];
        const real: number[] = [];
        const imaginary: number[] = [];
        this.jt.rpSolve(this, real, imaginary);
        for (let i = 0; i < real.length; i++) {
          if (0 === imaginary[i]) roots.push(real[i] as number);
        }
      }
    }
    return roots;
  }

  getLinearRoot(coefficients?: number[]): number[] {
    const roots: number[] = [];
    const c = coefficients || (this.coefs as number[]);
    const slope = c[1];
    if (slope) roots.push(-(c[0] as number) / slope);
    return roots;
  }

  getLinearRootPrecise(): number[] {
    const roots: number[] = [];
    const c = this.coefs as Big[];
    const slope = c[1];
    if (slope) {
      try {
        roots.push(Number((c[0] as Big).times(-1).div(slope)));
      } catch {
        // Division by zero: no root.
      }
    }
    return roots;
  }

  getQuadraticRoots(coefficients?: number[]): number[] {
    const roots: number[] = [];
    const c = coefficients || (this.coefs as number[]);
    if (2 == this.getDegree()) {
      const a = c[2] as number;
      const b = (c[1] as number) / a;
      const discriminant = b * b - 4 * ((c[0] as number) / a);
      if (discriminant > 0) {
        const root = Math.sqrt(discriminant);
        roots.push(0.5 * (-b + root));
        roots.push(0.5 * (-b - root));
      } else if (0 == discriminant) {
        roots.push(0.5 * -b);
      }
    }
    return roots;
  }

  getQuadraticRootsPrecise(): number[] {
    const roots: number[] = [];
    const c = this.coefs as Big[];
    if (2 == this.getDegree()) {
      try {
        const a = c[2] as Big;
        const b = (c[1] as Big).div(a);
        const constant = (c[0] as Big).div(a);
        const discriminant = b.times(b).minus(constant.times(4));
        if (discriminant.gt(0)) {
          const root = discriminant.sqrt();
          roots.push(Number(root.minus(b).div(2)));
          roots.push(Number(root.times(-1).minus(b).div(2)));
        } else if (discriminant.eq(0)) {
          roots.push(Number(b.div(-2)));
        }
      } catch {
        // Division by zero: the roots found so far.
      }
    }
    return roots;
  }

  /** Cardano's formula (used by getQuarticRoots). */
  getCubicRootsAnal(): number[] {
    const c = this.coefs as number[];
    const a = c[3] as number;
    const b = c[2] as number;
    const linear = c[1] as number;
    const p = (3 * a * linear - b * b) / (3 * a * a);
    const q =
      (2 * b * b * b - 9 * a * b * linear + 27 * a * a * (c[0] as number)) / (27 * a * a * a);
    let roots: number[];
    if (Math.abs(p) < SMALL_EPS) {
      roots = [signedCubeRoot(-q)];
    } else if (Math.abs(q) < SMALL_EPS) {
      roots = [0].concat(p < 0 ? [Math.sqrt(-p), -Math.sqrt(-p)] : []);
    } else {
      const discriminant = (q * q) / 4 + (p * p * p) / 27;
      if (Math.abs(discriminant) < SMALL_EPS) {
        roots = [(-1.5 * q) / p, (3 * q) / p];
      } else if (discriminant > 0) {
        const u = signedCubeRoot(-q / 2 - Math.sqrt(discriminant));
        roots = 0 === u ? [] : [u - p / (3 * u)];
      } else {
        const u = 2 * Math.sqrt(-p / 3);
        const angle = Math.acos((3 * q) / p / u) / 3;
        const third = (2 * Math.PI) / 3;
        roots = [u * Math.cos(angle), u * Math.cos(angle - third), u * Math.cos(angle - 2 * third)];
      }
    }
    for (let i = 0; i < roots.length; i++) roots[i] = (roots[i] as number) - b / (3 * a);
    return roots;
  }

  /**
   * Cardano's formula in big.js numbers. Nothing in the engine calls it.
   * Old quirks: a collapsed double root is returned as a bare number
   * (`roots = roots.pop()`), and when big.js throws before the result
   * list exists the result is undefined.
   */
  getCubicRootsAnalPrecise(): number[] | number | undefined {
    const c = this.coefs as Big[];
    const a = c[3] as Big;
    const b = c[2] as Big;
    const linear = c[1] as Big;
    const constant = c[0] as Big;
    let roots: number[] | number | undefined;
    try {
      const p = a.times(linear).times(3).minus(b.times(b)).div(a.times(a).times(3));
      const q = b
        .times(b)
        .times(b)
        .times(2)
        .minus(a.times(b).times(linear).times(9))
        .plus(a.times(a).times(constant).times(27))
        .div(a.times(a).times(a).times(27));
      roots = [];
      if (p.abs().lte(TINY_EPS)) {
        roots = [signedCubeRoot(Number(q.times(-1)))];
      } else if (q.abs().lte(TINY_EPS)) {
        roots = [0].concat(
          p.lte(0) ? [Number(p.times(-1).sqrt()), Number(p.times(-1).sqrt().times(-1))] : [],
        );
      } else {
        const discriminant = q.times(q).div(4).plus(p.times(p).times(p).div(27));
        if (discriminant.abs().lte(TINY_EPS)) {
          roots = [Number(q.div(p).times(-1.5)), Number(q.div(p).times(3))];
          if (roots[0] === roots[1]) roots = roots.pop();
        } else if (discriminant.gt(0)) {
          const u = signedCubeRoot(Number(q.div(2).times(-1).minus(discriminant.sqrt())));
          roots = [u - Number(p.div(3 * u))];
        } else {
          const u = Number(p.times(-1).div(3).sqrt().times(2));
          const angle = Number(Math.acos(Number(q.times(3).div(p).div(u))) / 3);
          const third = (2 * Math.PI) / 3;
          roots = [
            u * Math.cos(angle),
            u * Math.cos(angle - third),
            u * Math.cos(angle - 2 * third),
          ];
          if (roots[0] == roots[1]) {
            roots.shift();
            if (roots[0] == roots[1]) roots.pop();
          } else if (roots[1] == roots[2] || roots[0] == roots[2]) {
            roots.pop();
            if (roots[0] == roots[1]) roots.pop();
          }
        }
      }
      const offset = Number(b.div(a.times(3)));
      if (Array.isArray(roots)) {
        for (let i = 0; i < roots.length; i++) roots[i] = (roots[i] as number) - offset;
      }
    } catch {
      // big.js threw (division by zero, square root of a negative).
    }
    return roots;
  }

  /**
   * Real roots of a cubic in [0, 1]. Nothing in the engine calls it. The
   * precise variant tops up the closed-form roots with GMath's; the old
   * code passed the big.js coefficients to GMath unconverted, the port
   * converts them to doubles.
   */
  getCubicRoots(precise?: boolean): number[] {
    let roots: number[] = [];
    if (3 == this.getDegree()) {
      const coefficients = [this.coefs[3], this.coefs[2], this.coefs[1], this.coefs[0]].map(Number);
      if (precise) {
        const found = this.getCubicRootsAnalPrecise();
        if (found === undefined) throw new TypeError("Cannot read properties of undefined");
        roots = Array.isArray(found) ? found : [found];
        let inRange = 0;
        if (Array.isArray(found)) {
          for (let i = 0; i < roots.length; i++) {
            const root = roots[i] as number;
            if (root >= 0 && root <= 1) inRange++;
          }
        }
        if (inRange < 3) {
          const more: number[] = [];
          GMath.getCubicRoots(coefficients, 0, 1, more, true, Polynomial.TOLERANCE);
          for (let i = 0; i < more.length; i++) {
            let j = 0;
            while (
              j < roots.length &&
              !GMath.isEqualEps(more[i] as number, roots[j], Polynomial.TOLERANCE)
            ) {
              j++;
            }
            if (j === roots.length) {
              roots.push(more[i] as number);
              if (3 === roots.length) break;
            }
          }
        }
      } else {
        GMath.getCubicRoots(coefficients, 0, 1, roots, true, Polynomial.TOLERANCE);
      }
    }
    return roots;
  }

  /** Ferrari's method. Nothing in the engine calls it. */
  getQuarticRoots(): number[] {
    const roots: number[] = [];
    if (4 == this.getDegree()) {
      const c = this.coefs as number[];
      const leading = c[4] as number;
      const a = (c[3] as number) / leading;
      const b = (c[2] as number) / leading;
      const linear = (c[1] as number) / leading;
      const constant = (c[0] as number) / leading;
      const resolventRoot = new Polynomial([
        1,
        -b,
        a * linear - 4 * constant,
        -a * a * constant + 4 * b * constant - linear * linear,
      ]).getCubicRootsAnal()[0] as number;
      let discriminant = (a * a) / 4 - b + resolventRoot;
      if (Math.abs(discriminant) <= Polynomial.TOLERANCE) discriminant = 0;
      if (discriminant > 0) {
        const root = Math.sqrt(discriminant);
        const t1 = (3 * a * a) / 4 - root * root - 2 * b;
        const t2 = (4 * a * b - 8 * linear - a * a * a) / (4 * root);
        let plus = t1 + t2;
        let minus = t1 - t2;
        if (Math.abs(plus) <= Polynomial.TOLERANCE) plus = 0;
        if (Math.abs(minus) <= Polynomial.TOLERANCE) minus = 0;
        if (plus >= 0) {
          const s = Math.sqrt(plus);
          roots.push(-a / 4 + (root + s) / 2);
          roots.push(-a / 4 + (root - s) / 2);
        }
        if (minus >= 0) {
          const s = Math.sqrt(minus);
          roots.push(-a / 4 + (s - root) / 2);
          roots.push(-a / 4 - (s + root) / 2);
        }
      } else if (discriminant < 0) {
        // No real roots.
      } else {
        let t2 = resolventRoot * resolventRoot - 4 * constant;
        if (t2 >= -Polynomial.TOLERANCE) {
          if (t2 < 0) t2 = 0;
          const t1 = (3 * a * a) / 4 - 2 * b;
          if (t1 + (t2 = 2 * Math.sqrt(t2)) >= Polynomial.TOLERANCE) {
            const s = Math.sqrt(t1 + t2);
            roots.push(-a / 4 + s / 2);
            roots.push(-a / 4 - s / 2);
          }
          if (t1 - t2 >= Polynomial.TOLERANCE) {
            const s = Math.sqrt(t1 - t2);
            roots.push(-a / 4 + s / 2);
            roots.push(-a / 4 - s / 2);
          }
        }
      }
    }
    return roots;
  }

  /**
   * Real Jenkins-Traub roots in [min, max]; roots less than SMALL_EPS
   * outside are snapped to the end.
   */
  getRootsInInterval(min: number, max: number): number[] {
    const roots: number[] = [];
    const real: number[] = [];
    const imaginary: number[] = [];
    const eps = SMALL_EPS;
    this.jt.rpSolve(this, real, imaginary);
    for (let i = 0; i < real.length; i++) {
      if (0 === imaginary[i]) {
        let root = real[i] as number;
        if (root < min && root > min - eps) {
          root = min;
          roots.push(root);
        } else if (root > max && root < max + eps) {
          root = max;
          roots.push(root);
        } else if (root <= max && root >= min) {
          roots.push(root);
        }
      }
    }
    return roots;
  }

  /** Roots in [min, max] by bisection between the derivative's roots. */
  getRootsInIntervalBisection(min: number, max: number): number[] {
    const roots: number[] = [];
    let root: number;
    if (1 == this.getDegree()) {
      root = this.bisection(min, max);
      if (!isNaN(root)) roots.push(root);
    } else {
      const turns = this.getDerivative().getRootsInInterval(min, max);
      if (turns.length > 0) {
        root = this.bisection(min, turns[0] as number);
        if (!isNaN(root)) roots.push(root);
        for (let i = 0; i <= turns.length - 2; i++) {
          root = this.bisection(turns[i] as number, turns[i + 1] as number);
          if (!isNaN(root)) roots.push(root);
        }
        root = this.bisection(turns[turns.length - 1] as number, max);
        if (!isNaN(root)) roots.push(root);
      } else {
        root = this.bisection(min, max);
        if (!isNaN(root)) roots.push(root);
      }
    }
    return roots;
  }

  bisection(min: number, max: number): number {
    let minValue = this.eval(min);
    const maxValue = this.eval(max);
    let result = NaN;
    if (Math.abs(minValue) <= Polynomial.TOLERANCE) {
      result = min;
    } else if (Math.abs(maxValue) <= Polynomial.TOLERANCE) {
      result = max;
    } else if (minValue * maxValue <= 0) {
      const tmp1 = Math.log(max - min);
      const tmp2 = Math.LN10 * Polynomial.ACCURACY;
      const iterations = Math.ceil((tmp1 + tmp2) / Math.LN2);
      for (let i = 0; i < iterations; i++) {
        result = 0.5 * (min + max);
        const value = this.eval(result);
        if (Math.abs(value) <= Polynomial.TOLERANCE) break;
        if (value * minValue < 0) {
          max = result;
        } else {
          min = result;
          minValue = value;
        }
      }
    }
    return result;
  }

  eval(x: number): number {
    if (isNaN(x)) throw new Error("Polynomial.eval: parameter must be a number");
    let result = 0;
    for (let i = this.coefs.length - 1; i >= 0; i--)
      result = result * x + (this.coefs[i] as number);
    return result;
  }

  getDerivative(): Polynomial {
    const derivative = new Polynomial();
    for (let i = 1; i < this.coefs.length; i++)
      derivative.coefs.push(i * (this.coefs[i] as number));
    return derivative;
  }
}

/** a and b of quadSD; newest() writes the new u and v into the same object. */
interface QuadFactor {
  a: number;
  b: number;
}

/** The scalars calcSC computes for nextK and newest. */
interface ShiftScalars {
  a1: number;
  a3: number;
  a7: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
}

/** Smaller and larger root of a quadratic, real and imaginary parts. */
interface QuadRoots {
  sr: number;
  si: number;
  lr: number;
  li: number;
}

/**
 * The zeros a shift stage found: NZ of them (1 or 2), small and large.
 * realIT also stores its last iterate in `a` (where the C original
 * passes it back through the shift variable).
 */
interface StageResult {
  NZ: number;
  szr: number;
  szi: number;
  lzr: number;
  lzi: number;
  a?: number;
}

const DBL_EPSILON = 2220446049250313e-31;

/**
 * Jenkins-Traub real polynomial root finder, a JavaScript port of
 * rpoly_ak1. Arrays are indexed from the highest degree down; the
 * argument order and object sharing follow the old code exactly.
 */
export class JenkinsTraub {
  static RADFAC = 0.017453292519943295;

  /** Divides p by x^2 + u*x + v; quotient into q, remainder into result. */
  quadSD(
    nn: number,
    u: number,
    v: number,
    p: ArrayLike<number>,
    q: Float64Array,
    result: QuadFactor,
  ): void {
    q[0] = result.b = p[0] as number;
    q[1] = result.a = -u * result.b + (p[1] as number);
    for (let i = 2; i < nn; i++) {
      q[i] = -(u * result.a + v * result.b) + (p[i] as number);
      result.b = result.a;
      result.a = q[i] as number;
    }
  }

  /** Returns 1, 2 or 3: how the next K polynomial is computed. */
  calcSC(
    eta: number,
    n: number,
    a: number,
    b: number,
    scalars: ShiftScalars,
    K: Float64Array,
    u: number,
    v: number,
    qk: Float64Array,
  ): number {
    const cd: QuadFactor = { a: 0, b: 0 };
    let type = 3;
    this.quadSD(n, u, v, K, qk, cd);
    scalars.c = cd.a;
    scalars.d = cd.b;
    if (!(
      Math.abs(scalars.c) <= 100 * eta * Math.abs(K[n - 1] as number) &&
      Math.abs(scalars.d) <= 100 * eta * Math.abs(K[n - 2] as number)
    )) {
      scalars.h = v * b;
      if (Math.abs(scalars.d) >= Math.abs(scalars.c)) {
        type = 2;
        scalars.e = a / scalars.d;
        scalars.f = scalars.c / scalars.d;
        scalars.g = u * b;
        scalars.a3 = scalars.e * (scalars.g + a) + scalars.h * (b / scalars.d);
        scalars.a1 = -a + scalars.f * b;
        scalars.a7 = scalars.h + (scalars.f + u) * a;
      } else {
        type = 1;
        scalars.e = a / scalars.c;
        scalars.f = scalars.d / scalars.c;
        scalars.g = scalars.e * u;
        scalars.a3 = scalars.e * a + (scalars.g + scalars.h / scalars.c) * b;
        scalars.a1 = -a * (scalars.d / scalars.c) + b;
        scalars.a7 = scalars.g * scalars.d + scalars.h * scalars.f + a;
      }
    }
    return type;
  }

  nextK(
    eta: number,
    n: number,
    type: number,
    a: number,
    b: number,
    scalars: ShiftScalars,
    K: Float64Array,
    qk: Float64Array,
    qp: Float64Array,
  ): void {
    if (3 != type) {
      const temp = 1 == type ? b : a;
      if (Math.abs(scalars.a1) > 10 * eta * Math.abs(temp)) {
        scalars.a7 /= scalars.a1;
        scalars.a3 /= scalars.a1;
        K[0] = qp[0] as number;
        K[1] = -(qp[0] as number) * scalars.a7 + (qp[1] as number);
        for (let i = 2; i < n; i++) {
          K[i] =
            -(qp[i - 1] as number) * scalars.a7 +
            (qk[i - 2] as number) * scalars.a3 +
            (qp[i] as number);
        }
      } else {
        K[0] = 0;
        K[1] = -(qp[0] as number) * scalars.a7;
        for (let i = 2; i < n; i++) {
          K[i] = -(qp[i - 1] as number) * scalars.a7 + (qk[i - 2] as number) * scalars.a3;
        }
      }
    } else {
      K[1] = K[0] = 0;
      for (let i = 2; i < n; i++) K[i] = qk[i - 2] as number;
    }
  }

  /** New estimates of the quadratic factor's u and v, into result.a/b. */
  newest(
    type: number,
    result: QuadFactor,
    a: number,
    a1: number,
    a3: number,
    a7: number,
    b: number,
    c: number,
    d: number,
    f: number,
    g: number,
    h: number,
    u: number,
    v: number,
    K: Float64Array,
    n: number,
    p: ArrayLike<number>,
  ): void {
    result.b = result.a = 0;
    if (3 != type) {
      let a4: number;
      let a5: number;
      if (2 != type) {
        a4 = a + u * b + h * f;
        a5 = c + (u + v * f) * d;
      } else {
        a4 = (a + g) * f + h;
        a5 = (f + u) * c + v * d;
      }
      const b1 = -(K[n - 1] as number) / (p[n] as number);
      const c1 = b1 * a7;
      const c2 = b1 * b1 * a3;
      const b2 = -((K[n - 2] as number) + b1 * (p[n - 1] as number)) / (p[n] as number);
      const c3 = -(c1 + c2) + v * b2 * a1;
      const c4 = -c3 + a5 + b1 * a4;
      if (0 != c4) {
        result.a = -(u * (c2 + c1) + v * (b1 * a1 + b2 * a7)) / c4 + u;
        result.b = v * (1 + c3 / c4);
      }
    }
  }

  /** Roots of a*x^2 + b1*x + c. */
  quad(a: number, b1: number, c: number, roots: QuadRoots): void {
    let b: number;
    let d: number;
    let e: number;
    roots.sr = roots.si = roots.lr = roots.li = 0;
    if (0 != a) {
      if (0 != c) {
        b = b1 / 2;
        if (Math.abs(b) < Math.abs(c)) {
          e = c >= 0 ? a : -a;
          e = -e + b * (b / Math.abs(c));
          d = Math.sqrt(Math.abs(e)) * Math.sqrt(Math.abs(c));
        } else {
          e = (-a / b) * (c / b) + 1;
          d = Math.sqrt(Math.abs(e)) * Math.abs(b);
        }
        if (e >= 0) {
          d = b >= 0 ? -d : d;
          roots.lr = (-b + d) / a;
          roots.sr = 0 != roots.lr ? c / roots.lr / a : roots.sr;
        } else {
          roots.lr = roots.sr = -b / a;
          roots.si = Math.abs(d / a);
          roots.li = -roots.si;
        }
      } else {
        roots.lr = -b1 / a;
      }
    } else {
      roots.sr = 0 != b1 ? -c / b1 : roots.sr;
    }
  }

  /** Variable-shift iteration for a quadratic factor. */
  quadIT(
    eta: number,
    n: number,
    result: StageResult,
    uu: number,
    vv: number,
    qp: Float64Array,
    nn: number,
    factor: QuadFactor,
    p: ArrayLike<number>,
    qk: Float64Array,
    scalars: ShiftScalars,
    K: Float64Array,
  ): void {
    let mp: number;
    let omp = 0;
    let ee: number;
    let relstp = 0;
    let t: number;
    let u: number;
    let ui: number;
    let v: number;
    let vi: number;
    let zm: number;
    let i: number;
    let type: number;
    const roots: QuadRoots = { sr: 0, si: 0, lr: 0, li: 0 };
    let j = 0;
    let tried = 0;
    result.NZ = 0;
    u = uu;
    v = vv;
    do {
      roots.li = roots.lr = roots.si = roots.sr = 0;
      this.quad(1, u, v, roots);
      result.szr = roots.sr;
      result.szi = roots.si;
      result.lzr = roots.lr;
      result.lzi = roots.li;
      // Return if the roots of the quadratic are real and not close to
      // multiple or nearly equal and of opposite sign.
      if (Math.abs(Math.abs(result.szr) - Math.abs(result.lzr)) > 0.01 * Math.abs(result.lzr)) {
        break;
      }
      this.quadSD(nn, u, v, p, qp, factor);
      mp = Math.abs(-result.szr * factor.b + factor.a) + Math.abs(result.szi * factor.b);
      zm = Math.sqrt(Math.abs(v));
      ee = 2 * Math.abs(qp[0] as number);
      t = -result.szr * factor.b;
      for (i = 1; i < n; i++) ee = ee * zm + Math.abs(qp[i] as number);
      ee = ee * zm + Math.abs(t + factor.a);
      ee =
        (9 * ee + 2 * Math.abs(t) - 7 * (Math.abs(factor.a + t) + zm * Math.abs(factor.b))) * eta;
      if (mp <= 20 * ee) {
        result.NZ = 2;
        break;
      }
      if (++j > 20) break;
      if (j >= 2 && relstp <= 0.01 && mp >= omp && !tried) {
        relstp = relstp < eta ? Math.sqrt(eta) : Math.sqrt(relstp);
        u -= u * relstp;
        v += v * relstp;
        this.quadSD(nn, u, v, p, qp, factor);
        for (i = 0; i < 5; i++) {
          type = this.calcSC(eta, n, factor.a, factor.b, scalars, K, u, v, qk);
          this.nextK(eta, n, type, factor.a, factor.b, scalars, K, qk, qp);
        }
        tried = 1;
        j = 0;
      }
      omp = mp;
      type = this.calcSC(eta, n, factor.a, factor.b, scalars, K, u, v, qk);
      this.nextK(eta, n, type, factor.a, factor.b, scalars, K, qk, qp);
      type = this.calcSC(eta, n, factor.a, factor.b, scalars, K, u, v, qk);
      this.newest(
        type,
        factor,
        factor.a,
        scalars.a1,
        scalars.a3,
        scalars.a7,
        factor.b,
        scalars.c,
        scalars.d,
        scalars.f,
        scalars.g,
        scalars.h,
        u,
        v,
        K,
        n,
        p,
      );
      ui = factor.a;
      vi = factor.b;
      if (0 != vi) {
        relstp = Math.abs((-v + vi) / vi);
        u = ui;
        v = vi;
      }
    } while (0 != vi);
  }

  /** Variable-shift iteration for a real zero, starting at shift.a. */
  realIT(
    eta: number,
    result: StageResult,
    shift: QuadFactor,
    n: number,
    p: ArrayLike<number>,
    nn: number,
    qp: Float64Array,
    K: Float64Array,
    qk: Float64Array,
  ): number {
    let ee: number;
    let kv: number;
    let mp: number;
    let ms: number;
    let omp = 0;
    let pv: number;
    let s: number;
    let t = 0;
    let i: number;
    let iFlag: number;
    let j: number;
    const nm1 = n - 1;
    result.NZ = j = iFlag = 0;
    s = shift.a;
    for (;;) {
      qp[0] = pv = p[0] as number;
      for (i = 1; i < nn; i++) qp[i] = pv = pv * s + (p[i] as number);
      mp = Math.abs(pv);
      ms = Math.abs(s);
      ee = 0.5 * Math.abs(qp[0] as number);
      for (i = 1; i < nn; i++) ee = ee * ms + Math.abs(qp[i] as number);
      if (mp <= 20 * eta * (2 * ee - mp)) {
        result.NZ = 1;
        result.szr = s;
        result.szi = 0;
        break;
      }
      if (++j > 10) break;
      if (j >= 2 && Math.abs(t) <= 0.001 * Math.abs(-t + s) && mp > omp) {
        // A cluster of zeros near the real axis: tell the caller to try
        // a quadratic iteration from s.
        iFlag = 1;
        result.a = s;
        break;
      }
      omp = mp;
      qk[0] = kv = K[0] as number;
      for (i = 1; i < n; i++) qk[i] = kv = kv * s + (K[i] as number);
      if (Math.abs(kv) > 10 * Math.abs(K[nm1] as number) * eta) {
        t = -pv / kv;
        K[0] = qp[0] as number;
        for (i = 1; i < n; i++) K[i] = t * (qk[i - 1] as number) + (qp[i] as number);
      } else {
        K[0] = 0;
        for (i = 1; i < n; i++) K[i] = qk[i - 1] as number;
      }
      kv = K[0] as number;
      for (i = 1; i < n; i++) kv = kv * s + (K[i] as number);
      t = Math.abs(kv) > 10 * Math.abs(K[nm1] as number) * eta ? -pv / kv : 0;
      s += t;
    }
    return iFlag;
  }

  /** Fixed-shift stage with l2 iterations; zeros it finds go into result. */
  fxshfr(
    eta: number,
    size: number,
    l2: number,
    sr: number,
    bnd: number,
    K: Float64Array,
    n: number,
    p: Float64Array,
    nn: number,
    qp: Float64Array,
    result: StageResult,
  ): void {
    let a: number;
    let b: number;
    let betas: number;
    let betav: number;
    let oss: number;
    let ots = 0;
    let otv = 0;
    let ovv: number;
    let s: number;
    let ss: number;
    let ts: number;
    let tss: number;
    let tv: number;
    let tvv: number;
    let ui: number;
    let v: number;
    let vi: number;
    let vv: number;
    let fflag: number;
    let i: number;
    let iFlag: number;
    let j: number;
    let spass: number;
    let stry: number;
    let type: number;
    let vpass: number;
    let vtry: number;
    // quadSD's a and b, and newest's u and v, share this object.
    const factor: QuadFactor = { a: 0, b: 0 };
    const scalars: ShiftScalars = { a1: 0, a3: 0, a7: 0, c: 0, d: 0, e: 0, f: 0, g: 0, h: 0 };
    const qk = new Float64Array(size);
    const svk = new Float64Array(size);
    result.NZ = 0;
    betav = betas = 0.25;
    const u = -2 * sr;
    oss = sr;
    ovv = v = bnd;
    this.quadSD(nn, u, v, p, qp, factor);
    a = factor.a;
    b = factor.b;
    type = this.calcSC(eta, n, a, b, scalars, K, u, v, qk);
    for (j = 0; j < l2; j++) {
      this.nextK(eta, n, type, a, b, scalars, K, qk, qp);
      type = this.calcSC(eta, n, a, b, scalars, K, u, v, qk);
      this.newest(
        type,
        factor,
        a,
        scalars.a1,
        scalars.a3,
        scalars.a7,
        b,
        scalars.c,
        scalars.d,
        scalars.f,
        scalars.g,
        scalars.h,
        u,
        v,
        K,
        n,
        p,
      );
      ui = factor.a;
      vv = vi = factor.b;
      ss = 0 != K[n - 1] ? -(p[n] as number) / (K[n - 1] as number) : 0;
      ts = tv = 1;
      if (0 != j && 3 != type) {
        tv = 0 != vv ? Math.abs((vv - ovv) / vv) : tv;
        tvv = tv < otv ? tv * otv : 1;
        vpass = tvv < betav ? 1 : 0;
        ts = 0 != ss ? Math.abs((ss - oss) / ss) : ts;
        tss = ts < ots ? ts * ots : 1;
        spass = tss < betas ? 1 : 0;
        if (spass || vpass) {
          for (i = 0; i < n; i++) svk[i] = K[i] as number;
          s = ss;
          stry = vtry = 0;
          fflag = 1;
          // A do/while, so `continue` re-checks the loop condition (the C
          // original loops unconditionally).
          do {
            iFlag = 1;
            if (!fflag || 0 != (fflag = 0) || !spass || (vpass && !(tss < tvv))) {
              // The old code also copied factor into a and b here, which the
              // quadSD call after this loop overwrites.
              this.quadIT(eta, n, result, ui, vi, qp, nn, factor, p, qk, scalars, K);
              if (result.NZ > 0) return;
              vtry = 1;
              betav *= 0.25;
              if (stry || !spass) iFlag = 0;
              else for (i = 0; i < n; i++) K[i] = svk[i] as number;
            }
            if (0 != iFlag) {
              factor.a = s;
              iFlag = this.realIT(eta, result, factor, n, p, nn, qp, K, qk);
              s = factor.a;
              if (result.NZ > 0) return;
              stry = 1;
              betas *= 0.25;
              if (0 != iFlag) {
                ui = -(s + s);
                vi = s * s;
                continue;
              }
            }
            for (i = 0; i < n; i++) K[i] = svk[i] as number;
          } while (vpass && !vtry);
          this.quadSD(nn, u, v, p, qp, factor);
          a = factor.a;
          b = factor.b;
          type = this.calcSC(eta, n, a, b, scalars, K, u, v, qk);
        }
      }
      ovv = vv;
      oss = ss;
      otv = tv;
      ots = ts;
    }
  }

  /**
   * Finds the roots of `poly`: real parts into zeror, imaginary parts into
   * zeroi. Returns the degree, reduced by the roots it couldn't find.
   */
  rpSolve(poly: Polynomial, zeror: number[], zeroi: number[]): number {
    const p = new Float64Array(poly.coefs.length);
    let degree = poly.getDegree();
    let n = degree;
    const ln2 = Math.LN2;
    const size = n + 1;
    const K = new Float64Array(size);
    const pt = new Float64Array(size);
    const qp = new Float64Array(size);
    const temp = new Float64Array(size);
    const roots: QuadRoots = { sr: 0, si: 0, li: 0, lr: 0 };
    const stage: StageResult = { NZ: 0, szr: 0, szi: 0, lzr: 0, lzi: 0 };
    let index = 0;
    let i: number;
    let bnd: number;
    let df: number;
    let dx: number;
    let factor: number;
    let ff: number;
    let moduliMax: number;
    let moduliMin: number;
    let sc: number;
    let x: number;
    let xm: number;
    let aa: number;
    let bb: number;
    let cc: number;
    let sr: number;
    let t: number;
    let xxx: number;
    let jj: number;
    let l: number;
    let nm1: number;
    let nn: number;
    let zerok: number;
    for (i = 0; i <= degree; i++) p[i] = Number(poly.coefs[degree - i]);
    const smalno = Number.MIN_VALUE / DBL_EPSILON;
    // Rotation by 94 degrees for the shifts.
    const sinr = -0.06975647374412533;
    const cosr = 0.9975640502598242;
    let xx = Math.SQRT1_2;
    let yy = -xx;
    // Zeros at the origin.
    while (0 == p[n]) {
      zeror[index] = zeroi[index] = 0;
      n--;
      index++;
    }
    for (nn = n + 1; n >= 1;) {
      if (n <= 2) {
        if (n < 2) {
          zeror[degree - 1] = -(p[1] as number) / (p[0] as number);
          zeroi[degree - 1] = 0;
        } else {
          roots.li = roots.lr = roots.si = roots.sr = 0;
          this.quad(p[0] as number, p[1] as number, p[2] as number, roots);
          zeror[degree - 2] = roots.sr;
          zeroi[degree - 2] = roots.si;
          zeror[degree - 1] = roots.lr;
          zeroi[degree - 1] = roots.li;
        }
        break;
      }
      // Scale the coefficients if they are very large or very small.
      moduliMax = 0;
      moduliMin = Number.MAX_VALUE;
      for (i = 0; i < nn; i++) {
        x = Math.abs(p[i] as number);
        if (x > moduliMax) moduliMax = x;
        if (0 != x && x < moduliMin) moduliMin = x;
      }
      sc = smalno / moduliMin;
      if ((sc <= 1 && moduliMax >= 10) || (sc > 1 && Number.MAX_VALUE / sc >= moduliMax)) {
        sc = 0 == sc ? Number.MIN_VALUE : sc;
        l = Math.floor(Math.log(sc) / ln2 + 0.5);
        factor = Math.pow(2, l);
        if (1 != factor) for (i = 0; i < nn; i++) p[i] = (p[i] as number) * factor;
      }
      // Lower bound on the root moduli from the Cauchy polynomial.
      for (i = 0; i < nn; i++) pt[i] = Math.abs(p[i] as number);
      pt[n] = -(pt[n] as number);
      nm1 = n - 1;
      x = Math.exp((Math.log(-(pt[n] as number)) - Math.log(pt[0] as number)) / n);
      if (0 != pt[nm1]) {
        xm = -(pt[n] as number) / (pt[nm1] as number);
        x = xm < x ? xm : x;
      }
      xm = x;
      do {
        x = xm;
        xm = 0.1 * x;
        ff = pt[0] as number;
        for (i = 1; i < nn; i++) ff = ff * xm + (pt[i] as number);
      } while (ff > 0);
      // Newton iteration until x converges to two decimal places.
      for (dx = x; Math.abs(dx / x) > 0.005;) {
        df = ff = pt[0] as number;
        for (i = 1; i < n; i++) df = x * df + (ff = x * ff + (pt[i] as number));
        ff = x * ff + (pt[n] as number);
        dx = ff / df;
        x -= dx;
      }
      bnd = x;
      // The scaled derivative as the initial K polynomial.
      for (i = 1; i < n; i++) K[i] = ((n - i) * (p[i] as number)) / n;
      K[0] = p[0] as number;
      aa = p[n] as number;
      bb = p[nm1] as number;
      zerok = 0 == K[nm1] ? 1 : 0;
      // Five steps without a shift.
      for (jj = 0; jj < 5; jj++) {
        cc = K[nm1] as number;
        if (zerok) {
          for (i = 0; i < nm1; i++) {
            index = nm1 - i;
            K[index] = K[index - 1] as number;
          }
          K[0] = 0;
          zerok = 0 == K[nm1] ? 1 : 0;
        } else {
          t = -aa / cc;
          for (i = 0; i < nm1; i++) {
            index = nm1 - i;
            K[index] = t * (K[index - 1] as number) + (p[index] as number);
          }
          K[0] = p[0] as number;
          zerok = Math.abs(K[nm1] as number) <= DBL_EPSILON * Math.abs(bb) * 10 ? 1 : 0;
        }
      }
      for (i = 0; i < n; i++) temp[i] = K[i] as number;
      // Up to 20 fixed shifts, rotating the shift each time.
      for (jj = 1; jj <= 20; jj++) {
        xxx = -cosr * yy + sinr * xx;
        yy = cosr * xx + sinr * yy;
        xx = xxx;
        sr = bnd * xx;
        this.fxshfr(DBL_EPSILON, size, 20 * jj, sr, bnd, K, n, p, nn, qp, stage);
        if (0 != stage.NZ) {
          index = degree - n;
          zeror[index] = stage.szr;
          zeroi[index] = stage.szi;
          n = (nn -= stage.NZ) - 1;
          for (i = 0; i < nn; i++) p[i] = qp[i] as number;
          if (1 != stage.NZ) {
            zeror[index + 1] = stage.lzr;
            zeroi[index + 1] = stage.lzi;
          }
          break;
        }
        for (i = 0; i < n; i++) K[i] = temp[i] as number;
      }
      if (jj > 20) {
        degree -= n;
        break;
      }
    }
    return degree;
  }
}

/** The old module's namespace object, with every static under its old name. */
export const Intersection = {
  LARGE_EPS,
  SMALL_EPS,
  LOG_EPS,
  TINY_EPS,
  _checkDegree,
  intersect,
  intersectBezier2Line,
  intersectBezier2Bezier2,
  intersectBezier2Bezier3,
  hitTestBezier3,
  intersectBezier3Line,
  intersectBezier3LinePrecise,
  _calcQuadraticCoefficients,
  _calcCubicCoefficients,
  _calcCubicCoefficientsPrecise,
  intersectBezier3Bezier3,
  _roundPoint,
  _lerpPrecise,
  bezoutResultant,
  Polynomial,
  removeMultipleRoots,
  JenkinsTraub,
};

export {
  intersect,
  intersectBezier2Line,
  intersectBezier2Bezier2,
  intersectBezier2Bezier3,
  intersectBezier3Line,
  intersectBezier3LinePrecise,
  intersectBezier3Bezier3,
  hitTestBezier3,
  bezoutResultant,
  removeMultipleRoots,
};
