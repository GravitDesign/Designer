/* global window */
// Engine-geometry helpers for the old app (see contract.ts). These classes
// are used by the engine but not exported on the G namespace, so they are
// reached through webpack's require by module id (old-module-index.tsv).
(() => {
  const parity = window.__parity;
  if (!parity || parity.app.engineGeometry) return;
  const req = parity.app.require;
  const VertexFitter = req(380);
  const VertexPixelAligner = req(141);
  const PolyIntersector = req(187);
  parity.app.engineGeometry = {
    vertexFitter(error, tolerance) {
      return new VertexFitter(error, tolerance);
    },
    pixelAligner(source, transform, full, bbox) {
      return new VertexPixelAligner(source, transform, full, bbox);
    },
    redistribute(source, transform) {
      const result = PolyIntersector.redistributeVertexSource(source, transform);
      return result.containers;
    },
    intersectPaths(a, b) {
      // As the knife tool does: a fresh intersector, intersections of two
      // paths, then GPath.addIntersectionPoints(a, b, raw, true).
      const raw = new PolyIntersector().intersect(a, b);
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
  };
})();
