// Hooks the engine-geometry scenarios need beyond the G namespace. The old
// app provides them in old-hooks.js; the new app must expose the same
// object as `window.__parity.app.engineGeometry` in its parity build.
import type { ParityHandle } from "../../support/scenario.ts";

type VertexSource = ParityHandle["G"];
type GPoint = ParityHandle["G"];
type GTransform = ParityHandle["G"];
type GRect = ParityHandle["G"];

/** The freehand/simplifier curve fitter (old GVertexFitter, vendor module 380). */
export interface VertexFitter {
  /**
   * Fits cubic beziers through `points`, using at most `maxSegments`
   * segments. Returns a list of [start, control1, control2, end] GPoint
   * quadruples, or null when the fit needs more segments.
   */
  fitCurve(
    points: GPoint[],
    maxSegments: number,
    leftTangent?: GPoint,
    rightTangent?: GPoint,
  ): GPoint[][] | null;
}

export interface EngineGeometryHooks {
  /** new GVertexFitter(error, tolerance): error defaults to 1e-6, tolerance to sqrt(error + 1e-9). */
  vertexFitter(error?: number, tolerance?: number): VertexFitter;
  /**
   * new GVertexPixelAligner(source, transform, full, bbox) (vendor module
   * 141): a vertex source that snaps the source's vertices to device pixels
   * (+0.5 unless `full`), mapping through `transform`; with `bbox` it
   * aligns that box's corners and maps the vertices barycentrically.
   */
  pixelAligner(
    source: VertexSource,
    transform: GTransform | null,
    full: boolean,
    bbox?: GRect,
  ): VertexSource;
  /**
   * The boolean/knife preparation step (old polygon intersector's
   * `redistributeVertexSource`, vendor module 187): splits a source into
   * sub-paths and groups each outer contour with the sub-paths nested in
   * it. Returns the groups as arrays of vertex sources.
   */
  redistribute(source: VertexSource, transform?: GTransform | null): VertexSource[][];
  /**
   * Intersections of two paths as the knife tool computes them (old
   * `new PolyIntersector().intersect(a, b)`). `points` describes each
   * intersection: position, segment index on each path and the parameter
   * (slope) on that segment. `raw` is whatever the new app's
   * GPath.addIntersectionPoints(a, b, raw, true) accepts.
   */
  intersectPaths(
    a: VertexSource,
    b: VertexSource,
  ): {
    raw: unknown;
    points: { x: number; y: number; seg0: number; seg1: number; slope0: number; slope1: number }[];
  };
}
