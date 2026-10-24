/**
 * Webpack Module #362
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(43)("match");
    e.exports = function (e) {
      var t = /./;
      try {
        "/./"[e](t);
      } catch (n) {
        try {
          return (t[o] = !1), "/./"[e](t);
        } catch (e) {}
      }
      return !1;
    };
  }