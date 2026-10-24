/**
 * Webpack Module #594
 * Type: class
 * Name: GError
 */

function (e, t, n) {
    "use strict";
    n.r(t);
    class o extends Error {
      constructor(...e) {
        super(...e),
          (this.constructor = o),
          (this.__proto__ = o.prototype),
          (this.name = "GError");
      }
      toString() {
        return "[Object GError]";
      }
    }
    t.default = o;
  }