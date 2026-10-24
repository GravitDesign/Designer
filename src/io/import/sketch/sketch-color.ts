// Old: chunk.vendor.js module 599 (pattern/sketchcolor).
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import type { SceneNodeLike } from "./scene-node.ts";
import type { SketchColorData } from "./sketch-data.ts";
import { SketchPattern } from "./sketch-pattern.ts";

export class SketchColor extends SketchPattern<SketchColorData> {
  declare _color: RGBColor | null;
  declare _alpha: number;

  override parse(): void {
    this._color = new RGBColor([
      Math.round(255 * this._data.red),
      Math.round(255 * this._data.green),
      Math.round(255 * this._data.blue),
    ]);
    this._alpha = this._data.alpha;
  }

  /** The colour as the layer's pattern and the alpha as its opacity. */
  override applyTo(layer: SceneNodeLike): void {
    layer.setProperty("_pt", this._color);
    layer.setProperty("_op", this._alpha);
  }
}

SketchColor.prototype._color = null;
SketchColor.prototype._alpha = 1;
