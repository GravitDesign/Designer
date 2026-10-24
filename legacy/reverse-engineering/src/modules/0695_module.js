/**
 * Webpack Module #695
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = Math.round;
    e.exports = function (e) {
      var t = o(e);
      return t < 0 ? 0 : t > 255 ? 255 : 255 & t;
    };
  }