// Old: chunk.vendor.js module 359 (the PDF color spaces).
import { PDFGrayColor } from "./alpha.ts";
import { PDFRGBColor } from "./cmyk-color-array.ts";
import { PDFCMYKColor } from "./color-value.ts";
import { PDFColor } from "./pdf-color.ts";

/**
 * A color space: its PDF name, the fill operator, the components per
 * pixel, how to parse a color, and how to turn an RGBA pixel into
 * components (the rasterizer in the export worker uses this too).
 */
export interface PDFColorSpace {
  name: string;
  operator: string;
  length: number;
  parseColor(color: unknown): PDFColor;
  fromRGBA(red: number, green: number, blue: number, alpha: number): number[];
}

/** CMYK components (0..255) by packed RGBA value; the conversion is slow. */
const cmykByRGBA: Record<number, number[]> = {};

export const ColorSpaces = {
  RGB: {
    name: "/DeviceRGB",
    operator: "rg",
    length: 3,
    parseColor: (color: unknown) => new PDFRGBColor(color),
    fromRGBA: (red: number, green: number, blue: number) => [red, green, blue],
  },
  RGBA: {
    name: "/DeviceRGB",
    operator: "rg",
    length: 4,
    parseColor: (color: unknown) => new PDFRGBColor(color),
    fromRGBA: (red: number, green: number, blue: number, alpha: number) => [
      red,
      green,
      blue,
      alpha,
    ],
  },
  GRAY: {
    name: "/DeviceGray",
    operator: "g",
    length: 1,
    parseColor: (color: unknown) => new PDFGrayColor(color),
    fromRGBA: (_red: number, _green: number, _blue: number, alpha: number) => [alpha],
  },
  CMYK: {
    name: "/DeviceCMYK",
    operator: "k",
    length: 4,
    parseColor: (color: unknown) => new PDFCMYKColor(color),
    fromRGBA: (red: number, green: number, blue: number, alpha: number) => {
      const rgba = (red << 24) | (green << 16) | (blue << 8) | alpha;
      let cmyk = cmykByRGBA[rgba];
      if (!cmyk) {
        cmyk = PDFColor.rgbToCMYK(rgba).map((component) => 255 * component);
        cmykByRGBA[rgba] = cmyk;
      }
      return cmyk;
    },
  },
  // The old table kept its cache as a member too.
  _cmykToRGB: cmykByRGBA,
} satisfies Record<string, PDFColorSpace | Record<number, number[]>>;

export type ColorSpaceName = "RGB" | "RGBA" | "GRAY" | "CMYK";

/** The color space named `name` (as the export options and worker messages pass it). */
export function colorSpaceByName(name: string): PDFColorSpace | undefined {
  if (name === "RGB" || name === "RGBA" || name === "GRAY" || name === "CMYK") {
    return ColorSpaces[name];
  }
  return undefined;
}

/** The name of a color space object, as the worker protocol sends it. */
export function colorSpaceName(space: PDFColorSpace): ColorSpaceName | undefined {
  for (const name of ["RGB", "RGBA", "GRAY", "CMYK"] as const) {
    if (ColorSpaces[name] === space) return name;
  }
  return undefined;
}
