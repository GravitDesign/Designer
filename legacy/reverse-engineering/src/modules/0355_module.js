/**
 * Webpack Module #355
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n.r(t);
    class o extends Error {
      constructor(...e) {
        super(...e),
          (this.constructor = o),
          (this.__proto__ = o.prototype),
          (this.name = "AppError");
      }
      toString() {
        return this.message;
      }
    }
    t.default = o;
  }