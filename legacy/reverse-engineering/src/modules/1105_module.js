/**
 * Webpack Module #1105
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(21);
    e.exports = o(function () {
      if ("function" == typeof ArrayBuffer) {
        var e = new ArrayBuffer(8);
        Object.isExtensible(e) && Object.defineProperty(e, "a", { value: 8 });
      }
    });
  }