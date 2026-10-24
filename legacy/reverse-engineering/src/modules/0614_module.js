/**
 * Webpack Module #614
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(29),
      i = n(35),
      a = n(46),
      r = TypeError;
    e.exports = function (e, t) {
      var n, s;
      if ("string" === t && i((n = e.toString)) && !a((s = o(n, e)))) return s;
      if (i((n = e.valueOf)) && !a((s = o(n, e)))) return s;
      if ("string" !== t && i((n = e.toString)) && !a((s = o(n, e)))) return s;
      throw new r("Can't convert object to primitive value");
    };
  }