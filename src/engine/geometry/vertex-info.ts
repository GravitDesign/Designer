// Old: chunk.vendor.js module 59 (GVertexInfo).
/**
 * Measurements on vertex sources: hit tests (outline and fill), bounds,
 * path length, points on segments and collinearity of two segments.
 *
 * The old module exported one instance of a plain class (not a GObject);
 * so does this one. Curves come in the vertex order of the sources: a
 * Curve vertex is the end point and the next vertex the control point, a
 * Curve2 vertex the end point and the next two the control points.
 */
import { GMath, type RootInterval, type SturmCache, type SturmValues } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Vertex } from "./vertex.ts";
import type { VertexReader } from "./vertex-source.ts";

/**
 * Where a hit test hit: what GHitResult (engine-scene-node) holds. The hit
 * test only writes the fields it knows.
 */
export interface VertexHitResult {
  /** The 1-based segment index. */
  segment: number | null;
  x: number | null;
  y: number | null;
  /** The parameter on the segment (0..1). */
  slope: number | null;
  /** True for an outline hit, false for a hit inside the fill. */
  outline: boolean | null;
}

/** Region test of a conic piece: <0 outside its hull, 0 on the chord, >0 inside. */
type RegionFunction = (x: number, y: number) => number;
/** Implicit equation of a conic piece: the sign tells the side of the curve. */
type ConicFunction = (x: number, y: number) => number;

/** Reads a typed array entry (always set where it's read here). */
function at(list: ArrayLike<number>, index: number): number {
  return list[index] as number;
}

function writeHit(
  result: VertexHitResult,
  segment: number,
  x: number,
  y: number,
  slope: number,
): void {
  result.segment = segment;
  result.outline = true;
  result.x = x;
  result.y = y;
  result.slope = slope;
}

export class VertexInfoImpl {
  /**
   * Whether (px, py) is within the squared distance `sqrTolerance` of the
   * line segment. Fills `result` on a hit.
   */
  _hitTestSegment(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    px: number,
    py: number,
    sqrTolerance: number,
    segment: number,
    result: VertexHitResult | null | undefined,
  ): boolean {
    const t: number[] = [];
    if (GMath.sqrSegmentDist(x1, y1, x2, y2, px, py, t, sqrTolerance) <= sqrTolerance) {
      if (result) {
        result.segment = segment;
        result.x = x1 + (t[0] as number) * (x2 - x1);
        result.y = y1 + (t[0] as number) * (y2 - y1);
        result.slope = t[0] as number;
        result.outline = true;
      }
      return true;
    }
    return false;
  }

  /** Outline hit test of a quadratic curve from (x1, y1) to (x2, y2). */
  _hitTestCurve(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cx: number,
    cy: number,
    px: number,
    py: number,
    sqrTolerance: number,
    segment: number,
    result: VertexHitResult | null | undefined,
  ): boolean {
    const chordT: number[] = [];
    const distPoly = new Float64Array(5);
    const cubic = new Float64Array(4);
    const roots: number[] = [];
    let nearHull = false;
    let insideHull = true;
    const centroidX = (x1 + x2 + cx) / 3;
    const centroidY = (y1 + y2 + cy) / 3;
    if (GMath.sqrSegmentDist(x1, y1, x2, y2, px, py, chordT, sqrTolerance) <= sqrTolerance) {
      nearHull = true;
    } else if (
      GMath.segmentSide(x1, y1, x2, y2, px, py) *
        GMath.segmentSide(x1, y1, x2, y2, centroidX, centroidY) <
      0
    ) {
      insideHull = false;
    }
    if (nearHull && (0 == chordT[0] || 1 == chordT[0])) {
      if (result) {
        result.segment = segment;
        result.outline = true;
        result.slope = chordT[0] as number;
        if (0 == chordT[0]) {
          result.x = x1;
          result.y = y1;
        } else {
          result.x = x2;
          result.y = y2;
        }
      }
      return true;
    }
    if (GMath.sqrSegmentDist(x1, y1, cx, cy, px, py) <= sqrTolerance) {
      nearHull = true;
    } else if (
      GMath.segmentSide(x1, y1, cx, cy, px, py) *
        GMath.segmentSide(x1, y1, cx, cy, centroidX, centroidY) <
      0
    ) {
      insideHull = false;
    }
    if (GMath.sqrSegmentDist(cx, cy, x2, y2, px, py) <= sqrTolerance) {
      nearHull = true;
    } else if (
      GMath.segmentSide(cx, cy, x2, y2, px, py) *
        GMath.segmentSide(cx, cy, x2, y2, centroidX, centroidY) <
      0
    ) {
      insideHull = false;
    }
    if (!nearHull && !insideHull) return false;
    // The curve is ax*t^2 + bx*t + x1 (same for y).
    const ay = y2 - 2 * cy + y1;
    const ax = x2 - 2 * cx + x1;
    if (0 == ax && 0 == ay) {
      return this._hitTestSegment(x1, y1, x2, y2, px, py, sqrTolerance, segment, result);
    }
    const bx = 2 * (cx - x1);
    const by = 2 * (cy - y1);
    // Squared distance to (px, py) as a quartic in t; its derivative's
    // roots in [0, 1] are the candidates.
    distPoly[0] = ax * ax + ay * ay;
    distPoly[1] = 2 * (ax * bx + ay * by);
    distPoly[2] = bx * bx + by * by + 2 * ax * (x1 - px) + 2 * ay * (y1 - py);
    distPoly[3] = 2 * (bx * (x1 - px) + by * (y1 - py));
    distPoly[4] = (x1 - px) * (x1 - px) + (y1 - py) * (y1 - py);
    let value = 2 * distPoly[0];
    cubic[0] = 1;
    cubic[1] = (3 * distPoly[1]) / (2 * value);
    cubic[2] = distPoly[2] / value;
    cubic[3] = distPoly[3] / (2 * value);
    const rootCount = GMath.getCubicRoots(cubic, 0, 1, roots, false, 1e-6);
    if (0 == rootCount) return false;
    let best = sqrTolerance + 1;
    let bestIndex = rootCount + 1;
    for (let i = 0; i < rootCount; ++i) {
      if (best > (value = GMath.evalPoly(distPoly, 4, roots[i] as number) as number)) {
        best = value;
        bestIndex = i;
      }
    }
    if (best <= sqrTolerance) {
      if (result) {
        const t = roots[bestIndex] as number;
        result.segment = segment;
        result.x = (t * ax + bx) * t + x1;
        result.y = (t * ay + by) * t + y1;
        result.outline = true;
        result.slope = t;
      }
      return true;
    }
    return false;
  }

  /** Outline hit test of a cubic curve from (x0, y0) to (x3, y3). */
  _hitTestCurve2(
    x0: number,
    y0: number,
    x3: number,
    y3: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    px: number,
    py: number,
    sqrTolerance: number,
    segment: number,
    result: VertexHitResult | null | undefined,
  ): boolean {
    const splits: number[] = [];
    const coeffsX = new Float64Array(3);
    const coeffsY = new Float64Array(3);
    const distPoly = new Float64Array(7);
    const distDeriv = new Float64Array(6);
    const inverted = new Float64Array(6);
    const hullX = new Float64Array(4);
    const hullY = new Float64Array(4);
    let deriv2: Float64Array | null = null;
    let deriv3: Float64Array | null = null;
    const sturm: Float64Array[] = [];

    GMath.getBezierDerivativeEquationCoeffs(x0, y0, x3, y3, x1, y1, x2, y2, coeffsX, coeffsY);
    // The curve is ax*t^3 + bx*t^2 + cx*t + x0 (same for y).
    const ax = coeffsX[0] as number;
    const bxHalf = coeffsX[1] as number;
    const cxThird = coeffsX[2] as number;
    const ay = coeffsY[0] as number;
    const byHalf = coeffsY[1] as number;
    const cx = 3 * cxThird;
    const cy = 3 * (coeffsY[2] as number);
    const bx = 1.5 * bxHalf;
    const by = 1.5 * byHalf;
    const dx = x0 - px;
    const dy = y0 - py;
    // Squared distance to (px, py) as a degree-6 polynomial in t.
    distPoly[0] = ax * ax + ay * ay;
    distPoly[1] = 2 * (ax * bx + ay * by);
    distPoly[2] = bx * bx + by * by + 2 * (ax * cx + ay * cy);
    distPoly[3] = 2 * (ax * dx + bx * cx + ay * dy + by * cy);
    distPoly[4] = cx * cx + cy * cy + 2 * (bx * dx + by * dy);
    distPoly[5] = 2 * (cx * dx + cy * dy);
    distPoly[6] = dx * dx + dy * dy;
    GMath.getCoeffPolyDeriv(distPoly, 6, distDeriv);
    GMath.inversePolyUnaryInterval(distDeriv, 5, inverted);
    if (0 == GMath.estimPositiveRootsDescartes(inverted, 5)) {
      // No extremum inside: only the end points can be closest.
      const startDist = GMath.ptSqrDist(x0, y0, px, py);
      const endDist = GMath.ptSqrDist(x3, y3, px, py);
      if (startDist <= sqrTolerance || endDist <= sqrTolerance) {
        if (result) {
          result.segment = segment;
          result.outline = true;
          if (startDist < endDist) {
            result.x = x0;
            result.y = y0;
            result.slope = 0;
          } else {
            result.x = x3;
            result.y = y3;
            result.slope = 1;
          }
        }
        return true;
      }
      return false;
    }
    const splitCount = GMath.getCubicCurveSplits(coeffsX, coeffsY, splits);
    let t0: number;
    let t1 = 0;
    for (let piece = 0; piece < splitCount - 1; ++piece) {
      if (0 == piece) {
        t0 = splits[piece] as number;
        const startX = GMath.evalCubic(ax, bx, cx, x0, t0);
        const startY = GMath.evalCubic(ay, by, cy, y0, t0);
        if (GMath.ptSqrDist(startX, startY, px, py) <= sqrTolerance) {
          if (result) writeHit(result, segment, startX, startY, t0);
          return true;
        }
      } else {
        // Where the previous piece ended, after any nudge of t1 below.
        t0 = t1;
      }
      t1 = splits[piece + 1] as number;
      const endX = GMath.evalCubic(ax, bx, cx, x0, t1);
      const endY = GMath.evalCubic(ay, by, cy, y0, t1);
      if (GMath.ptSqrDist(endX, endY, px, py) <= sqrTolerance) {
        if (result) writeHit(result, segment, endX, endY, t1);
        return true;
      }
      GMath.getCtrlPts(x0, x3, x1, x2, t0, t1, hullX);
      GMath.getCtrlPts(y0, y3, y1, y2, t0, t1, hullY);
      let nearHull = false;
      let insideHull = true;
      const centroidX = (at(hullX, 0) + at(hullX, 1) + at(hullX, 2) + at(hullX, 3)) / 4;
      const centroidY = (at(hullY, 0) + at(hullY, 1) + at(hullY, 2) + at(hullY, 3)) / 4;
      for (let i = 0; i < 4; ++i) {
        const j = 3 == i ? 0 : i + 1;
        const hx = hullX[i] as number;
        const hy = hullY[i] as number;
        const kx = hullX[j] as number;
        const ky = hullY[j] as number;
        if (GMath.sqrSegmentDist(hx, hy, kx, ky, px, py) <= sqrTolerance) {
          nearHull = true;
          break;
        }
        if (
          GMath.segmentSide(hx, hy, kx, ky, px, py) *
            GMath.segmentSide(hx, hy, kx, ky, centroidX, centroidY) <
          0
        ) {
          insideHull = false;
        }
      }
      if (!(nearHull || insideHull)) continue;
      let valueAtT0 = GMath.evalPoly(distDeriv, 5, t0) as number;
      if (GMath.isEqualEps(valueAtT0, 0)) {
        t0 += 0.005;
        valueAtT0 = GMath.evalPoly(distDeriv, 5, t0) as number;
      }
      let valueAtT1 = GMath.evalPoly(distDeriv, 5, t1) as number;
      if (GMath.isEqualEps(valueAtT1, 0)) {
        t1 -= 0.005;
        valueAtT1 = GMath.evalPoly(distDeriv, 5, t1) as number;
      }
      GMath.inversePolyInterval(distDeriv, 5, t0, t1, inverted);
      const estimated = GMath.estimPositiveRootsDescartes(inverted, 5);
      if (0 == estimated) continue;
      if (!deriv2) {
        deriv2 = new Float64Array(5);
        GMath.getCoeffPolyDeriv(distDeriv, 5, deriv2);
      }
      if (!deriv3) {
        deriv3 = new Float64Array(4);
        GMath.getCoeffPolyDeriv(deriv2, 4, deriv3);
      }
      if (1 == estimated) {
        let t = GMath.locateByNewton(
          t0,
          t1,
          valueAtT0,
          valueAtT1,
          distDeriv,
          5,
          deriv2,
          deriv3,
          0.005,
        );
        if (null == t) t = (t0 + t1) / 2;
        const hitX = GMath.evalCubic(ax, bx, cx, x0, t);
        const hitY = GMath.evalCubic(ay, by, cy, y0, t);
        if (GMath.ptSqrDist(hitX, hitY, px, py) <= sqrTolerance) {
          if (result) writeHit(result, segment, hitX, hitY, t);
          return true;
        }
      }
      if (estimated > 1) {
        if (0 == sturm.length) GMath.getSturmPRS(distDeriv, 5, deriv2, sturm);
        const cache: SturmCache = [];
        const values: SturmValues = [valueAtT0, valueAtT1];
        const rootCount = GMath.countRootsNSturm(
          distDeriv,
          5,
          deriv2,
          t0,
          t1,
          sturm,
          cache,
          values,
        );
        if (0 == rootCount) continue;
        if (1 == rootCount) {
          let t = GMath.locateByNewton(
            t0,
            t1,
            valueAtT0,
            valueAtT1,
            distDeriv,
            5,
            deriv2,
            deriv3,
            0.005,
            sturm,
            cache,
          );
          if (null == t) t = (t0 + t1) / 2;
          const hitX = GMath.evalCubic(ax, bx, cx, x0, t);
          const hitY = GMath.evalCubic(ay, by, cy, y0, t);
          if (GMath.ptSqrDist(hitX, hitY, px, py) <= sqrTolerance) {
            if (result) writeHit(result, segment, hitX, hitY, t);
            return true;
          }
        }
        if (rootCount > 1) {
          const intervals: RootInterval[] = [];
          GMath.locRootsSturm(
            distDeriv,
            5,
            deriv2,
            t0,
            t1,
            sturm,
            rootCount,
            cache,
            values,
            intervals,
            0,
          );
          for (let k = 0; k < intervals.length; ++k) {
            const interval = intervals[k] as RootInterval;
            let t = GMath.locateByNewton(
              interval[0],
              interval[1],
              interval[2] as number,
              interval[3] as number,
              distDeriv,
              5,
              deriv2,
              deriv3,
              0.005,
              sturm,
            );
            if (null == t) t = (interval[0] + interval[1]) / 2;
            const hitX = GMath.evalCubic(ax, bx, cx, x0, t);
            const hitY = GMath.evalCubic(ay, by, cy, y0, t);
            if (GMath.ptSqrDist(hitX, hitY, px, py) <= sqrTolerance) {
              if (result) writeHit(result, segment, hitX, hitY, t);
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Winding contribution of the line segment for (px, py): where the point
   * lies in the triangle (origin, p1, p2). ±2 strictly inside, ±1 on an
   * edge through the origin (or on the segment itself with `onSegment`),
   * 0 outside; the sign is the triangle's orientation.
   */
  _hitUnderSegment(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    px: number,
    py: number,
    onSegment?: boolean,
  ): number {
    const sideA = GMath.segmentSide(0, 0, x1, y1, px, py);
    const sideB = GMath.segmentSide(x1, y1, x2, y2, px, py);
    const sideC = GMath.segmentSide(x2, y2, 0, 0, px, py);
    if (sideA > 0 && sideB > 0 && sideC > 0) return 2;
    if (sideA < 0 && sideB < 0 && sideC < 0) return -2;
    if (0 == sideA) {
      if (sideB > 0 && sideC > 0) return 1;
      if (sideB < 0 && sideC < 0) return -1;
      return 0;
    }
    if (0 == sideC) {
      if (sideA > 0 && sideB > 0) return 1;
      if (sideA < 0 && sideB < 0) return -1;
      return 0;
    }
    if (onSegment && 0 == sideB) {
      if (sideA > 0 && sideC > 0) return 1;
      if (sideA < 0 && sideC < 0) return -1;
      return 0;
    }
    return 0;
  }

  /**
   * Winding contribution of a conic piece from (x1, y1) to (x2, y2) with
   * control (cx, cy): the chord's triangle, corrected by the area between
   * chord and curve (`region` and `conic` describe that area).
   */
  _evalConicReg(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cx: number,
    cy: number,
    region: RegionFunction,
    conic: ConicFunction,
    px: number,
    py: number,
  ): number {
    const orientation = -GMath.segmentSide(x1, y1, x2, y2, cx, cy);
    if (0 == orientation) return this._hitUnderSegment(x1, y1, x2, y2, px, py);
    const chord = this._hitUnderSegment(x1, y1, x2, y2, px, py, true);
    const where = region(px, py);
    if (where < 0) return chord;
    if (0 == where) return orientation + chord;
    const controlSide = -conic(cx, cy);
    const pointSide = -conic(px, py);
    if ((pointSide > 0 && controlSide < 0) || (pointSide < 0 && controlSide > 0)) {
      return orientation + orientation + chord;
    }
    return chord;
  }

  /** Winding contribution of a quadratic curve (see _evalConicReg). */
  _hitUnderCurve(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cx: number,
    cy: number,
    px: number,
    py: number,
  ): number {
    return this._evalConicReg(
      x1,
      y1,
      x2,
      y2,
      cx,
      cy,
      (x, y) => {
        const centroidX = (x1 + cx + x2) / 3;
        const centroidY = (y1 + cy + y2) / 3;
        const chordSide = GMath.segmentSide(x2, y2, x1, y1, x, y);
        if (0 == chordSide) return 0;
        const startSide = GMath.segmentSide(x1, y1, cx, cy, x, y);
        const endSide = GMath.segmentSide(cx, cy, x2, y2, x, y);
        return startSide != GMath.segmentSide(x1, y1, cx, cy, centroidX, centroidY) ||
          endSide != GMath.segmentSide(cx, cy, x2, y2, centroidX, centroidY) ||
          chordSide != GMath.segmentSide(x2, y2, x1, y1, centroidX, centroidY)
          ? -1
          : 1;
      },
      (x, y) => {
        const area = (x1 - cx) * (y2 - cy) + (cx - x2) * (y1 - cy);
        const rx = x - cx;
        const ry = y - cy;
        const c = rx * (y1 - 2 * cy + y2) - ry * (x1 - 2 * cx + x2);
        return c * c + (2 * (rx * (y1 - y2) + ry * (x2 - x1)) + area) * area;
      },
      px,
      py,
    );
  }

  /**
   * Winding contribution of a cubic curve from (x0, y0) to (x3, y3): split
   * at inflections (and the self intersection) into pieces that are close
   * to conics, each evaluated with _evalConicReg.
   */
  _hitUnderCurve2(
    x0: number,
    y0: number,
    x3: number,
    y3: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    px: number,
    py: number,
  ): number {
    let winding = 0;
    const splits: number[] = [];
    const coeffsX = new Float64Array(3);
    const coeffsY = new Float64Array(3);
    GMath.getBezierDerivativeEquationCoeffs(x0, y0, x3, y3, x1, y1, x2, y2, coeffsX, coeffsY);
    const ax = coeffsX[0] as number;
    const ay = coeffsY[0] as number;
    const bxHalf = coeffsX[1] as number;
    const byHalf = coeffsY[1] as number;
    const cxThird = coeffsX[2] as number;
    const cyThird = coeffsY[2] as number;
    const cx = 3 * cxThird;
    const cy = 3 * cyThird;
    const bx = 1.5 * bxHalf;
    const by = 1.5 * byHalf;
    // Inflection points: roots of the cross product of the derivatives.
    const qa = bxHalf * ay - byHalf * ax;
    const qb = 2 * (cxThird * ay - cyThird * ax);
    const qc = cxThird * byHalf - cyThird * bxHalf;
    GMath.getQuadraticRoots(qa, qb, qc, splits);
    if (0 == splits.length) {
      const polyX = new Float64Array(4);
      const polyY = new Float64Array(4);
      polyX[0] = ax;
      polyX[1] = bx;
      polyX[2] = cx;
      polyX[3] = x0;
      polyY[0] = ay;
      polyY[1] = by;
      polyY[2] = cy;
      polyY[3] = y0;
      const crossing: number[] = [];
      GMath.getBezierSelfIntersections(polyX, polyY, crossing);
      if (2 == crossing.length) {
        const c0 = crossing[0] as number;
        const c1 = crossing[1] as number;
        if (0 != c0 && 1 != c0) splits.push(c0);
        if (0 != c1 && 1 != c1) splits.push(c1);
        splits.push((c0 + c1) / 2);
      }
    }
    splits.push(0);
    splits.push(1);
    const sorted: number[] = [];
    const count = GMath.uSortSegment(0, 1, splits, sorted);
    const hx = new Float64Array(4);
    const hy = new Float64Array(4);

    // Implicit equation of the cubic piece in hx/hy, in the piece's own
    // parameter space (from Loop & Blinn style implicitization). The x and
    // y polynomials are written in a centered basis (cubic, quadratic,
    // linear and constant terms); detAB is the cross term
    // xA * yB - xB * yA of two of those coefficients. The operation order
    // is the old code's, so the floats match it exactly.
    const conic: ConicFunction = (px, py) => {
      const [X0, X1, X2, X3] = [at(hx, 0), at(hx, 1), at(hx, 2), at(hx, 3)];
      const [Y0, Y1, Y2, Y3] = [at(hy, 0), at(hy, 1), at(hy, 2), at(hy, 3)];
      const xCubic = X0 - 3 * X1 + 3 * X2 - X3;
      const xQuad = (X0 - X1 - X2 + X3) / 2;
      const xLinear = (X0 + X1 - X2 - X3) / 4;
      const xConst = (X0 + 3 * X1 + 3 * X2 + X3) / 8;
      const yCubic = Y0 - 3 * Y1 + 3 * Y2 - Y3;
      const yQuad = (Y0 - Y1 - Y2 + Y3) / 2;
      const yLinear = (Y0 + Y1 - Y2 - Y3) / 4;
      const yConst = (Y0 + 3 * Y1 + 3 * Y2 + Y3) / 8;
      const det31 = xCubic * yLinear - xLinear * yCubic;
      const det32 = xCubic * yQuad - xQuad * yCubic;
      const det21 = xQuad * yLinear - xLinear * yQuad;
      const det30 = xCubic * yConst - xConst * yCubic;
      const det20 = xQuad * yConst - xConst * yQuad;
      const det10 = xLinear * yConst - xConst * yLinear;
      const xCubicSq = xCubic * xCubic;
      const yCubicSq = yCubic * yCubic;
      const det31Sq = det31 * det31;
      const det30Sq = det30 * det30;
      const det32x20 = det32 * det20;
      const det32x31 = det32 * det31;
      const mixedA = 3 * det32x20 - det31 * det30;
      const mixedB = 3 * det31Sq - det32 * (4 * det30 + 9 * det21);
      return (
        (yCubicSq * yCubic * px -
          3 * (xCubic * yCubicSq) * py +
          3 *
            (det30 * yCubicSq -
              3 * yCubic * (2 * det32 * yLinear + det31 * yQuad) +
              9 * det32 * (yQuad * yQuad))) *
          (px * px) +
        (3 * (xCubicSq * yCubic) * px -
          xCubicSq * xCubic * py +
          3 *
            (det30 * xCubicSq -
              3 * (2 * det32 * xLinear + det31 * xQuad) * xCubic +
              9 * det32 * (xQuad * xQuad))) *
          (py * py) +
        3 *
          ((det30Sq * yCubic +
            6 * mixedA * yQuad +
            3 * mixedB * yLinear +
            9 * det32x31 * yConst -
            ((2 * det30 + 3 * det21) * xCubic * yCubic +
              9 *
                (2 * det32 * xQuad * yQuad +
                  xQuad * xLinear * yCubicSq -
                  xCubicSq * yQuad * yLinear)) *
              py) *
            px -
            (det30Sq * xCubic + 6 * mixedA * xQuad + 3 * mixedB * xLinear + 9 * det32x31 * xConst) *
              py) +
        (det30 * (det30Sq - 9 * (det31 * det20 + 2 * det32 * det10)) +
          27 * (det32x20 * det20 + det31Sq * det10) -
          81 * (det32 * det21) * det10)
      );
    };
    // Inside the piece's control polygon (0 on its closing edge).
    const region: RegionFunction = (x, y) => {
      const centroidX = (at(hx, 0) + at(hx, 1) + at(hx, 2) + at(hx, 3)) / 4;
      const centroidY = (at(hy, 0) + at(hy, 1) + at(hy, 2) + at(hy, 3)) / 4;
      for (let i = 0; i < 4; ++i) {
        const j = 3 == i ? 0 : i + 1;
        const side = GMath.segmentSide(
          hx[i] as number,
          hy[i] as number,
          hx[j] as number,
          hy[j] as number,
          x,
          y,
        );
        if (3 == i && 0 == side) return 0;
        if (
          side *
            GMath.segmentSide(
              hx[i] as number,
              hy[i] as number,
              hx[j] as number,
              hy[j] as number,
              centroidX,
              centroidY,
            ) <
          0
        ) {
          return -1;
        }
      }
      return 1;
    };

    let t1 = 0;
    for (let piece = 0; piece < count - 1; ++piece) {
      const t0 = 0 == piece ? (sorted[piece] as number) : t1;
      t1 = sorted[piece + 1] as number;
      if (0 == t0 && 1 == t1) {
        hx[0] = x0;
        hx[1] = x1;
        hx[2] = x2;
        hx[3] = x3;
        hy[0] = y0;
        hy[1] = y1;
        hy[2] = y2;
        hy[3] = y3;
      } else {
        GMath.getCtrlPts(x0, x3, x1, x2, t0, t1, hx);
        GMath.getCtrlPts(y0, y3, y1, y2, t0, t1, hy);
      }
      if (GMath.isEqualEps(at(hx, 0), at(hx, 1)) && GMath.isEqualEps(at(hy, 0), at(hy, 1))) {
        winding += this._evalConicReg(
          hx[0] as number,
          hy[0] as number,
          hx[3] as number,
          hy[3] as number,
          hx[2] as number,
          hy[2] as number,
          region,
          conic,
          px,
          py,
        );
      } else {
        winding += this._evalConicReg(
          hx[0] as number,
          hy[0] as number,
          hx[3] as number,
          hy[3] as number,
          hx[1] as number,
          hy[1] as number,
          region,
          conic,
          px,
          py,
        );
      }
    }
    return winding;
  }

  /**
   * Whether (x, y) hits `source`: its outline within `tolerance` (a
   * diameter), or with `inside` its fill. `evenOdd` picks the fill rule
   * the way the old code did: undefined/null accepts a winding sum of ±2,
   * false only +2, true only -2. Fills `result` on a hit (outline false
   * for a fill hit). Returns true on a hit.
   */
  hitTest(
    x: number,
    y: number,
    source: VertexReader,
    tolerance: number,
    inside?: boolean,
    result?: VertexHitResult | null,
    evenOdd?: boolean | null,
  ): boolean {
    // Undefined until the first Move, as in the old code.
    let lastX = undefined as unknown as number;
    let lastY = undefined as unknown as number;
    let startX = null as unknown as number;
    let startY = null as unknown as number;
    let endX: number;
    let endY: number;
    let control1X: number;
    let control1Y: number;
    let segment = 0;
    let hit = false;
    const vertex = new Vertex();
    const sqrTolerance = tolerance ? (tolerance / 2) * (tolerance / 2) : GMath.defaultEps;
    let winding = 0;
    // The winding test uses triangles with the origin as a corner, which
    // breaks for a point at the origin; everything is shifted by one then.
    let shift = 0;
    if (GMath.isEqualEps(x, 0) && GMath.isEqualEps(y, 0)) shift = 1;
    if (!source.rewindVertices(0)) return hit;
    while (source.readVertex(vertex)) {
      switch (vertex.command) {
        case Vertex.Command.Move:
          startX = lastX = vertex.x;
          startY = lastY = vertex.y;
          break;
        case Vertex.Command.Line:
          ++segment;
          hit = this._hitTestSegment(
            lastX,
            lastY,
            vertex.x,
            vertex.y,
            x,
            y,
            sqrTolerance,
            segment,
            result,
          );
          if (hit) return hit;
          if (inside) {
            winding += this._hitUnderSegment(
              lastX + shift,
              lastY,
              vertex.x + shift,
              vertex.y,
              x + shift,
              y,
            );
          }
          lastX = vertex.x;
          lastY = vertex.y;
          break;
        case Vertex.Command.Curve:
          ++segment;
          endX = vertex.x;
          endY = vertex.y;
          if (source.readVertex(vertex)) {
            hit = this._hitTestCurve(
              lastX,
              lastY,
              endX,
              endY,
              vertex.x,
              vertex.y,
              x,
              y,
              sqrTolerance,
              segment,
              result,
            );
            if (hit) return hit;
            if (inside) {
              winding += this._hitUnderCurve(
                lastX + shift,
                lastY,
                endX + shift,
                endY,
                vertex.x + shift,
                vertex.y,
                x + shift,
                y,
              );
            }
            lastX = endX;
            lastY = endY;
          }
          break;
        case Vertex.Command.Curve2:
          ++segment;
          endX = vertex.x;
          endY = vertex.y;
          if (!source.readVertex(vertex)) break;
          control1X = vertex.x;
          control1Y = vertex.y;
          if (source.readVertex(vertex)) {
            hit = this._hitTestCurve2(
              lastX,
              lastY,
              endX,
              endY,
              control1X,
              control1Y,
              vertex.x,
              vertex.y,
              x,
              y,
              sqrTolerance,
              segment,
              result,
            );
            if (hit) return hit;
            if (inside) {
              winding += this._hitUnderCurve2(
                lastX + shift,
                lastY,
                endX + shift,
                endY,
                control1X + shift,
                control1Y,
                vertex.x + shift,
                vertex.y,
                x + shift,
                y,
              );
            }
            lastX = endX;
            lastY = endY;
          }
          break;
        case Vertex.Command.Close:
          if (startX != lastX || startY != lastY) {
            ++segment;
            hit = this._hitTestSegment(
              lastX,
              lastY,
              startX,
              startY,
              x,
              y,
              sqrTolerance,
              segment,
              result,
            );
            if (hit) return hit;
            if (inside) {
              winding += this._hitUnderSegment(
                lastX + shift,
                lastY,
                startX + shift,
                startY,
                x + shift,
                y,
              );
            }
          }
          startX = lastX;
          startY = lastY;
          break;
        default:
          throw new Error("Unknown vertex command: " + vertex.command.toString());
      }
    }
    if (inside) {
      // An open sub-path is closed implicitly for the fill.
      if (!(startX == lastX && startY == lastY)) {
        winding += this._hitUnderSegment(
          lastX + shift,
          lastY,
          startX + shift,
          startY,
          x + shift,
          y,
        );
      }
      if (
        (null == evenOdd && (2 == winding || -2 == winding)) ||
        (2 == winding && !evenOdd) ||
        (-2 == winding && evenOdd)
      ) {
        if (result) result.outline = false;
        hit = true;
      }
    }
    return hit;
  }

  /**
   * The bounding box of `source`, or null when it has no vertices. Without
   * `exact` curve control points count as part of the box; with it the
   * curves' real extremes do.
   */
  calculateBounds(source: VertexReader, exact?: boolean): Rect | null {
    if (source.rewindVertices(0)) {
      let minX = Number.MAX_VALUE;
      let minY = Number.MAX_VALUE;
      let maxX = -Number.MAX_VALUE;
      let maxY = -Number.MAX_VALUE;

      const add = (x: number, y: number): void => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      };

      const addQuadratic = (
        sx: number,
        sy: number,
        ex: number,
        ey: number,
        cx: number,
        cy: number,
      ): void => {
        let t: number;
        let denominator: number;
        add(ex, ey);
        if (0 != (denominator = ex - 2 * cx + sx) && (t = (sx - cx) / denominator) > 0 && t < 1) {
          add((sx * ex - cx * cx) / (ex - 2 * cx + sx), GMath.getCurveAtT(sy, ey, cy, t));
        }
        if (0 != (denominator = ey - 2 * cy + sy) && (t = (sy - cy) / denominator) > 0 && t < 1) {
          add(GMath.getCurveAtT(sx, ex, cx, t), (sy * ey - cy * cy) / (ey - 2 * cy + sy));
        }
      };

      const addCubic = (
        sx: number,
        sy: number,
        ex: number,
        ey: number,
        c1x: number,
        c1y: number,
        c2x: number,
        c2y: number,
      ): void => {
        add(ex, ey);
        const ax = c1x - sx;
        const ay = c1y - sy;
        const bx = 2 * (c2x - c1x - ax);
        const by = 2 * (c2y - c1y - ay);
        const qy = ey - c2y - ay - by;

        const addAt = (t: number): void => {
          if (t > 0 && t < 1) {
            add(
              GMath.getCubicCurveAtT(sx, ex, c1x, c2x, t),
              GMath.getCubicCurveAtT(sy, ey, c1y, c2y, t),
            );
          }
        };

        // Roots of a*t^2 + b*t + c, the derivative's zeros.
        const solve = (a: number, b: number, c: number): void => {
          let discriminant: number;
          let root: number;
          if (0 == a) {
            if (0 != b) addAt(-c / b);
          } else if (0 == (discriminant = b * b - 4 * a * c)) {
            addAt(-b / (2 * a));
          } else if (discriminant > 0) {
            root = Math.sqrt(discriminant);
            addAt((-b + root) / (2 * a));
            addAt((-b - root) / (2 * a));
          }
        };
        solve(ex - c2x - ax - bx, bx, ax);
        solve(qy, by, ay);
      };

      let lastX = undefined as unknown as number;
      let lastY = undefined as unknown as number;
      let endX: number;
      let endY: number;
      let control1X: number;
      let control1Y: number;
      const vertex = new Vertex();
      while (source.readVertex(vertex)) {
        switch (vertex.command) {
          case Vertex.Command.Move:
          case Vertex.Command.Line:
            add(vertex.x, vertex.y);
            lastX = vertex.x;
            lastY = vertex.y;
            break;
          case Vertex.Command.Curve:
            endX = vertex.x;
            endY = vertex.y;
            if (source.readVertex(vertex)) {
              if (exact) addQuadratic(lastX, lastY, endX, endY, vertex.x, vertex.y);
              else {
                add(endX, endY);
                add(vertex.x, vertex.y);
              }
              lastX = endX;
              lastY = endY;
            }
            break;
          case Vertex.Command.Curve2:
            endX = vertex.x;
            endY = vertex.y;
            if (source.readVertex(vertex)) {
              control1X = vertex.x;
              control1Y = vertex.y;
              if (source.readVertex(vertex)) {
                if (exact) {
                  addCubic(lastX, lastY, endX, endY, control1X, control1Y, vertex.x, vertex.y);
                } else {
                  add(endX, endY);
                  add(control1X, control1Y);
                  add(vertex.x, vertex.y);
                }
                lastX = endX;
                lastY = endY;
              }
            }
            break;
          case Vertex.Command.Close:
            break;
          default:
            throw new Error("Unknown vertex command: " + vertex.command.toString());
        }
      }
      if (minX < Number.MAX_VALUE && minY < Number.MAX_VALUE) {
        return new Rect(
          minX,
          minY,
          maxX > -Number.MAX_VALUE ? maxX - minX : 0,
          maxY > -Number.MAX_VALUE ? maxY - minY : 0,
        );
      }
    }
    return null;
  }

  /**
   * The length of `source` from its current read position (it is not
   * rewound). Closing segments count.
   *
   * Cubic segments throw: the old code referenced an undefined variable
   * (`cx2`) for the second control point, so the length of any path with
   * a complete cubic segment is a ReferenceError. Kept as it was.
   */
  getPathLength(source: VertexReader): number {
    let lastX = undefined as unknown as number;
    let lastY = undefined as unknown as number;
    let startX = undefined as unknown as number;
    let startY = undefined as unknown as number;
    let endX: number;
    let endY: number;
    const vertex = new Vertex();
    let length = 0;
    while (source.readVertex(vertex)) {
      switch (vertex.command) {
        case Vertex.Command.Move:
          lastX = startX = vertex.x;
          lastY = startY = vertex.y;
          break;
        case Vertex.Command.Line:
          length += GMath.ptDist(lastX, lastY, vertex.x, vertex.y);
          lastX = vertex.x;
          lastY = vertex.y;
          break;
        case Vertex.Command.Curve:
          endX = vertex.x;
          endY = vertex.y;
          if (source.readVertex(vertex)) {
            length += GMath.getArcLengthQuadratic(
              new Point(lastX, lastY),
              new Point(endX, endY),
              new Point(vertex.x, vertex.y),
            );
            lastX = endX;
            lastY = endY;
          }
          break;
        case Vertex.Command.Curve2:
          // The old code read both control points and then failed on the
          // undefined `cx2` before measuring anything. See QUESTIONS.md "Kept
          // crashes in the vertex helpers (getPathLength, GVertexContainer.clone,
          // QuadTree.clear)".
          if (source.readVertex(vertex) && source.readVertex(vertex)) {
            throw new ReferenceError("cx2 is not defined");
          }
          break;
        case Vertex.Command.Close:
          if (!(startX === lastX && startY === lastY)) {
            length += GMath.ptDist(startX, startY, lastX, lastY);
          }
          break;
        default:
          throw new Error("Unknown vertex command: " + vertex.command.toString());
      }
    }
    return length;
  }

  /**
   * The point at parameter `t` on the 1-based `segment` of `source`.
   * Asking for a segment past the end gives the point on the last one;
   * null when the source has none.
   */
  getSegmentPoint(source: VertexReader, segment: number, t: number): Point | null {
    if (source.rewindVertices(0)) {
      let lastX = undefined as unknown as number;
      let lastY = undefined as unknown as number;
      let endX: number;
      let endY: number;
      let control1X: number;
      let control1Y: number;
      const vertex = new Vertex();
      let index = 0;
      let startX = null as unknown as number;
      let startY = null as unknown as number;
      while (source.readVertex(vertex)) {
        let isLast = !source.hasVertexForRead();
        switch (vertex.command) {
          case Vertex.Command.Move:
            startX = lastX = vertex.x;
            startY = lastY = vertex.y;
            break;
          case Vertex.Command.Line:
            if (++index === segment || isLast) {
              return new Point((vertex.x - lastX) * t + lastX, (vertex.y - lastY) * t + lastY);
            }
            lastX = vertex.x;
            lastY = vertex.y;
            break;
          case Vertex.Command.Curve:
            ++index;
            endX = vertex.x;
            endY = vertex.y;
            if (source.readVertex(vertex)) {
              isLast = !source.hasVertexForRead();
              if (index === segment || isLast) {
                return new Point(
                  GMath.getCurveAtT(lastX, endX, vertex.x, t),
                  GMath.getCurveAtT(lastY, endY, vertex.y, t),
                );
              }
              lastX = endX;
              lastY = endY;
            }
            break;
          case Vertex.Command.Curve2:
            ++index;
            endX = vertex.x;
            endY = vertex.y;
            if (source.readVertex(vertex)) {
              control1X = vertex.x;
              control1Y = vertex.y;
              if (source.readVertex(vertex)) {
                isLast = !source.hasVertexForRead();
                if (index === segment || isLast) {
                  return new Point(
                    GMath.getCubicCurveAtT(lastX, endX, control1X, vertex.x, t),
                    GMath.getCubicCurveAtT(lastY, endY, control1Y, vertex.y, t),
                  );
                }
                lastX = endX;
                lastY = endY;
              }
            }
            break;
          case Vertex.Command.Close:
            if (++index === segment || isLast) {
              return new Point((startX - lastX) * t + lastX, (startY - lastY) * t + lastY);
            }
            startX = lastX;
            startY = lastY;
            break;
          default:
            throw new Error("Unknown vertex command: " + vertex.command.toString());
        }
      }
    }
    return null;
  }

  /**
   * Whether segment a lies on segment b (or b on a), within `eps`. Each
   * segment is given as its x and y coordinates: 2 for a line, 3 for a
   * quadratic (start, control, end) and 4 for a cubic (start, control 1,
   * control 2, end). Curves with a control point on an end point are
   * reduced first.
   */
  collinear(
    ax: readonly number[],
    ay: readonly number[],
    bx: readonly number[],
    by: readonly number[],
    eps?: number,
  ): boolean {
    const tolerance = eps || GMath.defaultEps;

    const onLine = (
      px: number,
      py: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ): boolean => {
      const cross = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1);
      return !!(
        GMath.isEqualEps(cross, 0, tolerance) &&
        py <= Math.max(y1, y2) + tolerance &&
        py >= Math.min(y1, y2) - tolerance &&
        px <= Math.max(x1, x2) + tolerance &&
        px >= Math.min(x1, x2) - tolerance
      );
    };

    const eq = (a: number | undefined, b: number | undefined): boolean =>
      GMath.isEqualEps(a as number, b as number, tolerance);

    // Drops degenerate control points. `splice(1)` keeps only the start
    // point, not just the start and end; that's the old behaviour.
    const reduce = (xs: number[], ys: number[]): void => {
      if (4 === xs.length) {
        if ((eq(xs[0], xs[1]) && eq(ys[0], ys[1])) || (eq(xs[2], xs[1]) && eq(ys[2], ys[1]))) {
          xs.splice(1);
          ys.splice(1);
        } else if (eq(xs[2], xs[3]) && eq(ys[2], ys[3])) {
          xs.splice(2);
          ys.splice(2);
        }
      }
      if (
        3 === xs.length &&
        ((eq(xs[0], xs[1]) && eq(ys[0], ys[1])) || (eq(xs[2], xs[1]) && eq(ys[2], ys[1])))
      ) {
        xs.splice(1);
        ys.splice(1);
      }
    };

    let shortX = ax.slice();
    let longX = bx.slice();
    let shortY = ay.slice();
    let longY = by.slice();
    reduce(shortX, shortY);
    reduce(longX, longY);
    if (shortX.length > longX.length) {
      let swap = shortX;
      shortX = longX;
      longX = swap;
      swap = shortY;
      shortY = longY;
      longY = swap;
    }
    if (2 !== shortX.length) return this._collinearBezier(shortX, shortY, longX, longY, tolerance);
    const s = (i: number): number => shortX[i] as number;
    const t = (i: number): number => shortY[i] as number;
    const u = (i: number): number => longX[i] as number;
    const v = (i: number): number => longY[i] as number;
    if (2 === longX.length) {
      if (
        onLine(s(0), t(0), u(0), v(0), u(1), v(1)) &&
        onLine(s(1), t(1), u(0), v(0), u(1), v(1))
      ) {
        return true;
      }
    } else if (4 === longX.length) {
      if (
        onLine(u(1), v(1), u(0), v(0), u(3), v(3)) &&
        onLine(u(2), v(2), u(0), v(0), u(3), v(3)) &&
        onLine(s(0), t(0), u(0), v(0), u(3), v(3)) &&
        onLine(s(1), t(1), u(0), v(0), u(3), v(3))
      ) {
        return true;
      }
    } else if (
      3 === longX.length &&
      onLine(u(1), v(1), u(0), v(0), u(2), v(2)) &&
      onLine(s(0), t(0), u(0), v(0), u(2), v(2)) &&
      onLine(s(1), t(1), u(0), v(0), u(2), v(2))
    ) {
      return true;
    }
    return false;
  }

  /**
   * Collinearity of two curves: the shorter one (a) must pass through
   * sample points and the end points of the longer one (b). The
   * tolerance is sqrt(eps), compared with squared distances.
   */
  _collinearBezier(ax: number[], ay: number[], bx: number[], by: number[], eps?: number): boolean {
    const tolerance = eps ? Math.sqrt(eps) : Math.sqrt(GMath.defaultEps);
    const a = (i: number): number => ax[i] as number;
    const b = (i: number): number => ay[i] as number;
    const u = (i: number): number => bx[i] as number;
    const v = (i: number): number => by[i] as number;
    const scratch = (): VertexHitResult => ({}) as VertexHitResult;
    const onCubic = (px: number, py: number): boolean =>
      this._hitTestCurve2(
        a(0),
        b(0),
        a(3),
        b(3),
        a(1),
        b(1),
        a(2),
        b(2),
        px,
        py,
        tolerance,
        0,
        scratch(),
      );
    const onQuadratic = (px: number, py: number): boolean =>
      this._hitTestCurve(a(0), b(0), a(2), b(2), a(1), b(1), px, py, tolerance, 0, scratch());
    if (4 === bx.length) {
      const quarterX = GMath.getCubicCurveAtT(u(0), u(3), u(1), u(2), 0.25);
      const quarterY = GMath.getCubicCurveAtT(v(0), v(3), v(1), v(2), 0.25);
      const threeQuarterX = GMath.getCubicCurveAtT(u(0), u(3), u(1), u(2), 0.75);
      const threeQuarterY = GMath.getCubicCurveAtT(v(0), v(3), v(1), v(2), 0.75);
      if (4 === ax.length) {
        if (
          onCubic(quarterX, quarterY) &&
          onCubic(threeQuarterX, threeQuarterY) &&
          onCubic(u(0), v(0)) &&
          onCubic(u(3), v(3))
        ) {
          return true;
        }
      } else if (
        3 === ax.length &&
        onQuadratic(quarterX, quarterY) &&
        onQuadratic(threeQuarterX, threeQuarterY) &&
        onQuadratic(u(0), v(0)) &&
        onQuadratic(u(3), v(3))
      ) {
        return true;
      }
    } else if (3 === bx.length) {
      const midX = GMath.getCurveAtT(u(0), u(2), u(1), 0.5);
      const midY = GMath.getCurveAtT(v(0), v(2), v(1), 0.5);
      if (4 === ax.length) {
        if (onCubic(midX, midY) && onCubic(u(0), v(0)) && onCubic(u(2), v(2))) return true;
      } else if (
        3 === ax.length &&
        onQuadratic(midX, midY) &&
        onQuadratic(u(0), v(0)) &&
        onQuadratic(u(2), v(2))
      ) {
        return true;
      }
    }
    return false;
  }

  toString(): string {
    return "[Object GVertexInfo]";
  }
}

/** The shared instance; the old module exported only this. */
export const VertexInfo = new VertexInfoImpl();
