// Old: chunk.vendor.js module 347 (GPGEdge).
/**
 * An edge of the paths graph: a bare GPathBase child (the curve) between
 * two anchors, with its own copy of the graph's style. `cSt` marks an
 * edge whose style was changed on its own; the others follow the graph.
 * Saved as `props: [uid, cSt, source uid, destination uid, points]`.
 *
 * Painting strokes the curve with a cap that depends on whether each
 * end is free (one edge at the anchor) or joins other edges.
 */
import { RGBColor } from "../../color/rgb-color.ts";
import { Uid } from "../../core/uid.ts";
import { each, equals } from "../../core/util.ts";
import { GMath } from "../../math/math.ts";
import type { Point } from "../../math/point.ts";
import type { Rect } from "../../math/rect.ts";
import type { Transform } from "../../math/transform.ts";
import { Canvas2DPaintCanvas } from "../../paint/paint-canvas.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import type { BorderPaintLayer } from "../../style/border-paint-layer.ts";
import type { PaintLayers } from "../../style/paint-layers.ts";
import { Stylable } from "../../style/stylable.ts";
import { BorderAlignment, PropertySet } from "../../style/stylable-sets.ts";
import { AnchorLink } from "../anchor-link.ts";
import { ElementChange } from "../element-change.ts";
import { NodeChange } from "../node-change.ts";
import { Container, type ContainerNode } from "../node-container.ts";
import { Multireference } from "../node-identity.ts";
import { Properties } from "../node-properties.ts";
import { Store } from "../node-store.ts";
import { MapContainer, Node, registerNodeClass } from "../node.ts";
import { AnchorPoint, PathBase } from "../path-base.ts";
import type { SceneHooks } from "../scene-node.ts";
import type { ShapePaintContext } from "../shape.ts";
import { EdgeMixin } from "./edge.ts";
import type { GraphEdge } from "./graph.ts";
import type { PGAnchor } from "./pg-anchor.ts";

const GeometryProperties = {
  uid: null,
  cSt: false,
};

const LineCap = Canvas2DPaintCanvas.LineCap;
const LineJoin = Canvas2DPaintCanvas.LineJoin;

/** The border properties the edge reads besides width and alignment. */
export type EdgeBorder = BorderPaintLayer & {
  $_blc: string;
  $_blj: string;
  $_bml: number;
  $_bds: number[] | null;
  $_bhm: unknown;
  $_btm: unknown;
  $_bhmi: unknown;
  $_btmi: unknown;
};

/** A place on an edge's curve: segment index from 0, parameter, and optionally the exact point. */
export class SplitPoint {
  declare seg: number;
  declare slope: number;
  declare pt: Point | null;

  constructor(seg: number, slope: number, pt?: Point | null) {
    this.seg = seg;
    this.slope = slope;
    if (pt) this.pt = pt;
  }
}

const splitPointPrototype = SplitPoint.prototype as unknown as Record<string, unknown>;
splitPointPrototype["seg"] = null;
splitPointPrototype["slope"] = null;
splitPointPrototype["pt"] = null;

/** True when the parent is the paths graph that owns this node's container. */
function graphOf(node: Node): Node | null {
  const parent = node._parent;
  return parent instanceof MapContainer &&
    parent.getParent() &&
    "Paths Graph" === Node.getName(parent.getParent())
    ? (parent.getParent() as Node)
    : null;
}

const PGEdgeBase = Multireference(Stylable(EdgeMixin(Properties(Container(Store(Node))))));

export class PGEdge extends PGEdgeBase implements GraphEdge {
  static {
    registerNodeClass(this, "GPGEdge", "GPGEdge");
  }

  static GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static SplitPoint = SplitPoint;

  declare $uid: Uid;
  declare $cSt: boolean;
  /** Set while the graph paints its borders: already painted with the graph's style. */
  declare painted: boolean;
  declare _pathBase: PathBase | null;
  declare _facets: unknown[] | null;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
    this.$uid = new Uid();
    this._facets = [];
  }

  override getId(): Uid {
    return this.$uid;
  }

  // GEdge's accessors, typed for the paths graph: the ends are always
  // paths graph anchors.
  override getSource(): PGAnchor | null {
    return super.getSource() as PGAnchor | null;
  }

  override getDestination(): PGAnchor | null {
    return super.getDestination() as PGAnchor | null;
  }

  override getAnchors(): (PGAnchor | null)[] {
    return super.getAnchors() as (PGAnchor | null)[];
  }

  override validateInsertion(parent: ContainerNode): boolean {
    return (
      parent instanceof MapContainer &&
      (!parent.getParent() || "Paths Graph" === Node.getName(parent.getParent()))
    );
  }

  override getStylePropertySets(): string[] {
    return [PropertySet.BorderPaintLayers, PropertySet.FillPaintLayers];
  }

  override _styleRepaint(): void {
    const graph = graphOf(this);
    if (graph) graph._notifyChange(ElementChange.InvalidationRequest);
  }

  override _styleFinishGeometryChange(): void {
    const graph = graphOf(this);
    if (graph) graph._notifyChange(ElementChange.FinishGeometryUpdate, 1);
  }

  getPathBase(): PathBase {
    return this._pathBase as PathBase;
  }

  /** Replaces the curve; the new one takes the edge's style. */
  setPathBase(pathBase: PathBase | null | undefined): void {
    if (this._pathBase) this.removeChild(this._pathBase);
    if (pathBase) {
      this.insertChild(pathBase, undefined);
      (this._pathBase as PathBase).assignStyleFrom(this);
    }
  }

  serialize(): unknown[] {
    const data: unknown[] = [];
    data.push(this.$uid.toString());
    data.push(this.$cSt);
    data.push(((this._srcAnchor as AnchorLink).getId() as Uid).toString());
    data.push(((this._dstAnchor as AnchorLink).getId() as Uid).toString());
    data.push((this._pathBase as PathBase).getAnchorPoints().serialize());
    return data;
  }

  /** The anchors stay unresolved links until the graph connects them. */
  deserialize(data: readonly unknown[]): void {
    if (data.length >= 5) {
      this.$uid = new Uid(data[0] as string);
      this.$cSt = data[1] as boolean;
      const source = new AnchorLink(new Uid(data[2] as string));
      const destination = new AnchorLink(new Uid(data[3] as string));
      this.setAnchors([source, destination]);
      const pathBase = new PathBase();
      pathBase.getAnchorPoints().deserialize(data[4] as unknown[]);
      this.setPathBase(pathBase);
    }
  }

  /** The direction the curve leaves its first point, in [0, 2pi), y up. */
  getStartAngle(): number {
    let point = this.getPathBase().getAnchorPoints().getFirstChild() as AnchorPoint;
    const x = point.getProperty("x") as number;
    const y = point.getProperty("y") as number;
    let tx = point.getProperty("hrx") as number | null;
    let ty = point.getProperty("hry") as number | null;
    if (!(null !== tx && null !== ty)) {
      tx = (point = point.getNext() as AnchorPoint).getProperty("hlx") as number | null;
      ty = point.getProperty("hly") as number | null;
      if (!(null !== tx && null !== ty)) {
        tx = point.getProperty("x") as number;
        ty = point.getProperty("y") as number;
      }
    }
    return GMath.normalizeAngleRadians(-Math.atan2(ty - y, tx - x));
  }

  /** The direction the curve leaves its last point (backwards), in [0, 2pi), y up. */
  getEndAngle(): number {
    let point = this.getPathBase().getAnchorPoints().getLastChild() as AnchorPoint;
    const x = point.getProperty("x") as number;
    const y = point.getProperty("y") as number;
    let tx = point.getProperty("hlx") as number | null;
    let ty = point.getProperty("hly") as number | null;
    if (!(null !== tx && null !== ty)) {
      tx = (point = point.getPrevious() as AnchorPoint).getProperty("hrx") as number | null;
      ty = point.getProperty("hry") as number | null;
      if (!(null !== tx && null !== ty)) {
        tx = point.getProperty("x") as number;
        ty = point.getProperty("y") as number;
      }
    }
    return GMath.normalizeAngleRadians(-Math.atan2(ty - y, tx - x));
  }

  /**
   * The first segment as a new two-point path, cut at `t` when 0 < t < 1
   * and reversed with `reverse`.
   */
  getFirstSegment(reverse?: boolean | null, t?: number): PathBase {
    const first = new AnchorPoint();
    const source = this.getPathBase().getAnchorPoints().getFirstChild() as AnchorPoint;
    first.deserialize(source.serialize());
    const second = new AnchorPoint();
    second.deserialize((source.getNext() as AnchorPoint).serialize());
    if (t && t > 0 && t < 1) {
      const hrx = first.getProperty("hrx") as number | null;
      const hry = first.getProperty("hry") as number | null;
      const hlx = second.getProperty("hlx") as number | null;
      const hly = second.getProperty("hly") as number | null;
      if (null !== hrx && null !== hry && null !== hlx && null !== hly) {
        const xs = new Float64Array(4);
        const ys = new Float64Array(4);
        GMath.getCtrlPtsCasteljau(
          first.getProperty("x") as number,
          hrx,
          hlx,
          second.getProperty("x") as number,
          t,
          1,
          xs,
        );
        GMath.getCtrlPtsCasteljau(
          first.getProperty("y") as number,
          hry,
          hly,
          second.getProperty("y") as number,
          t,
          1,
          ys,
        );
        first.setProperties(["hrx", "hry"], [xs[1], ys[1]]);
        second.setProperties(
          ["hlx", "hly", "x", "y", "hrx", "hry"],
          [xs[2], ys[2], xs[3], ys[3], null, null],
        );
      } else if ((null !== hrx && null !== hry) || (null !== hlx && null !== hly)) {
        const cx = (null !== hrx && null !== hry ? hrx : hlx) as number;
        const cy = (null !== hrx && null !== hry ? hry : hly) as number;
        const xs = new Float64Array(3);
        const ys = new Float64Array(3);
        GMath.divideQuadraticCurve(
          first.getProperty("x") as number,
          cx,
          second.getProperty("x") as number,
          t,
          xs,
          undefined,
        );
        GMath.divideQuadraticCurve(
          first.getProperty("y") as number,
          cy,
          second.getProperty("y") as number,
          t,
          ys,
          undefined,
        );
        first.setProperties(["hrx", "hry"], [xs[1], ys[1]]);
        second.setProperties(
          ["hlx", "hly", "x", "y", "hrx", "hry"],
          [null, null, xs[2], ys[2], null, null],
        );
      } else {
        const point = GMath.getPointAtSegment(
          first.getProperty("x") as number,
          first.getProperty("y") as number,
          second.getProperty("x") as number,
          second.getProperty("y") as number,
          t,
        );
        second.setProperties(["x", "y", "hrx", "hry"], [point.getX(), point.getY(), null, null]);
      }
    }
    const segment = new PathBase();
    if (reverse) {
      second.flip();
      segment.getAnchorPoints().appendChild(second);
      first.flip();
      segment.getAnchorPoints().appendChild(first);
    } else {
      segment.getAnchorPoints().appendChild(first);
      segment.getAnchorPoints().appendChild(second);
    }
    return segment;
  }

  /**
   * The last segment as a new two-point path, keeping the last `t` of it
   * when 0 < t < 1, reversed with `reverse`.
   */
  getLastSegment(reverse?: boolean | null, t?: number): PathBase {
    const last = new AnchorPoint();
    const source = this.getPathBase().getAnchorPoints().getLastChild() as AnchorPoint;
    last.deserialize(source.serialize());
    const previous = new AnchorPoint();
    previous.deserialize((source.getPrevious() as AnchorPoint).serialize());
    if (t && t > 0 && t < 1) {
      const hrx = previous.getProperty("hrx") as number | null;
      const hry = previous.getProperty("hry") as number | null;
      const hlx = last.getProperty("hlx") as number | null;
      const hly = last.getProperty("hly") as number | null;
      if (null !== hrx && null !== hry && null !== hlx && null !== hly) {
        const xs = new Float64Array(4);
        const ys = new Float64Array(4);
        GMath.getCtrlPtsCasteljau(
          previous.getProperty("x") as number,
          hrx,
          hlx,
          last.getProperty("x") as number,
          1 - t,
          2,
          xs,
        );
        GMath.getCtrlPtsCasteljau(
          previous.getProperty("y") as number,
          hry,
          hly,
          last.getProperty("y") as number,
          1 - t,
          2,
          ys,
        );
        previous.setProperties(
          ["hlx", "hly", "x", "y", "hrx", "hry"],
          [null, null, xs[0], ys[0], xs[1], ys[1]],
        );
        last.setProperties(["hlx", "hly"], [xs[2], ys[2]]);
      } else if ((null !== hrx && null !== hry) || (null !== hlx && null !== hly)) {
        const cx = (null !== hrx && null !== hry ? hrx : hlx) as number;
        const cy = (null !== hrx && null !== hry ? hry : hly) as number;
        const xs = new Float64Array(3);
        const ys = new Float64Array(3);
        GMath.divideQuadraticCurve(
          previous.getProperty("x") as number,
          cx,
          last.getProperty("x") as number,
          1 - t,
          null,
          xs,
        );
        GMath.divideQuadraticCurve(
          previous.getProperty("y") as number,
          cy,
          last.getProperty("y") as number,
          1 - t,
          null,
          ys,
        );
        // Quirk kept: the right half starts at index 0, so [2] is its end
        // point and [1] its control point.
        previous.setProperties(
          ["hlx", "hly", "x", "y", "hrx", "hry"],
          [null, null, xs[2], ys[2], null, null],
        );
        last.setProperties(["hlx", "hly"], [xs[1], ys[1]]);
      } else {
        const point = GMath.getPointAtSegment(
          previous.getProperty("x") as number,
          previous.getProperty("y") as number,
          last.getProperty("x") as number,
          last.getProperty("y") as number,
          1 - t,
        );
        previous.setProperties(["hlx", "hly", "x", "y"], [null, null, point.getX(), point.getY()]);
      }
    }
    const segment = new PathBase();
    if (reverse) {
      last.flip();
      segment.getAnchorPoints().appendChild(last);
      previous.flip();
      segment.getAnchorPoints().appendChild(previous);
    } else {
      segment.getAnchorPoints().appendChild(previous);
      segment.getAnchorPoints().appendChild(last);
    }
    return segment;
  }

  /** Whether both edges have equal border layers. */
  hasSameStyle(other: PGEdge): boolean {
    return equals(
      (this.getPaintLayers() as PaintLayers).getBorderLayers(true),
      (other.getPaintLayers() as PaintLayers).getBorderLayers(true),
    );
  }

  /** Half the border width, times the miter limit for miter joins. */
  override getStyleBorderPadding(border: { $_ba: string; $_bw: number }): number {
    const layer = border as EdgeBorder;
    let padding = 0.5 * layer.$_bw;
    if (layer.$_blj === LineJoin.Miter && layer.$_bml > 0) padding *= layer.$_bml;
    return padding;
  }

  /** Saves `props`; the GPathBase child becomes the curve. */
  override _handleChange(change: number, args?: unknown): void {
    if (change == NodeChange.BeforeChildInsert && args instanceof PathBase) {
      this._pathBase = args;
    } else if (change === NodeChange.Store) {
      (args as StoreChangeArgs).blob["props"] = this.serialize();
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      if (Object.prototype.hasOwnProperty.call(blob, "props")) {
        this.deserialize(blob["props"] as unknown[]);
      }
    }
    this._handleStyleChange(change, args);
    Node.prototype._handleChange.call(this, change, args);
    if (change == NodeChange.AfterChildRemove && args instanceof PathBase) this._pathBase = null;
  }

  /**
   * Strokes the curve with `border` (mapped by `transform`), into the
   * current canvas when `stroke` (the graph fills the pattern over all
   * edges later), or else on its own canvas with the border's pattern.
   * Free ends get the border's cap; ends that join other edges get a
   * butt cap unless a round or square cap can't show a seam there.
   */
  _paintBorder(
    context: ShapePaintContext,
    transform: Transform | null,
    scene: SceneHooks | null,
    stroke: boolean,
    border: BorderPaintLayer,
  ): void {
    const layer = border as EdgeBorder;
    let path = this._pathBase as PathBase;
    if (transform) {
      (path = new PathBase(false, (this._pathBase as PathBase).cloneAnchorPoints())).setProperty(
        "trf",
        transform,
      );
      path.assignStyleFrom(this);
    }
    each((path.getPaintLayers() as PaintLayers).getBorderLayers(), (_index, borderLayer) => {
      borderLayer.setProperty("_ba", BorderAlignment.Center);
    });
    path._scene = scene;
    const canvas = context.canvas;
    const vertices = path;
    const width = layer.$_bw;
    const miterLimit = layer.$_bml ? layer.$_bml : 10;
    const source = this.getSource() as PGAnchor;
    const destination = this.getDestination() as PGAnchor;
    const freeStart = source.getInEdges().length + source.getOutEdges().length == 1;
    const freeEnd = destination.getInEdges().length + destination.getOutEdges().length == 1;
    // Assigned further down; the old code read it before (a hoisted var),
    // so the square-cap test below always compares with NaN.
    let halfWidth: number | undefined;
    let cap: string = LineCap.Butt;
    if (freeStart && freeEnd) {
      cap = layer.$_blc;
      if (layer.$_bhm || layer.$_btm) {
        cap = layer.$_btmi || layer.$_bhmi ? LineCap.Butt : LineCap.Square;
      }
    } else if (freeStart || freeEnd) {
      if (
        layer.$_blc != LineCap.Round ||
        (layer.$_blj != LineJoin.Round && layer.$_blj != LineJoin.Miter)
      ) {
        // Quirk kept: reads the edge's own `_blc`, which edges don't have.
        if (this["$_blc"] == LineCap.Square && layer.$_blj == LineJoin.Miter) {
          cap = LineCap.Square;
          if ((layer.$_bhm && freeStart) || (layer.$_btm && freeEnd)) {
            cap = layer.$_btmi || layer.$_bhmi ? LineCap.Butt : LineCap.Square;
          }
        }
      } else {
        cap = LineCap.Round;
        if ((layer.$_bhm && freeStart) || (layer.$_btm && freeEnd)) {
          if (layer.$_btmi || layer.$_bhmi) cap = LineCap.Butt;
          else if (
            layer.$_blj == LineJoin.Miter &&
            (1.4142 * layer.$_bw) / 2 <= miterLimit * layer.$_bw - (halfWidth as number) / 2
          ) {
            cap = LineCap.Square;
          }
        }
      }
    } else if (!(
      layer.$_blc != LineCap.Round ||
      (layer.$_blj != LineJoin.Round && layer.$_blj != LineJoin.Miter)
    )) {
      cap = LineCap.Round;
    }
    if (stroke) {
      if (void 0 !== canvas.putVertices(vertices)) {
        canvas.strokeVertices(RGBColor.BLACK, width, layer.$_bds, cap, layer.$_blj, layer.$_bml, 1);
        path._paintBorderMarkers(context, RGBColor.BLACK, layer);
      }
    } else {
      const paintBox = path.getPaintBBox() as Rect;
      const styleCanvas = path._createStyleCanvas(context, paintBox);
      const previous = context.pushCanvas(styleCanvas);
      try {
        let patternBox = path.getPatternBBox();
        if (patternBox) {
          halfWidth = 0.5 * layer.$_bw;
          if (transform) {
            halfWidth /= transform.getScaleFactor();
            patternBox = patternBox.expanded(halfWidth, halfWidth, halfWidth, halfWidth);
          } else patternBox = patternBox.expanded(halfWidth, halfWidth, halfWidth, halfWidth);
        }
        const shapePaint = path.createShapePaint(context, layer.$_pt, patternBox);
        if (shapePaint && shapePaint.paint && void 0 !== styleCanvas.putVertices(vertices)) {
          let paintTransform: Transform | null = null;
          if (shapePaint.transform && shapePaint.transform.isValid()) {
            paintTransform = shapePaint.transform;
            if (transform) paintTransform = paintTransform.multiplied(transform);
            if (layer.$_px && !layer.$_px.isIdentity()) {
              paintTransform = paintTransform.preMultiplied(layer.$_px);
            }
          }
          let box = path.getGeometryBBox() as Rect;
          const padding = this.getStyleBorderPadding(layer);
          if (padding) box = box.expanded(padding, padding, padding, padding);
          let area = (box = path._calculateMarkersBorderBBox(box, layer));
          styleCanvas.strokeVertices(
            RGBColor.BLACK,
            width,
            layer.$_bds,
            cap,
            layer.$_blj,
            layer.$_bml,
            1,
          );
          path._paintBorderMarkers(context, RGBColor.BLACK, layer);
          if (paintTransform) {
            area = (paintTransform.inverted() as Transform).mapRect(area);
            const saved = styleCanvas.setTransform(
              styleCanvas.getTransform(true).multiplied(paintTransform),
            );
            styleCanvas.fillRect(
              area.getX(),
              area.getY(),
              area.getWidth(),
              area.getHeight(),
              shapePaint.paint,
              layer.$_op,
              Canvas2DPaintCanvas.CompositeOperator.SourceIn,
            );
            styleCanvas.setTransform(saved);
          } else {
            styleCanvas.fillRect(
              area.getX(),
              area.getY(),
              area.getWidth(),
              area.getHeight(),
              shapePaint.paint,
              layer.$_op,
              Canvas2DPaintCanvas.CompositeOperator.SourceIn,
            );
          }
        }
        previous.drawCanvas(styleCanvas);
        styleCanvas.finish();
      } finally {
        context.popCanvas();
      }
    }
  }

  /** The box of the border markers at the curve's ends, or null without markers. */
  getMarkersBorderBBox(transform: Transform | null, border: BorderPaintLayer): Rect | null {
    const layer = border as EdgeBorder;
    let box: Rect | null = null;
    if (layer.$_bhm || layer.$_btm) {
      let path = this._pathBase as PathBase;
      if (transform) {
        (path = new PathBase(false, (this._pathBase as PathBase).cloneAnchorPoints())).setProperty(
          "trf",
          transform,
        );
        path.assignStyleFrom(this);
      }
      box = path.getGeometryBBox();
      box = path._calculateMarkersBorderBBox(box as Rect, layer);
    }
    return box;
  }

  override toString(): string {
    return "[Object GPGEdge]";
  }
}

const proto = PGEdge.prototype;
proto.painted = false;
proto._pathBase = null;
proto._facets = null;
