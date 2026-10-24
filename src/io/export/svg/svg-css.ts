// New: how Chrome's CSSOM parses and prints the inline style declarations
// the SVG exporter reads and writes through `element.style`.
//
// The old exporter set `path.style.stroke = ...` on browser SVG elements
// (chunk.vendor.js 255746-255751), so Chrome parsed the whole style
// attribute, dropped the declarations it found invalid and wrote the rest
// back in its own form. The styles come from SvgPaintContext.getSvgStyle,
// which writes raw values: `stroke-dasharray:4,4` (an array's toString),
// `stroke-width:undefined` for a missing line width, and so on. This
// module reproduces what Chrome does with the properties getSvgStyle
// writes; the outputs were recorded in Chrome 156 (svg-dom.test.ts and
// __fixtures__/cssom-chrome.json).
//
// What it covers:
// - paints (fill, stroke): none, currentcolor, named colors, #rgb[a] and
//   #rrggbb[aa], rgb()/rgba()/hsl()/hsla() with commas or spaces, url()
//   with an optional fallback;
// - stroke-width and the stroke-dasharray items: non-negative numbers,
//   lengths and percentages; stroke-dasharray as none or a list split on
//   commas and whitespace, printed with ", ";
// - stroke-miterlimit: a non-negative number; opacity: a number or a
//   percentage (printed as a number);
// - the stroke-linecap, stroke-linejoin and fill-rule keywords;
// - the CSS-wide keywords for every property.
// Numbers print with six significant digits, like C's %g (Chrome's
// serializer): 0.30000000000000004 as 0.3, 1e-7 as 1e-07. Invalid values
// return null and the declaration is dropped. Other properties keep their
// value with only colors and urls normalized (OTHER_PROPERTIES); unknown
// names are dropped.

const NAMED_COLORS = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue " +
    "blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk " +
    "crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki " +
    "darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
    "darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue " +
    "dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite " +
    "gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
    "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
    "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen " +
    "lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen " +
    "magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen " +
    "mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream " +
    "mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
    "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
    "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown " +
    "seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen " +
    "steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow " +
    "yellowgreen"
  ).split(" "),
);

const WIDE_KEYWORDS = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);

const LENGTH_UNITS = new Set([
  "px",
  "em",
  "rem",
  "ex",
  "ch",
  "pt",
  "pc",
  "in",
  "cm",
  "mm",
  "q",
  "vw",
  "vh",
  "vmin",
  "vmax",
]);

const KEYWORDS: Record<string, readonly string[]> = {
  "stroke-linecap": ["butt", "round", "square"],
  "stroke-linejoin": ["miter", "round", "bevel"],
  "fill-rule": ["nonzero", "evenodd"],
};

/**
 * Other properties the exporter writes into style attributes. Their values
 * are kept with only colors and urls normalized; a name Chrome doesn't
 * know (like `foo`) is dropped.
 */
const OTHER_PROPERTIES = new Set([
  "fill-opacity",
  "stroke-opacity",
  "stroke-dashoffset",
  "stop-color",
  "stop-opacity",
  "flood-color",
  "flood-opacity",
  "mix-blend-mode",
  "isolation",
  "filter",
  "mask",
  "clip-path",
  "clip-rule",
  "color",
  "display",
  "visibility",
  "vector-effect",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "font-variant-ligatures",
  "font-feature-settings",
  "letter-spacing",
  "word-spacing",
  "white-space",
  "text-decoration",
]);

const NUMBER = /^[+-]?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/;
const DIMENSION = /^([+-]?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?)([a-zA-Z]+|%)$/;

/** A number the way Chrome prints it: six significant digits, like %g. */
export function formatCssNumber(value: number): string {
  if (value === 0) return "0";
  const [mantissa, exponentText] = value.toExponential(5).split("e") as [string, string];
  const exponent = Number(exponentText);
  const strip = (text: string) => (text.includes(".") ? text.replace(/\.?0+$/, "") : text);
  if (exponent < -4 || exponent >= 6) {
    const digits = String(Math.abs(exponent)).padStart(2, "0");
    return strip(mantissa) + "e" + (exponent < 0 ? "-" : "+") + digits;
  }
  return strip(value.toFixed(5 - exponent));
}

function parseNumber(text: string): number | null {
  return NUMBER.test(text) ? Number(text) : null;
}

/** A non-negative number, length or percentage, printed; null when invalid. */
function lengthPercentage(text: string): string | null {
  const number = parseNumber(text);
  if (number !== null) return number < 0 ? null : formatCssNumber(number);
  const dimension = DIMENSION.exec(text);
  if (!dimension) return null;
  const value = Number(dimension[1]);
  const unit = (dimension[2] as string).toLowerCase();
  if (value < 0 || (unit !== "%" && !LENGTH_UNITS.has(unit))) return null;
  return formatCssNumber(value) + unit;
}

function dashArray(text: string): string | null {
  if (text.toLowerCase() === "none") return "none";
  const items = text.split(/\s*,\s*|\s+/);
  const out: string[] = [];
  for (const item of items) {
    const value = lengthPercentage(item);
    if (value === null) return null;
    out.push(value);
  }
  return out.join(", ");
}

/** An 8-bit alpha the way Chrome prints it: two decimals when they round back to the same byte, else three. */
function roundAlpha(alpha: number): number {
  const byte = Math.round(alpha * 255);
  const two = Math.round((byte / 255) * 100) / 100;
  return Math.round(two * 255) === byte ? two : Math.round((byte / 255) * 1000) / 1000;
}

function rgbText(r: number, g: number, b: number, alpha: number): string {
  return alpha >= 1
    ? "rgb(" + r + ", " + g + ", " + b + ")"
    : "rgba(" + r + ", " + g + ", " + b + ", " + roundAlpha(alpha) + ")";
}

/** A color function's arguments: commas, or spaces with an optional "/ alpha". */
function functionArguments(text: string): string[] | null {
  if (text.includes(",")) {
    const parts = text.split(",").map((p) => p.trim());
    return parts.every((p) => p.length > 0) ? parts : null;
  }
  const [main, alpha, extra] = text.split("/").map((p) => p.trim());
  if (extra !== undefined || main === undefined) return null;
  const parts = main.split(/\s+/).filter((p) => p.length > 0);
  if (alpha !== undefined) {
    if (!alpha) return null;
    parts.push(alpha);
  }
  return parts;
}

function alphaValue(text: string | undefined): number | null {
  if (text === undefined) return 1;
  if (text.endsWith("%")) {
    const n = parseNumber(text.slice(0, -1));
    return n === null ? null : Math.min(1, Math.max(0, n / 100));
  }
  const n = parseNumber(text);
  return n === null ? null : Math.min(1, Math.max(0, n));
}

function channel(text: string): number | null {
  let value: number | null;
  if (text.endsWith("%")) {
    const n = parseNumber(text.slice(0, -1));
    value = n === null ? null : (n / 100) * 255;
  } else value = parseNumber(text);
  return value === null ? null : Math.round(Math.min(255, Math.max(0, value)));
}

function hueToRgb(m1: number, m2: number, h: number): number {
  if (h < 0) h += 1;
  if (h > 1) h -= 1;
  if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
  if (h * 2 < 1) return m2;
  if (h * 3 < 2) return m1 + (m2 - m1) * (2 / 3 - h) * 6;
  return m1;
}

/** A color printed the way Chrome prints it; null when it isn't one. */
export function parseCssColor(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower === "transparent" || lower === "currentcolor" || NAMED_COLORS.has(lower)) return lower;
  const hex = /^#([0-9a-f]{3,8})$/.exec(lower);
  if (hex) {
    let digits = hex[1] as string;
    if (digits.length === 3 || digits.length === 4) {
      digits = digits
        .split("")
        .map((d) => d + d)
        .join("");
    }
    if (digits.length !== 6 && digits.length !== 8) return null;
    const byte = (i: number) => parseInt(digits.slice(2 * i, 2 * i + 2), 16);
    return rgbText(byte(0), byte(1), byte(2), digits.length === 8 ? byte(3) / 255 : 1);
  }
  const fn = /^(rgba?|hsla?)\((.*)\)$/.exec(lower);
  if (!fn) return null;
  const args = functionArguments(fn[2] as string);
  if (!args || args.length < 3 || args.length > 4) return null;
  const alpha = alphaValue(args[3]);
  if (alpha === null) return null;
  if ((fn[1] as string).startsWith("rgb")) {
    const [r, g, b] = args.slice(0, 3).map(channel);
    if (r == null || g == null || b == null) return null;
    return rgbText(r, g, b, alpha);
  }
  const hue = parseNumber((args[0] as string).replace(/deg$/, ""));
  const percent = (t: string) => (t.endsWith("%") ? parseNumber(t.slice(0, -1)) : null);
  const saturation = percent(args[1] as string);
  const lightness = percent(args[2] as string);
  if (hue === null || saturation === null || lightness === null) return null;
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = Math.min(1, Math.max(0, saturation / 100));
  const l = Math.min(1, Math.max(0, lightness / 100));
  const m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
  const m1 = l * 2 - m2;
  const to255 = (v: number) => Math.round(v * 255);
  return rgbText(
    to255(hueToRgb(m1, m2, h + 1 / 3)),
    to255(hueToRgb(m1, m2, h)),
    to255(hueToRgb(m1, m2, h - 1 / 3)),
    alpha,
  );
}

function paint(text: string): string | null {
  if (text.toLowerCase() === "none") return "none";
  const url = /^url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s'"()]*))\s*\)(?:\s+(.*))?$/i.exec(text);
  if (url) {
    const target = 'url("' + (url[1] ?? url[2] ?? url[3] ?? "") + '")';
    const fallback = url[4];
    if (fallback === undefined) return target;
    const fb = fallback.toLowerCase() === "none" ? "none" : parseCssColor(fallback);
    return fb === null ? null : target + " " + fb;
  }
  return parseCssColor(text);
}

/** The colors and urls of a value of a property this module doesn't know. */
function genericValue(value: string): string {
  if (/^url\(/i.test(value)) return paint(value) ?? value;
  return parseCssColor(value) ?? value;
}

/**
 * A declaration's value as Chrome prints it, or null when Chrome drops
 * the declaration as invalid. `name` must be lower case.
 */
export function parseCssDeclaration(name: string, rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) return null;
  if (WIDE_KEYWORDS.has(value.toLowerCase())) return value.toLowerCase();
  switch (name) {
    case "fill":
    case "stroke":
      return paint(value);
    case "stroke-width":
      return lengthPercentage(value);
    case "stroke-dasharray":
      return dashArray(value);
    case "stroke-miterlimit": {
      const n = parseNumber(value);
      return n === null || n < 0 ? null : formatCssNumber(n);
    }
    case "opacity": {
      if (value.endsWith("%")) {
        const n = parseNumber(value.slice(0, -1));
        return n === null ? null : formatCssNumber(n / 100);
      }
      const n = parseNumber(value);
      return n === null ? null : formatCssNumber(n);
    }
    case "stroke-linecap":
    case "stroke-linejoin":
    case "fill-rule": {
      const keyword = value.toLowerCase();
      return (KEYWORDS[name] as readonly string[]).includes(keyword) ? keyword : null;
    }
    default:
      return OTHER_PROPERTIES.has(name) ? genericValue(value) : null;
  }
}
