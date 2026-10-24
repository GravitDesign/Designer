/**
 * Webpack Module #1155
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }), (t.default = void 0);
    class o {
      constructor() {
        (this._condition = () => !0), (this._finished = !1);
      }
      _do(e, t) {
        if (
          !this._abort &&
          !this._finished &&
          (this._condition(t) || e) &&
          (this._eventClass &&
            gDesigner.removeEventListener(this._eventClass, this._do, this),
          this._runnable)
        )
          try {
            this._runnable instanceof o
              ? this._runnable._do(e, t)
              : this._runnable();
          } finally {
            this._finished = !0;
          }
      }
      listen(e) {
        return (
          (this._eventClass = e),
          gDesigner.addEventListener(e, this._listenEvent, this),
          this
        );
      }
      _listenEvent(e) {
        this._do(!1, e);
      }
      when(e) {
        return (this._condition = e || this._condition), this;
      }
      do(e, t) {
        return (this._runnable = e), this._do(t), this;
      }
      abort() {
        return (
          (this._abort = !0),
          this._eventClass &&
            gDesigner.removeEventListener(
              this._eventClass,
              this._listenEvent,
              this
            ),
          this._runnable instanceof o && this._runnable.abort(),
          this
        );
      }
    }
    t.default = o;
  }