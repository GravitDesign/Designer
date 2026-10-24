/**
 * Webpack Module #667
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(27),
      i = n(93),
      a = Math.floor,
      r = o("".charAt),
      s = o("".replace),
      l = o("".slice),
      c = /\$([$&'`]|\d{1,2}|<[^>]*>)/g,
      d = /\$([$&'`]|\d{1,2})/g;
    e.exports = function (e, t, n, o, u, p) {
      var g = n + e.length,
        h = o.length,
        f = d;
      return (
        void 0 !== u && ((u = i(u)), (f = c)),
        s(p, f, function (i, s) {
          var c;
          switch (r(s, 0)) {
            case "$":
              return "$";
            case "&":
              return e;
            case "`":
              return l(t, 0, n);
            case "'":
              return l(t, g);
            case "<":
              c = u[l(s, 1, -1)];
              break;
            default:
              var d = +s;
              if (0 === d) return i;
              if (d > h) {
                var p = a(d / 10);
                return 0 === p
                  ? i
                  : p <= h
                  ? void 0 === o[p - 1]
                    ? r(s, 1)
                    : o[p - 1] + r(s, 1)
                  : i;
              }
              c = o[d - 1];
          }
          return void 0 === c ? "" : c;
        })
      );
    };
  }