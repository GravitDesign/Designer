/**
 * Webpack Module #341
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(61),
      i = n(615),
      a = n(222),
      r = n(88);
    e.exports = function (e, t, n) {
      for (var s = i(t), l = r.f, c = a.f, d = 0; d < s.length; d++) {
        var u = s[d];
        o(e, u) || (n && o(n, u)) || l(e, u, c(t, u));
      }
    };
  }