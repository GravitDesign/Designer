// Old: chunk.vendor.js module 506 (GAnnotationsList).
/**
 * The container of a page's annotations, node "annlst". It sits directly
 * in a page and only exists while annotations are on. It isn't an
 * element, but it paints, hit tests and collides like one, with boxes
 * that are the union of its annotations' boxes (cached until a child's
 * geometry changes).
 *
 * `aid` is the list's own id, `pgid` the page id (filled in on store),
 * `Guid`, `sid` and `rmd` came from the cloud sync; copies drop all of
 * them.
 */
import { Rect } from "../../math/rect.ts";
import type { Point } from "../../math/point.ts";
import { Transform } from "../../math/transform.ts";
import { VertexInfo } from "../../geometry/vertex-info.ts";
import type { VertexReader } from "../../geometry/vertex-source.ts";
import { GDate } from "../../core/date.ts";
import type { PaintContext } from "../../paint/paint-context.ts";
import type { ScenePaintConfiguration } from "../../paint/scene-paint-configuration.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { CollisionFlag, ElementChange, ElementFlag } from "../element-change.ts";
import {
  Element,
  GeometryChangeEvent,
  type CollisionCollector,
  type ElementHit,
} from "../element.ts";
import { NodeChange, NodeFlag } from "../node-change.ts";
import { Container, type ContainerNode } from "../node-container.ts";
import { Properties, type PropertiesApi } from "../node-properties.ts";
import { Store } from "../node-store.ts";
import { Node, registerNodeClass } from "../node.ts";
import { SceneNode } from "../scene-node.ts";
import { Annotation } from "./annotation.ts";

const MetaProperties = {
  pgid: null,
  Guid: null,
  aid: null,
  rmd: false,
  sid: null,
};

type ElementFilter = ((element: Element) => unknown) | null;

export class AnnotationsList extends Store(Properties(Container(SceneNode))) {
  static {
    registerNodeClass(this, "annlst", "GAnnotationsList");
  }

  static MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;

  /** Set once the list was restored from a blob. */
  declare restored: boolean;
  declare _geometryBBox: Rect | null;
  declare _paintBBox: Rect | null;
  declare _savedPaintBBox: Rect | null;
  declare _savedGeometryBBox: Rect | null;
  declare _preTransformRect: Rect | null;
  declare _preTransformRectTrf: Transform | null;
  declare _updateCounter: number | undefined;

  constructor() {
    super();
    this._setDefaultProperties(MetaProperties);
    this.setProperty("aid", this.getId());
  }

  /**
   * Appends an annotation numbered after the highest `seq` here, stamped
   * with the current time; missing arguments keep the annotation's name
   * and the annotation defaults.
   */
  appendAnnotation(
    annotation: Node & PropertiesApi,
    name?: unknown,
    uid?: unknown,
    type?: unknown,
    location?: unknown,
  ): void {
    let sequence = -1;
    for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
      sequence = Math.max(
        sequence,
        ((child as Node & PropertiesApi).getProperty("seq") as number) || 0,
      );
    }
    const defaults = Annotation.MetaProperties;
    annotation.setProperties(
      ["name", "uid", "time", "seq", "loc", "typ"],
      [
        name || annotation.getProperty("name"),
        uid || defaults["uid"],
        GDate.now(),
        sequence + 1,
        location || defaults["loc"],
        type || defaults["typ"],
      ],
    );
    this.appendChild(annotation);
  }

  paint(context: PaintContext): void {
    if (!this.isPaintable(context)) return;
    for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
      if (child instanceof Element) child.paint(context);
    }
  }

  /**
   * Meant to list the selected annotations; the old code pushed them into
   * an undeclared variable, so it throws a ReferenceError as soon as a
   * selected node is found and otherwise returns an empty list. Kept.
   */
  getSelected(): Node[] {
    this.acceptChildren((node) => {
      if (node.hasFlag(NodeFlag.Selected)) {
        throw new ReferenceError("selectedAnnots is not defined");
      }
    });
    return [];
  }

  getSourceBBox(): Rect | null {
    return null;
  }

  getGeometryBBox(): Rect | null {
    if (null == this._geometryBBox) this._geometryBBox = this._calculateChildrenGeometryBBox();
    return this._geometryBBox;
  }

  getPaintBBox(multiPageView?: unknown, arg?: unknown): Rect | null {
    if (null == this._paintBBox) {
      this._paintBBox = this._calculateChildrenPaintBBox(multiPageView, arg);
    }
    return this._paintBBox;
  }

  _calculatePreTransformRect(transform: Transform | null): Rect | null {
    let rect: Rect | null;
    if (transform && transform.invertible()) {
      rect = this.getGeometryBBox();
      if (rect) {
        const corners = (transform.inverted() as Transform).mapQuadrilateral(rect);
        rect = Rect.fromPoints(...corners);
      } else rect = null;
    } else rect = this.getGeometryBBox();
    return rect;
  }

  getPreTransformRect(transform: Transform | null): Rect | null {
    if (null == this._preTransformRect || !Transform.equals(transform, this._preTransformRectTrf)) {
      this._preTransformRect = this._calculatePreTransformRect(transform);
      this._preTransformRectTrf = transform;
    }
    return this._preTransformRect;
  }

  getCustomCollisionBBox(): Rect | null {
    return null;
  }

  _calculateChildrenGeometryBBox(): Rect | null {
    let box: Rect | null = null;
    for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
      if (child instanceof Element) {
        const childBox = child.getGeometryBBox();
        if (childBox) box = box ? box.united(childBox) : childBox;
      }
    }
    return box || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  getChildrenPaintBBox(multiPageView?: unknown, arg?: unknown): Rect | null {
    return this.getPaintBBox();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  getChildrenGeometryBBox(multiPageView?: unknown, arg?: unknown): Rect | null {
    return this.getGeometryBBox();
  }

  /** The union of the children's non-empty paint boxes, or an empty rect. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  _calculateChildrenPaintBBox(multiPageView?: unknown, arg?: unknown): Rect {
    let box: Rect | null = null;
    for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
      if (child instanceof Element) {
        const childBox = child.getPaintBBox();
        if (childBox && (childBox.getHeight() > 0 || childBox.getWidth() > 0)) {
          box = box ? box.united(childBox) : childBox;
        }
      }
    }
    return box || new Rect(0, 0, 0, 0);
  }

  /** GElement's hit test, run on the list. */
  hitTest(
    location: Point,
    transform?: Transform | null,
    acceptor?: ElementFilter,
    stacked?: boolean,
    level?: number | null,
    tolerance?: number | null,
    force?: unknown,
    filter?: ElementFilter,
    options?: unknown,
    preferSelected?: boolean,
  ): ElementHit[] | null {
    return Element.prototype.hitTest.call(
      this as unknown as Element,
      location,
      transform,
      acceptor,
      stacked,
      level,
      tolerance,
      force,
      filter,
      options,
      preferSelected,
    );
  }

  _detailHitTest(): ElementHit | null {
    return null;
  }

  /** GElement's collision search, run on the list. */
  getCollisions(
    area: VertexReader,
    flags: number,
    acceptor?: ElementFilter,
    filter?: ElementFilter,
    childrenFilter?: ElementFilter,
    collector?: CollisionCollector | null,
    bounds?: Rect | null,
  ): Element[] {
    return Element.prototype.getCollisions.call(
      this as unknown as Element,
      area,
      flags,
      acceptor,
      filter,
      childrenFilter,
      collector,
      bounds,
    );
  }

  _checkElementCollision(
    area: VertexReader,
    flags: number,
    filter: ElementFilter | undefined,
    collect: CollisionCollector,
    bounds: Rect,
  ): boolean {
    if (0 != (flags & CollisionFlag.GeometryBBox) || 0 != (flags & CollisionFlag.PaintBBox)) {
      if (filter && false === filter(this as unknown as Element)) return false;
      let box =
        0 != (flags & CollisionFlag.PaintBBox) ? this.getPaintBBox() : this.getGeometryBBox();
      const custom = this.getCustomCollisionBBox();
      if (custom) box = (box && box.united(custom)) || custom;
      if (box) {
        if (0 != (flags & CollisionFlag.Partial)) {
          this._checkPartialCollision(bounds, box, area, true, flags, collect);
        } else if (bounds.containsRect(box, true)) collect(this as unknown as Element);
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
    if (bounds.intersectsRect(box, inclusive)) collect(this as unknown as Element);
  }

  isFullUnderCollision(area: VertexReader): boolean {
    let full = false;
    const box = this.getPaintBBox();
    if (box) full = (VertexInfo.calculateBounds(area, true) as Rect).containsRect(box, true);
    return full;
  }

  /** A counted geometry update bracket, as on GElement. */
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
    }
  }

  /**
   * Without a context: whether it is in a scene and has a parent. With
   * one: whether annotations show and its paint box is non-empty, dirty
   * and inside the clip area.
   */
  isPaintable(context?: PaintContext | null, arg?: unknown): boolean {
    if (this.hasFlag(ElementFlag.NoPaint)) return false;
    if (!context) return !!this._scene && !!this.getParent();
    const configuration = context.configuration as ScenePaintConfiguration;
    const box = this.getPaintBBox(configuration.multiPageView, arg);
    if (null == box || box.isEmpty()) return false;
    if (context) {
      if (!configuration.isElementAnnotationsVisible()) return false;
      if (context.dirtyMatcher && !context.dirtyMatcher.isDirty(box)) return false;
      const clipArea = configuration && (configuration.clipArea as Rect | null);
      if (configuration && clipArea && !clipArea.intersectsRect(box)) return false;
    }
    return true;
  }

  _requestInvalidateNode(node: { isPaintable(): boolean; getPaintBBox(): Rect | null }): void {
    if (node.isPaintable()) {
      const box = node.getPaintBBox();
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
    if (change === NodeChange.PrepareRestore) this.restored = true;
    else if (change === NodeChange.Store) {
      const storeArgs = args as StoreChangeArgs;
      this.storeProperties(storeArgs.blob, MetaProperties, (name, value) => {
        const options = storeArgs.options;
        // `pgid` is always the current page, except in copies.
        if ("pgid" === name && !(options && (!options || options.copy))) {
          const parent = this.getParent();
          return parent ? (parent as unknown as { getId(): string }).getId() : null;
        }
        return ("Guid" === name || "sid" === name || "aid" === name || "pgid" === name) &&
          options &&
          options.copy
          ? null
          : value;
      });
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, MetaProperties);
    } else if (change === ElementChange.InvalidationRequest) {
      if (this.isPaintable()) this._requestInvalidation();
    } else if (change === ElementChange.InvalidationRequested) {
      const parent = this.getParent();
      if (parent) parent._notifyChange(ElementChange.InvalidationRequested, args);
    } else if (change == ElementChange.PrepareGeometryUpdate) {
      if (this._canEventBeSent(GeometryChangeEvent)) {
        this._sendEvent(
          new GeometryChangeEvent(this as unknown as Element, GeometryChangeEvent.Type.Before),
        );
      }
      this._savedGeometryBBox = this.getGeometryBBox();
      this._savedPaintBBox = (this.isPaintable() && this.getPaintBBox()) || null;
    } else if (change == ElementChange.FinishGeometryUpdate) {
      this._finishGeometryUpdate(args);
    } else if (change == ElementChange.ChildGeometryUpdate) {
      const childArgs = args as [Element, unknown, unknown?];
      this._invalidateGeometryForChildUpdate(childArgs[1]);
      if (this._canEventBeSent(GeometryChangeEvent)) {
        this._sendEvent(
          new GeometryChangeEvent(this as unknown as Element, GeometryChangeEvent.Type.Child),
        );
      }
      const parent = this.getParent();
      if (parent) parent._notifyChange(change, args);
    } else if (change == ElementChange.ChildVisualUpdate) {
      this._invalidatePaintBoxForChildUpdate();
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
    super._handleChange(change, args);
  }

  /**
   * Closes a geometry update. `args` is the mode (0: geometry, 1: paint
   * box only, 2: geometry without invalidating, -1: nothing cleared), or
   * [mode, extra] where extra goes to the parent.
   */
  _finishGeometryUpdate(args: unknown): void {
    let extra: unknown;
    let mode = 0;
    let skipInvalidation = false;
    if (args && Array.isArray(args)) {
      extra = args[1];
      args = args[0];
    }
    if ("number" == typeof args) mode = args;
    if (2 === mode) {
      mode = 0;
      skipInvalidation = true;
    }
    if (1 === mode) this._paintBBox = null;
    else if (0 === mode) {
      this._geometryBBox = null;
      this._preTransformRect = null;
      this._paintBBox = null;
    }
    const paintBox = (this.isPaintable() && this.getPaintBBox()) || null;
    this.getGeometryBBox();
    const paintChanged = !Rect.equals(this._savedPaintBBox, paintBox);
    const parent = this.getParent();
    if (parent) {
      if (0 === mode) {
        parent._notifyChange(ElementChange.ChildGeometryUpdate, [this, paintChanged, extra]);
      } else if (paintChanged && 1 === mode) {
        parent._notifyChange(ElementChange.ChildVisualUpdate, [this]);
      }
    }
    if (this._canEventBeSent(GeometryChangeEvent)) {
      this._sendEvent(
        new GeometryChangeEvent(this as unknown as Element, GeometryChangeEvent.Type.After),
      );
    }
    if (this.isPaintable() && !skipInvalidation) {
      if (paintChanged) this._invalidateOldPaintBBox();
      this._requestInvalidation();
    }
    this._savedGeometryBBox = null;
    this._savedPaintBBox = null;
  }

  _invalidatePaintBoxForChildUpdate(): void {
    this._paintBBox = null;
  }

  _invalidateGeometryForChildUpdate(geometryChanged: unknown): void {
    if (geometryChanged) {
      this._geometryBBox = null;
      this._preTransformRect = null;
      this._paintBBox = null;
    }
  }

  /** Marks every annotation by `uid` (or all of them) resolved. */
  resolve(uid?: unknown): void {
    this.beginUpdate();
    for (let child = this.getFirstChild(); child; child = child.getNext()) {
      if (!uid || uid === (child as Node & PropertiesApi).getProperty("uid")) {
        (child as Node & PropertiesApi).setProperty("rsv", true);
      }
    }
    this.endUpdate();
  }

  override validateInsertion(parent: ContainerNode): boolean {
    return "page" === Node.getName(parent);
  }
}

const listPrototype = AnnotationsList.prototype;
listPrototype.restored = false;
listPrototype._geometryBBox = null;
listPrototype._paintBBox = null;
listPrototype._savedPaintBBox = null;
listPrototype._savedGeometryBBox = null;
listPrototype._preTransformRect = null;
listPrototype._preTransformRectTrf = null;
