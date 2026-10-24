/**
 * Webpack Module #1059
 * Type: unknown
 */

function (e, t, n) {
    var o;
    e.exports =
      ((o = n(55)),
      n(98),
      (o.pad.ZeroPadding = {
        pad: function (e, t) {
          var n = 4 * t;
          e.clamp(), (e.sigBytes += n - (e.sigBytes % n || n));
        },
        unpad: function (e) {
          for (
            var t = e.words, n = e.sigBytes - 1;
            !((t[n >>> 2] >>> (24 - (n % 4) * 8)) & 255);

          )
            n--;
          e.sigBytes = n + 1;
        },
      }),
      o.pad.ZeroPadding);
  }