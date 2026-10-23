// Old: chunk.vendor.js module 763 (GSliceTool).
/**
 * Draws a slice (an export area) by dragging its box: Shift for a square,
 * Alt from the centre. Unlike the shape tools the slice is only inserted
 * at drag end; while dragging the tool paints its outline itself.
 */
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import type { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Slice } from "../../engine/scene/slice.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { Tool } from "./tool.ts";
import type { ToolManager } from "./tool-manager.ts";

export class SliceTool extends Tool {
  static {
    registerClass(this, "GSliceTool");
  }

  _dragStart: Point | null = null;
  _dragCurrent: Point | null = null;
  _slice: Slice | null = null;
  _dragArea: Rect | null = null;
  _hasCreatedSlice = false;

  override getCursor(): string | null {
    return Cursor.Cross;
  }

  override activate(view: EditorWidget, light?: boolean): void {
    super.activate(view, light);
    if (!light) {
      view.addEventListener(MouseEvent.DragStart, this._mouseDragStart, this);
      view.addEventListener(MouseEvent.Drag, this._mouseDrag, this);
      view.addEventListener(MouseEvent.DragEnd, this._mouseDragEnd, this);
      view.addEventListener(MouseEvent.Down, this._mouseDown, this);
      view.addEventListener(MouseEvent.Release, this._mouseRelease, this);
      Platform.addEventListener(ModifiersChangedEvent, this._modifiersChanged, this);
    }
  }

  /** Always a full deactivation. */
  override deactivate(view: EditorWidget): void {
    super.deactivate(view);
    view.removeEventListener(MouseEvent.DragStart, this._mouseDragStart);
    view.removeEventListener(MouseEvent.Drag, this._mouseDrag);
    view.removeEventListener(MouseEvent.DragEnd, this._mouseDragEnd);
    view.removeEventListener(MouseEvent.Down, this._mouseDown);
    view.removeEventListener(MouseEvent.Release, this._mouseRelease);
    Platform.removeEventListener(ModifiersChangedEvent, this._modifiersChanged);
  }

  override isDeactivatable(): boolean {
    return !this._dragStart;
  }

  /** The outline of the slice being drawn. */
  override paint(context: PaintContext): void {
    if (this._slice) {
      let box = this._slice.getGeometryBBox() as Rect;
      box = this._view.getWorldTransform(this._activePage()).mapRect(box);
      let x = Math.floor(box.getX());
      let y = Math.floor(box.getY());
      if (EditorOptions.outlineWidth % 2 != 0) {
        x += 0.5;
        y += 0.5;
      }
      (context.canvas as PaintCanvas).strokeRect(
        x,
        y,
        box.getWidth(),
        box.getHeight(),
        EditorOptions.outlineWidth,
        context.selectionOutlineColor,
      );
    }
  }

  _mouseDown(event: MouseEvent): void {
    if (event.button === MouseEvent.BUTTON_LEFT)
      this._editor.updateByMousePosition(
        event.client,
        this._view.getWorldTransform(this._scene),
        false,
        this._view.getViewConfiguration(),
      );
  }

  /**
   * Ends the tool's job. A click without a drag maps its point through
   * the guides and drops it (see "The slice tool snaps a click and drops
   * it" in QUESTIONS.md).
   */
  _mouseRelease(event: MouseEvent): void {
    if (!this._hasCreatedSlice) {
      const point = this._view.getViewTransform(this._activePage()).mapPoint(event.client);
      this._editor.getGuides().mapPoint(point);
    }
    this._hasCreatedSlice = false;
    (this._manager as ToolManager).notifyJobDone(this);
  }

  _mouseDragStart(event: MouseEvent): void {
    this._hasCreatedSlice = false;
    this._dragStart = this._view.getViewTransform(this._activePage()).mapPoint(event.client);
    const guides = this._editor.getGuides();
    guides.beginMap();
    this._dragStart = guides.mapPoint(this._dragStart);
    guides.finishMap();
    this._slice = new Slice();
    this._invalidateSlice();
    this.updateCursor();
  }

  _mouseDrag(event: MouseEvent): void {
    this._dragCurrent = this._view.getViewTransform(this._activePage()).mapPoint(event.client);
    this._invalidateSlice();
  }

  _mouseDragEnd(event: MouseEvent): void {
    void event;
    this._editor.getGuides().invalidate();
    const slice = this._slice;
    if (slice) {
      this._slice = null;
      this._invalidateSliceArea(slice);
      this._updateSlice(slice, this._dragArea);
      this._dragStart = null;
      this._dragCurrent = null;
      this._slice = null;
      this._dragArea = null;
      this.updateCursor();
      this._editor.insertElements([slice]);
      this._hasCreatedSlice = true;
    }
  }

  _modifiersChanged(event: ModifiersChangedEvent): void {
    if (event.changed.shiftKey || event.changed.optionKey || event.changed.metaKey)
      this._invalidateSlice();
  }

  /** Updates the slice from the drag start and the snapped current point. */
  _invalidateSlice(): void {
    if (this._dragStart && this._dragCurrent) {
      const guides = this._editor.getGuides();
      guides.beginMap();
      const current = guides.mapPoint(this._dragCurrent);
      guides.finishMap();
      if (Point.equals(this._dragStart, current)) this._invalidateSliceArea();
      else {
        const startX = this._dragStart.getX();
        const startY = this._dragStart.getY();
        let endX = current.getX();
        let endY = current.getY();
        if (Platform.modifiers.shiftKey) {
          const dx = Math.abs(endX - startX);
          const dy = Math.abs(endY - startY);
          const signX = endX < startX ? -1 : 1;
          const signY = endY < startY ? -1 : 1;
          if (dx >= dy) {
            endX = startX + dx * signX;
            endY = startY + dx * signY;
          } else {
            endX = startX + dy * signX;
            endY = startY + dy * signY;
          }
        }
        const area = Platform.modifiers.optionKey
          ? Rect.fromPoints(
              new Point(startX - (endX - startX), startY - (endY - startY)),
              new Point(startX + (endX - startX), startY + (endY - startY)),
            )
          : Rect.fromPoints(new Point(startX, startY), new Point(endX, endY));
        this._dragArea = area;
        this._invalidateSliceArea();
        this._updateSlice(this._slice as Slice, area);
        this._invalidateSliceArea();
      }
    }
  }

  /** Repaints the slice's box in the view. */
  _invalidateSliceArea(slice?: Slice | null): void {
    slice = slice || this._slice;
    if (slice) {
      const box = this._view
        .getWorldTransform(this._activePage())
        .mapRect(slice.getGeometryBBox() as Rect);
      if (box && (box.getWidth() > 0 || box.getHeight() > 0))
        this.invalidateArea(box.expanded(1, 1, 1, 1));
    }
  }

  _updateSlice(slice: Slice, area: Rect | null): void {
    if (area)
      slice.setProperties(
        ["x", "y", "w", "h"],
        [area.getX(), area.getY(), area.getWidth(), area.getHeight()],
      );
  }

  _activePage(): Page {
    return this._view.getScene().getActivePage() as Page;
  }

  override toString(): string {
    return "[Object GSliceTool]";
  }
}
