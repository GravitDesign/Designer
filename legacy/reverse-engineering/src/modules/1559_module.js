/**
 * Webpack Module #1559
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(37),
      a = n(121),
      r = n(143),
      s = [].push;
    o(
      { target: "Iterator", proto: !0, real: !0 },
      {
        toArray: function () {
          var e = [];
          return a(r(i(this)), s, { that: e, IS_RECORD: !0 }), e;
        },
      }
    );
  }