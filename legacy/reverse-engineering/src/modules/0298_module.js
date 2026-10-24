/**
 * Webpack Module #298
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = Object.defineProperty;
    e.exports = function (e, t) {
      try {
        i(o, e, { value: t, configurable: !0, writable: !0 });
      } catch (n) {
        o[e] = t;
      }
      return t;
    };
  }