/**
 * Webpack Module #515
 * Type: unknown
 */

function (e, t) {
    (t.read = function (e, t, n, o, i) {
      var a,
        r,
        s = 8 * i - o - 1,
        l = (1 << s) - 1,
        c = l >> 1,
        d = -7,
        u = n ? i - 1 : 0,
        p = n ? -1 : 1,
        g = e[t + u];
      for (
        u += p, a = g & ((1 << -d) - 1), g >>= -d, d += s;
        d > 0;
        a = 256 * a + e[t + u], u += p, d -= 8
      );
      for (
        r = a & ((1 << -d) - 1), a >>= -d, d += o;
        d > 0;
        r = 256 * r + e[t + u], u += p, d -= 8
      );
      if (0 === a) a = 1 - c;
      else {
        if (a === l) return r ? NaN : (1 / 0) * (g ? -1 : 1);
        (r += Math.pow(2, o)), (a -= c);
      }
      return (g ? -1 : 1) * r * Math.pow(2, a - o);
    }),
      (t.write = function (e, t, n, o, i, a) {
        var r,
          s,
          l,
          c = 8 * a - i - 1,
          d = (1 << c) - 1,
          u = d >> 1,
          p = 23 === i ? Math.pow(2, -24) - Math.pow(2, -77) : 0,
          g = o ? 0 : a - 1,
          h = o ? 1 : -1,
          f = t < 0 || (0 === t && 1 / t < 0) ? 1 : 0;
        for (
          t = Math.abs(t),
            isNaN(t) || t === 1 / 0
              ? ((s = isNaN(t) ? 1 : 0), (r = d))
              : ((r = Math.floor(Math.log(t) / Math.LN2)),
                t * (l = Math.pow(2, -r)) < 1 && (r--, (l *= 2)),
                (t += r + u >= 1 ? p / l : p * Math.pow(2, 1 - u)) * l >= 2 &&
                  (r++, (l /= 2)),
                r + u >= d
                  ? ((s = 0), (r = d))
                  : r + u >= 1
                  ? ((s = (t * l - 1) * Math.pow(2, i)), (r += u))
                  : ((s = t * Math.pow(2, u - 1) * Math.pow(2, i)), (r = 0)));
          i >= 8;
          e[n + g] = 255 & s, g += h, s /= 256, i -= 8
        );
        for (
          r = (r << i) | s, c += i;
          c > 0;
          e[n + g] = 255 & r, g += h, r /= 256, c -= 8
        );
        e[n + g - h] |= 128 * f;
      });
  }