/**
 * Webpack Module #26
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(421),
      a = n(422),
      r = n(19),
      s = n(100),
      l = n(137),
      c = n(43)("iterator"),
      d = r.values,
      u = function (e, t) {
        if (e) {
          if (e[c] !== d)
            try {
              s(e, c, d);
            } catch (t) {
              e[c] = d;
            }
          if ((l(e, t, !0), i[t]))
            for (var n in r)
              if (e[n] !== r[n])
                try {
                  s(e, n, r[n]);
                } catch (t) {
                  e[n] = r[n];
                }
        }
      };
    for (var p in i) u(o[p] && o[p].prototype, p);
    u(a, "DOMTokenList");
  }