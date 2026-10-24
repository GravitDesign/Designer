import { Background } from "../../engine/style/background.ts";
import { Dictionary } from "../../engine/style/dictionary.ts";
import "../../engine/style/element-stylable.ts";
import { Stylable } from "../../engine/style/stylable.ts";
import { Style } from "../../engine/style/style.ts";
import { Swatch } from "../../engine/style/swatch.ts";
import { Swatches } from "../../engine/style/swatches.ts";
import { TexturePattern } from "../../engine/style/texture-pattern.ts";

// GElement.Stylable is reached through GElement (engine-scene-node).
export const engineStyle = {
  GStylable: Stylable,
  GTexturePattern: TexturePattern,
  GDictionary: Dictionary,
  GBackground: Background,
  GStyle: Style,
  GSwatch: Swatch,
  GSwatches: Swatches,
};
