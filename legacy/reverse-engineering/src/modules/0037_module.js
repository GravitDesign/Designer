/**
 * Webpack Module #37
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(46),
      i = String,
      a = TypeError;
    e.exports = function (e) {
      if (o(e)) return e;
      throw new a(i(e) + " is not an object");
    };
  }