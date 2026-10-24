// Old: designer.browser.dev.js module 1583.
/** Questions the gestures ask about one touch event. */
export class TouchEventInfo {
  _event: TouchEvent;

  constructor(event: TouchEvent) {
    this._event = event;
  }

  areThereTwoTouchPoints(): boolean {
    return 2 === this._event.touches.length;
  }

  areThereTwoTouchPointsOnTheTarget(): boolean {
    return 2 === this._event.targetTouches.length;
  }

  areThereMultipleTouchPointsOnTheTarget(): boolean {
    return this._event.targetTouches.length > 1;
  }

  isThereOneTouchPointOnTheTarget(): boolean {
    return 1 === this._event.targetTouches.length;
  }

  areThereMultipleTouchPoints(): boolean {
    return this._event.touches.length > 1;
  }

  getOriginalEvent(): TouchEvent {
    return this._event;
  }

  /** Calls `callback` for each changed touch until it returns false. */
  iterateChangedTouches(callback: (touch: Touch) => unknown): void {
    const touches = this._event.changedTouches;
    const count = touches.length;
    for (let i = 0; i < count && false !== callback(touches[i] as Touch); i++);
  }

  isTrusted(): boolean {
    return this._event.isTrusted;
  }

  isCancelable(): boolean {
    return this._event.cancelable;
  }
}
