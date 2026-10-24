/**
 * Webpack Module #1583
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    e.exports = class {
      constructor(e) {
        this._event = e;
      }
      areThereTwoTouchPoints() {
        return 2 === this._event.touches.length;
      }
      areThereTwoTouchPointsOnTheTarget() {
        return 2 === this._event.targetTouches.length;
      }
      areThereMultipleTouchPointsOnTheTarget() {
        return this._event.targetTouches.length > 1;
      }
      isThereOneTouchPointOnTheTarget() {
        return 1 === this._event.targetTouches.length;
      }
      areThereMultipleTouchPoints() {
        return this._event.touches.length > 1;
      }
      getOriginalEvent() {
        return this._event;
      }
      iterateChangedTouches(e) {
        const t = this._event.changedTouches,
          n = t.length;
        for (let o = 0; o < n && !1 !== e(t[o]); o++);
      }
      isTrusted() {
        return this._event.isTrusted;
      }
      isCancelable() {
        return this._event.cancelable;
      }
    };
  }