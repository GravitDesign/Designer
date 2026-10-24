/**
 * Webpack Module #234
 * Type: unknown
 */

function (e, t, n) {
    var o, i, a, r, s, l, c, d;
    e.exports =
      ((d = n(55)),
      n(537),
      n(538),
      (i = (o = d).lib),
      (a = i.Base),
      (r = i.WordArray),
      (s = o.algo),
      (l = s.MD5),
      (c = s.EvpKDF =
        a.extend({
          cfg: a.extend({ keySize: 4, hasher: l, iterations: 1 }),
          init: function (e) {
            this.cfg = this.cfg.extend(e);
          },
          compute: function (e, t) {
            for (
              var n = this.cfg,
                o = n.hasher.create(),
                i = r.create(),
                a = i.words,
                s = n.keySize,
                l = n.iterations;
              a.length < s;

            ) {
              c && o.update(c);
              var c = o.update(e).finalize(t);
              o.reset();
              for (var d = 1; d < l; d++) (c = o.finalize(c)), o.reset();
              i.concat(c);
            }
            return (i.sigBytes = 4 * s), i;
          },
        })),
      (o.EvpKDF = function (e, t, n) {
        return c.create(n).compute(e, t);
      }),
      d.EvpKDF);
  }