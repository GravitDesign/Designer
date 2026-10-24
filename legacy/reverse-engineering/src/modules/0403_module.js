/**
 * Webpack Module #403
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(184),
      i = n(244),
      a = n(101),
      r = function (e) {
        return function (t, n, r) {
          var s = o(t),
            l = a(s);
          if (0 === l) return !e && -1;
          var c,
            d = i(r, l);
          if (e && n != n) {
            for (; l > d; ) if ((c = s[d++]) != c) return !0;
          } else
            for (; l > d; d++)
              if ((e || d in s) && s[d] === n) return e || d || 0;
          return !e && -1;
        };
      };
    e.exports = { includes: r(!0), indexOf: r(!1) };
  }