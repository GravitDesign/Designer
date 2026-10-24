// Old: chunk.vendor.js module 902 (GStylable.BorderPaintLayer).
import { equals, extend } from "../core/util.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import type { Node } from "../scene/node.ts";
import { registerNodeClass } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import type { PropertiesChangeArgs } from "../scene/node-properties.ts";
import type { NodeBlob, RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { PaintLayer } from "./paint-layer.ts";
import { BorderAlignment, isDestroyable, type StyleSceneHooks } from "./stylable-sets.ts";

const VisualProperties = {
  _bds: null,
};

const MetaProperties = {
  _bs: false,
};

const GeometryProperties = {
  _bw: 1,
  _ba: BorderAlignment.Center as string,
  _blc: "square",
  _blj: "miter",
  _bml: 3,
  _bhm: null,
  _bhms: 1,
  _bhmo: false,
  _bhmi: 1,
  _btm: null,
  _btms: 1,
  _btmo: false,
  _btmi: 1,
};

/**
 * A border (stroke): width, alignment, caps, joins, miter limit, dashes
 * and head/tail markers. `_bs` scales the border with the element.
 */
export class BorderPaintLayer extends PaintLayer {
  static {
    registerNodeClass(this, "borderPaintLayer", "GStylable.BorderPaintLayer");
  }

  static override VisualProperties: Record<string, unknown> = VisualProperties;
  static MetaProperties: Record<string, unknown> = MetaProperties;
  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  /** Every border and paint property is the same. */
  static equals(a: BorderPaintLayer, b: BorderPaintLayer): boolean {
    let same = true;
    [
      "_ba",
      "_bds",
      "_bhm",
      "_bhmi",
      "_bhmo",
      "_bhms",
      "_bl",
      "_blc",
      "_blj",
      "_bml",
      "_bs",
      "_btm",
      "_btmi",
      "_btmo",
      "_btms",
      "_bw",
      "_op",
      "_pt",
      "_px",
    ].forEach((name) => {
      same = same && equals(a.getProperty(name), b.getProperty(name));
    });
    return same;
  }

  declare $_bw: number;
  declare $_ba: string;

  constructor(
    pattern?: ConstructorParameters<typeof PaintLayer>[0],
    opacity?: number,
    visible?: boolean,
    blend?: string,
  ) {
    super(pattern, opacity, visible, blend);
    this._setDefaultProperties(
      BorderPaintLayer.VisualProperties,
      BorderPaintLayer.GeometryProperties,
      BorderPaintLayer.MetaProperties,
    );
  }

  override assignFrom(other: Node): void {
    if (other instanceof BorderPaintLayer) {
      this.transferProperties(other, [
        BorderPaintLayer.VisualProperties,
        BorderPaintLayer.GeometryProperties,
      ]);
    }
    super.assignFrom(other);
  }

  /** A border also needs a width. */
  override hasStyle(): boolean {
    return super.hasStyle() && !!this.$_bw;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change == NodeChange.Restore) {
      const migrated = { blob: extend({}, (args as RestoreChangeArgs).blob) as NodeBlob };
      args = migrated;
      const blob = migrated.blob;
      // Old files saved borders as _bpt, _bvs, _bop, _bpx, one _bmo/_bmi
      // for both markers and booleans for the marker insets.
      const legacy = ["_bpt", "_bvs", "_bop", "_bpx"];
      for (let i = 0; i < legacy.length; i++) {
        const name = legacy[i] as string;
        const current = name.replace(/b/g, "");
        if (Object.hasOwn(blob, name)) blob[current] = blob[name];
      }
      if ("_bmo" in blob) {
        blob["_btmo"] = blob["_bmo"];
        blob["_bhmo"] = blob["_bmo"];
      }
      if ("_bmi" in blob) {
        blob["_btmi"] = blob["_bmi"] ? 1 : 0;
        blob["_bhmi"] = blob["_bmi"] ? 1 : 0;
      }
      if ("_btmi" in blob && "boolean" == typeof blob["_btmi"])
        blob["_btmi"] = blob["_btmi"] ? 1 : 0;
      if ("_bhmi" in blob && "boolean" == typeof blob["_bhmi"])
        blob["_bhmi"] = blob["_bhmi"] ? 1 : 0;
      this.restoreProperties(blob, BorderPaintLayer.VisualProperties);
      this.restoreProperties(blob, BorderPaintLayer.MetaProperties);
      this.restoreProperties(blob, BorderPaintLayer.GeometryProperties, (name, value) =>
        ("_bhm" === name || "_btm" === name) && value && value instanceof Array
          ? VertexContainer.deserialize(value as number[])
          : value,
      );
    } else if (change == NodeChange.Store) {
      const { blob } = args as StoreChangeArgs;
      this.storeProperties(blob, BorderPaintLayer.VisualProperties);
      this.storeProperties(blob, BorderPaintLayer.MetaProperties);
      this.storeProperties(blob, BorderPaintLayer.GeometryProperties, (name, value) =>
        ("_bhm" === name || "_btm" === name) && value && value instanceof VertexContainer
          ? VertexContainer.serialize(value)
          : value,
      );
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
    this._handleVisualChangeForProperties(change, args, BorderPaintLayer.VisualProperties);
    // Visibility and pattern change a border's geometry (its padding).
    this._handleGeometryChangeForProperties(
      change,
      args,
      extend({ _vs: true, _pt: null }, BorderPaintLayer.GeometryProperties) as Record<
        string,
        unknown
      >,
    );
  }

  /** The owner's scene (not the layer's own). */
  override getScene(): StyleSceneHooks | null {
    const owner = this.getOwnerStylable();
    return owner && owner.getScene ? owner.getScene() : null;
  }
}
