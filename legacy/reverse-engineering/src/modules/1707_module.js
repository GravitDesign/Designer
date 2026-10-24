/**
 * Webpack Module #1707
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(29),
      a = n(37),
      r = n(143),
      s = n(1708),
      l = n(576),
      c = n(102),
      d = n(371),
      u = n(149),
      p = n(74),
      g = !p && u("drop", RangeError),
      h = d(function () {
        for (var e, t = this.iterator, n = this.next; this.remaining; )
          if ((this.remaining--, (e = a(i(n, t))), (this.done = !!e.done)))
            return;
        if (((e = a(i(n, t))), !(this.done = !!e.done))) return e.value;
      });
    o(
      { target: "Iterator", proto: !0, real: !0, forced: p || g },
      {
        drop: function (e) {
          var t;
          a(this);
          try {
            t = l(s(+e));
          } catch (e) {
            c(this, "throw", e);
          }
          return g ? i(g, this, t) : new h(r(this), { remaining: t });
        },
      }
    );
  }