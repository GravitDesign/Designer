/**
 * Webpack Module #258
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(27),
      i = 0,
      a = Math.random(),
      r = o((1).toString);
    e.exports = function (e) {
      return "Symbol(" + (void 0 === e ? "" : e) + ")_" + r(++i + a, 36);
    };
  }