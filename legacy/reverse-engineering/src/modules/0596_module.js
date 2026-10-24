/**
 * Webpack Module #596
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(27),
      a = n(348),
      r = i([].reverse),
      s = [1, 2];
    o(
      { target: "Array", proto: !0, forced: String(s) === String(s.reverse()) },
      {
        reverse: function () {
          return a(this) && (this.length = this.length), r(this);
        },
      }
    );
  }