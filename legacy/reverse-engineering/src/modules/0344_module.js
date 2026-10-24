/**
 * Webpack Module #344
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(21),
      i = n(23).RegExp,
      a = o(function () {
        var e = i("a", "y");
        return (e.lastIndex = 2), null !== e.exec("abcd");
      }),
      r =
        a ||
        o(function () {
          return !i("a", "y").sticky;
        }),
      s =
        a ||
        o(function () {
          var e = i("^r", "gy");
          return (e.lastIndex = 2), null !== e.exec("str");
        });
    e.exports = { BROKEN_CARET: s, MISSED_STICKY: r, UNSUPPORTED_Y: a };
  }