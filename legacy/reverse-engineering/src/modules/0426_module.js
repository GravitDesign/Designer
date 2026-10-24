/**
 * Webpack Module #426
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(130),
      i = n(117),
      a = RangeError;
    e.exports = function (e) {
      if (void 0 === e) return 0;
      var t = o(e),
        n = i(t);
      if (t !== n) throw new a("Wrong length or index");
      return n;
    };
  }