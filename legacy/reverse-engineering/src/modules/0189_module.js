/**
 * Webpack Module #189
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(152),
      i = n(427),
      a = n(429),
      r = n(131),
      s = n(29),
      l = n(27),
      c = n(21),
      d = o.aTypedArray,
      u = o.exportTypedArrayMethod,
      p = l("".slice);
    u(
      "fill",
      function (e) {
        var t = arguments.length;
        d(this);
        var n = "Big" === p(r(this), 0, 3) ? a(e) : +e;
        return s(
          i,
          this,
          n,
          t > 1 ? arguments[1] : void 0,
          t > 2 ? arguments[2] : void 0
        );
      },
      c(function () {
        var e = 0;
        return (
          new Int8Array(2).fill({
            valueOf: function () {
              return e++;
            },
          }),
          1 !== e
        );
      })
    );
  }