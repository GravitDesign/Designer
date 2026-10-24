/**
 * Webpack Module #246
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(29),
      i = n(65),
      a = n(37),
      r = n(185),
      s = n(204),
      l = TypeError;
    e.exports = function (e, t) {
      var n = arguments.length < 2 ? s(e) : t;
      if (i(n)) return a(o(n, e));
      throw new l(r(e) + " is not iterable");
    };
  }