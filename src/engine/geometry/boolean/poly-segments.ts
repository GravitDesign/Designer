// Old: chunk.vendor.js module 187 (polygon intersector, no G name).
/* eslint-disable @typescript-eslint/no-this-alias -- the ring and list walks start at this node */
import { GMath } from "../../math/math.ts";
import { Point } from "../../math/point.ts";
import type { Rect } from "../../math/rect.ts";
import type { Transform } from "../../math/transform.ts";
import { QuadTree } from "../quadtree.ts";
import { Vertex } from "../vertex.ts";
import { VertexContainer } from "../vertex-container.ts";
import { VertexInfo } from "../vertex-info.ts";
import type { VertexReader } from "../vertex-source.ts";
import { intersect as intersectSegments } from "./intersection.ts";
import { IntersectionPoint } from "./intersection-point.ts";

/**
 * One vertex of a flattened polygon, kept as a singly linked list that
 * ends in an empty node (point null). Curves are flattened into several
 * nodes; with retainBezier the first node of a curve (`currCurve` of all
 * its nodes) keeps the control points and `nextCurve`, the node where the
 * curve ends. `m` is the node's parameter on its curve. The node is also
 * the quadtree box of the segment that starts at it.
 */
export class PolyLine {
  next: PolyLine | null = null;
  point: Point | null = null;
  cp1: Point | null = null;
  cp2: Point | null = null;
  nextCurve: PolyLine | null = null;
  currCurve: PolyLine | null = null;
  width = 0;
  height = 0;
  x = 0;
  y = 0;
  m = 0;
  seg = 0;
  index = 0;
  isLast = false;
  isLastSegment = false;
  isIsect = false;
  /** On the last segment of a sub-path: the segment number its sub-path starts with. */
  firstSegNum: number | undefined = undefined;

  /** Fills this (empty) node and returns a new empty node after it. */
  insertPoint(x: number, y: number, m: number, seg: number, currCurve?: PolyLine | null): PolyLine {
    this.point = new Point(x, y);
    this.m = m;
    this.seg = seg;
    this.currCurve = currCurve ?? null;
    this.next = new PolyLine();
    return this.next;
  }

  /**
   * Inserts a node at (x, y) after this one and returns it. Unless
   * `force`, a point equal to this one or to the next plain node is
   * reused instead.
   */
  appendPoint(x: number, y: number, force?: boolean): PolyLine {
    if (!force) {
      const point = this.point as Point;
      if (!this.isIsect && GMath.isEqualEps(point.getX(), x) && GMath.isEqualEps(point.getY(), y)) {
        // The old code logged "possibly invalid appended intersection"
        // here when this node ends a sub-path.
        return this;
      }
      const next = this.next;
      if (
        next &&
        next.point &&
        !next.isIsect &&
        !next.isLast &&
        GMath.isEqualEps(next.point.getX(), x) &&
        GMath.isEqualEps(next.point.getY(), y)
      )
        return next;
    }
    const inserted = new PolyLine();
    inserted.point = new Point(x, y);
    inserted.next = this.next;
    this.next = inserted;
    return inserted;
  }

  /** Odd-even point in polygon test over the whole list: 1 inside, 0 outside. */
  getOddEven(point: Point | null): number {
    let current: PolyLine = this;
    let inside = 0;
    const first = current;
    let next = current.next;
    if (!point || !next || !next.point) return 0;
    const px = point.getX();
    const py = point.getY();
    do {
      const x1 = (current.point as Point).getX();
      const y1 = (current.point as Point).getY();
      const x2 = (next.point as Point).getX();
      const y2 = (next.point as Point).getY();
      if (((y1 < py && y2 >= py) || (y2 < py && y1 >= py)) && (x1 <= px || x2 <= px)) {
        inside ^= Number(x1 + ((py - y1) / (y2 - y1)) * (x2 - x1) < px);
      }
      current = next;
      next = current.next as PolyLine;
      if (!next.point) next = first;
    } while (current !== first);
    return inside ? 1 : 0;
  }

  /** Absolute winding number of `point` over the whole list. */
  getWinding(point: Point | null): number {
    let winding = 0;
    let current: PolyLine = this;
    const first = current;
    let next = current.next;
    if (!point || !next || !next.point) return winding;
    const px = point.getX();
    const py = point.getY();
    do {
      const x1 = (current.point as Point).getX();
      const y1 = (current.point as Point).getY();
      const x2 = (next.point as Point).getX();
      const y2 = (next.point as Point).getY();
      if (y1 <= py) {
        if (y2 > py && GMath.segmentSide(x1, y1, x2, y2, px, py) > 0) ++winding;
      } else if (y2 <= py && GMath.segmentSide(x1, y1, x2, y2, px, py) < 0) --winding;
      current = next;
      next = current.next as PolyLine;
      if (!next.point) next = first;
    } while (current !== first);
    return Math.abs(winding);
  }

  /**
   * Whether the segment starting here and the one starting at `other`
   * lie on each other. For `other` on a curve only the piece of the
   * curve between the two nodes' parameters is compared.
   */
  collinear(other: PolyLine): boolean {
    const ax: number[] = [];
    const bx: number[] = [];
    const ay: number[] = [];
    const by: number[] = [];
    if (
      !(this.next as PolyLine).point ||
      !(other.next as PolyLine).point ||
      this.isLast ||
      other.isLast
    )
      return false;
    const curve = this.currCurve;
    const otherCurve = other.currCurve;
    if (
      (curve && !(curve.nextCurve as PolyLine).point) ||
      (otherCurve && !(otherCurve.nextCurve as PolyLine).point)
    )
      return false;
    if (curve) {
      ax.push((curve.point as Point).getX(), (curve.cp1 as Point).getX());
      ay.push((curve.point as Point).getY(), (curve.cp1 as Point).getY());
      if (curve.cp2) {
        ax.push(curve.cp2.getX());
        ay.push(curve.cp2.getY());
      }
      ax.push(((curve.nextCurve as PolyLine).point as Point).getX());
      ay.push(((curve.nextCurve as PolyLine).point as Point).getY());
    } else {
      ax.push((this.point as Point).getX(), ((this.next as PolyLine).point as Point).getX());
      ay.push((this.point as Point).getY(), ((this.next as PolyLine).point as Point).getY());
    }
    if (otherCurve) {
      const t0 = other.m;
      const t1 = (other.next as PolyLine).m || 1;
      const start = otherCurve.point as Point;
      const end = (otherCurve.nextCurve as PolyLine).point as Point;
      const cp1 = otherCurve.cp1 as Point;
      if (otherCurve.cp2) {
        GMath.getCtrlPts(start.getX(), end.getX(), cp1.getX(), otherCurve.cp2.getX(), t0, t1, bx);
        GMath.getCtrlPts(start.getY(), end.getY(), cp1.getY(), otherCurve.cp2.getY(), t0, t1, by);
      } else {
        GMath.getCtrlPtsQuadratic(start.getX(), end.getX(), cp1.getX(), t0, t1, bx);
        GMath.getCtrlPtsQuadratic(start.getY(), end.getY(), cp1.getY(), t0, t1, by);
      }
    } else {
      bx.push((other.point as Point).getX(), ((other.next as PolyLine).point as Point).getX());
      by.push((other.point as Point).getY(), ((other.next as PolyLine).point as Point).getY());
    }
    return VertexInfo.collinear(ax, ay, bx, by, 1e-10);
  }

  /** Sets x, y, width and height to the box of the segment starting here. */
  generateAABB(): void {
    const start = this.point;
    let end: Point | null;
    if (start && this.next && !this.isLastSegment && (end = this.next.point)) {
      const x1 = start.getX();
      const x2 = end.getX();
      const y1 = start.getY();
      const y2 = end.getY();
      if (x1 < x2) {
        this.width = x2 - x1;
        this.x = x1;
      } else {
        this.width = x1 - x2;
        this.x = x2;
      }
      if (y1 < y2) {
        this.height = y2 - y1;
        this.y = y1;
      } else {
        this.height = y1 - y2;
        this.y = y2;
      }
    }
  }

  /** Unsigned area of the list as one polygon. */
  area(): number {
    let sum = 0;
    let current: PolyLine = this;
    let next: PolyLine | null = current.next;
    if (!current.point || !next || !next.point) return 0;
    do {
      sum += (current.point as Point).cross((next as PolyLine).point as Point);
      current = next as PolyLine;
      next = current.next;
      if (next && !next.point) next = this;
    } while (current !== this);
    return (sum /= 2) < 0 ? -sum : sum;
  }

  centroid(): Point {
    let cross: number;
    let sum = 0;
    let current: PolyLine = this;
    let next: PolyLine | null = current.next;
    let x = 0;
    let y = 0;
    if (!current.point || !next || !next.point) return new Point(0, 0);
    do {
      const a = current.point as Point;
      const b = (next as PolyLine).point as Point;
      sum += cross = a.cross(b);
      x += (a.getX() + b.getX()) * cross;
      y += (a.getY() + b.getY()) * cross;
      current = next as PolyLine;
      next = current.next;
      if (next && !next.point) next = this;
    } while (current !== this);
    return new Point(x / (sum *= 3), y / sum);
  }

  /**
   * Numbers the sub-paths from `start` on (each node gets its sub-path's
   * number in `index`) and returns the next free number.
   */
  markIndices(start?: number): number {
    let node: PolyLine | null = this.currCurve || this;
    const first = start || 0;
    let index = first || 0;
    do {
      node = node as PolyLine;
      node.index = index;
      if (node.isLast) index++;
      node = node.nextCurve || node.next;
    } while (node && node.point);
    if (index === first) index++;
    return index;
  }
}

/** redistributeVertexSource's result: groups of sub-paths and their polygons. */
export class RedistributionResult {
  containers: (VertexReader | VertexContainer)[][] = [];
  polys: PolyLine[][] = [];
}

/** A vertex source that may carry an element's cached geometry box. */
interface WithGeometryBBox {
  _geometryBBox?: Rect | null;
}

/**
 * The slope of an intersection point on a flattened segment: the
 * segment's start parameter plus the point's share of the segment
 * length, mapped onto the curve parameters m0..m1.
 */
function slopeOnSegment(
  m0: number,
  m1: number,
  seg0: number,
  seg1: number,
  point: Point,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const px = point.getX();
  const py = point.getY();
  let share = Math.sqrt(GMath.ptSqrDist(x0, y0, px, py) / GMath.ptSqrDist(x0, y0, x1, y1));
  if (m1 < m0) m1 = 1;
  if (share > 1) share = 1;
  if (seg0 !== seg1 || (0 == m0 && 0 == m1)) m1 = 1;
  return m0 + share * (m1 - m0);
}

/**
 * Flattens vertex sources into PolyLine lists and finds the
 * intersections of two of them with a quadtree. With retainBezier the
 * intersections of curves are computed on the curves themselves
 * (intersection.ts) and inserted into the curves by splitting them.
 */
export class PolyIntersector {
  static PolyLine = PolyLine;
  static RedistributionResult = RedistributionResult;

  _firstIntersect = false;
  _polyLine0: PolyLine | null = null;
  _polyLine1: PolyLine | null = null;
  _slopesAsLengths = false;
  _closed: boolean | undefined = false;
  _retainBezier: boolean | undefined = false;
  _useIntersector: boolean | undefined = false;
  _blockIntersector: boolean | undefined = false;
  _approximationScale: number | undefined = undefined;
  bezierToleranceSq = 0;
  qtree: QuadTree<PolyLine> | null = null;

  constructor(
    closed?: boolean,
    retainBezier?: boolean,
    useIntersector?: boolean,
    approximationScale?: number,
    blockIntersector?: boolean,
  ) {
    this._closed = closed;
    this._retainBezier = retainBezier;
    this._useIntersector = useIntersector;
    this._blockIntersector = blockIntersector;
    if (approximationScale !== undefined) this._approximationScale = approximationScale;
  }

  /**
   * Splits a source into sub-paths and groups each outer sub-path with
   * the ones inside it (the first level of nesting only). Sub-paths that
   * cross another aren't nested.
   */
  static redistributeVertexSource(
    source: VertexReader,
    transform?: Transform | null,
  ): RedistributionResult {
    const parts = VertexContainer.splitVertexSource(source, transform);
    const polys: PolyLine[] = [];
    const inside: (number[] | null)[] = [];
    const intersector = new PolyIntersector();
    for (let a = 0; a < parts.length; a++) {
      polys.push(intersector._makePolygon(parts[a] as VertexReader));
      inside.push([]);
    }
    for (let a = 0; a < parts.length; a++) {
      for (let b = a + 1; b < parts.length; b++) {
        const polyA = polys[a] as PolyLine;
        const polyB = polys[b] as PolyLine;
        if (
          !intersector.intersect(
            parts[a] as VertexReader,
            parts[b] as VertexReader,
            false,
            true,
            polyA,
            polyB,
          )
        ) {
          if (polyA.getOddEven(polyB.point)) (inside[a] as number[]).push(b);
          else if (polyB.getOddEven(polyA.point)) (inside[b] as number[]).push(a);
        }
      }
    }
    const containers: (VertexReader | VertexContainer)[][] = [];
    const groups: PolyLine[][] = [];
    for (let a = 0; a < inside.length; a++) {
      const children = inside[a];
      if (children) {
        for (let b = 0; b < children.length; b++) {
          const child = children[b] as number;
          if (inside[child]) inside[child] = null;
        }
      }
    }
    for (let a = 0; a < inside.length; a++) {
      const children = inside[a];
      if (children) {
        const group = [parts[a] as VertexReader];
        const groupPolys = [polys[a] as PolyLine];
        for (let b = 0; b < children.length; b++) {
          group.push(parts[children[b] as number] as VertexReader);
          groupPolys.push(polys[children[b] as number] as PolyLine);
        }
        containers.push(group);
        groups.push(groupPolys);
      }
    }
    const result = new RedistributionResult();
    result.containers = containers;
    result.polys = groups;
    return result;
  }

  static polyFromVertexSource(
    source: VertexReader,
    slopesAsLengths: boolean,
    closed?: boolean,
  ): PolyLine {
    const intersector = new PolyIntersector(closed, false, false, 2);
    intersector._slopesAsLengths = slopesAsLengths;
    return intersector._makePolygon(source);
  }

  /** A quadtree with the segment boxes of a polygon. */
  static quadTreeFromPolygon(poly: PolyLine): QuadTree<PolyLine> | null {
    let x: number;
    let y: number;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    if (!poly.next) return null;
    const first = poly;
    let node = poly;
    while (node.point) {
      if ((x = node.point.getX()) < minX) minX = x;
      if (x > maxX) maxX = x;
      if ((y = node.point.getY()) < minY) minY = y;
      if (y > maxY) maxY = y;
      node = node.next as PolyLine;
    }
    const tree = new QuadTree<PolyLine>(
      { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      10,
      10,
    );
    for (node = first; (node.next as PolyLine).point;) {
      if (!node.isLastSegment) {
        node.generateAABB();
        tree.insert(node);
      }
      node = node.next as PolyLine;
    }
    return tree;
  }

  /**
   * The intersections of two sources (or of a source with itself).
   * `lines` intersects the flattened segments only and skips segments
   * that share an end point. With `firstOnly` it only answers whether
   * there is one: a (possibly empty) array if so, null if not. The
   * polygons can be passed in when they are already made.
   */
  intersect(
    source0: VertexReader,
    source1: VertexReader,
    lines?: boolean,
    firstOnly?: boolean,
    poly0?: PolyLine | null,
    poly1?: PolyLine | null,
  ): IntersectionPoint<PolyLine>[] | null {
    const bbox0 = (source0 as WithGeometryBBox)._geometryBBox;
    const bbox1 = (source1 as WithGeometryBBox)._geometryBBox;
    // The old code passes the second source itself (not its box) to
    // intersectsRect; kept.
    if (
      bbox0 &&
      bbox1 &&
      !bbox0.isEmpty() &&
      !bbox1.isEmpty() &&
      !bbox0.intersectsRect(source1 as unknown as Rect)
    )
      return firstOnly ? null : [];
    let x: number;
    let y: number;
    const first = poly0 || this._makePolygon(source0);
    const second = source0 === source1 ? first : poly1 || this._makePolygon(source1);
    let node = second;
    let lastSeg = 0;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    while (node.point) {
      lastSeg = node.seg;
      if ((x = node.point.getX()) < minX) minX = x;
      if (x > maxX) maxX = x;
      if ((y = node.point.getY()) < minY) minY = y;
      if (y > maxY) maxY = y;
      node = node.next as PolyLine;
    }
    this.qtree = new QuadTree<PolyLine>(
      { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      10,
      10,
    );
    this._addPoly(second);
    this._polyLine0 = first;
    this._polyLine1 = second;
    this._firstIntersect = firstOnly || false;
    return this._treeIntersect(first, source0 === source1, lines, lastSeg);
  }

  /** The segment after which `point` belongs, searched from `segment` on. */
  _getPlacement(segment: PolyLine, point: Point): PolyLine {
    const start = segment.point as Point;
    const distance = GMath.ptSqrDist(point.getX(), point.getY(), start.getX(), start.getY());
    let current = segment;
    let next = segment.next as PolyLine;
    if (!next.point) return segment;
    do {
      if (
        !current.isLastSegment &&
        distance <=
          GMath.ptSqrDist(start.getX(), start.getY(), next.point.getX(), next.point.getY())
      )
        return current;
      current = current.next as PolyLine;
      next = current.next as PolyLine;
    } while (next.point);
    return segment;
  }

  /**
   * Inserts the intersection points into both polygons and points each
   * intersection's polySeg0/polySeg1 at its node. With retainBezier the
   * curves are split at the intersections: every piece gets its own
   * control points.
   */
  addIntersectionsToPolygon(intersections: IntersectionPoint<PolyLine>[]): void {
    let isect: IntersectionPoint<PolyLine>;
    let point: Point;
    if (this._retainBezier) {
      for (let which = 0; which < 2; which++) {
        const key = which === 0 ? "polySeg0" : "polySeg1";
        const slopeKey = which === 0 ? "slope0" : "slope1";
        const bySegment: IntersectionPoint<PolyLine>[][] = [];
        for (let s = intersections.length - 1; s >= 0; s--) {
          isect = intersections[s] as IntersectionPoint<PolyLine>;
          const segment = isect[key];
          if (isect[key].currCurve) {
            const list = bySegment[segment.seg];
            if (list) list.push(isect);
            else bySegment[segment.seg] = [isect];
          } else if (((point = isect.pt), Point.equals(point, segment.point))) {
            isect[key].isIsect = true;
          } else {
            const placement = this._getPlacement(segment, point);
            if (placement.currCurve) {
              isect[key] = placement;
              const list = bySegment[placement.seg];
              if (list) list.push(isect);
              else bySegment[placement.seg] = [isect];
            } else {
              isect[key] = placement.appendPoint(point.getX(), point.getY());
              isect[key].isIsect = true;
            }
          }
        }
        bySegment.forEach((group) => {
          if (!group) return;
          if (which === 0) group.sort((a, b) => a.slope0 - b.slope0);
          else group.sort((a, b) => a.slope1 - b.slope1);
          let pieceStart: PolyLine;
          let node = (group[0] as IntersectionPoint<PolyLine>)[key].currCurve as PolyLine;
          const start = node.point as Point;
          const curveEnd = node.nextCurve as PolyLine;
          const end = curveEnd.point as Point;
          let lastSlope = 0;
          if (node.cp1 && node.cp2) {
            const xs = new Float64Array(4);
            const ys = new Float64Array(4);
            const cp1 = node.cp1;
            const cp2 = node.cp2;
            for (let hitIndex = 0; hitIndex < group.length; hitIndex++) {
              const hit = group[hitIndex] as IntersectionPoint<PolyLine>;
              const slope = hit[slopeKey];
              point = hit.pt;
              pieceStart = node;
              while (
                node.next !== curveEnd &&
                !(slope <= (node.next as PolyLine).m || node.next === curveEnd)
              )
                node = node.next as PolyLine;
              node = hit[key] = node.appendPoint(point.getX(), point.getY(), true);
              node.isIsect = true;
              if (pieceStart !== node) {
                if (GMath.isEqualEps(lastSlope, slope, 1e-8)) {
                  if (pieceStart.nextCurve) {
                    pieceStart.nextCurve = null;
                    pieceStart.cp1 = null;
                    pieceStart.cp2 = null;
                  }
                } else {
                  GMath.getCtrlPts(
                    start.getX(),
                    end.getX(),
                    cp1.getX(),
                    cp2.getX(),
                    lastSlope,
                    slope,
                    xs,
                  );
                  GMath.getCtrlPts(
                    start.getY(),
                    end.getY(),
                    cp1.getY(),
                    cp2.getY(),
                    lastSlope,
                    slope,
                    ys,
                  );
                  pieceStart.cp1 = new Point(xs[1] as number, ys[1] as number);
                  pieceStart.cp2 = new Point(xs[2] as number, ys[2] as number);
                  pieceStart.nextCurve = node;
                }
              }
              for (let n: PolyLine = pieceStart; n !== node; n = n.next as PolyLine)
                n.currCurve = pieceStart;
              lastSlope = slope;
              if (node === curveEnd) break;
            }
            if (curveEnd !== node) {
              if (GMath.isEqualEps(lastSlope, 1, 1e-8)) {
                if (node.nextCurve) {
                  node.nextCurve = null;
                  node.cp1 = null;
                  node.cp2 = null;
                }
              } else {
                GMath.getCtrlPts(
                  start.getX(),
                  end.getX(),
                  cp1.getX(),
                  cp2.getX(),
                  lastSlope,
                  1,
                  xs,
                );
                GMath.getCtrlPts(
                  start.getY(),
                  end.getY(),
                  cp1.getY(),
                  cp2.getY(),
                  lastSlope,
                  1,
                  ys,
                );
                node.cp1 = new Point(xs[1] as number, ys[1] as number);
                node.cp2 = new Point(xs[2] as number, ys[2] as number);
                node.nextCurve = curveEnd;
              }
            }
            // (The old code logged "huuu huuu" when the last hit is the curve's end.)
            for (let n: PolyLine = node; n !== curveEnd; n = n.next as PolyLine) n.currCurve = node;
          } else {
            const xs = new Float64Array(3);
            const ys = new Float64Array(3);
            const cp1 = node.cp1 as Point;
            for (let hitIndex = 0; hitIndex < group.length; hitIndex++) {
              const hit = group[hitIndex] as IntersectionPoint<PolyLine>;
              const slope = hit[slopeKey];
              point = hit.pt;
              pieceStart = node;
              while (
                node.next !== curveEnd &&
                !(slope <= (node.next as PolyLine).m || node.next === curveEnd)
              )
                node = node.next as PolyLine;
              node = hit[key] = node.appendPoint(point.getX(), point.getY(), true);
              node.isIsect = true;
              if (pieceStart !== node) {
                if (GMath.isEqualEps(lastSlope, slope, 1e-8)) {
                  if (pieceStart.nextCurve) {
                    pieceStart.nextCurve = null;
                    pieceStart.cp1 = null;
                    pieceStart.cp2 = null;
                  }
                } else {
                  GMath.getCtrlPtsQuadratic(
                    start.getX(),
                    end.getX(),
                    cp1.getX(),
                    lastSlope,
                    slope,
                    xs,
                  );
                  GMath.getCtrlPtsQuadratic(
                    start.getY(),
                    end.getY(),
                    cp1.getY(),
                    lastSlope,
                    slope,
                    ys,
                  );
                  pieceStart.cp1 = new Point(xs[1] as number, ys[1] as number);
                  pieceStart.cp2 = null;
                  pieceStart.nextCurve = node;
                }
              }
              for (let n: PolyLine = pieceStart; n !== node; n = n.next as PolyLine)
                n.currCurve = pieceStart;
              lastSlope = slope;
              if (node === curveEnd) break;
            }
            if (curveEnd !== node) {
              if (GMath.isEqualEps(lastSlope, 1, 1e-8)) {
                if (node.nextCurve) {
                  node.nextCurve = null;
                  node.cp1 = null;
                  node.cp2 = null;
                }
              } else {
                GMath.getCtrlPtsQuadratic(start.getX(), end.getX(), cp1.getX(), lastSlope, 1, xs);
                GMath.getCtrlPtsQuadratic(start.getY(), end.getY(), cp1.getY(), lastSlope, 1, ys);
                node.cp1 = new Point(xs[1] as number, ys[1] as number);
                node.cp2 = null;
                node.nextCurve = curveEnd;
              }
            }
            // (The old code logged "huu huu 2" when the last hit is the curve's end.)
            for (let n: PolyLine = node; n !== curveEnd; n = n.next as PolyLine) n.currCurve = node;
          }
        });
      }
    } else {
      for (let s = intersections.length - 1; s >= 0; s--) {
        isect = intersections[s] as IntersectionPoint<PolyLine>;
        point = isect.pt;
        if (!Point.equals(point, isect.polySeg0.point))
          isect.polySeg0 = this._getPlacement(isect.polySeg0, point).appendPoint(
            point.getX(),
            point.getY(),
          );
        isect.polySeg0.isIsect = true;
        if (!Point.equals(point, isect.polySeg1.point))
          isect.polySeg1 = this._getPlacement(isect.polySeg1, point).appendPoint(
            point.getX(),
            point.getY(),
          );
        isect.polySeg1.isIsect = true;
      }
    }
  }

  getFirstPoly(): PolyLine | null {
    return this._polyLine0;
  }

  getSecondPoly(): PolyLine | null {
    return this._polyLine1;
  }

  _veq(a: Vertex, b: Vertex): boolean {
    return GMath.isEqualEps(a.x, b.x) && GMath.isEqualEps(a.y, b.y);
  }

  /**
   * Flattens a source into a PolyLine list. Every sub-path ends in a node
   * with isLast; its last segment has isLastSegment and firstSegNum.
   * With `_closed` open sub-paths are closed.
   */
  _makePolygon(source: VertexReader): PolyLine {
    let first: Vertex | null = null;
    let last: Vertex | null = first;
    let vertex = new Vertex();
    const head = new PolyLine();
    let cursor = head;
    let seg = 0;
    let firstSeg = seg;
    let closed = false;
    let previous: PolyLine | null = null;
    let node: PolyLine;
    for (source.rewindVertices(0); source.readVertex(vertex);) {
      switch (vertex.command) {
        case Vertex.Command.Move:
          if (!closed && this._closed && first && head.point) {
            // (The old code also cleared `last` here; the Move overwrites it.)
            if (last && !this._veq(last, first))
              cursor = cursor.insertPoint(last.x, last.y, 0, seg);
            cursor.isLast = true;
            cursor.firstSegNum = firstSeg;
            cursor.isLastSegment = true;
            cursor = cursor.insertPoint(first.x, first.y, 0, ++seg);
          } else if (first && previous) {
            previous.isLast = true;
            if ((node = previous) === cursor) {
              node.isLastSegment = true;
              node.firstSegNum = firstSeg;
            } else {
              while (node !== cursor) {
                if (node.next === cursor) {
                  node.isLastSegment = true;
                  node.firstSegNum = firstSeg;
                }
                node = node.next as PolyLine;
              }
            }
          }
          first = last = vertex;
          vertex = new Vertex();
          firstSeg = seg + 1;
          closed = false;
          break;
        case Vertex.Command.Line:
          if (last) {
            previous = cursor;
            cursor = cursor.insertPoint(last.x, last.y, 0, ++seg);
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
              previous = cursor;
              cursor = this._subdivideBezier(
                cursor,
                start.getX(),
                start.getY(),
                vertex.x,
                vertex.y,
                last.x,
                last.y,
                undefined,
                undefined,
                ++seg,
              );
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
            const end = new Point(vertex.x, vertex.y);
            last = vertex;
            vertex = new Vertex();
            const control2 = new Vertex();
            if (source.readVertex(vertex) && source.readVertex(control2)) {
              previous = cursor;
              cursor = this._subdivideBezier(
                cursor,
                start.getX(),
                start.getY(),
                vertex.x,
                vertex.y,
                control2.x,
                control2.y,
                end.getX(),
                end.getY(),
                ++seg,
              );
              vertex = new Vertex();
            }
          } else {
            last = vertex;
            vertex = new Vertex();
          }
          break;
        case Vertex.Command.Close:
          closed = true;
          if (first) {
            if (last && !this._veq(last, first)) {
              cursor = cursor.insertPoint(last.x, last.y, 0, seg);
              last = null;
            }
            previous = cursor;
            cursor = cursor.insertPoint(first.x, first.y, 0, ++seg);
          }
          break;
        default:
          // The old message built from an undefined global `vertex`, so
          // this threw a ReferenceError.
          throw new ReferenceError("vertex is not defined");
      }
    }
    if (!closed && this._closed && first && head.point) {
      if (last && !this._veq(first, last)) cursor = cursor.insertPoint(last.x, last.y, 0, seg);
      cursor.isLast = true;
      cursor.isLastSegment = true;
      cursor.firstSegNum = firstSeg;
      cursor.insertPoint(first.x, first.y, 0, seg + 1);
    } else if (!closed && last && head.point) {
      cursor.isLast = true;
      cursor.isLastSegment = true;
      cursor.firstSegNum = firstSeg;
      cursor.insertPoint(last.x, last.y, 0, seg);
    } else if (previous) {
      previous.isLast = true;
      if ((node = previous) === cursor) {
        node.isLastSegment = true;
        node.firstSegNum = firstSeg;
      } else {
        while (node !== cursor) {
          if (node.next === cursor) {
            node.isLastSegment = true;
            node.firstSegNum = firstSeg;
          }
          node = node.next as PolyLine;
        }
      }
    }
    return head;
  }

  _addPoly(poly: PolyLine): void {
    if (poly.next) {
      while ((poly.next as PolyLine).point) {
        if (!poly.isLastSegment) {
          poly.generateAABB();
          (this.qtree as QuadTree<PolyLine>).insert(poly);
        }
        poly = poly.next as PolyLine;
      }
    }
  }

  /**
   * Intersects every segment of `poly` with the segments of the second
   * polygon found in the quadtree. `seen` remembers segment pairs
   * (keyed (lastSeg + 1) * seg0 + seg1) so curve pairs are intersected
   * once and collinear pairs are dropped.
   */
  _treeIntersect(
    poly: PolyLine,
    samePoly: boolean,
    lines: boolean | undefined,
    lastSeg: number,
  ): IntersectionPoint<PolyLine>[] | null {
    let hit: Point | null;
    let x1: number;
    let y1: number;
    let x2: number;
    let y2: number;
    let ox1: number;
    let oy1: number;
    let ox2: number;
    let oy2: number;
    const found: IntersectionPoint<PolyLine>[] = [];
    const seen: Record<string, number> = {};
    if (!poly.next) return this._firstIntersect ? null : found;
    while ((poly.next as PolyLine).point) {
      if (poly.isLastSegment) {
        poly = poly.next as PolyLine;
        continue;
      }
      const next = poly.next as PolyLine;
      x1 = (poly.point as Point).getX();
      y1 = (poly.point as Point).getY();
      x2 = (next.point as Point).getX();
      y2 = (next.point as Point).getY();
      if (!samePoly) poly.generateAABB();
      const candidates = (this.qtree as QuadTree<PolyLine>).retrieve(poly);
      if (lines) {
        for (let v = 0; v < candidates.length; v++) {
          const other = candidates[v] as PolyLine;
          const otherNext = other.next as PolyLine;
          ox1 = (other.point as Point).getX();
          oy1 = (other.point as Point).getY();
          ox2 = (otherNext.point as Point).getX();
          oy2 = (otherNext.point as Point).getY();
          if (
            !(
              (x1 === ox1 && y1 === oy1) ||
              (x1 === ox2 && y1 === oy2) ||
              (x2 === ox1 && y2 === oy1) ||
              (x2 === ox2 && y2 === oy2)
            ) &&
            (hit = GMath.getIntersectionPoint(x1, y1, x2, y2, ox1, oy1, ox2, oy2))
          ) {
            if (this._firstIntersect) return found;
            if (!seen["" + x1 + x2 + y1 + y2 + ox1 + ox2 + oy1 + oy2]) {
              found.push(
                new IntersectionPoint(
                  hit,
                  slopeOnSegment(poly.m, next.m, poly.seg, next.seg, hit, x1, y1, x2, y2),
                  slopeOnSegment(
                    other.m,
                    otherNext.m,
                    other.seg,
                    otherNext.seg,
                    hit,
                    ox1,
                    oy1,
                    ox2,
                    oy2,
                  ),
                  poly,
                  other,
                ),
              );
              seen["" + ox1 + ox2 + oy1 + oy2 + x1 + x2 + y1 + y2] = 1;
            }
          }
        }
      } else {
        for (let v = 0; v < candidates.length; v++) {
          const other = candidates[v] as PolyLine;
          if (other.isLastSegment) throw new Error("QuadTree has invalid objects");
          let pair: number;
          let count: number;
          // Two cubics go through the flattened segments unless
          // useIntersector asks for the curve intersection anyway.
          let notBothCubic = true;
          if (other.currCurve && poly.currCurve && other.currCurve.cp2 && poly.currCurve.cp2)
            notBothCubic = false;
          if (
            this._retainBezier &&
            (this._useIntersector || notBothCubic) &&
            !this._blockIntersector
          ) {
            if (!(seen[(pair = (lastSeg + 1) * poly.seg + other.seg)] || 0)) {
              const hits = intersectSegments(poly, other);
              seen[pair] = 1;
              if (!hits || !hits.length) continue;
              for (let hitIndex = 0; hitIndex < hits.length; hitIndex++)
                this._addIsect(found, hits[hitIndex] as IntersectionPoint<PolyLine>);
              if (this._firstIntersect && found.length) return found;
            }
          } else if (this._retainBezier) {
            const otherNext = other.next as PolyLine;
            ox1 = (other.point as Point).getX();
            oy1 = (other.point as Point).getY();
            ox2 = (otherNext.point as Point).getX();
            oy2 = (otherNext.point as Point).getY();
            if (!(hit = GMath.getIntersectionPoint(x1, y1, x2, y2, ox1, oy1, ox2, oy2))) continue;
            if (this._firstIntersect) return found;
            let add: boolean | number;
            if (666 === (count = seen[(pair = (lastSeg + 1) * poly.seg + other.seg)] || 0))
              continue;
            if (other.collinear(poly) || poly.collinear(other)) {
              seen[pair] = 666;
              for (let foundIndex = found.length - 1; foundIndex >= 0; foundIndex--) {
                const earlier = found[foundIndex] as IntersectionPoint<PolyLine>;
                // Removes only this pair's hit. The old splice(foundIndex)
                // dropped every later hit too, also those of other pairs
                // (BUGS-FIXED.md "BUG-014 Boolean intersections: one
                // collinear pair drops every later hit, quadratic-vs-curve
                // hits unlimited").
                if ((lastSeg + 1) * earlier.polySeg0.seg + earlier.polySeg1.seg === pair)
                  found.splice(foundIndex, 1);
              }
              continue;
            }
            if (poly.currCurve || other.currCurve) {
              if (poly.currCurve) {
                if (other.currCurve) {
                  const curve = poly.currCurve;
                  const otherCurve = other.currCurve;
                  // A quadratic first is limited like the other way round;
                  // the old code gave the truthy constants 6 or 4 (BUG-014).
                  add = curve.cp2
                    ? otherCurve.cp2
                      ? count < 9
                      : count < 6
                    : otherCurve.cp2
                      ? count < 6
                      : count < 4;
                } else {
                  add = poly.currCurve.cp2 ? count < 3 : count < 2;
                }
              } else {
                add = (other.currCurve as PolyLine).cp2 ? count < 3 : count < 2;
              }
            } else {
              add = count < 1;
              seen[pair] = 1;
            }
            if (add)
              this._addIsect(
                found,
                new IntersectionPoint(
                  hit,
                  slopeOnSegment(poly.m, next.m, poly.seg, next.seg, hit, x1, y1, x2, y2),
                  slopeOnSegment(
                    other.m,
                    otherNext.m,
                    other.seg,
                    otherNext.seg,
                    hit,
                    ox1,
                    oy1,
                    ox2,
                    oy2,
                  ),
                  poly,
                  other,
                ),
              );
            if (add && (poly.currCurve || other.currCurve)) seen[pair] = count ? count + 1 : 1;
          } else {
            const otherNext = other.next as PolyLine;
            ox1 = (other.point as Point).getX();
            oy1 = (other.point as Point).getY();
            ox2 = (otherNext.point as Point).getX();
            oy2 = (otherNext.point as Point).getY();
            if ((hit = GMath.getIntersectionPoint(x1, y1, x2, y2, ox1, oy1, ox2, oy2))) {
              if (this._firstIntersect) return found;
              this._addIsect(
                found,
                new IntersectionPoint(
                  hit,
                  slopeOnSegment(poly.m, next.m, poly.seg, next.seg, hit, x1, y1, x2, y2),
                  slopeOnSegment(
                    other.m,
                    otherNext.m,
                    other.seg,
                    otherNext.seg,
                    hit,
                    ox1,
                    oy1,
                    ox2,
                    oy2,
                  ),
                  poly,
                  other,
                ),
              );
            }
          }
        }
      }
      poly = poly.next as PolyLine;
    }
    return this._firstIntersect ? null : found;
  }

  /**
   * Adds `isect` unless an equal intersection is already there: same
   * point, segments and slopes, where a slope of 1 counts as 0 on the
   * following segment.
   */
  _addIsect(found: IntersectionPoint<PolyLine>[], isect: IntersectionPoint<PolyLine>): void {
    const eps = 1e-10;
    const duplicate = found.some((other) => {
      if (!Point.equals(other.pt, isect.pt, 1e-9)) return false;
      let slope0 = other.slope0;
      let isectSlope0 = isect.slope0;
      let seg0: number | undefined = other.polySeg0.seg;
      let seg1: number | undefined = other.polySeg1.seg;
      let isectSeg0: number | undefined = isect.polySeg0.seg;
      let isectSeg1: number | undefined = isect.polySeg1.seg;
      if (GMath.isEqualEps(slope0, 1, eps)) {
        slope0 = 0;
        const next = other.polySeg0.next as PolyLine;
        seg0 = next.isLastSegment ? next.firstSegNum : next.seg;
      }
      if (GMath.isEqualEps(isectSlope0, 1, eps)) {
        isectSlope0 = 0;
        const next = isect.polySeg0.next as PolyLine;
        isectSeg0 = next.isLastSegment ? next.firstSegNum : next.seg;
      }
      let slope1 = other.slope1;
      let isectSlope1 = isect.slope1;
      if (GMath.isEqualEps(slope1, 1, eps)) {
        slope1 = 0;
        const next = other.polySeg1.next as PolyLine;
        seg1 = next.isLastSegment ? next.firstSegNum : next.seg;
      }
      if (GMath.isEqualEps(isectSlope1, 1, eps)) {
        isectSlope1 = 0;
        const next = isect.polySeg1.next as PolyLine;
        isectSeg1 = next.isLastSegment ? next.firstSegNum : next.seg;
      }
      return (
        seg0 === isectSeg0 &&
        seg1 === isectSeg1 &&
        GMath.isEqualEps(slope0, isectSlope0, eps) &&
        GMath.isEqualEps(slope1, isectSlope1, eps)
      );
    });
    if (!duplicate) found.push(isect);
  }

  /**
   * Flattens a quadratic (no x3/y3) or cubic bezier from (x0, y0) after
   * `cursor`. For a quadratic (x2, y2) is the end point, for a cubic the
   * second control point and (x3, y3) the end. Returns the new cursor.
   */
  _subdivideBezier(
    cursor: PolyLine,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number | undefined,
    y3: number | undefined,
    seg?: number,
  ): PolyLine {
    if (
      Number.isNaN(x0) ||
      Number.isNaN(x1) ||
      Number.isNaN(x2) ||
      Number.isNaN(x3) ||
      Number.isNaN(y0) ||
      Number.isNaN(y1) ||
      Number.isNaN(y2) ||
      Number.isNaN(y3)
    )
      return cursor;
    if (this._approximationScale !== undefined)
      this.bezierToleranceSq = 0.5 / this._approximationScale;
    else this.bezierToleranceSq = 0.25;
    this.bezierToleranceSq *= this.bezierToleranceSq;
    const curveStart = cursor;
    // The simplifier flattens without segment numbers, so its nodes get
    // seg undefined, as in the old code, although the field is a number.
    const segNumber = seg as number;
    cursor = cursor.insertPoint(x0, y0, 0, segNumber, curveStart);
    if (x3 !== undefined && y3 !== undefined)
      cursor = this._recursive_bezier4(
        cursor,
        x0,
        y0,
        x1,
        y1,
        x2,
        y2,
        x3,
        y3,
        0,
        1,
        segNumber,
        curveStart,
        0,
      );
    else
      cursor = this._recursive_bezier3(
        cursor,
        x0,
        y0,
        x1,
        y1,
        x2,
        y2,
        0,
        1,
        segNumber,
        curveStart,
        0,
      );
    if (this._slopesAsLengths) {
      let node = curveStart;
      let length = 0;
      for (node.m = 0; (node.next as PolyLine).point;) {
        const next = node.next as PolyLine;
        length += GMath.ptSqrDist(
          (node.point as Point).getX(),
          (node.point as Point).getY(),
          (next.point as Point).getX(),
          (next.point as Point).getY(),
        );
        next.m = length;
        node = next;
      }
      for (node = curveStart; node.point;) {
        node.m /= length;
        node = node.next as PolyLine;
      }
    }
    if (this._retainBezier) {
      curveStart.nextCurve = cursor;
      curveStart.cp1 = new Point(x1, y1);
      if (x3 !== undefined && y3 !== undefined) curveStart.cp2 = new Point(x2, y2);
    }
    return cursor;
  }

  /** Adaptive subdivision of a cubic (anti-grain geometry style). */
  _recursive_bezier4(
    cursor: PolyLine,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
    t0: number,
    t1: number,
    seg: number,
    curve: PolyLine,
    level: number,
  ): PolyLine {
    if (level > 32) return cursor;
    let k: number;
    const x12 = (x1 + x2) / 2;
    const y12 = (y1 + y2) / 2;
    const x23 = (x2 + x3) / 2;
    const y23 = (y2 + y3) / 2;
    const x34 = (x3 + x4) / 2;
    const y34 = (y3 + y4) / 2;
    const x123 = (x12 + x23) / 2;
    const y123 = (y12 + y23) / 2;
    const x234 = (x23 + x34) / 2;
    const y234 = (y23 + y34) / 2;
    const x1234 = (x123 + x234) / 2;
    const y1234 = (y123 + y234) / 2;
    const dx = x4 - x1;
    const dy = y4 - y1;
    let d2 = Math.abs((x2 - x4) * dy - (y2 - y4) * dx);
    let d3 = Math.abs((x3 - x4) * dy - (y3 - y4) * dx);
    switch ((Number(d2 > 1e-8) << 1) + Number(d3 > 1e-8)) {
      case 0:
        if (0 == (k = dx * dx + dy * dy)) {
          d2 = GMath.ptSqrDist(x1, y1, x2, y2);
          d3 = GMath.ptSqrDist(x4, y4, x3, y3);
        } else {
          d2 = (k = 1 / k) * ((x2 - x1) * dx + (y2 - y1) * dy);
          d3 = k * ((x3 - x1) * dx + (y3 - y1) * dy);
          if (d2 > 0 && d2 < 1 && d3 > 0 && d3 < 1) return cursor;
          d2 =
            d2 <= 0
              ? GMath.ptSqrDist(x2, y2, x1, y1)
              : d2 >= 1
                ? GMath.ptSqrDist(x2, y2, x4, y4)
                : GMath.ptSqrDist(x2, y2, x1 + d2 * dx, y1 + d2 * dy);
          d3 =
            d3 <= 0
              ? GMath.ptSqrDist(x3, y3, x1, y1)
              : d3 >= 1
                ? GMath.ptSqrDist(x3, y3, x4, y4)
                : GMath.ptSqrDist(x3, y3, x1 + d3 * dx, y1 + d3 * dy);
        }
        if (d2 > d3) {
          if (d2 < this.bezierToleranceSq) return cursor.insertPoint(x2, y2, t0, seg, curve);
        } else if (d3 < this.bezierToleranceSq) {
          if (t1 < 1) cursor = cursor.insertPoint(x3, y3, t1, seg, curve);
          return cursor;
        }
        break;
      case 1:
        if (d3 * d3 <= this.bezierToleranceSq * (dx * dx + dy * dy))
          return cursor.insertPoint(x23, y23, t0 + (t1 - t0) / 2, seg, curve);
        break;
      case 2:
        if (d2 * d2 <= this.bezierToleranceSq * (dx * dx + dy * dy))
          return cursor.insertPoint(x23, y23, t0 + (t1 - t0) / 2, seg, curve);
        break;
      case 3:
        if ((d2 + d3) * (d2 + d3) <= this.bezierToleranceSq * (dx * dx + dy * dy))
          return cursor.insertPoint(x23, y23, t0 + (t1 - t0) / 2, seg, curve);
    }
    cursor = this._recursive_bezier4(
      cursor,
      x1,
      y1,
      x12,
      y12,
      x123,
      y123,
      x1234,
      y1234,
      t0,
      t0 + (t1 - t0) / 2,
      seg,
      curve,
      level + 1,
    );
    cursor = this._recursive_bezier4(
      cursor,
      x1234,
      y1234,
      x234,
      y234,
      x34,
      y34,
      x4,
      y4,
      t0 + (t1 - t0) / 2,
      t1,
      seg,
      curve,
      level + 1,
    );
    return cursor;
  }

  /** Adaptive subdivision of a quadratic. */
  _recursive_bezier3(
    cursor: PolyLine,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    t0: number,
    t1: number,
    seg: number,
    curve: PolyLine,
    level: number,
  ): PolyLine {
    if (level > 32) return cursor;
    let k: number;
    const x12 = (x1 + x2) / 2;
    const y12 = (y1 + y2) / 2;
    const x23 = (x2 + x3) / 2;
    const y23 = (y2 + y3) / 2;
    const x123 = (x12 + x23) / 2;
    const y123 = (y12 + y23) / 2;
    const dx = x3 - x1;
    const dy = y3 - y1;
    let d = Math.abs((x2 - x3) * dy - (y2 - y3) * dx);
    if (d > 1e-8) {
      if (d * d <= this.bezierToleranceSq * (dx * dx + dy * dy))
        return cursor.insertPoint(x123, y123, t0 + (t1 - t0) / 2, seg, curve);
    } else {
      if (0 == (k = dx * dx + dy * dy)) d = GMath.ptSqrDist(x1, y1, x2, y2);
      else {
        if ((d = ((x2 - x1) * dx + (y2 - y1) * dy) / k) > 0 && d < 1) return cursor;
        d =
          d <= 0
            ? GMath.ptSqrDist(x2, y2, x1, y1)
            : d >= 1
              ? GMath.ptSqrDist(x2, y2, x3, y3)
              : GMath.ptSqrDist(x2, y2, x1 + d * dx, y1 + d * dy);
      }
      if (d < this.bezierToleranceSq) {
        if (t1 < 1) cursor = cursor.insertPoint(x2, y2, t1, seg, curve);
        return cursor;
      }
    }
    cursor = this._recursive_bezier3(
      cursor,
      x1,
      y1,
      x12,
      y12,
      x123,
      y123,
      t0,
      t0 + (t1 - t0) / 2,
      seg,
      curve,
      level + 1,
    );
    cursor = this._recursive_bezier3(
      cursor,
      x123,
      y123,
      x23,
      y23,
      x3,
      y3,
      t0 + (t1 - t0) / 2,
      t1,
      seg,
      curve,
      level + 1,
    );
    return cursor;
  }
}
