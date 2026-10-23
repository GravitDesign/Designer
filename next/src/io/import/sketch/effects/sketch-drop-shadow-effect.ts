// Old: chunk.vendor.js module 1125 (effects/sketchdropshadoweffect).
import { DropShadowEffect } from "../../../../engine/style/effects/drop-shadow-effect.ts";
import type { SketchShadowData } from "../sketch-data.ts";
import { SketchColor } from "../sketch-color.ts";
import { SketchEffect, type EffectNodeLike } from "./sketch-effect.ts";

export class SketchDropShadowEffect extends SketchEffect<SketchShadowData> {
  override _getEffect(): EffectNodeLike {
    const color = new SketchColor(this._data.color);
    const effect = new DropShadowEffect();
    effect.setProperties(
      ["r", "x", "y", "pat", "opc"],
      [this._data.blurRadius, this._data.offsetX, this._data.offsetY, color._color, color._alpha],
    );
    return effect;
  }
}
