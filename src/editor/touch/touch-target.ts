// Old: designer.browser.dev.js module 878.
/**
 * Listens to the touch events of one element and feeds them to a gesture
 * helper. A touch move only counts once a finger is MIN_TOUCH_MOVE_DISTANCE
 * away from where it came down, and events another handler already
 * cancelled (defaultPrevented) are left alone.
 */
import { GestureHelper } from "./gesture-helper.ts";
import type { Gesture } from "./gesture.ts";
import { TouchConfig } from "./touch-config.ts";

const TOUCH_EVENTS = ["touchstart", "touchmove", "touchend", "touchcancel", "gesturestart"];

export class TouchTarget {
  _target: EventTarget | null | undefined;
  _lastTouchStartEvent = 0;
  _touchmoved = false;
  _touchStartX = 0;
  _touchStartY = 0;
  _handleEventBound: (event: Event) => void;
  _handleScrollEventBound: (event: Event) => void;
  _gestureHelper: GestureHelper;

  constructor(target?: EventTarget | null) {
    this._target = target;
    this._handleEventBound = this._tryHandleEvent.bind(this);
    this._handleScrollEventBound = this._handleScrollEvent.bind(this);
    this._gestureHelper = new GestureHelper();
    this.activate(target);
  }

  addGesture(gesture: Gesture): void {
    this._gestureHelper.addGesture(gesture);
  }

  setDelayedTouchEventsEnabled(enabled: boolean): void {
    this._gestureHelper.setDelayedTouchEventsEnabled(enabled);
  }

  /** Click suppression also counts any scroll in the page as a swipe. */
  setClickSuppressionEnabled(enabled: boolean): void {
    this._gestureHelper.setClickSuppressionEnabled(enabled);
    document.removeEventListener("scroll", this._handleScrollEventBound, true);
    if (enabled) document.addEventListener("scroll", this._handleScrollEventBound, true);
  }

  activate(target?: EventTarget | null): void {
    this.deactivate(this._target);
    this._target = target;
    if (this._target)
      for (const type of TOUCH_EVENTS) this._target.addEventListener(type, this._handleEventBound);
  }

  /**
   * Stops listening to `target` (default: the current one). This also
   * drops the scroll listener of click suppression for good, as in the
   * old code, and forgets the current target even when another one was
   * given.
   */
  deactivate(target?: EventTarget | null): void {
    const from = target || this._target;
    if (from)
      for (const type of TOUCH_EVENTS) from.removeEventListener(type, this._handleEventBound);
    document.removeEventListener("scroll", this._handleScrollEventBound, true);
    if (this._target) delete this._target;
  }

  _tryHandleEvent(event: Event): void {
    if (this._shouldHandle(event)) this._handleEvent(event as TouchEvent);
  }

  _handleEvent(event: TouchEvent): void {
    switch (event.type) {
      case "touchstart":
        this._touchStart(event);
        break;
      case "touchmove":
        this._touchMove(event);
        break;
      case "touchend":
        this._touchEnd(event);
        break;
      case "touchcancel":
        this._touchCancel(event);
        break;
      case "gesturestart":
        this._gestureStart(event);
    }
  }

  _touchStart(event: TouchEvent): void {
    const touch = event.targetTouches[0] || event.changedTouches[0];
    if (touch) {
      this._touchStartX = touch.clientX;
      this._touchStartY = touch.clientY;
    } else {
      this._touchStartX = 0;
      this._touchStartY = 0;
    }
    this._touchmoved = false;
    this._gestureHelper.touchStart(event);
  }

  _touchMove(event: TouchEvent): void {
    this._touchmoved = this._wasMoved(event);
    if (this._touchmoved) this._gestureHelper.touchMove(event);
  }

  _touchEnd(event: TouchEvent): void {
    this._touchmoved = false;
    this._gestureHelper.touchEnd(event);
  }

  _touchCancel(event: TouchEvent): void {
    this._gestureHelper.touchCancel(event);
  }

  _gestureStart(event: TouchEvent): void {
    this._gestureHelper.gestureStart(event);
  }

  _handleScrollEvent(): void {
    this._gestureHelper.scroll();
  }

  _wasMoved(event: TouchEvent): boolean {
    const { clientX, clientY } = event.changedTouches[0] as Touch;
    return !(
      Math.abs(clientX - this._touchStartX) < TouchConfig.MIN_TOUCH_MOVE_DISTANCE &&
      Math.abs(clientY - this._touchStartY) < TouchConfig.MIN_TOUCH_MOVE_DISTANCE
    );
  }

  _shouldHandle(event: Event): boolean {
    return !event.defaultPrevented;
  }
}
