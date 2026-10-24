/**
 * Webpack Module #79
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(35),
      i = n(88),
      a = n(401),
      r = n(298);
    e.exports = function (e, t, n, s) {
      s || (s = {});
      var l = s.enumerable,
        c = void 0 !== s.name ? s.name : t;
      if ((o(n) && a(n, c, s), s.global)) l ? (e[t] = n) : r(t, n);
      else {
        try {
          s.unsafe ? e[t] && (l = !0) : delete e[t];
        } catch (e) {}
        l
          ? (e[t] = n)
          : i.f(e, t, {
              value: n,
              enumerable: !1,
              configurable: !s.nonConfigurable,
              writable: !s.nonWritable,
            });
      }
      return e;
    };
  }