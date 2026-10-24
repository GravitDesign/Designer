// Old: chunk.vendor.js module 122 (GGroup).
/**
 * The group, node "group": a container of items with its own `trf` and
 * style (opacity, blend, effects; no fills or borders). A group with a
 * frame (`frm`, set by setFrame when a child gets constraints) is
 * clipped to the frame and lays its anchored children out against it;
 * its boxes are the frame's.
 */
import { RGBColor } from "../color/rgb-color.ts";
import { Locale } from "../core/locale/locale.ts";
import { VertexTransformer } from "../geometry/vertex-transformer.ts";
import { GMath } from "../math/math.ts";
import type { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { ElementData } from "../paint/element-data.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../paint/paint-canvas.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import type { Effects } from "../style/effects.ts";
import { ElementStylable, type StylePaintContext } from "../style/element-stylable.ts";
import { PropertySet } from "../style/stylable-sets.ts";
import { Accelerated } from "./element-accelerated.ts";
import { Anchor, type AnchorApi } from "./element-anchor.ts";
import { ElementChange } from "./element-change.ts";
import { Layout } from "./element-layout.ts";
import { Transform as TransformMixin, type TransformElement } from "./element-transform.ts";
import { Element } from "./element.ts";
import { Item } from "./item.ts";
import { NodeChange } from "./node-change.ts";
import { Container } from "./node-container.ts";
import type { PropertiesNode } from "./node-properties.ts";
import { registerNodeClass, type Node } from "./node.ts";
import { Rectangle } from "./rectangle.ts";

const GeometryProperties = {
  trf: null,
  frm: null,
};

/** The arguments of ChildGeometryUpdate: the child, and the paint box before the change. */
type ChildGeometryUpdateArgs = [Element | null | undefined, unknown?, (Rect | null)?];

type AnchoredChild = Element & PropertiesNode & AnchorApi;

const GroupBase = Accelerated(ElementStylable(Layout(TransformMixin(Container(Item)))));

export class Group extends GroupBase {
  static {
    registerNodeClass(this, "group", "GGroup");
  }

  static GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;

  declare $trf: Transform | null;
  declare $frm: Rect | null;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getStylePropertySets(): string[] {
    return [PropertySet.Style, PropertySet.Effects];
  }

  /**
   * Applies `transform` to the group and its children. With a frame,
   * only children without constraints follow directly (when the group
   * itself moves as a dependent); the rest are laid out against the
   * transformed frame afterwards.
   */
  override transform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void {
    if (transform && !transform.isIdentity()) {
      const frame = this.getProperty("frm");
      this._relayoutNow = false;
      if (frame) {
        this._layoutTransform = transform;
        this._relayoutNow = !this._relayout;
        this._relayout = true;
      }
      this.beginUpdate();
      try {
        this.assignTransformFrom(transform, this);
        for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
          if (
            (!frame ||
              !this.dependentUpdate ||
              force ||
              (child instanceof Element &&
                child.hasMixin(TransformMixin) &&
                !(child as AnchoredChild).getProperty("hacr") &&
                !(child as AnchoredChild).getProperty("vacr"))) &&
            (!exceptions || exceptions.indexOf(child) < 0)
          ) {
            const element = child as TransformElement;
            element.dependentUpdate = true;
            element.transform(transform, force, exceptions);
            element.dependentUpdate = false;
          }
        }
      } finally {
        this.endUpdate();
      }
      if (frame && this._relayoutNow) {
        this._layoutAnchorContents(null, null, this._layoutTransform);
        this._layoutTransform = null;
        this._relayoutNow = false;
      }
    }
  }

  override setTransform(transform: Transform | null): void {
    this.setProperty("trf", transform);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGroup", "name", this.getNodeName()) as string;
  }

  override getTransform(): Transform | null {
    return this.getProperty("trf") as Transform | null;
  }

  /** The rotation of `trf`, in (-PI, PI]. */
  override getAngle(): number {
    let transform = this.getProperty("trf") as Transform | null;
    let angle = 0;
    const parts = transform ? transform.decomposed() : null;
    transform = parts ? parts.rotate : null;
    if (transform) {
      const matrix = transform.getMatrix();
      angle = -Math.atan2(matrix[1] as number, matrix[0] as number);
    }
    return angle;
  }

  /** The center of the source box, mapped by `trf` when `transformed`. */
  override getCenter(transformed?: unknown): Point | null {
    const box = this.getSourceBBox();
    let center = box ? box.getSide(Rect.Side.CENTER) : null;
    if (center && transformed && this.$trf) center = this.$trf.mapPoint(center);
    return center;
  }

  override _calculateGeometryBBox(includeInvisible?: unknown): Rect | null {
    const frame = this.getProperty("frm") as Rect | null;
    if (frame) {
      const transform = this.getProperty("trf") as Transform | null;
      return (transform && transform.mapRect(frame)) || frame;
    }
    return super._calculateGeometryBBox(includeInvisible);
  }

  override _calculatePaintBBox(arg?: unknown, includeInvisible?: unknown): Rect | null {
    const box = this.getProperty("frm")
      ? this.getGeometryBBox(includeInvisible)
      : super._calculatePaintBBox(arg, includeInvisible);
    const effects = this.getEffects() as Effects | null;
    // The old code passes the box where the effects expect a scale; kept.
    return effects ? effects.getEffectsBBox(box as Rect, null, box as unknown as number) : box;
  }

  /** The frame, or the children's boxes in the group's own (untransformed) space. */
  override _calculateSourceBBox(includeInvisible?: unknown): Rect | null {
    const frame = this.getProperty("frm") as Rect | null;
    if (frame) return frame;
    const transform = this.getProperty("trf") as Transform | null;
    let box: Rect | null = null;
    if (!transform) return this.getGeometryBBox(includeInvisible);
    for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
      if (child instanceof Element) {
        const childBox = child.getPreTransformRect(transform);
        if (childBox) box = box ? box.united(childBox) : childBox;
      }
    }
    return box;
  }

  override _calculatePreTransformRect(transform: Transform | null | undefined): Rect | null {
    if (!transform || !transform.invertible()) return this.getGeometryBBox();
    const frame = this.getProperty("frm") as Rect | null;
    if (frame) {
      let inverse = transform.inverted() as Transform;
      const own = this.getProperty("trf") as Transform | null;
      inverse = own ? own.multiplied(inverse) : inverse;
      const corners = inverse.mapQuadrilateral(frame);
      return Rect.fromPoints(...corners);
    }
    let box: Rect | null = null;
    for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
      if (child instanceof Element) {
        const childBox = child.getPreTransformRect(transform);
        if (childBox) box = box ? box.united(childBox) : childBox;
      }
    }
    return box;
  }

  /** Paints the children, clipped to the frame when there is one. */
  override _paintStyleContent(context: StylePaintContext): void {
    const frame = this.getProperty("frm") as Rect | null;
    if (frame && this.getFirstChild()) {
      let outline: Rectangle | VertexTransformer = new Rectangle(
        frame.getX(),
        frame.getY(),
        frame.getWidth(),
        frame.getHeight(),
      );
      const transform = this.getProperty("trf") as Transform | null;
      if (transform) outline = new VertexTransformer(outline, transform);
      if (context.canvas.hasClip()) {
        const clipCanvas = this._createStyleCanvas(context, this.getGeometryBBox() as Rect);
        const previous = context.pushCanvas(clipCanvas) as PaintCanvas;
        try {
          if (undefined !== clipCanvas.putVertices(outline)) {
            clipCanvas.clipVertices();
            const childrenCanvas = this._createStyleCanvas(context, this.getGeometryBBox() as Rect);
            context.pushCanvas(childrenCanvas);
            try {
              this._paintChildren(context as never);
              clipCanvas.drawCanvas(childrenCanvas, 0, 0);
              childrenCanvas.finish();
            } finally {
              context.popCanvas();
            }
            clipCanvas.resetClip();
          }
          previous.drawCanvas(clipCanvas);
          clipCanvas.finish();
        } finally {
          context.popCanvas();
        }
      } else {
        const previous = context.pushCanvas(
          this._createStyleCanvas(context, this.getGeometryBBox() as Rect),
        ) as PaintCanvas;
        try {
          this._paintChildren(context as never);
          if (undefined !== context.canvas.putVertices(outline)) {
            context.canvas.fillVertices(
              RGBColor.BLACK,
              1,
              Canvas2DPaintCanvas.CompositeOperator.DestinationIn,
            );
          }
          previous.drawCanvas(context.canvas);
          context.canvas.finish();
        } finally {
          context.popCanvas();
        }
      }
    } else this._paintChildren(context as never);
  }

  /** Any hit inside the box hits the group itself. */
  override _detailHitTest(): ElementData<Element, unknown> | null {
    return new ElementData(this as Element, undefined);
  }

  override _handleChange(change: number, args?: unknown): void {
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    let childUpdate = false;
    if (change == ElementChange.ChildGeometryUpdate) {
      const childArgs = args as ChildGeometryUpdateArgs | undefined;
      if (childArgs && childArgs[0] && childArgs[0].getParent() === this) {
        this._notifyChange(ElementChange.PrepareGeometryUpdate);
        childUpdate = true;
      }
    } else if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, GeometryProperties, (name, value) =>
        "trf" === name && value
          ? Transform.serialize(value as Transform)
          : "frm" === name && value
            ? Rect.serialize(value as Rect)
            : value,
      );
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, GeometryProperties, (name, value) =>
        "trf" === name && value
          ? Transform.deserialize(value as never).makeInvertible()
          : "frm" === name && value
            ? Rect.deserialize(value as never)
            : value,
      );
    }
    super._handleChange(change, args);
    if (childUpdate) {
      const childArgs = args as ChildGeometryUpdateArgs;
      let box = childArgs[2];
      if (!box && childArgs[0] && childArgs[0] instanceof Element)
        box = childArgs[0].getPaintBBox();
      this._notifyChange(ElementChange.FinishGeometryUpdate, [2, box]);
    } else if (change == ElementChange.PrepareChildAnchoring && !this.getProperty("frm")) {
      this.setFrame(true);
    }
  }

  /**
   * Gives the group a frame (its box, unrotated) and the children
   * default constraints, or removes the frame and the constraints.
   */
  setFrame(on: boolean): void {
    const angle = this.getAngle();
    let rotation: Transform | null = null;
    if (!(null === angle || GMath.isEqualEps(angle, 0, 1e-4))) {
      rotation = new Transform().rotated(-angle);
    }
    if (on && !this.getProperty("frm")) {
      const box = rotation ? this.getPreTransformRect(rotation) : this.getGeometryBBox();
      if (box) {
        this.setProperties(["frm", "trf"], [box, rotation]);
        for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
          if (child.hasMixin(Anchor)) {
            const anchored = child as AnchoredChild;
            if (!anchored.getProperty("hacr")) {
              anchored.setProperty(
                "hacr",
                anchored.oldHacr ? anchored.oldHacr : Anchor.AnchorType.Start,
              );
            }
            if (!anchored.getProperty("vacr")) {
              anchored.setProperty(
                "vacr",
                anchored.oldVacr ? anchored.oldVacr : Anchor.AnchorType.Start,
              );
            }
          }
        }
      }
    } else if (!on && this.getProperty("frm")) {
      for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
        if (child.hasMixin(Anchor)) {
          const anchored = child as AnchoredChild;
          if (anchored.getProperty("hacr") || anchored.getProperty("vacr")) {
            anchored.resetAnchorProperties();
          }
        }
      }
      this.setProperties(["frm", "trf"], [null, rotation]);
    }
  }

  override toString(): string {
    return "[GGroup]";
  }
}
