/**
 * Webpack Module #1051
 * Type: unknown
 */

function (e, t, n) {
    var o;
    e.exports =
      ((o = n(55)),
      n(98),
      (o.mode.CFB = (function () {
        var e = o.lib.BlockCipherMode.extend();
        function t(e, t, n, o) {
          var i = this._iv;
          if (i) {
            var a = i.slice(0);
            this._iv = void 0;
          } else a = this._prevBlock;
          o.encryptBlock(a, 0);
          for (var r = 0; r < n; r++) e[t + r] ^= a[r];
        }
        return (
          (e.Encryptor = e.extend({
            processBlock: function (e, n) {
              var o = this._cipher,
                i = o.blockSize;
              t.call(this, e, n, i, o), (this._prevBlock = e.slice(n, n + i));
            },
          })),
          (e.Decryptor = e.extend({
            processBlock: function (e, n) {
              var o = this._cipher,
                i = o.blockSize,
                a = e.slice(n, n + i);
              t.call(this, e, n, i, o), (this._prevBlock = a);
            },
          })),
          e
        );
      })()),
      o.mode.CFB);
  }