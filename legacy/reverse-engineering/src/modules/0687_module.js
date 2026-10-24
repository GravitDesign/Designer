/**
 * Webpack Module #687
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(688);
    e.exports =
      Math.fround ||
      function (e) {
        return o(
          e,
          1.1920928955078125e-7,
          34028234663852886e22,
          11754943508222875e-54
        );
      };
  }