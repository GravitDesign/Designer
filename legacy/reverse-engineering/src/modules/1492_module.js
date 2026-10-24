/**
 * Webpack Module #1492
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    e.exports = class {
      constructor() {
        this._lastMousePoint = null;
      }
      init() {
        document.addEventListener(
          "mousemove",
          this._mouseMoveEventHandler.bind(this),
          !0
        );
      }
      _mouseMoveEventHandler(e) {
        let { pageX: t, pageY: n } = e;
        this._lastMousePoint = new o.GPoint(t, n);
      }
      getLastCursorPoint() {
        return this._lastMousePoint;
      }
    };
  }