/**
 * Webpack Module #880
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(15);
    e.exports = class {
      canActivate() {
        return !1;
      }
      activate(e, t) {
        this._active = !0;
      }
      deactivate(e, t) {
        this._active = !1;
      }
      isActive() {
        return this._active;
      }
      start(e, t) {}
      move(e, t) {}
      end(e, t) {}
      cancel(e, t) {}
      gesture(e, t) {}
      _dispatchEventFromTouch(e, t) {
        let n =
            arguments.length > 2 && void 0 !== arguments[2]
              ? arguments[2]
              : o.GMouseEvent.BUTTON_LEFT,
          i =
            !(arguments.length > 3 && void 0 !== arguments[3]) || arguments[3];
        const a = document.createEvent("MouseEvent");
        a.initMouseEvent(
          e,
          !0,
          i,
          window,
          1,
          t.screenX,
          t.screenY,
          t.clientX,
          t.clientY,
          !1,
          !1,
          !1,
          !1,
          n,
          null
        ),
          t.target.dispatchEvent(a);
      }
    };
  }