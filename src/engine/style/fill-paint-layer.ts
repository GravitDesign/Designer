// Old: chunk.vendor.js module 901 (GStylable.FillPaintLayer).
import { equals, extend } from "../core/util.ts";
import { registerNodeClass } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import type { PropertiesChangeArgs } from "../scene/node-properties.ts";
import type { NodeBlob, RestoreChangeArgs } from "../serialize/blob.ts";
import { PaintLayer } from "./paint-layer.ts";
import { isDestroyable, type StyleSceneHooks } from "./stylable-sets.ts";

/** A fill. Its blend mode "color" makes it a separate layer. */
export class FillPaintLayer extends PaintLayer {
  static {
    registerNodeClass(this, "fillPaintLayer", "GStylable.FillPaintLayer");
  }

  /** Same blend, opacity, pattern and pattern transform. */
  static equals(a: FillPaintLayer, b: FillPaintLayer): boolean {
    let same = true;
    ["_bl", "_op", "_pt", "_px"].forEach((name) => {
      same = same && equals(a.getProperty(name), b.getProperty(name));
    });
    return same;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change == NodeChange.Restore) {
      // Old files saved fills as _fpt, _fvs, _fop, _fpx.
      const migrated = { blob: extend({}, (args as RestoreChangeArgs).blob) as NodeBlob };
      args = migrated;
      const legacy = ["_fpt", "_fvs", "_fop", "_fpx"];
      for (let i = 0; i < legacy.length; i++) {
        const name = legacy[i] as string;
        const current = name.replace(/f/g, "");
        if (Object.hasOwn(migrated.blob, name)) migrated.blob[current] = migrated.blob[name];
      }
    } else if (change === NodeChange.AfterPropertiesChange) {
      const scene = this.getScene();
      if (scene) {
        const changed = args as PropertiesChangeArgs;
        const index = changed.properties.indexOf("_pt");
        if (-1 !== index) {
          const previous = changed.values[index];
          if (previous && previous !== this.$_pt && isDestroyable(previous)) {
            scene.destroy([previous]);
          }
        }
        if (this.$_pt && isDestroyable(this.$_pt)) scene.addDestroyableIfAbsent(this.$_pt);
      }
    } else if (change === NodeChange.WorkspaceAttached) {
      const scene = this.getScene();
      if (scene && this.$_pt && isDestroyable(this.$_pt)) scene.addDestroyable(this.$_pt);
    } else if (change === NodeChange.WorkspaceDetach) {
      const scene = this.getScene();
      if (scene && this.$_pt && isDestroyable(this.$_pt)) scene.destroy([this.$_pt]);
    }
    super._handleChange(change, args);
  }

  override isSeparateLayer(): boolean {
    return "color" === this.$_bl;
  }

  /** The owner's scene (not the layer's own). */
  override getScene(): StyleSceneHooks | null {
    const owner = this.getOwnerStylable();
    return owner && owner.getScene ? owner.getScene() : null;
  }
}
