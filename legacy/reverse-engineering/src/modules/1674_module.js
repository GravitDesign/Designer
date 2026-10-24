/**
 * Webpack Module #1674
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(26);
    class o extends Error {
      constructor() {
        super(...arguments),
          Error.captureStackTrace(this, o),
          (this.code = 57005);
      }
      static isPluginError(e) {
        return e && e.code && 57005 === e.code;
      }
    }
    e.exports = o;
  }