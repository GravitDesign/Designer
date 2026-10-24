// Old: chunk.vendor.js module 559 (the PDF RGB color).
import { Color } from "../../../engine/color/color.ts";
import { PDFArray } from "./pdf-array.ts";
import { PDFColor } from "./pdf-color.ts";

/**
 * An RGB color (components 0..1) with alpha, parsed from a CSS string
 * (`#rrggbb`, `rgb(...)`, `rgba(...)`, `cmyk(...)`), a packed RGBA number
 * or an engine color.
 */
export class PDFRGBColor extends PDFColor {
  r: number;
  g: number;
  b: number;
  a: number;

  constructor(value: unknown) {
    super();
    let red = 0;
    let green = 0;
    let blue = 0;
    let alpha = 1;
    if ("string" == typeof value) {
      const parts: RegExpMatchArray | null = value.startsWith("#")
        ? value.match(/[0-9A-Fa-f]{2}/g)
        : value.match(/\d+(\.\d+)?/g);
      const radix = value.startsWith("#") ? 16 : 10;
      if (parts) {
        if (0 === value.indexOf("cmyk")) {
          // parseFloat ignores the radix the old code passed.
          const cmyk = parts.map((part) => parseFloat(part));
          const rgb = Color.cmykToRGB(cmyk);
          red = rgb[0] as number;
          green = rgb[1] as number;
          blue = rgb[2] as number;
          if (5 == parts.length) alpha = parseFloat(parts[4] as string);
        } else {
          red = parseInt(parts[0] as string, radix);
          green = parseInt(parts[1] as string, radix);
          blue = parseInt(parts[2] as string, radix);
          if (4 == parts.length) alpha = parseFloat(parts[3] as string);
        }
      }
    } else if ("number" == typeof value) {
      red = (value >> 24) & 255;
      green = (value >> 16) & 255;
      blue = (value >> 8) & 255;
      alpha = (255 & value) / 255;
    } else if (value instanceof Color) {
      const screen = value.toScreen();
      red = screen[0] as number;
      green = screen[1] as number;
      blue = screen[2] as number;
      if (4 === screen.length) alpha = screen[3] as number;
    }
    this.r = red / 255;
    this.g = green / 255;
    this.b = blue / 255;
    this.a = alpha;
  }

  /** Packed 0xRRGGBBAA (each channel truncated). */
  asRGBA(): number {
    return ((255 * this.r) << 24) | ((255 * this.g) << 16) | ((255 * this.b) << 8) | (255 * this.a);
  }

  override getAlpha(): number {
    return this.a;
  }

  asArray(): PDFArray {
    const array = new PDFArray();
    array.push(this.r);
    array.push(this.g);
    array.push(this.b);
    return array;
  }
}
