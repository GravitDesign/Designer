import { Font } from "../../engine/text/fonts/font.ts";
import { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { OpenTypeFont } from "../../engine/text/fonts/open-type-font.ts";
import { OpenTypeUtil } from "../../engine/text/fonts/open-type-util.ts";

/** engine-fonts in the parity bridge, under the names of the old G barrel (vendor module 1). */
export const engineFonts = {
  GFont: Font,
  GFontManager: FontManager,
  GOpenTypeFont: OpenTypeFont,
  GOpenTypeUtil: OpenTypeUtil,
};
