// Old: chunk.vendor.js module 540 (GDistanceHelper).
import type { Color } from "../../engine/color/color.ts";
import { Event } from "../../engine/core/event.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect, type RectXYOffset } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import type { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { EditorOptions } from "../editor-options.ts";
import { guidePaintContext } from "./guide.ts";

/** The part of the editor view (GEditorWidget) the distance helper uses. */
export interface DistanceHelperView {
  getZoom(): number;
  getViewConfiguration(): { multiPageView: boolean };
  getViewVisibleArea(): Rect;
  getWorldTransform(page: Page | null): Transform;
  getViewTransform(): Transform;
}

/** A measurement line; lines with a value get a distance label. */
interface DistanceVisual {
  line: Point[] | null;
  value?: number;
  valueBoxView?: Rect;
  valuePt?: Point | null;
  valueDir?: number | null;
}

/** Where correctValuePoint puts a distance label. */
export interface CorrectedValuePoint {
  valuePt: Point | null;
  valueDir: number | null;
  line: Point[] | null;
}

const ValueDirection = {
  Up: 1,
  Down: 2,
  Left: 3,
  Right: 4,
} as const;

// The old module read the DPI once at load and sized the labels with it.
const screenDPI = PaintCanvas.getScreenDPI();

/** GDistanceHelper.InvalidationRequestEvent: asks for `area` to be repainted. */
export class DistanceHelperInvalidationRequestEvent extends Event {
  static {
    registerClass(this, "GDistanceHelper.InvalidationRequestEvent");
  }

  declare area: Rect | null;

  constructor(area: Rect | null) {
    super();
    this.area = area;
  }

  override toString(): string {
    return "[Event GDistanceHelper.InvalidationRequestEvent]";
  }
}
(DistanceHelperInvalidationRequestEvent.prototype as unknown as Record<string, unknown>)["area"] =
  null;

const low = (a: number, b: number): number => (a <= b ? a : b);
const high = (a: number, b: number): number => (a <= b ? b : a);

/**
 * The distance overlay (Alt held): lines between the selection and the
 * hovered element with their lengths, kept inside the visible area.
 * Guides also use it to size and paint the values of equal-spacing guides.
 */
export class DistanceHelper extends EventTarget {
  static {
    registerClass(this, "GDistanceHelper");
  }

  static ValueDirection = ValueDirection;
  static VALUE_MARGIN = 5 * screenDPI;
  static FONT_SIZE = 10 * screenDPI;
  static InvalidationRequestEvent = DistanceHelperInvalidationRequestEvent;

  _scene: Scene;
  _view: DistanceHelperView | null = null;
  _activated: boolean;
  _visuals: DistanceVisual[] | null = null;
  _baseRect: Rect | null = null;
  _targetRect: Rect | null = null;
  _area: Rect | null = null;

  constructor(scene: Scene) {
    super();
    this._scene = scene;
    this._activated = false;
  }

  setView(view: DistanceHelperView | null): void {
    this._view = view;
  }

  /** Only with a view. */
  activateMeasurement(): void {
    if (this._view) {
      this._activated = true;
      this.clearVisuals();
      this._area = null;
    }
  }

  deactivateMeasurement(): void {
    this.invalidate();
    this._activated = false;
  }

  isActivated(): boolean {
    return this._activated;
  }

  /**
   * Measures between `base` and `target` (scene rects of the active page).
   * `keepBase` / `keepTarget` also outline them.
   */
  refreshVisuals(base: Rect, target: Rect, keepBase?: boolean, keepTarget?: boolean): void {
    if (!this._activated) return;
    this.clearVisuals();
    this.invalidate();
    if (keepBase) this._baseRect = base;
    if (keepTarget) this._targetRect = target;
    const visuals = this._visuals as DistanceVisual[];
    const offset = base.getXYOffset(target, true, true, true);
    // One measured line with its label.
    const addValue = (
      labelPoint: Point,
      value: number,
      line: Point[],
      direction: number,
      lowBound: number | null,
      highBound: number | null,
    ): void => {
      const box = this.getValueBoxView(value);
      const corrected = this.correctValuePoint(
        labelPoint,
        box,
        line,
        direction,
        lowBound,
        highBound,
      );
      visuals.push({
        line: corrected.line,
        value,
        valueBoxView: box,
        valuePt: corrected.valuePt,
        valueDir: corrected.valueDir,
      });
    };
    if (offset.x || offset.y) {
      if (offset.x && !offset.y) this._measureApartHorizontally(base, target, offset, addValue);
      else if (offset.y && !offset.x) this._measureApartVertically(base, target, offset, addValue);
      else this._measureApartDiagonally(base, target, offset, visuals);
    } else this._measureOverlapping(base, target, offset, addValue);
    this.requestInvalidation();
  }

  /** The rects are apart on x and overlap on y. */
  private _measureApartHorizontally(
    base: Rect,
    target: Rect,
    offset: RectXYOffset,
    addValue: AddValue,
  ): void {
    const top = (offset.topDist as number) >= 0 ? target.getY() : base.getY();
    const bottom =
      (offset.bottomDist as number) >= 0
        ? base.getSide(Rect.Side.BOTTOM_LEFT).getY()
        : target.getSide(Rect.Side.BOTTOM_LEFT).getY();
    const lowY = top <= bottom ? top : bottom;
    const highY = top <= bottom ? bottom : top;
    let y = base.getSide(Rect.Side.LEFT_CENTER).getY();
    if (
      (y < lowY || y > highY) &&
      ((y = target.getSide(Rect.Side.LEFT_CENTER).getY()) < lowY || y > highY)
    ) {
      y = lowY;
    }
    const value = Math.abs(offset.x as number);
    const x = (offset.x as number) > 0 ? target.getX() : base.getX();
    const start = new Point(x, y);
    addValue(
      start.add(new Point(-value / 2, 0)),
      value,
      [start, start.add(new Point(-value, 0))],
      ValueDirection.Up,
      lowY,
      highY,
    );
  }

  /** The rects are apart on y and overlap on x. */
  private _measureApartVertically(
    base: Rect,
    target: Rect,
    offset: RectXYOffset,
    addValue: AddValue,
  ): void {
    const left = (offset.leftDist as number) >= 0 ? target.getX() : base.getX();
    const right =
      (offset.rightDist as number) >= 0
        ? base.getSide(Rect.Side.TOP_RIGHT).getX()
        : target.getSide(Rect.Side.TOP_RIGHT).getX();
    const lowX = left <= right ? left : right;
    const highX = left <= right ? right : left;
    let x = base.getSide(Rect.Side.TOP_CENTER).getX();
    if (
      (x < lowX || x > highX) &&
      ((x = target.getSide(Rect.Side.TOP_CENTER).getX()) < lowX || x > highX)
    ) {
      x = lowX;
    }
    const value = Math.abs(offset.y as number);
    const y = (offset.y as number) > 0 ? target.getY() : base.getY();
    const start = new Point(x, y);
    addValue(
      start.add(new Point(0, -value / 2)),
      value,
      [start, start.add(new Point(0, -value))],
      ValueDirection.Left,
      lowX,
      highX,
    );
  }

  /**
   * The rects are apart on both axes: each distance is measured along an
   * edge of the base rect, or along the target's when the label would
   * leave the view, with a plain line along the other rect's edge.
   */
  private _measureApartDiagonally(
    base: Rect,
    target: Rect,
    offset: RectXYOffset,
    visuals: DistanceVisual[],
  ): void {
    const offsetX = offset.x as number;
    const offsetY = offset.y as number;
    const valueX = Math.abs(offsetX);
    const boxX = this.getValueBoxView(valueX);
    const valueY = Math.abs(offsetY);
    const boxY = this.getValueBoxView(valueY);
    const x = offsetX > 0 ? target.getX() : base.getX();
    const xEnd = x - valueX;
    const y = offsetY > 0 ? target.getY() : base.getY();
    const yEnd = y - valueY;
    const baseEdgeY = offsetY > 0 ? base.getSide(Rect.Side.BOTTOM_LEFT).getY() : base.getY();
    const targetEdgeY = offsetY > 0 ? target.getY() : target.getSide(Rect.Side.BOTTOM_LEFT).getY();
    let labelPoint = new Point(x - valueX / 2, baseEdgeY);
    let line = [new Point(x, baseEdgeY), new Point(xEnd, baseEdgeY)];
    let direction: number = offsetY > 0 ? ValueDirection.Up : ValueDirection.Down;
    let corrected = this.correctValuePoint(labelPoint, boxX, line, direction, null, null, true);
    if (corrected.valuePt) {
      visuals.push({
        line: corrected.line,
        value: valueX,
        valueBoxView: boxX,
        valuePt: corrected.valuePt,
        valueDir: corrected.valueDir,
      });
      visuals.push({ line: [new Point(x, targetEdgeY), new Point(xEnd, targetEdgeY)] });
    } else {
      labelPoint = new Point(x - valueX / 2, targetEdgeY);
      line = [new Point(x, targetEdgeY), new Point(xEnd, targetEdgeY)];
      direction = offsetY > 0 ? ValueDirection.Down : ValueDirection.Up;
      corrected = this.correctValuePoint(labelPoint, boxX, line, direction, null, null);
      visuals.push({
        line: corrected.line,
        value: valueX,
        valueBoxView: boxX,
        valuePt: corrected.valuePt,
        valueDir: corrected.valueDir,
      });
      visuals.push({ line: [new Point(x, baseEdgeY), new Point(xEnd, baseEdgeY)] });
    }
    const baseEdgeX = offsetX > 0 ? base.getSide(Rect.Side.TOP_RIGHT).getX() : base.getX();
    const targetEdgeX = offsetX > 0 ? target.getX() : target.getSide(Rect.Side.TOP_RIGHT).getX();
    labelPoint = new Point(baseEdgeX, y - valueY / 2);
    line = [new Point(baseEdgeX, y), new Point(baseEdgeX, yEnd)];
    direction = offsetX > 0 ? ValueDirection.Left : ValueDirection.Right;
    corrected = this.correctValuePoint(labelPoint, boxY, line, direction, null, null, true);
    if (corrected.valuePt) {
      visuals.push({
        line: corrected.line,
        value: valueY,
        valueBoxView: boxY,
        valuePt: corrected.valuePt,
        valueDir: corrected.valueDir,
      });
      visuals.push({ line: [new Point(targetEdgeX, y), new Point(targetEdgeX, yEnd)] });
    } else {
      labelPoint = new Point(targetEdgeX, y - valueY / 2);
      line = [new Point(targetEdgeX, y), new Point(targetEdgeX, yEnd)];
      direction = offsetX > 0 ? ValueDirection.Right : ValueDirection.Left;
      corrected = this.correctValuePoint(labelPoint, boxY, line, direction, null, null);
      visuals.push({
        line: corrected.line,
        value: valueY,
        valueBoxView: boxY,
        valuePt: corrected.valuePt,
        valueDir: corrected.valueDir,
      });
      visuals.push({ line: [new Point(baseEdgeX, y), new Point(baseEdgeX, yEnd)] });
    }
  }

  /** The rects overlap on both axes (one inside the other, crossing or partly overlapping). */
  private _measureOverlapping(
    base: Rect,
    target: Rect,
    offset: RectXYOffset,
    addValue: AddValue,
  ): void {
    const leftDist = offset.leftDist as number;
    const topDist = offset.topDist as number;
    const rightDist = offset.rightDist as number;
    const bottomDist = offset.bottomDist as number;
    const targetInside = leftDist <= 0 && topDist <= 0 && rightDist >= 0 && bottomDist >= 0;
    const baseInside = leftDist >= 0 && topDist >= 0 && rightDist <= 0 && bottomDist <= 0;
    if (targetInside || baseInside) {
      const outer = targetInside ? base : target;
      if (leftDist) {
        const side = outer.getSide(Rect.Side.LEFT_CENTER);
        const value = Math.abs(leftDist);
        const y1 = outer.getY();
        const y2 = y1 + outer.getHeight();
        addValue(
          side.add(new Point(-value / 2, 0)),
          value,
          [side.add(new Point(-value, 0)), side],
          ValueDirection.Up,
          low(y1, y2),
          high(y1, y2),
        );
      }
      if (topDist) {
        const side = outer.getSide(Rect.Side.TOP_CENTER);
        const value = Math.abs(topDist);
        const x1 = outer.getX();
        const x2 = x1 + outer.getWidth();
        addValue(
          side.add(new Point(0, -value / 2)),
          value,
          [side.add(new Point(0, -value)), side],
          ValueDirection.Left,
          low(x1, x2),
          high(x1, x2),
        );
      }
      if (rightDist) {
        const side = outer.getSide(Rect.Side.RIGHT_CENTER);
        const value = Math.abs(rightDist);
        const y1 = outer.getY();
        const y2 = y1 + outer.getHeight();
        addValue(
          side.add(new Point(value / 2, 0)),
          value,
          [side.add(new Point(value, 0)), side],
          ValueDirection.Up,
          low(y1, y2),
          high(y1, y2),
        );
      }
      if (bottomDist) {
        const side = outer.getSide(Rect.Side.BOTTOM_CENTER);
        const value = Math.abs(bottomDist);
        const x1 = outer.getX();
        const x2 = x1 + outer.getWidth();
        addValue(
          side.add(new Point(0, value / 2)),
          value,
          [side.add(new Point(0, value)), side],
          ValueDirection.Left,
          low(x1, x2),
          high(x1, x2),
        );
      }
    } else if (leftDist * topDist * rightDist * bottomDist > 0) {
      this._measureCrossing(base, target, offset, addValue);
    } else {
      this._measureCorners(base, target, offset, addValue);
    }
  }

  /** No distance is zero: the rects cross or overlap at a corner. */
  private _measureCrossing(
    base: Rect,
    target: Rect,
    offset: RectXYOffset,
    addValue: AddValue,
  ): void {
    const leftDist = offset.leftDist as number;
    const topDist = offset.topDist as number;
    const rightDist = offset.rightDist as number;
    const bottomDist = offset.bottomDist as number;
    const allNegative = leftDist < 0 && topDist < 0 && rightDist < 0 && bottomDist < 0;
    const allPositive = leftDist > 0 && topDist > 0 && rightDist > 0 && bottomDist > 0;
    const tallerTarget = leftDist > 0 && topDist < 0 && rightDist > 0 && bottomDist < 0;
    const widerTarget = leftDist < 0 && topDist > 0 && rightDist < 0 && bottomDist > 0;
    const crossA = leftDist < 0 && topDist > 0 && rightDist > 0 && bottomDist < 0;
    const crossB = leftDist > 0 && topDist < 0 && rightDist < 0 && bottomDist > 0;
    const crossing = crossA || crossB;
    if (allNegative || allPositive || crossA || crossB) {
      const first = allNegative || crossB ? target : base;
      const second = allNegative || crossB ? base : target;
      const firstTopRight = first.getSide(Rect.Side.TOP_RIGHT);
      const firstBottomRight = first.getSide(Rect.Side.BOTTOM_RIGHT);
      let firstBottomLeft = first.getSide(Rect.Side.BOTTOM_LEFT);
      const secondTopRight = second.getSide(Rect.Side.TOP_RIGHT);
      const secondTopLeft = second.getSide(Rect.Side.TOP_LEFT);
      let secondBottomLeft = second.getSide(Rect.Side.BOTTOM_LEFT);
      if (crossing) {
        const swap = firstBottomLeft;
        firstBottomLeft = secondBottomLeft;
        secondBottomLeft = swap;
      }
      const firstCenter = first.getSide(Rect.Side.CENTER);
      const secondCenter = second.getSide(Rect.Side.CENTER);
      const right = Math.abs(rightDist);
      let y1 = firstTopRight.getY();
      let y2 = crossing ? secondCenter.getY() : firstBottomRight.getY();
      addValue(
        firstTopRight.add(new Point(right / 2, 0)),
        right,
        [firstTopRight, firstTopRight.add(new Point(right, 0))],
        ValueDirection.Up,
        low(y1, y2),
        high(y1, y2),
      );
      const top = Math.abs(topDist);
      let x1 = crossing ? firstCenter.getX() : secondTopLeft.getX();
      let x2 = secondTopRight.getX();
      addValue(
        secondTopRight.add(new Point(0, -top / 2)),
        top,
        [secondTopRight, secondTopRight.add(new Point(0, -top))],
        ValueDirection.Right,
        low(x1, x2),
        high(x1, x2),
      );
      const left = Math.abs(leftDist);
      y1 = crossing ? secondCenter.getY() : secondTopLeft.getY();
      y2 = secondBottomLeft.getY();
      addValue(
        secondBottomLeft.add(new Point(-left / 2, 0)),
        left,
        [secondBottomLeft, secondBottomLeft.add(new Point(-left, 0))],
        ValueDirection.Down,
        low(y1, y2),
        high(y1, y2),
      );
      const bottom = Math.abs(bottomDist);
      x1 = firstBottomLeft.getX();
      x2 = crossing ? firstCenter.getX() : firstBottomRight.getX();
      addValue(
        firstBottomLeft.add(new Point(0, bottom / 2)),
        bottom,
        [firstBottomLeft, firstBottomLeft.add(new Point(0, bottom))],
        ValueDirection.Left,
        low(x1, x2),
        high(x1, x2),
      );
    }
    if (tallerTarget || widerTarget || crossA || crossB) {
      const first = tallerTarget || crossB ? target : base;
      const second = tallerTarget || crossB ? base : target;
      const firstTopLeft = first.getSide(Rect.Side.TOP_LEFT);
      const firstBottomLeft = first.getSide(Rect.Side.BOTTOM_LEFT);
      let firstBottomRight = first.getSide(Rect.Side.BOTTOM_RIGHT);
      const secondTopRight = second.getSide(Rect.Side.TOP_RIGHT);
      const secondTopLeft = second.getSide(Rect.Side.TOP_LEFT);
      let secondBottomRight = second.getSide(Rect.Side.BOTTOM_RIGHT);
      if (crossing) {
        const swap = firstBottomRight;
        firstBottomRight = secondBottomRight;
        secondBottomRight = swap;
      }
      const firstCenter = first.getSide(Rect.Side.CENTER);
      const secondCenter = second.getSide(Rect.Side.CENTER);
      const right = Math.abs(rightDist);
      let y1 = crossing ? secondCenter.getY() : secondTopRight.getY();
      let y2 = secondBottomRight.getY();
      addValue(
        secondBottomRight.add(new Point(right / 2, 0)),
        right,
        [secondBottomRight, secondBottomRight.add(new Point(right, 0))],
        ValueDirection.Down,
        low(y1, y2),
        high(y1, y2),
      );
      const bottom = Math.abs(bottomDist);
      let x1 = crossing ? firstCenter.getX() : firstBottomLeft.getX();
      let x2 = firstBottomRight.getX();
      addValue(
        firstBottomRight.add(new Point(0, bottom / 2)),
        bottom,
        [firstBottomRight, firstBottomRight.add(new Point(0, bottom))],
        ValueDirection.Right,
        low(x1, x2),
        high(x1, x2),
      );
      const top = Math.abs(topDist);
      x1 = secondTopLeft.getX();
      x2 = crossing ? firstCenter.getX() : secondTopRight.getX();
      addValue(
        secondTopLeft.add(new Point(0, -top / 2)),
        top,
        [secondTopLeft, secondTopLeft.add(new Point(0, -top))],
        ValueDirection.Left,
        low(x1, x2),
        high(x1, x2),
      );
      const left = Math.abs(leftDist);
      y1 = firstTopLeft.getY();
      y2 = crossing ? secondCenter.getY() : firstBottomLeft.getY();
      addValue(
        firstTopLeft.add(new Point(-left / 2, 0)),
        left,
        [firstTopLeft, firstTopLeft.add(new Point(-left, 0))],
        ValueDirection.Up,
        low(y1, y2),
        high(y1, y2),
      );
    }
  }

  /** Some distance is zero: edges are aligned; measure the corners and remaining sides. */
  private _measureCorners(
    base: Rect,
    target: Rect,
    offset: RectXYOffset,
    addValue: AddValue,
  ): void {
    const leftDist = offset.leftDist as number;
    const topDist = offset.topDist as number;
    const rightDist = offset.rightDist as number;
    const bottomDist = offset.bottomDist as number;
    const de = leftDist >= 0 && topDist >= 0 && rightDist >= 0 && bottomDist <= 0;
    const ge = leftDist <= 0 && topDist <= 0 && rightDist <= 0 && bottomDist >= 0;
    const fe = leftDist >= 0 && topDist >= 0 && rightDist <= 0 && bottomDist >= 0;
    const me = leftDist <= 0 && topDist <= 0 && rightDist >= 0 && bottomDist <= 0;
    const ye = leftDist <= 0 && topDist >= 0 && rightDist <= 0 && bottomDist <= 0;
    const _e = leftDist >= 0 && topDist <= 0 && rightDist >= 0 && bottomDist >= 0;
    const ve = leftDist >= 0 && topDist <= 0 && rightDist <= 0 && bottomDist <= 0;
    const be = leftDist <= 0 && topDist >= 0 && rightDist >= 0 && bottomDist >= 0;
    if ((de || ge || ve || be) && topDist && rightDist) {
      const inner = de || be ? target : base;
      const outer = de || be ? base : target;
      const outerTopRight = outer.getSide(Rect.Side.TOP_RIGHT);
      const innerTopRight = inner.getSide(Rect.Side.TOP_RIGHT);
      const right = Math.abs(rightDist);
      const y1 = outerTopRight.getY();
      const y2 =
        de || ge
          ? inner.getSide(Rect.Side.LEFT_CENTER).getY()
          : outer.getSide(Rect.Side.BOTTOM_RIGHT).getY();
      addValue(
        outerTopRight.add(new Point(right / 2, 0)),
        right,
        [outerTopRight, outerTopRight.add(new Point(right, 0))],
        ValueDirection.Up,
        low(y1, y2),
        high(y1, y2),
      );
      const top = Math.abs(topDist);
      const x1 = de || ge ? inner.getX() : outer.getSide(Rect.Side.TOP_CENTER).getX();
      const x2 = innerTopRight.getX();
      addValue(
        innerTopRight.add(new Point(0, -top / 2)),
        top,
        [innerTopRight, innerTopRight.add(new Point(0, -top))],
        ValueDirection.Right,
        low(x1, x2),
        high(x1, x2),
      );
    }
    if ((ye || _e || ve || be) && topDist && leftDist) {
      const inner = ye || be ? base : target;
      const outer = ye || be ? target : base;
      const outerTopLeft = outer.getSide(Rect.Side.TOP_LEFT);
      const innerTopLeft = inner.getSide(Rect.Side.TOP_LEFT);
      const left = Math.abs(leftDist);
      const y1 = innerTopLeft.getY();
      const y2 =
        ye || _e
          ? outer.getSide(Rect.Side.LEFT_CENTER).getY()
          : inner.getSide(Rect.Side.BOTTOM_LEFT).getY();
      addValue(
        innerTopLeft.add(new Point(-left / 2, 0)),
        left,
        [innerTopLeft, innerTopLeft.add(new Point(-left, 0))],
        ValueDirection.Up,
        low(y1, y2),
        high(y1, y2),
      );
      const top = Math.abs(topDist);
      const x1 = outerTopLeft.getX();
      const x2 =
        ye || _e
          ? outer.getSide(Rect.Side.TOP_RIGHT).getX()
          : inner.getSide(Rect.Side.TOP_CENTER).getX();
      addValue(
        outerTopLeft.add(new Point(0, -top / 2)),
        top,
        [outerTopLeft, outerTopLeft.add(new Point(0, -top))],
        ValueDirection.Left,
        low(x1, x2),
        high(x1, x2),
      );
    }
    if ((ye || _e || fe || me) && bottomDist && leftDist) {
      const inner = ye || me ? base : target;
      const outer = ye || me ? target : base;
      const outerBottomLeft = outer.getSide(Rect.Side.BOTTOM_LEFT);
      const innerBottomLeft = inner.getSide(Rect.Side.BOTTOM_LEFT);
      const left = Math.abs(leftDist);
      const y1 = ye || _e ? outer.getSide(Rect.Side.LEFT_CENTER).getY() : inner.getY();
      const y2 = innerBottomLeft.getY();
      addValue(
        innerBottomLeft.add(new Point(-left / 2, 0)),
        left,
        [innerBottomLeft, innerBottomLeft.add(new Point(-left, 0))],
        ValueDirection.Down,
        low(y1, y2),
        high(y1, y2),
      );
      const bottom = Math.abs(bottomDist);
      const x1 = outerBottomLeft.getX();
      const x2 =
        ye || _e
          ? outer.getSide(Rect.Side.BOTTOM_RIGHT).getX()
          : inner.getSide(Rect.Side.TOP_CENTER).getX();
      addValue(
        outerBottomLeft.add(new Point(0, bottom / 2)),
        bottom,
        [outerBottomLeft, outerBottomLeft.add(new Point(0, bottom))],
        ValueDirection.Left,
        low(x1, x2),
        high(x1, x2),
      );
    }
    if ((de || ge || fe || me) && bottomDist && rightDist) {
      const inner = de || me ? target : base;
      const outer = de || me ? base : target;
      const outerBottomRight = outer.getSide(Rect.Side.BOTTOM_RIGHT);
      const innerBottomRight = inner.getSide(Rect.Side.BOTTOM_RIGHT);
      const right = Math.abs(rightDist);
      const y1 = de || ge ? inner.getSide(Rect.Side.LEFT_CENTER).getY() : outer.getY();
      const y2 = outerBottomRight.getY();
      addValue(
        outerBottomRight.add(new Point(right / 2, 0)),
        right,
        [outerBottomRight, outerBottomRight.add(new Point(right, 0))],
        ValueDirection.Down,
        low(y1, y2),
        high(y1, y2),
      );
      const bottom = Math.abs(bottomDist);
      const x1 = de || ge ? inner.getX() : outer.getSide(Rect.Side.TOP_CENTER).getX();
      const x2 = innerBottomRight.getX();
      addValue(
        innerBottomRight.add(new Point(0, bottom / 2)),
        bottom,
        [innerBottomRight, innerBottomRight.add(new Point(0, bottom))],
        ValueDirection.Right,
        low(x1, x2),
        high(x1, x2),
      );
    }
    if ((de || ge) && leftDist) {
      const rect = de ? target : base;
      const side = rect.getSide(Rect.Side.LEFT_CENTER);
      const left = Math.abs(leftDist);
      const y1 = rect.getY();
      const y2 = rect.getSide(Rect.Side.BOTTOM_LEFT).getY();
      addValue(
        side.add(new Point(-left / 2, 0)),
        left,
        [side, side.add(new Point(-left, 0))],
        ValueDirection.Up,
        low(y1, y2),
        high(y1, y2),
      );
    }
    if ((ye || _e) && rightDist) {
      const rect = ye ? target : base;
      const side = rect.getSide(Rect.Side.RIGHT_CENTER);
      const right = Math.abs(rightDist);
      const y1 = rect.getY();
      const y2 = rect.getSide(Rect.Side.BOTTOM_LEFT).getY();
      addValue(
        side.add(new Point(right / 2, 0)),
        right,
        [side, side.add(new Point(right, 0))],
        ValueDirection.Up,
        low(y1, y2),
        high(y1, y2),
      );
    }
    if ((ve || be) && bottomDist) {
      const rect = ve ? target : base;
      const side = rect.getSide(Rect.Side.BOTTOM_CENTER);
      const bottom = Math.abs(bottomDist);
      const x1 = rect.getX();
      const x2 = rect.getSide(Rect.Side.TOP_RIGHT).getX();
      addValue(
        side.add(new Point(0, bottom / 2)),
        bottom,
        [side, side.add(new Point(0, bottom))],
        ValueDirection.Left,
        low(x1, x2),
        high(x1, x2),
      );
    }
    if ((fe || me) && topDist) {
      const rect = fe ? target : base;
      const side = rect.getSide(Rect.Side.TOP_CENTER);
      const top = Math.abs(topDist);
      const x1 = rect.getX();
      const x2 = rect.getSide(Rect.Side.TOP_RIGHT).getX();
      addValue(
        side.add(new Point(0, -top / 2)),
        top,
        [side, side.add(new Point(0, -top))],
        ValueDirection.Left,
        low(x1, x2),
        high(x1, x2),
      );
    }
  }

  clearVisuals(): void {
    this._visuals = [];
    this._baseRect = null;
    this._targetRect = null;
  }

  /** Invalidates the area of the current lines, labels and outlined rects. */
  requestInvalidation(): void {
    if (this._visuals && this._visuals.length) {
      let minX: number | null = null;
      let minY: number | null = null;
      let maxX: number | null = null;
      let maxY: number | null = null;
      this._area = null;
      for (let i = 0; i < this._visuals.length; ++i) {
        const visual = this._visuals[i] as DistanceVisual;
        const line = visual.line as Point[];
        for (let k = 0; k < 2; ++k) {
          const point = line[k] as Point;
          if (null === minX || minX > point.getX()) minX = point.getX();
          if (null === minY || minY > point.getY()) minY = point.getY();
          if (null === maxX || maxX < point.getX()) maxX = point.getX();
          if (null === maxY || maxY < point.getY()) maxY = point.getY();
        }
        if (visual.valueBoxView) {
          const box = this.getValueBoxScene(
            visual.valueBoxView,
            visual.valuePt as Point,
            visual.valueDir as number,
          );
          this._area = this._area ? this._area.united(box) : box;
        }
      }
      const view = this._view as DistanceHelperView;
      const pad = Math.ceil(1 / view.getZoom());
      let left = minX as unknown as number;
      let top = minY as unknown as number;
      let right = maxX as unknown as number;
      let bottom = maxY as unknown as number;
      left -= pad;
      top -= pad;
      right += pad;
      bottom += pad;
      const lines = new Rect(left, top, right - left, bottom - top);
      this._area = this._area ? this._area.united(lines) : lines;
      if (this._baseRect) {
        const box = this._baseRect.expanded(pad, pad, pad, pad);
        this._area = this._area ? this._area.united(box) : box;
      }
      if (this._targetRect) {
        const box = this._targetRect.expanded(pad, pad, pad, pad);
        this._area = this._area ? this._area.united(box) : box;
      }
      if (this._area && view.getViewConfiguration().multiPageView) {
        const position = (this._scene.getActivePage() as Page).getPosition(true);
        this._area = new Transform(1, 0, 0, 1, position.getX(), position.getY()).mapRect(
          this._area,
        );
      }
    } else this._area = null;
    this.invalidate(this._area);
  }

  invalidate(area?: Rect | null): void {
    if (!this.hasEventListeners(DistanceHelperInvalidationRequestEvent)) return;
    if (area && !area.isEmpty()) this.trigger(new DistanceHelperInvalidationRequestEvent(area));
    else if (this._area && !this._area.isEmpty()) {
      this.clearVisuals();
      this.trigger(new DistanceHelperInvalidationRequestEvent(this._area));
      this._area = null;
    }
  }

  /** Paints the outlined rects and the lines with their values, then forgets them. */
  paint(transform: Transform | null, paintContext: PaintContext): void {
    if (!this._activated) return;
    const context = guidePaintContext(paintContext);
    let pageTransform = transform;
    if (context.configuration.multiPageView) {
      const position = (this._scene.getActivePage() as Page).getPosition(true);
      pageTransform = (pageTransform as Transform).preMultiplied(
        new Transform(1, 0, 0, 1, position.getX(), position.getY()),
      );
    }
    if (this._baseRect) {
      const box = pageTransform ? pageTransform.mapRect(this._baseRect) : this._baseRect;
      context.canvas.strokeRect(
        box.getX(),
        box.getY(),
        box.getWidth(),
        box.getHeight(),
        EditorOptions.outlineWidth,
        EditorOptions.distanceHelperColor,
      );
    }
    if (this._targetRect) {
      const box = pageTransform ? pageTransform.mapRect(this._targetRect) : this._targetRect;
      context.canvas.strokeRect(
        box.getX(),
        box.getY(),
        box.getWidth(),
        box.getHeight(),
        EditorOptions.outlineWidth,
        EditorOptions.distanceHelperColor,
      );
    }
    if (this._visuals && this._visuals.length) {
      for (let i = 0; i < this._visuals.length; ++i) {
        const visual = this._visuals[i] as DistanceVisual;
        const line = visual.line as Point[];
        const from = pageTransform ? pageTransform.mapPoint(line[0] as Point) : (line[0] as Point);
        const to = pageTransform ? pageTransform.mapPoint(line[1] as Point) : (line[1] as Point);
        let half = 0;
        if (EditorOptions.outlineWidth % 2 != 0) half = 0.5;
        context.canvas.strokeLine(
          Math.floor(from.getX()) + half,
          Math.floor(from.getY()) + half,
          Math.floor(to.getX()) + half,
          Math.floor(to.getY()) + half,
          EditorOptions.outlineWidth,
          EditorOptions.distanceHelperColor,
          null == visual.value,
        );
        if (null != visual.value) {
          this.paintDistanceHint(
            visual.value,
            visual.valuePt as Point,
            visual.valueDir as number,
            pageTransform,
            context,
          );
        }
      }
    }
    this.clearVisuals();
  }

  /** The label box for a value, in view pixels. */
  getValueBoxView(value: number): Rect {
    const length = this._scene.pointToString(value, 1).length;
    return new Rect(
      0,
      0,
      (DistanceHelper.FONT_SIZE / 1.2) * length + 3 * screenDPI,
      1.6 * DistanceHelper.FONT_SIZE + 3 * screenDPI,
    );
  }

  /** The label box placed next to `point` in `direction`, in scene units. */
  getValueBoxScene(viewBox: Rect, point: Point, direction: number): Rect {
    const zoom = this._view ? this._view.getZoom() : 1;
    let box = new Rect(0, 0, viewBox.getWidth() / zoom, viewBox.getHeight() / zoom);
    const margin = DistanceHelper.VALUE_MARGIN / zoom;
    if (direction == ValueDirection.Left) {
      box = box.translated(
        point.getX() - margin - box.getWidth(),
        point.getY() - box.getHeight() / 2,
      );
    } else if (direction == ValueDirection.Right) {
      box = box.translated(point.getX() + margin, point.getY() - box.getHeight() / 2);
    } else if (direction == ValueDirection.Up) {
      box = box.translated(
        point.getX() - box.getWidth() / 2,
        point.getY() - margin - box.getHeight(),
      );
    } else if (direction == ValueDirection.Down) {
      box = box.translated(point.getX() - box.getWidth() / 2, point.getY() + margin);
    }
    return box;
  }

  /** Paints a distance value next to `point` (scene coordinates mapped by `transform`). */
  paintDistanceHint(
    value: number,
    point: Point,
    direction: number,
    transform: Transform | null,
    paintContext: PaintContext,
    color?: Color | null,
  ): void {
    const context = guidePaintContext(paintContext);
    const text = this._scene.pointToString(value, 1);
    let position = transform ? transform.mapPoint(point) : point;
    let baseline = "alphabetic";
    let align = "right";
    if (direction == ValueDirection.Left) {
      position = position.add(new Point(-DistanceHelper.VALUE_MARGIN, 0));
      baseline = "middle";
    } else if (direction == ValueDirection.Right) {
      position = position.add(new Point(DistanceHelper.VALUE_MARGIN, 0));
      baseline = "middle";
      align = "left";
    } else if (direction == ValueDirection.Up) {
      position = position.add(new Point(0, -DistanceHelper.VALUE_MARGIN));
      align = "center";
    } else if (direction == ValueDirection.Down) {
      position = position.add(new Point(0, DistanceHelper.VALUE_MARGIN));
      align = "center";
      baseline = "hanging";
    }
    const textColor = color || EditorOptions.distanceHelperColor;
    context.canvas.putAuxilliaryText(
      text,
      position.getX(),
      position.getY(),
      DistanceHelper.FONT_SIZE + "px Verdana",
      baseline,
      align,
      1,
      textColor.toScreenCSS(),
    );
  }

  /**
   * Moves a label (and its line) back into the visible area. `lowBound` /
   * `highBound` are the range the line may slide along; with `optional`
   * a label that can't be placed is dropped (all nulls).
   */
  correctValuePoint(
    labelPoint: Point,
    viewBox: Rect,
    line: Point[],
    direction: number,
    lowBound: number | null,
    highBound: number | null,
    optional?: boolean,
  ): CorrectedValuePoint {
    const view = this._view as DistanceHelperView;
    const visible = view.getViewVisibleArea();
    const world = view.getWorldTransform(this._scene.getActivePage());
    const viewPoint = world.mapPoint(labelPoint);
    const viewLine = [world.mapPoint(line[0] as Point), world.mapPoint(line[1] as Point)] as [
      Point,
      Point,
    ];
    let area: Rect;
    let valuePt: Point | null = labelPoint;
    let valueDir: number | null = direction;
    let outLine: Point[] | null = line;
    const width = viewBox.getWidth();
    const height = viewBox.getHeight();
    const margin = DistanceHelper.VALUE_MARGIN;
    if (direction == ValueDirection.Left || direction == ValueDirection.Right) {
      area =
        direction == ValueDirection.Left
          ? visible.expanded(-width - margin, -height / 2, 0, -height / 2)
          : visible.expanded(0, -height / 2, -width - margin, -height / 2);
      if (!area.containsPoint(viewPoint)) {
        let x = viewPoint.getX();
        let y = viewPoint.getY();
        if (visible.containsPoint(viewLine[0]) || visible.containsPoint(viewLine[1])) {
          if (direction == ValueDirection.Left && area.getX() > x) valueDir = ValueDirection.Right;
          else if (direction == ValueDirection.Right && area.getX() + area.getWidth() < x) {
            valueDir = ValueDirection.Left;
          }
          if (area.getY() > y) y = area.getY();
          else if (area.getY() + area.getHeight() < y) y = area.getY() + area.getHeight();
          valuePt = new Point(x, y);
          valuePt = view.getViewTransform().mapPoint(valuePt);
        } else if (
          null != lowBound &&
          null != highBound &&
          ((viewLine[0].getY() > area.getY() &&
            viewLine[0].getY() < area.getY() + area.getHeight()) ||
            (viewLine[1].getY() > area.getY() &&
              viewLine[1].getY() < area.getY() + area.getHeight()))
        ) {
          if (direction == ValueDirection.Left && area.getX() > x) {
            valueDir = ValueDirection.Right;
            area = visible.expanded(0, -height / 2, -width - margin, -height / 2);
          } else if (direction == ValueDirection.Right && area.getX() + area.getWidth() < x) {
            valueDir = ValueDirection.Left;
            area = visible.expanded(-width - margin, -height / 2, 0, -height / 2);
          }
          let from = new Point(lowBound, (line[0] as Point).getY());
          let to = new Point(highBound, (line[0] as Point).getY());
          from = world.mapPoint(from);
          to = world.mapPoint(to);
          const start = Math.max(from.getX(), area.getX());
          const end = Math.min(to.getX(), area.getX() + area.getWidth());
          if (start <= area.getX() + area.getWidth() && end >= area.getX()) {
            x = (start + end) / 2;
            if (area.getY() > y) y = area.getY();
            else if (area.getY() + area.getHeight() < y) y = area.getY() + area.getHeight();
            valuePt = new Point(x, y);
            valuePt = view.getViewTransform().mapPoint(valuePt);
            outLine = [
              new Point(valuePt.getX(), (line[0] as Point).getY()),
              new Point(valuePt.getX(), (line[1] as Point).getY()),
            ];
          }
        } else if (optional) {
          valuePt = null;
          valueDir = null;
          outLine = null;
        }
      }
    } else if (
      (direction == ValueDirection.Up || direction == ValueDirection.Down) &&
      !(area =
        direction == ValueDirection.Up
          ? visible.expanded(-width / 2, -height - margin, -width / 2, 0)
          : visible.expanded(-width / 2, 0, -width / 2, -height - margin)).containsPoint(viewPoint)
    ) {
      let x = viewPoint.getX();
      let y = viewPoint.getY();
      if (visible.containsPoint(viewLine[0]) || visible.containsPoint(viewLine[1])) {
        if (direction == ValueDirection.Up && area.getY() > y) valueDir = ValueDirection.Down;
        else if (direction == ValueDirection.Down && area.getY() + area.getHeight() < y) {
          valueDir = ValueDirection.Up;
        }
        if (area.getX() > x) x = area.getX();
        else if (area.getX() + area.getWidth() < x) x = area.getX() + area.getWidth();
        valuePt = new Point(x, y);
        valuePt = view.getViewTransform().mapPoint(valuePt);
      } else if (
        null != lowBound &&
        null != highBound &&
        ((viewLine[0].getX() > area.getX() && viewLine[0].getX() < area.getX() + area.getWidth()) ||
          (viewLine[1].getX() > area.getX() && viewLine[1].getX() < area.getX() + area.getWidth()))
      ) {
        if (direction == ValueDirection.Up && area.getY() > y) {
          valueDir = ValueDirection.Down;
          area = visible.expanded(-width / 2, 0, -width / 2, -height - margin);
        } else if (direction == ValueDirection.Down && area.getY() + area.getHeight() < y) {
          valueDir = ValueDirection.Up;
          area = visible.expanded(-width / 2, -height - margin, -width / 2, 0);
        }
        let from = new Point((line[0] as Point).getX(), lowBound);
        let to = new Point((line[0] as Point).getX(), highBound);
        from = world.mapPoint(from);
        to = world.mapPoint(to);
        const start = Math.max(from.getY(), area.getY());
        const end = Math.min(to.getY(), area.getY() + area.getHeight());
        if (start <= area.getY() + area.getHeight() && end >= area.getY()) {
          y = (start + end) / 2;
          if (area.getX() > x) x = area.getX();
          else if (area.getX() + area.getWidth() < x) x = area.getX() + area.getWidth();
          valuePt = new Point(x, y);
          valuePt = view.getViewTransform().mapPoint(valuePt);
          outLine = [
            new Point((line[0] as Point).getX(), valuePt.getY()),
            new Point((line[1] as Point).getX(), valuePt.getY()),
          ];
        }
      } else if (optional) {
        valuePt = null;
        valueDir = null;
        outLine = null;
      }
    }
    return { valuePt, valueDir, line: outLine };
  }

  override toString(): string {
    return "[DistanceHelper]";
  }
}

type AddValue = (
  labelPoint: Point,
  value: number,
  line: Point[],
  direction: number,
  lowBound: number | null,
  highBound: number | null,
) => void;
