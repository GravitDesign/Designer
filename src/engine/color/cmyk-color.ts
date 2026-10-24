// Old: chunk.vendor.js module 188 (GCMYKColor).
import { registerClass } from "../core/object.ts";
import { equals as valuesEqual } from "../core/util.ts";
import { Pattern } from "../style/pattern.ts";
import { Color } from "./color.ts";

/** A CMYK color, [c, m, y, k] from 0 to 1. The default is [1, 1, 1, 1]. */
export class CMYKColor extends Color {
  static {
    registerClass(this, "GCMYKColor");
    Pattern.register("Y", this);
  }

  static equals(a: unknown, b: unknown): boolean {
    return a instanceof CMYKColor && b instanceof CMYKColor && valuesEqual(a._value, b._value);
  }

  constructor(value?: number[] | null) {
    super(value || [1, 1, 1, 1]);
  }

  override toHumanString(): string {
    const value = this._value as number[];
    return (
      "cmyk " +
      (100 * (value[0] as number)).toFixed() +
      "%," +
      (100 * (value[1] as number)).toFixed() +
      "%," +
      (100 * (value[2] as number)).toFixed() +
      "%," +
      (100 * (value[3] as number)).toFixed() +
      "%"
    );
  }

  /** Through the ICC profile once it is loaded, unless `noProfile`. */
  override toScreen(noProfile?: boolean): number[] {
    return Color.cmykToRGB(this._value as number[], noProfile);
  }

  override clone(): CMYKColor {
    return new CMYKColor(this._value);
  }

  override toString(): string {
    return "[Object GCMYKColor]";
  }
}
