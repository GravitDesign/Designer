/**
 * Webpack Module #694
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(46),
      i = Math.floor;
    e.exports =
      Number.isInteger ||
      function (e) {
        return !o(e) && isFinite(e) && i(e) === e;
      };
  }