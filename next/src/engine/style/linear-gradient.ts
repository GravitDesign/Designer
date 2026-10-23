// Old: chunk.vendor.js module 147 (GLinearGradient).
import { registerClass } from "../core/object.ts";
import { GMath } from "../math/math.ts";
import type { Transform } from "../math/transform.ts";
import { Gradient, type GradientBlob, type GradientStop } from "./gradient.ts";
import { Pattern } from "./pattern.ts";

/** A linear gradient along `_angle` (radians). Its focal x defaults to 0. */
export class LinearGradient extends Gradient {
  static {
    registerClass(this, "GLinearGradient");
    Pattern.register("L", this);
  }

  /**
   * Quirk: with `ignoreTransform` this is always false, because the old
   * code negated the flag together with the base comparison.
   */
  static override equals(a: unknown, b: unknown, ignoreTransform?: boolean): boolean {
    return (
      a instanceof LinearGradient &&
      b instanceof LinearGradient &&
      !(!Gradient.equals(a, b, ignoreTransform) || ignoreTransform) &&
      GMath.isEqualEps(a._angle, b._angle)
    );
  }

  _angle: number;

  constructor(
    stops?: readonly GradientStop[] | null,
    scale?: number,
    angle?: number,
    fx?: number,
    fy?: number,
    transform?: Transform | null,
  ) {
    super(stops, scale, fx, fy, transform);
    this._fx = "number" == typeof fx ? fx : 0;
    this._angle = "number" == typeof angle ? angle : 0;
  }

  getAngle(): number {
    return this._angle;
  }

  override asCSSBackground(opacity?: number): string {
    return (
      "linear-gradient(" +
      (Math.round(GMath.toDegrees(this._angle)) + 90) +
      "deg, " +
      this.toScreenCSS(opacity) +
      ")"
    );
  }

  override clone(): LinearGradient {
    return new LinearGradient(
      this.getClonedStops(),
      this._scale,
      this._angle,
      this._fx,
      this._fy,
      this._transform,
    );
  }

  override _serializeToBlob(): GradientBlob {
    const blob = super._serializeToBlob();
    if (blob && !GMath.isEqualEps(this._angle, 0)) blob.r = this._angle;
    return blob;
  }

  override _deserializeFromBlob(blob: GradientBlob): void {
    super._deserializeFromBlob(blob);
    this._angle = Object.hasOwn(blob, "r") ? (blob.r as number) : 0;
  }

  override toString(): string {
    return "[Object GLinearGradient]";
  }
}
