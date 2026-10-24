/**
 * Webpack Module #151
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(29),
      i = n(278),
      a = n(37),
      r = n(46),
      s = n(117),
      l = n(62),
      c = n(92),
      d = n(145),
      u = n(308),
      p = n(279);
    i("match", function (e, t, n) {
      return [
        function (t) {
          var n = c(this),
            i = r(t) ? d(t, e) : void 0;
          return i ? o(i, t, n) : new RegExp(t)[e](l(n));
        },
        function (e) {
          var o = a(this),
            i = l(e),
            r = n(t, o, i);
          if (r.done) return r.value;
          if (!o.global) return p(o, i);
          var c = o.unicode;
          o.lastIndex = 0;
          for (var d, g = [], h = 0; null !== (d = p(o, i)); ) {
            var f = l(d[0]);
            (g[h] = f),
              "" === f && (o.lastIndex = u(i, s(o.lastIndex), c)),
              h++;
          }
          return 0 === h ? null : g;
        },
      ];
    });
  }