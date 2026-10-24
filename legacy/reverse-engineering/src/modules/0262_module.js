/**
 * Webpack Module #262
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(27),
      i = n(92),
      a = n(62),
      r = n(248),
      s = o("".replace),
      l = RegExp("^[" + r + "]+"),
      c = RegExp("(^|[^" + r + "])[" + r + "]+$"),
      d = function (e) {
        return function (t) {
          var n = a(i(t));
          return 1 & e && (n = s(n, l, "")), 2 & e && (n = s(n, c, "$1")), n;
        };
      };
    e.exports = { start: d(1), end: d(2), trim: d(3) };
  }