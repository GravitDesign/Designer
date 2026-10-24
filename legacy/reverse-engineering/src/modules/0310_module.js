/**
 * Webpack Module #310
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    e.exports = function (e, t, n, o) {
      for (
        var i = (65535 & e) | 0, a = ((e >>> 16) & 65535) | 0, r = 0;
        0 !== n;

      ) {
        n -= r = n > 2e3 ? 2e3 : n;
        do {
          a = (a + (i = (i + t[o++]) | 0)) | 0;
        } while (--r);
        (i %= 65521), (a %= 65521);
      }
      return i | (a << 16) | 0;
    };
  }