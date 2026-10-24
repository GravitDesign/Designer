/**
 * Webpack Module #1047
 * Type: unknown
 */

function (e, t, n) {
    var o, i, a, r, s, l, c, d;
    e.exports =
      ((d = n(55)),
      n(382),
      n(737),
      (i = (o = d).x64),
      (a = i.Word),
      (r = i.WordArray),
      (s = o.algo),
      (l = s.SHA512),
      (c = s.SHA384 =
        l.extend({
          _doReset: function () {
            this._hash = new r.init([
              new a.init(3418070365, 3238371032),
              new a.init(1654270250, 914150663),
              new a.init(2438529370, 812702999),
              new a.init(355462360, 4144912697),
              new a.init(1731405415, 4290775857),
              new a.init(2394180231, 1750603025),
              new a.init(3675008525, 1694076839),
              new a.init(1203062813, 3204075428),
            ]);
          },
          _doFinalize: function () {
            var e = l._doFinalize.call(this);
            return (e.sigBytes -= 16), e;
          },
        })),
      (o.SHA384 = l._createHelper(c)),
      (o.HmacSHA384 = l._createHmacHelper(c)),
      d.SHA384);
  }