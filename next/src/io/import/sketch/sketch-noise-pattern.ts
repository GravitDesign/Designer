// Old: chunk.vendor.js module 1133 (pattern/sketchnoisepattern).
import { NoisePattern } from "../../../engine/style/noise-pattern.ts";
import type { SceneNodeLike } from "./scene-node.ts";
import type { SketchFillData } from "./sketch-data.ts";
import { SketchPattern } from "./sketch-pattern.ts";

/**
 * A noise fill: one of the noise pattern's types by `noiseIndex`. (The old
 * class inherited GNoisePattern's prototype while running SketchPattern's
 * constructor; only these two methods were ever called on it.)
 */
export class SketchNoisePattern extends SketchPattern<SketchFillData> {
  declare _pattern: NoisePattern | null;

  override parse(): void {
    const types = Object.keys(NoisePattern.Type).map(
      (key) => NoisePattern.Type[key as keyof typeof NoisePattern.Type],
    );
    this._pattern = new NoisePattern();
    this._pattern.setType(types[this._data.noiseIndex as number] as (typeof types)[number]);
  }

  override applyTo(layer: SceneNodeLike): void {
    layer.setProperty("_pt", this._pattern);
  }
}

SketchNoisePattern.prototype._pattern = null;
