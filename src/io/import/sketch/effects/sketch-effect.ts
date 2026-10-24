// Old: chunk.vendor.js module 597 (effects/sketcheffect).
import { Stylable } from "../../../../engine/style/stylable.ts";
import type { SceneNodeLike } from "../scene-node.ts";
import { SketchParser } from "../sketch-parser.ts";

/** An engine effect made by `_getEffect` (a node with properties). */
export interface EffectNodeLike {
  setProperty(name: string, value: unknown): void;
  setProperties(names: string[], values: unknown[]): void;
}

/**
 * A layer effect: `parse()` makes the engine effect, `applyTo` adds it to
 * the node's effects, hidden when Sketch has it disabled. Without parse()
 * `_effect` stays null and only a background blur adds its fill layer
 * (sketch-blur-effect.ts); see "Sketch layer effects are dropped" in
 * BUGS-FIXED.md.
 */
export class SketchEffect<D = unknown> extends SketchParser<D> {
  declare _effect: EffectNodeLike | null | undefined;

  override parse(): void {
    this._effect = this._getEffect();
  }

  applyTo(node: SceneNodeLike): void {
    if (this._effect && node.hasMixin(Stylable)) {
      const effects = node.getEffects();
      if (effects) {
        this._effect.setProperty("vs", (this._data as { isEnabled?: boolean }).isEnabled);
        effects.appendChild(this._effect as unknown as SceneNodeLike);
      }
    }
  }

  _getEffect(): EffectNodeLike | null | undefined {
    throw new Error("Not Implemented");
  }
}

SketchEffect.prototype._effect = null;
