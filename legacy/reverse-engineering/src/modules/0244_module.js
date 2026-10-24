/**
 * Webpack Module #244
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(130),
      i = Math.max,
      a = Math.min;
    e.exports = function (e, t) {
      var n = o(e);
      return n < 0 ? i(n + t, 0) : a(n, t);
    };
  }