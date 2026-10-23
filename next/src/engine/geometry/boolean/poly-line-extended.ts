// Old: chunk.vendor.js module 264 (GVertexPolyBoolean.PolyLineExtended).
/* eslint-disable @typescript-eslint/no-this-alias -- the ring and list walks start at this node */
import { GMath } from "../../math/math.ts";
import { Point } from "../../math/point.ts";
import { Vertex } from "../vertex.ts";
import { VertexContainer } from "../vertex-container.ts";
import { VertexInfo, type VertexHitResult } from "../vertex-info.ts";
import type { VertexReader } from "../vertex-source.ts";
import { Intersection } from "./intersection.ts";
import type { IntersectionPoint } from "./intersection-point.ts";
import type { PolyLine } from "./poly-segments.ts";

// The point in polygon policies and the common segment policies of
// GVertexPolyBoolean, here so this file doesn't import the boolean class.
export const PIP_CHECK_ODDEVEN = 1;
export const PIP_CHECK_WINDING = 0;
export const AUTO_MAX_PASSTHROUGH = -2;
export const AUTO = -1;
export const OUTSIDE = 0;
export const INSIDE = 1;

/** Squared tolerance of the curve hit tests in colinear(). */
const CURVE_HIT_TOLERANCE = Math.sqrt(1e-10);
const ROUND_SCALE = Math.pow(10, 11);

/** Rounds to 11 decimals, as the polygon coordinates are stored. */
export function roundCoordinate(value: number): number {
  return Math.round(value * ROUND_SCALE) / ROUND_SCALE;
}

/** An intersection once its poly segments are PolyLineExtended nodes. */
export type ExtendedIntersection = IntersectionPoint<PolyLineExtended>;

/** A position as colinear() and the inside tests read it. */
export interface XY {
  x: number;
  y: number;
}

/** The hit tests write into a result the callers never read. */
function scratchHit(): VertexHitResult {
  return {} as VertexHitResult;
}

/**
 * A node of the doubly linked rings the boolean works on. All sub-paths
 * of a source are one ring; `isLast` marks a sub-path's last node, whose
 * `next` is the first node of the following sub-path. A node with
 * control points (cx1/cy1, cx2/cy2) starts a curve that ends at
 * `nextCurve`; the nodes in between are its flattened points, with
 * `currCurve` pointing back at the curve's start.
 */
export class PolyLineExtended {
  x = 0;
  y = 0;
  cx1: number | undefined = undefined;
  cy1: number | undefined = undefined;
  cx2: number | undefined = undefined;
  cy2: number | undefined = undefined;
  nextCurve: PolyLineExtended | null = null;
  prevCurve: PolyLineExtended | null = null;
  currCurve: PolyLineExtended | null = null;
  isIsect = false;
  next: PolyLineExtended | null = null;
  prev: PolyLineExtended | null = null;
  corresponding: PolyLineExtended | null = null;
  visited = false;
  /** Whether the stretch before this intersection is inside the other polygon (negative: undecided). */
  prevInside = 0;
  /** Whether the stretch after this intersection is inside the other polygon (negative: undecided). */
  nextInside = 0;
  isEntry = false;
  isectPoly: ExtendedIntersection | null = null;
  isLast = false;
  index = 0;
  tmpIdx = 0;
  // Set on the simple poly lines of a clip (_mergeNonIntersecting).
  fromSource: number | undefined = undefined;
  isHole: boolean | undefined = undefined;
  isIntersecting: number[] | null | undefined = undefined;

  /** Links each intersection's two nodes to each other. */
  static generateCorresponding(intersections: ExtendedIntersection[]): null | undefined {
    for (let t = 0; t < intersections.length; t++) {
      const isect = intersections[t] as ExtendedIntersection;
      isect.polySeg0.corresponding = isect.polySeg1;
      isect.polySeg1.corresponding = isect.polySeg0;
      if (null == isect.polySeg1.corresponding) return null;
      if (null == isect.polySeg0.corresponding) return null;
    }
    return undefined;
  }

  /**
   * A ring from the first sub-path of a source (reading stops at the
   * first Close). Curves keep their control points on their start node.
   */
  static fromVertexSource(source: VertexReader): PolyLineExtended {
    let first: Vertex | null = null;
    let last: Vertex | null = first;
    let vertex = new Vertex();
    const head = new PolyLineExtended();
    let cursor = head;
    let reading = true;
    for (source.rewindVertices(0); reading && source.readVertex(vertex);) {
      switch (vertex.command) {
        case Vertex.Command.Move:
          first = last = vertex;
          vertex = new Vertex();
          break;
        case Vertex.Command.Line:
          if (last) {
            cursor.x = last.x;
            cursor.y = last.y;
            cursor.next = new PolyLineExtended();
            cursor.next.prev = cursor;
            cursor = cursor.next;
          }
          last = vertex;
          vertex = new Vertex();
          break;
        case Vertex.Command.Curve:
          if (last) {
            const start = new Point(last.x, last.y);
            last = vertex;
            vertex = new Vertex();
            if (source.readVertex(vertex)) {
              cursor.x = start.getX();
              cursor.y = start.getY();
              cursor.cx1 = vertex.x;
              cursor.cy1 = vertex.y;
              cursor.next = new PolyLineExtended();
              cursor.next.prev = cursor;
              cursor = cursor.next;
              vertex = new Vertex();
            }
          } else {
            last = vertex;
            vertex = new Vertex();
          }
          break;
        case Vertex.Command.Curve2:
          if (last) {
            const start = new Point(last.x, last.y);
            last = vertex;
            vertex = new Vertex();
            const control2 = new Vertex();
            if (source.readVertex(vertex) && source.readVertex(control2)) {
              cursor.cx1 = vertex.x;
              cursor.cy1 = vertex.y;
              cursor.cx2 = control2.x;
              cursor.cy2 = control2.y;
              cursor.x = start.getX();
              cursor.y = start.getY();
              cursor.next = new PolyLineExtended();
              cursor.next.prev = cursor;
              cursor = cursor.next;
              vertex = new Vertex();
            }
          } else {
            last = vertex;
            vertex = new Vertex();
          }
          break;
        case Vertex.Command.Close:
          if (first && last && (last.x != first.x || last.y != first.y)) {
            cursor.x = last.x;
            cursor.y = last.y;
            cursor.next = head;
            head.prev = cursor;
          } else {
            // Throws (TypeError) for a sub-path without segments, as the old code did.
            cursor = cursor.prev as PolyLineExtended;
            cursor.next = head;
            head.prev = cursor;
          }
          last = null;
          reading = false;
          break;
        default:
          // The old message built from an undefined global `vertex`.
          throw new ReferenceError("vertex is not defined");
      }
    }
    if (last && first) {
      cursor.x = last.x;
      cursor.y = last.y;
    }
    return head;
  }

  /**
   * A ring from a poly segment list (poly-segments.ts) with the
   * intersections inserted. The intersections of the given side
   * (0: polySeg0, 1: polySeg1) are pointed at the new nodes; null if one
   * of them can't be found.
   */
  static fromPolyLine(
    poly: PolyLine,
    intersections: IntersectionPoint<PolyLine | PolyLineExtended>[],
    side: number,
  ): PolyLineExtended | null {
    let head: PolyLineExtended | null = null;
    let node: PolyLineExtended | null = null;
    let previous: PolyLineExtended | null = null;
    let curveEnd: PolyLine | null = null;
    let curveStart: PolyLineExtended | null = null;
    const firstPoint = poly.point as Point;
    let current: PolyLine = poly;
    while (current.point) {
      if (
        !(current.next as PolyLine).point &&
        GMath.isEqualEps(current.point.getX(), firstPoint.getX()) &&
        GMath.isEqualEps(current.point.getY(), firstPoint.getY())
      ) {
        if (null !== curveEnd && curveEnd === current)
          (curveStart as PolyLineExtended).nextCurve = head;
        break;
      }
      node = new PolyLineExtended();
      if (head) {
        node.prev = previous;
        (previous as PolyLineExtended).next = node;
      } else head = node;
      node.x = roundCoordinate(current.point.getX());
      node.y = roundCoordinate(current.point.getY());
      if (null !== curveEnd && curveEnd === current)
        (curveStart as PolyLineExtended).nextCurve = node;
      if (current.nextCurve) {
        curveEnd = current.nextCurve;
        curveStart = node;
        node.cx1 = (current.cp1 as Point).getX();
        node.cy1 = (current.cp1 as Point).getY();
        if (current.cp2) {
          node.cx2 = current.cp2.getX();
          node.cy2 = current.cp2.getY();
        }
      }
      node.isLast = current.isLast;
      node.isIsect = current.isIsect;
      if (node.isIsect) {
        let found = false;
        if (0 === side) {
          for (let c = 0; c < intersections.length; c++) {
            const isect = intersections[c] as IntersectionPoint<PolyLine | PolyLineExtended>;
            if (isect.polySeg0 === current) {
              isect.polySeg0 = node;
              node.isectPoly = isect as ExtendedIntersection;
              found = true;
              break;
            }
          }
        } else if (1 === side) {
          for (let c = 0; c < intersections.length; c++) {
            const isect = intersections[c] as IntersectionPoint<PolyLine | PolyLineExtended>;
            if (isect.polySeg1 === current) {
              isect.polySeg1 = node;
              node.isectPoly = isect as ExtendedIntersection;
              found = true;
              break;
            }
          }
        }
        if (!found) return null;
      }
      previous = node;
      current = current.next as PolyLine;
    }
    if (!head) return null;
    const lastNode = node as PolyLineExtended;
    lastNode.next = head;
    head.prev = lastNode;
    if (!(null === curveEnd || curveEnd.point)) (curveStart as PolyLineExtended).nextCurve = head;
    return head;
  }

  /**
   * Whether `point` lies on the segment before (`prev`) or after
   * (`next`) the node `self` (this by default). `xs`/`ys` are the
   * coordinates of the other polygon's piece around the point: 3 for a
   * quadratic, 4 for a cubic, null for lines.
   */
  colinear(
    point: XY,
    xs?: ArrayLike<number> | null,
    ys?: ArrayLike<number> | null,
    prev?: PolyLineExtended | null,
    next?: PolyLineExtended | null,
    self?: PolyLineExtended | null,
  ): boolean {
    const before = (prev ||
      (this.prev as PolyLineExtended).currCurve ||
      this.prev) as PolyLineExtended;
    const after = (next || this.nextCurve || this.next) as PolyLineExtended;
    const node = self || this;

    const onSegment = (px: number, py: number, start: XY, end: XY): boolean => {
      const cross = (py - start.y) * (end.x - start.x) - (px - start.x) * (end.y - start.y);
      if (GMath.isEqualEps(cross, 0, 1e-10)) {
        const dx = (end.x - start.x) * (px - start.x);
        const dy = (end.y - start.y) * (py - start.y);
        if (dx >= 0 && dy >= 0) return true;
      }
      return false;
    };

    const onLine = (px: number, py: number, start: XY, end: XY): boolean => {
      const cross = (py - start.y) * (end.x - start.x) - (px - start.x) * (end.y - start.y);
      return !!GMath.isEqualEps(cross, 0, 1e-10);
    };

    // Whether the piece xs/ys lies on the curve that starts at `curve`.
    const onCurve = (
      curve: PolyLineExtended,
      end: PolyLineExtended,
      xs: ArrayLike<number>,
      ys: ArrayLike<number>,
    ): boolean | undefined => {
      const x = (i: number): number => xs[i] as number;
      const y = (i: number): number => ys[i] as number;
      if (4 === xs.length) {
        const qx = GMath.getCubicCurveAtT(x(0), x(3), x(1), x(2), 0.25);
        const qy = GMath.getCubicCurveAtT(y(0), y(3), y(1), y(2), 0.25);
        const tx = GMath.getCubicCurveAtT(x(0), x(3), x(1), x(2), 0.75);
        const ty = GMath.getCubicCurveAtT(y(0), y(3), y(1), y(2), 0.75);
        if (void 0 !== curve.cx2) {
          const hit = (px: number, py: number): boolean =>
            VertexInfo._hitTestCurve2(
              curve.x,
              curve.y,
              end.x,
              end.y,
              curve.cx1 as number,
              curve.cy1 as number,
              curve.cx2 as number,
              curve.cy2 as number,
              px,
              py,
              CURVE_HIT_TOLERANCE,
              0,
              scratchHit(),
            );
          if (hit(qx, qy) && hit(tx, ty) && hit(point.x, point.y)) return true;
        } else {
          const hit = (px: number, py: number): boolean =>
            VertexInfo._hitTestCurve(
              curve.x,
              curve.y,
              end.x,
              end.y,
              curve.cx1 as number,
              curve.cy1 as number,
              px,
              py,
              CURVE_HIT_TOLERANCE,
              0,
              scratchHit(),
            );
          if (hit(qx, qy) && hit(tx, ty) && hit(point.x, point.y)) return true;
        }
      } else if (3 === xs.length) {
        const mx = GMath.getCurveAtT(x(0), x(2), x(1), 0.5);
        const my = GMath.getCurveAtT(y(0), y(2), y(1), 0.5);
        if (void 0 !== curve.cx2) {
          const hit = (px: number, py: number): boolean =>
            VertexInfo._hitTestCurve2(
              curve.x,
              curve.y,
              end.x,
              end.y,
              curve.cx1 as number,
              curve.cy1 as number,
              curve.cx2 as number,
              curve.cy2 as number,
              px,
              py,
              CURVE_HIT_TOLERANCE,
              0,
              scratchHit(),
            );
          if (hit(mx, my) && hit(point.x, point.y)) return true;
        } else {
          const hit = (px: number, py: number): boolean =>
            VertexInfo._hitTestCurve(
              curve.x,
              curve.y,
              end.x,
              end.y,
              curve.cx1 as number,
              curve.cy1 as number,
              px,
              py,
              CURVE_HIT_TOLERANCE,
              0,
              scratchHit(),
            );
          if (hit(mx, my) && hit(point.x, point.y)) return true;
        }
      }
      return undefined;
    };

    if (xs) {
      const x = (i: number): number => xs[i] as number;
      const y = (i: number): number => (ys as ArrayLike<number>)[i] as number;
      if (node.nextCurve) {
        if (onCurve(node, after, xs, ys as ArrayLike<number>)) return true;
      } else if (ys) {
        if (
          onLine(x(1), y(1), { x: x(0), y: y(0) }, { x: x(3), y: y(3) }) &&
          onLine(x(2), y(2), { x: x(0), y: y(0) }, { x: x(3), y: y(3) }) &&
          onSegment(point.x, point.y, node, after)
        )
          return true;
      } else if (
        onLine(x(1), y(1), { x: x(0), y: y(0) }, { x: x(2), y: y(2) }) &&
        onSegment(point.x, point.y, node, after)
      )
        return true;
      if (before.currCurve) {
        if (onCurve(before, node, xs, ys as ArrayLike<number>)) return true;
      } else if (ys) {
        if (
          onLine(x(1), y(1), { x: x(0), y: y(0) }, { x: x(3), y: y(3) }) &&
          onLine(x(2), y(2), { x: x(0), y: y(0) }, { x: x(3), y: y(3) }) &&
          onSegment(point.x, point.y, node, before)
        )
          return true;
      } else if (
        onLine(x(1), y(1), { x: x(0), y: y(0) }, { x: x(2), y: y(2) }) &&
        onSegment(point.x, point.y, node, before)
      )
        return true;
    } else {
      if (node.nextCurve) {
        if (void 0 !== node.cx1 && void 0 !== node.cx2) {
          if (
            onLine(node.cx1, node.cy1 as number, node, after) &&
            onLine(node.cx2, node.cy2 as number, node, after) &&
            onSegment(point.x, point.y, node, after)
          )
            return true;
        } else if (
          onLine(node.cx1 as number, node.cy1 as number, node, after) &&
          onSegment(point.x, point.y, node, after)
        )
          return true;
      } else if (onSegment(point.x, point.y, node, after)) return true;
      if (before.currCurve) {
        if (void 0 !== before.cx1 && void 0 !== before.cx2) {
          if (
            onLine(before.cx1, before.cy1 as number, node, before) &&
            onLine(before.cx2, before.cy2 as number, node, before) &&
            onSegment(point.x, point.y, node, before)
          )
            return true;
        } else if (
          onLine(before.cx1 as number, before.cy1 as number, node, before) &&
          onSegment(point.x, point.y, node, before)
        )
          return true;
      } else if (onSegment(point.x, point.y, node, before)) return true;
    }
    return false;
  }

  /** The last flattened node of the curve this node is on. */
  _lastCurvePt(): PolyLineExtended | null {
    return this.currCurve
      ? ((this.currCurve.nextCurve as PolyLineExtended).prev as PolyLineExtended)
      : null;
  }

  /** Links `node` after this node, or after `lastOfCurve` when this node ends in a curve. */
  _connect(node: PolyLineExtended, lastOfCurve?: PolyLineExtended | null): void {
    if (node.currCurve) node.currCurve.prevCurve = this;
    if (lastOfCurve) {
      if (node.currCurve) node.currCurve.prevCurve = this.currCurve;
      node.prev = lastOfCurve;
      lastOfCurve.next = node;
      (this.currCurve as PolyLineExtended).nextCurve = node;
    } else {
      if (node.currCurve) node.currCurve.prevCurve = this;
      this.next = node;
      node.prev = this;
    }
  }

  /**
   * Splits sub-paths whose last node lies inside the other polygon
   * at a node outside of it, so every sub-path starts and ends outside.
   */
  _fixCycles(other: PolyLineExtended): void {
    const policy = PIP_CHECK_ODDEVEN;
    let last = this._lastInLoop();
    const firstLast = last;
    let noOutsidePoint = false;
    if (last.isLast) {
      const cutsInside: [PolyLineExtended, PolyLineExtended, PolyLineExtended][] = [];
      const cutsOutside: [PolyLineExtended, PolyLineExtended, PolyLineExtended][] = [];
      let cuts: [PolyLineExtended, PolyLineExtended, PolyLineExtended][];
      let first = this._firstInLoop();
      let loops = 0;
      let insideWithoutCut = 0;
      let outsideWithoutCut = 0;
      let insideLoops = 0;
      let node: PolyLineExtended;
      let cut: PolyLineExtended | null;
      do {
        if (!last.isIsect && other.isInside(last, policy)) {
          node = ((last.prev as PolyLineExtended).currCurve || last.prev) as PolyLineExtended;
          cut = null;
          while (!node.isLast && node !== last) {
            if (!node.isIsect && !other.isInside(node, policy)) {
              cut = node;
              break;
            }
            node = ((node.prev as PolyLineExtended).currCurve || node.prev) as PolyLineExtended;
          }
          if (cut) cutsInside.push([first, last, cut]);
          else {
            noOutsidePoint = true;
            insideWithoutCut++;
          }
          insideLoops++;
        }
        last = (first = last.next as PolyLineExtended)._lastInLoop();
        loops++;
      } while (last !== firstLast);
      if (!(loops <= 1) && insideLoops !== loops) {
        if (noOutsidePoint) {
          do {
            if (!last.isIsect && !other.isInside(last, policy)) {
              node = ((last.prev as PolyLineExtended).currCurve || last.prev) as PolyLineExtended;
              cut = null;
              while (!node.isLast && node !== last) {
                if (!node.isIsect && other.isInside(node, policy)) {
                  cut = node;
                  break;
                }
                node = ((node.prev as PolyLineExtended).currCurve || node.prev) as PolyLineExtended;
              }
              if (cut) cutsOutside.push([first, last, cut]);
              else outsideWithoutCut++;
            }
            last = (first = last.next as PolyLineExtended)._lastInLoop();
          } while (last !== firstLast);
          cuts = outsideWithoutCut < insideWithoutCut ? cutsOutside : cutsInside;
        } else cuts = cutsInside;
        for (let f = 0; f < cuts.length; f++) {
          const entry = cuts[f] as [PolyLineExtended, PolyLineExtended, PolyLineExtended];
          first = entry[0];
          last = entry[1];
          cut = entry[2];
          const afterLast = (last.nextCurve || last.next) as PolyLineExtended;
          const afterCut = (cut.nextCurve || cut.next) as PolyLineExtended;
          const beforeFirst = ((first.prev as PolyLineExtended).currCurve ||
            first.prev) as PolyLineExtended;
          const beforeLast = ((last.prev as PolyLineExtended).currCurve ||
            last.prev) as PolyLineExtended;
          const newLast = new PolyLineExtended();
          newLast.isLast = true;
          newLast.x = afterCut.x;
          newLast.y = afterCut.y;
          if (cut !== beforeLast) {
            const curveEnd0 = beforeFirst._lastCurvePt();
            const curveEnd1 = beforeLast._lastCurvePt();
            const curveEnd2 = cut._lastCurvePt();
            beforeFirst._connect(afterCut, curveEnd0);
            beforeLast._connect(first, curveEnd1);
            cut._connect(newLast, curveEnd2);
            newLast._connect(afterLast);
          }
        }
      }
    }
  }

  /** Joins open sub-paths whose ends meet into closed loops. Unused in the old app; pinned by old-fixtures.json. */
  _stitch(): PolyLineExtended {
    if (this.next === this) return this;
    let last: PolyLineExtended;
    const open: [PolyLineExtended, PolyLineExtended][] = [];
    const closed: [PolyLineExtended, PolyLineExtended][] = [];
    let joined: [PolyLineExtended, PolyLineExtended][] = [];
    const start = this._firstInLoop();
    let node = start;
    do {
      if ((last = node._lastInLoop()).x === node.x && last.y === node.y) closed.push([node, last]);
      else open.push([node, last]);
      node = last.next as PolyLineExtended;
    } while (node !== start);
    let a: [PolyLineExtended, PolyLineExtended];
    let s: [PolyLineExtended, PolyLineExtended];
    let count = open.length;
    if ((1 === count && 0 === closed.length) || 0 === count) return start;
    for (let h = 0; h < count; h++) {
      a = open[h] as [PolyLineExtended, PolyLineExtended];
      for (let k = h; k < count; k++) {
        s = open[(h + k + 1) % count] as [PolyLineExtended, PolyLineExtended];
        if (a[0].x === s[0].x && a[0].y === s[0].y) {
          a[0]._reverseLoop();
          joined.push([a[1], a[0]]);
          break;
        }
        if (a[0].x === s[1].x && a[0].y === s[1].y) {
          a[0]._reverseLoop();
          joined.push([a[1], a[0]]);
          break;
        }
        if ((a[1].x === s[1].x && a[1].y === s[1].y) || (a[1].x === s[0].x && a[1].y === s[0].y)) {
          joined.push(a);
          break;
        }
      }
    }
    // (The old code logged "ERROR WHILE STITCHING" here.)
    if (open.length !== joined.length) return this._firstInLoop();
    count = (joined = joined.concat(closed)).length;
    const curveEnds: (PolyLineExtended | null)[] = [];
    for (let h = 0; h < count; h++)
      curveEnds.push((joined[h] as [PolyLineExtended, PolyLineExtended])[1]._lastCurvePt());
    for (let h = 0; h < count; h++) {
      const end = (joined[h] as [PolyLineExtended, PolyLineExtended])[1];
      const nextStart = (joined[(h + 1) % count] as [PolyLineExtended, PolyLineExtended])[0];
      if (end.x === nextStart.x && end.y === nextStart.y) end.isLast = false;
      end._connect(nextStart, curveEnds[h]);
    }
    return this._firstInLoop();
  }

  /**
   * Reverses the sub-path this node is on, swapping the control points.
   * Only _stitch calls it, and nothing calls _stitch in the old app;
   * pinned by old-fixtures.json.
   */
  _reverseLoop(): void {
    if (this.next != this) {
      let next: PolyLineExtended | null;
      let cx1: number | undefined;
      let cx2: number | undefined;
      let cy1: number | undefined;
      let cy2: number | undefined;
      let oldCx1: number | undefined;
      let oldCx2: number | undefined;
      let oldCy1: number | undefined;
      let oldCy2: number | undefined;
      const first = this._firstInLoop();
      const beforeFirst = first.prev as PolyLineExtended;
      const last = this._lastInLoop();
      const afterLast = last.next as PolyLineExtended;
      let node = first;
      do {
        next = node.next;
        node.next = node.prev;
        node.prev = next;
        oldCx1 = node.cx1;
        oldCx2 = node.cx2;
        oldCy1 = node.cy1;
        oldCy2 = node.cy2;
        if (void 0 !== cx1 && void 0 !== cx2) {
          node.cx1 = cx2;
          node.cx2 = cx1;
          node.cy1 = cy2;
          node.cy2 = cy1;
        } else {
          node.cx1 = cx1;
          node.cx2 = void 0;
          node.cy1 = cy1;
          node.cy2 = void 0;
        }
        cx1 = oldCx1;
        cx2 = oldCx2;
        cy1 = oldCy1;
        cy2 = oldCy2;
        if ((node = next as PolyLineExtended) === first) break;
      } while (node !== afterLast);
      beforeFirst.next = last;
      last.prev = beforeFirst;
      afterLast.prev = first;
      first.next = afterLast;
      first.isLast = true;
      last.isLast = false;
    }
  }

  _firstInLoop(): PolyLineExtended {
    let node = this.currCurve || this;
    const start = node;
    do {
      if ((node = (node.prevCurve || node.prev) as PolyLineExtended) === start) {
        if (!start.isLast) node = (node.prevCurve || node.prev) as PolyLineExtended;
        break;
      }
    } while (!node.isLast);
    return (node.nextCurve || node.next) as PolyLineExtended;
  }

  _lastInLoop(): PolyLineExtended {
    let node = this.currCurve || this;
    const start = node;
    while (!node.isLast) {
      if ((node = (node.nextCurve || node.next) as PolyLineExtended) === start) {
        node = (node.prevCurve || node.prev) as PolyLineExtended;
        break;
      }
    }
    return node;
  }

  prevInLoop(): PolyLineExtended {
    const prev = ((this.prev as PolyLineExtended).currCurve || this.prev) as PolyLineExtended;
    if (prev.isLast) return this._lastInLoop();
    return prev;
  }

  nextInLoop(): PolyLineExtended {
    return this.isLast
      ? this._firstInLoop()
      : this.currCurve
        ? (this.currCurve.nextCurve as PolyLineExtended)
        : (this.next as PolyLineExtended);
  }

  /** Whether the sub-path ends before the next intersection. Unused in the old app; pinned by old-fixtures.json. */
  cleanForwards(): boolean {
    let node: PolyLineExtended = this;
    do {
      if ((node = (node.nextCurve || node.next) as PolyLineExtended).isLast) return true;
    } while (!node.isIsect);
    return false;
  }

  /** Whether the sub-path starts after the previous intersection. Unused in the old app; pinned by old-fixtures.json. */
  cleanBackwards(): boolean {
    let node: PolyLineExtended = this;
    do {
      if (
        (node = ((node.prev as PolyLineExtended).currCurve || node.prev) as PolyLineExtended).isLast
      )
        return true;
    } while (!node.isIsect);
    return false;
  }

  /** Numbers the sub-paths of the ring from `start` on; returns the next free number. */
  markIndices(start?: number): number {
    const first = this.currCurve || this;
    let node = first;
    const firstIndex = start || 0;
    let index = firstIndex || 0;
    do {
      node.index = index;
      if (node.isLast) index++;
      node = (node.nextCurve || node.next) as PolyLineExtended;
    } while (node !== first);
    if (index === firstIndex) index++;
    return index;
  }

  /** Unsigned area of the ring, skipping the jumps between sub-paths. */
  area(): number {
    let sum = 0;
    let node: PolyLineExtended = this;
    let next = node.next as PolyLineExtended;
    do {
      if (!node.isLast) {
        sum += node.x * next.y;
        sum -= node.y * next.x;
      }
      next = (node = node.next as PolyLineExtended).next as PolyLineExtended;
    } while (node !== this);
    return (sum /= 2) < 0 ? -sum : sum;
  }

  /**
   * Whether `other` is at this node's position (within `eps`) and, for a
   * curve start, whether its first flattened point coincides as well.
   * `forward` decides which of the two is the curve side.
   */
  _equalsEps(other: PolyLineExtended, forward: boolean, eps: number): boolean {
    if (!GMath.isEqualEps(this.x, other.x, eps) || !GMath.isEqualEps(this.y, other.y, eps))
      return false;
    let node: PolyLineExtended = this;
    if (!forward) {
      node = other;
      other = this;
    }
    if (node.currCurve) {
      const next = node.next as PolyLineExtended;
      if (GMath.isEqualEps(node.x, next.x, eps) && GMath.isEqualEps(node.y, next.y, eps)) {
        let prev = other.prev as PolyLineExtended;
        if (
          ((prev.currCurve && prev.currCurve.isLast) || prev.isLast) &&
          (prev = other._lastInLoop()).nextCurve
        )
          prev = prev.nextCurve.prev as PolyLineExtended;
        if (!prev.currCurve) return true;
        if (GMath.isEqualEps(other.x, prev.x, eps) && GMath.isEqualEps(other.y, prev.y, eps))
          return true;
      }
      return false;
    }
    return true;
  }

  /**
   * The previous node at a different position, halving the tolerance on
   * every step; null when that is an intersection at the same position.
   */
  static _getPrevDifferentPoint(start: PolyLineExtended): PolyLineExtended | null {
    let previous: PolyLineExtended;
    let node = start;
    let eps = 2 * Intersection.LARGE_EPS;
    do {
      previous = node;
      node = node.prevInLoop();
      eps /= 2;
    } while (start !== node && !node.isIsect && previous._equalsEps(node, false, eps));
    return node.isIsect && previous._equalsEps(node, false, eps) ? null : node;
  }

  /**
   * The next node at a different position (see _getPrevDifferentPoint).
   * lastEqual[0] gets the last node at the start's position.
   */
  static _getNextDifferentPoint(
    start: PolyLineExtended,
    lastEqual: PolyLineExtended[],
  ): PolyLineExtended | null {
    let previous: PolyLineExtended;
    let node = start;
    let eps = 2 * Intersection.LARGE_EPS;
    do {
      previous = node;
      node = node.nextInLoop();
      eps /= 2;
    } while (start !== node && !node.isIsect && previous._equalsEps(node, true, eps));
    lastEqual[0] = previous;
    return node.isIsect && previous._equalsEps(node, false, eps) ? null : node;
  }

  /** Unused in the old app; pinned by old-fixtures.json. */
  static _getClosestTime(x0: number, y0: number, x1: number, y1: number): number {
    const dx = Math.abs(x0 - x1);
    const dy = Math.abs(y0 - y1);
    const max = Math.max(dx, dy);
    return Math.min(0.5, CURVE_HIT_TOLERANCE / max);
  }

  /**
   * Decides for every intersection whether the stretches before and
   * after it run inside the other polygon (prevInside / nextInside) and
   * turns off the intersections the path only touches (both sides the
   * same). Stretches on a common segment get `policy`, or are resolved
   * along each sub-path for the AUTO policies. False when no
   * intersection is left on one of the polygons.
   */
  static disableBadIntersections(
    intersections: ExtendedIntersection[],
    policy: number,
    pipPolicy: number,
    fromSide: number,
    toSide: number,
  ): boolean {
    void pipPolicy;
    let index: number;
    const sides: PolyLineExtended[][] = [[], []];
    if (!intersections.length) return false;
    for (index = 0; index < intersections.length; index++) {
      const isect = intersections[index] as ExtendedIntersection;
      (sides[0] as PolyLineExtended[]).push(isect.polySeg0);
      (sides[1] as PolyLineExtended[]).push(isect.polySeg1);
    }
    let node: PolyLineExtended;
    for (let side = fromSide; side <= toSide; side++) {
      const nodes = sides[side] as PolyLineExtended[];
      for (index = 0; index < nodes.length; index++) {
        node = nodes[index] as PolyLineExtended;
        const half = 0.5;
        const before: XY = { x: node.x, y: node.y };
        const after: XY = { x: node.x, y: node.y };
        let beforeXs: Float64Array | null = null;
        let beforeYs: Float64Array | null = null;
        let afterXs: Float64Array | null = null;
        let afterYs: Float64Array | null = null;
        const lastEqual: PolyLineExtended[] = [node];
        const prev = PolyLineExtended._getPrevDifferentPoint(node);
        const next = PolyLineExtended._getNextDifferentPoint(node, lastEqual);
        const lastSame = lastEqual[0] as PolyLineExtended;
        // Points halfway to the neighbours, on the curve if there is one.
        if (prev) {
          if (prev.currCurve) {
            if (void 0 === prev.currCurve.cx2) {
              beforeXs = new Float64Array(3);
              beforeYs = new Float64Array(3);
              GMath.getCtrlPtsQuadratic(
                prev.currCurve.x,
                node.x,
                prev.cx1 as number,
                0,
                half,
                beforeXs,
              );
              before.x = roundCoordinate(beforeXs[2] as number);
              GMath.getCtrlPtsQuadratic(
                prev.currCurve.y,
                node.y,
                prev.cy1 as number,
                0,
                half,
                beforeYs,
              );
              before.y = roundCoordinate(beforeYs[2] as number);
            } else {
              beforeXs = new Float64Array(4);
              beforeYs = new Float64Array(4);
              GMath.getCtrlPts(
                prev.currCurve.x,
                node.x,
                prev.cx1 as number,
                prev.cx2 as number,
                0,
                half,
                beforeXs,
              );
              before.x = roundCoordinate(beforeXs[3] as number);
              GMath.getCtrlPts(
                prev.currCurve.y,
                node.y,
                prev.cy1 as number,
                prev.cy2 as number,
                0,
                half,
                beforeYs,
              );
              before.y = roundCoordinate(beforeYs[3] as number);
            }
          } else {
            before.x = roundCoordinate(node.x + half * (prev.x - node.x));
            before.y = roundCoordinate(node.y + half * (prev.y - node.y));
          }
        }
        if (next) {
          if (lastSame.currCurve) {
            const curve = lastSame.currCurve;
            if (void 0 === curve.cx2) {
              afterXs = new Float64Array(3);
              afterYs = new Float64Array(3);
              GMath.getCtrlPtsQuadratic(curve.x, next.x, curve.cx1 as number, 0, half, afterXs);
              after.x = roundCoordinate(afterXs[2] as number);
              GMath.getCtrlPtsQuadratic(curve.y, next.y, curve.cy1 as number, 0, half, afterYs);
              after.y = roundCoordinate(afterYs[2] as number);
            } else {
              afterXs = new Float64Array(4);
              afterYs = new Float64Array(4);
              GMath.getCtrlPts(curve.x, next.x, curve.cx1 as number, curve.cx2, 0, half, afterXs);
              after.x = roundCoordinate(afterXs[3] as number);
              GMath.getCtrlPts(
                curve.y,
                next.y,
                curve.cy1 as number,
                curve.cy2 as number,
                0,
                half,
                afterYs,
              );
              after.y = roundCoordinate(afterYs[3] as number);
            }
          } else {
            after.x = roundCoordinate(lastSame.x + half * (next.x - lastSame.x));
            after.y = roundCoordinate(lastSame.y + half * (next.y - lastSame.y));
          }
        }
        let savedPolicy: number | undefined;
        const otherNodes = sides[(side + 1) % 2] as PolyLineExtended[];
        const matches: PolyLineExtended[] = [];
        for (let otherIndex = 0; otherIndex < otherNodes.length; otherIndex++) {
          const candidate = otherNodes[otherIndex] as PolyLineExtended;
          if (
            index === otherIndex ||
            (GMath.isEqualEps(candidate.x, node.x, 1e-10) &&
              GMath.isEqualEps(candidate.y, node.y, 1e-10))
          )
            matches.push(candidate);
        }
        // A fixed policy is applied after the loop; -10 marks the stretches it applies to.
        if (policy >= 0) {
          savedPolicy = policy;
          policy = -10;
        }
        for (let matchIndex = 0; matchIndex < matches.length; matchIndex++) {
          const match = matches[matchIndex] as PolyLineExtended;
          const matchPrev = PolyLineExtended._getPrevDifferentPoint(match);
          const matchNext = PolyLineExtended._getNextDifferentPoint(match, lastEqual);
          const matchLastSame = lastEqual[0] as PolyLineExtended;
          if (node.prevInside >= 0) {
            if (matchPrev && prev) {
              if (match.colinear(before, beforeXs, beforeYs, matchPrev, matchNext, matchLastSame))
                node.prevInside = policy;
              else if (0 === node.prevInside)
                node.prevInside = match.isInsideBezier(before, PIP_CHECK_ODDEVEN, true) > 0 ? 1 : 0;
            } else node.prevInside = policy;
          }
          if (node.nextInside >= 0) {
            if (matchNext && next) {
              if (match.colinear(after, afterXs, afterYs, matchPrev, matchNext, matchLastSame))
                node.nextInside = policy;
              else if (0 === node.nextInside)
                node.nextInside = match.isInsideBezier(after, PIP_CHECK_ODDEVEN, true) > 0 ? 1 : 0;
            } else node.nextInside = policy;
          }
        }
        if (-10 === policy) {
          policy = savedPolicy as number;
          if (-10 === node.prevInside) node.prevInside = savedPolicy as number;
          if (-10 === node.nextInside) node.nextInside = savedPolicy as number;
        }
      }
    }
    // The intersections of each sub-path, in ring order.
    const runs: PolyLineExtended[][][] = [[], []];
    for (let side = fromSide; side <= toSide; side++) {
      const sideRuns = runs[side] as PolyLineExtended[][];
      const start = ((sides[side] as PolyLineExtended[])[0] as PolyLineExtended)._firstInLoop();
      let run: PolyLineExtended[] = [];
      node = start;
      do {
        if (node.isIsect) run.push(node);
        else if (node.isLast && run.length) {
          sideRuns.push(run);
          run = [];
        }
        node = node.next as PolyLineExtended;
      } while (node !== start);
      if (run.length && sideRuns[sideRuns.length - 1] !== run) sideRuns.push(run);
    }
    let current: PolyLineExtended;
    for (let side = fromSide; side <= toSide; side++) {
      const sideRuns = runs[side] as PolyLineExtended[][];
      if (policy < 0) {
        for (let runIndex = 0; runIndex < sideRuns.length; runIndex++) {
          const runNodes = sideRuns[runIndex] as PolyLineExtended[];
          const runLength = runNodes.length;
          const at = (i: number): PolyLineExtended => runNodes[i] as PolyLineExtended;
          current = at(0);
          let startIndex: number;
          for (
            startIndex = 0;
            startIndex < runLength && !((current = at(startIndex)).nextInside >= 0);
            startIndex++
          );
          if (current.nextInside < 0) {
            startIndex = 0;
            (current = at(0)).nextInside = policy === AUTO ? OUTSIDE : INSIDE;
            at(1 % runLength).prevInside = current.nextInside;
          }
          if (current.nextInside >= 0) {
            let inside = current.nextInside;
            if (policy === AUTO) {
              for (let step = 1; step < runLength; step++) {
                current = at((step + startIndex) % runLength);
                if (current.prevInside < 0) current.prevInside = inside;
                else inside = current.prevInside;
                if (current.nextInside < 0) current.nextInside = inside;
                else inside = current.nextInside;
              }
            } else {
              let undecidedRun = 0;
              for (let step = 1; step < runLength; step++) {
                current = at((step + startIndex) % runLength);
                if (current.prevInside >= 0 || current.nextInside >= 0) undecidedRun = 0;
                const corresponding = current.corresponding as PolyLineExtended;
                if (current.prevInside >= 0 && current.nextInside >= 0) {
                  if (side > 0) {
                    const crossesOther =
                      corresponding.prevInside >= 0 &&
                      corresponding.prevInside === corresponding.nextInside;
                    if (crossesOther !== (current.prevInside === current.nextInside)) {
                      if (crossesOther) {
                        current.prevInside = inside;
                        current.nextInside = inside;
                      } else {
                        current.prevInside = inside;
                        inside ^= 1;
                        current.nextInside = inside;
                      }
                    } else inside = current.nextInside;
                  } else inside = current.nextInside;
                } else if (current.prevInside >= 0 && current.nextInside < 0) {
                  if (side > 0 && corresponding.prevInside === corresponding.nextInside) {
                    current.prevInside = inside;
                    current.nextInside = inside;
                  } else {
                    current.prevInside = inside;
                    inside ^= 1;
                    current.nextInside = inside;
                  }
                } else if (current.prevInside < 0 && current.nextInside >= 0) {
                  if (side > 0 && corresponding.prevInside === corresponding.nextInside) {
                    current.prevInside = inside;
                    current.nextInside = inside;
                  } else {
                    current.prevInside = 1 ^ current.nextInside;
                    if (inside !== current.prevInside) current.prevInside = inside;
                    inside = current.nextInside;
                  }
                } else if (current.prevInside < 0 && current.nextInside < 0) {
                  if (side > 0) {
                    if (corresponding.prevInside === corresponding.nextInside)
                      current.prevInside = current.nextInside = inside;
                    else {
                      current.prevInside = inside;
                      inside ^= 1;
                      current.nextInside = inside;
                    }
                  } else {
                    const following = at((step + startIndex + 1) % runLength);
                    if (
                      following !== current &&
                      following.prevInside < 0 &&
                      following.nextInside < 0 &&
                      0 === undecidedRun
                    ) {
                      current.prevInside = inside;
                      inside ^= 1;
                      current.nextInside = inside;
                    } else if (
                      following !== current &&
                      (following.prevInside >= 0 || following.nextInside >= 0) &&
                      undecidedRun > 0
                    ) {
                      current.prevInside = inside;
                      if (following.prevInside >= 0) {
                        current.nextInside = following.prevInside;
                        inside = current.nextInside;
                      } else {
                        inside ^= 1;
                        current.nextInside = inside;
                      }
                    } else if (
                      following !== current &&
                      following.nextInside >= 0 &&
                      following.prevInside < 0
                    ) {
                      current.prevInside = inside;
                      if (inside === following.nextInside) inside ^= 1;
                      current.nextInside = inside;
                    } else current.prevInside = current.nextInside = inside;
                    undecidedRun += 1;
                  }
                }
              }
            }
            if ((current = at(startIndex)).prevInside < 0) current.prevInside = inside;
            inside = current.prevInside;
            if (policy !== AUTO_MAX_PASSTHROUGH) {
              for (let step = 1; step < runLength; step++) {
                current = at((startIndex - step + runLength) % runLength);
                if (current.nextInside != inside) current.nextInside = inside;
                inside = current.prevInside;
              }
            }
          }
        }
      }
      let disabled = 0;
      let total = 0;
      for (let runIndex = 0; runIndex < sideRuns.length; runIndex++) {
        const run = sideRuns[runIndex] as PolyLineExtended[];
        for (let nodeIndex = 0; nodeIndex < run.length; nodeIndex++) {
          total++;
          current = run[nodeIndex] as PolyLineExtended;
          if (current.prevInside === current.nextInside) {
            current.isIsect = false;
            (current.corresponding as PolyLineExtended).isIsect = false;
            disabled++;
          }
        }
      }
      if (disabled === total) return false;
    }
    return true;
  }

  /**
   * Sets currCurve on the flattened nodes of every curve and prevCurve
   * on the curve starts. Null when a curve runs past the ring's start.
   */
  static generatePrevCurveCurrCurve(head: PolyLineExtended): PolyLineExtended | null {
    const start = head;
    let node = start.next as PolyLineExtended;
    let end: PolyLineExtended | null = start.nextCurve ? start : null;
    let hasCurve = !!end;
    while (node !== start) {
      if (node.nextCurve) {
        hasCurve = true;
        break;
      }
      node = node.next as PolyLineExtended;
    }
    if (hasCurve) {
      node = start;
      let firstCurve: PolyLineExtended | null = null;
      let curve: PolyLineExtended;
      do {
        if (node.nextCurve) {
          if (!firstCurve) firstCurve = node;
          end = node.nextCurve;
          curve = node;
          do {
            node.currCurve = curve;
            if ((node = node.next as PolyLineExtended) === start && node !== end) return null;
          } while (node !== end);
        } else node = node.next as PolyLineExtended;
      } while (node !== start);
      if (!firstCurve) return start;
      node = firstCurve.next as PolyLineExtended;
      let previous: PolyLineExtended = firstCurve;
      do {
        if (node.nextCurve) {
          node.prevCurve = previous;
          previous = node;
        } else if (!node.currCurve) previous = node;
        node = (node.nextCurve || node.next) as PolyLineExtended;
      } while (node !== firstCurve);
      firstCurve.prevCurve = previous;
    }
    return start;
  }

  /**
   * Drops nodes at the position of their successor, moving curve and
   * intersection data onto the node that stays. Null when an
   * intersection's back link doesn't match (side 0: polySeg0, else polySeg1).
   * Unused in the old app; pinned by old-fixtures.json.
   */
  static removeDuplicates(head: PolyLineExtended, side: number): PolyLineExtended | null {
    const start = head;
    let node = start.next as PolyLineExtended;
    let next = node.next as PolyLineExtended;
    let curve: PolyLineExtended | null = start.nextCurve ? start : null;
    while (node !== start) {
      if (
        !node.isLast &&
        GMath.isEqualEps(node.x, next.x, 1e-10) &&
        GMath.isEqualEps(node.y, next.y, 1e-10)
      ) {
        if (curve && curve.nextCurve === node) curve.nextCurve = next;
        if (node.nextCurve && node.nextCurve !== next && !next.nextCurve) {
          next.nextCurve = node.nextCurve;
          next.cx1 = node.cx1;
          next.cy1 = node.cy1;
          next.cx2 = node.cx2;
          next.cy2 = node.cy2;
        }
        if (node.isIsect) {
          next.isIsect = true;
          next.corresponding = node.corresponding;
          next.isectPoly = node.isectPoly;
          const isect = node.isectPoly as ExtendedIntersection;
          if (0 == side) {
            if (isect.polySeg0 !== node) return null;
            isect.polySeg0 = next;
          } else {
            if (isect.polySeg1 !== node) return null;
            isect.polySeg1 = next;
          }
        }
        const prev = node.prev as PolyLineExtended;
        prev.next = next;
        next.prev = prev;
        node = next;
      } else {
        if (node.nextCurve) curve = node;
        node = node.next as PolyLineExtended;
      }
      next = node.next as PolyLineExtended;
    }
    if (GMath.isEqualEps(start.x, next.x, 1e-10) && GMath.isEqualEps(start.y, next.y, 1e-10)) {
      if (curve && curve.nextCurve === next) {
        curve.nextCurve = null;
        curve.cx1 = curve.cx2 = curve.cy1 = curve.cy2 = void 0;
      }
      if (next.nextCurve && next.nextCurve !== start) {
        start.nextCurve = next.nextCurve;
        start.cx1 = next.cx1;
        start.cy1 = next.cy1;
        start.cx2 = next.cx2;
        start.cy2 = next.cy2;
      }
      if (next.isIsect) {
        start.isIsect = true;
        start.corresponding = next.corresponding;
        start.isectPoly = next.isectPoly;
        const isect = next.isectPoly as ExtendedIntersection;
        if (0 == side) {
          if (isect.polySeg0 !== next) return null;
          isect.polySeg0 = start;
        } else {
          if (isect.polySeg1 !== next) return null;
          isect.polySeg1 = start;
        }
      }
      const after = next.next as PolyLineExtended;
      start.next = after;
      after.prev = start;
    }
    return start;
  }

  /**
   * The ring as vertices, starting here. `curves` follows nextCurve
   * (for rings whose curves are still flattened); otherwise every node
   * with control points is one curve to its next node. The old app never
   * passed `curves` = true; that branch is pinned by old-fixtures.json.
   */
  getPoints(curves?: boolean): VertexContainer {
    const out = new VertexContainer();
    out.addVertex(Vertex.Command.Move, this.x, this.y);
    let node: PolyLineExtended | null = this;
    if (curves) {
      const start: PolyLineExtended = (node = node.currCurve || node);
      do {
        if (void 0 !== node.cx1 && void 0 !== node.cx2) {
          const end = node.nextCurve as PolyLineExtended;
          out.addVertex(Vertex.Command.Curve2, end.x, end.y);
          out.addVertex(Vertex.Command.Curve2, node.cx1, node.cy1 as number);
          out.addVertex(Vertex.Command.Curve2, node.cx2, node.cy2 as number);
          node = node.nextCurve;
        } else if (void 0 !== node.cx1) {
          const end = node.nextCurve as PolyLineExtended;
          out.addVertex(Vertex.Command.Curve, end.x, end.y);
          out.addVertex(Vertex.Command.Curve, node.cx1, node.cy1 as number);
          node = node.nextCurve;
        } else if (void 0 !== node.cx2) {
          const end = node.nextCurve as PolyLineExtended;
          out.addVertex(Vertex.Command.Curve, end.x, end.y);
          out.addVertex(Vertex.Command.Curve, node.cx2, node.cy2 as number);
          node = node.nextCurve;
        } else if (node.isLast) {
          node = node.next as PolyLineExtended;
          out.addVertex(Vertex.Command.Move, node.x, node.y);
        } else {
          node = node.next as PolyLineExtended;
          out.addVertex(Vertex.Command.Line, node.x, node.y);
        }
      } while (node && node !== start);
    } else {
      do {
        const current: PolyLineExtended = node;
        if (void 0 !== current.cx1 && void 0 !== current.cx2) {
          const end = current.next as PolyLineExtended;
          out.addVertex(Vertex.Command.Curve2, end.x, end.y);
          out.addVertex(Vertex.Command.Curve2, current.cx1, current.cy1 as number);
          out.addVertex(Vertex.Command.Curve2, current.cx2, current.cy2 as number);
          node = current.next;
        } else if (void 0 !== current.cx1) {
          const end = current.next as PolyLineExtended;
          out.addVertex(Vertex.Command.Curve, end.x, end.y);
          out.addVertex(Vertex.Command.Curve, current.cx1, current.cy1 as number);
          node = current.next;
        } else if (void 0 !== current.cx2) {
          const end = current.next as PolyLineExtended;
          out.addVertex(Vertex.Command.Curve, end.x, end.y);
          out.addVertex(Vertex.Command.Curve, current.cx2, current.cy2 as number);
          node = current.next;
        } else if ((node = current.next)) {
          if ((node.prev as PolyLineExtended).isLast)
            out.addVertex(Vertex.Command.Move, node.x, node.y);
          else out.addVertex(Vertex.Command.Line, node.x, node.y);
        }
      } while (node && node !== this);
    }
    if (node) out.addVertex(Vertex.Command.Close, 0, 0);
    return out;
  }

  /**
   * One ring per sub-path, with the curves unflattened again (a curve's
   * start keeps its control points, its flattened nodes are skipped).
   */
  getSimplePolyLines(): PolyLineExtended[] {
    let cx1: number | undefined;
    let cy1: number | undefined;
    let cx2: number | undefined;
    let cy2: number | undefined;
    let ring = new PolyLineExtended();
    const out: PolyLineExtended[] = [];
    let node: PolyLineExtended = this;
    do {
      if (node.nextCurve) {
        cx1 = node.cx1;
        cx2 = node.cx2;
        cy1 = node.cy1;
        cy2 = node.cy2;
      } else cx1 = cx2 = cy1 = cy2 = void 0;
      const added = ring.appendPoint(node.x, node.y, cx1, cy1, cx2, cy2);
      added.index = node.index;
      added.corresponding = node.corresponding;
      added.prevInside = node.prevInside;
      added.nextInside = node.nextInside;
      if (node.isLast) {
        out.push(ring);
        ring = new PolyLineExtended();
      }
      node = node.nextCurve || node.next || this;
    } while (node !== this);
    if (ring.next && !out.length) out.push(ring);
    return out;
  }

  /** Adds a node before this one (the ring's end); the first call fills this node. */
  appendPoint(
    x: number,
    y: number,
    cx1?: number,
    cy1?: number,
    cx2?: number,
    cy2?: number,
  ): PolyLineExtended {
    if (null == this.prev) {
      this.x = x;
      this.y = y;
      if (void 0 !== cx1) {
        this.cx1 = cx1;
        this.cy1 = cy1;
      }
      if (void 0 !== cx2) {
        this.cx2 = cx2;
        this.cy2 = cy2;
      }
      this.next = this;
      this.prev = this;
      return this;
    }
    const last = this.prev;
    const node = new PolyLineExtended();
    node.x = x;
    node.y = y;
    if (void 0 !== cx1) {
      node.cx1 = cx1;
      node.cy1 = cy1;
    }
    if (void 0 !== cx2) {
      node.cx2 = cx2;
      node.cy2 = cy2;
    }
    this.prev = node;
    node.next = this;
    node.prev = last;
    last.next = node;
    return node;
  }

  /** Marks this node and its counterpart as visited. */
  visit(): void {
    this.visited = true;
    if (!(null === this.corresponding || this.corresponding.visited)) this.corresponding.visit();
  }

  isInside(point: XY, policy: number): number {
    return policy === PIP_CHECK_ODDEVEN ? this.getOddEven(point) : this.getWinding(point);
  }

  /**
   * Point in polygon test that follows curves. Any `policy` given means
   * odd-even, none means winding (as the old code read its argument).
   * `subPath` wraps around at the end of the sub-path instead of the ring.
   */
  isInsideBezier(point: XY, policy?: number, subPath?: boolean): number {
    let winding = 0;
    let node: PolyLineExtended = this;
    const start = node;
    let next = node.next as PolyLineExtended;
    const py = point.y;
    policy = void 0 === policy ? PIP_CHECK_WINDING : PIP_CHECK_ODDEVEN;
    let hasCurves = false;
    do {
      if (void 0 !== node.cx1) {
        hasCurves = true;
        break;
      }
      next = (node = node.next as PolyLineExtended).next || start;
    } while (node !== start);
    if (hasCurves) return this._isInsideBezier(point, policy, subPath);
    if (subPath && policy === PIP_CHECK_ODDEVEN) return this.getOddEven(point);
    do {
      if (node.y <= py) {
        if (next.y > py && this.isLeft(node, next, point) > 0) ++winding;
      } else if (next.y <= py && this.isLeft(node, next, point) < 0) --winding;
      node = node.next as PolyLineExtended;
      next = subPath && node.isLast ? node._firstInLoop() : node.next || start;
    } while (node !== start);
    return policy === PIP_CHECK_ODDEVEN ? Math.abs(winding) % 2 : Math.abs(winding);
  }

  /** The inside test by summing the winding angle along the curves. */
  _isInsideBezier(point: XY, policy: number, subPath?: boolean): number {
    let node: PolyLineExtended = this;
    const start = node;
    let next = node.next as PolyLineExtended;
    let angle = 0;
    if (subPath && start.isLast) next = start._firstInLoop();
    do {
      let x1: number;
      let y1: number;
      let x2: number;
      let y2: number;
      if (void 0 === node.cx1) {
        x1 = 0.5 * (node.x + next.x);
        y1 = 0.5 * (node.y + next.y);
      } else {
        x1 = node.cx1;
        y1 = node.cy1 as number;
      }
      if (void 0 === node.cx2) {
        // Degree elevation of the quadratic (or of the line's midpoint).
        const cx = x1;
        const cy = y1;
        x1 = node.x + (2 / 3) * (cx - node.x);
        y1 = node.y + (2 / 3) * (cy - node.y);
        x2 = next.x + (2 / 3) * (cx - next.x);
        y2 = next.y + (2 / 3) * (cy - next.y);
      } else {
        x2 = node.cx2;
        y2 = node.cy2 as number;
      }
      angle += this._windingAngle(point, node.x, node.y, x1, y1, x2, y2, next.x, next.y);
      node = node.next as PolyLineExtended;
      next = subPath && node.isLast ? node._firstInLoop() : node.next || start;
    } while (node !== start);
    return policy === PIP_CHECK_ODDEVEN
      ? Math.floor(Math.abs(angle) / (2 * Math.PI - 1e-10)) % 2
      : Math.abs(angle) > 2 * Math.PI - 1e-10
        ? 1
        : 0;
  }

  /** The angle the cubic (x0, y0)..(x3, y3) sweeps around `point`. */
  _windingAngle(
    point: XY,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ): number {
    let toStart = GMath.ptSqrDist(point.x, point.y, x0, y0);
    if (toStart < 1e-10 * 1e-10) return 0;
    let toEnd = GMath.ptSqrDist(point.x, point.y, x3, y3);
    if (toEnd < 1e-10 * 1e-10) return 0;
    const leg0 = GMath.ptDist(x0, y0, x1, y1);
    const leg1 = GMath.ptDist(x1, y1, x2, y2);
    const leg2 = GMath.ptDist(x2, y2, x3, y3);
    toStart = Math.sqrt(toStart);
    toEnd = Math.sqrt(toEnd);
    if (leg0 + leg1 + leg2 > Math.max(toStart, toEnd)) {
      const leftX = new Float64Array(4);
      const leftY = new Float64Array(4);
      const rightX = new Float64Array(4);
      const rightY = new Float64Array(4);
      GMath.getCtrlPtsCasteljau(x0, x1, x2, x3, 0.5, null, leftX, rightX);
      GMath.getCtrlPtsCasteljau(y0, y1, y2, y3, 0.5, null, leftY, rightY);
      const lx = (i: number): number => leftX[i] as number;
      const ly = (i: number): number => leftY[i] as number;
      const rx = (i: number): number => rightX[i] as number;
      const ry = (i: number): number => rightY[i] as number;
      return (
        this._windingAngle(point, lx(0), ly(0), lx(1), ly(1), lx(2), ly(2), lx(3), ly(3)) +
        this._windingAngle(point, rx(0), ry(0), rx(1), ry(1), rx(2), ry(2), rx(3), ry(3))
      );
    }
    const center = new Point(point.x, point.y);
    return GMath.getTurnAngle(center, new Point(x0, y0), center, new Point(x3, y3));
  }

  /** Whether `point` lies on one of the ring's segments. */
  hasPoint(point: XY): boolean {
    let node: PolyLineExtended = this;
    const px = point.x;
    const py = point.y;
    // (The old code also looked up the loop start here without using it.)
    do {
      const next = node.next as PolyLineExtended;
      if (GMath.sqrSegmentDist(node.x, node.y, next.x, next.y, px, py) < 1e-10 * 1e-10) return true;
      node = next;
    } while (node !== this);
    return false;
  }

  /** Odd-even test over the ring (sub-paths wrap at their ends): 1 inside, 0 outside. */
  getOddEven(point: XY): number {
    let node: PolyLineExtended = this;
    let inside = 0;
    const start = node;
    let next = node.next as PolyLineExtended;
    const px = point.x;
    const py = point.y;
    if (start.isLast) next = start._firstInLoop();
    do {
      if (
        ((node.y < py && next.y >= py) || (next.y < py && node.y >= py)) &&
        (node.x <= px || next.x <= px)
      ) {
        inside ^= Number(node.x + ((py - node.y) / (next.y - node.y)) * (next.x - node.x) < px);
      }
      node = node.next as PolyLineExtended;
      next = node.isLast ? node._firstInLoop() : node.next || start;
    } while (node !== start);
    return inside ? 1 : 0;
  }

  /** Which side of the line a-b `point` is on (positive: left). */
  isLeft(a: XY, b: XY, point: XY): number {
    return (b.x - a.x) * (point.y - a.y) - (point.x - a.x) * (b.y - a.y);
  }

  /** Absolute winding number over the ring (sub-paths wrap at their ends). */
  getWinding(point: XY): number {
    let winding = 0;
    let node: PolyLineExtended = this;
    const start = node;
    let next = node.next as PolyLineExtended;
    const py = point.y;
    if (start.isLast) next = start._firstInLoop();
    do {
      if (node.y <= py) {
        if (next.y > py && this.isLeft(node, next, point) > 0) ++winding;
      } else if (next.y <= py && this.isLeft(node, next, point) < 0) --winding;
      node = node.next as PolyLineExtended;
      next = node.isLast ? node._firstInLoop() : node.next || start;
    } while (node !== start);
    return Math.abs(winding);
  }
}
