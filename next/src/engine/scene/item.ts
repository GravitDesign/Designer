// Old: chunk.vendor.js module 104 (GItem).
/**
 * A block that can be placed in a layer, a page or another item: shapes,
 * groups, texts, images. Items carry constraints (GElement.Anchor) and
 * `clk` (click-through: selection skips them), and scale their border
 * widths with their transform when the border or the scene says so.
 */
import { registerClass } from "../core/object.ts";
import { GMath } from "../math/math.ts";
import type { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import type { Transform, TransformDecomposition } from "../math/transform.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { Block } from "./block.ts";
import { Anchor } from "./element-anchor.ts";
import { NodeChange } from "./node-change.ts";
import type { ContainerNode } from "./node-container.ts";
import type { PropertiesChangeArgs } from "./node-properties.ts";
import { Node } from "./node.ts";
import { isStylable } from "./style-hooks.ts";

const MetaProperties = {
  clk: false,
};

export class Item extends Anchor(Block) {
  static {
    registerClass(this, "GItem");
  }

  static override MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;

  declare $clk: boolean;
  /** Set by code that changes `trf` without wanting the borders scaled. */
  declare skipBorderUpdate: boolean;
  /** GElement.Layout's pending transform, when the subclass is a layout. */
  declare _layoutTransform?: Transform | null;

  constructor() {
    super();
    this._setDefaultProperties(MetaProperties);
    this._setDefaultProperties(Anchor.MetaProperties);
  }

  override validateInsertion(parent: ContainerNode, reference?: Node | null): boolean {
    void reference;
    return (
      "layer" === Node.getName(parent) || parent instanceof Item || "page" === Node.getName(parent)
    );
  }

  override assignFrom(other: Node): void {
    if (other instanceof Item)
      this.transferProperties(other, [MetaProperties, Anchor.MetaProperties]);
    super.assignFrom(other);
  }

  /** The center of the geometry box. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  getCenter(arg?: unknown): Point | null {
    const bbox = this.getGeometryBBox();
    return bbox ? bbox.getSide(Rect.Side.CENTER) : null;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, MetaProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, MetaProperties);
    } else if (
      change === NodeChange.AfterPropertiesChange &&
      (args as PropertiesChangeArgs).properties.indexOf("trf") >= 0 &&
      this._scene &&
      !this.isRecordedTransaction() &&
      !this.skipBorderUpdate
    ) {
      this._handleBorderScale(args as PropertiesChangeArgs);
    }
    super._handleChange(change, args);
    this._handleAnchorChange(change, args);
  }

  /**
   * Scales the widths of the borders that scale (`_bs`, or all when the
   * scene's borderScale is true) by the area scale of the trf change.
   */
  _handleBorderScale(change: PropertiesChangeArgs): void {
    const settings = this._scene ? this._scene.getTransformSettings() : null;
    if (!(isStylable(this) && (!settings || false !== settings.borderScale))) return;
    let delta = this._layoutTransform;
    if (!delta) {
      const index = change.properties.indexOf("trf");
      const current = this.getProperty("trf") as Transform | null;
      const old = change.values[index] as Transform | null;
      if (old) delta = old.inverted();
      if (current) delta = delta ? delta.multiplied(current) : current;
    }
    if (!delta) return;
    const scale = (delta.decomposed() as TransformDecomposition).scale.getMatrix();
    const factor = Math.sqrt(Math.abs((scale[0] as number) * (scale[3] as number)));
    if (GMath.isEqualEps(factor, 1, 1e-8)) return;
    const layers = this.getPaintLayers();
    if (layers) {
      for (const layer of layers.getBorderLayers()) {
        if (layer.$_bs || (settings && true === settings.borderScale)) {
          layer.setProperty("_bw", (layer.$_bw as number) * factor);
        }
      }
    }
  }
}

Item.prototype.skipBorderUpdate = false;
