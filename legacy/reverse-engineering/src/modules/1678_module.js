/**
 * Webpack Module #1678
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    const o = n(1244),
      i = n(1679),
      a = n(1682),
      r = n(1683);
    e.exports = class {
      static newInAppPurchase(e) {
        switch (e) {
          case o.Windows:
            return new a();
          case o.Apple:
            return new r();
          default:
            return new i();
        }
      }
    };
  }