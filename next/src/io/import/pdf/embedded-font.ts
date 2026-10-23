// Old: chunk.vendor.js module 1395.
//
// A font that came embedded in an imported PDF. Unlike OpenTypeFont.create
// it throws when the font data can't be used.
import * as opentype from "../../../engine/text/opentype/opentype.ts";
import type { FontStyle } from "../../../engine/text/fonts/font.ts";
import { OpenTypeFont } from "../../../engine/text/fonts/open-type-font.ts";

export class EmbeddedFont extends OpenTypeFont {
  constructor(family: string, style: FontStyle, weight: number, buffer: ArrayBuffer) {
    const font = opentype.parse(buffer);
    // The old code threw a plain string.
    if (!font || !font.supported) throw "Could not load embedded font";
    super(family, style, weight, buffer, font);
  }

  override isEmbedded(): boolean {
    return true;
  }
}
