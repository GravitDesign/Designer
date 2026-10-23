// Old: chunk.vendor.js module 229 (GHitResult).
import type { VertexHitResult } from "./vertex-info.ts";

/**
 * Where a hit test met a path: the segment index, the hit position, the
 * segment's slope there and whether the hit was on the outline.
 *
 * The old class declared these as null on the prototype, so a fresh result
 * has no own properties until the hit test fills them in. The port keeps
 * that (`declare` plus prototype values) because callers and the parity
 * scenarios enumerate a result's own fields.
 */
export class HitResult implements VertexHitResult {
  declare segment: number | null;
  declare x: number | null;
  declare y: number | null;
  /** The parameter on the segment (0..1). */
  declare slope: number | null;
  declare outline: boolean | null;
}

const proto = HitResult.prototype as unknown as Record<string, null>;
proto.segment = null;
proto.x = null;
proto.y = null;
proto.slope = null;
proto.outline = null;
