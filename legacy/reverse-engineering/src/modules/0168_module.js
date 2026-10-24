/**
 * Webpack Module #168
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(681).left,
      a = n(350),
      r = n(213);
    o(
      {
        target: "Array",
        proto: !0,
        forced: (!n(245) && r > 79 && r < 83) || !a("reduce"),
      },
      {
        reduce: function (e) {
          var t = arguments.length;
          return i(this, e, t, t > 1 ? arguments[1] : void 0);
        },
      }
    );
  }