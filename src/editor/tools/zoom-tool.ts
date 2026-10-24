// Old: chunk.vendor.js module 755 (GZoomTool).
/**
 * Zooms the view: a click zooms in to the next zoom level at the click
 * (with Alt out to the previous one), a drag zooms into the dragged area
 * (with Alt out of it). At the zoom limits the tool shows the "no zoom"
 * cursor and does nothing.
 */
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Rect } from "../../engine/math/rect.ts";
import type { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { SceneWidget } from "../view/scene-widget.ts";
import { zoomLevels } from "../view/zoom.ts";
import { Tool } from "./tool.ts";

export class ZoomTool extends Tool {
  static {
    registerClass(this, "GZoomTool");
  }

  /**
   * zoomStep: the factor a click zooms by beyond the levels; zoomLevels:
   * the levels a click steps through (the shared zoom table, see zoom.ts).
   */
  static options = {
    zoomStep: 2,
    zoomLevels: zoomLevels() as number[] | null,
  };

  /** 1 zoom in, -1 zoom out, 0 at the limit (2 and -2 jump to the limits; nothing sets them). */
  _zoomMode = 0;
  /** The dragged area in view coordinates. */
  _dragArea: Rect | null = null;
  _dragStartTime = 0;

  override getCursor(): string | null {
    switch (this._zoomMode) {
      case -2:
      case -1:
        return Cursor.ZoomMinus;
      case 1:
      case 2:
        return Cursor.ZoomPlus;
      default:
        return Cursor.ZoomNone;
    }
  }

  override activate(view: EditorWidget, light?: boolean): void {
    super.activate(view, light);
    this._updateMode();
    if (!light) {
      view.addEventListener(MouseEvent.DragStart, this._mouseDragStart, this);
      view.addEventListener(MouseEvent.Drag, this._mouseDrag, this);
      view.addEventListener(MouseEvent.DragEnd, this._mouseDragEnd, this);
      view.addEventListener(MouseEvent.Release, this._mouseRelease, this);
      view.addEventListener(SceneWidget.TransformEvent, this._updateMode, this);
      Platform.addEventListener(ModifiersChangedEvent, this._modifiersChanged, this);
    }
  }

  /** Removes the listeners even for a light deactivation. */
  override deactivate(view: EditorWidget, light?: boolean): void {
    super.deactivate(view, light);
    view.removeEventListener(MouseEvent.DragStart, this._mouseDragStart);
    view.removeEventListener(MouseEvent.Drag, this._mouseDrag);
    view.removeEventListener(MouseEvent.DragEnd, this._mouseDragEnd);
    view.removeEventListener(MouseEvent.Release, this._mouseRelease);
    view.removeEventListener(SceneWidget.TransformEvent, this._updateMode, this);
    Platform.removeEventListener(ModifiersChangedEvent, this._modifiersChanged);
  }

  override isDeactivatable(): boolean {
    return !this._dragArea;
  }

  /** The dragged area's outline, on whole pixels. */
  override paint(context: PaintContext): void {
    if (this._hasDragArea()) {
      const area = this._dragArea as Rect;
      let x = Math.floor(area.getX());
      let y = Math.floor(area.getY());
      let width = Math.ceil(area.getWidth());
      let height = Math.ceil(area.getHeight());
      if (EditorOptions.outlineWidth % 2 != 0) {
        x += 0.5;
        y += 0.5;
        width -= 1;
        height -= 1;
      }
      (context.canvas as PaintCanvas).strokeRect(x, y, width, height, EditorOptions.outlineWidth);
    }
  }

  _mouseDragStart(event: MouseEvent): void {
    void event;
    this._dragStartTime = new Date().getTime();
  }

  _mouseDrag(event: MouseEvent): void {
    if (0 !== this._zoomMode) {
      if (this._hasDragArea()) this.invalidateArea((this._dragArea as Rect).expanded(2, 2, 2, 2));
      this._dragArea = Rect.fromPoints(event.clientStart, event.client);
      if (this._hasDragArea()) this.invalidateArea((this._dragArea as Rect).expanded(2, 2, 2, 2));
    }
  }

  /**
   * Zooms into (or with Alt out of) the dragged area. A drag shorter than
   * 200 ms over less than 64 square pixels counts as a click.
   */
  _mouseDragEnd(event: MouseEvent): void {
    void event;
    if (0 !== this._zoomMode) {
      if (
        new Date().getTime() - this._dragStartTime < 200 &&
        this._dragArea &&
        this._dragArea.getWidth() * this._dragArea.getHeight() < 64
      )
        this._dragArea = null;
      if (this._dragArea && !this._dragArea.isEmpty()) {
        const area = this._view.getViewTransform().mapRect(this._dragArea);
        this._view.zoomAll(area, this._zoomMode < 0);
      } else if (this._hasDragArea())
        this.invalidateArea((this._dragArea as Rect).expanded(2, 2, 2, 2));
    }
  }

  /** A click (or a drag that counts as one): the next or previous zoom level at the pointer. */
  _mouseRelease(event: MouseEvent): void {
    if (!this._dragArea || (this._dragArea && this._dragArea.isEmpty())) {
      let zoom: number | null = null;
      let lower: number | null = null;
      let higher: number | null = null;
      if (2 === this._zoomMode) zoom = SceneWidget.options.maxZoomFactor;
      else if (-2 === this._zoomMode) zoom = SceneWidget.options.minZoomFactor;
      else if (0 !== this._zoomMode) {
        if (ZoomTool.options.zoomLevels) {
          const levels = ZoomTool.options.zoomLevels;
          const current = this._view.getZoom();
          const last = levels.length - 1;
          for (let i = 0; i < levels.length; i++) {
            if (current > (levels[i] as number)) lower = levels[i] as number;
            if (current < (levels[last - i] as number)) higher = levels[last - i] as number;
            if (current === levels[i]) {
              lower = i > 0 ? (levels[i - 1] as number) : SceneWidget.options.minZoomFactor;
              // levels[i + 1] is undefined at the last level, so a click
              // there falls back to the zoom step below.
              higher = last > 0 ? (levels[i + 1] as number) : SceneWidget.options.maxZoomFactor;
              break;
            }
          }
        }
        zoom =
          1 === this._zoomMode
            ? higher || this._view.getZoom() * ZoomTool.options.zoomStep
            : lower || this._view.getZoom() / ZoomTool.options.zoomStep;
      }
      if (null !== zoom) {
        const point = this._view.getViewTransform().mapPoint(event.client);
        this._view.zoomAt(point, zoom);
      }
    }
    this._dragArea = null;
  }

  _modifiersChanged(event: ModifiersChangedEvent): void {
    void event;
    this._updateMode();
  }

  /** In (out with Alt), or none at the zoom limit; updates the cursor when it changes. */
  _updateMode(): void {
    let mode = Platform.modifiers.optionKey ? -1 : 1;
    if (
      (mode < 0 && this._view.getZoom() <= SceneWidget.options.minZoomFactor) ||
      (mode > 0 && this._view.getZoom() >= SceneWidget.options.maxZoomFactor)
    )
      mode = 0;
    if (mode != this._zoomMode) {
      this._zoomMode = mode;
      this.updateCursor();
    }
  }

  _hasDragArea(): boolean {
    return !!(this._dragArea && (this._dragArea.getHeight() > 0 || this._dragArea.getWidth() > 0));
  }

  override toString(): string {
    return "[Object GZoomTool]";
  }
}
