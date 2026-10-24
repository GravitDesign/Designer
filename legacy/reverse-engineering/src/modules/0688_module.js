/**
 * Webpack Module #688
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(689),
      i = n(690),
      a = Math.abs;
    e.exports = function (e, t, n, r) {
      var s = +e,
        l = a(s),
        c = o(s);
      if (l < r) return c * i(l / r / t) * r * t;
      var d = (1 + t / 2220446049250313e-31) * l,
        u = d - (d - l);
      return u > n || u != u ? c * (1 / 0) : c * u;
    };
  }