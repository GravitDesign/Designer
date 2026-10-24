// Old: chunk.vendor.js module 793 (pattern/sketchgradient).
import type { GradientStop } from "../../../engine/style/gradient.ts";
import type { SceneNodeLike } from "./scene-node.ts";
import { SketchColor } from "./sketch-color.ts";
import type { SketchGradientData } from "./sketch-data.ts";
import { SketchPattern } from "./sketch-pattern.ts";

export class SketchGradient extends SketchPattern<SketchGradientData> {
  declare _gradient: unknown;

  override applyTo(layer: SceneNodeLike): void {
    layer.setProperty("_pt", this._gradient);
  }

  override parse(): void {
    this._gradient = this._getGradient();
  }

  _getGradient(): unknown {
    throw new Error("Not Implemented");
  }

  _getStops(): GradientStop[] {
    return this._data.stops.map((stop) => {
      const color = new SketchColor(stop.color);
      return {
        position: stop.position,
        color: color._color as GradientStop["color"],
        opacity: color._alpha,
      };
    });
  }
}

SketchGradient.prototype._gradient = null;
