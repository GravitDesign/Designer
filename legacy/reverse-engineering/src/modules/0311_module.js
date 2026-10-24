/**
 * Webpack Module #311
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = (function () {
      for (var e, t = [], n = 0; n < 256; n++) {
        e = n;
        for (var o = 0; o < 8; o++)
          e = 1 & e ? 3988292384 ^ (e >>> 1) : e >>> 1;
        t[n] = e;
      }
      return t;
    })();
    e.exports = function (e, t, n, i) {
      var a = o,
        r = i + n;
      e ^= -1;
      for (var s = i; s < r; s++) e = (e >>> 8) ^ a[255 & (e ^ t[s])];
      return -1 ^ e;
    };
  }