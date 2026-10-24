/**
 * Webpack Module #428
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(576),
      i = RangeError;
    e.exports = function (e, t) {
      var n = o(e);
      if (n % t) throw new i("Wrong offset");
      return n;
    };
  }