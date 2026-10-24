// The PDF writer reads and flips transform components directly, as the
// old code did (text matrices negate the shear, gradients read the
// translation). Transform keeps them private; this view exposes them.
import type { Transform } from "../../../engine/math/transform.ts";

export interface TransformFields {
  _sx: number;
  _shy: number;
  _shx: number;
  _sy: number;
  _tx: number;
  _ty: number;
}

export function transformFields(transform: Transform): TransformFields {
  return transform as unknown as TransformFields;
}
