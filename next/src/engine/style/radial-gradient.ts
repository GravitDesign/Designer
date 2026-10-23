// Old: chunk.vendor.js module 158 (GRadialGradient).
import { registerClass } from "../core/object.ts";
import { GMath } from "../math/math.ts";
import type { Transform } from "../math/transform.ts";
import { Gradient, type GradientBlob, type GradientStop } from "./gradient.ts";
import { Pattern } from "./pattern.ts";

/**
 * A radial gradient around the center (`_cx`, `_cy`, 0-1 of the box). Its
 * scale defaults to 0.5.
 *
 * Known bug, kept for parity: the center is saved as "_cx"/"_cy" but read
 * back from "cx"/"cy", so a moved center returns to 0.5/0.5 after a save
 * and load.
 */
export class RadialGradient extends Gradient {
  static {
    registerClass(this, "GRadialGradient");
    Pattern.register("R", this);
  }

  static override equals(a: unknown, b: unknown, ignoreTransform?: boolean): boolean {
    return (
      !!(
        a instanceof RadialGradient &&
        b instanceof RadialGradient &&
        (ignoreTransform || (a._cx === b._cx && a._cy === b._cy))
      ) && Gradient.equals(a, b, ignoreTransform)
    );
  }

  _cx: number;
  _cy: number;

  constructor(
    stops?: readonly GradientStop[] | null,
    scale?: number,
    fx?: number,
    fy?: number,
    cx?: number,
    cy?: number,
    transform?: Transform | null,
  ) {
    super(stops, scale, fx, fy, transform);
    this._scale = "number" == typeof scale ? scale : 0.5;
    this._cx = "number" == typeof cx ? cx : 0.5;
    this._cy = "number" == typeof cy ? cy : 0.5;
  }

  override asCSSBackground(opacity?: number): string {
    return (
      "radial-gradient(ellipse at " +
      Math.round(100 * this._cx) +
      "% " +
      Math.round(100 * this._cy) +
      "%, " +
      this.toScreenCSS(opacity) +
      ")"
    );
  }

  override clone(): RadialGradient {
    return new RadialGradient(
      this.getClonedStops(),
      this._scale,
      this._fx,
      this._fy,
      this._cx,
      this._cy,
      this._transform,
    );
  }

  override _serializeToBlob(): GradientBlob {
    const blob = super._serializeToBlob();
    if (blob) {
      if (!GMath.isEqualEps(this._cx, 0.5)) blob._cx = this._cx;
      if (!GMath.isEqualEps(this._cy, 0.5)) blob._cy = this._cy;
    }
    return blob;
  }

  override _deserializeFromBlob(blob: GradientBlob): void {
    super._deserializeFromBlob(blob);
    this._cx = Object.hasOwn(blob, "cx") ? (blob.cx as number) : 0.5;
    this._cy = Object.hasOwn(blob, "cy") ? (blob.cy as number) : 0.5;
  }

  override toString(): string {
    return "[Object GRadialGradient]";
  }
}
