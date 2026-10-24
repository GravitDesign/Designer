/**
 * Webpack Module #536
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    e.exports = class {
      constructor(e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0;
        (this._factory = e), (this._timeout = t), (this._lastCheckTime = 0);
      }
      get() {
        if (this._timeout) {
          const e = Date.now();
          this._lastCheckTime || (this._lastCheckTime = e);
          e - this._lastCheckTime >= this._timeout &&
            (this.reset(), (this._lastCheckTime = e));
        }
        return (
          this._promise ||
            (this._promise = this._factory.apply(this._factory, arguments)),
          this._promise
        );
      }
      reset() {
        this._promise = null;
      }
      setCacheValue(e) {
        this.reset(),
          (this._lastCheckTime = Date.now()),
          (this._promise = Promise.resolve(e));
      }
    };
  }