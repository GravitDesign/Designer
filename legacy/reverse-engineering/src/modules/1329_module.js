/**
 * Webpack Module #1329
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = o(n(880)),
      a = o(n(1189));
    class r extends i.default {
      canActivate() {
        return !0;
      }
      activate(e, t) {
        super.activate(e, t), (this._panState = new a.default());
      }
      deactivate(e, t) {
        super.deactivate(e, t), (this._panState = null);
      }
      start(e, t) {
        this._panState && this._panState.update(e.getOriginalEvent());
      }
      move(e, t) {
        this._panState &&
          e.isCancelable() &&
          e.iterateChangedTouches((e) => {
            this._panState.hasActiveIdentifier(e) &&
              this._dispatchEventFromTouch("mousemove", e);
          });
      }
      end(e, t) {
        super.end(e, t), (this._panState = null);
      }
      cancel(e, t) {
        super.cancel(e, t), (this._panState = null);
      }
    }
    e.exports = r;
  }