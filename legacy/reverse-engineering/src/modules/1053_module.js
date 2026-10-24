/**
 * Webpack Module #1053
 * Type: unknown
 */

function (e, t, n) {
    var o;
    e.exports =
      ((o = n(55)),
      n(98),
      (o.mode.CTRGladman = (function () {
        var e = o.lib.BlockCipherMode.extend();
        function t(e) {
          if (255 == ((e >> 24) & 255)) {
            var t = (e >> 16) & 255,
              n = (e >> 8) & 255,
              o = 255 & e;
            255 === t
              ? ((t = 0),
                255 === n ? ((n = 0), 255 === o ? (o = 0) : ++o) : ++n)
              : ++t,
              (e = 0),
              (e += t << 16),
              (e += n << 8),
              (e += o);
          } else e += 1 << 24;
          return e;
        }
        var n = (e.Encryptor = e.extend({
          processBlock: function (e, n) {
            var o = this._cipher,
              i = o.blockSize,
              a = this._iv,
              r = this._counter;
            a && ((r = this._counter = a.slice(0)), (this._iv = void 0)),
              (function (e) {
                0 === (e[0] = t(e[0])) && (e[1] = t(e[1]));
              })(r);
            var s = r.slice(0);
            o.encryptBlock(s, 0);
            for (var l = 0; l < i; l++) e[n + l] ^= s[l];
          },
        }));
        return (e.Decryptor = n), e;
      })()),
      o.mode.CTRGladman);
  }