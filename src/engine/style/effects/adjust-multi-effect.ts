// Old: chunk.vendor.js module 1027 (GAdjustMultiEffect).
import { Locale } from "../../core/locale/locale.ts";
import { registerNodeClass } from "../../scene/node.ts";
import { GLBlurEffect } from "../webgl/effects/gl-blur-effect.ts";
import { GLDotScreenEffect } from "../webgl/effects/gl-dot-screen-effect.ts";
import { GLSepiaEffect } from "../webgl/effects/gl-sepia-effect.ts";
import { MultiEffect } from "./multi-effect.ts";

/** Dot screen, sepia and blur as one effect. */
export class AdjustMultiEffect extends MultiEffect {
  static {
    registerNodeClass(this, "adjustMultiEffect", "GAdjustMultiEffect");
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GAdjustMultiEffect", "name", this.getNodeName()) as string;
  }

  override toString(): string {
    return "[Object GAdjustMultiEffect]";
  }
}

// Like the old module, the class tables (GeometryProperties with the
// prefixed sub-effect properties, VisualProperties, __FX) are set when the
// module loads, before any instance exists.
MultiEffect.register(AdjustMultiEffect, [GLDotScreenEffect, GLSepiaEffect, GLBlurEffect]);
