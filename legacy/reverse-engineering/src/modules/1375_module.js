/**
 * Webpack Module #1375
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(348),
      i = n(101),
      a = n(1376),
      r = n(124),
      s = function (e, t, n, l, c, d, u, p) {
        for (var g, h, f = c, m = 0, y = !!u && r(u, p); m < l; )
          m in n &&
            ((g = y ? y(n[m], m, t) : n[m]),
            d > 0 && o(g)
              ? ((h = i(g)), (f = s(e, t, g, h, f, d - 1) - 1))
              : (a(f + 1), (e[f] = g)),
            f++),
            m++;
        return f;
      };
    e.exports = s;
  }