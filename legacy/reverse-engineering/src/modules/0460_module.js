/**
 * Webpack Module #460
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(29),
      i = n(61),
      a = n(144),
      r = n(307),
      s = RegExp.prototype;
    e.exports = function (e) {
      var t = e.flags;
      return void 0 !== t || "flags" in s || i(e, "flags") || !a(s, e)
        ? t
        : o(r, e);
    };
  }