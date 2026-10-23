// Old: chunk.vendor.js module 161 (GTLUtil).
import { GMath } from "../../math/math.ts";
import { Font } from "../fonts/font.ts";
import { Formatting } from "./formatting.ts";

/**
 * A list of handlers that is itself the subscribe function: `event(fn)`
 * adds a handler, `event.fire(...)` calls them in order and drops those
 * that return TLUtil.UNSUBSCRIBE.
 */
export interface TLEvent {
  (handler: (...args: never[]) => unknown): void;
  fire(...args: unknown[]): void;
  clearHandlers(): void;
}

/** What parseFont makes of a CSS font string. */
export interface ParsedFont {
  fontStyle: string | null;
  fontVariant: string;
  fontWeight: number | string | null;
  fontSize: number;
  lineHeight: string;
  fontFamily: string;
  strikeout: boolean;
}

/** The part of a font transformText asks about small caps. */
interface FeatureQuery {
  hasFeature(feature: string): boolean;
}

const UNSUBSCRIBE = 1638;

function event(): TLEvent {
  let handlers: ((...args: unknown[]) => unknown)[] = [];
  const subscribe = ((handler: (...args: unknown[]) => unknown) => {
    handlers.push(handler);
  }) as TLEvent;
  subscribe.fire = (...args: unknown[]) => {
    handlers = handlers.filter((handler) => handler(...args) !== UNSUBSCRIBE);
  };
  subscribe.clearHandlers = () => {
    handlers = [];
  };
  return subscribe;
}

/**
 * The value of a CSS property in a style string, or null. With `numeric`
 * only the leading number of the value.
 */
function cssProperty(style: string, name: string, numeric?: boolean): string | null {
  const match = new RegExp("\\b(?:" + name + '\\s*?:\\s*([^;>]*?)(?=[;">}]|$))').exec(style);
  if (match && match.length > 1) {
    if (numeric) {
      const number = /([0-9]*)\.?[0-9]+/.exec(match[1] as string);
      return number && number.length ? number[0] : null;
    }
    return match[1] as string;
  }
  return null;
}

/**
 * Parses a CSS font shorthand as the GTL writes it ("italic 700 12px
 * Family"). The first word it doesn't know is the size (with an optional
 * "/line-height"), everything after the next unknown word is the family.
 * "oblique" sets strikeout, as it always did; a size in pt is converted
 * to px.
 */
function parseFont(font: string): ParsedFont {
  let word: string | undefined;
  let family = Formatting.defaultFormatting.fontFamily;
  let size: string | number | null = null;
  let strikeout = Formatting.defaultFormatting.strikeout;
  let style: string | null = Formatting.defaultFormatting.fontStyle;
  let weight: number | string | null = Formatting.defaultFormatting.fontWeight;
  let variant = "normal";
  let lineHeight = "normal";
  const words = font.split(/\s+/);
  words: while ((word = words.shift())) {
    switch (word) {
      case "normal":
        break;
      case "italic":
        style = Font.Style.Italic;
        break;
      case "oblique":
        strikeout = true;
        break;
      case "small-caps":
        variant = word;
        break;
      case "bold":
        weight = Font.Weight.Bold;
        break;
      case "bolder":
        weight = 900;
        break;
      case "lighter":
        weight = 200;
        break;
      case "100":
      case "200":
      case "300":
      case "400":
      case "500":
      case "600":
      case "700":
      case "800":
      case "900":
        weight = parseInt(word);
        break;
      default:
        if (!size) {
          const parts = word.split("/");
          size = parts[0] as string;
          if (parts.length > 1) lineHeight = parts[1] as string;
          break;
        }
        family = word;
        if (words.length) family += " " + words.join(" ");
        break words;
    }
  }
  // Like the old code this throws when the string had no size word.
  const points = (size as unknown as string).match(/[0-9]+pt$/);
  if (points && points.length) {
    size = parseFloat(size as unknown as string);
    size *= 96 / 72;
    size = GMath.round(size, false, 1);
  } else {
    size = parseFloat(size as unknown as string);
    size = GMath.round(size, false, 1);
    if (Number.isNaN(size)) size = 10;
  }
  return {
    fontStyle: "normal" == style ? Font.Style.Normal : style,
    fontVariant: variant,
    fontWeight: "normal" == weight ? Font.Weight.Regular : weight,
    fontSize: size,
    lineHeight,
    fontFamily: (family as string).replace(/^"(.*)"$/, "$1"),
    strikeout,
  };
}

/** Normalizes line breaks (only the first \r\n and \r, as before) and turns tabs into three spaces. */
function deCRLFify(text: string): string {
  return text.replace("\r\n", "\n").replace("\r", "\n").replace(/\t/g, "   ");
}

/** An object that inherits from `base` and has `values` as read-only own properties. */
function derive<T extends object>(base: T, values: Record<string, unknown>): T {
  const descriptors: PropertyDescriptorMap = {};
  Object.keys(values).forEach((key) => {
    descriptors[key] = { value: values[key] };
  });
  return Object.create(base, descriptors) as T;
}

/** Applies a text transformation; small caps only when the font has the feature. */
function transformText(
  text: string,
  transformation: string | null | undefined,
  font?: FeatureQuery | null,
): string {
  switch (transformation) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "capitalize":
      return text.toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase());
    case "smallcaps":
      if (font && font.hasFeature(Font.Features.SmallCaps)) {
        return Array.from(text)
          .map((char) => Font.SmallCapsUnicodeMap[char] || char)
          .join("");
      }
  }
  return text;
}

/** The GTL utilities under their old name (minus the G). */
export const TLUtil = {
  UNSUBSCRIBE,
  event,
  cssProperty,
  parseFont,
  deCRLFify,
  derive,
  transformText,
};
