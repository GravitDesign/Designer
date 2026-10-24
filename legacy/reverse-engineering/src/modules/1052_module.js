/**
 * Webpack Module #1052
 * Type: unknown
 */

function (e, t, n) {
    var o, i, a;
    e.exports =
      ((a = n(55)),
      n(98),
      (a.mode.CTR =
        ((o = a.lib.BlockCipherMode.extend()),
        (i = o.Encryptor =
          o.extend({
            processBlock: function (e, t) {
              var n = this._cipher,
                o = n.blockSize,
                i = this._iv,
                a = this._counter;
              i && ((a = this._counter = i.slice(0)), (this._iv = void 0));
              var r = a.slice(0);
              n.encryptBlock(r, 0), (a[o - 1] = (a[o - 1] + 1) | 0);
              for (var s = 0; s < o; s++) e[t + s] ^= r[s];
            },
          })),
        (o.Decryptor = i),
        o)),
      a.mode.CTR);
  }