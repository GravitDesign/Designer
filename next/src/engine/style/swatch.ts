// Old: chunk.vendor.js module 517 (GSwatch).
import { CMYKColor } from "../color/cmyk-color.ts";
import { equals } from "../core/util.ts";
import { Node, registerNodeClass } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import { Properties } from "../scene/node-properties.ts";
import { Store } from "../scene/node-store.ts";
import { SceneNode } from "../scene/scene-node.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { getNoisePatternClass, type NoisePatternLike } from "./late-bound.ts";
import { Pattern } from "./pattern.ts";
import { TexturePattern } from "./texture-pattern.ts";

/** A named pattern (`_pt`) with opacity in the document's swatches. */
export class Swatch extends Store(Properties(SceneNode)) {
  static {
    registerNodeClass(this, "swatch", "GSwatch");
  }

  static visualProperties: Record<string, unknown> = {
    _pt: null,
    _op: 1,
  };

  /**
   * Same pattern and opacity (by value). Noise patterns also need the same
   * noise type and textures the same settings; their transform and node
   * don't count.
   */
  static equals(a: Swatch, b: Swatch): boolean {
    let same = true;
    ["_pt", "_op"].forEach((name) => {
      same = same && equals(a.getProperty(name), b.getProperty(name), true);
    });
    if (same) {
      const left = a.getProperty("_pt");
      const right = b.getProperty("_pt");
      const noiseClass = getNoisePatternClass();
      if (noiseClass && left instanceof noiseClass && right instanceof noiseClass) {
        same = (left as NoisePatternLike)._type === (right as NoisePatternLike)._type;
      } else if (left instanceof TexturePattern && right instanceof TexturePattern) {
        same = true;
        (
          [
            "_url",
            "_repeatMode",
            "_sizeMode",
            "_width",
            "_height",
            "_position",
            "_mask",
            "_angle",
            "_scaleMode",
            "_tileSize",
          ] as const
        ).forEach((key) => {
          same = same && left[key] === right[key];
        });
      }
    }
    return same;
  }

  declare $_pt: Pattern | null;
  declare $_op: number;

  constructor(pattern?: Pattern | null, opacity?: number | null) {
    super();
    this._setDefaultProperties(Swatch.visualProperties);
    this.setProperties(["_pt", "_op"], [pattern, null == opacity ? 1 : opacity]);
  }

  isCMYK(): boolean {
    return this.$_pt instanceof CMYKColor;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const { blob, options } = args as StoreChangeArgs;
      this.storeProperties(blob, Swatch.visualProperties, (name, value) =>
        value && "_pt" === name ? Pattern.serialize(value as Pattern, options) : value,
      );
    } else if (change === NodeChange.Restore) {
      this.restoreProperties(
        (args as RestoreChangeArgs).blob,
        Swatch.visualProperties,
        (name, value) => (value && "_pt" === name ? Pattern.deserialize(value as string) : value),
      );
    }
    // The old code skipped the scene node's handler here.
    Node.prototype._handleChange.call(this, change, args);
  }

  override validateInsertion(parent: Node): boolean {
    return "swatches" === Node.getName(parent);
  }

  override toString(): string {
    return "[Mixin GSwatch]";
  }
}
