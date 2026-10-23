// Old: designer.browser.dev.js module 880.
/**
 * Base of the gestures the gesture helper runs. A gesture that can
 * activate is activated on every touch start and then gets the start,
 * move, end, cancel and gesture calls; returning true from one stops the
 * gestures after it (they are deactivated).
 */
import { MouseEvent as GMouseEvent } from "../../engine/core/mouse-event.ts";
import type { GestureState } from "./gesture-state.ts";
import type { TouchEventInfo } from "./touch-event-info.ts";

/* eslint-disable @typescript-eslint/no-unused-vars -- the signature the gestures override */
export class Gesture {
  _active = false;

  canActivate(_event: TouchEventInfo, _state: GestureState): boolean {
    return false;
  }

  activate(_event: TouchEventInfo, _state: GestureState): void {
    this._active = true;
  }

  deactivate(_event: TouchEventInfo, _state: GestureState): void {
    this._active = false;
  }

  isActive(): boolean {
    return this._active;
  }

  // The handlers return true to stop the gestures registered after this one.
  start(_event: TouchEventInfo, _state: GestureState): unknown {
    return undefined;
  }
  move(_event: TouchEventInfo, _state: GestureState): unknown {
    return undefined;
  }
  end(_event: TouchEventInfo, _state: GestureState): unknown {
    return undefined;
  }
  cancel(_event: TouchEventInfo, _state: GestureState): unknown {
    return undefined;
  }
  gesture(_event: TouchEventInfo, _state: GestureState): unknown {
    return undefined;
  }

  /* eslint-enable @typescript-eslint/no-unused-vars */

  /**
   * Dispatches a synthetic mouse event of `type` at the touch's position
   * on the touch's target (the old code used initMouseEvent with a click
   * count of 1 and no modifiers).
   */
  _dispatchEventFromTouch(
    type: string,
    touch: Touch,
    button: number = GMouseEvent.BUTTON_LEFT,
    cancelable = true,
  ): void {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable,
      view: window,
      detail: 1,
      screenX: touch.screenX,
      screenY: touch.screenY,
      clientX: touch.clientX,
      clientY: touch.clientY,
      button,
      relatedTarget: null,
    });
    touch.target.dispatchEvent(event);
  }
}
