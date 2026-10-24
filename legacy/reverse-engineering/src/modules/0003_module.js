/**
 * Webpack Module #3
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(199).PROPER,
      i = n(79),
      a = n(37),
      r = n(62),
      s = n(21),
      l = n(460),
      c = RegExp.prototype,
      d = c.toString,
      u = s(function () {
        return "/a/b" !== d.call({ source: "a", flags: "b" });
      }),
      p = o && "toString" !== d.name;
    (u || p) &&
      i(
        c,
        "toString",
        function () {
          var e = a(this);
          return "/" + r(e.source) + "/" + r(l(e));
        },
        { unsafe: !0 }
      );
  }