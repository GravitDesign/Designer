/**
 * Webpack Module #302
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(27),
      i = n(21),
      a = n(35),
      r = n(131),
      s = n(110),
      l = n(299),
      c = function () {},
      d = s("Reflect", "construct"),
      u = /^\s*(?:class|function)\b/,
      p = o(u.exec),
      g = !u.test(c),
      h = function (e) {
        if (!a(e)) return !1;
        try {
          return d(c, [], e), !0;
        } catch (e) {
          return !1;
        }
      },
      f = function (e) {
        if (!a(e)) return !1;
        switch (r(e)) {
          case "AsyncFunction":
          case "GeneratorFunction":
          case "AsyncGeneratorFunction":
            return !1;
        }
        try {
          return g || !!p(u, l(e));
        } catch (e) {
          return !0;
        }
      };
    (f.sham = !0),
      (e.exports =
        !d ||
        i(function () {
          var e;
          return (
            h(h.call) ||
            !h(Object) ||
            !h(function () {
              e = !0;
            }) ||
            e
          );
        })
          ? f
          : h);
  }