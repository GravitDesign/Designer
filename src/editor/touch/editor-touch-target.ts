// Old: designer.browser.dev.js module 1584.
/**
 * The touch handling of the active view (GDesigner moves it to the view of
 * each activated window): pinch zoom and two-finger scroll, taps, moves
 * and the long press for the context menu. Every event it can cancel is
 * cancelled, so neither the browser nor the document touch target acts on
 * it.
 *
 * While the select tool drags a selection area, a further finger coming
 * down is ignored.
 */
import { SelectTool } from "../tools/select-tool.ts";
import { LongPressGesture } from "./long-press-gesture.ts";
import { PanGesture } from "./pan-gesture.ts";
import { PinchGesture } from "./pinch-gesture.ts";
import { TapGesture } from "./tap-gesture.ts";
import { getTouchHost } from "./touch-host.ts";
import { TouchTarget } from "./touch-target.ts";

export class EditorTouchTarget extends TouchTarget {
  constructor(target?: EventTarget | null) {
    super(target);
    this.addGesture(new PinchGesture());
    this.addGesture(new TapGesture());
    this.addGesture(new PanGesture());
    this.addGesture(new LongPressGesture());
  }

  override _handleEvent(event: TouchEvent): void {
    if (event.cancelable) event.preventDefault();
    super._handleEvent(event);
  }

  override _touchStart(event: TouchEvent): void {
    if (this._isSelecting() && this._gestureHelper.hasActiveIdentifiers()) return;
    super._touchStart(event);
  }

  _isSelecting(): boolean {
    const host = getTouchHost();
    const tool = host ? host.getActiveTool() : null;
    return !!(tool && tool instanceof SelectTool) && tool.hasSelectedArea();
  }
}
