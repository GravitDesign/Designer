/**
 * Webpack Module #537
 * Type: unknown
 */

function (e, t, n) {
    var o, i, a, r, s, l, c, d;
    e.exports =
      ((d = n(55)),
      (i = (o = d).lib),
      (a = i.WordArray),
      (r = i.Hasher),
      (s = o.algo),
      (l = []),
      (c = s.SHA1 =
        r.extend({
          _doReset: function () {
            this._hash = new a.init([
              1732584193, 4023233417, 2562383102, 271733878, 3285377520,
            ]);
          },
          _doProcessBlock: function (e, t) {
            for (
              var n = this._hash.words,
                o = n[0],
                i = n[1],
                a = n[2],
                r = n[3],
                s = n[4],
                c = 0;
              c < 80;
              c++
            ) {
              if (c < 16) l[c] = 0 | e[t + c];
              else {
                var d = l[c - 3] ^ l[c - 8] ^ l[c - 14] ^ l[c - 16];
                l[c] = (d << 1) | (d >>> 31);
              }
              var u = ((o << 5) | (o >>> 27)) + s + l[c];
              (u +=
                c < 20
                  ? 1518500249 + ((i & a) | (~i & r))
                  : c < 40
                  ? 1859775393 + (i ^ a ^ r)
                  : c < 60
                  ? ((i & a) | (i & r) | (a & r)) - 1894007588
                  : (i ^ a ^ r) - 899497514),
                (s = r),
                (r = a),
                (a = (i << 30) | (i >>> 2)),
                (i = o),
                (o = u);
            }
            (n[0] = (n[0] + o) | 0),
              (n[1] = (n[1] + i) | 0),
              (n[2] = (n[2] + a) | 0),
              (n[3] = (n[3] + r) | 0),
              (n[4] = (n[4] + s) | 0);
          },
          _doFinalize: function () {
            var e = this._data,
              t = e.words,
              n = 8 * this._nDataBytes,
              o = 8 * e.sigBytes;
            return (
              (t[o >>> 5] |= 128 << (24 - (o % 32))),
              (t[14 + (((o + 64) >>> 9) << 4)] = Math.floor(n / 4294967296)),
              (t[15 + (((o + 64) >>> 9) << 4)] = n),
              (e.sigBytes = 4 * t.length),
              this._process(),
              this._hash
            );
          },
          clone: function () {
            var e = r.clone.call(this);
            return (e._hash = this._hash.clone()), e;
          },
        })),
      (o.SHA1 = r._createHelper(c)),
      (o.HmacSHA1 = r._createHmacHelper(c)),
      d.SHA1);
  }