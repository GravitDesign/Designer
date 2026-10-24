import { PolyIntersector } from "../../engine/geometry/boolean/poly-segments.ts";
import type { Transform } from "../../engine/math/transform.ts";
import type { VertexReader } from "../../engine/geometry/vertex-source.ts";
import { addEngineGeometryHooks } from "./engine-geometry.ts";

// The boolean cluster's part of app.engineGeometry (see
// parity/scenarios/engine-geometry/contract.ts and old-hooks.js).
addEngineGeometryHooks({
  redistribute(source: VertexReader, transform?: Transform | null) {
    return PolyIntersector.redistributeVertexSource(source, transform).containers;
  },
  intersectPaths(a: VertexReader, b: VertexReader) {
    // As the knife tool does: a fresh intersector, then the raw result
    // goes to GPath.addIntersectionPoints(a, b, raw, true).
    const raw = new PolyIntersector().intersect(a, b) ?? [];
    return {
      raw,
      points: raw.map((r) => ({
        x: r.pt.getX(),
        y: r.pt.getY(),
        seg0: r.polySeg0.seg,
        seg1: r.polySeg1.seg,
        slope0: r.slope0,
        slope1: r.slope1,
      })),
    };
  },
});
