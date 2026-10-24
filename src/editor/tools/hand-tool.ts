// Old: chunk.vendor.js module 756 (GHandTool).
/** Scrolls the view by dragging it. */
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Cursor } from "../cursor.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { Tool } from "./tool.ts";

export class HandTool extends Tool {
  static {
    registerClass(this, "GHandTool");
  }

  _panning = false;

  override getCursor(): string | null {
    return this._panning ? Cursor.HandClosed : Cursor.HandOpen;
  }

  override activate(view: EditorWidget, light?: boolean): void {
    super.activate(view, light);
    if (!light) {
      view.addEventListener(MouseEvent.DragStart, this._mouseDragStart, this);
      view.addEventListener(MouseEvent.Drag, this._mouseDrag, this);
      view.addEventListener(MouseEvent.DragEnd, this._mouseDragEnd, this);
    }
  }

  /** Removes the listeners even for a light deactivation. */
  override deactivate(view: EditorWidget, light?: boolean): void {
    super.deactivate(view, light);
    view.removeEventListener(MouseEvent.DragStart, this._mouseDragStart);
    view.removeEventListener(MouseEvent.Drag, this._mouseDrag);
    view.removeEventListener(MouseEvent.DragEnd, this._mouseDragEnd);
  }

  override isDeactivatable(): boolean {
    return !this._panning;
  }

  _mouseDragStart(event: MouseEvent): void {
    void event;
    this._panning = true;
    this._view.beginPan();
    this.updateCursor();
  }

  _mouseDrag(event: MouseEvent): void {
    if (this._panning) this._view.scrollBy(-event.clientDelta.getX(), -event.clientDelta.getY());
  }

  _mouseDragEnd(event: MouseEvent): void {
    void event;
    if (this._panning) {
      this._panning = false;
      this._view.finishPan();
      this.updateCursor();
    }
  }

  override toString(): string {
    return "[Object GHandTool]";
  }
}
