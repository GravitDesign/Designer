// Old: chunk.vendor.js module 900 (GStylable.PaintLayer).
import { containsObjectKey } from "../core/util.ts";
import { Transform } from "../math/transform.ts";
import { PaintCanvas } from "../paint/paint-canvas.ts";
import { Node, registerNodeClass } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import { Properties, type PropertiesChangeArgs } from "../scene/node-properties.ts";
import { Store } from "../scene/node-store.ts";
import { SceneNode } from "../scene/scene-node.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { Dictionary } from "./dictionary.ts";
import { Pattern } from "./pattern.ts";
import type { StyleOwner, StyleScene } from "./stylable-sets.ts";
import { TexturePattern } from "./texture-pattern.ts";

/** The paint context fields getBlendingForContext reads. */
interface BlendingContext {
  configuration: { noWebGL?: boolean };
}

const VisualProperties = {
  _pt: null,
  _op: 1,
  _vs: true,
  _bl: PaintCanvas.BlendMode.Normal as string,
};

const GeometryProperties = {
  _px: null,
};

/**
 * One fill or border of a stylable element: a pattern (`_pt`) with
 * opacity, visibility, blend mode and a pattern transform (`_px`). Lives in
 * the element's paint layers container; geometry and visual property
 * changes are reported to the element.
 */
export class PaintLayer extends Store(Properties(SceneNode)) {
  static {
    registerNodeClass(this, "paintLayer", "GStylable.PaintLayer");
  }

  static VisualProperties: Record<string, unknown> = VisualProperties;
  static GeometryProperties: Record<string, unknown> = GeometryProperties;

  declare $_pt: Pattern | null;
  declare $_op: number;
  declare $_vs: boolean;
  declare $_bl: string;
  declare $_px: Transform | null;

  constructor(pattern?: Pattern | null, opacity?: number, visible?: boolean, blend?: string) {
    super();
    // The old constructor didn't run GSceneNode's, so a layer had no refs.
    delete (this as { $refs?: string[] }).$refs;
    this._setDefaultProperties(PaintLayer.GeometryProperties, PaintLayer.VisualProperties);
    this.setProperties(
      ["_pt", "_vs", "_op", "_bl"],
      [
        pattern,
        void 0 === visible || visible,
        void 0 === opacity ? 1 : opacity,
        void 0 === blend ? PaintCanvas.BlendMode.Normal : blend,
      ],
    );
  }

  override assignFrom(other: Node): void {
    if (other instanceof PaintLayer) {
      this.transferProperties(other, [PaintLayer.VisualProperties, PaintLayer.GeometryProperties]);
    }
    Node.prototype.assignFrom.call(this, other);
  }

  /** Something to paint: a pattern, some opacity, visible. */
  hasStyle(): boolean {
    return !!this.$_pt && this.$_op > 0 && this.$_vs;
  }

  /** Whether the layer is painted on its own canvas and composited. */
  isSeparateLayer(): boolean {
    return false;
  }

  override getTrackTempPropNames(): string[] | null {
    return this.getPatternPropNames();
  }

  getPatternPropNames(): string[] {
    return ["_pt"];
  }

  override validateInsertion(parent: Node): boolean {
    return "paintLayers" === Node.getName(parent);
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const { blob, options } = args as StoreChangeArgs;
      this.storeProperties(blob, PaintLayer.GeometryProperties, (name, value) =>
        value && "_px" === name ? Transform.serialize(value as Transform) : value,
      );
      this.storeProperties(blob, PaintLayer.VisualProperties, (name, value) =>
        value && "_pt" == name ? Pattern.serialize(value as Pattern, options) : value,
      );
    } else if (change === NodeChange.Restore) {
      const { blob } = args as RestoreChangeArgs;
      const filter = (name: string, value: unknown): unknown => {
        if (value) {
          if ("_px" === name) return Transform.deserialize(value as number[]);
          if ("_pt" === name) return Pattern.deserialize(value as string);
        }
        return value;
      };
      this.restoreProperties(blob, PaintLayer.GeometryProperties, filter);
      this.restoreProperties(blob, PaintLayer.VisualProperties, filter);
    } else if (change === NodeChange.BeforePropertiesChange) {
      const changed = args as PropertiesChangeArgs;
      if (changed.properties.indexOf("_pt") >= 0 && !changed.temporary && this._scene) {
        // The old pattern gives up its dictionary entry.
        const pattern = this.$_pt;
        if (pattern instanceof TexturePattern && Dictionary.isDictionary(pattern._url)) {
          (this._scene as unknown as StyleScene).getDictionary().removeEntry(pattern._url);
        }
      }
    } else if (change === NodeChange.AfterPropertiesChange) {
      const changed = args as PropertiesChangeArgs;
      if (changed.properties.indexOf("_pt") >= 0 && !changed.temporary && this._scene) {
        const pattern = this.$_pt;
        if (pattern instanceof TexturePattern && !Dictionary.isDictionary(pattern._url)) {
          const entry = (this._scene as unknown as StyleScene)
            .getDictionary()
            .putValueIfAbsent(pattern._url);
          if (entry) (this.$_pt as TexturePattern)._url = entry.getUrl();
        }
      }
    } else if (change === SceneNode._Change.SceneAttached && this.$_pt instanceof TexturePattern) {
      this.$_pt.setScene(this._scene as unknown as StyleScene | null);
    }
    this._handleVisualChangeForProperties(change, args, PaintLayer.VisualProperties);
    this._handleGeometryChangeForProperties(change, args, PaintLayer.GeometryProperties);
    // The old code skipped the scene node's handler here.
    Node.prototype._handleChange.call(this, change, args);
  }

  /** Asks the owner to repaint after a change of one of `properties`. */
  _handleVisualChangeForProperties(
    change: number,
    args: unknown,
    properties: Record<string, unknown>,
  ): boolean {
    if (
      change == NodeChange.AfterPropertiesChange &&
      (!this._blockedChanges || !this._blockedChanges.counts.get(change)) &&
      containsObjectKey((args as PropertiesChangeArgs).properties, properties)
    ) {
      const owner = this.getOwnerStylable();
      if (owner) owner._styleRepaint(this);
      return true;
    }
    return false;
  }

  /** Brackets a change of one of `properties` in the owner's geometry update. */
  _handleGeometryChangeForProperties(
    change: number,
    args: unknown,
    properties: Record<string, unknown>,
  ): boolean {
    if (
      (change == NodeChange.BeforePropertiesChange || change == NodeChange.AfterPropertiesChange) &&
      containsObjectKey((args as PropertiesChangeArgs).properties, properties)
    ) {
      const owner = this.getOwnerStylable();
      if (owner) {
        switch (change) {
          case NodeChange.BeforePropertiesChange:
            owner._stylePrepareGeometryChange(this);
            break;
          case NodeChange.AfterPropertiesChange:
            owner._styleFinishGeometryChange(this);
        }
      }
      return true;
    }
    return false;
  }

  /** The element: the parent of the paint layers container. */
  getOwnerStylable(): StyleOwner | null {
    const layers = this.getParent();
    if (layers) {
      const owner = layers.getParent();
      if (owner) return owner as unknown as StyleOwner;
    }
    return null;
  }

  /** A texture with the mask flag makes the layer a mask. */
  isMask(): boolean {
    return !!this.$_pt && this.$_pt instanceof TexturePattern && this.$_pt.isMask();
  }

  /**
   * The blend mode to paint with, null for normal. Quirk: the WebGL check
   * tests the mode against the keys of WebGLBlendMode ("LinearBurn"), not
   * its values ("linear_burn"), so it never drops a mode.
   */
  getBlendingForContext(context: BlendingContext): string | null {
    return this.$_bl === PaintCanvas.BlendMode.Normal ||
      (context.configuration.noWebGL && this.$_bl in PaintCanvas.WebGLBlendMode)
      ? null
      : this.$_bl;
  }
}
