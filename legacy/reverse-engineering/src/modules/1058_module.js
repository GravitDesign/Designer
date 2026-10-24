/**
 * Webpack Module #1058
 * Type: unknown
 */

function (e, t, n) {
    var o;
    e.exports =
      ((o = n(55)),
      n(98),
      (o.pad.Iso97971 = {
        pad: function (e, t) {
          e.concat(o.lib.WordArray.create([2147483648], 1)),
            o.pad.ZeroPadding.pad(e, t);
        },
        unpad: function (e) {
          o.pad.ZeroPadding.unpad(e), e.sigBytes--;
        },
      }),
      o.pad.Iso97971);
  }