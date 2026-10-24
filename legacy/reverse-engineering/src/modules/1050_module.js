/**
 * Webpack Module #1050
 * Type: unknown
 */

function (e, t, n) {
    var o, i, a, r, s, l, c, d, u;
    e.exports =
      ((u = n(55)),
      n(537),
      n(538),
      (i = (o = u).lib),
      (a = i.Base),
      (r = i.WordArray),
      (s = o.algo),
      (l = s.SHA1),
      (c = s.HMAC),
      (d = s.PBKDF2 =
        a.extend({
          cfg: a.extend({ keySize: 4, hasher: l, iterations: 1 }),
          init: function (e) {
            this.cfg = this.cfg.extend(e);
          },
          compute: function (e, t) {
            for (
              var n = this.cfg,
                o = c.create(n.hasher, e),
                i = r.create(),
                a = r.create([1]),
                s = i.words,
                l = a.words,
                d = n.keySize,
                u = n.iterations;
              s.length < d;

            ) {
              var p = o.update(t).finalize(a);
              o.reset();
              for (var g = p.words, h = g.length, f = p, m = 1; m < u; m++) {
                (f = o.finalize(f)), o.reset();
                for (var y = f.words, v = 0; v < h; v++) g[v] ^= y[v];
              }
              i.concat(p), l[0]++;
            }
            return (i.sigBytes = 4 * d), i;
          },
        })),
      (o.PBKDF2 = function (e, t, n) {
        return d.create(n).compute(e, t);
      }),
      u.PBKDF2);
  }