/**
 * Webpack Module #683
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(121),
      a = n(65),
      r = n(37),
      s = n(143),
      l = n(102),
      c = n(149),
      d = n(200),
      u = n(21),
      p = TypeError,
      g = u(function () {
        [].keys().reduce(function () {}, void 0);
      }),
      h = !g && c("reduce", p);
    o(
      { target: "Iterator", proto: !0, real: !0, forced: g || h },
      {
        reduce: function (e) {
          r(this);
          try {
            a(e);
          } catch (e) {
            l(this, "throw", e);
          }
          var t = arguments.length < 2,
            n = t ? void 0 : arguments[1];
          if (h) return d(h, this, t ? [e] : [e, n]);
          var o = s(this),
            c = 0;
          if (
            (i(
              o,
              function (o) {
                t ? ((t = !1), (n = o)) : (n = e(n, o, c)), c++;
              },
              { IS_RECORD: !0 }
            ),
            t)
          )
            throw new p("Reduce of empty iterator with no initial value");
          return n;
        },
      }
    );
  }