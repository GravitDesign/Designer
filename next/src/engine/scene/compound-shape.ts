// Old: chunk.vendor.js module 233 (GCompoundShape).
/**
 * A live boolean of its children, node "Compound Shape" (with the space).
 * The first child that is a vertex source is the main shape; every later
 * one is combined into the result by its `bool` (OR, XOR, AND, SUB; 0
 * adds it as it is). The result is computed lazily and kept until a child
 * or `bool` changes. The compound shape's style is the main shape's: it
 * is a "fake container" whose effects and style properties are copied to
 * the children.
 */
import { Locale } from "../core/locale/locale.ts";
import { GObject } from "../core/object.ts";
import { equals } from "../core/util.ts";
import { VertexPolyBoolean } from "../geometry/boolean/vertex-poly-boolean.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { VertexSource, VertexSourceMixin, type VertexReader } from "../geometry/vertex-source.ts";
import { VertexTransformer } from "../geometry/vertex-transformer.ts";
import type { Vertex } from "../geometry/vertex.ts";
import type { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import type { Transform } from "../math/transform.ts";
import type { PaintContext } from "../paint/paint-context.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { Effect } from "../style/effect.ts";
import type { Effects } from "../style/effects.ts";
import type { StylePaintContext } from "../style/element-stylable.ts";
import { ElementChange } from "./element-change.ts";
import type { Element } from "./element.ts";
import { NodeChange } from "./node-change.ts";
import type { PropertiesChangeArgs, PropertiesNode } from "./node-properties.ts";
import { registerNodeClass, type Node } from "./node.ts";
import { Shape } from "./shape.ts";

const VisualProperties = {
  evenodd: false,
};

const GeometryProperties = {};

/** Above this many children the curve intersector is switched off (too slow). */
const BLOCK_INTERSECTOR_CHILD_NUM = 100;

/** Children of a compound shape: elements with a `bool`, usually shapes. */
type CompoundChild = Element & PropertiesNode & { $bool: number };

/** The statics of an effect class that the style sync reads. */
interface EffectClassStatics {
  equals(a: Effect, b: Effect): boolean;
  GeometryProperties?: Readonly<Record<string, unknown>>;
  VisualProperties?: Readonly<Record<string, unknown>>;
}

export class CompoundShape extends Shape {
  static {
    registerNodeClass(this, "Compound Shape", "GCompoundShape");
  }

  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;
  static override GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static BLOCK_INTERSECTOR_CHILD_NUM = BLOCK_INTERSECTOR_CHILD_NUM;

  declare $evenodd: boolean;
  /** The combined vertices must be computed again (after the next geometry update). */
  declare _resetVertexSource: boolean;
  /** Combine without the curve intersector (many children, or it took too long). */
  declare _blockIntersector: boolean;
  /** Set while restoring: nothing is computed until the children are there. */
  declare _blockVertexComputation: boolean;
  declare _vertexSource: VertexReader | null;

  constructor() {
    super();
    this._setDefaultProperties(VisualProperties);
    this._paintSharp = true;
    // Not the default (false), so it is saved.
    this.$evenodd = true;
  }

  /** The first child that is a vertex source. */
  _mainShape(): CompoundChild | null {
    for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
      if (child.hasMixin(VertexSourceMixin)) return child as CompoundChild;
    }
    return null;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GCompoundShape", "name", this.getNodeName()) as string;
  }

  /**
   * Combines the children (in the compound shape's untransformed space)
   * by their `bool`, adds the children that couldn't be combined or have
   * no `bool`, and maps the result by `trf`. Falls back to the simpler
   * algorithm when it takes over 10 seconds.
   */
  _prepareVertices(): VertexReader {
    const main = this._mainShape();
    if (!main) return new VertexContainer();
    const inverse =
      this.$trf && !this.$trf.isIdentity() && this.$trf.invertible() ? this.$trf.inverted() : null;
    let result: (VertexReader | null)[] = [
      new VertexTransformer(main as unknown as VertexReader, inverse),
    ];
    let added: (VertexReader | null)[] = [];
    const start = new Date().getTime();
    for (let child: Node | null = main; null !== child; child = child.getNext()) {
      if (!child.hasMixin(VertexSourceMixin)) continue;
      const shape = child as CompoundChild;
      const sources: VertexReader[] = [
        new VertexTransformer(shape as unknown as VertexReader, inverse),
      ];
      if (shape !== main) {
        if (shape.$bool) {
          if (result.length) {
            const boolean = new VertexPolyBoolean(
              this._isEvenOddFill()
                ? VertexPolyBoolean.PIP_CHECK_ODDEVEN
                : VertexPolyBoolean.PIP_CHECK_WINDING,
              VertexPolyBoolean.AUTO_MAX_PASSTHROUGH,
              false,
              this._blockIntersector,
            );
            if (boolean.initializeSources(result[0] as VertexReader, sources[0] as VertexReader)) {
              result = boolean.clipOp(shape.$bool) || result;
            } else added = added.concat(sources);
          }
        } else {
          shape.$bool = 0;
          added = added.concat(sources);
        }
        if (!this._blockIntersector && new Date().getTime() - start > 1e4) {
          console.warn(
            "Compound shape computed too long. Falling back to less accurate algorithm.",
          );
          this._blockIntersector = true;
        }
      } else result = sources;
    }
    result = (result && result.concat(added)) || added;
    const trf = this.$trf && !this.$trf.isIdentity() ? this.$trf : null;
    if (result) {
      result = result.filter(
        (source) =>
          !!source &&
          ((source instanceof GObject && source.hasMixin(VertexSourceMixin)) ||
            source instanceof VertexSource ||
            source instanceof VertexContainer),
      );
    }
    const merged: VertexReader = VertexContainer.mergeVertexSources(result);
    return new VertexTransformer(merged, trf);
  }

  override rewindVertices(): boolean {
    return (
      !this._blockVertexComputation &&
      (this._vertexSource ||
        ((this._vertexSource = this._prepareVertices()), (this._resetVertexSource = false)),
      !!this._vertexSource && (this._vertexSource.rewindVertices(0), true))
    );
  }

  override isFakeContainer(): boolean {
    return true;
  }

  override readVertex(vertex: Vertex): boolean {
    return (this._vertexSource as VertexReader).readVertex(vertex);
  }

  override hasVertexForRead(): boolean {
    return (this._vertexSource as VertexReader).hasVertexForRead();
  }

  /**
   * Drops the combined vertices when `bool`, a child or a child's
   * geometry changes; follows `trf` changes without recomputing. A child
   * geometry update is turned into this shape's own geometry update and
   * not passed on.
   */
  override _handleChange(change: number, args?: unknown): void {
    let pass: number | null = change;
    this._handleVisualChangeForProperties(change, args, VisualProperties);
    if (change == NodeChange.BeforePropertiesChange) {
      const properties = (args as PropertiesChangeArgs).properties;
      if (properties.indexOf("bool") >= 0) this._resetVertexSource = true;
      if (properties.indexOf("trf") >= 0) {
        this._geometryBBox = null;
        this._preTransformRect = null;
        this._sourceBBox = null;
        this._paintBBox = null;
        this._childrenPaintBBox = null;
      }
    } else if (change == NodeChange.AfterPropertiesChange) {
      const properties = (args as PropertiesChangeArgs).properties;
      if (properties.indexOf("vis") >= 0) {
        this._beginBlockChanges([ElementChange.ChildGeometryUpdate]);
      }
      if (properties.indexOf("trf") >= 0 && this._vertexSource) {
        const trf = this.$trf;
        if (this._vertexSource instanceof VertexTransformer) this._vertexSource.setTransform(trf);
        else if (this._vertexSource)
          this._vertexSource = new VertexTransformer(this._vertexSource, trf);
      }
    } else if (change === ElementChange.PrepareGeometryUpdate) {
      if (!args) this._requestInvalidation();
    } else if (change === ElementChange.FinishGeometryUpdate) {
      if (this._resetVertexSource) this._vertexSource = null;
    } else if (change === NodeChange.AfterChildInsert || change === NodeChange.AfterChildRemove) {
      this._resetVertexSource = true;
      this._geometryBBox = null;
      this._preTransformRect = null;
      this._blockIntersector = this.getChildren().length > BLOCK_INTERSECTOR_CHILD_NUM;
    } else if (change === ElementChange.ChildGeometryUpdate) {
      this._resetVertexSource = true;
      this._notifyChange(ElementChange.PrepareGeometryUpdate);
      this._notifyChange(ElementChange.FinishGeometryUpdate, 0);
      this._resetFxCacheAndState();
      pass = null;
    } else if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, VisualProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, VisualProperties);
    } else if (change === NodeChange.PrepareRestore) {
      this._blockVertexComputation = true;
    }
    if (pass) super._handleChange(pass, args);
    if (pass === NodeChange.Restore) {
      this._blockVertexComputation = false;
      // Old files without `evenodd` compute the vertices right away.
      const blob = (args as RestoreChangeArgs).blob;
      if (blob && !Object.prototype.hasOwnProperty.call(blob, "evenodd")) this.rewindVertices();
    } else if (pass == NodeChange.AfterPropertiesChange) {
      if ((args as PropertiesChangeArgs).properties.indexOf("vis") >= 0) {
        this._endBlockChanges([ElementChange.ChildGeometryUpdate]);
      }
    }
  }

  override _beforeVisibilityUpdate(): void {
    this._beginBlockChanges([ElementChange.ChildGeometryUpdate]);
  }

  override _afterVisibilityUpdate(): void {
    this._endBlockChanges([ElementChange.ChildGeometryUpdate]);
  }

  /** Copies the compound shape's effects to the main shape. */
  override _styleFinishGeometryChange(source?: unknown): void {
    this._notifyChange(ElementChange.FinishGeometryUpdate, 1);
    if (source) {
      if (source instanceof Effect) this._resetFxCacheAndState(source);
      else this._resetFxCacheAndState();
    } else if (!source) {
      this._resetFxCacheAndState();
      return;
    }
    const main = this._mainShape();
    if (!main) return;
    const propertyChanges = [NodeChange.BeforePropertiesChange, NodeChange.AfterPropertiesChange];
    const childChanges = [
      NodeChange.BeforeChildRemove,
      NodeChange.AfterChildRemove,
      NodeChange.BeforeChildInsert,
      NodeChange.AfterChildInsert,
    ];
    this._beginBlockChanges(propertyChanges);
    const ownEffects = this.getEffects() as Effects;
    const mainEffects = (main as unknown as Shape).getEffects() as Effects;
    mainEffects._beginBlockChanges(childChanges);
    try {
      let index = 0;
      for (let effect = ownEffects.getFirstChild(); null !== effect; effect = effect.getNext()) {
        const own = effect as Effect;
        const counterpart = mainEffects.getChildByIndex(index) as Effect | null;
        if (counterpart) {
          const effectClass = own.constructor as unknown as EffectClassStatics;
          if (effectClass.equals(counterpart, own)) {
            const sets: Readonly<Record<string, unknown>>[] = [Effect.GeometryProperties];
            if (effectClass.GeometryProperties) sets.push(effectClass.GeometryProperties);
            if (effectClass.VisualProperties) sets.push(effectClass.VisualProperties);
            if (sets) {
              counterpart._beginBlockChanges(propertyChanges);
              counterpart.transferProperties(own, sets, true);
              counterpart._endBlockChanges(propertyChanges);
            }
          } else {
            mainEffects.insertChild(own.clone() as Node, counterpart);
            mainEffects.removeChild(counterpart);
          }
        } else mainEffects.insertChild(own.clone() as Node, undefined);
        index++;
      }
      // Quirk: the loop steps to the container's sibling, so it removes one effect at most.
      for (
        let extra = mainEffects.getChildByIndex(index);
        null !== extra;
        extra = mainEffects.getNext()
      ) {
        mainEffects.removeChild(extra);
      }
    } finally {
      mainEffects._endBlockChanges(childChanges);
    }
    this._endBlockChanges(propertyChanges);
  }

  /** Changed style properties are set on every child. */
  override _stylePropertiesUpdated(names: string[], values: unknown[]): void {
    if (!this._mainShape()) return;
    const current = this.getProperties(names);
    const changedNames: string[] = [];
    const changedValues: unknown[] = [];
    for (let i = 0; i < names.length; i++) {
      if (!equals(values[i], current[i])) {
        changedNames.push(names[i] as string);
        changedValues.push(current[i]);
      }
    }
    if (!changedNames.length) return;
    const changes = [NodeChange.BeforePropertiesChange, NodeChange.AfterPropertiesChange];
    this._beginBlockChanges(changes);
    for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
      (child as CompoundChild).setProperties(changedNames, changedValues);
    }
    this._endBlockChanges(changes);
  }

  /** An estimate of the result's box from the children's boxes and their `bool`. */
  _mergeBoxes(): Rect | null {
    if (!this._mainShape()) return null;
    const boxOf = (shape: CompoundChild): Rect | null =>
      shape instanceof CompoundShape
        ? shape._mergeBoxes()
        : shape.getGeometryBBox() || shape._calculateGeometryBBox();
    const main = this._mainShape() as CompoundChild;
    const mainBox = boxOf(main);
    let merged: Rect | null = null;
    let box: Rect | null;
    const firstOther = () => (this.getFirstChild() as Node).getNext();
    for (let child = firstOther(); null !== child; child = child.getNext()) {
      const shape = child as CompoundChild;
      if (shape.$bool === VertexPolyBoolean.AND && (box = boxOf(shape))) {
        if (merged) merged = merged.united((mainBox as Rect).intersected(box));
        else if (mainBox) merged = mainBox.intersected(box);
      }
    }
    for (let child = firstOther(); null !== child; child = child.getNext()) {
      const shape = child as CompoundChild;
      switch (shape.$bool) {
        case VertexPolyBoolean.OR:
        case VertexPolyBoolean.XOR:
          if ((box = boxOf(shape))) {
            if (merged) merged = merged.united(box);
            else if (mainBox) merged = mainBox.united(box);
          }
      }
    }
    for (let child = firstOther(); null !== child; child = child.getNext()) {
      const shape = child as CompoundChild;
      if (shape.$bool === VertexPolyBoolean.SUB && (box = boxOf(shape))) {
        if (merged) merged = merged.subtracted(box);
        else if (mainBox) merged = mainBox.subtracted(box);
      }
    }
    if (!merged) merged = mainBox;
    return merged;
  }

  override assignFrom(other: Node): void {
    if (other instanceof CompoundShape) this.transferProperties(other, [VisualProperties]);
    super.assignFrom(other);
  }

  /** The geometry box center, mapped back by `trf` unless `transformed`. */
  override getCenter(transformed?: unknown): Point | null {
    const box = this.getGeometryBBox();
    let center = box ? box.getSide(Rect.Side.CENTER) : null;
    if (center && !transformed && this.$trf && this.$trf.invertible()) {
      center = (this.$trf.inverted() as Transform).mapPoint(center);
    }
    return center;
  }

  override _requireMiterLimitApproximation(): unknown {
    return this.getGeometryBBox() && !(this.getGeometryBBox() as Rect).isEmpty();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override _invalidateGeometryForChildUpdate(geometryChanged: unknown): void {}

  override _invalidatePaintBoxForChildUpdate(): void {}

  override _isEvenOddFill(): boolean {
    return !!this.$evenodd;
  }

  override _handleVisualChangeForProperties(
    change: number,
    args: unknown,
    properties: Readonly<Record<string, unknown>>,
  ): boolean {
    if (
      change == NodeChange.AfterPropertiesChange &&
      (args as PropertiesChangeArgs).properties.indexOf("evenodd") >= 0
    ) {
      this._collidesWithChildrenSeparate = undefined;
      this._collidesWithChildren = undefined;
    }
    return super._handleVisualChangeForProperties(change, args, properties);
  }

  /** The children are the shape: they are not painted on their own. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override _paintContents(context: StylePaintContext): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override _paintChildren(context: PaintContext): void {}

  /** Sets `trf` and moves the children along (in one update). */
  override transform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void {
    this.beginUpdate();
    try {
      if (transform && !transform.isIdentity()) {
        this._layoutTransform = transform;
        this._relayoutNow = !this._relayout;
        this._relayout = true;
        this.setProperty("trf", this.$trf ? this.$trf.multiplied(transform) : transform);
        this._transformChildren(transform, force, exceptions);
        if (this._relayoutNow) {
          this._layoutAnchorContents(null, null, this._layoutTransform);
          this._layoutTransform = null;
          this._relayoutNow = false;
        }
      }
    } finally {
      this.endUpdate();
    }
  }

  /** The children's pivots. */
  override findPivots(details?: unknown, area?: unknown): unknown[] | null {
    void details;
    let pivots: unknown[] | null = null;
    for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
      const own = (child as Element).findPivots(false, area);
      if (own) pivots = pivots ? pivots.concat(own) : own;
    }
    return pivots;
  }

  override toString(): string {
    return "[GCompoundShape]";
  }
}

const compoundShapePrototype = CompoundShape.prototype;
compoundShapePrototype._resetVertexSource = false;
compoundShapePrototype._blockIntersector = false;
compoundShapePrototype._blockVertexComputation = false;
compoundShapePrototype._vertexSource = null;
