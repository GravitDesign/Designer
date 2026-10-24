/**
 * Webpack Module #107
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(20);
    var o,
      i,
      a = n(25),
      r = n(29),
      s = n(35),
      l = n(37),
      c = n(62),
      d =
        ((o = !1),
        ((i = /[ac]/).exec = function () {
          return (o = !0), /./.exec.apply(this, arguments);
        }),
        !0 === i.test("abc") && o),
      u = /./.test;
    a(
      { target: "RegExp", proto: !0, forced: !d },
      {
        test: function (e) {
          var t = l(this),
            n = c(e),
            o = t.exec;
          if (!s(o)) return r(u, t, n);
          var i = r(o, t, n);
          return null !== i && (l(i), !0);
        },
      }
    );
  }