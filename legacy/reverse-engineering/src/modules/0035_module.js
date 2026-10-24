/**
 * Webpack Module #35
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = "object" == typeof document && document.all;
    e.exports =
      void 0 === o && void 0 !== o
        ? function (e) {
            return "function" == typeof e || e === o;
          }
        : function (e) {
            return "function" == typeof e;
          };
  }