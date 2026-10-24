// Old: chunk.vendor.js module 69 (GBlock).
/**
 * An element with a name that can be hidden and locked: layers, pages,
 * groups, shapes. Hiding or locking a block hides or locks everything in
 * it (the Hidden and Locked flags of the descendants follow `vis` and
 * `lkt`). Names are stored with `<` and `>` escaped.
 */
import { defineMixin, registerClass, type AnyConstructor } from "../core/object.ts";
import { xss } from "../core/util.ts";
import type { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import type { Transform } from "../math/transform.ts";
import { ElementData } from "../paint/element-data.ts";
import { PaintCanvas } from "../paint/paint-canvas.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { ElementChange, ElementFlag } from "./element-change.ts";
import { Element } from "./element.ts";
import { NodeChange } from "./node-change.ts";
import { Properties, type PropertiesChangeArgs } from "./node-properties.ts";
import { Store } from "./node-store.ts";
import type { Node } from "./node.ts";
import { SceneOptions } from "./scene-options.ts";
import { isStylable } from "./style-hooks.ts";

const LockType = {
  Partial: "P",
  Full: "F",
} as const;

/** Bits of `plkt`: what the app may not do with the block. */
const ProgramLck = {
  NoLock: 0,
  NoRealTime: 1,
  NoSizeChanges: 2,
  NoEdit: 4,
  NoMove: 8,
  NoOrigChildrenEdit: 16,
  NoNewChildren: 32,
  NoDelete: 64,
  AlwaysBack: 128,
  NoDirectVisibilityChange: 256,
  NoSelect: 512,
} as const;

const VisualProperties = {
  vis: true,
};

const MetaProperties = {
  name: null,
  lkt: null,
  plkt: ProgramLck.NoLock,
};

const nameFilter = (name: string, value: unknown) =>
  "name" === name && value ? xss(value as string) : value;

export interface LabelHolderApi {
  /** The label width in px at `scale` (Verdana at the scene's label size). */
  measureLabelWidth(scale?: number): number;
  _getLabelGeometryBBox(): Rect | null;
  /** A hit on the label above the block, or null. */
  _hitTestLabel(
    location: Point,
    tolerance: number,
    transform?: Transform | null,
    unscaled?: boolean,
    offset?: Point | null,
  ): ElementData<Node, { label: boolean }> | null;
  getScaleLabelFactor(): number;
  isScaleLabel(): boolean;
}

/** Blocks with a label over them (pages, symbols). */
export const LabelHolder = defineMixin(
  "GBlock.LabelHolder",
  <TBase extends AnyConstructor<Block>>(Base: TBase) => {
    abstract class LabelHolderMixin extends Base implements LabelHolderApi {
      measureLabelWidth(scale?: number): number {
        if (!this._scene) return 0;
        const factor = scale || 1;
        const context = document
          .createElement("canvas")
          .getContext("2d") as CanvasRenderingContext2D;
        context.font =
          (this._scene.$lbs as number) * factor * PaintCanvas.getScreenDPI() + "px Verdana";
        return context.measureText(this.$name as string).width;
      }

      _getLabelGeometryBBox(): Rect | null {
        return this.getGeometryBBox();
      }

      _hitTestLabel(
        location: Point,
        tolerance: number,
        transform?: Transform | null,
        unscaled?: boolean,
        offset?: Point | null,
      ): ElementData<Node, { label: boolean }> | null {
        let box = this._getLabelGeometryBBox();
        let scale = 1;
        if (!box) box = new Rect(0, 0, 0, 0);
        if (!this._scene) return null;
        if (offset && !(0 === offset.getX() && 0 === offset.getY())) {
          box = box.translated(offset.getX(), offset.getY());
        }
        if (transform) {
          box = transform.mapRect(box);
          scale = transform.getScaleFactor();
        }
        const labelScale = SceneOptions.scaleLabel ? scale : this.getScaleLabelFactor();
        const labelHeight = this._scene.getLabelBBox(unscaled ? 1 : labelScale).getHeight();
        return new Rect(
          box.getX() - tolerance,
          box.getY() - labelHeight - tolerance,
          box.getWidth() + 2 * tolerance,
          labelHeight + 2 * tolerance,
        ).containsPoint(location)
          ? new ElementData<Node, { label: boolean }>(this, { label: true })
          : null;
      }

      getScaleLabelFactor(): number {
        return SceneOptions.scaleLabel ? 1 : SceneOptions.scaleLabelFactor;
      }

      isScaleLabel(): boolean {
        return SceneOptions.scaleLabel;
      }
    }
    return LabelHolderMixin;
  },
);

const BlockBase = Store(Properties(Element));

export class Block extends BlockBase {
  static {
    registerClass(this, "GBlock");
  }

  static LockType = LockType;
  static ProgramLck = ProgramLck;
  static VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;
  static MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;
  static LabelHolder = LabelHolder;

  declare $vis: boolean;
  declare $name: string | null;
  declare $lkt: string | null;
  declare $plkt: number;

  constructor() {
    super();
    this._setDefaultProperties(VisualProperties, MetaProperties);
  }

  override assignFrom(other: Node): void {
    if (other instanceof Block) this.transferProperties(other, [VisualProperties, MetaProperties]);
    super.assignFrom(other);
  }

  /** The name, or the translated node name when there is none. */
  getLabel(): string {
    return this.$name && "" !== this.$name ? this.$name : this.getNodeNameTranslated();
  }

  /** The lock type ("P"/"F") when locked here, else whether an ancestor is locked. */
  override isLocked(): unknown {
    return this.getProperty("lkt") || (this._parent && this._parent.isLocked());
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, VisualProperties);
      this.storeProperties(blob, MetaProperties, nameFilter);
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, VisualProperties);
      this.restoreProperties(blob, MetaProperties, nameFilter);
    } else if (change == NodeChange.AfterPropertiesChange) {
      const properties = (args as PropertiesChangeArgs).properties;
      const visibility = properties.indexOf("vis") >= 0;
      const lock = properties.indexOf("lkt") >= 0;
      if (visibility || lock) {
        if (lock) {
          this.accept((node) => {
            if (node instanceof Element) this._updateElementLock(node);
          });
        }
        if (visibility) {
          this.accept((node) => {
            if (node instanceof Element) node._beforeVisibilityUpdate();
          });
          this.accept((node) => {
            if (node instanceof Element) this._updateElementVisibility(node);
          });
          this.accept((node) => {
            if (node instanceof Element) node._afterVisibilityUpdate();
          });
        }
      }
    } else if (change === NodeChange.BeforeChildRemove) {
      if (args instanceof Element) {
        this._updateElementVisibility(args, true);
        this._updateElementLock(args, null);
      }
    } else if (change === NodeChange.AfterChildInsert) {
      if (args instanceof Element) {
        this._updateElementVisibility(args);
        this._updateElementLock(args);
      }
    } else if (change === NodeChange.BeforePropertiesChange) {
      const change_ = args as PropertiesChangeArgs;
      const index = change_.properties.indexOf("name");
      if (-1 !== index) change_.values[index] = xss(change_.values[index] as string);
    }
    super._handleChange(change, args);
  }

  /**
   * Shows or hides `element` by this block's `vis` (or `visible`); a block
   * keeps its own `vis`. A parent with effects is repainted as a whole.
   */
  _updateElementVisibility(element: Element, visible?: unknown): void {
    let show = undefined !== visible ? visible : this.getProperty("vis");
    if (show && element instanceof Block) show = element.getProperty("vis");
    const parent = element.getParent();
    const repaintParent =
      parent &&
      isStylable(parent) &&
      !("[GCompoundShape]" === parent.toString()) &&
      null !== parent.getEffects().getFirstChild();
    if (show) {
      element.removeFlag(ElementFlag.Hidden);
      if (element.getParent()) {
        (element.getParent() as Node)._notifyChange(ElementChange.ChildGeometryUpdate, [
          element,
          true,
        ]);
      }
      if (repaintParent) (element.getParent() as unknown as Element)._requestInvalidation();
      else element._requestInvalidation();
    } else {
      if (repaintParent) (element.getParent() as unknown as Element)._requestInvalidation();
      else element._requestInvalidation();
      element.setFlag(ElementFlag.Hidden);
      if (element.getParent()) {
        (element.getParent() as Node)._notifyChange(ElementChange.ChildGeometryUpdate, [
          element,
          false,
        ]);
      }
    }
  }

  override _requestInvalidateNode(element: Element): void {
    if (this.hasMixin(LabelHolder) && this._scene && element === this) {
      // The label above the block is repainted too.
      if (this.isPaintable()) {
        const box = element.getPaintBBox(null, true);
        if (box) {
          const labelHeight = this._scene
            .getLabelBBox((this as unknown as LabelHolderApi).getScaleLabelFactor())
            .getHeight();
          this._requestInvalidationArea(box.expanded(0, labelHeight, 0, 0));
        }
      }
    } else super._requestInvalidateNode(element);
  }

  override _invalidateOldPaintBBox(): void {
    if (this.hasMixin(LabelHolder) && this._scene) {
      if (this._savedPaintBBox && !this._savedPaintBBox.isEmpty()) {
        const labelHeight = this._scene
          .getLabelBBox((this as unknown as LabelHolderApi).getScaleLabelFactor())
          .getHeight();
        this._requestInvalidationArea(this._savedPaintBBox.expanded(0, labelHeight, 0, 0));
      }
    } else super._invalidateOldPaintBBox();
  }

  /** Locks `element` by this block's `lkt` (or `lock`); a block keeps its own lock. */
  _updateElementLock(element: Element, lock?: unknown): void {
    let type = undefined !== lock ? lock : this.getProperty("lkt");
    if (!type && element instanceof Block) type = element.getProperty("lkt");
    if (type) {
      // Full sets both flags (the old switch fell through).
      if (type === LockType.Full) element.setFlag(ElementFlag.FullLocked);
      if (type === LockType.Full || type === LockType.Partial) {
        element.setFlag(ElementFlag.PartialLocked);
      }
    } else {
      element.removeFlag(ElementFlag.PartialLocked);
      element.removeFlag(ElementFlag.FullLocked);
    }
  }
}
