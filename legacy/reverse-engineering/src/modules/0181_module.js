/**
 * Webpack Module #181
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(223),
      a = n(21),
      r = n(324),
      s = n(37),
      l = n(244),
      c = n(117),
      d = r.ArrayBuffer,
      u = r.DataView,
      p = u.prototype,
      g = i(d.prototype.slice),
      h = i(p.getUint8),
      f = i(p.setUint8);
    o(
      {
        target: "ArrayBuffer",
        proto: !0,
        unsafe: !0,
        forced: a(function () {
          return !new d(2).slice(1, void 0).byteLength;
        }),
      },
      {
        slice: function (e, t) {
          if (g && void 0 === t) return g(s(this), e);
          for (
            var n = s(this).byteLength,
              o = l(e, n),
              i = l(void 0 === t ? n : t, n),
              a = new d(c(i - o)),
              r = new u(this),
              p = new u(a),
              m = 0;
            o < i;

          )
            f(p, m++, h(r, o++));
          return a;
        },
      }
    );
  }