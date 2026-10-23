// Old: chunk.vendor.js module 1002 (GVertexSimplifier).
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { PolyLineExtended } from "./boolean/poly-line-extended.ts";
import { PolyIntersector, PolyLine } from "./boolean/poly-segments.ts";
import { VertexContainer } from "./vertex-container.ts";
import { VertexFitter } from "./vertex-fitter.ts";
import { VertexSource, type VertexReader } from "./vertex-source.ts";

/**
 * Simplifies a path by sampling its curves and fitting new cubics
 * through the samples (Simplify Path). Each sub-path becomes a ring;
 * runs of curves (or, with `includeLines`, of all segments) are replaced
 * by the fitted curves.
 */
export class VertexSimplifier {
  polys: PolyLineExtended[] = [];
  fitter: VertexFitter | null = null;
  /** Apply a fit even when the fitter gives up (then it throws: kept from the old code). */
  force = false;

  constructor(source?: VertexReader | null) {
    if (source && (source instanceof VertexContainer || hasMixinMethod(source))) {
      const parts = VertexContainer.splitVertexSource(source);
      for (let i = 0; i < parts.length; i++)
        this.polys.push(PolyLineExtended.fromVertexSource(parts[i] as VertexReader));
    }
  }

  /**
   * The simplified source. `tolerance` is the fitter's error;
   * `includeLines` refits lines too (with 200 to 666 segments allowed);
   * `subdivide` samples curves by flattening instead of at their
   * inflections.
   */
  simplify(tolerance: number, includeLines?: boolean, subdivide?: boolean): VertexContainer {
    const results: VertexContainer[] = [];
    this.fitter = new VertexFitter(tolerance);
    for (let r = 0; r < this.polys.length; r++) {
      const simplified = this._simplifyPoly(
        this.polys[r] as PolyLineExtended,
        tolerance,
        includeLines,
        subdivide,
      );
      if (simplified) results.push(simplified);
    }
    return VertexContainer.mergeVertexSources(results);
  }

  /** The parameters splitting a cubic at its extremes and inflections. */
  _getInflections(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ): number[] {
    const coeffsX = new Float64Array(3);
    const coeffsY = new Float64Array(3);
    GMath.getBezierDerivativeEquationCoeffs(x0, y0, x3, y3, x1, y1, x2, y2, coeffsX, coeffsY);
    const splits: number[] = [];
    GMath.getCubicCurveSplits(coeffsX, coeffsY, splits);
    return splits;
  }

  /** Adds (x, y) unless it equals the last point. */
  _pushUnique(points: Point[], x: number, y: number): void {
    const count = points.length;
    if (count) {
      const last = points[count - 1] as Point;
      if (!(GMath.isEqualEps(last.getX(), x, 1e-9) && GMath.isEqualEps(last.getY(), y, 1e-9)))
        points.push(new Point(x, y));
    } else points.push(new Point(x, y));
  }

  _simplifyPoly(
    head: PolyLineExtended,
    tolerance: number,
    includeLines?: boolean,
    subdivide?: boolean,
  ): VertexContainer | undefined {
    void tolerance;
    let startTangent: Point | null | undefined;
    let endTangent: Point | null | undefined;
    let x: number;
    let y: number;
    let inflections: number[];
    let node: PolyLineExtended | null = head;
    let before: PolyLineExtended | null = null;
    let samples: Point[] | null = null;
    let count = 0;
    if (!node) return undefined;
    let flattened: PolyLine | null;
    let firstPass = true;
    let flattener: PolyIntersector | null = null;
    if (subdivide) flattener = new PolyIntersector(false, false, false, 2);
    const fitter = this.fitter as VertexFitter;
    do {
      // Collect the samples of a run of curves (of all segments with includeLines).
      while (node && node.next && (includeLines || void 0 !== node.cx1)) {
        const next: PolyLineExtended = node.next;
        if (!samples) {
          samples = [new Point(node.x, node.y)];
          before = node === head ? null : node.prev;
          if (node.cx1 && !includeLines)
            startTangent = new Point(node.cx1 - node.x, (node.cy1 as number) - node.y);
        }
        if (void 0 !== node.cx2) {
          if (subdivide) {
            flattened = new PolyLine();
            (flattener as PolyIntersector)._subdivideBezier(
              flattened,
              node.x,
              node.y,
              node.cx1 as number,
              node.cy1 as number,
              node.cx2,
              node.cy2 as number,
              next.x,
              next.y,
            );
            if ((flattened = flattened.next)) {
              for (; flattened.point; flattened = flattened.next as PolyLine)
                this._pushUnique(samples, flattened.point.getX(), flattened.point.getY());
              this._pushUnique(samples, next.x, next.y);
            }
          } else {
            inflections = this._getInflections(
              node.x,
              node.y,
              node.cx1 as number,
              node.cy1 as number,
              node.cx2,
              node.cy2 as number,
              next.x,
              next.y,
            );
            for (let k = 1; k < inflections.length; k++) {
              const t = inflections[k] as number;
              const previousT = inflections[k - 1] as number;
              x = GMath.getCubicCurveAtT(
                node.x,
                next.x,
                node.cx1 as number,
                node.cx2,
                0.5 * (t + previousT),
              );
              y = GMath.getCubicCurveAtT(
                node.y,
                next.y,
                node.cy1 as number,
                node.cy2 as number,
                0.5 * (t + previousT),
              );
              this._pushUnique(samples, x, y);
              x = GMath.getCubicCurveAtT(node.x, next.x, node.cx1 as number, node.cx2, t);
              y = GMath.getCubicCurveAtT(node.y, next.y, node.cy1 as number, node.cy2 as number, t);
              this._pushUnique(samples, x, y);
            }
          }
        } else if (void 0 !== node.cx1) {
          if (subdivide) {
            flattened = new PolyLine();
            (flattener as PolyIntersector)._subdivideBezier(
              flattened,
              node.x,
              node.y,
              node.cx1,
              node.cy1 as number,
              next.x,
              next.y,
              undefined,
              undefined,
            );
            if ((flattened = flattened.next)) {
              for (; flattened.point; flattened = flattened.next as PolyLine)
                this._pushUnique(samples, flattened.point.getX(), flattened.point.getY());
              this._pushUnique(samples, next.x, next.y);
            }
          } else {
            inflections = this._getInflections(
              node.x,
              node.y,
              node.cx1,
              node.cy1 as number,
              node.cx1,
              node.cy1 as number,
              next.x,
              next.y,
            );
            for (let k = 1; k < inflections.length; k++) {
              const t = inflections[k] as number;
              const previousT = inflections[k - 1] as number;
              x = GMath.getCurveAtT(node.x, next.x, node.cx1, 0.5 * (t + previousT));
              y = GMath.getCurveAtT(node.y, next.y, node.cy1 as number, 0.5 * (t + previousT));
              this._pushUnique(samples, x, y);
              x = GMath.getCurveAtT(node.x, next.x, node.cx1, t);
              y = GMath.getCurveAtT(node.y, next.y, node.cy1 as number, t);
              this._pushUnique(samples, x, y);
            }
          }
        } else if (includeLines) this._pushUnique(samples, node.x, node.y);
        // (The old code had an end tangent branch for a node without next
        // here, unreachable inside this loop.)
        count++;
        if ((node = node.next) === head) break;
      }
      if (samples) {
        let fitted: Point[][] | null;
        if (samples.length > 1) {
          if (node && !includeLines) {
            const prev = node.prev as PolyLineExtended;
            if (void 0 !== prev.cx2)
              endTangent = new Point(prev.cx2 - node.x, (prev.cy2 as number) - node.y);
            else if (void 0 !== prev.cx1)
              endTangent = new Point(prev.cx1 - node.x, (prev.cy1 as number) - node.y);
          }
          if (!includeLines) {
            if (startTangent)
              startTangent = startTangent.scale(1 / Math.sqrt(startTangent.dot(startTangent)));
            if (endTangent)
              endTangent = endTangent.scale(1 / Math.sqrt(endTangent.dot(endTangent)));
          }
          fitted = fitter.fitCurve(
            samples,
            includeLines ? Math.max(Math.min(count, 666), 200) : count,
            startTangent,
            endTangent,
          );
        } else fitted = [];
        if (this.force || fitted) {
          const curves = fitted as Point[][];
          let current: PolyLineExtended | null = null;
          let curve: Point[] | null = null;
          for (let curveIndex = 0; curveIndex < curves.length; curveIndex++) {
            curve = curves[curveIndex] as Point[];
            const p = (i: number): Point => (curve as Point[])[i] as Point;
            (current = before ? new PolyLineExtended() : head).x = p(0).getX();
            current.y = p(0).getY();
            current.cx1 = p(1).getX();
            current.cy1 = p(1).getY();
            current.cx2 = p(2).getX();
            current.cy2 = p(2).getY();
            if (before) {
              before.next = current;
              current.prev = before;
            }
            before = current;
          }
          if (current) {
            const end = new PolyLineExtended();
            end.x = ((curve as Point[])[3] as Point).getX();
            end.y = ((curve as Point[])[3] as Point).getY();
            (before as PolyLineExtended).next = end;
            end.prev = before;
            if (node) {
              end.next = node;
              node.prev = end;
            }
          } else {
            if (!before) before = head;
            before.next = node;
            if (node) node.prev = before;
          }
        }
        samples = null;
        startTangent = null;
        endTangent = null;
        count = 0;
      }
      if (!firstPass && node === head) break;
      if (node) node = node.next;
      firstPass = false;
    } while (node && node !== head);
    return head.getPoints();
  }

  toString(): string {
    return "[Object GVertexSimplifier]";
  }
}

/**
 * The old test `e.hasMixin && e.hasMixin(GVertexSource)`: it asks the
 * object's own hasMixin, so a duck-typed source answering true counts.
 */
function hasMixinMethod(source: unknown): boolean {
  const candidate = source as { hasMixin?: (mixin: unknown) => boolean };
  return !!candidate.hasMixin && !!candidate.hasMixin(VertexSource);
}
