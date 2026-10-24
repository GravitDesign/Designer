/**
 * Webpack Module #271
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o,
      i = n(25),
      a = n(223),
      r = n(222).f,
      s = n(117),
      l = n(62),
      c = n(361),
      d = n(92),
      u = n(362),
      p = n(74),
      g = a("".slice),
      h = Math.min,
      f = u("endsWith");
    i(
      {
        target: "String",
        proto: !0,
        forced:
          !!(
            p ||
            f ||
            ((o = r(String.prototype, "endsWith")), !o || o.writable)
          ) && !f,
      },
      {
        endsWith: function (e) {
          var t = l(d(this));
          c(e);
          var n = arguments.length > 1 ? arguments[1] : void 0,
            o = t.length,
            i = void 0 === n ? o : h(s(n), o),
            a = l(e);
          return g(t, i - a.length, i) === a;
        },
      }
    );
  }