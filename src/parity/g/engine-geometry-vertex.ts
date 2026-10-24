import { HitResult } from "../../engine/geometry/hit-result.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { VertexInfo } from "../../engine/geometry/vertex-info.ts";
import { VertexSource } from "../../engine/geometry/vertex-source.ts";
import { VertexTransformer } from "../../engine/geometry/vertex-transformer.ts";

// Only the names the old G barrel (vendor module 1) exported. The fitter,
// the pixel aligner, the quadtree and GVertexTarget were reachable only
// through other modules; the scenarios get the first two through the
// engineGeometry app hooks (../app/engine-geometry.ts).
export const engineGeometryVertex = {
  GHitResult: HitResult,
  GVertex: Vertex,
  GVertexContainer: VertexContainer,
  GVertexInfo: VertexInfo,
  GVertexSource: VertexSource,
  GVertexTransformer: VertexTransformer,
};
