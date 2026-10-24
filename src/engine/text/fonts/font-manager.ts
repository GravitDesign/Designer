// Old: chunk.vendor.js module 281 (GFontManager).
/**
 * The fonts a workspace knows. `getFont` answers from the list or asks the
 * app to resolve the font (ResolveFontEvent); until then the list holds a
 * FontEntry placeholder, which `_resolvedFont` swaps for the real font.
 * A font whose resolver never calls back stays pending forever, as before.
 */
import { Event } from "../../core/event.ts";
import { EventTarget } from "../../core/event-target.ts";
import { registerClass } from "../../core/object.ts";
import { Font, type FontStyle } from "./font.ts";
import { FontEntry } from "./font-entry.ts";

/** A font became available (it was resolved). */
export class FontAvailableEvent extends Event {
  static {
    registerClass(this, "GFontManager.FontAvailableEvent");
  }

  font: Font;

  constructor(font: Font) {
    super();
    this.font = font;
  }

  override toString(): string {
    return "[Event GFontManager.FontAvailableEvent]";
  }
}

/** Resolving a font failed. */
export class FontUnavailableEvent extends Event {
  static {
    registerClass(this, "GFontManager.FontUnavailableEvent");
  }

  font: Font;

  constructor(font: Font) {
    super();
    this.font = font;
  }

  override toString(): string {
    return "[Event GFontManager.FontUnavailableEvent]";
  }
}

/**
 * Asks the app for a font. The listener calls `resolved(font)` with the
 * loaded font (now or later) or `failed()`.
 */
export class ResolveFontEvent extends Event {
  static {
    registerClass(this, "GFontManager.ResolveFontEvent");
  }

  family: string;
  style: FontStyle;
  weight: number;
  resolved: (font: Font) => void;
  failed: () => void;
  /** Whether the app may look for a substitute (default true). */
  tryToResolveMissingFont: boolean;

  constructor(
    family: string,
    style: FontStyle,
    weight: number,
    resolved: (font: Font) => void,
    failed: () => void,
    tryToResolveMissingFont?: boolean,
  ) {
    super();
    this.family = family;
    this.style = style;
    this.weight = weight;
    this.resolved = resolved;
    this.failed = failed;
    this.tryToResolveMissingFont = tryToResolveMissingFont === undefined || tryToResolveMissingFont;
  }

  override toString(): string {
    return "[Event GFontManager.ResolveFontEvent]";
  }
}

/** Asks the app which fonts a family has; the listener passes them to `callback`. */
export class QueryFontFamilyEvent extends Event {
  static {
    registerClass(this, "GFontManager.QueryFontFamilyEvent");
  }

  family: string;
  callback: (fonts: unknown) => void;
  /** Never set by the font manager; kept from the old constructor. */
  failed: unknown;

  constructor(family: string, callback: (fonts: unknown) => void, failed?: unknown) {
    super();
    this.family = family;
    this.callback = callback;
    this.failed = failed;
  }

  override toString(): string {
    return "[Event GFontManager.QueryFontFamilyEvent]";
  }
}

export class FontManager extends EventTarget {
  static {
    registerClass(this, "GFontManager");
  }

  declare static FontAvailableEvent: typeof FontAvailableEvent;
  declare static FontUnavailableEvent: typeof FontUnavailableEvent;
  declare static ResolveFontEvent: typeof ResolveFontEvent;
  declare static QueryFontFamilyEvent: typeof QueryFontFamilyEvent;

  _defaultFont: Font | null = null;
  _defaultStyles: unknown = null;
  _defaultWeights: unknown = null;
  _fonts: Font[] = [];

  getDefaultFont(): Font | null {
    return this._defaultFont;
  }

  getFonts(): Font[] {
    return this._fonts;
  }

  /** Sets the default font; an unresolved one is replaced by an equal resolved font from the list. */
  setDefaultFont(font: Font): void {
    if (!font.isResolved()) {
      for (let i = 0; i < this._fonts.length; ++i) {
        const known = this._fonts[i] as Font;
        if (known.isResolved() && Font.equals(known, font)) {
          font = known;
          break;
        }
      }
    }
    this._defaultFont = font;
  }

  setDefaultFontStyles(styles: unknown): void {
    this._defaultStyles = styles;
  }

  setDefaultFontWeights(weights: unknown): void {
    this._defaultWeights = weights;
  }

  getDefaultFontStyles(): unknown {
    return this._defaultStyles;
  }

  getDefaultFontWeights(): unknown {
    return this._defaultWeights;
  }

  /**
   * The resolved font, or else asks the app to resolve it and returns what
   * the list holds afterwards (the font when it resolved synchronously,
   * else the placeholder). Null when nobody listens for ResolveFontEvent.
   * Every call that doesn't find a resolved font asks again.
   */
  getFont(
    family: string,
    style: FontStyle,
    weight: number,
    tryToResolveMissingFont?: boolean,
  ): Font | null {
    let font = this._getFont(family, style, weight);
    if (font && font.isResolved()) return font;
    if (!this.hasEventListeners(ResolveFontEvent)) return null;
    if (!font) {
      font = new FontEntry(family, style, weight);
      this._fonts.push(font);
    }
    font.setFailed(false);
    this.trigger(
      new ResolveFontEvent(
        family,
        style,
        weight,
        this._resolvedFont.bind(this),
        this._unresolvedFont.bind(this, font),
        tryToResolveMissingFont,
      ),
    );
    return this._getFont(family, style, weight);
  }

  /** The fonts of a family as the app lists them, or undefined. */
  queryFontFamily(family: string): unknown {
    if (this.hasEventListeners(QueryFontFamilyEvent)) {
      let result: unknown;
      this.trigger(
        new QueryFontFamilyEvent(family, (fonts) => {
          result = fonts;
        }),
      );
      return result;
    }
    return undefined;
  }

  /** Turns every resolved font of the family back into a placeholder. */
  removeFont(family: string): void {
    for (let i = 0; i < this._fonts.length; ++i) {
      const font = this._fonts[i] as Font;
      if (font.getFamily() === family && font.isResolved()) {
        this._fonts[i] = new FontEntry(font.getFamily(), font.getStyle(), font.getWeight());
      }
    }
  }

  /** A resolved font if the list has one, else the last matching placeholder, else null. */
  _getFont(family: string, style: FontStyle, weight: number): Font | null {
    let placeholder: Font | null = null;
    for (let i = 0; i < this._fonts.length; ++i) {
      const font = this._fonts[i] as Font;
      if (font.getFamily() === family && font.getStyle() === style && font.getWeight() === weight) {
        if (font.isResolved()) return font;
        placeholder = font;
      }
    }
    return placeholder;
  }

  hasUnresolvedFonts(): boolean {
    return !!this._fonts.length && this._fonts.some((font) => !font.isResolved());
  }

  /** Unresolved fonts that haven't failed. */
  hasPendingFonts(): boolean {
    return (
      !!this._fonts.length && this._fonts.some((font) => !font.isResolved() && !font.isFailed())
    );
  }

  _unresolvedFont(font: Font): void {
    font.setFailed(true);
    if (this.hasEventListeners(FontUnavailableEvent)) {
      this.trigger(new FontUnavailableEvent(font));
    }
  }

  /** Replaces the first unresolved equal font in the list with the resolved one. */
  _resolvedFont(font: Font): void {
    if (!font.isResolved()) return;
    for (let i = 0; i < this._fonts.length; ++i) {
      const known = this._fonts[i] as Font;
      if (Font.equals(known, font) && !known.isResolved()) {
        this._fonts[i] = font;
        if (Font.equals(font, this._defaultFont)) this._defaultFont = font;
        if (this.hasEventListeners(FontAvailableEvent)) {
          this.trigger(new FontAvailableEvent(font));
        }
        break;
      }
    }
  }
}

FontManager.FontAvailableEvent = FontAvailableEvent;
FontManager.FontUnavailableEvent = FontUnavailableEvent;
FontManager.ResolveFontEvent = ResolveFontEvent;
FontManager.QueryFontFamilyEvent = QueryFontFamilyEvent;
