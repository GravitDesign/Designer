// Old: chunk.vendor.js module 646.
import type { Point } from "../../math/point.ts";

/**
 * The parts of a poly segment (poly-segments.ts PolyLine) the
 * intersection code reads: the polygon vertex, its curve parameter `m`
 * on the original curve, the curve it belongs to (`currCurve`, the
 * segment that holds the control points) and where that curve ends.
 */
export interface IntersectionSegment {
  point: Point | null;
  next: IntersectionSegment | null;
  m: number;
  currCurve: IntersectionSegment | null;
  nextCurve: IntersectionSegment | null;
  cp1: Point | null;
  cp2: Point | null;
}

/**
 * One intersection of two segments: the point, its parameter on each
 * segment (`slope0`, `slope1`) and the poly segment each lies on.
 */
export class IntersectionPoint<S = IntersectionSegment> {
  pt: Point;
  slope0: number;
  slope1: number;
  polySeg0: S;
  polySeg1: S;

  constructor(pt: Point, slope0: number, slope1: number, polySeg0: S, polySeg1: S) {
    this.pt = pt;
    this.slope0 = slope0;
    this.slope1 = slope1;
    this.polySeg0 = polySeg0;
    this.polySeg1 = polySeg1;
  }
}
