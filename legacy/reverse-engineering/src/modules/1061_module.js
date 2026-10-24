/**
 * Webpack Module #1061
 * Type: unknown
 */

function (e, t, n) {
    var o, i, a, r;
    e.exports =
      ((r = n(55)),
      n(98),
      (i = (o = r).lib.CipherParams),
      (a = o.enc.Hex),
      (o.format.Hex = {
        stringify: function (e) {
          return e.ciphertext.toString(a);
        },
        parse: function (e) {
          var t = a.parse(e);
          return i.create({ ciphertext: t });
        },
      }),
      r.format.Hex);
  }