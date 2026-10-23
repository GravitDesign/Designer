// Old: chunk.vendor.js module 108 (GFont).
/**
 * A font as the text engine sees it: family, style and weight, plus the
 * glyph API GOpenTypeFont implements. The base class only answers the
 * questions every font can answer and throws "Unsupported operation." for
 * the rest, like the old abstract class.
 */
import { GObject, registerClass } from "../../core/object.ts";
import { LocaleKey } from "../../core/locale/locale-key.ts";
import type { Rect } from "../../math/rect.ts";
import type { VertexReader } from "../../geometry/vertex-source.ts";

/** "N" (normal) or "I" (italic). Other strings come from documents and are kept as they are. */
export type FontStyle = string;

/**
 * One positioned glyph as stringToGlyphs returns it. The last entry has
 * `glyph: null` and the pen position after the text.
 */
export interface PositionedGlyph<G = unknown> {
  glyph: G | null;
  x: number;
  y: number;
  /** The characters behind the glyph; null on the closing entry. */
  text: string | null | undefined;
  /** opentype.js path: the kerning value applied after the glyph. */
  kerning?: number | undefined;
  /** HarfBuzz path, right-to-left text: the negated x offset. */
  xOff?: number;
}

function unsupported(): never {
  throw new Error("Unsupported operation.");
}

export class Font extends GObject {
  static {
    registerClass(this, "GFont");
  }

  /** The OpenType feature ids the text inspector offers. */
  static Features = {
    SmallCaps: "smcp",
    Fractions: "frac",
    Variants: "fvar",
    StylisticSet: "stylisticset",
    LocalizedForm: "locl",
  } as const;

  /**
   * The Unicode small capital letters small caps text uses when a font has
   * all of them (s and x have none and stay as they are).
   */
  static SmallCapsUnicodeMap: Record<string, string> = {
    a: "ᴀ",
    b: "ʙ",
    c: "ᴄ",
    d: "ᴅ",
    e: "ᴇ",
    f: "ғ",
    g: "ɢ",
    h: "ʜ",
    i: "ɪ",
    j: "ᴊ",
    k: "ᴋ",
    l: "ʟ",
    m: "ᴍ",
    n: "ɴ",
    o: "ᴏ",
    p: "ᴘ",
    q: "ǫ",
    r: "ʀ",
    s: "s",
    t: "ᴛ",
    u: "ᴜ",
    v: "ᴠ",
    w: "ᴡ",
    x: "x",
    y: "ʏ",
    z: "ᴢ",
  };

  static Style = {
    Normal: "N",
    Italic: "I",
  } as const;

  static Weight = {
    Thin: 100,
    ExtraLight: 200,
    Light: 300,
    Regular: 400,
    Medium: 500,
    SemiBold: 600,
    Bold: 700,
    ExtraBold: 800,
    Heavy: 900,
  } as const;

  static WeightName: Record<number, LocaleKey> = {
    100: new LocaleKey("GFont", "weight.thin"),
    200: new LocaleKey("GFont", "weight.extra-light"),
    300: new LocaleKey("GFont", "weight.light"),
    400: new LocaleKey("GFont", "weight.regular"),
    500: new LocaleKey("GFont", "weight.medium"),
    600: new LocaleKey("GFont", "weight.semi-bold"),
    700: new LocaleKey("GFont", "weight.bold"),
    800: new LocaleKey("GFont", "weight.extra-bold"),
    900: new LocaleKey("GFont", "weight.heavy"),
  };

  static WeightNameItalic: Record<number, LocaleKey> = {
    100: new LocaleKey("GFont", "weight.thin-italic"),
    200: new LocaleKey("GFont", "weight.extra-light-italic"),
    300: new LocaleKey("GFont", "weight.light-italic"),
    400: new LocaleKey("GFont", "weight.regular-italic"),
    500: new LocaleKey("GFont", "weight.medium-italic"),
    600: new LocaleKey("GFont", "weight.semi-bold-italic"),
    700: new LocaleKey("GFont", "weight.bold-italic"),
    800: new LocaleKey("GFont", "weight.extra-bold-italic"),
    900: new LocaleKey("GFont", "weight.heavy-italic"),
  };

  /** Same family, style and weight; two missing fonts are equal too. */
  static equals(a: Font | null | undefined, b: Font | null | undefined): boolean {
    return a && b
      ? a.getFamily() === b.getFamily() &&
          a.getStyle() === b.getStyle() &&
          a.getWeight() === b.getWeight()
      : !!a == !!b;
  }

  /** Old short names of the CJK families, as some documents store them. */
  static getFontFamilyCorrected(family: string): string {
    return family === "Noto Sans CS"
      ? "Noto Sans CJK SC"
      : family === "Noto Sans CT"
        ? "Noto Sans CJK TC"
        : family;
  }

  declare _failed: boolean;

  isResolved(): boolean {
    return unsupported();
  }

  isEmbedded(): boolean {
    return false;
  }

  setFailed(failed: boolean): void {
    this._failed = failed;
  }

  isFailed(): boolean {
    return this._failed;
  }

  /** A CSS @font-face src for the font file, or null. */
  toFontFaceSrc(): string | null {
    return null;
  }

  toCssProperties(): Record<string, string | null> {
    const style = (() => {
      switch (this.getStyle()) {
        case Font.Style.Normal:
          return "normal";
        case Font.Style.Italic:
          return "italic";
        default:
          throw new Error("Unknown style");
      }
    })();
    return {
      "font-family": this.getFamily(),
      "font-style": style,
      "font-weight": this.getWeight() ? this.getWeight().toString() : null,
    };
  }

  getFamily(): string {
    return unsupported();
  }

  getStyle(): FontStyle {
    return unsupported();
  }

  getWeight(): number {
    return unsupported();
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- the old abstract signatures, implemented by OpenTypeFont */

  getGlyphBaseline(_fontSize: number): number {
    return unsupported();
  }

  stringToGlyphs(
    _text: string,
    _x?: number,
    _y?: number,
    _fontSize?: number,
    _options?: unknown,
  ): PositionedGlyph[] {
    return unsupported();
  }

  getGlyphBoundingRect(_fontSize: number, _glyph: unknown, _exact?: boolean): Rect {
    return unsupported();
  }

  getGlyphOutline(_fontSize: number, _x: number, _y: number, _glyph: unknown): VertexReader {
    return unsupported();
  }

  getLeftSideBearing(_fontSize: number, _char: string): number {
    return unsupported();
  }

  getMaxFontHeight(_fontSize: number): number {
    return unsupported();
  }

  getAdvance(_fontSize: number, _glyph: unknown, _previous?: unknown): number {
    return unsupported();
  }

  hasFeature(_feature: string): boolean {
    return false;
  }

  getAvailableStylisticSets(_script?: string): string[] {
    return [];
  }

  getAvailableLanguageSystemTags(_script?: string): string[] {
    return [];
  }

  /* eslint-enable @typescript-eslint/no-unused-vars */
}

Font.prototype._failed = false;
