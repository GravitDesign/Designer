// Old: chunk.vendor.js module 1126 (effects/sketchinnershadoweffect).
import { InnerShadowEffect } from "../../../../engine/style/effects/inner-shadow-effect.ts";
import type { SketchShadowData } from "../sketch-data.ts";
import { SketchColor } from "../sketch-color.ts";
import { SketchEffect, type EffectNodeLike } from "./sketch-effect.ts";

/**
 * The old module assigned this `_getEffect` to the base class's prototype
 * instead of its own. Every other effect overrides it, so besides this
 * class only a bare SketchEffect ran it (a layer of class "effect", which
 * fails further on either way); defining it here behaves the same.
 */
export class SketchInnerShadowEffect extends SketchEffect<SketchShadowData> {
  override _getEffect(): EffectNodeLike {
    const color = new SketchColor(this._data.color);
    const effect = new InnerShadowEffect();
    effect.setProperties(
      ["r", "x", "y", "pat", "opc"],
      [this._data.blurRadius, this._data.offsetX, this._data.offsetY, color._color, color._alpha],
    );
    return effect;
  }
}
