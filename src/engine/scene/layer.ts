// Old: chunk.vendor.js module 159 (GLayer).
/**
 * The layer, node "layer": a named block inside a page (or another layer)
 * that holds the items. It has no `trf` of its own. Like a group it can
 * get a frame (`frm`, set by setFrame when a child gets constraints);
 * then it is clipped to the frame and lays its anchored children out
 * against it. `otl` paints its content as outlines in `cls`, `prt` false
 * hides it from output (paints only while annotations show).
 */
import { RGBColor } from "../color/rgb-color.ts";
import { Locale } from "../core/locale/locale.ts";
import { Rect } from "../math/rect.ts";
import { Transform as Matrix } from "../math/transform.ts";
import { ElementData } from "../paint/element-data.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../paint/paint-canvas.ts";
import type { PaintContext } from "../paint/paint-context.ts";
import { ScenePaintConfiguration } from "../paint/scene-paint-configuration.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { Pattern } from "../style/pattern.ts";
import type { Effects } from "../style/effects.ts";
import { ElementStylable, type StylePaintContext } from "../style/element-stylable.ts";
import { Block } from "./block.ts";
import { Accelerated } from "./element-accelerated.ts";
import { Anchor, type AnchorApi } from "./element-anchor.ts";
import { ElementChange } from "./element-change.ts";
import { Layout } from "./element-layout.ts";
import { Transform as TransformMixin } from "./element-transform.ts";
import { Element } from "./element.ts";
import { NodeChange, NodeFlag } from "./node-change.ts";
import { Container, type ContainerNode } from "./node-container.ts";
import type { PropertiesChangeArgs, PropertiesNode } from "./node-properties.ts";
import { Node, registerNodeClass } from "./node.ts";
import { Rectangle } from "./rectangle.ts";

const VisualProperties = {
  otl: false,
  prt: true,
  cls: new RGBColor([0, 168, 255]),
};

const GeometryProperties = {
  frm: false,
};

/** The arguments of ChildGeometryUpdate: the child, and the paint box before the change. */
type ChildGeometryUpdateArgs = [Element | null | undefined, unknown?, (Rect | null)?];

type AnchoredChild = Element & PropertiesNode & AnchorApi;

const LayerBase = Accelerated(ElementStylable(Anchor(Layout(TransformMixin(Container(Block))))));

export class Layer extends LayerBase {
  static {
    registerNodeClass(this, "layer", "GLayer");
  }

  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;
  static GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;

  declare $otl: boolean;
  declare $prt: boolean;
  declare $cls: RGBColor | null;
  declare $frm: Rect | false | null;

  constructor() {
    super();
    this._setDefaultProperties(VisualProperties);
    this._setDefaultProperties(GeometryProperties);
  }

  override validateInsertion(parent: ContainerNode, reference?: Node | null): boolean {
    void reference;
    return parent instanceof Layer || "page" === Node.getName(parent);
  }

  /**
   * Moves the children by `transform`. With a frame, the frame follows
   * and (when the layer itself moves as a dependent) the anchored
   * children are laid out against it instead.
   */
  override transform(
    transform: Matrix,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void {
    if (transform && !transform.isIdentity()) {
      const frame = this.getProperty("frm") as Rect | false | null;
      this._relayoutNow = false;
      if (frame) {
        this._relayoutNow = !this._relayout;
        this._relayout = true;
      }
      this.beginUpdate();
      try {
        if (frame) {
          const corrected = Matrix.correctForFrame(transform, frame);
          if (corrected && !corrected.isIdentity()) {
            this.setProperty("frm", corrected.mapRect(frame));
          }
        }
        if (!(frame && this.dependentUpdate && !force)) {
          this._transformChildren(transform, force, exceptions);
        }
      } finally {
        this.endUpdate();
      }
      if (frame && this._relayoutNow) {
        const newFrame = this.getProperty("frm") as Rect;
        this._layoutAnchorContents(newFrame, frame, null);
        this._relayoutNow = false;
      }
    }
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GLayer", "name", this.getNodeName()) as string;
  }

  override _calculateGeometryBBox(includeInvisible?: unknown): Rect | null {
    const frame = this.getProperty("frm") as Rect | false | null;
    return frame || super._calculateGeometryBBox(includeInvisible);
  }

  override _calculatePaintBBox(arg?: unknown, includeInvisible?: unknown): Rect | null {
    const box = this.getProperty("frm")
      ? this.getGeometryBBox(includeInvisible)
      : super._calculatePaintBBox(arg, includeInvisible);
    const effects = this.getEffects() as Effects | null;
    // The old code passes the box where the effects expect a scale; kept.
    return effects ? effects.getEffectsBBox(box as Rect, null, box as unknown as number) : box;
  }

  override _calculatePreTransformRect(transform: Matrix | null | undefined): Rect | null {
    if (!transform || !transform.invertible()) return this.getGeometryBBox();
    const frame = this.getProperty("frm") as Rect | false | null;
    if (frame) {
      const corners = (transform.inverted() as Matrix).mapQuadrilateral(frame);
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

  override _preparePaint(context: PaintContext): boolean {
    const configuration = context.configuration as ScenePaintConfiguration;
    // The base is asked without the paint argument, as in the old code.
    if (!super._preparePaint(context)) return false;
    if (!this.$prt && !configuration.isAnnotationsVisible(context)) return false;
    if (configuration.paintMode !== ScenePaintConfiguration.PaintMode.Outline && this.$otl) {
      (context.outlineColors as RGBColor[]).push(this.$cls as RGBColor);
    }
    return true;
  }

  override _finishPaint(context: PaintContext): void {
    const configuration = context.configuration as ScenePaintConfiguration;
    if (configuration.paintMode !== ScenePaintConfiguration.PaintMode.Outline && this.$otl) {
      (context.outlineColors as RGBColor[]).pop();
    }
    super._finishPaint(context);
  }

  /** Paints the children, clipped to the frame when there is one. */
  override _paintStyleContent(context: StylePaintContext): void {
    const frame = this.getProperty("frm") as Rect | false | null;
    if (frame && this.getFirstChild()) {
      const outline = new Rectangle(
        frame.getX(),
        frame.getY(),
        frame.getWidth(),
        frame.getHeight(),
      );
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

  /** Any hit inside the box hits the layer itself. */
  override _detailHitTest(): ElementData<Element, unknown> | null {
    return new ElementData(this as Element, undefined);
  }

  override _handleChange(change: number, args?: unknown): void {
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, VisualProperties, (name, value) =>
        "cls" === name && value ? Pattern.serialize(value as Pattern) : value,
      );
      this.storeProperties(blob, GeometryProperties, (name, value) =>
        "frm" === name && value ? Rect.serialize(value as Rect) : value,
      );
      if (this.hasFlag(NodeFlag.Active)) blob["__active"] = true;
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, VisualProperties, (name, value) =>
        "cls" === name && value ? Pattern.deserialize(value as string) : value,
      );
      this.restoreProperties(blob, GeometryProperties, (name, value) =>
        "frm" === name && value ? Rect.deserialize(value as never) : value,
      );
      if (blob["__active"]) this.setFlag(NodeFlag.Active);
    }
    this._handleVisualChangeForProperties(change, args, VisualProperties);
    let childUpdate = false;
    if (change == ElementChange.ChildGeometryUpdate) {
      const childArgs = args as ChildGeometryUpdateArgs | undefined;
      if (childArgs && childArgs[0] && childArgs[0].getParent() === this) {
        this._notifyChange(ElementChange.PrepareGeometryUpdate);
        childUpdate = true;
      }
    }
    super._handleChange(change, args);
    this._handleAnchorChange(change, args);
    if (change == ElementChange.ChildGeometryUpdate && childUpdate) {
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
   * Gives the layer a frame (its geometry box) and the children default
   * constraints, or removes the frame and the constraints.
   */
  setFrame(on: boolean): void {
    if (on && !this.getProperty("frm")) {
      const box = this.getGeometryBBox();
      if (box) {
        this.setProperties(["frm"], [box]);
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
      this.setProperties(["frm"], [null]);
    }
  }

  /**
   * The anchor handling of GElement.Anchor, plus: when the frame of a
   * constrained layer changes, the change is folded into hstrf/vstrf (moved
   * by its container) or the constraints are measured again (moved by the
   * user).
   */
  override _handleAnchorChange(change: number, args: unknown): void {
    super._handleAnchorChange(change, args);
    if (change !== NodeChange.AfterPropertiesChange) return;
    const properties = args as PropertiesChangeArgs;
    if (
      !this.isRecordedTransaction() &&
      properties.properties.indexOf("frm") >= 0 &&
      (this.getProperty("hacr") || this.getProperty("vacr")) &&
      !this.isRestoring()
    ) {
      if (this.dependentUpdate) {
        if (!this._noAnchoringPropsUpdate) {
          const index = properties.properties.indexOf("frm");
          const frame = this.getProperty("frm") as Rect;
          const old = properties.values[index] as Rect;
          const minimal = TransformMixin.MinimalDimention;
          const oldWidth = old.getWidth() > minimal ? old.getWidth() : minimal;
          const oldHeight = old.getHeight() > minimal ? old.getHeight() : minimal;
          const newWidth = frame.getWidth() > minimal ? frame.getWidth() : minimal;
          const newHeight = frame.getHeight() > minimal ? frame.getHeight() : minimal;
          const delta = new Matrix()
            .translated(-old.getX(), -old.getY())
            .scaled(newWidth / oldWidth, newHeight / oldHeight)
            .translated(frame.getX(), frame.getY());
          if (this.getProperty("hacr")) {
            let own = this.getProperty("hstrf") as Matrix | null;
            own = own ? own.multiplied(delta) : delta;
            this.setProperty("hstrf", own);
          }
          if (this.getProperty("vacr")) {
            let own = this.getProperty("vstrf") as Matrix | null;
            own = own ? own.multiplied(delta) : delta;
            this.setProperty("vstrf", own);
          }
        }
      } else {
        const horizontal = this.getProperty("hacr");
        const vertical = this.getProperty("vacr");
        this.resetAnchorProperties();
        this.setProperties(["hacr", "vacr"], [horizontal, vertical]);
      }
    }
  }
}
