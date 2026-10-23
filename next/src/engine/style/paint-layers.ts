// Old: chunk.vendor.js module 904 (GStylable.PaintLayers).
import { each } from "../core/util.ts";
import type { AnyConstructor } from "../core/object.ts";
import { Node, registerNodeClass } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import { Container } from "../scene/node-container.ts";
import { Store } from "../scene/node-store.ts";
import { SceneNode } from "../scene/scene-node.ts";
import type { RestoreChangeArgs } from "../serialize/blob.ts";
import { BorderPaintLayer } from "./border-paint-layer.ts";
import { FillPaintLayer } from "./fill-paint-layer.ts";
import type { PaintLayer } from "./paint-layer.ts";
import { BorderAlignment, type StyleOwner } from "./stylable-sets.ts";

/** A legacy flat style: the class it becomes and its old blob keys. */
type LegacyLayerInfo = { $class: new () => PaintLayer } & Record<string, unknown>;

/**
 * The fills and borders of a stylable element, in paint order. Child
 * inserts and removes are reported to the element as geometry changes.
 */
export class PaintLayers extends Store(Container(SceneNode)) {
  static {
    registerNodeClass(this, "paintLayers", "GStylable.PaintLayers");
  }

  constructor() {
    super();
    // The old constructor was empty and didn't run GSceneNode's, so the
    // container had no refs.
    delete (this as { $refs?: string[] }).$refs;
  }

  /**
   * The flat style keys of old files (`_fpt`, `_bw`, ...). Restoring a blob
   * with any of them puts them into the last layer of that kind, created
   * when missing.
   */
  static PropertySetInfo: Record<string, LegacyLayerInfo> = {
    F: {
      $class: FillPaintLayer,
      _fpt: null,
      _fop: 1,
      _fvs: true,
      _fpx: null,
    },
    B: {
      $class: BorderPaintLayer,
      _bop: 1,
      _bvs: true,
      _bpt: null,
      _bpx: null,
      _bw: 1,
      _ba: BorderAlignment.Center,
      _bds: null,
      _blc: "square",
      _blj: "miter",
      _bml: 3,
      _bmo: false,
      _bmi: true,
      _bhm: null,
      _bhms: 1,
      _btm: null,
      _btms: 1,
    },
  };

  hasStyleFill(): boolean {
    return !!this.getFillLayers(true).length;
  }

  hasStyleBorder(): boolean {
    return !!this.getBorderLayers(true).length;
  }

  /** The layers, optionally of one class and only those with something to paint. */
  getLayers<T extends PaintLayer = PaintLayer>(
    layerClass?: AnyConstructor<T> | null,
    withStyle?: boolean,
  ): T[] {
    let layers = this.getChildren() as T[];
    if (layerClass || withStyle) {
      layers = layers.filter(
        (layer) => (!layerClass || layer instanceof layerClass) && (!withStyle || layer.hasStyle()),
      );
    }
    return layers;
  }

  getFillLayers(withStyle?: boolean): FillPaintLayer[] {
    return this.getLayers(FillPaintLayer, withStyle);
  }

  getBorderLayers(withStyle?: boolean): BorderPaintLayer[] {
    return this.getLayers(BorderPaintLayer, withStyle);
  }

  clearLayers(): void {
    this.removeLayers(this.getLayers());
  }

  clearFillLayers(): void {
    this.removeLayers(this.getFillLayers());
  }

  clearBorderLayers(): void {
    this.removeLayers(this.getBorderLayers());
  }

  removeLayers(layers: readonly PaintLayer[]): void {
    each(layers, (_index, layer) => {
      this.removeChild(layer);
    });
  }

  /**
   * Whether the fills need mask painting: more than one mask, or a mask
   * directly below a normal fill.
   */
  hasFillMaskLayers(): boolean {
    const fills = this.getFillLayers(true);
    if (fills.filter((fill) => fill.isMask()).length > 1) return true;
    for (let i = 1; i < fills.length; i++) {
      const below = fills[i - 1];
      const above = fills[i];
      if (below && above && below.isMask() && !above.isMask()) return true;
    }
    return false;
  }

  hasSeparateFillLayer(): boolean {
    const fills = this.getFillLayers(true);
    for (let i = 0; i < fills.length; i++) {
      if ((fills[i] as FillPaintLayer).isSeparateLayer()) return true;
    }
    return false;
  }

  override _handleChange(change: number, args?: unknown): void {
    const owner = this.getParent() as unknown as StyleOwner | null;
    if (owner) {
      if (change == NodeChange.BeforeChildInsert || change === NodeChange.BeforeChildRemove) {
        owner._stylePrepareGeometryChange(args);
      }
      if (change == NodeChange.AfterChildInsert || change === NodeChange.AfterChildRemove) {
        owner._styleFinishGeometryChange(args);
      }
    }
    if (change == NodeChange.Restore) {
      const restore = args as RestoreChangeArgs;
      const kinds = Object.keys(PaintLayers.PropertySetInfo);
      each(kinds, (_index, kind) => {
        const info = PaintLayers.PropertySetInfo[kind] as LegacyLayerInfo;
        for (const key in info) {
          if (Object.hasOwn(restore.blob, key)) {
            this._beginBlockChanges([NodeChange.BeforeChildInsert, NodeChange.AfterChildInsert]);
            try {
              let layer = this.getLayers(info.$class).pop();
              if (!layer) this.appendChild((layer = new info.$class()));
              layer._beginBlockChanges([
                NodeChange.BeforePropertiesChange,
                NodeChange.AfterPropertiesChange,
              ]);
              try {
                layer._handleChange(change, args);
              } finally {
                layer._endBlockChanges([
                  NodeChange.BeforePropertiesChange,
                  NodeChange.AfterPropertiesChange,
                ]);
              }
            } finally {
              this._endBlockChanges([NodeChange.BeforeChildInsert, NodeChange.AfterChildInsert]);
            }
            break;
          }
        }
      });
    }
    // The old code skipped the scene node's handler here.
    Node.prototype._handleChange.call(this, change, args);
  }

  /** A new multi-reference id, which the element keeps as `_layId`. */
  override resetMultireference(): void {
    super.resetMultireference();
    const owner = this.getParent() as unknown as StyleOwner | null;
    if (owner) owner._layId = this.getMultireferenceId();
  }
}
