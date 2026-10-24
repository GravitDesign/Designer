/**
 * Webpack Module #576
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(130),
      i = RangeError;
    e.exports = function (e) {
      var t = o(e);
      if (t < 0) throw new i("The argument can't be less than 0");
      return t;
    };
  }