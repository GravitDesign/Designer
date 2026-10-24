// Old: chunk.vendor.js module 333 (the panning mixin of the tools).
/**
 * Auto-panning for tools that drag (select, shapes, pen, freehand,
 * bezigon): while the pointer is within a margin of the view box edge, or
 * outside it, every panView call scrolls the view one step that way. The
 * tool keeps the total scroll since the drag started, so it can map its
 * start point into the scrolled view.
 *
 * The old module was a plain prototype mixed into the tool classes with
 * GObject.inheritAndMix; here it is a mixin factory. The tools set
 * `_view` (GTool does).
 */
import { defineMixin, type AnyConstructor } from "../../engine/core/object.ts";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { RenderParameters } from "../../engine/paint/render-job.ts";
import { EditorOptions } from "../editor-options.ts";

/** The view calls panning makes. */
export interface PanningView {
  beginPan(parameters?: RenderParameters): void;
  finishPan(done?: () => void): void;
  scrollBy(dx: number, dy: number): Point | null;
  getViewBox(noMargin?: boolean): Rect;
}

function panningMembers<TBase extends AnyConstructor>(Base: TBase) {
  abstract class PanningMembers extends Base {
    declare _view: PanningView;
    declare _isPanning: boolean | null;
    declare _dragStartPoint: Point | null;
    declare _cumulativeTranslationSinceDragStartPoint: Transform | null;
    declare _translationMovement: Transform | null | undefined;
    declare _maximumPanStep: number | undefined;

    isPanning(): boolean | null {
      return this._isPanning;
    }

    /** Starts panning; the view renders at full quality while it lasts. */
    beginPan(): void {
      this._isPanning = true;
      this._view.beginPan({ quickRender: false, noWebGL: false });
      this._resetPan();
    }

    _resetPan(): void {
      this._dragStartPoint = null;
      this._cumulativeTranslationSinceDragStartPoint = new Transform();
    }

    _setStartingPanPoint(point: Point): void {
      if (this.isPanning()) {
        this._resetPan();
        this._dragStartPoint = point;
      }
    }

    _isPanStartPointDefined(): boolean {
      return !!this._dragStartPoint;
    }

    /**
     * Scrolls one step if `point` (view pixels) is near or beyond the view
     * box edge. `step` is the step size (at least autoPanStep), `margin`
     * the distance from the right and bottom edges that counts as near.
     */
    panView(point: Point, step?: Point | null, margin?: Point | null): void {
      if (!this._isPanStartPointDefined()) this._setStartingPanPoint(point);
      if (!step) step = new Point(EditorOptions.autoPanStep, EditorOptions.autoPanStep);
      if (!margin) margin = new Point(0, 0);
      const move = this._calculateMovingPoint(point, step, margin);
      if (move) {
        const scrolled = this._view.scrollBy(move.getX(), move.getY());
        if (scrolled) {
          this._cumulativeTranslationSinceDragStartPoint = (
            this._cumulativeTranslationSinceDragStartPoint as Transform
          ).translated(scrolled.getX(), scrolled.getY());
          this._translationMovement = new Transform().translated(scrolled.getX(), scrolled.getY());
        }
      } else this._translationMovement = null;
    }

    _calculateMovingPoint(point: Point, step: Point, margin: Point): Point | null {
      let move: Point | null = null;
      const viewBox = this._view.getViewBox();
      let width = viewBox.getWidth();
      let height = viewBox.getHeight();
      width -= margin.getX();
      height -= margin.getY();
      const dpi = PaintCanvas.getScreenDPI();
      point = new Point(point.getX() / dpi, point.getY() / dpi);
      const x = point.getX();
      const y = point.getY();
      const left = viewBox.getX();
      const top = viewBox.getY();
      const pastRight = x - left >= width;
      const pastLeft = x <= left + margin.getX();
      const horizontal = pastRight || pastLeft;
      const pastBottom = y - top >= height;
      const pastTop = y <= top + margin.getY();
      const vertical = pastBottom || pastTop;
      if (horizontal || vertical) {
        const stepX = step.getX();
        const stepY = step.getY();
        const absX = Math.max(Math.abs(stepX), EditorOptions.autoPanStep);
        const absY = Math.max(Math.abs(stepY), EditorOptions.autoPanStep);
        this._maximumPanStep = Math.max(absX, absY);
        let dx = 0;
        let dy = 0;
        if (horizontal) dx = pastLeft ? -absX : absX;
        if (vertical) dy = pastTop ? -absY : absY;
        move = new Point(dx, dy);
      } else this._maximumPanStep = 0;
      return move;
    }

    /** `rect` grown by the last pan step (plus `extra`), to repaint what moved. */
    _calculateInvalidationPanAreaForRect(rect: Rect, extra?: number): Rect {
      const grow = (this._maximumPanStep as number) + (extra || 0);
      return rect.expanded(grow, grow, grow, grow);
    }

    /** The drag's start point where it is in the scrolled view. */
    getTranslatedPanStartPoint(): Point {
      const translation = this._cumulativeTranslationSinceDragStartPoint as Transform;
      return (translation.inverted() as Transform).mapPoint(this._dragStartPoint as Point);
    }

    /** The scroll of the last panView call that scrolled (null if it did not). */
    getLastPanMovement(): Transform | null | undefined {
      return this._translationMovement;
    }

    endPan(done?: () => void): void {
      if (this.isPanning()) {
        this._isPanning = false;
        this._view.finishPan(done);
      }
    }
  }
  const prototype = PanningMembers.prototype;
  prototype._isPanning = null;
  prototype._dragStartPoint = null;
  prototype._cumulativeTranslationSinceDragStartPoint = null;
  return PanningMembers;
}

/** The panning mixin: `class SelectTool extends Panning(Tool) { ... }`. */
export const Panning = defineMixin("GPanning", panningMembers);
