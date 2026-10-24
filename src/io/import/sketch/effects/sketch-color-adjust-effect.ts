// Old: chunk.vendor.js module 1124 (effects/sketchcoloradjusteffect).
import { GMath } from "../../../../engine/math/math.ts";
import { GLColorAdjustEffect } from "../../../../engine/style/webgl/effects/gl-color-adjust-effect.ts";
import type { SketchColorControlsData } from "../sketch-data.ts";
import { SketchEffect, type EffectNodeLike } from "./sketch-effect.ts";

export class SketchColorAdjustEffect extends SketchEffect<SketchColorControlsData> {
  override _getEffect(): EffectNodeLike {
    const effect = new GLColorAdjustEffect(true);
    effect.setProperty("shp", {
      brightness: this._data.brightness,
      contrast: GMath.normalizeValue(this._data.contrast, 0, 4, -1, 1),
      hue: GMath.normalizeValue(this._data.hue, -Math.PI, Math.PI, -1, 1),
      saturation: GMath.normalizeValue(this._data.saturation, 0, 3.5, -1, 1),
    });
    return effect;
  }
}
