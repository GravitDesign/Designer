/**
 * Webpack Module #323
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(37),
      i = n(102);
    e.exports = function (e, t, n, a) {
      try {
        return a ? t(o(n)[0], n[1]) : t(n);
      } catch (t) {
        i(e, "throw", t);
      }
    };
  }