/**
 * What the touch layer takes from the app. The old gestures asked the
 * gDesigner global for the active view, the context menu and the active
 * tool; the editor can't import the app, so the app registers itself here
 * (setTouchHost) when it starts. Without a host the gestures find no view
 * and no tool, as the old ones did before a window was open.
 */
import type { Point } from "../../engine/math/point.ts";
import type { Transform } from "../../engine/math/transform.ts";

/** The part of GEditorWidget the pinch gesture uses. */
export interface TouchView {
  startTouchMode(): void;
  endTouchMode(): void;
  scrollBy(dx: number, dy: number): unknown;
  getZoom(): number;
  zoomAt(point: Point, zoom: number): void;
  getViewTransform(): Transform;
  _convertClientPositionFromMousePosition(event: globalThis.MouseEvent): Point;
}

export interface TouchHost {
  /** gDesigner.getActiveView(): the active window's view. */
  getActiveView(): TouchView | null;
  /** gDesigner.getContextMenu(): the open context menu, if any. */
  getContextMenu(): { close(): void } | null;
  /** gDesigner.getToolManager().getActiveTool(). */
  getActiveTool(): unknown;
  /**
   * What the old code did with jQuery's trigger("contextmenu") on
   * `target`: run the app's context menu handlers for that element, with
   * the position as pageX/pageY and clientX/clientY. It was a jQuery event,
   * so native contextmenu listeners never saw it.
   */
  triggerContextMenu(target: EventTarget, clientX: number, clientY: number): void;
}

let host: TouchHost | null = null;

export function setTouchHost(next: TouchHost | null): void {
  host = next;
}

export function getTouchHost(): TouchHost | null {
  return host;
}
