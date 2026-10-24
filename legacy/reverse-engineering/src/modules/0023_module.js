/**
 * Webpack Module #23
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    (function (t) {
      var n = function (e) {
        return e && e.Math === Math && e;
      };
      e.exports =
        n("object" == typeof globalThis && globalThis) ||
        n("object" == typeof window && window) ||
        n("object" == typeof self && self) ||
        n("object" == typeof t && t) ||
        n("object" == typeof this && this) ||
        (function () {
          return this;
        })() ||
        Function("return this")();
    }).call(this, n(109));
  }