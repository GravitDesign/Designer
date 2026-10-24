/**
 * Webpack Module #191
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(223),
      a = n(21),
      r = n(65),
      s = n(351),
      l = n(152),
      c = n(521),
      d = n(522),
      u = n(213),
      p = n(523),
      g = l.aTypedArray,
      h = l.exportTypedArrayMethod,
      f = o.Uint16Array,
      m = f && i(f.prototype.sort),
      y = !(
        !m ||
        (a(function () {
          m(new f(2), null);
        }) &&
          a(function () {
            m(new f(2), {});
          }))
      ),
      v =
        !!m &&
        !a(function () {
          if (u) return u < 74;
          if (c) return c < 67;
          if (d) return !0;
          if (p) return p < 602;
          var e,
            t,
            n = new f(516),
            o = Array(516);
          for (e = 0; e < 516; e++)
            (t = e % 4), (n[e] = 515 - e), (o[e] = e - 2 * t + 3);
          for (
            m(n, function (e, t) {
              return ((e / 4) | 0) - ((t / 4) | 0);
            }),
              e = 0;
            e < 516;
            e++
          )
            if (n[e] !== o[e]) return !0;
        });
    h(
      "sort",
      function (e) {
        return (
          void 0 !== e && r(e),
          v
            ? m(this, e)
            : s(
                g(this),
                (function (e) {
                  return function (t, n) {
                    return void 0 !== e
                      ? +e(t, n) || 0
                      : n != n
                      ? -1
                      : t != t
                      ? 1
                      : 0 === t && 0 === n
                      ? 1 / t > 0 && 1 / n < 0
                        ? 1
                        : -1
                      : t > n;
                  };
                })(e)
              )
        );
      },
      !v || y
    );
  }