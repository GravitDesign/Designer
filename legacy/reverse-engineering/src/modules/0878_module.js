/**
 * Webpack Module #878
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(10),
      a = o(n(1582));
    e.exports = class {
      constructor(e) {
        (this._target = e),
          (this._lastTouchStartEvent = 0),
          (this._touchmoved = !1),
          (this._touchStartX = 0),
          (this._touchStartY = 0),
          (this._handleEventBound = this._tryHandleEvent.bind(this)),
          (this._handleScrollEventBound = this._handleScrollEvent.bind(this)),
          (this._gestureHelper = new a.default()),
          this.activate(e);
      }
      addGesture(e) {
        this._gestureHelper.addGesture(e);
      }
      setDelayedTouchEventsEnabled(e) {
        this._gestureHelper.setDelayedTouchEventsEnabled(e);
      }
      setClickSuppressionEnabled(e) {
        this._gestureHelper.setClickSuppressionEnabled(e),
          document.removeEventListener(
            "scroll",
            this._handleScrollEventBound,
            !0
          ),
          e &&
            document.addEventListener(
              "scroll",
              this._handleScrollEventBound,
              !0
            );
      }
      activate(e) {
        this.deactivate(this._target),
          (this._target = e),
          this._target &&
            (this._target.addEventListener(
              "touchstart",
              this._handleEventBound
            ),
            this._target.addEventListener("touchmove", this._handleEventBound),
            this._target.addEventListener("touchend", this._handleEventBound),
            this._target.addEventListener(
              "touchcancel",
              this._handleEventBound
            ),
            this._target.addEventListener(
              "gesturestart",
              this._handleEventBound
            ));
      }
      deactivate(e) {
        const t = e || this._target;
        t &&
          (t.removeEventListener("touchstart", this._handleEventBound),
          t.removeEventListener("touchmove", this._handleEventBound),
          t.removeEventListener("touchend", this._handleEventBound),
          t.removeEventListener("touchcancel", this._handleEventBound),
          t.removeEventListener("gesturestart", this._handleEventBound)),
          document.removeEventListener(
            "scroll",
            this._handleScrollEventBound,
            !0
          ),
          this._target && delete this._target;
      }
      _tryHandleEvent(e) {
        this._shouldHandle(e) && this._handleEvent(e);
      }
      _handleEvent(e) {
        switch (e.type) {
          case "touchstart":
            this._touchStart(e);
            break;
          case "touchmove":
            this._touchMove(e);
            break;
          case "touchend":
            this._touchEnd(e);
            break;
          case "touchcancel":
            this._touchCancel(e);
            break;
          case "gesturestart":
            this._gestureStart(e);
        }
      }
      _touchStart(e) {
        const t = e.targetTouches[0] || e.changedTouches[0];
        t
          ? ((this._touchStartX = t.clientX), (this._touchStartY = t.clientY))
          : ((this._touchStartX = 0), (this._touchStartY = 0)),
          (this._touchmoved = !1),
          this._gestureHelper.touchStart(e);
      }
      _touchMove(e) {
        (this._touchmoved = this._wasMoved(e)),
          this._touchmoved && this._gestureHelper.touchMove(e);
      }
      _touchEnd(e) {
        (this._touchmoved = !1), this._gestureHelper.touchEnd(e);
      }
      _touchCancel(e) {
        this._gestureHelper.touchCancel(e);
      }
      _gestureStart(e) {
        this._gestureHelper.gestureStart(e);
      }
      _handleScrollEvent(e) {
        this._gestureHelper.scroll(e);
      }
      _wasMoved(e) {
        const t = e.changedTouches[0],
          { clientX: n, clientY: o } = t;
        return !(
          Math.abs(n - this._touchStartX) < i.MIN_TOUCH_MOVE_DISTANCE &&
          Math.abs(o - this._touchStartY) < i.MIN_TOUCH_MOVE_DISTANCE
        );
      }
      _shouldHandle(e) {
        return !e.defaultPrevented;
      }
    };
  }