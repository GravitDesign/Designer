/**
 * Webpack Module #382
 * Type: unknown
 */

function (e, t, n) {
    var o, i, a, r, s, l;
    e.exports =
      ((l = n(55)),
      (i = (o = l).lib),
      (a = i.Base),
      (r = i.WordArray),
      ((s = o.x64 = {}).Word = a.extend({
        init: function (e, t) {
          (this.high = e), (this.low = t);
        },
      })),
      (s.WordArray = a.extend({
        init: function (e, t) {
          (e = this.words = e || []),
            (this.sigBytes = null != t ? t : 8 * e.length);
        },
        toX32: function () {
          for (var e = this.words, t = e.length, n = [], o = 0; o < t; o++) {
            var i = e[o];
            n.push(i.high), n.push(i.low);
          }
          return r.create(n, this.sigBytes);
        },
        clone: function () {
          for (
            var e = a.clone.call(this),
              t = (e.words = this.words.slice(0)),
              n = t.length,
              o = 0;
            o < n;
            o++
          )
            t[o] = t[o].clone();
          return e;
        },
      })),
      l);
  }