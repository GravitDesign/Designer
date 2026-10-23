import { VertexPolyBoolean } from "../../engine/geometry/boolean/vertex-poly-boolean.ts";
import { VertexSimplifier } from "../../engine/geometry/vertex-simplifier.ts";

// The names the old G barrel (vendor module 1) exported from this
// cluster. The polygon intersector (module 187) and the intersection
// library (module 647) had no G name; the scenarios reach the intersector
// through the engineGeometry app hooks (../app/engine-geometry-boolean.ts).
export const engineGeometryBoolean = {
  GVertexPolyBoolean: VertexPolyBoolean,
  GVertexSimplifier: VertexSimplifier,
};
