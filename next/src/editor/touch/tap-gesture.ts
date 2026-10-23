// Old: designer.browser.dev.js module 879.
/**
 * Turns taps into mouse events: a finger down is a mousedown, up a
 * mouseup and (unless the touch became a swipe) a click, and a second tap
 * within 300 ms and 25 screen pixels also a dblclick.
 *
 * Two fingers that come down together (on the target, or with Nearby
 * detection anywhere within `doubleTapThreshold` screen pixels) are a
 * two-finger tap: no mousedown, and when both are up again within
 * `doubleTapDelay` ms only a mouseup per lifted finger.
 */
import { MouseEvent as GMouseEvent } from "../../engine/core/mouse-event.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Gesture } from "./gesture.ts";
import type { GestureState } from "./gesture-state.ts";
import type { TouchEventInfo } from "./touch-event-info.ts";

export const TapDetectionMode = { Target: 0, Nearby: 1 } as const;

export interface TapGestureConfig {
  doubleTapDetection: number;
  doubleTapThreshold: number;
  doubleTapDelay: number;
}

export class TapGesture extends Gesture {
  static DetectionMode = TapDetectionMode;

  _lastClickPoint: Point | null = null;
  _lastClickEventTime = 0;
  _config: TapGestureConfig;
  _doubleTapTouches: Touch[] | null = null;
  _doubleTapTime = 0;

  constructor(config: Partial<TapGestureConfig> = {}) {
    super();
    this._config = Object.assign(
      {
        doubleTapDetection: TapDetectionMode.Target,
        doubleTapThreshold: 0,
        doubleTapDelay: 100,
      },
      config,
    );
  }

  override canActivate(): boolean {
    return true;
  }

  override start(event: TouchEventInfo, state: GestureState): void {
    this._doubleTapTouches = null;
    if (event.areThereTwoTouchPointsOnTheTarget())
      this._doubleTapTouches = Array.from(event.getOriginalEvent().targetTouches);
    if (!this._doubleTapTouches && this._config.doubleTapDetection === TapDetectionMode.Nearby)
      this._doubleTapTouches = this._getTwoTouchPointsNearby(event.getOriginalEvent().touches);
    if (this._doubleTapTouches) this._doubleTapTime = Date.now();
    else
      event.iterateChangedTouches((touch) => {
        this._dispatchEventFromTouch(
          "mousedown",
          touch,
          GMouseEvent.BUTTON_LEFT,
          !state.isSwiping(),
        );
      });
  }

  override end(event: TouchEventInfo, state: GestureState): void {
    if (this._doubleTapTouches) {
      if (this._doubleTapTouches.every((touch) => !state.hasActiveIdentifier(touch))) {
        this._doubleTapTouches = null;
        if (Date.now() - this._doubleTapTime <= this._config.doubleTapDelay)
          event.iterateChangedTouches((touch) => {
            this._dispatchEventFromTouch("mouseup", touch);
          });
      }
      return;
    }
    event.iterateChangedTouches((touch) => {
      this._dispatchEventFromTouch("mouseup", touch, GMouseEvent.BUTTON_LEFT, !state.isSwiping());
    });
    if (state.isSwiping()) return;
    const now = Date.now();
    event.iterateChangedTouches((touch) => {
      this._dispatchEventFromTouch("click", touch);
    });
    const touch = event.getOriginalEvent().changedTouches[0];
    if (touch) {
      if (!this._doubleTapTouches && this._isDblClick(touch, now))
        this._dispatchEventFromTouch("dblclick", touch);
      this._lastClickEventTime = now;
      this._lastClickPoint = new Point(touch.screenX, touch.screenY);
    }
  }

  override cancel(event: TouchEventInfo): void {
    event.iterateChangedTouches((touch) => {
      this._dispatchEventFromTouch("mouseup", touch);
    });
  }

  _isDblClick(touch: Touch, time: number): boolean {
    if (this._lastClickPoint && this._lastClickEventTime) {
      if (
        GMath.ptDist(
          touch.screenX,
          touch.screenY,
          this._lastClickPoint.getX(),
          this._lastClickPoint.getY(),
        ) <= 25
      ) {
        if (time - this._lastClickEventTime <= 300) return true;
      }
    }
    return false;
  }

  /** The first two touches within the double tap threshold of each other. */
  _getTwoTouchPointsNearby(touches: TouchList): Touch[] | null {
    const count = touches.length;
    if (count > 1)
      for (let i = 0; i < count; i++)
        for (let j = i + 1; j < count; j++) {
          const first = touches[i] as Touch;
          const second = touches[j] as Touch;
          if (
            GMath.ptDist(first.screenX, first.screenY, second.screenX, second.screenY) <=
            this._config.doubleTapThreshold
          )
            return [first, second];
        }
    return null;
  }
}
