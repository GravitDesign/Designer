// Old: designer.browser.dev.js module 1329.
/**
 * A moving finger becomes mousemove events, for the fingers that were
 * down at the touch start and only while the browser lets the page cancel
 * the move (not while it scrolls).
 */
import { Gesture } from "./gesture.ts";
import { GestureState } from "./gesture-state.ts";
import type { TouchEventInfo } from "./touch-event-info.ts";

export class PanGesture extends Gesture {
  _panState: GestureState | null = null;

  override canActivate(): boolean {
    return true;
  }

  override activate(event: TouchEventInfo, state: GestureState): void {
    super.activate(event, state);
    this._panState = new GestureState();
  }

  override deactivate(event: TouchEventInfo, state: GestureState): void {
    super.deactivate(event, state);
    this._panState = null;
  }

  override start(event: TouchEventInfo): void {
    if (this._panState) this._panState.update(event.getOriginalEvent());
  }

  override move(event: TouchEventInfo): void {
    const panState = this._panState;
    if (panState && event.isCancelable())
      event.iterateChangedTouches((touch) => {
        if (panState.hasActiveIdentifier(touch)) this._dispatchEventFromTouch("mousemove", touch);
      });
  }

  override end(event: TouchEventInfo, state: GestureState): void {
    super.end(event, state);
    this._panState = null;
  }

  override cancel(event: TouchEventInfo, state: GestureState): void {
    super.cancel(event, state);
    this._panState = null;
  }
}
