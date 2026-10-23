// Old: chunk.vendor.js module 648 (GColorHelper).
import { CMYKColor } from "./cmyk-color.ts";
import { Color } from "./color.ts";
import { HSVColor } from "./hsv-color.ts";
import { RGBColor } from "./rgb-color.ts";

export const ColorHelper = {
  /**
   * Converts a color to the class of a color mode (Color.ColorModes); any
   * other value, and a color already in that mode, comes back unchanged.
   */
  convertColor<T>(color: T, mode: string): T | Color {
    switch (mode) {
      case Color.ColorModes.CMYK:
        return color instanceof RGBColor || color instanceof HSVColor
          ? new CMYKColor(Color.rgbToCMYK(color.toScreen()))
          : color;
      case Color.ColorModes.HSB:
        return color instanceof CMYKColor || color instanceof RGBColor
          ? new HSVColor(Color.rgbToHSV(color.toScreen()))
          : color;
      default:
        return color instanceof CMYKColor || color instanceof HSVColor
          ? new RGBColor(color.toScreen())
          : color;
    }
  },
};
