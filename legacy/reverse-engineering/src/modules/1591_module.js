/**
 * Webpack Module #1591
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.default = void 0),
      n(19),
      n(26);
    class o extends Error {
      constructor() {
        super(...arguments),
          (this.constructor = o),
          (this.__proto__ = o.prototype),
          (this.name = "GMSTeamsModeUserNotFoundError");
      }
      toString() {
        return this.message;
      }
    }
    t.default = o;
  }