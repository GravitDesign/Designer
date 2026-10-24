/**
 * Webpack Module #110
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(35),
      a = function (e) {
        return i(e) ? e : void 0;
      };
    e.exports = function (e, t) {
      return arguments.length < 2 ? a(o[e]) : o[e] && o[e][t];
    };
  }