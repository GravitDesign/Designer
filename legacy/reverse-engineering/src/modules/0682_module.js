/**
 * Webpack Module #682
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
      d = n(74),
      u = n(102),
      p = n(149),
      g = !d && p("filter", TypeError),
      h = l(function () {
        for (
          var e, t, n = this.iterator, o = this.predicate, a = this.next;
          ;

        ) {
          if (((e = r(i(a, n))), (this.done = !!e.done))) return;
          if (((t = e.value), c(n, o, [t, this.counter++], !0))) return t;
        }
      });
    o(
      { target: "Iterator", proto: !0, real: !0, forced: d || g },
      {
        filter: function (e) {
          r(this);
          try {
            a(e);
          } catch (e) {
            u(this, "throw", e);
          }
          return g ? i(g, this, e) : new h(s(this), { predicate: e });
        },
      }
    );
  }