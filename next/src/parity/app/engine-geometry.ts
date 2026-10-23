import type { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { VertexFitter } from "../../engine/geometry/vertex-fitter.ts";
import { VertexPixelAligner } from "../../engine/geometry/vertex-pixel-aligner.ts";
import type { VertexReader } from "../../engine/geometry/vertex-source.ts";

/**
 * window.__parity.app.engineGeometry, the hooks declared in
 * parity/scenarios/engine-geometry/contract.ts.
 *
 * The bridge rejects a hook name defined by two files, so clusters that
 * add hooks to this object (redistribute and intersectPaths come with
 * the boolean cluster) don't export their own `engineGeometry`. They
 * add theirs from their own file under ./app/ instead:
 *
 *     import { addEngineGeometryHooks } from "./engine-geometry.ts";
 *     addEngineGeometryHooks({ redistribute, intersectPaths });
 *
 * (The bridge merges every exported object's keys into app, so the hooks
 * object itself isn't exported; functions are skipped.)
 */
const hooks: Record<string, unknown> = {
  vertexFitter(error?: number, tolerance?: number): VertexFitter {
    return new VertexFitter(error, tolerance);
  },
  pixelAligner(
    source: VertexReader,
    transform: Transform | null,
    full: boolean,
    bbox?: Rect,
  ): VertexPixelAligner {
    return new VertexPixelAligner(source, transform, full, bbox);
  },
};

/** Adds hooks of a later cluster to app.engineGeometry. */
export function addEngineGeometryHooks(more: Record<string, unknown>): void {
  for (const name of Object.keys(more)) {
    if (name in hooks) throw new Error(`engineGeometry.${name} is defined twice`);
    hooks[name] = more[name];
  }
}

export const engineGeometry = { engineGeometry: hooks };
