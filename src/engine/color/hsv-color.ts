// Old: chunk.vendor.js module 649 (GHSVColor).
import { registerClass } from "../core/object.ts";
import { Pattern } from "../style/pattern.ts";
import { Color } from "./color.ts";
import { RGBColor } from "./rgb-color.ts";

/**
 * An HSV color, [h (0-360), s (0-1), v (0-1)]. It extends RGBColor (so it
 * passes `instanceof RGBColor` and RGBColor.equals) but keeps its value
 * unclamped.
 */
export class HSVColor extends RGBColor {
  static {
    registerClass(this, "GHSVColor");
    Pattern.register("H", this);
  }

  constructor(value?: number[] | null) {
    super();
    this._value = value && value instanceof Array ? value.slice() : [0, 0, 0];
  }

  override clone(): HSVColor {
    return new HSVColor(this._value);
  }

  override toScreen(): number[] {
    return Color.hsvToRGB(this._value as number[]);
  }

  override toHumanString(): string {
    const value = this._value as number[];
    return "hsv " + value[0] + "," + value[1] + "," + value[2];
  }

  override toString(): string {
    return "[Object GHSVColor]";
  }
}
