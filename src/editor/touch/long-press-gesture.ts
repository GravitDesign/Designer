// Old: designer.browser.dev.js module 1586.
/**
 * One finger resting on the target for LONG_PRESS_TIME_OUT ms opens the
 * context menu at the finger. Any move, end, cancel or system gesture
 * before that drops it.
 */
import { Gesture } from "./gesture.ts";
import type { GestureState } from "./gesture-state.ts";
import { TouchConfig } from "./touch-config.ts";
import { getTouchHost } from "./touch-host.ts";
import type { TouchEventInfo } from "./touch-event-info.ts";

export class LongPressGesture extends Gesture {
  _longPressEventTimeout: ReturnType<typeof setTimeout> | null = null;

  override canActivate(event: TouchEventInfo): boolean {
    return event.isThereOneTouchPointOnTheTarget();
  }

  override start(event: TouchEventInfo): void {
    this._startLongPressEvent(event);
  }

  override move(): void {
    this._dropLongPressEvent();
  }

  override end(): void {
    this._dropLongPressEvent();
  }

  override cancel(): void {
    this._dropLongPressEvent();
  }

  override gesture(): void {
    this._dropLongPressEvent();
  }

  override deactivate(event: TouchEventInfo, state: GestureState): void {
    super.deactivate(event, state);
    this._dropLongPressEvent();
  }

  _startLongPressEvent(event: TouchEventInfo): void {
    const original = event.getOriginalEvent();
    this._dropLongPressEvent();
    if (event.areThereMultipleTouchPoints()) return;
    const { clientX, clientY, target } = original.targetTouches[0] as Touch;
    this._longPressEventTimeout = setTimeout(() => {
      const host = getTouchHost();
      if (host) host.triggerContextMenu(target, clientX, clientY);
    }, TouchConfig.LONG_PRESS_TIME_OUT);
  }

  // The handle stays set after clearing, as in the old code; clearing a
  // finished timeout again does nothing.
  _dropLongPressEvent(): void {
    if (this._longPressEventTimeout) clearTimeout(this._longPressEventTimeout);
  }
}
