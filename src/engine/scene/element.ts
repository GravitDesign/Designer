// Old: chunk.vendor.js module 22 (GElement).
/**
 * A node that has geometry and paints: bounding boxes (cached, reset
 * through the change codes 210-260), hit testing, collisions, painting and
 * rendering to a bitmap.
 *
 * Geometry updates run in brackets: PrepareGeometryUpdate saves the old
 * boxes and sends GeometryChangeEvent.Before; FinishGeometryUpdate drops
 * the caches, tells the parent (ChildGeometryUpdate or ChildVisualUpdate,
 * which travel up the tree), sends GeometryChangeEvent.After, invalidates
 * the old and the new paint area and reports GeometrySizeChanged when the
 * size changed (layouts react to that). `beginUpdate`/`endUpdate` hold the
 * bracket open over several changes.
 *
 * The element mixins live in element-*.ts and hang off this class as in
 * the old code: Element.Transform, .Layout, .Anchor, .Accelerated and
 * .Stylable (the last one from engine/style, see style-hooks.ts).
 */
import { Event } from "../core/event.ts";
import { registerClass } from "../core/object.ts";
import { containsObjectKey, extend } from "../core/util.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import { VertexSource } from "../geometry/vertex-source.ts";
import { VertexTransformer } from "../geometry/vertex-transformer.ts";
import { QuadTree } from "../geometry/quadtree.ts";
import { GMath } from "../math/math.ts";
import { Length } from "../math/length.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { Bitmap } from "../paint/bitmap.ts";
import type { ElementData } from "../paint/element-data.ts";
import { PaintCanvas, type PaintStyle } from "../paint/paint-canvas.ts";
import { PaintContext } from "../paint/paint-context.ts";
import { ScenePaintConfiguration } from "../paint/scene-paint-configuration.ts";
import type { VertexReader } from "../geometry/vertex-source.ts";
import { Accelerated, type AcceleratedApi } from "./element-accelerated.ts";
import { Anchor } from "./element-anchor.ts";
import { bindElementClass, CollisionFlag, ElementChange, ElementFlag } from "./element-change.ts";
import { settleElementIndices } from "./element-index.ts";
import { Layout, type LayoutApi } from "./element-layout.ts";
import { Transform as TransformMixin } from "./element-transform.ts";
import { NodeChange, NodeFlag } from "./node-change.ts";
import { hasContainer, type ContainerNode } from "./node-container.ts";
import type { PropertiesChangeArgs, PropertyDefaults } from "./node-properties.ts";
import { Node } from "./node.ts";
import { SceneNode } from "./scene-node.ts";
import {
  isElementStylable,
  isStylable,
  styleMixins,
  type ElementStylableHooks,
} from "./style-hooks.ts";

/** A hit: the element and what the element's own hit test found. */
export type ElementHit = ElementData<Element, unknown>;

/** Called with every candidate of a collision search. */
export type CollisionCollector = (element: Element) => void;

/** GElement.GeometryChangeEvent: Before/After a geometry update, or a child's (Child). */
export class GeometryChangeEvent extends Event {
  static {
    registerClass(this, "GElement.GeometryChangeEvent");
  }

  static Type = {
    Before: 0,
    After: 1,
    Child: 2,
  } as const;

  declare element: Element | null;
  declare type: number | null;

  constructor(element: Element, type: number) {
    super();
    this.element = element;
    this.type = type;
  }

  override toString(): string {
    return "[Event GElement.GeometryChangeEvent]";
  }
}
(GeometryChangeEvent.prototype as unknown as Record<string, unknown>)["element"] = null;
(GeometryChangeEvent.prototype as unknown as Record<string, unknown>)["type"] = null;

const UPDATE_CHANGES = [
  ElementChange.InvalidationRequested,
  ElementChange.InvalidationRequest,
  ElementChange.PrepareGeometryUpdate,
  ElementChange.FinishGeometryUpdate,
  ElementChange.ChildGeometryUpdate,
  ElementChange.ChildVisualUpdate,
];

export class Element extends SceneNode {
  static {
    registerClass(this, "GElement");
  }

  // Only the element's own entries, as in the old code; code uses the
  // constants from node-change.ts and element-change.ts.
  static override Flag: Readonly<Record<string, number>> = ElementFlag;
  static CollisionFlag = CollisionFlag;
  static override _Change: Readonly<Record<string, number>> = ElementChange;
  static GeometryChangeEvent = GeometryChangeEvent;

  static Transform = TransformMixin;
  static Layout = Layout;
  static Anchor = Anchor;
  static Accelerated = Accelerated;
  /** GElement.Stylable, set by engine-style through registerStyleMixins (null before). */
  static Stylable: unknown = null;

  declare _sourceBBox: Rect | null;
  declare _geometryBBox: Rect | null;
  declare _preTransformRect: Rect | null;
  declare _preTransformRectTrf: Transform | null | undefined;
  declare _paintBBox: Rect | null;
  declare _childrenPaintBBox: Rect | null;
  declare _collidesWithChildren: unknown;
  declare _collidesWithChildrenSeparate: unknown;
  declare _savedPaintBBox: Rect | null;
  declare _savedGeometryBBox: Rect | null;
  /** Set while a parent moves this element along (transform, layout). */
  declare dependentUpdate: boolean;
  declare _geometryQTreeElement: unknown;
  declare _paintQTreeElement: unknown;
  declare _containingGeometryQTreeElement: InstanceType<typeof QuadTree.Element> | null;
  declare _containingPaintQTreeElement: InstanceType<typeof QuadTree.Element> | null;
  /** Position among the element siblings, kept by an Accelerated parent. */
  declare _elementIndex: number;
  declare _updateCounter: number | undefined;
  /** Saved/blended as "m" (mask) and so on; a GElement.Stylable property. */
  declare $_sbl: unknown;
  declare $trf: unknown;

  constructor() {
    super();
    if (isElementStylable(this)) this._setStyleDefaultProperties();
  }

  getElementIndex(): number {
    settleElementIndices(this._parent);
    return this._elementIndex;
  }

  /** An extra box hit tests and collisions count as part of the element. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the argument
  getCustomCollisionBBox(includeInvisible?: unknown): Rect | null {
    return null;
  }

  /** The untransformed bounds; null when hidden (unless `includeInvisible`, which skips the cache). */
  getSourceBBox(includeInvisible?: unknown): Rect | null {
    if (!includeInvisible && !this.isVisible()) return null;
    if (includeInvisible) return this._calculateSourceBBox(true);
    if (null == this._sourceBBox) this._sourceBBox = this._calculateSourceBBox();
    return this._sourceBBox;
  }

  getGeometryBBox(includeInvisible?: unknown): Rect | null {
    if (!includeInvisible && !this.isVisible()) return null;
    if (includeInvisible) return this._calculateGeometryBBox(includeInvisible);
    if (null == this._geometryBBox) this._geometryBBox = this._calculateGeometryBBox();
    return this._geometryBBox;
  }

  /** The bounds in the coordinate system of `transform` (cached for the last one). */
  getPreTransformRect(transform: Transform | null | undefined): Rect | null {
    if (!this.isVisible()) return null;
    if (null == this._preTransformRect || !Transform.equals(transform, this._preTransformRectTrf)) {
      this._preTransformRect = this._calculatePreTransformRect(transform);
      this._preTransformRectTrf = transform;
    }
    return this._preTransformRect;
  }

  getGroupGeometryBBox(elements: readonly unknown[] | null | undefined): Rect | null {
    let bbox: Rect | null = null;
    if (elements && elements.length) {
      for (let i = 0; i < elements.length; ++i) {
        const element = elements[i];
        if (element instanceof Element) {
          const box = element.getGeometryBBox();
          if (box) bbox = bbox ? bbox.united(box) : box;
        }
      }
    }
    return bbox;
  }

  getChildrenGeometryBBox(includeInvisible?: unknown): Rect | null {
    if (!includeInvisible && !this.isVisible()) return null;
    if (hasContainer(this)) {
      let bbox: Rect | null = null;
      for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
        if (child instanceof Element) {
          const box = child.getGeometryBBox(includeInvisible);
          if (box) bbox = bbox ? bbox.united(box) : box;
        }
      }
      return bbox || null;
    }
    return null;
  }

  /**
   * The area painting touches; null when hidden. `arg` is passed to
   * `_calculatePaintBBox` (pages read it); `includeInvisible` skips the
   * visibility check and the cache.
   */
  getPaintBBox(multiPageView?: unknown, arg?: unknown, includeInvisible?: unknown): Rect | null {
    if (!includeInvisible && !this.isVisible()) return null;
    if (includeInvisible) return this._calculatePaintBBox(arg, includeInvisible);
    if (null == this._paintBBox) this._paintBBox = this._calculatePaintBBox(arg);
    return this._paintBBox;
  }

  _calculateChildrenPaintBBox(
    unused?: unknown,
    arg?: unknown,
    includeInvisible?: unknown,
  ): Rect | null {
    if (!includeInvisible && !this.isVisible()) return null;
    if (hasContainer(this)) {
      let bbox: Rect | null = null;
      for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
        if (child instanceof Element) {
          let box = child.getPaintBBox(null, null, includeInvisible);
          const custom = child.getCustomCollisionBBox(includeInvisible);
          if (custom) box = (box && box.united(custom)) || custom;
          if (box && (box.getHeight() > 0 || box.getWidth() > 0)) {
            bbox = bbox ? bbox.united(box) : box;
          }
        }
      }
      return bbox || new Rect(0, 0, 0, 0);
    }
    return null;
  }

  getChildrenPaintBBox(unused?: unknown, arg?: unknown, includeInvisible?: unknown): Rect | null {
    if (includeInvisible) return this._calculateChildrenPaintBBox(unused, arg, includeInvisible);
    if (null == this._childrenPaintBBox) {
      this._childrenPaintBBox = this._calculateChildrenPaintBBox(unused, arg, includeInvisible);
    }
    return this._childrenPaintBBox;
  }

  /** The rotation of the element, if it has one. */
  getAngle(): number | null {
    return null;
  }

  isVisible(): boolean {
    return 0 == (this._flags & ElementFlag.Hidden);
  }

  /**
   * The elements under `location`, topmost first, or null.
   *
   * - `transform` maps element coordinates to the coordinates of `location`.
   * - `acceptor` decides whether an element's own hit test runs (true).
   * - `stacked` collects every hit instead of returning the first.
   * - `level` limits how deep into children it goes (-1 or not a number:
   *   no limit; 0: not into children).
   * - `tolerance` widens the test.
   * - `force` and `options` are passed to `_detailHitTest`.
   * - `filter` returning false skips an element and its children.
   * - `preferSelected` (with no level limit) moves hits inside selected
   *   elements to the front.
   */
  hitTest(
    location: Point,
    transform?: Transform | null,
    acceptor?: ((element: Element) => unknown) | null,
    stacked?: boolean,
    level?: number | null,
    tolerance?: number | null,
    force?: unknown,
    filter?: ((element: Element) => unknown) | null,
    options?: unknown,
    preferSelected?: boolean,
  ): ElementHit[] | null {
    const depth = "number" != typeof level ? -1 : level;
    const width = tolerance || 0;
    if (filter && false === filter(this)) return null;
    let area = this.getPaintBBox();
    const custom = this.getCustomCollisionBBox();
    if (custom) area = (area && area.united(custom)) || custom;
    if (!area || area.isEmpty()) return null;
    if (transform) area = transform.mapRect(area);
    if (!area.expanded(width, width, width, width).containsPoint(location)) return null;
    let hits: ElementHit[] | null = null;
    if (0 !== depth && hasContainer(this)) {
      if (this.hasMixin(Accelerated)) {
        const local = transform ? (transform.inverted() as Transform).mapPoint(location) : location;
        const probe = new Rect(local.getX() - width / 2, local.getY() - width / 2, width, width);
        const candidates = (this as unknown as AcceleratedApi).retrieveChildrenInPaintBBox(
          probe,
          QuadTree.RETRIEVE_MODE_INTERSECT,
        );
        if (candidates) {
          settleElementIndices(this);
          candidates.sort((a, b) => b._elementIndex - a._elementIndex);
          for (let i = 0; i < candidates.length; i++) {
            const childHits = (candidates[i] as Element).hitTest(
              location,
              transform,
              acceptor,
              stacked,
              depth - 1,
              width,
              force,
              filter,
              options,
              preferSelected,
            );
            if (childHits) {
              if (!stacked) return childHits;
              if (hits) Array.prototype.push.apply(hits, childHits);
              else hits = childHits;
            }
          }
        }
      } else {
        for (let child = this.getLastChild(); null != child; child = child.getPrevious()) {
          if (child instanceof Element) {
            const childHits = child.hitTest(
              location,
              transform,
              acceptor,
              stacked,
              depth - 1,
              width,
              force,
              filter,
              options,
              preferSelected,
            );
            if (childHits) {
              if (!stacked) return childHits;
              if (hits) Array.prototype.push.apply(hits, childHits);
              else hits = childHits;
            }
          }
        }
      }
    }
    if ((acceptor && 1 == (acceptor(this) as number)) || !acceptor) {
      const own = this._detailHitTest(location, transform, width, force, options, false);
      if (own) {
        if (stacked && hits) hits.push(own);
        else hits = [own];
      }
    }
    if (preferSelected && -1 === depth && hits) {
      const count = hits.length;
      for (let i = count - 1, steps = 0; i >= 0 && steps < count; i--, steps++) {
        for (let node: Node = (hits[i] as ElementHit).element; node.getParent();) {
          if (node.hasFlag(NodeFlag.Selected)) {
            hits.unshift(hits[i] as ElementHit);
            hits.splice(++i, 1);
            break;
          }
          node = node.getParent() as ContainerNode;
        }
      }
    }
    return hits;
  }

  /**
   * The elements that collide with `area` (a vertex source) by `flags`
   * (CollisionFlag): geometry or paint box, partly or fully inside.
   * `acceptor` decides which candidates are collected, `filter` returning
   * false skips an element (and its children), `childrenFilter` whether to
   * go into an element's children.
   */
  getCollisions(
    area: VertexReader,
    flags: number,
    acceptor?: ((element: Element) => unknown) | null,
    filter?: ((element: Element) => unknown) | null,
    childrenFilter?: ((element: Element) => unknown) | null,
    collector?: CollisionCollector | null,
    bounds?: Rect | null,
  ): Element[] {
    const result: Element[] = [];
    const collect: CollisionCollector =
      collector ||
      ((element) => {
        if ((acceptor && 1 == (acceptor(element) as number)) || !acceptor) result.push(element);
      });
    const areaBounds = bounds || (VertexInfo.calculateBounds(area, true) as Rect);
    if (!this._checkElementCollision(area, flags, filter, collect, areaBounds)) return result;
    if (hasContainer(this) && (!childrenFilter || childrenFilter(this))) {
      if (this.hasMixin(Accelerated)) {
        const byPaint = flags & CollisionFlag.PaintBBox;
        const mode =
          0 != (flags & CollisionFlag.Partial)
            ? QuadTree.RETRIEVE_MODE_INTERSECT
            : QuadTree.RETRIEVE_MODE_FULLYCONTAINED;
        const accelerated = this as unknown as AcceleratedApi;
        const candidates = byPaint
          ? accelerated.retrieveChildrenInPaintBBox(areaBounds, mode)
          : accelerated.retrieveChildrenInGeometryBBox(areaBounds, mode);
        if (candidates) {
          candidates.forEach((child) => {
            child.getCollisions(area, flags, acceptor, filter, childrenFilter, collect, areaBounds);
          });
        }
      } else {
        for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
          if (child instanceof Element) {
            child.getCollisions(area, flags, acceptor, filter, childrenFilter, collect, areaBounds);
          }
        }
      }
    }
    return result;
  }

  /** Collects this element when it collides; false stops the search below it. */
  _checkElementCollision(
    area: VertexReader,
    flags: number,
    filter: ((element: Element) => unknown) | null | undefined,
    collect: CollisionCollector,
    bounds: Rect,
  ): boolean {
    if (0 != (flags & CollisionFlag.GeometryBBox) || 0 != (flags & CollisionFlag.PaintBBox)) {
      if (filter && false === filter(this)) return false;
      let box =
        0 != (flags & CollisionFlag.PaintBBox) ? this.getPaintBBox() : this.getGeometryBBox();
      const custom = this.getCustomCollisionBBox();
      if (custom) box = (box && box.united(custom)) || custom;
      if (box) {
        if (0 != (flags & CollisionFlag.Partial)) {
          this._checkPartialCollision(bounds, box, area, true, flags, collect);
        } else if (bounds.containsRect(box, true)) collect(this);
      }
    }
    return true;
  }

  _checkPartialCollision(
    bounds: Rect,
    box: Rect,

    area: VertexReader,
    inclusive: boolean,

    flags: number,
    collect: CollisionCollector,
  ): void {
    if (bounds.intersectsRect(box, inclusive)) collect(this);
  }

  isFullUnderCollision(area: VertexReader): boolean {
    let full = false;
    const box = this.getPaintBBox();
    if (box) full = (VertexInfo.calculateBounds(area, true) as Rect).containsRect(box, true);
    return full;
  }

  /**
   * Opens a geometry update bracket (counted). With `visualOnly`, the
   * closing endUpdate keeps the geometry caches.
   */
  override beginUpdate(visualOnly?: unknown): void {
    if (this._updateCounter) this._updateCounter++;
    else {
      this._updateCounter = 1;
      this._notifyChange(ElementChange.PrepareGeometryUpdate);
      this._blockUpdateChanges([true, !!visualOnly]);
    }
  }

  override endUpdate(visualOnly?: unknown): void {
    if (null != this._updateCounter && 0 == --this._updateCounter) {
      this._releaseUpdateChanges([true, !!visualOnly]);
      this._notifyChange(ElementChange.FinishGeometryUpdate, visualOnly ? -1 : 0);
      delete this._updateCounter;
      if (this.hasMixin(Accelerated)) (this as unknown as AcceleratedApi)._updateQTree();
    }
  }

  /**
   * Whether painting this element would draw anything (in `context`, when
   * given: inside its dirty areas and clip area). Without a context:
   * whether it is in a scene and has a parent.
   */
  isPaintable(context?: PaintContext | null, arg?: unknown): boolean {
    if (!this.isVisible()) return false;
    if (this.hasFlag(ElementFlag.NoPaint)) return false;
    if (!context) return (!!this._scene && !!this.getParent()) || "scene" === Node.getName(this);
    const configuration = context.configuration as ScenePaintConfiguration | null;
    const box = this.getPaintBBox((configuration as ScenePaintConfiguration).multiPageView, arg);
    if (null == box || box.isEmpty()) return false;
    if ("m" === this.$_sbl) return true;
    if (context) {
      if (context.dirtyMatcher && !context.dirtyMatcher.isDirty(box)) return false;
      const clipArea = configuration && (configuration.clipArea as Rect | null);
      if (configuration && clipArea && !clipArea.intersectsRect(box)) return false;
    }
    return true;
  }

  paint(context: PaintContext, arg?: unknown): void {
    if (this._preparePaint(context, arg)) {
      this._paint(context, arg);
      this._finishPaint(context);
    }
  }

  /**
   * Renders the element into a bitmap.
   *
   * - `width`/`height`: a scale factor, or a Length the area is scaled to.
   * - `mode` when the two scales differ: 0 fit (smaller scale), 1 fill
   *   (larger scale), 2 fit and center.
   * - `background` (with `backgroundOpacity`) fills the canvas first.
   * - `configuration`: overrides for the paint configuration.
   * - `dpi` scales by dpi/72 and is written into the bitmap.
   * - `area`: what to render (default: the paint box).
   * - `persistent`: false for a throwaway canvas.
   */
  toBitmap(
    width?: number | Length | null,
    height?: number | Length | null,
    mode?: number | null,
    background?: PaintStyle | null,
    configuration?: Record<string, unknown> | null,
    dpi?: number | null,
    backgroundOpacity?: number | null,
    area?: Rect | null,
    persistent?: boolean,
  ): Bitmap | null {
    const paintArea = area || this._getBitmapPaintArea();
    const fitMode = mode || 0;
    let scaleX = 1;
    let scaleY = 1;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    if (width) {
      if ("number" == typeof width) scaleX = width;
      else if (width instanceof Length) scaleX = width.toPoint() / paintArea.getWidth();
    }
    if (height) {
      if ("number" == typeof height) scaleY = height;
      else if (height instanceof Length) scaleY = height.toPoint() / paintArea.getHeight();
    }
    if (dpi) {
      const dpiScale = dpi / Length.DPI;
      scaleX *= dpiScale;
      scaleY *= dpiScale;
    }
    let canvasWidth = Math.round(paintArea.getWidth() * scaleX);
    let canvasHeight = Math.round(paintArea.getHeight() * scaleY);
    if (scaleX !== scaleY) {
      switch (fitMode) {
        case 0:
          if (scaleX < scaleY) {
            scale = scaleX;
            canvasHeight = Math.round(paintArea.getHeight() * scale);
          } else {
            scale = scaleY;
            canvasWidth = Math.round(paintArea.getWidth() * scale);
          }
          break;
        case 1:
          if (scaleX > scaleY) {
            scale = scaleX;
            canvasHeight = Math.round(paintArea.getHeight() * scale);
          } else {
            scale = scaleY;
            canvasWidth = Math.round(paintArea.getWidth() * scale);
          }
          break;
        case 2:
          if (scaleX < scaleY) {
            scale = scaleX;
            offsetY = (canvasHeight - paintArea.getHeight() * scale) / 2;
          } else {
            scale = scaleY;
            offsetX = (canvasWidth - paintArea.getWidth() * scale) / 2;
          }
      }
    } else scale = scaleX;
    const canvas = new PaintCanvas(undefined, undefined, false !== persistent || persistent);
    canvas.resize(canvasWidth, canvasHeight);
    const context = new PaintContext();
    context.canvas = canvas;
    let bitmap: Bitmap | null;
    const paintConfiguration = new ScenePaintConfiguration();
    paintConfiguration.paintMode = ScenePaintConfiguration.PaintMode.Full;
    paintConfiguration.paintSharp = false;
    paintConfiguration.annotations = false;
    context.configuration = paintConfiguration;
    paintConfiguration.clipArea = paintArea;
    paintConfiguration.clipDirty = false;
    paintConfiguration.enableFxCache = false;
    paintConfiguration.defaultEffectDetailLevel = 1;
    if (configuration) extend(paintConfiguration, configuration);
    canvas.prepare();
    if (background) canvas.fillCanvas(background, backgroundOpacity);
    canvas.setOrigin(
      new Point(paintArea.getX() * scale - offsetX, paintArea.getY() * scale - offsetY),
    );
    canvas.setScale(scale);
    try {
      bitmap = this._paintToBitmap(context);
      if (bitmap && dpi) bitmap.setDPI(dpi);
    } finally {
      canvas.finish();
    }
    return bitmap;
  }

  override assignFrom(other: Node): void {
    super.assignFrom(other);
    if (isElementStylable(this) && isElementStylable(other)) this.$sref = other.$sref;
    if (isStylable(this) && isStylable(other)) this.assignStyleFrom(other);
  }

  /** Snap points for the editor; none by default. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  findPivots(arg1?: unknown, arg2?: unknown): unknown[] | null {
    return null;
  }

  _getBitmapPaintArea(): Rect {
    return this.getPaintBBox() || new Rect(0, 0, 0, 0);
  }

  getSelfCanvasUsedArea(): Rect {
    return this._getBitmapPaintArea();
  }

  _paintToBitmap(context: PaintContext): Bitmap | null {
    this.paint(context);
    return (context.canvas as PaintCanvas).getBitmap();
  }

  _paint(context: PaintContext, arg?: unknown): void {
    if (isElementStylable(this)) {
      this._paintStyle(context, this.getPaintBBox(null, arg, context.isIncludingInvisible()));
    } else this._paintChildren(context, arg);
  }

  _preparePaint(context: PaintContext, arg?: unknown): boolean {
    if (isElementStylable(this)) {
      (context.getRootCanvas() as PaintCanvas).setMasked("m" === this.$_sbl || "!m" === this.$_sbl);
    }
    return (
      !this.hasFlag(ElementFlag.NoPaint) &&
      !!(this.isPaintable(context, arg) || (context && context.isIncludingInvisible()))
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the argument
  _finishPaint(context: PaintContext): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  _paintChildren(context: PaintContext, arg?: unknown): void {
    if (hasContainer(this)) {
      for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
        if (child instanceof Element) child.paint(context);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the argument
  _calculateSourceBBox(includeInvisible?: unknown): Rect | null {
    return null;
  }

  _calculateGeometryBBox(includeInvisible?: unknown): Rect | null {
    return this.getChildrenGeometryBBox(includeInvisible);
  }

  _calculatePaintBBox(arg?: unknown, includeInvisible?: unknown): Rect | null {
    return this._calculateChildrenPaintBBox(null, arg, includeInvisible);
  }

  _calculatePreTransformRect(transform: Transform | null | undefined): Rect | null {
    let rect: Rect | null;
    if (transform && transform.invertible()) {
      if (this.hasMixin(VertexSource)) {
        const source = new VertexTransformer(
          this as unknown as VertexReader,
          transform.inverted() as Transform,
        );
        rect = VertexInfo.calculateBounds(source, true);
      } else {
        rect = this.getGeometryBBox();
        if (rect) {
          const corners = (transform.inverted() as Transform).mapQuadrilateral(rect);
          rect = Rect.fromPoints(...corners);
        } else rect = null;
      }
    } else rect = this.getGeometryBBox();
    return rect;
  }

  _detailHitTest(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the arguments
    location: Point,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the arguments
    transform?: Transform | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the arguments
    tolerance?: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the arguments
    force?: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the arguments
    options?: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the arguments
    extra?: unknown,
  ): ElementHit | null {
    return null;
  }

  _beforeVisibilityUpdate(): void {}

  _afterVisibilityUpdate(): void {}

  override _blockUpdateChanges(arg?: unknown): void {
    this._beginBlockChanges(UPDATE_CHANGES, arg);
  }

  override _releaseUpdateChanges(arg?: unknown): void {
    this._endBlockChanges(UPDATE_CHANGES, arg);
  }

  _requestInvalidateNode(element: Element): void {
    if (element.isPaintable()) {
      const box = element.getPaintBBox();
      if (box) this._requestInvalidationArea(box);
    }
  }

  _requestInvalidationArea(area: Rect): void {
    if (this._scene) {
      this._scene._invalidateArea(area, this);
      this._handleChange(ElementChange.InvalidationRequested, area);
    }
  }

  _requestInvalidation(): void {
    this._requestInvalidateNode(this);
  }

  _invalidateOldPaintBBox(): void {
    if (this._savedPaintBBox && !this._savedPaintBBox.isEmpty()) {
      this._requestInvalidationArea(this._savedPaintBBox);
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change == ElementChange.InvalidationRequest) {
      if (this.isPaintable()) this._requestInvalidation();
    } else if (change === ElementChange.InvalidationRequested) {
      const parent = this.getParent();
      if (parent) parent._notifyChange(ElementChange.InvalidationRequested, args);
    } else if (change == ElementChange.PrepareGeometryUpdate) {
      if (this._canEventBeSent(GeometryChangeEvent)) {
        this._sendEvent(new GeometryChangeEvent(this, GeometryChangeEvent.Type.Before));
      }
      this._savedGeometryBBox = this.getGeometryBBox();
      this._savedPaintBBox =
        (this.isPaintable() && this.isVisible() && this.getPaintBBox()) || null;
    } else if (change == ElementChange.FinishGeometryUpdate) {
      this._finishGeometryUpdate(args);
    } else if (change == ElementChange.ChildGeometryUpdate) {
      const childArgs = args as [Element, unknown, unknown?];
      this._invalidateGeometryForChildUpdate(childArgs[1]);
      this._invalidateForAffectingEffects();
      if (this._canEventBeSent(GeometryChangeEvent)) {
        this._sendEvent(new GeometryChangeEvent(this, GeometryChangeEvent.Type.Child));
      }
      const parent = this.getParent();
      if (parent) parent._notifyChange(change, args);
    } else if (change == ElementChange.ChildVisualUpdate) {
      this._invalidatePaintBoxForChildUpdate();
      this._invalidateForAffectingEffects();
      const parent = this.getParent();
      if (parent) parent._notifyChange(change, args);
    } else if (change == NodeChange.AfterChildInsert) {
      if (args instanceof Element) {
        this._notifyChange(ElementChange.ChildGeometryUpdate, [args, 1]);
        args._handleChange(ElementChange.InvalidationRequest);
      }
    } else if (change == NodeChange.BeforeChildRemove) {
      if (args instanceof Element) this._requestInvalidateNode(args);
    } else if (change == NodeChange.AfterChildRemove) {
      if (args instanceof Element) this._notifyChange(ElementChange.ChildGeometryUpdate, [args, 1]);
    } else if (change == NodeChange.AfterFlagChange) {
      switch ((args as { flag: number }).flag) {
        case ElementFlag.NoPaint:
          this._requestInvalidation();
      }
    }
    if (this.hasMixin(Layout)) (this as unknown as LayoutApi)._handleLayoutChange(change, args);
    if (isElementStylable(this)) this._handleStyleChange(change, args);
    if (this.hasMixin(Accelerated)) {
      (this as unknown as AcceleratedApi)._handleChildrenStructureChange(change, args);
    }
    super._handleChange(change, args);
  }

  /**
   * FinishGeometryUpdate. `args` is the update kind (0 geometry, 1 visual
   * only, 2 geometry without invalidating, -1 from endUpdate(true): keep
   * the caches), optionally as `[kind, extra]` where `extra` goes to the
   * parent with ChildGeometryUpdate.
   */
  private _finishGeometryUpdate(args: unknown): void {
    let kind = 0;
    let noInvalidate = false;
    let extra: unknown = null;
    let value = args;
    if (value && Array.isArray(value)) {
      extra = value[1];
      value = value[0];
    }
    if ("number" == typeof value) kind = value;
    if (2 === kind) {
      kind = 0;
      noInvalidate = true;
    }
    if (1 === kind) {
      this._paintBBox = null;
      this._childrenPaintBBox = null;
    } else if (0 === kind) {
      this._geometryBBox = null;
      this._preTransformRect = null;
      this._sourceBBox = null;
      this._paintBBox = null;
      this._childrenPaintBBox = null;
      this._collidesWithChildren = undefined;
      this._collidesWithChildrenSeparate = undefined;
    }
    const paintBBox = (this.isPaintable() && this.isVisible() && this.getPaintBBox()) || null;
    const geometryBBox = this.getGeometryBBox();
    const paintChanged = !Rect.equals(this._savedPaintBBox, paintBBox);
    const parent = this.getParent();
    if (parent) {
      if (0 === kind) {
        parent._notifyChange(ElementChange.ChildGeometryUpdate, [this, paintChanged, extra]);
      } else if (paintChanged && 1 === kind) {
        parent._notifyChange(ElementChange.ChildVisualUpdate, [this]);
      }
    }
    if (this._canEventBeSent(GeometryChangeEvent)) {
      this._sendEvent(new GeometryChangeEvent(this, GeometryChangeEvent.Type.After));
    }
    if (this.isPaintable() && !noInvalidate) {
      if (paintChanged) this._invalidateOldPaintBBox();
      this._requestInvalidation();
    }
    const saved = this._savedGeometryBBox;
    if (
      saved &&
      geometryBBox &&
      !this.isRestoring() &&
      !this.isRecordedTransaction() &&
      !Rect.equals(saved, geometryBBox) &&
      !(
        GMath.isEqualEps(saved.getWidth(), geometryBBox.getWidth(), 1e-10) &&
        GMath.isEqualEps(saved.getHeight(), geometryBBox.getHeight(), 1e-10)
      )
    ) {
      this._notifyChange(ElementChange.GeometrySizeChanged, [this, saved]);
    }
    this._savedGeometryBBox = null;
    this._savedPaintBBox = null;
  }

  /** Effects that depend on the children repaint the element when a child changes. */
  private _invalidateForAffectingEffects(): void {
    if (!isElementStylable(this)) return;
    this._resetFxCacheAndState();
    const effects = this._effects;
    if (!effects) return;
    for (let effect = effects.getFirstChild(); null !== effect; effect = effect.getNext()) {
      if ((effect as Node & { isAffectedByChildren(): boolean }).isAffectedByChildren()) {
        this._handleChange(ElementChange.InvalidationRequest);
        break;
      }
    }
  }

  _invalidatePaintBoxForChildUpdate(): void {
    if (hasContainer(this)) {
      this._paintBBox = null;
      this._childrenPaintBBox = null;
    }
  }

  _invalidateGeometryForChildUpdate(geometryChanged: unknown): void {
    if (hasContainer(this) && geometryChanged) {
      this._geometryBBox = null;
      this._preTransformRect = null;
      this._paintBBox = null;
      this._childrenPaintBBox = null;
    }
  }

  /** Whether `change` is a properties change touching one of the `properties` keys. */
  _canHandleGeometryChangeForProperties(
    change: number,
    args: unknown,
    properties: PropertyDefaults,
  ): boolean {
    return !(
      (change != NodeChange.BeforePropertiesChange && change != NodeChange.AfterPropertiesChange) ||
      !containsObjectKey((args as PropertiesChangeArgs).properties, properties)
    );
  }

  /**
   * Turns a change of geometry properties into a geometry update bracket
   * (and resets the effect cache where the change can affect it). Returns
   * whether the change was one of them.
   */
  _handleGeometryChangeForProperties(
    change: number,
    args: unknown,
    properties: PropertyDefaults,
  ): boolean {
    if (!this._canHandleGeometryChangeForProperties(change, args, properties)) return false;
    switch (change) {
      case NodeChange.BeforePropertiesChange: {
        const change_ = args as PropertiesChangeArgs;
        if (this.isPaintable() && isElementStylable(this)) {
          const index = change_.properties.indexOf("trf");
          if (index >= 0) {
            const current = this.$trf ? (this.$trf as Transform).getMatrix() : null;
            const next = change_.values[index]
              ? (change_.values[index] as Transform).getMatrix()
              : null;
            if (current && next && current !== next) {
              if (
                current[0] !== next[0] ||
                current[1] !== next[1] ||
                current[2] !== next[2] ||
                current[3] !== next[3]
              ) {
                this._resetFxCacheAndState();
              } else if (this.getParent()) {
                // A pure move only resets effects where the parent's
                // effects depend on where the child is.
                const paintBBox = this._paintBBox;
                const parent = this.getParent() as ContainerNode;
                if ("Compound Shape" === Node.getName(parent)) this._resetFxCacheAndState();
                else if (
                  parent instanceof Element &&
                  parent.isPaintable() &&
                  isElementStylable(parent) &&
                  "group" !== Node.getName(parent)
                ) {
                  const parentPaintBBox = parent._paintBBox;
                  if (paintBBox && parentPaintBBox && paintBBox.containsRect(parentPaintBBox)) {
                    this._resetFxCacheAndState();
                  }
                }
              }
            } else this._resetFxCacheAndState();
          } else this._resetFxCacheAndState();
        }
        this._notifyChange(ElementChange.PrepareGeometryUpdate);
        break;
      }
      case NodeChange.AfterPropertiesChange:
        this._notifyChange(ElementChange.FinishGeometryUpdate);
    }
    return true;
  }

  /** Repaints after a change of one of the `properties` keys; returns whether it was one. */
  _handleVisualChangeForProperties(
    change: number,
    args: unknown,
    properties: PropertyDefaults,
  ): boolean {
    if (
      change != NodeChange.AfterPropertiesChange ||
      !containsObjectKey((args as PropertiesChangeArgs).properties, properties)
    ) {
      return false;
    }
    this._notifyChange(ElementChange.InvalidationRequest);
    return true;
  }
}

/** The GElement.Stylable members, for code that has checked isElementStylable. */
export type StylableElement = Element & ElementStylableHooks;

const elementPrototype = Element.prototype;
elementPrototype._sourceBBox = null;
elementPrototype._geometryBBox = null;
elementPrototype._preTransformRect = null;
elementPrototype._preTransformRectTrf = null;
elementPrototype._paintBBox = null;
elementPrototype._childrenPaintBBox = null;
elementPrototype._collidesWithChildren = undefined;
elementPrototype._collidesWithChildrenSeparate = undefined;
elementPrototype._savedPaintBBox = null;
elementPrototype._savedGeometryBBox = null;
elementPrototype.dependentUpdate = false;
elementPrototype._geometryQTreeElement = null;
elementPrototype._paintQTreeElement = null;
elementPrototype._containingGeometryQTreeElement = null;
elementPrototype._containingPaintQTreeElement = null;
elementPrototype._elementIndex = -1;

bindElementClass(Element);

/**
 * Registers GStylable and GElement.Stylable (engine-style calls this when
 * its module loads) and sets Element.Stylable.
 */
export function registerStyleMixins(stylable: unknown, elementStylable: unknown): void {
  styleMixins.Stylable = stylable;
  styleMixins.ElementStylable = elementStylable;
  Element.Stylable = elementStylable;
}
