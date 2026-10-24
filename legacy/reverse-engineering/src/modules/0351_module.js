/**
 * Webpack Module #351
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(157),
      i = Math.floor,
      a = function (e, t) {
        var n = e.length;
        if (n < 8)
          for (var r, s, l = 1; l < n; ) {
            for (s = l, r = e[l]; s && t(e[s - 1], r) > 0; ) e[s] = e[--s];
            s !== l++ && (e[s] = r);
          }
        else
          for (
            var c = i(n / 2),
              d = a(o(e, 0, c), t),
              u = a(o(e, c), t),
              p = d.length,
              g = u.length,
              h = 0,
              f = 0;
            h < p || f < g;

          )
            e[h + f] =
              h < p && f < g
                ? t(d[h], u[f]) <= 0
                  ? d[h++]
                  : u[f++]
                : h < p
                ? d[h++]
                : u[f++];
        return e;
      };
    e.exports = a;
  }