/**
 * Webpack Module #1056
 * Type: unknown
 */

function (e, t, n) {
    var o;
    e.exports =
      ((o = n(55)),
      n(98),
      (o.pad.AnsiX923 = {
        pad: function (e, t) {
          var n = e.sigBytes,
            o = 4 * t,
            i = o - (n % o),
            a = n + i - 1;
          e.clamp(),
            (e.words[a >>> 2] |= i << (24 - (a % 4) * 8)),
            (e.sigBytes += i);
        },
        unpad: function (e) {
          var t = 255 & e.words[(e.sigBytes - 1) >>> 2];
          e.sigBytes -= t;
        },
      }),
      o.pad.Ansix923);
  }