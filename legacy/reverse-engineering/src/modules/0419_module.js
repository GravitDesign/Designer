/**
 * Webpack Module #419
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(251).IteratorPrototype,
      i = n(136),
      a = n(174),
      r = n(137),
      s = n(203),
      l = function () {
        return this;
      };
    e.exports = function (e, t, n, c) {
      var d = t + " Iterator";
      return (
        (e.prototype = i(o, { next: a(+!c, n) })),
        r(e, d, !1, !0),
        (s[d] = l),
        e
      );
    };
  }