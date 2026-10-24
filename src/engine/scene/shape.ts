// Old: chunk.vendor.js module 56 (GShape).
/**
 * The base of every vector shape (rectangle, ellipse, polygon, path,
 * compound path and shape, text, image frame): an item with a `trf`
 * transform and vertices (GVertexSource). Shapes paint their fill and
 * border layers, with border markers (arrowheads) at the path ends, and
 * are containers whose children are painted clipped to the shape. `bool`
 * is the boolean role of a child of a compound shape.
 *
 * Fake containers (compound shapes) keep the style of their children in
 * sync with their own: a child that changes its effects or style
 * properties pushes the change up (_styleFinishGeometryChange,
 * _stylePropertiesUpdated).
 */
import { Color } from "../color/color.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { Locale } from "../core/locale/locale.ts";
import { registerClass } from "../core/object.ts";
import { each, equals } from "../core/util.ts";
import { PolyIntersector, type PolyLine } from "../geometry/boolean/poly-segments.ts";
import { VertexPolyBoolean } from "../geometry/boolean/vertex-poly-boolean.ts";
import { HitResult } from "../geometry/hit-result.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import { VertexPixelAligner } from "../geometry/vertex-pixel-aligner.ts";
import { VertexSourceMixin, type VertexReader } from "../geometry/vertex-source.ts";
import { VertexTransformer } from "../geometry/vertex-transformer.ts";
import { Vertex } from "../geometry/vertex.ts";
import { GMath } from "../math/math.ts";
import { Length } from "../math/length.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { ElementData } from "../paint/element-data.ts";
import { Canvas2DPaintCanvas, type PaintCanvas, type PaintStyle } from "../paint/paint-canvas.ts";
import type { PaintContext } from "../paint/paint-context.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { Background } from "../style/background.ts";
import type { BorderPaintLayer } from "../style/border-paint-layer.ts";
import { Effect } from "../style/effect.ts";
import type { Effects } from "../style/effects.ts";
import { ElementStylable, type StylePaintContext } from "../style/element-stylable.ts";
import { FillPaintLayer } from "../style/fill-paint-layer.ts";
import type { PaintLayer } from "../style/paint-layer.ts";
import type { PaintLayers } from "../style/paint-layers.ts";
import type { Pattern } from "../style/pattern.ts";
import { BorderAlignment, BorderMarker, StyleLayer } from "../style/stylable-sets.ts";
import { TexturePattern } from "../style/texture-pattern.ts";
import { LabelHolder, type LabelHolderApi } from "./block.ts";
import { Accelerated } from "./element-accelerated.ts";
import { Anchor } from "./element-anchor.ts";
import { CollisionFlag, ElementChange } from "./element-change.ts";
import { Layout } from "./element-layout.ts";
import { Transform as TransformMixin } from "./element-transform.ts";
import { Element, type CollisionCollector } from "./element.ts";
import { Item } from "./item.ts";
import { NodeChange } from "./node-change.ts";
import { Container } from "./node-container.ts";
import type { PropertiesChangeArgs, PropertiesNode } from "./node-properties.ts";
import type { Node } from "./node.ts";
import type { SceneHooks } from "./scene-node.ts";

const GeometryProperties = {
  trf: null,
  bool: VertexPolyBoolean.OR,
};

const VisualProperties = {};

const MetaProperties = {
  scc: true,
};

const HitType = {
  Stroke: 0,
  Fill: 1,
  Outline: 2,
  Other: 3,
} as const;

/**
 * GShape.HitResult: what a shape's own hit test found (the `data` of the
 * returned ElementData). A plain class in the old code, never registered.
 */
export class ShapeHitResult {
  static Type = HitType;

  declare type: number | null;
  declare vertex: HitResult | null;
  /** Declared on the old prototype, never set. */
  declare vertexHit: unknown;

  constructor(type: number, vertex: HitResult) {
    this.type = type;
    this.vertex = vertex;
  }
}
(ShapeHitResult.prototype as unknown as Record<string, unknown>)["type"] = null;
(ShapeHitResult.prototype as unknown as Record<string, unknown>)["vertexHit"] = null;

/** The angular gradient pattern (engine-effects-webgl) that createShapePaint maps to a square. */
type AngularGradientClass = abstract new (...args: never[]) => Pattern;

let angularGradientClass: AngularGradientClass | null = null;

/**
 * GAngularGradient (chunk.vendor.js module 283) belongs to
 * engine-effects-webgl, which registers it here when it loads. Until then
 * an angular gradient fill is painted like any other pattern.
 */
export function registerAngularGradient(cls: AngularGradientClass): void {
  angularGradientClass = cls;
}

/** The paint context as the shape painting uses it. */
export interface ShapePaintContext extends StylePaintContext {
  isIncludingInvisible(): boolean;
  getOutlineColor(): Color;
  /** Set by callers that paint a shape without its children (or with their own callback). */
  _ignoreContents?: unknown;
}

/** What createShapePaint returns: a canvas paint and the transform to paint it with. */
export interface ShapePaint {
  paint: PaintStyle | null;
  transform: Transform | null;
}

/** The collision details GShape reports with CollisionFlag.CollisionInfo. */
export interface ShapeCollisionInfo {
  element: Shape;
  intersects: boolean;
  containsArea: boolean;
  separate: boolean;
}

/** One cached marker shape: the vertices at unit size and the scale they need. */
interface MarkerCacheEntry {
  scaleFactor: number;
  vertices: VertexContainer;
}

/** What the shape needs from the scene beyond SceneHooks. */
interface ShapeSceneHooks extends SceneHooks {
  getProperty(name: string): unknown;
}

/**
 * The old app read a global `context` here (a bug: there is none, so
 * _getAlignTransformation throws a ReferenceError). Kept.
 */
declare const context: { isIncludingInvisible(): unknown };

// A null cast for arguments the old code passed as null or undefined.
const NONE = null as unknown as number;

function asContext(paintContext: ShapePaintContext): PaintContext {
  return paintContext as unknown as PaintContext;
}

/** The collector also receives the collision details (CollisionInfo); typed as elements. */
function report(collect: CollisionCollector, value: Shape | ShapeCollisionInfo): void {
  collect(value as Element);
}

const ShapeBase = VertexSourceMixin(
  Accelerated(ElementStylable(Layout(TransformMixin(Container(Item))))),
);

export class Shape extends ShapeBase {
  static {
    registerClass(this, "GShape");
  }

  static GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;
  static override MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;
  /** Marker vertices by marker type, made on first use. */
  static MARKER_CACHE: Record<string, MarkerCacheEntry> = {};
  static MARKER_SIZE = 10;
  static HitResult = ShapeHitResult;

  declare $trf: Transform | null;
  declare $bool: number;
  declare $scc: boolean;
  /** Whether painting snaps to device pixels (paths and the parametric shapes). */
  declare _paintSharp: boolean;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
    this._setDefaultProperties(MetaProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GShape", "name", this.getNodeName()) as string;
  }

  override assignFrom(other: Node): void {
    if (other instanceof Shape)
      this.transferProperties(other, [GeometryProperties, MetaProperties]);
    // Also for other node kinds (then undefined), as in the old code.
    this._paintSharp = (other as Partial<Shape>)._paintSharp as boolean;
    super.assignFrom(other);
  }

  override getTransform(): Transform | null {
    return this.$trf;
  }

  /** The rotation of the bottom edge of the source box, in (-PI, PI]. */
  override getAngle(): number | null {
    let angle = 0;
    const box = this.getSourceBBox();
    if (box && !box.isEmpty()) {
      let left = box.getSide(Rect.Side.BOTTOM_LEFT);
      let right = box.getSide(Rect.Side.BOTTOM_RIGHT);
      if (this.$trf) {
        left = this.$trf.mapPoint(left);
        right = this.$trf.mapPoint(right);
      }
      if (
        (angle = GMath.normalizeAngleRadians(
          -Math.atan2(right.getY() - left.getY(), right.getX() - left.getX()),
        )) > Math.PI
      ) {
        angle -= GMath.PI2;
      }
    }
    return angle;
  }

  override setTransform(transform: Transform | null): void {
    this.setProperty("trf", transform);
  }

  override transform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void {
    if (transform && !transform.isIdentity()) {
      this._layoutTransform = transform;
      this._relayoutNow = !this._relayout;
      this._relayout = true;
      this.setProperty("trf", this.$trf ? this.$trf.multiplied(transform) : transform);
      super.transform(transform, force, exceptions);
      if (this._relayoutNow) {
        this._layoutAnchorContents(null, null, this._layoutTransform);
        this._layoutTransform = null;
      }
    }
  }

  override preTransform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void {
    if (transform && !transform.isIdentity()) {
      this._layoutTransform =
        this.$trf && this.$trf.invertible()
          ? (this.$trf.inverted() as Transform).multiplied(transform).multiplied(this.$trf)
          : transform;
      this._relayoutNow = !this._relayout;
      this._relayout = true;
      this.setProperty("trf", this.$trf ? transform.multiplied(this.$trf) : transform);
      super.preTransform(transform, force, exceptions);
      if (this._relayoutNow) {
        this._layoutAnchorContents(null, null, this._layoutTransform);
        this._layoutTransform = null;
      }
    }
  }

  /** The head marker of `border` at the start of the first segment, or null. */
  getHeadMarkerVertices(border: BorderPaintLayer): VertexReader | null {
    return this._getMarkerVertices(
      VertexInfo.getSegmentPoint(this, 1, 0),
      VertexInfo.getSegmentPoint(this, 1, 0.01),
      border.$_bhm,
      border.$_bhms as number,
      border.$_bw,
      border.$_bhmi as number,
      border.$_blc as string,
      border.$_bhmo,
    );
  }

  /** The tail marker of `border` at the end of the last segment, or null. */
  getTailMarkerVertices(border: BorderPaintLayer): VertexReader | null {
    return this._getMarkerVertices(
      VertexInfo.getSegmentPoint(this, NONE, 1),
      VertexInfo.getSegmentPoint(this, NONE, 0.99),
      border.$_btm,
      border.$_btms as number,
      border.$_bw,
      border.$_btmi as number,
      border.$_blc as string,
      border.$_btmo,
    );
  }

  /** The center of the source box, mapped by `trf` when `transformed`. */
  override getCenter(transformed?: unknown): Point | null {
    const box = this.getSourceBBox();
    let center = box ? box.getSide(Rect.Side.CENTER) : null;
    if (center && transformed && this.$trf) center = this.$trf.mapPoint(center);
    return center;
  }

  getOrigHalfWidth(): number {
    return 1;
  }

  getOrigHalfHeight(): number {
    return 1;
  }

  /** Whether the children are the shape itself (compound shapes). */
  isFakeContainer(): boolean {
    return false;
  }

  override getSubnodeIds(ids: Record<string, Node>): void {
    super.getSubnodeIds(ids);
    const effects = this.getEffects();
    if (effects) {
      if (ids[effects.getMultireferenceId()]) effects.resetMultireference();
      ids[effects.getMultireferenceId()] = effects;
      effects.getSubnodeIds(ids);
    }
    const layers = this.getPaintLayers();
    if (layers) {
      if (ids[layers.getMultireferenceId()]) layers.resetMultireference();
      ids[layers.getMultireferenceId()] = layers;
      layers.getSubnodeIds(ids);
    }
  }

  /** With a miter join on a shape with corners, the padding grows by the miter limit. */
  override getStyleBorderPadding(border: { $_ba: string; $_bw: number }): number {
    let padding = super.getStyleBorderPadding(border);
    const layer = border as BorderPaintLayer;
    if (
      padding &&
      this._requireMiterLimitApproximation() &&
      layer.$_blj === Canvas2DPaintCanvas.LineJoin.Miter &&
      (layer.$_bml as number) > 0
    ) {
      padding *= this.calculateMitterLimit(layer);
    }
    return padding;
  }

  /**
   * Partial collision against the outline instead of the box: a
   * rectangle area that equals the bounds is grown by the difference of
   * the geometry and the collision box first; then the area is
   * intersected with each sub-path and, without an intersection, tested
   * for containment (by the fill rule).
   */
  override _checkPartialCollision(
    bounds: Rect,
    box: Rect,
    area: VertexReader,
    inclusive: boolean,
    flags: number,
    collect: CollisionCollector,
  ): void {
    if (!bounds.intersectsRect(box, inclusive)) return;
    area.rewindVertices(0);
    let corners: Point[] | null = [];
    for (const vertex = new Vertex(); area.readVertex(vertex);) {
      if (vertex.command <= Vertex.Command.Line) corners.push(new Point(vertex.x, vertex.y));
      else if (vertex.command !== Vertex.Command.Close) {
        corners = null;
        break;
      }
    }
    if (corners && Rect.equals(Rect.fromPoints(...corners), bounds)) {
      const geometry = this.getGeometryBBox() as Rect;
      if (!Rect.equals(geometry, box)) {
        const top = geometry.getY() - box.getY();
        const left = geometry.getX() - box.getX();
        const right = box.getWidth() - (left + geometry.getWidth());
        const bottom = box.getHeight() - (top + geometry.getHeight());
        const grown = bounds.expanded(left, top, right, bottom);
        const x1 = grown.getX();
        const y1 = grown.getY();
        const x2 = x1 + grown.getWidth();
        const y2 = y1 + grown.getHeight();
        const rectangle = new VertexContainer();
        rectangle.addVertex(Vertex.Command.Move, x1, y1);
        rectangle.addVertex(Vertex.Command.Line, x2, y1);
        rectangle.addVertex(Vertex.Command.Line, x2, y2);
        rectangle.addVertex(Vertex.Command.Line, x1, y2);
        rectangle.addVertex(Vertex.Command.Close, 0, 0);
        area = rectangle;
      }
    }
    const inside = (poly: PolyLine, point: Point | null): boolean => {
      if (this._isEvenOddFill()) {
        if (poly.getOddEven(point)) return true;
      } else if (poly.getWinding(point)) return true;
      return false;
    };
    const withInfo = flags & CollisionFlag.CollisionInfo;
    const subPaths = VertexContainer.splitVertexSource(this);
    let areaPoly: PolyLine | null = null;
    const intersector = new PolyIntersector();
    for (let i = 0; i < subPaths.length; i++) {
      if (intersector.intersect(area, subPaths[i] as VertexReader, false, true, areaPoly)) {
        if (!(flags & CollisionFlag.FullyContained)) {
          report(
            collect,
            withInfo
              ? { element: this, intersects: true, containsArea: false, separate: false }
              : this,
          );
        }
        return;
      }
      areaPoly = intersector._polyLine0;
    }
    const first = () => intersector.getFirstPoly() as PolyLine;
    const second = () => intersector.getSecondPoly() as PolyLine;
    if (flags & CollisionFlag.FullyContained) {
      const separateCheck = this._isEvenOddFill() && withInfo;
      if (1 === subPaths.length) {
        const shapePoly = second();
        if (inside(shapePoly, first().point)) {
          report(
            collect,
            withInfo
              ? { element: this, separate: false, containsArea: true, intersects: false }
              : this,
          );
        } else if (separateCheck && !inside(first(), shapePoly.point)) {
          report(collect, {
            element: this,
            separate: true,
            containsArea: false,
            intersects: false,
          });
        }
      } else {
        const contains = inside(intersector._makePolygon(this), first().point);
        if (contains || separateCheck) {
          let inHole = false;
          if (this._isEvenOddFill()) {
            const vertex = new Vertex();
            for (let i = 0; i < subPaths.length; i++) {
              (subPaths[i] as VertexReader).rewindVertices(0);
              (subPaths[i] as VertexReader).readVertex(vertex);
              const start = new Point(vertex.x, vertex.y);
              if (inside(first(), start)) {
                inHole = true;
                break;
              }
            }
          }
          if (!inHole) {
            if (contains) {
              report(
                collect,
                withInfo
                  ? { element: this, separate: false, containsArea: true, intersects: false }
                  : this,
              );
            } else if (separateCheck) {
              report(collect, {
                element: this,
                separate: true,
                containsArea: false,
                intersects: false,
              });
            }
          }
        }
      }
    } else {
      if (inside(first(), second().point)) {
        report(
          collect,
          withInfo
            ? { element: this, separate: false, containsArea: false, intersects: false }
            : this,
        );
      } else if (
        this.hasStyleFill() &&
        inside(1 === subPaths.length ? second() : intersector._makePolygon(this), first().point)
      ) {
        report(
          collect,
          withInfo
            ? { element: this, separate: false, containsArea: true, intersects: false }
            : this,
        );
      }
    }
  }

  override _paintStyleLayer(context: StylePaintContext, layer: string, separate: boolean): void {
    const paintContext = context as ShapePaintContext;
    const layers = this.getPaintLayers() as PaintLayers;
    if (layer === StyleLayer.Fill) {
      const fills = layers.getFillLayers(true);
      if (!fills.length) fills.push(new FillPaintLayer());
      if (layers.hasFillMaskLayers()) this._paintFillMaskLayers(paintContext, separate, fills);
      else this._paintFillLayers(paintContext, separate, fills);
      if (paintContext._ignoreContents) {
        if ("function" == typeof paintContext._ignoreContents) {
          (paintContext._ignoreContents as (context: unknown, layer: string) => void)(
            paintContext,
            layer,
          );
        }
      } else this._paintContents(paintContext, separate);
    } else if (layer === StyleLayer.Border) {
      if (paintContext.configuration.isOutline(paintContext as never)) {
        this._paintBorder(paintContext, separate, null);
      } else {
        each(layers.getBorderLayers(true), (_index, border) => {
          this._paintBorder(paintContext, separate, border);
        });
      }
    }
  }

  _paintFillLayers(context: ShapePaintContext, separate: boolean, fills: FillPaintLayer[]): void {
    each(fills, (_index, fill) => {
      this._paintFill(context, separate, fill);
    });
  }

  /** Mask fills are combined first (DestinationIn), the other fills painted into the mask. */
  _paintFillMaskLayers(
    context: ShapePaintContext,
    separate: boolean,
    fills: FillPaintLayer[],
  ): void {
    const maskCanvas = this._createStyleCanvas(context, this.getPaintBBox() as Rect);
    const masks = fills.filter((fill) => fill.isMask());
    each(masks, (index, mask) => {
      const canvas = this._createStyleCanvas(context, this.getPaintBBox() as Rect);
      context.pushCanvas(canvas);
      try {
        this._paintFill(context, separate, mask);
        maskCanvas.drawCanvas(
          canvas,
          0,
          0,
          null,
          (index as number) > 0 ? Canvas2DPaintCanvas.CompositeOperator.DestinationIn : null,
        );
      } finally {
        canvas.finish();
        context.popCanvas();
      }
    });
    fills = fills.filter((fill) => !fill.isMask());
    if (fills.length) {
      const canvas = this._createStyleCanvas(context, this.getPaintBBox() as Rect);
      context.pushCanvas(canvas);
      try {
        this._paintFillLayers(context, separate, fills);
      } finally {
        context.popCanvas();
      }
      maskCanvas.drawCanvas(canvas, 0, 0, null, Canvas2DPaintCanvas.CompositeOperator.SourceIn);
      canvas.finish();
    }
    context.canvas.drawCanvas(maskCanvas);
    maskCanvas.finish();
  }

  override _isStyleSeparate(): boolean {
    return (this.getPaintLayers() as PaintLayers).hasSeparateFillLayer();
  }

  /**
   * Borders need their own canvas unless they are centered, solid colors
   * without transparent markers; fills when an outside border is drawn
   * over them.
   */
  override _isSeparateStylePaintLayer(context: StylePaintContext, layer: string): boolean {
    if (super._isSeparateStylePaintLayer(context, layer)) return true;
    const borders = (this.getPaintLayers() as PaintLayers).getBorderLayers(true);
    const anyBorder = (names: string[], test: (...values: unknown[]) => unknown): boolean => {
      for (let i = 0; i < borders.length; i++) {
        if (
          test(...(borders[i] as BorderPaintLayer).getProperties(names, null as never, null, true))
        )
          return true;
      }
      return false;
    };
    if (layer === StyleLayer.Border) {
      if (!this.hasStyleBorder()) return false;
      if (anyBorder(["_ba"], (alignment) => alignment !== BorderAlignment.Center)) return true;
      if (anyBorder(["_pt"], (pattern) => !(pattern instanceof Color))) return true;
      if (
        anyBorder(
          ["_bhm", "_btm", "_op"],
          (head, tail, opacity) => (head || tail) && (opacity as number) < 1,
        )
      )
        return true;
    }
    return !!(
      layer === StyleLayer.Fill &&
      this.hasStyleFill() &&
      this.hasStyleBorder() &&
      anyBorder(["_ba"], (alignment) => alignment === BorderAlignment.Outside)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override _calculateGeometryBBox(includeInvisible?: unknown): Rect | null {
    return VertexInfo.calculateBounds(this, true);
  }

  /** The geometry box grown by the effects of each style layer, the borders and their markers. */
  override _calculatePaintBBox(arg?: unknown, includeInvisible?: unknown): Rect | null {
    const geometry = this.getGeometryBBox(includeInvisible);
    if (!geometry) return null;
    const effects = this.getEffects() as Effects;
    let paint = geometry;
    const scaleBox = new Rect(
      geometry.getX(),
      geometry.getY(),
      geometry.getWidth(),
      geometry.getHeight(),
    );
    if (this.hasStyleFill()) {
      // The old code passes a box where the effects expect a scale; kept.
      const fill = effects.getEffectsBBox(geometry, StyleLayer.Fill, scaleBox as unknown as number);
      paint = paint.united(fill);
    }
    let borders: Rect | null = null;
    if (this.hasStyleBorder()) {
      each((this.getPaintLayers() as PaintLayers).getBorderLayers(true), (_index, border) => {
        let box = geometry;
        const padding = this.getStyleBorderPadding(border);
        if (padding) box = box.expanded(padding, padding, padding, padding);
        box = this._calculateMarkersBorderBBox(box, border);
        const withEffects = effects.getEffectsBBox(
          box,
          StyleLayer.Border,
          box as unknown as number,
        );
        paint = paint.united(withEffects);
        borders = borders ? borders.united(box) : box;
      });
    }
    return (paint = effects.getEffectsBBox(
      paint,
      null,
      (borders || scaleBox) as unknown as number,
    ));
  }

  _calculateMarkersBorderBBox(box: Rect, border: BorderPaintLayer): Rect {
    const head = this.getHeadMarkerVertices(border);
    const tail = this.getTailMarkerVertices(border);
    const width = border.$_bw;
    if (head) {
      box = box.united(
        (VertexInfo.calculateBounds(head, true) as Rect).expanded(width, width, width, width),
      );
    }
    if (tail) {
      box = box.united(
        (VertexInfo.calculateBounds(tail, true) as Rect).expanded(width, width, width, width),
      );
    }
    return box;
  }

  /** Whether a miter join can reach beyond half the border width (shapes with corners). */
  _requireMiterLimitApproximation(): unknown {
    return false;
  }

  _isEvenOddFill(): boolean {
    return false;
  }

  /**
   * The canvas paint for `pattern`: the average color without WebGL, the
   * root canvas for a background, a texture mapped onto the source box, an
   * angular gradient on a square, or the pattern itself in `bbox`.
   */
  createShapePaint(
    context: ShapePaintContext,
    pattern: Pattern | null | undefined,
    bbox?: Rect | null,
  ): ShapePaint | null | undefined {
    const includeInvisible = context.isIncludingInvisible();
    if (context.configuration.noWebGL && pattern && pattern.isWebGL()) {
      const average = pattern.getAverageColor();
      const color = new RGBColor(average as number[]);
      return context.canvas.createPatternPaint(color, bbox) as ShapePaint | undefined;
    }
    if (pattern instanceof Background) {
      const root = context.getRootCanvas();
      if (!root) return null;
      const origin = root.getOrigin() as Point;
      const scale = root.getScale() as number;
      let transform = new Transform()
        .translated(origin.getX(), origin.getY())
        .scaled(1 / scale, 1 / scale);
      if (this.$trf && this.$trf.invertible()) {
        transform = transform.multiplied(this.$trf.inverted() as Transform);
      }
      this._resetFxCacheAndState();
      return {
        paint: context.canvas.createTexture(root, TexturePattern.RepeatMode.None),
        transform,
      };
    }
    if (pattern instanceof TexturePattern) {
      const own = this.$trf || new Transform();
      const source = this.getSourceBBox(includeInvisible);
      const textureTransform = pattern.createTextureTransform(
        source,
        own,
        context.canvas.getScale() as number,
      );
      pattern.addEventListener(
        TexturePattern.UpdateEvent,
        this._requestInvalidation.bind(this),
        this,
      );
      return context.canvas.createPatternPaint(
        pattern,
        this.getGeometryBBox(includeInvisible),
        textureTransform,
      ) as ShapePaint | undefined;
    }
    if (angularGradientClass && pattern instanceof angularGradientClass) {
      const box = bbox || (this.getSourceBBox(includeInvisible) as Rect);
      const boxTransform = Transform.getNativeRectTransformation(box);
      const geometry = this.getGeometryBBox(includeInvisible) as Rect;
      const size = Math.max(geometry.getWidth(), geometry.getHeight());
      const square = new Rect(0, 0, size, size);
      const squareInverse = Transform.getNativeRectTransformation(square).inverted();
      const transform = squareInverse ? squareInverse.multiplied(boxTransform) : boxTransform;
      return context.canvas.createPatternPaint(pattern, square, transform) as
        ShapePaint | undefined;
    }
    return pattern
      ? (context.canvas.createPatternPaint(pattern, bbox) as ShapePaint | undefined)
      : null;
  }

  /** The source box, or the geometry box mapped back by `trf` when the source box is empty. */
  getPatternBBox(includeInvisible?: unknown): Rect | null {
    let box = this.getSourceBBox(includeInvisible);
    if (!box || box.isEmpty()) {
      box = this.getGeometryBBox(includeInvisible);
      if (this.$trf && this.$trf.invertible()) {
        box = (this.$trf.inverted() as Transform).mapRect(box as Rect);
      }
    }
    return box;
  }

  /**
   * `source` snapped to device pixels when the shape paints sharp and the
   * document unit is px: on half pixels for odd (rounded up) border widths.
   */
  makeSharp(
    context: ShapePaintContext,
    canvas: PaintCanvas,
    source: VertexReader,
    outline?: unknown,
  ): VertexReader {
    if (
      this._paintSharp &&
      (!context.configuration || context.configuration.paintSharp) &&
      canvas instanceof Canvas2DPaintCanvas &&
      this._scene &&
      (this._scene as ShapeSceneHooks).getProperty("ut") === Length.Unit.PX
    ) {
      let width = 0;
      if (outline) width = 1;
      else if (this.hasStyleBorder()) {
        width = 0;
        each((this.getPaintLayers() as PaintLayers).getBorderLayers(true), (_index, border) => {
          let borderWidth = border.$_bw;
          if (border.$_ba !== BorderAlignment.Center) borderWidth *= 2;
          width = Math.max(width, borderWidth);
        });
        width *= canvas.getScale() as number;
      }
      source = new VertexPixelAligner(
        source,
        canvas.getTransform(),
        Math.ceil(width) % 2 == 0,
        this.getGeometryBBox(context.isIncludingInvisible()),
      );
    }
    return source;
  }

  /** The transform that aligns the geometry box (grown by the borders) to device pixels. */
  _getAlignTransformation(canvas: PaintCanvas): Transform {
    let padding: number | undefined;
    const box = this.getGeometryBBox(context.isIncludingInvisible()) as Rect;
    let grow = new Transform();
    each((this.getPaintLayers() as PaintLayers).getBorderLayers(true), (_index, border) => {
      if (border.$_ba !== BorderAlignment.Inside) {
        padding =
          border.$_ba === BorderAlignment.Center
            ? Math.max(padding || 0, border.$_bw / 2)
            : Math.max(padding || 0, border.$_bw);
      }
    });
    if (padding) {
      grow = Transform.getResizeTransform(
        box,
        Rect.Side.BOTTOM_RIGHT,
        padding,
        padding,
        false,
        true,
      );
    }
    const view = canvas.getTransform();
    const aligned = (grow = grow.multiplied(view)).mapRect(box).toAlignedRect();
    const inverse = grow.inverted();
    const target = inverse ? inverse.mapRect(aligned) : box;
    const result = Transform.getResizeTransform(
      box,
      Rect.Side.TOP_LEFT,
      target.getX() - box.getX(),
      target.getY() - box.getY(),
      false,
      false,
    );
    const moved = result.mapRect(box);
    return result.multiplied(
      Transform.getResizeTransform(
        moved,
        Rect.Side.BOTTOM_RIGHT,
        target.getX() + target.getWidth() - box.getX() - box.getWidth(),
        target.getY() + target.getHeight() - box.getY() - box.getHeight(),
        false,
        false,
      ),
    );
  }

  /**
   * Paints one fill layer: through a separate clipped canvas when the
   * canvas clips and the layer is separate (or an outside border is drawn
   * separately), else straight into the canvas (pixel snapped).
   */
  _paintFill(context: ShapePaintContext, separate: boolean, fill: PaintLayer): void {
    if (context.configuration.isOutline(context as never) || !this.hasStyleFill()) return;
    const includeInvisible = context.isIncludingInvisible();
    const shapePaint = this.createShapePaint(
      context,
      fill.$_pt,
      this.getPatternBBox(includeInvisible),
    );
    if (!shapePaint) return;
    let source = this as VertexReader;
    const canvas = context.canvas;
    if (shapePaint.transform) {
      if (this.$trf) shapePaint.transform = shapePaint.transform.multiplied(this.$trf);
      if (fill.$_px && !fill.$_px.isIdentity()) {
        shapePaint.transform = shapePaint.transform.preMultiplied(fill.$_px);
      }
    }
    const paint = shapePaint.paint as PaintStyle;
    if (
      canvas.hasClip() &&
      ((fill.isSeparateLayer() && canvas.isClipped()) ||
        (separate &&
          this.hasStyleFill() &&
          this.hasStyleBorder() &&
          this.$_ba === BorderAlignment.Outside))
    ) {
      if (undefined !== canvas.putVertices(source)) {
        canvas.clipVertices();
        const area = this.getPaintBBox(false, null, includeInvisible) as Rect;
        const layerCanvas = this._createStyleCanvas(context, area);
        context.pushCanvas(layerCanvas);
        try {
          // `$_ba` of the shape is never set (it is a border property); kept.
          if (
            separate &&
            this.hasStyleFill() &&
            this.hasStyleBorder() &&
            this.$_ba === BorderAlignment.Outside
          ) {
            each((this.getPaintLayers() as PaintLayers).getBorderLayers(true), (_index, border) => {
              layerCanvas.putVertices(source);
              layerCanvas.strokeVertices(
                RGBColor.BLACK,
                border.$_bw,
                border.$_bds as number[],
                border.$_blc as string,
                border.$_blj as string,
                border.$_bml as number,
                1,
              );
              let box = this.getGeometryBBox(includeInvisible) as Rect;
              box = box.expanded(border.$_bw, border.$_bw, border.$_bw, border.$_bw);
              const transform = shapePaint.transform;
              if (transform && transform.invertible()) {
                box = (transform.inverted() as Transform).mapRect(box);
                const previous = layerCanvas.setTransform(
                  layerCanvas.getTransform(true).multiplied(transform),
                );
                layerCanvas.fillVertices(RGBColor.BLACK, 1, null, this._isEvenOddFill());
                layerCanvas.fillRect(
                  box.getX(),
                  box.getY(),
                  box.getWidth(),
                  box.getHeight(),
                  paint,
                  fill.$_op,
                  Canvas2DPaintCanvas.CompositeOperator.SourceIn,
                );
                layerCanvas.setTransform(previous);
              } else {
                layerCanvas.fillVertices(RGBColor.BLACK, 1, null, this._isEvenOddFill());
                layerCanvas.fillRect(
                  box.getX(),
                  box.getY(),
                  box.getWidth(),
                  box.getHeight(),
                  paint,
                  fill.$_op,
                  Canvas2DPaintCanvas.CompositeOperator.SourceIn,
                );
              }
            });
          } else if (undefined !== layerCanvas.putVertices(source)) {
            if (shapePaint.transform) {
              const previous = layerCanvas.setTransform(
                layerCanvas.getTransform(true).preMultiplied(shapePaint.transform),
              );
              layerCanvas.fillVertices(paint, fill.$_op, null, this._isEvenOddFill());
              // Restores the outer canvas, not the layer canvas (old behaviour).
              canvas.setTransform(previous);
            } else layerCanvas.fillVertices(paint, fill.$_op, null, this._isEvenOddFill());
          }
          canvas.drawCanvas(
            layerCanvas,
            0,
            0,
            fill.$_op,
            fill.getBlendingForContext(context as never),
          );
          layerCanvas.finish();
        } finally {
          context.popCanvas();
        }
        canvas.resetClip();
      }
    } else if (
      ((source = this.makeSharp(context, canvas, this)), undefined !== canvas.putVertices(source))
    ) {
      if (shapePaint.transform) {
        const previous = canvas.setTransform(
          canvas.getTransform(true).preMultiplied(shapePaint.transform),
        );
        canvas.fillVertices(
          paint,
          fill.$_op,
          fill.getBlendingForContext(context as never),
          this._isEvenOddFill(),
        );
        canvas.setTransform(previous);
      } else {
        canvas.fillVertices(
          paint,
          fill.$_op,
          fill.getBlendingForContext(context as never),
          this._isEvenOddFill(),
        );
      }
    }
  }

  /**
   * Paints the children clipped to the shape. Children inside the
   * geometry box that don't collide with the outline are painted as they
   * are (or not at all when they lie in a hole).
   */
  _paintContents(context: ShapePaintContext, separate: boolean): void {
    if (!this.getFirstChild()) return;
    const childrenBox = this.getChildrenPaintBBox();
    const geometry = this.getGeometryBBox(context.isIncludingInvisible()) as Rect;
    if (!childrenBox || childrenBox.isEmpty()) return;
    if (geometry.containsRect(childrenBox)) {
      if (undefined === this._collidesWithChildren) {
        const area = new VertexContainer();
        area.addVertex(Vertex.Command.Move, childrenBox.getX(), childrenBox.getY());
        area.addVertex(
          Vertex.Command.Line,
          childrenBox.getX(),
          childrenBox.getY() + childrenBox.getHeight(),
        );
        area.addVertex(
          Vertex.Command.Line,
          childrenBox.getX() + childrenBox.getWidth(),
          childrenBox.getY() + childrenBox.getHeight(),
        );
        area.addVertex(
          Vertex.Command.Line,
          childrenBox.getX() + childrenBox.getWidth(),
          childrenBox.getY(),
        );
        area.addVertex(Vertex.Command.Close, 0, 0);
        const separateHits: ShapeCollisionInfo[] = [];
        const hits: ShapeCollisionInfo[] = [];
        this.getCollisions(
          area,
          CollisionFlag.Partial |
            CollisionFlag.GeometryBBox |
            CollisionFlag.FullyContained |
            CollisionFlag.CollisionInfo,
          (found) => {
            const info = found as unknown as ShapeCollisionInfo;
            if (info.separate) separateHits.push(info);
            else hits.push(info);
            return true;
          },
          null,
          () => false,
        );
        this._collidesWithChildren = hits.length > 0;
        this._collidesWithChildrenSeparate = 0 === hits.length && separateHits.length > 0;
      }
      if (this._collidesWithChildren) {
        for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
          if (child instanceof Element) child.paint(asContext(context));
        }
        return;
      }
      if (this._collidesWithChildrenSeparate) return;
    }
    const area = geometry.intersected(childrenBox);
    if (context.canvas.hasClip()) {
      let canvas = context.canvas;
      let previous: PaintCanvas | null | undefined;
      if (!separate) {
        canvas = this._createStyleCanvas(context, area);
        previous = context.pushCanvas(canvas);
      }
      try {
        if (undefined !== canvas.putVertices(this)) canvas.clipVertices(this._isEvenOddFill());
        try {
          for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
            if (child instanceof Element) child.paint(asContext(context));
          }
        } finally {
          canvas.resetClip();
        }
        if (previous) {
          previous.drawCanvas(canvas);
          canvas.finish();
        }
      } finally {
        if (previous) context.popCanvas();
      }
    } else {
      let previous: PaintCanvas | null = null;
      for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
        if (child instanceof Element) {
          if (!previous) previous = context.pushCanvas(context.canvas.createCanvas(area));
          child.paint(asContext(context));
        }
      }
      if (previous) {
        if (undefined !== context.canvas.putVertices(this)) {
          context.canvas.fillVertices(
            RGBColor.BLACK,
            1,
            Canvas2DPaintCanvas.CompositeOperator.DestinationIn,
          );
          previous.drawCanvas(context.canvas);
        }
        context.canvas.finish();
        context.popCanvas();
      }
    }
  }

  /**
   * Paints one border layer (or the outline in outline mode): straight
   * with its markers, or separately when it is not centered or the fill
   * shows through an outside border.
   */
  _paintBorder(
    context: ShapePaintContext,
    separate: boolean,
    border: BorderPaintLayer | null,
  ): void {
    const outline = context.configuration.isOutline(context as never);
    if (outline) {
      const view = context.canvas.resetTransform();
      let source: VertexReader = new VertexTransformer(this, view);
      source = this.makeSharp(context, context.canvas, source, outline);
      context.canvas.putVertices(source);
      context.canvas.strokeVertices(context.getOutlineColor());
      context.canvas.setTransform(view);
      return;
    }
    if (!this.hasStyleBorder()) return;
    const layer = border as BorderPaintLayer;
    const includeInvisible = context.isIncludingInvisible();
    let patternBox = this.getPatternBBox(includeInvisible);
    if (patternBox && layer.$_ba !== BorderAlignment.Inside) {
      let reach = layer.$_bw;
      if (layer.$_ba === BorderAlignment.Center) reach *= 0.5;
      if (this.$trf) {
        reach /= this.$trf.getScaleFactor();
        patternBox = patternBox.expanded(reach, reach, reach, reach);
      } else patternBox = patternBox.expanded(reach, reach, reach, reach);
    }
    let width = layer.$_bw;
    if (layer.$_ba !== BorderAlignment.Center) width *= 2;
    if (
      separate &&
      this.hasStyleFill() &&
      layer.$_ba === BorderAlignment.Outside &&
      context.canvas.hasClip()
    ) {
      const outer = context.canvas;
      const borderCanvas = this._createStyleCanvas(
        context,
        this.getPaintBBox(false, null, includeInvisible) as Rect,
      );
      context.pushCanvas(borderCanvas);
      try {
        let box = this.getGeometryBBox(includeInvisible) as Rect;
        const padding = this.getStyleBorderPadding(layer);
        if (padding) box = box.expanded(padding, padding, padding, padding);
        const markersBox = (box = this._calculateMarkersBorderBBox(box, layer));
        const canvas = context.canvas;
        const fills = (this.getPaintLayers() as PaintLayers).getFillLayers(true);
        each(fills, (_index, fill) => {
          const fillPaint = this.createShapePaint(
            context,
            fill.$_pt,
            this.getPatternBBox(includeInvisible),
          );
          if (fillPaint && fillPaint.paint) {
            canvas.putVertices(this);
            canvas.strokeVertices(
              fillPaint.paint,
              width / 2,
              layer.$_bds as number[],
              layer.$_blc as string,
              layer.$_blj as string,
              layer.$_bml as number,
              1,
            );
            canvas.fillVertices(RGBColor.BLACK, 1, null, this._isEvenOddFill());
            const opacity = layer.$_op
              ? fill.$_op && fill.$_op < layer.$_op
                ? fill.$_op / layer.$_op
                : 1
              : fill.$_op;
            canvas.fillRect(
              markersBox.getX(),
              markersBox.getY(),
              markersBox.getWidth(),
              markersBox.getHeight(),
              fillPaint.paint,
              opacity,
              Canvas2DPaintCanvas.CompositeOperator.SourceIn,
            );
          }
        });
        const separateCanvas = this._createStyleCanvas(
          context,
          this.getPaintBBox(false, null, includeInvisible) as Rect,
        );
        context.pushCanvas(separateCanvas);
        try {
          this._paintBorderSeparate(context, false, true, false, layer);
          canvas.drawCanvas(separateCanvas);
        } finally {
          context.popCanvas();
        }
        borderCanvas.putVertices(this);
        borderCanvas.clipVertices(true);
        borderCanvas.clear();
        borderCanvas.resetClip();
        outer.drawCanvas(
          borderCanvas,
          NONE,
          NONE,
          layer.$_op,
          layer.getBlendingForContext(context as never),
        );
        borderCanvas.finish();
      } finally {
        context.popCanvas();
      }
    } else if (separate) {
      const separateCanvas = this._createStyleCanvas(
        context,
        this.getPaintBBox(false, null, includeInvisible) as Rect,
      );
      const outer = context.pushCanvas(separateCanvas) as PaintCanvas;
      try {
        this._paintBorderSeparate(context, true, true, true, layer);
        outer.drawCanvas(
          separateCanvas,
          NONE,
          NONE,
          1,
          layer.getBlendingForContext(context as never),
        );
        separateCanvas.finish();
      } finally {
        context.popCanvas();
      }
    } else {
      const canvas = context.canvas;
      const source = this.makeSharp(context, canvas, this);
      const borderPaint = this.createShapePaint(context, layer.$_pt, patternBox);
      if (borderPaint && borderPaint.paint && undefined !== canvas.putVertices(source)) {
        const miterLimit = this.calculateMitterLimit(layer);
        canvas.strokeVertices(
          borderPaint.paint,
          width,
          layer.$_bds as number[],
          layer.$_blc as string,
          layer.$_blj as string,
          miterLimit,
          layer.$_op,
          layer.getBlendingForContext(context as never),
        );
        this._paintBorderMarkers(context, borderPaint.paint, layer);
      }
    }
  }

  /** The miter limit to stroke with (sic: "Mitter"). */
  calculateMitterLimit(border: BorderPaintLayer): number {
    return border.$_bml as number;
  }

  /**
   * Paints a border through its outline: the stroke in black, cut to the
   * inside or outside, with markers when `withMarkers`, then the paint
   * filled into it (SourceIn), with the layer opacity when `withOpacity`.
   */
  _paintBorderSeparate(
    context: ShapePaintContext,
    sharp: boolean,
    withMarkers: boolean,
    withOpacity: boolean,
    border: BorderPaintLayer,
  ): void {
    if (!this.hasStyleBorder()) return;
    const canvas = context.canvas;
    let source = this as VertexReader;
    if (sharp) source = this.makeSharp(context, canvas, this);
    const includeInvisible = context.isIncludingInvisible();
    let patternBox = this.getPatternBBox(includeInvisible);
    if (patternBox && border.$_ba !== BorderAlignment.Inside) {
      let reach = border.$_bw;
      if (border.$_ba === BorderAlignment.Center) reach *= 0.5;
      if (this.$trf) {
        reach /= this.$trf.getScaleFactor();
        patternBox = patternBox.expanded(reach, reach, reach, reach);
      } else patternBox = patternBox.expanded(reach, reach, reach, reach);
    }
    const borderPaint = this.createShapePaint(context, border.$_pt, patternBox);
    if (!(borderPaint && borderPaint.paint && undefined !== canvas.putVertices(source))) return;
    let width = border.$_bw;
    if (border.$_ba !== BorderAlignment.Center) width *= 2;
    let box = this.getGeometryBBox(includeInvisible) as Rect;
    const padding = this.getStyleBorderPadding(border);
    if (padding) box = box.expanded(padding, padding, padding, padding);
    if (withMarkers) box = this._calculateMarkersBorderBBox(box, border);
    let fillBox = box;
    let patternTransform: Transform | null = null;
    if (borderPaint.transform && borderPaint.transform.isValid()) {
      patternTransform = borderPaint.transform;
      if (this.$trf) patternTransform = patternTransform.multiplied(this.$trf);
      if (border.$_px && !border.$_px.isIdentity()) {
        patternTransform = patternTransform.preMultiplied(border.$_px);
      }
    }
    const miterLimit = this.calculateMitterLimit(border);
    canvas.strokeVertices(
      RGBColor.BLACK,
      width,
      border.$_bds as number[],
      border.$_blc as string,
      border.$_blj as string,
      miterLimit,
      1,
    );
    if (border.$_ba === BorderAlignment.Inside) {
      canvas.fillVertices(
        RGBColor.BLACK,
        1,
        Canvas2DPaintCanvas.CompositeOperator.DestinationIn,
        true,
      );
    } else if (border.$_ba === BorderAlignment.Outside) {
      canvas.fillVertices(
        RGBColor.BLACK,
        1,
        Canvas2DPaintCanvas.CompositeOperator.DestinationOut,
        true,
      );
    }
    if (withMarkers) this._paintBorderMarkers(context, RGBColor.BLACK, border);
    if (patternTransform && patternTransform.invertible()) {
      fillBox = (patternTransform.inverted() as Transform).mapRect(fillBox);
      const previous = canvas.setTransform(canvas.getTransform(true).multiplied(patternTransform));
      canvas.fillRect(
        fillBox.getX(),
        fillBox.getY(),
        fillBox.getWidth(),
        fillBox.getHeight(),
        borderPaint.paint,
        withOpacity ? border.$_op : 1,
        Canvas2DPaintCanvas.CompositeOperator.SourceIn,
      );
      canvas.setTransform(previous);
    } else {
      canvas.fillRect(
        fillBox.getX(),
        fillBox.getY(),
        fillBox.getWidth(),
        fillBox.getHeight(),
        borderPaint.paint,
        withOpacity ? border.$_op : 1,
        Canvas2DPaintCanvas.CompositeOperator.SourceIn,
      );
    }
  }

  /**
   * The marker at `start`, pointing away from `next`: a custom vertex
   * container or one of the built-in marker types, scaled by the border
   * width and `scale`, moved out by the cap and `inside` (the share of
   * the marker height inside the path end).
   */
  _getMarkerVertices(
    start: Point | null,
    next: Point | null,
    marker: unknown,
    scale: number,
    width: number,
    inside: number,
    cap: string,
    offset: unknown,
  ): VertexReader | null {
    if (!marker) return null;
    if (!start || !next) return null;
    let vertices: VertexReader;
    const borderScale = this._calculateMarkerVerticeBorderScale(width);
    let bottom = offset ? Math.sqrt(2) / 2 : 0;
    let top = bottom;
    let size: number;
    if (marker instanceof VertexContainer) {
      vertices = marker;
      if (!offset) {
        let closed = false;
        vertices.rewindVertices(0);
        for (const vertex = new Vertex(); vertices.readVertex(vertex);) {
          if (!(vertex.command !== Vertex.Command.Close || vertices.hasVertexForRead())) {
            closed = true;
          }
        }
        vertices.rewindVertices(0);
        if (!closed) top = bottom = Math.sqrt(2) / 2;
      }
      vertices = new VertexTransformer(
        vertices,
        new Transform((size = borderScale * scale), 0, 0, size, 0, 0),
      );
    } else {
      const type = marker as string;
      let shape: VertexContainer | null = null;
      let scaleFactor = 1;
      if (Object.prototype.hasOwnProperty.call(Shape.MARKER_CACHE, type)) {
        const cached = Shape.MARKER_CACHE[type] as MarkerCacheEntry;
        shape = cached.vertices;
        scaleFactor = cached.scaleFactor;
        switch (type) {
          case BorderMarker.Circle:
          default:
          case BorderMarker.Bullet:
          case BorderMarker.Diamond:
            if (offset) {
              bottom = 0.5;
              top = 0.5;
            }
            break;
          case BorderMarker.Line:
          case BorderMarker.LineDouble:
            bottom = 0.5;
            top = 0.5;
            break;
          case BorderMarker.Arrow:
          case BorderMarker.ArrowPointer:
            if (offset) {
              bottom = 1;
              top = 0.5;
            }
            break;
          case BorderMarker.ArrowFat:
            break;
          case BorderMarker.ArrowLine:
          case BorderMarker.ArrowLineBar:
          case BorderMarker.ArrowDoubleLine:
            bottom = 1;
            top = 0.25;
        }
      } else {
        shape = new VertexContainer();
        const add = (command: number, x?: number, y?: number) =>
          (shape as VertexContainer).addVertex(command, x as number, y as number);
        const C = Vertex.Command;
        switch (type) {
          case BorderMarker.Circle:
          default:
            add(C.Move, -1, -1);
            add(C.Curve2, 0, -2);
            add(C.Curve2, -1, -1.5519150295025124);
            add(C.Curve2, -0.5519150295025124, -2);
            add(C.Curve2, 1, -1);
            add(C.Curve2, 0.5519150295025124, -2);
            add(C.Curve2, 1, -1.5519150295025126);
            add(C.Curve2, 0, 0);
            add(C.Curve2, 1, -0.44808497049748786);
            add(C.Curve2, 0.5519150295025124, 0);
            add(C.Curve2, -1, -1);
            add(C.Curve2, -0.5519150295025121, 0);
            add(C.Curve2, -1, -0.4480849704974874);
            add(C.Close);
            if (offset) {
              bottom = 0.5;
              top = 0.5;
            }
            break;
          case BorderMarker.Bullet:
            add(C.Move, -1, -2);
            add(C.Line, 1, -2);
            add(C.Line, 1, 0);
            add(C.Line, -1, 0);
            add(C.Close);
            if (offset) {
              bottom = 0.5;
              top = 0.5;
            }
            break;
          case BorderMarker.Diamond:
            add(C.Move, -1, -1);
            add(C.Line, 0, -2);
            add(C.Line, 1, -1);
            add(C.Line, 0, 0);
            add(C.Close);
            scaleFactor = Math.cos(Math.PI / 4);
            if (offset) {
              bottom = 0.5;
              top = 0.5;
            }
            break;
          case BorderMarker.Line:
            add(C.Move, -1, 0);
            add(C.Line, 1, 0);
            bottom = 0.5;
            top = 0.5;
            break;
          case BorderMarker.LineDouble:
            add(C.Move, -2, 0);
            add(C.Line, 2, 0);
            add(C.Move, -2, -1);
            add(C.Line, 2, -1);
            bottom = 0.5;
            top = 0.5;
            break;
          case BorderMarker.Arrow:
            add(C.Move, -1, -2);
            add(C.Line, 0, 0);
            add(C.Line, 1, -2);
            add(C.Close);
            if (offset) {
              bottom = 1;
              top = 0.5;
            }
            break;
          case BorderMarker.ArrowPointer:
            add(C.Move, -1, -2);
            add(C.Line, 0, 0);
            add(C.Line, 1, -2);
            add(C.Line, 0, -1.2);
            add(C.Line, -1, -2);
            add(C.Close);
            if (offset) {
              bottom = 1;
              top = 0.5;
            }
            break;
          case BorderMarker.ArrowFat:
            add(C.Move, -2, -2);
            add(C.Line, 0, 0);
            add(C.Line, 2, -2);
            add(C.Close);
            break;
          case BorderMarker.ArrowLine:
            add(C.Move, -1, -2);
            add(C.Line, 0, 0);
            add(C.Line, 1, -2);
            bottom = 1;
            top = 0.25;
            break;
          case BorderMarker.ArrowLineBar:
            add(C.Move, -1, -2);
            add(C.Line, 0, 0);
            add(C.Line, 1, -2);
            add(C.Move, -2, 0);
            add(C.Line, 2, 0);
            bottom = 1;
            top = 0.25;
            break;
          case BorderMarker.ArrowDoubleLine:
            add(C.Move, -1, -2);
            add(C.Line, 0, 0);
            add(C.Line, 1, -2);
            add(C.Move, -1, -3);
            add(C.Line, 0, -1);
            add(C.Line, 1, -3);
            bottom = 1;
            top = 0.25;
        }
        Shape.MARKER_CACHE[type] = { scaleFactor, vertices: shape };
      }
      size = (Shape.MARKER_SIZE / 2 / scaleFactor) * borderScale * scale;
      vertices = new VertexTransformer(shape, new Transform(size, 0, 0, size, 0, 0));
    }
    let bounds = VertexInfo.calculateBounds(vertices, true) as Rect;
    if (!(cap != Canvas2DPaintCanvas.LineCap.Square && cap != Canvas2DPaintCanvas.LineCap.Round)) {
      top += 0.5;
    }
    const shift =
      -(bounds = bounds.expanded(0, width * top, 0, width * bottom)).getY() -
      bounds.getHeight() * inside;
    const angle = -Math.atan2(next.getX() - start.getX(), next.getY() - start.getY());
    const placement = new Transform(1, 0, 0, 1, 0, 0)
      .translated(0, shift)
      .rotated(Math.PI + angle)
      .translated(start.getX(), start.getY());
    return new VertexTransformer(vertices, placement);
  }

  /** Markers grow with the square root of widths of 1 and more. */
  _calculateMarkerVerticeBorderScale(width: number): number {
    return width >= 1 ? Math.sqrt(width) : width;
  }

  _paintBorderMarkers(
    context: ShapePaintContext,
    paint: PaintStyle,
    border: BorderPaintLayer,
  ): void {
    const head = this.getHeadMarkerVertices(border);
    const tail = this.getTailMarkerVertices(border);
    if (head) this._paintBorderMarker(context, head, paint, border, border.$_bhmo);
    if (tail) this._paintBorderMarker(context, tail, paint, border, border.$_btmo);
  }

  /** Offset markers and open ones are stroked, the others filled. */
  _paintBorderMarker(
    context: ShapePaintContext,
    vertices: VertexReader,
    paint: PaintStyle,
    border: BorderPaintLayer,
    offset: unknown,
  ): void {
    const closed = context.canvas.putVertices(vertices);
    if (offset || false === closed) context.canvas.strokeVertices(paint, border.$_bw);
    else context.canvas.fillVertices(paint);
  }

  override _handleChange(change: number, args?: unknown): void {
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, GeometryProperties, (name, value) =>
        "trf" === name && value ? Transform.serialize(value as Transform) : value,
      );
      this.storeProperties(blob, MetaProperties);
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, GeometryProperties, (name, value) =>
        "trf" === name && value
          ? Transform.deserialize(value as ArrayLike<number>).makeInvertible()
          : value,
      );
      this.restoreProperties(blob, MetaProperties);
    } else if (
      change == NodeChange.AfterPropertiesChange &&
      !this.isRecordedTransaction() &&
      (args as PropertiesChangeArgs).properties.indexOf("scc") >= 0 &&
      !this.isRestoring() &&
      !this.getProperty("scc")
    ) {
      // Children no longer scale with the shape: they keep their place.
      for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
        if (child.hasMixin(Anchor)) {
          const anchored = child as Node & PropertiesNode;
          if (!anchored.getProperty("vacr")) anchored.setProperty("vacr", Anchor.AnchorType.Start);
          if (!anchored.getProperty("hacr")) anchored.setProperty("hacr", Anchor.AnchorType.Start);
        }
      }
    }
    super._handleChange(change, args);
  }

  override _invalidateGeometryForChildUpdate(geometryChanged: unknown): void {
    if (geometryChanged) {
      this._childrenPaintBBox = null;
      this._collidesWithChildren = undefined;
      this._collidesWithChildrenSeparate = undefined;
    }
  }

  override _invalidatePaintBoxForChildUpdate(): void {
    this._childrenPaintBBox = null;
    this._collidesWithChildren = undefined;
    this._collidesWithChildrenSeparate = undefined;
  }

  /**
   * Inside a fake container (compound shape), a change of this shape's
   * effects is copied to the container's effects.
   */
  override _styleFinishGeometryChange(source?: unknown): void {
    super._styleFinishGeometryChange(source);
    if (!source) return;
    let container: Shape | null = null;
    const parent = this.getParent();
    if (parent instanceof Shape && parent.isFakeContainer()) container = parent;
    if (!container) return;
    const owner = container;
    const ownEffects = this.getEffects() as Effects;
    const ownerEffects = owner.getEffects() as Effects;
    const changed: Node[] = [];
    let geometryChanged = false;
    const propertyChanges = [NodeChange.BeforePropertiesChange, NodeChange.AfterPropertiesChange];
    const childChanges = [
      NodeChange.BeforeChildRemove,
      NodeChange.AfterChildRemove,
      NodeChange.BeforeChildInsert,
      NodeChange.AfterChildInsert,
    ];
    this._beginBlockChanges(propertyChanges);
    ownerEffects._beginBlockChanges(childChanges);
    try {
      let index = 0;
      for (let effect = ownEffects.getFirstChild(); null !== effect; effect = effect.getNext()) {
        const counterpart = ownerEffects.getChildByIndex(index) as Effect | null;
        const own = effect as Effect;
        if (counterpart) {
          const effectClass = own.constructor as unknown as EffectClassStatics;
          if (effectClass.equals(counterpart, own)) {
            const sets: Readonly<Record<string, unknown>>[] = [Effect.GeometryProperties];
            if (effectClass.GeometryProperties) sets.push(effectClass.GeometryProperties);
            if (effectClass.VisualProperties) sets.push(effectClass.VisualProperties);
            if (sets) {
              outer: for (let i = 0; i < sets.length; i++) {
                const set = sets[i] as Readonly<Record<string, unknown>>;
                for (const key in set) {
                  // Quirk: the default value is used as the property name,
                  // and the owner shape (not its effect) is compared.
                  const mine = own.getProperty(set[key] as string);
                  const theirs = (owner as PropertiesNode).getProperty(set[key] as string);
                  if (equals(mine, theirs, true)) {
                    changed.push(counterpart);
                    counterpart._beginBlockChanges(propertyChanges);
                    counterpart.transferProperties(own, sets, true);
                    counterpart._endBlockChanges(propertyChanges);
                    break outer;
                  }
                }
              }
            }
          } else {
            if (!geometryChanged) {
              owner._notifyChange(ElementChange.PrepareGeometryUpdate);
              geometryChanged = true;
            }
            ownerEffects.insertChild(own.clone() as Node, counterpart);
            ownerEffects.removeChild(counterpart);
          }
        } else {
          ownerEffects.insertChild(own.clone() as Node, undefined);
          changed.push(ownerEffects.getLastChild() as Node);
        }
        index++;
      }
      // Quirk: the loop steps to the container's sibling, so it removes one effect at most.
      for (
        let extra = ownerEffects.getChildByIndex(index);
        null !== extra;
        extra = ownerEffects.getNext()
      ) {
        if (!geometryChanged) {
          owner._notifyChange(ElementChange.PrepareGeometryUpdate);
          geometryChanged = true;
        }
        ownerEffects.removeChild(extra);
      }
    } finally {
      ownerEffects._endBlockChanges(childChanges);
      if (geometryChanged) {
        owner._resetFxCacheAndState();
        owner._notifyChange(ElementChange.FinishGeometryUpdate, 1);
      } else if (changed.length) {
        for (let i = 0; i < changed.length; i++) {
          owner._resetFxCacheAndState(changed[i] as Effect, true);
        }
        owner._notifyChange(ElementChange.FinishGeometryUpdate, 1);
      }
    }
    this._endBlockChanges(propertyChanges);
  }

  /** Inside a fake container, changed style properties are copied to the container. */
  override _stylePropertiesUpdated(names: string[], values: unknown[]): void {
    let container: Shape | null = null;
    const parent = this.getParent();
    if (parent instanceof Shape && parent.isFakeContainer()) container = parent;
    if (!container) return;
    const current = this.getProperties(names);
    const changedNames: string[] = [];
    const changedValues: unknown[] = [];
    for (let i = 0; i < names.length; i++) {
      if (!equals(values[i], current[i])) {
        changedNames.push(names[i] as string);
        changedValues.push(current[i]);
      }
    }
    if (changedNames.length) {
      const changes = [NodeChange.BeforePropertiesChange, NodeChange.AfterPropertiesChange];
      this._beginBlockChanges(changes);
      container.setProperties(changedNames, changedValues);
      this._endBlockChanges(changes);
    }
  }

  /** The vertex sources a hit test looks at (sub-paths of compound paths near the point). */
  _getVertexHitCandidates(
    location: Point,
    transform: Transform | null | undefined,
    tolerance: number,
  ): VertexReader[] {
    void location;
    void transform;
    void tolerance;
    return [this];
  }

  /**
   * Hits the border (by the widest border plus the tolerance), then the
   * fill (or the area when forced), then the outline with a tolerance,
   * then the label.
   */
  override _detailHitTest(
    location: Point,
    transform?: Transform | null,
    tolerance?: number,
    force?: unknown,
    options?: unknown,
  ): ElementData<Element, unknown> | null {
    void options;
    const view = transform as Transform;
    const width = tolerance as number;
    let candidates: VertexReader[] | undefined;
    let result: HitResult;
    if (this.hasStyleBorder()) {
      let borderWidth = 0;
      each((this.getPaintLayers() as PaintLayers).getBorderLayers(true), (_index, border) => {
        borderWidth = Math.max(borderWidth, border.$_bw);
      });
      const reach = borderWidth * view.getScaleFactor() + 2 * width;
      result = new HitResult();
      candidates = this._getVertexHitCandidates(location, view, width);
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i] as VertexReader;
        if (
          VertexInfo.hitTest(
            location.getX(),
            location.getY(),
            new VertexTransformer(candidate, view),
            reach,
            false,
            result,
          )
        ) {
          return new ElementData(
            candidate as unknown as Element,
            new ShapeHitResult(HitType.Stroke, result),
          );
        }
      }
    }
    if (this.hasStyleFill() || force) {
      result = new HitResult();
      let point = location;
      let pointTransform: Transform | null | undefined = transform;
      if (transform && transform.invertible()) {
        pointTransform = null;
        point = (transform.inverted() as Transform).mapPoint(location);
      }
      candidates = candidates || this._getVertexHitCandidates(location, view, width);
      if (this._hitInside(point, pointTransform, result, candidates)) {
        return new ElementData<Element, unknown>(
          this,
          new ShapeHitResult(this.hasStyleFill() ? HitType.Fill : HitType.Other, result),
        );
      }
    }
    if (width) {
      candidates = candidates || this._getVertexHitCandidates(location, view, width);
      result = new HitResult();
      for (let i = 0; i < candidates.length; i++) {
        if (
          VertexInfo.hitTest(
            location.getX(),
            location.getY(),
            new VertexTransformer(candidates[i] as VertexReader, view),
            view.getScaleFactor() + 2 * width,
            false,
            result,
          )
        ) {
          return new ElementData<Element, unknown>(
            this,
            new ShapeHitResult(HitType.Outline, result),
          );
        }
      }
    }
    // The old code passes the transform where the label test expects the location; kept.
    return this.hasMixin(LabelHolder)
      ? ((this as unknown as LabelHolderApi)._hitTestLabel(
          view as unknown as Point,
          width,
        ) as ElementData<Element, unknown> | null)
      : null;
  }

  /** Whether `point` is inside one of `candidates` (not just on its outline). */
  _hitInside(
    point: Point,
    transform: Transform | null | undefined,
    result: HitResult,
    candidates?: VertexReader[] | null,
  ): boolean {
    candidates = candidates || [this];
    for (let i = 0; i < candidates.length; i++) {
      const source = transform
        ? new VertexTransformer(candidates[i] as VertexReader, transform)
        : (candidates[i] as VertexReader);
      if (VertexInfo.hitTest(point.getX(), point.getY(), source, 0, true, result)) {
        if (!result.outline) return true;
        result.x = null;
        result.y = null;
        result.slope = null;
        result.outline = null;
        result.segment = null;
      }
    }
    return false;
  }

  override toString(): string {
    return "[GShape]";
  }
}

/** The statics of an effect class that the fake container sync reads. */
interface EffectClassStatics {
  equals(a: Effect, b: Effect): boolean;
  GeometryProperties?: Readonly<Record<string, unknown>>;
  VisualProperties?: Readonly<Record<string, unknown>>;
}

Shape.prototype._paintSharp = false;
