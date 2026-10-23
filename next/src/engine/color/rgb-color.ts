// Old: chunk.vendor.js module 17 (GRGBColor).
import { registerClass } from "../core/object.ts";
import { equals as valuesEqual } from "../core/util.ts";
import { Pattern } from "../style/pattern.ts";
import { Color } from "./color.ts";

/** Rounds and clamps to a byte (NaN stays NaN). */
function toByte(value: number): number {
  value = Math.round(value);
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

/** [r, g, b, alpha] as parseCSSColor returns it. */
export type CSSColorValue = number[];

/** An RGB color, [r, g, b] with each channel rounded and clamped to 0-255. */
export class RGBColor extends Color {
  static {
    registerClass(this, "GRGBColor");
    Pattern.register("C", this);
  }

  static RGBREGEX = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/;

  static BLACK: RGBColor;
  static WHITE: RGBColor;
  static RED: RGBColor;

  /** CSS color names → [r, g, b, alpha]. */
  static _kCSSColorTable: Record<string, number[]> = {
    transparent: [255, 255, 255, 0],
    aliceblue: [240, 248, 255, 1],
    antiquewhite: [250, 235, 215, 1],
    aqua: [0, 255, 255, 1],
    aquamarine: [127, 255, 212, 1],
    azure: [240, 255, 255, 1],
    beige: [245, 245, 220, 1],
    bisque: [255, 228, 196, 1],
    black: [0, 0, 0, 1],
    blanchedalmond: [255, 235, 205, 1],
    blue: [0, 0, 255, 1],
    blueviolet: [138, 43, 226, 1],
    brown: [165, 42, 42, 1],
    burlywood: [222, 184, 135, 1],
    cadetblue: [95, 158, 160, 1],
    chartreuse: [127, 255, 0, 1],
    chocolate: [210, 105, 30, 1],
    coral: [255, 127, 80, 1],
    cornflowerblue: [100, 149, 237, 1],
    cornsilk: [255, 248, 220, 1],
    crimson: [220, 20, 60, 1],
    cyan: [0, 255, 255, 1],
    darkblue: [0, 0, 139, 1],
    darkcyan: [0, 139, 139, 1],
    darkgoldenrod: [184, 134, 11, 1],
    darkgray: [169, 169, 169, 1],
    darkgreen: [0, 100, 0, 1],
    darkgrey: [169, 169, 169, 1],
    darkkhaki: [189, 183, 107, 1],
    darkmagenta: [139, 0, 139, 1],
    darkolivegreen: [85, 107, 47, 1],
    darkorange: [255, 140, 0, 1],
    darkorchid: [153, 50, 204, 1],
    darkred: [139, 0, 0, 1],
    darksalmon: [233, 150, 122, 1],
    darkseagreen: [143, 188, 143, 1],
    darkslateblue: [72, 61, 139, 1],
    darkslategray: [47, 79, 79, 1],
    darkslategrey: [47, 79, 79, 1],
    darkturquoise: [0, 206, 209, 1],
    darkviolet: [148, 0, 211, 1],
    deeppink: [255, 20, 147, 1],
    deepskyblue: [0, 191, 255, 1],
    dimgray: [105, 105, 105, 1],
    dimgrey: [105, 105, 105, 1],
    dodgerblue: [30, 144, 255, 1],
    firebrick: [178, 34, 34, 1],
    floralwhite: [255, 250, 240, 1],
    forestgreen: [34, 139, 34, 1],
    fuchsia: [255, 0, 255, 1],
    gainsboro: [220, 220, 220, 1],
    ghostwhite: [248, 248, 255, 1],
    gold: [255, 215, 0, 1],
    goldenrod: [218, 165, 32, 1],
    gray: [128, 128, 128, 1],
    green: [0, 128, 0, 1],
    greenyellow: [173, 255, 47, 1],
    grey: [128, 128, 128, 1],
    honeydew: [240, 255, 240, 1],
    hotpink: [255, 105, 180, 1],
    indianred: [205, 92, 92, 1],
    indigo: [75, 0, 130, 1],
    ivory: [255, 255, 240, 1],
    khaki: [240, 230, 140, 1],
    lavender: [230, 230, 250, 1],
    lavenderblush: [255, 240, 245, 1],
    lawngreen: [124, 252, 0, 1],
    lemonchiffon: [255, 250, 205, 1],
    lightblue: [173, 216, 230, 1],
    lightcoral: [240, 128, 128, 1],
    lightcyan: [224, 255, 255, 1],
    lightgoldenrodyellow: [250, 250, 210, 1],
    lightgray: [211, 211, 211, 1],
    lightgreen: [144, 238, 144, 1],
    lightgrey: [211, 211, 211, 1],
    lightpink: [255, 182, 193, 1],
    lightsalmon: [255, 160, 122, 1],
    lightseagreen: [32, 178, 170, 1],
    lightskyblue: [135, 206, 250, 1],
    lightslategray: [119, 136, 153, 1],
    lightslategrey: [119, 136, 153, 1],
    lightsteelblue: [176, 196, 222, 1],
    lightyellow: [255, 255, 224, 1],
    lime: [0, 255, 0, 1],
    limegreen: [50, 205, 50, 1],
    linen: [250, 240, 230, 1],
    magenta: [255, 0, 255, 1],
    maroon: [128, 0, 0, 1],
    mediumaquamarine: [102, 205, 170, 1],
    mediumblue: [0, 0, 205, 1],
    mediumorchid: [186, 85, 211, 1],
    mediumpurple: [147, 112, 219, 1],
    mediumseagreen: [60, 179, 113, 1],
    mediumslateblue: [123, 104, 238, 1],
    mediumspringgreen: [0, 250, 154, 1],
    mediumturquoise: [72, 209, 204, 1],
    mediumvioletred: [199, 21, 133, 1],
    midnightblue: [25, 25, 112, 1],
    mintcream: [245, 255, 250, 1],
    mistyrose: [255, 228, 225, 1],
    moccasin: [255, 228, 181, 1],
    navajowhite: [255, 222, 173, 1],
    navy: [0, 0, 128, 1],
    oldlace: [253, 245, 230, 1],
    olive: [128, 128, 0, 1],
    olivedrab: [107, 142, 35, 1],
    orange: [255, 165, 0, 1],
    orangered: [255, 69, 0, 1],
    orchid: [218, 112, 214, 1],
    palegoldenrod: [238, 232, 170, 1],
    palegreen: [152, 251, 152, 1],
    paleturquoise: [175, 238, 238, 1],
    palevioletred: [219, 112, 147, 1],
    papayawhip: [255, 239, 213, 1],
    peachpuff: [255, 218, 185, 1],
    peru: [205, 133, 63, 1],
    pink: [255, 192, 203, 1],
    plum: [221, 160, 221, 1],
    powderblue: [176, 224, 230, 1],
    purple: [128, 0, 128, 1],
    red: [255, 0, 0, 1],
    rosybrown: [188, 143, 143, 1],
    royalblue: [65, 105, 225, 1],
    saddlebrown: [139, 69, 19, 1],
    salmon: [250, 128, 114, 1],
    sandybrown: [244, 164, 96, 1],
    seagreen: [46, 139, 87, 1],
    seashell: [255, 245, 238, 1],
    sienna: [160, 82, 45, 1],
    silver: [192, 192, 192, 1],
    skyblue: [135, 206, 235, 1],
    slateblue: [106, 90, 205, 1],
    slategray: [112, 128, 144, 1],
    slategrey: [112, 128, 144, 1],
    snow: [255, 250, 250, 1],
    springgreen: [0, 255, 127, 1],
    steelblue: [70, 130, 180, 1],
    tan: [210, 180, 140, 1],
    teal: [0, 128, 128, 1],
    thistle: [216, 191, 216, 1],
    tomato: [255, 99, 71, 1],
    turquoise: [64, 224, 208, 1],
    violet: [238, 130, 238, 1],
    wheat: [245, 222, 179, 1],
    white: [255, 255, 255, 1],
    whitesmoke: [245, 245, 245, 1],
    yellow: [255, 255, 0, 1],
    // The old table has no alpha here.
    yellowgreen: [154, 205, 50],
  };

  static fromCSSColor(css: string): RGBColor | null {
    const parsed = RGBColor.parseCSSColor(css);
    return parsed ? new RGBColor(parsed.slice(0, 3)) : null;
  }

  /**
   * Parses a CSS color name, #rgb / #rrggbb, rgb(), rgba(), hsl() or
   * hsla() into [r, g, b, alpha], or null. Anything else is retried as hex
   * digits without the '#'.
   *
   * Quirk: rgb() and hsl() without an alpha give an alpha of 100, not 1.
   */
  static parseCSSColor(css: string): CSSColorValue | null {
    const clampUnit = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
    const parseChannel = (text: string) =>
      "%" === text[text.length - 1]
        ? toByte((parseFloat(text) / 100) * 255)
        : toByte(parseInt(text));
    const parseUnit = (text: string) =>
      "%" === text[text.length - 1]
        ? clampUnit(parseFloat(text) / 100)
        : clampUnit(parseFloat(text));
    const hueToChannel = (p: number, q: number, hue: number) => {
      if (hue < 0) hue += 1;
      else if (hue > 1) hue -= 1;
      return 6 * hue < 1
        ? p + (q - p) * hue * 6
        : 2 * hue < 1
          ? q
          : 3 * hue < 2
            ? p + (q - p) * (2 / 3 - hue) * 6
            : p;
    };

    const text = css.replace(/ /g, "").toLowerCase();
    // `in` also finds Object.prototype names ("constructor"), which then
    // throw on slice() as they did in the old code.
    if (text in RGBColor._kCSSColorTable) {
      return (RGBColor._kCSSColorTable[text] as number[]).slice();
    }
    if ("#" === text[0]) {
      let value: number;
      if (text.length <= 4) {
        return (value = parseInt(text.substr(1), 16)) >= 0 && value <= 4095
          ? [
              ((3840 & value) >> 4) | ((3840 & value) >> 8),
              (240 & value) | ((240 & value) >> 4),
              (15 & value) | ((15 & value) << 4),
              1,
            ]
          : null;
      }
      return text.length <= 7 && (value = parseInt(text.substr(1), 16)) >= 0 && value <= 16777215
        ? [(16711680 & value) >> 16, (65280 & value) >> 8, 255 & value, 1]
        : null;
    }
    const open = text.indexOf("(");
    const close = text.indexOf(")");
    if (-1 !== open && close + 1 === text.length) {
      const fn = text.substr(0, open);
      const args = text.substr(open + 1, close - (open + 1)).split(",");
      let alpha = 100;
      const rgb = () =>
        3 !== args.length
          ? null
          : [
              parseChannel(args[0] as string),
              parseChannel(args[1] as string),
              parseChannel(args[2] as string),
              alpha,
            ];
      const hsl = () => {
        if (3 !== args.length) return null;
        const hue = (((parseFloat(args[0] as string) % 360) + 360) % 360) / 360;
        const saturation = parseUnit(args[1] as string);
        const lightness = parseUnit(args[2] as string);
        const q =
          lightness <= 0.5
            ? lightness * (saturation + 1)
            : lightness + saturation - lightness * saturation;
        const p = 2 * lightness - q;
        return [
          toByte(255 * hueToChannel(p, q, hue + 1 / 3)),
          toByte(255 * hueToChannel(p, q, hue)),
          toByte(255 * hueToChannel(p, q, hue - 1 / 3)),
          alpha,
        ];
      };
      switch (fn) {
        case "rgba":
          if (4 !== args.length) return null;
          alpha = parseUnit(args.pop() as string);
          return rgb();
        case "rgb":
          return rgb();
        case "hsla":
          if (4 !== args.length) return null;
          alpha = parseUnit(args.pop() as string);
          return hsl();
        case "hsl":
          return hsl();
        default:
          return null;
      }
    }
    return RGBColor.parseCSSColor("#" + css);
  }

  /** Two RGB colors (or subclasses) with equal values. */
  static equals(a: unknown, b: unknown): boolean {
    return a instanceof RGBColor && b instanceof RGBColor && valuesEqual(a._value, b._value);
  }

  /** Whether two [r, g, b] values are within `distance` of each other. */
  static closeEnough(a: number[], b: number[], distance?: number): boolean {
    const dr = (a[0] as number) - (b[0] as number);
    const dg = (a[1] as number) - (b[1] as number);
    const db = (a[2] as number) - (b[2] as number);
    return dr * dr + dg * dg + db * db <= (distance as number) * (distance as number);
  }

  /** Composites [r, g, b, a] `top` over `bottom` (source-over). */
  static mix(bottom?: number[], top?: number[]): number[] | undefined {
    if (undefined === bottom && undefined !== top) return top;
    if (undefined !== bottom && undefined === top) return bottom;
    const b = bottom as number[];
    const t = top as number[];
    const br = b[0] as number;
    const bg = b[1] as number;
    const bb = b[2] as number;
    const ba = b[3] as number;
    const tr = t[0] as number;
    const tg = t[1] as number;
    const tb = t[2] as number;
    const ta = t[3] as number;
    const alpha = ta + ba * (1 - ta);
    return [
      Math.round((tr * ta + br * ba * (1 - ta)) / alpha),
      Math.round((tg * ta + bg * ba * (1 - ta)) / alpha),
      Math.round((tb * ta + bb * ba * (1 - ta)) / alpha),
      alpha,
    ];
  }

  /** Linear interpolation from `from` to `to` by `amount`. */
  static blend(from?: number[], to?: number[], amount?: number): number[] | undefined {
    if (undefined === from && undefined !== to) return to;
    if (undefined !== from && undefined === to) return from;
    const a = from as number[];
    const b = to as number[];
    const t = amount as number;
    return [
      (a[0] as number) + ((b[0] as number) - (a[0] as number)) * t,
      (a[1] as number) + ((b[1] as number) - (a[1] as number)) * t,
      (a[2] as number) + ((b[2] as number) - (a[2] as number)) * t,
    ];
  }

  constructor(value?: ArrayLike<number> | null) {
    super(
      value
        ? [toByte(value[0] as number), toByte(value[1] as number), toByte(value[2] as number)]
        : [0, 0, 0],
    );
  }

  /** The nearest CSS color name by squared RGB distance ("white" if none is closer). */
  getClosestCSSName(): string {
    let best = 195075;
    let name = "white";
    const value = this._value as number[];
    for (const key in RGBColor._kCSSColorTable) {
      const entry = RGBColor._kCSSColorTable[key] as number[];
      const dr = (entry[0] as number) - (value[0] as number);
      const dg = (entry[1] as number) - (value[1] as number);
      const db = (entry[2] as number) - (value[2] as number);
      const distance = dr * dr + dg * dg + db * db;
      if (distance < best) {
        name = key;
        best = distance;
      }
    }
    return name;
  }

  override toHumanString(): string {
    const value = this._value as number[];
    return "rgb " + value[0] + "," + value[1] + "," + value[2];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- same signature as Color
  override toScreen(noProfile?: boolean): number[] {
    return this._value as number[];
  }

  override clone(): RGBColor {
    return new RGBColor(this._value);
  }

  override toString(): string {
    return "[Object GRGBColor]";
  }
}

RGBColor.BLACK = new RGBColor([0, 0, 0]);
RGBColor.WHITE = new RGBColor([255, 255, 255]);
RGBColor.RED = new RGBColor([255, 0, 0]);
