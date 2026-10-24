// Old: chunk.vendor.js module 568 (an unnamed GFont subclass).
/**
 * A font that is known by family, style and weight only: the placeholder
 * GFontManager keeps while a font is being resolved (or after resolving it
 * failed), and the GText.DEFAULTFONT placeholder.
 */
import { registerClass } from "../../core/object.ts";
import { Font, type FontStyle } from "./font.ts";

export class FontEntry extends Font {
  static {
    // The old class had no name; it never reached the G namespace.
    registerClass(this, "GFontEntry");
  }

  _family: string;
  _style: FontStyle;
  _weight: number;

  constructor(family: string, style: FontStyle, weight: number) {
    super();
    this._family = family;
    this._style = style;
    this._weight = weight;
  }

  override isResolved(): boolean {
    return false;
  }

  override getFamily(): string {
    return this._family;
  }

  override getStyle(): FontStyle {
    return this._style;
  }

  override getWeight(): number {
    return this._weight;
  }
}
