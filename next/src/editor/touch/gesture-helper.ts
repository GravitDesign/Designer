// Old: designer.browser.dev.js module 1582 (GGestureHelper in its log messages).
/**
 * Runs the gestures of a touch target over its touch events, in the order
 * they were added. On a touch start each gesture is activated or
 * deactivated by its canActivate; active gestures then get the event, and
 * one that returns true deactivates every gesture after it.
 *
 * A single-finger touch start is held back for 50 ms (delayed touch
 * events): a second finger coming down on the target within that time
 * drops it, so a pinch doesn't start with a tap's mousedown; any other
 * event first delivers it.
 *
 * With click suppression, a touch that moved (or during which the page
 * scrolled) is a swipe; the tap gesture sends no click for it.
 */
import { GestureState } from "./gesture-state.ts";
import type { Gesture } from "./gesture.ts";
import { TouchEventInfo } from "./touch-event-info.ts";

type GesturePhase = "start" | "move" | "end" | "cancel" | "gesture";

export class GestureHelper {
  _gestures: Gesture[] = [];
  _state = new GestureState();
  _delayedTouchEventsEnabled = true;
  _suppressClickEnabled = false;
  _swiping = false;
  _delayedTouchEvent: TouchEvent | null = null;
  _delayedTouchEventTimeout: ReturnType<typeof setTimeout> | null = null;

  addGesture(gesture: Gesture): void {
    this._gestures.push(gesture);
  }

  setDelayedTouchEventsEnabled(enabled: boolean): void {
    this._delayedTouchEventsEnabled = enabled;
  }

  setClickSuppressionEnabled(enabled: boolean): void {
    this._suppressClickEnabled = enabled;
  }

  touchStart(event: TouchEvent): void {
    this._swiping = false;
    this._state.update(event);
    this._handleDelayedTouchStartEvent(event);
    const info = new TouchEventInfo(event);
    if (this._delayedTouchEventsEnabled && !info.areThereMultipleTouchPoints()) {
      this._delayedTouchEvent = event;
      this._delayedTouchEventTimeout = setTimeout(this._triggerDelayedTouchEvent.bind(this), 50);
    } else this._execute("start", event);
  }

  touchMove(event: TouchEvent): void {
    this._swiping = true;
    this._state.update(event);
    this._handleDelayedTouchStartEvent(event);
    this._execute("move", event);
  }

  touchEnd(event: TouchEvent): void {
    this._state.update(event);
    this._handleDelayedTouchStartEvent(event);
    this._execute("end", event);
  }

  touchCancel(event: TouchEvent): void {
    this._state.update(event);
    this._execute("cancel", event);
  }

  gestureStart(event: TouchEvent): void {
    this._dropDelayedTouchEvent();
    this._execute("gesture", event);
  }

  scroll(): void {
    this._swiping = true;
  }

  _execute(phase: GesturePhase, event: TouchEvent): void {
    this._state.setSwiping(this._isSwiping());
    const info = new TouchEventInfo(event);
    const count = this._gestures.length;
    let stopped = false;
    for (let i = 0; i < count; i++) {
      const gesture = this._gestures[i] as Gesture;
      try {
        if (stopped) {
          gesture.deactivate(info, this._state);
          continue;
        }
        if ("start" === phase) {
          if (gesture.canActivate(info, this._state)) gesture.activate(info, this._state);
          else gesture.deactivate(info, this._state);
        }
        if (!gesture.isActive()) continue;
        stopped = !!gesture[phase](info, this._state);
      } catch (error) {
        console.error("GGestureHelper", error);
        try {
          gesture.deactivate(info, this._state);
        } catch (deactivationError) {
          console.warn("GGestureHelper deactivation", deactivationError);
        }
      }
    }
  }

  _isSwiping(): boolean {
    return !!this._suppressClickEnabled && this._swiping;
  }

  /**
   * A held-back touch start is dropped when the target now has several
   * fingers, else delivered before the event at hand.
   */
  _handleDelayedTouchStartEvent(event: TouchEvent): void {
    if (
      this._delayedTouchEventTimeout &&
      new TouchEventInfo(event).areThereMultipleTouchPointsOnTheTarget()
    )
      this._dropDelayedTouchEvent();
    else this._triggerDelayedTouchEvent();
  }

  _triggerDelayedTouchEvent(): void {
    if (this._delayedTouchEventTimeout) {
      clearTimeout(this._delayedTouchEventTimeout);
      this._delayedTouchEventTimeout = null;
      if (this._delayedTouchEvent) {
        this._execute("start", this._delayedTouchEvent);
        this._delayedTouchEvent = null;
      }
    }
  }

  /**
   * Only the timeout is dropped: the old code cleared a misspelled field
   * instead of the held-back event, which stays until the next touch start
   * replaces it. Without the timeout it is never delivered.
   * See "Dropped delayed touch start stays around" in QUESTIONS.md.
   */
  _dropDelayedTouchEvent(): void {
    if (this._delayedTouchEventTimeout) clearTimeout(this._delayedTouchEventTimeout);
    this._delayedTouchEventTimeout = null;
  }

  hasActiveIdentifiers(): boolean {
    return this._state.hasActiveIdentifiers();
  }
}
