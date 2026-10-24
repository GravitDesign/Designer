/**
 * Webpack Module #1104
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(21),
      i = n(46),
      a = n(116),
      r = n(1105),
      s = Object.isExtensible,
      l = o(function () {
        s(1);
      });
    e.exports =
      l || r
        ? function (e) {
            return !!i(e) && (!r || "ArrayBuffer" !== a(e)) && (!s || s(e));
          }
        : s;
  }