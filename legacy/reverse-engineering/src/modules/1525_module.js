/**
 * Webpack Module #1525
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(130),
      i = n(62),
      a = n(92),
      r = RangeError;
    e.exports = function (e) {
      var t = i(a(this)),
        n = "",
        s = o(e);
      if (s < 0 || s === 1 / 0) throw new r("Wrong number of repetitions");
      for (; s > 0; (s >>>= 1) && (t += t)) 1 & s && (n += t);
      return n;
    };
  }