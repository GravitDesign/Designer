/**
 * Webpack Module #678
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(21),
      a = n(27),
      r = n(62),
      s = n(262).trim,
      l = n(248),
      c = o.parseInt,
      d = o.Symbol,
      u = d && d.iterator,
      p = /^[+-]?0x/i,
      g = a(p.exec),
      h =
        8 !== c(l + "08") ||
        22 !== c(l + "0x16") ||
        (u &&
          !i(function () {
            c(Object(u));
          }));
    e.exports = h
      ? function (e, t) {
          var n = s(r(e));
          return c(n, t >>> 0 || (g(p, n) ? 16 : 10));
        }
      : c;
  }