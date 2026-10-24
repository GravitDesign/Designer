/**
 * Webpack Module #1091
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    e.exports = class {
      constructor() {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0],
          t = arguments.length > 1 ? arguments[1] : void 0;
        (this._status = e), (this._statusText = t);
      }
      isAuthorized() {
        return !!this._status;
      }
      getStatusText() {
        return this._statusText;
      }
      hasStatusText() {
        return !!this._statusText;
      }
    };
  }