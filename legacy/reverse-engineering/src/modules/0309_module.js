/**
 * Webpack Module #309
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(27),
      i = n(130),
      a = n(62),
      r = n(92),
      s = o("".charAt),
      l = o("".charCodeAt),
      c = o("".slice),
      d = function (e) {
        return function (t, n) {
          var o,
            d,
            u = a(r(t)),
            p = i(n),
            g = u.length;
          return p < 0 || p >= g
            ? e
              ? ""
              : void 0
            : (o = l(u, p)) < 55296 ||
              o > 56319 ||
              p + 1 === g ||
              (d = l(u, p + 1)) < 56320 ||
              d > 57343
            ? e
              ? s(u, p)
              : o
            : e
            ? c(u, p, p + 2)
            : d - 56320 + ((o - 55296) << 10) + 65536;
        };
      };
    e.exports = { codeAt: d(!1), charAt: d(!0) };
  }