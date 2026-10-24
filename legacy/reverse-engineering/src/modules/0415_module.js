/**
 * Webpack Module #415
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(49),
      i = n(27),
      a = n(29),
      r = n(21),
      s = n(405),
      l = n(404),
      c = n(396),
      d = n(93),
      u = n(240),
      p = Object.assign,
      g = Object.defineProperty,
      h = i([].concat);
    e.exports =
      !p ||
      r(function () {
        if (
          o &&
          1 !==
            p(
              { b: 1 },
              p(
                g({}, "a", {
                  enumerable: !0,
                  get: function () {
                    g(this, "b", { value: 3, enumerable: !1 });
                  },
                }),
                { b: 2 }
              )
            ).b
        )
          return !0;
        var e = {},
          t = {},
          n = Symbol("assign detection");
        return (
          (e[n] = 7),
          "abcdefghijklmnopqrst".split("").forEach(function (e) {
            t[e] = e;
          }),
          7 !== p({}, e)[n] || "abcdefghijklmnopqrst" !== s(p({}, t)).join("")
        );
      })
        ? function (e, t) {
            for (
              var n = d(e), i = arguments.length, r = 1, p = l.f, g = c.f;
              i > r;

            )
              for (
                var f,
                  m = u(arguments[r++]),
                  y = p ? h(s(m), p(m)) : s(m),
                  v = y.length,
                  _ = 0;
                v > _;

              )
                (f = y[_++]), (o && !a(g, m, f)) || (n[f] = m[f]);
            return n;
          }
        : p;
  }