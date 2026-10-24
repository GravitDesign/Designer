/**
 * Webpack Module #1582
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    const o = n(1583),
      i = n(1189);
    e.exports = class {
      constructor() {
        (this._gestures = []),
          (this._state = new i()),
          (this._delayedTouchEventsEnabled = !0),
          (this._suppressClickEnabled = !1),
          (this._swiping = !1);
      }
      addGesture(e) {
        this._gestures.push(e);
      }
      setDelayedTouchEventsEnabled(e) {
        this._delayedTouchEventsEnabled = e;
      }
      setClickSuppressionEnabled(e) {
        this._suppressClickEnabled = e;
      }
      touchStart(e) {
        (this._swiping = !1),
          this._state.update(e),
          this._handleDelayedTouchStartEvent(e);
        const t = new o(e);
        this._delayedTouchEventsEnabled && !t.areThereMultipleTouchPoints()
          ? ((this._delayedTouchEvent = e),
            (this._delayedTouchEventTimeout = setTimeout(
              this._triggerDelayedTouchEvent.bind(this),
              50
            )))
          : this._execute("start", e);
      }
      touchMove(e) {
        (this._swiping = !0),
          this._state.update(e),
          this._handleDelayedTouchStartEvent(e),
          this._execute("move", e);
      }
      touchEnd(e) {
        this._state.update(e),
          this._handleDelayedTouchStartEvent(e),
          this._execute("end", e);
      }
      touchCancel(e) {
        this._state.update(e), this._execute("cancel", e);
      }
      gestureStart(e) {
        this._dropDelayedTouchEvent(), this._execute("gesture", e);
      }
      scroll(e) {
        this._swiping = !0;
      }
      _execute(e, t) {
        this._state.setSwiping(this._isSwiping());
        const n = new o(t),
          i = this._gestures.length;
        let a = !1;
        for (let t = 0; t < i; t++) {
          const o = this._gestures[t];
          try {
            if (a) {
              o.deactivate(n, this._state);
              continue;
            }
            if (
              ("start" === e &&
                (o.canActivate(n, this._state)
                  ? o.activate(n, this._state)
                  : o.deactivate(n, this._state)),
              !o.isActive())
            )
              continue;
            a = o[e](n, this._state);
          } catch (e) {
            console.error("GGestureHelper", e);
            try {
              o.deactivate(n, this._state);
            } catch (e) {
              console.warn("GGestureHelper deactivation", e);
            }
          }
        }
      }
      _isSwiping() {
        return !!this._suppressClickEnabled && this._swiping;
      }
      _handleDelayedTouchStartEvent(e) {
        this._delayedTouchEventTimeout &&
        new o(e).areThereMultipleTouchPointsOnTheTarget()
          ? this._dropDelayedTouchEvent()
          : this._triggerDelayedTouchEvent();
      }
      _triggerDelayedTouchEvent() {
        this._delayedTouchEventTimeout &&
          (clearTimeout(this._delayedTouchEventTimeout),
          (this._delayedTouchEventTimeout = null),
          this._delayedTouchEvent &&
            (this._execute("start", this._delayedTouchEvent),
            (this._delayedTouchEvent = null)));
      }
      _dropDelayedTouchEvent() {
        this._delayedTouchEventTimeout &&
          clearTimeout(this._delayedTouchEventTimeout),
          (this._delayedTouchEventTimeout = null),
          (this._delayedTouch = null);
      }
      hasActiveIdentifiers() {
        return this._state.hasActiveIdentifiers();
      }
    };
  }