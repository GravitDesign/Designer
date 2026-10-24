/**
 * Webpack Module #672
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(348),
      i = n(302),
      a = n(46),
      r = n(43)("species"),
      s = Array;
    e.exports = function (e) {
      var t;
      return (
        o(e) &&
          ((t = e.constructor),
          ((i(t) && (t === s || o(t.prototype))) ||
            (a(t) && null === (t = t[r]))) &&
            (t = void 0)),
        void 0 === t ? s : t
      );
    };
  }