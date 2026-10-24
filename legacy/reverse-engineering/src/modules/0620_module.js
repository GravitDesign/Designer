/**
 * Webpack Module #620
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(621),
      i = String,
      a = TypeError;
    e.exports = function (e) {
      if (o(e)) return e;
      throw new a("Can't set " + i(e) + " as a prototype");
    };
  }