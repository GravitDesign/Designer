/**
 * Webpack Module #241
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(110),
      i = n(35),
      a = n(144),
      r = n(398),
      s = Object;
    e.exports = r
      ? function (e) {
          return "symbol" == typeof e;
        }
      : function (e) {
          var t = o("Symbol");
          return i(t) && a(t.prototype, s(e));
        };
  }