import { ImageTracer } from "../../engine/geometry/image-tracer.ts";
import { VertexOffsetter } from "../../engine/geometry/vertex-offsetter.ts";

// The names the old G barrel (vendor module 1) exported from this
// cluster. The knife cut (module 1079) had no G name.
export const engineGeometryOffsetTrace = {
  GImageTracer: ImageTracer,
  GVertexOffsetter: VertexOffsetter,
};
