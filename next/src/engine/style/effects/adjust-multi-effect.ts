// Old: chunk.vendor.js module 1027 (GAdjustMultiEffect).
import { Locale } from "../../core/locale/locale.ts";
import { registerNodeClass } from "../../scene/node.ts";
import { glEffectClass } from "./effect-paint.ts";
import { MultiEffect } from "./multi-effect.ts";

let effectsRegistered = false;

/**
 * Registers the effects (dot screen, sepia, WebGL blur). The old module
 * did this when it loaded; they belong to engine-effects-webgl, so here it
 * happens on first construction, when they are sure to be loaded.
 */
function registerEffects(): void {
  if (effectsRegistered) return;
  MultiEffect.register(AdjustMultiEffect, [
    glEffectClass("GGLDotScreenEffect"),
    glEffectClass("GGLSepiaEffect"),
    glEffectClass("GGLBlurEffect"),
  ]);
  effectsRegistered = true;
}

/** Dot screen, sepia and blur as one effect. */
export class AdjustMultiEffect extends MultiEffect {
  static {
    registerNodeClass(this, "adjustMultiEffect", "GAdjustMultiEffect");
  }

  constructor() {
    registerEffects();
    super();
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GAdjustMultiEffect", "name", this.getNodeName()) as string;
  }

  override toString(): string {
    return "[Object GAdjustMultiEffect]";
  }
}
