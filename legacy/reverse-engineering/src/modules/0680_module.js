/**
 * Webpack Module #680
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(29),
      a = n(65),
      r = n(37),
      s = n(143),
      l = n(371),
      c = n(323),
      d = n(102),
      u = n(149),
      p = n(74),
      g = !p && u("map", TypeError),
      h = l(function () {
        var e = this.iterator,
          t = r(i(this.next, e));
        if (!(this.done = !!t.done))
          return c(e, this.mapper, [t.value, this.counter++], !0);
      });
    o(
      { target: "Iterator", proto: !0, real: !0, forced: p || g },
      {
        map: function (e) {
          r(this);
          try {
            a(e);
          } catch (e) {
            d(this, "throw", e);
          }
          return g ? i(g, this, e) : new h(s(this), { mapper: e });
        },
      }
    );
  }