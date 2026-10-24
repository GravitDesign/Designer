/**
 * Webpack Module #691
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = Array,
      i = Math.abs,
      a = Math.pow,
      r = Math.floor,
      s = Math.log,
      l = Math.LN2;
    e.exports = {
      pack: function (e, t, n) {
        var c,
          d,
          u,
          p = o(n),
          g = 8 * n - t - 1,
          h = (1 << g) - 1,
          f = h >> 1,
          m = 23 === t ? a(2, -24) - a(2, -77) : 0,
          y = e < 0 || (0 === e && 1 / e < 0) ? 1 : 0,
          v = 0;
        for (
          (e = i(e)) != e || e === 1 / 0
            ? ((d = e != e ? 1 : 0), (c = h))
            : ((c = r(s(e) / l)),
              e * (u = a(2, -c)) < 1 && (c--, (u *= 2)),
              (e += c + f >= 1 ? m / u : m * a(2, 1 - f)) * u >= 2 &&
                (c++, (u /= 2)),
              c + f >= h
                ? ((d = 0), (c = h))
                : c + f >= 1
                ? ((d = (e * u - 1) * a(2, t)), (c += f))
                : ((d = e * a(2, f - 1) * a(2, t)), (c = 0)));
          t >= 8;

        )
          (p[v++] = 255 & d), (d /= 256), (t -= 8);
        for (c = (c << t) | d, g += t; g > 0; )
          (p[v++] = 255 & c), (c /= 256), (g -= 8);
        return (p[v - 1] |= 128 * y), p;
      },
      unpack: function (e, t) {
        var n,
          o = e.length,
          i = 8 * o - t - 1,
          r = (1 << i) - 1,
          s = r >> 1,
          l = i - 7,
          c = o - 1,
          d = e[c--],
          u = 127 & d;
        for (d >>= 7; l > 0; ) (u = 256 * u + e[c--]), (l -= 8);
        for (n = u & ((1 << -l) - 1), u >>= -l, l += t; l > 0; )
          (n = 256 * n + e[c--]), (l -= 8);
        if (0 === u) u = 1 - s;
        else {
          if (u === r) return n ? NaN : d ? -1 / 0 : 1 / 0;
          (n += a(2, t)), (u -= s);
        }
        return (d ? -1 : 1) * n * a(2, u - t);
      },
    };
  }