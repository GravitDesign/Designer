// Old: chunk.vendor.js module 276 (GGradientStyleEditor).
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { equals, uuid } from "../../engine/core/util.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Canvas2DPaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Group } from "../../engine/scene/group.ts";
import { Node } from "../../engine/scene/node.ts";
import type { PropertiesNode } from "../../engine/scene/node-properties.ts";
import { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import { Effect } from "../../engine/style/effect.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { Gradient, type GradientStop } from "../../engine/style/gradient.ts";
import { Cursor } from "../cursor.ts";
import { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { PartInfo } from "./base-editor.ts";
import { StyleEditor, type StyleEditorActivation } from "./style-editor.ts";

/** A gradient stop handle. */
export interface StopPartId {
  type: string;
  idx: number;
}

/** A point on the gradient line where a click adds a stop. */
export interface PlusStopPartId {
  type: string;
  pos: number;
}

/**
 * Part ids of the gradient editors: stop handles and "add stop" points
 * are objects, the other handles the editor classes' string ids.
 */
export type GradientPartId = StopPartId | PlusStopPartId | string;

/** What getEditorData tells the inspector about the edited gradient. */
export interface GradientEditorData {
  chooserOn: boolean;
  fillLayerIndex?: number;
  borderLayerIndex?: number;
  pagePattern?: boolean;
  effectIndex?: number;
  activeStopIdx?: number;
}

/** The element whose box a gradient is laid out in. */
type BBoxElement = Shape | Scene | Group;

/**
 * The old code called getTransform on whatever _getBBoxElem returned. A
 * scene (the box of a page pattern) has none, but its source box is
 * always null, so the callers never get here with one.
 */
function transformOf(element: BBoxElement): Transform | null {
  return (element as unknown as { getTransform(): Transform | null }).getTransform();
}

function isStopPart(part: unknown): part is StopPartId {
  return (
    typeof part === "object" &&
    part !== null &&
    (part as StopPartId).type === GradientStyleEditor.STOP_HANDLE_PART_ID
  );
}

/** The `idx` of an object part id (undefined for string ids). */
function partIdx(part: unknown): number | undefined {
  return typeof part === "object" && part !== null ? (part as { idx?: number }).idx : undefined;
}

/** The `type` of an object part id (undefined for string ids). */
function partType(part: unknown): string | undefined {
  return typeof part === "object" && part !== null ? (part as { type?: string }).type : undefined;
}

/**
 * Base of the gradient editors: edits a clone of the gradient held in
 * `propHolder.propName` (a fill or border layer pattern, a page pattern
 * or an effect property) and writes it back with setProperty.
 */
export class GradientStyleEditor extends StyleEditor {
  static {
    registerClass(this, "GGradientStyleEditor");
  }

  static DEFAULT_EPS = 1e-6;
  static STOP_HANDLE_PART_ID = uuid();
  static PLUS_STOP_PART_ID = uuid();

  /** Pixel-aligns a handle point for a stroke of `width`. */
  static alignHandlePoint(point: Point, width: number): Point {
    const odd = width % 2 != 0;
    let x = Math.floor(point.getX());
    let y = Math.floor(point.getY());
    if (odd) {
      x += 0.5;
      y += 0.5;
    }
    return new Point(x, y);
  }

  // Set by activate; the editors read them only while active.
  declare _gradient: Gradient;
  declare _componentOfEffect: boolean;
  declare _propName: string | null;
  declare _propHolder: PropertiesNode;
  declare _snapPoints: Point[] | null;

  override activate(activation: StyleEditorActivation): boolean {
    if (activation.propName && activation.propHolder instanceof Node) {
      const value = activation.propHolder.getProperty(
        activation.propName,
        false,
        null,
        activation.propTemporary,
      );
      if (value instanceof Gradient) {
        this._propName = activation.propName;
        this._propHolder = activation.propHolder;
        this._gradient = value.clone();
        this._componentOfEffect = activation.propHolder instanceof Effect;
        this._snapPoints = null;
        return super.activate(activation);
      }
    }
    return false;
  }

  override deactivate(): void {
    super.deactivate();
    this._gradient = null as unknown as Gradient;
    this._propName = null;
    this._propHolder = null as unknown as PropertiesNode;
    this._componentOfEffect = false;
    this._snapPoints = null;
  }

  override validateAlreadyActive(activation: StyleEditorActivation): boolean {
    return (
      !(
        this._propHolder !== activation.propHolder ||
        this._propName !== activation.propName ||
        !equals(this._gradient, activation.propHolder.getProperty(activation.propName))
      ) && super.validateAlreadyActive(activation)
    );
  }

  override getEditObj(): Gradient {
    return this._gradient;
  }

  override _partIdAreEqual(a: unknown, b: unknown): boolean {
    if (a && b) {
      const pa = a as { type?: string; idx?: number; pos?: number };
      const pb = b as { type?: string; idx?: number; pos?: number };
      if (
        pa.type === pb.type &&
        pa.type === GradientStyleEditor.STOP_HANDLE_PART_ID &&
        pa.idx == pb.idx
      )
        return true;
      if (
        pa.type === pb.type &&
        pa.type === GradientStyleEditor.PLUS_STOP_PART_ID &&
        pa.pos == pb.pos
      )
        return true;
      if (!pa.type && !pb.type && a == b) return true;
    }
    return false;
  }

  override getCursor(partId?: unknown): unknown {
    const type = partType(partId);
    return partId && type === GradientStyleEditor.STOP_HANDLE_PART_ID
      ? Cursor.SelectDot
      : partId && type === GradientStyleEditor.PLUS_STOP_PART_ID
        ? Cursor.SelectPlus
        : null;
  }

  override getCustomBBox(transform: Transform | null): Rect | null {
    let bbox: Rect | null = null;
    if (this._gradient.getStops().length) {
      this._iterateAnnotations((point) => {
        const box = EditorAnnotation.getAnnotationBBox(
          transform,
          point,
          EditorOptions.annotationHandles.gradient.size,
          true,
        );
        bbox = bbox ? bbox.united(box) : box;
        return false;
      });
    }
    return bbox;
  }

  override getObjectNameModified(): string | null {
    return Locale.get(new LocaleKey("GGradientStyleEditor", "text.gradient")) as string;
  }

  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    this.manager().preparePermanentChange();
    this._snapPoints = null;
    this._propHolder.setProperty(
      this._propName as string,
      this._gradient.clone(),
      false,
      false,
      false,
    );
    super._applyPartMove(partId, partData, option, extra);
  }

  override movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToScene: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
  ): unknown {
    super.movePart(partId, partData, position, viewToScene, guides, shift, option);
    if (!Platform.modifiers.metaKey && !this._snapPoints) {
      this._snapPoints = this._getSnapPoints(viewToScene.inverted());
    }
    return undefined;
  }

  /**
   * Selects a stop. Selecting an "add stop" point first inserts a stop
   * there (one transaction), then selects the new stop and returns its
   * part info.
   */
  override updatePartSelection(
    _toggle: boolean,
    partIds: unknown[] | null,
    noEvent?: boolean,
  ): PartInfo | undefined {
    let part = partIds && partIds.length ? partIds[0] : null;
    let added: PartInfo | null = null;
    if (part && partType(part) === GradientStyleEditor.PLUS_STOP_PART_ID) {
      const position = (part as PlusStopPartId).pos;
      const stop = this._prepareNewStop(position);
      const stops = this._gradient.getStops();
      stops.push(stop);
      let index = stops.length - 1;
      this._gradient.sortStops();
      const manager = this.manager();
      manager.blockEditorUpdate();
      manager.beginTransaction();
      try {
        this._propHolder.setProperty(
          this._propName as string,
          this._gradient.clone(),
          false,
          false,
        );
      } finally {
        manager.commitTransaction(
          Locale.get(new LocaleKey("GGradientStyleEditor", "action.add-gradient-stop")),
          this.getEditorData(),
        );
        manager.releaseEditorUpdate();
      }
      for (let i = 0; i < stops.length; ++i) if (stops[i] == stop) index = i;
      added = new PartInfo(
        this,
        { type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: index },
        { noEditorSelectionChangedEvent: true },
        true,
        true,
      );
      part = added.id;
      GradientStyleEditor.prototype.updatePartSelection.call(this, false, [added.id], noEvent);
    } else {
      super.updatePartSelection(false, part ? [part] : null);
    }
    if (!noEvent) this.manager().handleEditorPartUpdate(part as StopPartId | null);
    if (added) return added;
    return undefined;
  }

  getEditorData(): GradientEditorData {
    const data: GradientEditorData = { chooserOn: true };
    const holder = this._propHolder;
    if (holder instanceof FillPaintLayer) {
      const parent = holder.getParent();
      if (parent) data.fillLayerIndex = parent.getIndexOfChild(holder);
    } else if (holder instanceof BorderPaintLayer) {
      const parent = holder.getParent();
      if (parent) data.borderLayerIndex = parent.getIndexOfChild(holder);
    } else if (holder instanceof Page) {
      data.pagePattern = true;
    } else if (this._componentOfEffect) {
      const parent = holder.getParent();
      if (parent) data.effectIndex = parent.getIndexOfChild(holder);
    }
    const selection = this._partSelection;
    if (selection && selection.length && null != partIdx(selection[0])) {
      data.activeStopIdx = partIdx(selection[0]);
    }
    return data;
  }

  /** The "x" drawn at a gradient end that has no stop. */
  _paintCross(point: Point, context: PaintContext): void {
    const style = EditorOptions.annotationHandles.gradient;
    let x = Math.floor(point.getX()) + 0.5;
    let y = Math.floor(point.getY()) + 0.5;
    if (style.outlineWidth % 2 != 0) {
      x += 0.5;
      y += 0.5;
    }
    const half = style.size / 2;
    const canvas = context.canvas as NonNullable<PaintContext["canvas"]>;
    canvas.strokeLine(
      x - half,
      y - half,
      x + half,
      y + half,
      style.outlineWidth + 2 * Canvas2DPaintCanvas.getScreenDPI(),
      new RGBColor(RGBColor.parseCSSColor(style.lineShadowColor)),
      false,
      0.6,
    );
    canvas.strokeLine(
      x + half,
      y - half,
      x - half,
      y + half,
      style.outlineWidth + 2 * Canvas2DPaintCanvas.getScreenDPI(),
      new RGBColor(RGBColor.parseCSSColor(style.lineShadowColor)),
      false,
      0.6,
    );
    canvas.strokeLine(x - half, y - half, x + half, y + half, style.outlineWidth, RGBColor.WHITE);
    canvas.strokeLine(x + half, y - half, x - half, y + half, style.outlineWidth, RGBColor.WHITE);
  }

  /**
   * A stop at `position` with the color and opacity interpolated between
   * its neighbours (rounded color channels), or copied from the first or
   * last stop outside them.
   */
  _prepareNewStop(position: number): GradientStop {
    const stops = this._gradient.getStops();
    let before: GradientStop | null = null;
    let after: GradientStop | null = null;
    for (let i = 0; i < stops.length; ++i) {
      const at = (stops[i] as GradientStop).position;
      if (at < position && (!before || at > before.position)) before = stops[i] as GradientStop;
      if (at > position && (!after || at < after.position)) after = stops[i] as GradientStop;
    }
    let color = new RGBColor((stops[0] as GradientStop).color.getValue());
    let opacity = (stops[0] as GradientStop).opacity;
    if (before && after) {
      const span = after.position - before.position;
      const toAfter = span ? (position - before.position) / span : 1;
      const toBefore = span ? (after.position - position) / span : 0;
      const c1 = before.color.getValue() as number[];
      const c2 = after.color.getValue() as number[];
      const o1 = before.opacity;
      const o2 = after.opacity;
      color = new RGBColor([
        Math.round((c1[0] as number) * toBefore + (c2[0] as number) * toAfter),
        Math.round((c1[1] as number) * toBefore + (c2[1] as number) * toAfter),
        Math.round((c1[2] as number) * toBefore + (c2[2] as number) * toAfter),
      ]);
      opacity = o1 * toBefore + o2 * toAfter;
    } else if (!after) {
      color = new RGBColor((stops[stops.length - 1] as GradientStop).color.getValue());
      opacity = (stops[stops.length - 1] as GradientStop).opacity;
    }
    return { position, color, opacity };
  }

  /** Calls `visit` per stop handle point; stops when it returns true. */
  _iterateAnnotations(visit: (point: Point, index: number) => unknown): void {
    const points = this._getAnnotationPoints();
    if (points) {
      for (let i = 0; i < points.length; ++i) if (visit(points[i] as Point, i)) return;
    }
  }

  /** The stop handle points in scene coordinates. */
  _getAnnotationPoints(): Point[] | null {
    return null;
  }

  /**
   * Gradient space to scene: the gradient's own transform (when
   * `withGradientTransform`), then the element's pattern or geometry box.
   */
  _getCompositeTransform(withGradientTransform: boolean): Transform {
    let transform =
      withGradientTransform && this._gradient.getTransform()
        ? (this._gradient.getTransform() as Transform)
        : new Transform();
    const element = this._getBBoxElem();
    if (element) {
      if (!this._componentOfEffect && element instanceof Shape) {
        let native: Transform | null = null;
        const box = element.getPatternBBox();
        if (box) native = Transform.getNativeRectTransformation(box);
        transform = native ? transform.multiplied(native) : transform;
        const elementTransform = element.getTransform();
        transform = elementTransform ? transform.multiplied(elementTransform) : transform;
      } else {
        let native: Transform | null = null;
        const box = element.getGeometryBBox();
        if (box) native = Transform.getNativeRectTransformation(box);
        transform = native ? transform.multiplied(native) : transform;
      }
    }
    return transform;
  }

  /** Corners, edge centers and center of the element's box, mapped by `transform`. */
  _getSnapPoints(transform: Transform | null): Point[] {
    const points: Point[] = [];
    const element = this._getBBoxElem() as BBoxElement;
    let mapping: Transform;
    let box = element.getSourceBBox();
    if (box && !box.isEmpty()) {
      mapping = transformOf(element) || new Transform();
    } else {
      mapping = new Transform();
      box = element.getGeometryBBox();
    }
    if (transform) mapping = mapping.multiplied(transform);
    if (box && !box.isEmpty()) {
      const sides = [
        Rect.Side.TOP_LEFT,
        Rect.Side.TOP_RIGHT,
        Rect.Side.BOTTOM_LEFT,
        Rect.Side.BOTTOM_RIGHT,
        Rect.Side.RIGHT_CENTER,
        Rect.Side.LEFT_CENTER,
        Rect.Side.TOP_CENTER,
        Rect.Side.BOTTOM_CENTER,
        Rect.Side.CENTER,
      ];
      for (const side of sides) points.push(mapping.mapPoint(box.getSide(side)));
    }
    return points;
  }

  /** The first snap point within snapDistance of `position`, else `position`. */
  _snapPosition(position: Point): Point {
    let result = position;
    if (this._snapPoints) {
      for (const point of this._snapPoints) {
        if (
          GMath.ptSqrDist(point.getX(), point.getY(), position.getX(), position.getY()) <=
          StyleEditor.options.snapDistance * StyleEditor.options.snapDistance
        ) {
          result = point;
          break;
        }
      }
    }
    return result;
  }

  /**
   * `position` constrained (editor cursorConstraint) around a pivot: the
   * element box's `side`, or `pivot`, mapped by `transform`.
   */
  _constrainPosition(
    position: Point,
    transform: Transform | null,
    side: string | null,
    pivot: Point | null,
  ): Point | null {
    if (!side && !pivot) return null;
    let mapping: Transform;
    let point = pivot;
    if (side) {
      const element = this._getBBoxElem() as BBoxElement;
      let box = element.getSourceBBox();
      if (box) {
        mapping = transformOf(element) || new Transform();
      } else {
        mapping = new Transform();
        box = element.getGeometryBBox();
      }
      if (box) point = box.getSide(side);
      if (transform) mapping = mapping.multiplied(transform);
    } else {
      mapping = transform || new Transform();
    }
    point = mapping.mapPoint(point as Point);
    return Editor.convertToConstrain(
      point.getX(),
      point.getY(),
      position.getX(),
      position.getY(),
      EditorOptions.cursorConstraint,
    );
  }

  /** The shape, scene or group whose box the gradient lives in. */
  _getBBoxElem(): BBoxElement | null {
    let element: BBoxElement | null =
      this._propHolder instanceof Shape || this._propHolder instanceof Scene
        ? this._propHolder
        : null;
    if (!element) {
      for (
        let parent = this._propHolder.getParent();
        !element && parent;
        parent = parent.getParent()
      ) {
        element =
          parent instanceof Shape || parent instanceof Scene || parent instanceof Group
            ? parent
            : null;
      }
    }
    return element;
  }

  /**
   * After a stop's position changed, sorts the stops and moves the part
   * id (and the part selection) to the stop's new index.
   */
  _synchIdx(part: unknown): void {
    const stops = this._gradient.getStops();
    if (
      stops &&
      stops.length &&
      part &&
      isStopPart(part) &&
      null != part.idx &&
      part.idx < stops.length &&
      this._partSelection &&
      this._partSelection.length &&
      this._partIdAreEqual(part, this._partSelection[0])
    ) {
      const stop = stops[part.idx];
      this._gradient.sortStops();
      for (let i = 0; i < stops.length; ++i) {
        if (stops[i] == stop && i != part.idx) {
          part.idx = i;
          (this._partSelection[0] as StopPartId).idx = i;
        }
      }
    }
  }

  override toString(): string {
    return "[Object GGradientStyleEditor]";
  }
}

// Prototype defaults, as the old prototype had them.
Object.assign(GradientStyleEditor.prototype, {
  _gradient: null,
  _componentOfEffect: false,
  _propName: null,
  _propHolder: null,
  _snapPoints: null,
});
