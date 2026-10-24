/**
 * Webpack Module #429
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(397),
      i = TypeError;
    e.exports = function (e) {
      var t = o(e, "number");
      if ("number" == typeof t) throw new i("Can't convert number to bigint");
      return BigInt(t);
    };
  }