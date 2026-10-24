/**
 * Webpack Module #1055
 * Type: unknown
 */

function (e, t, n) {
    var o, i;
    e.exports =
      ((i = n(55)),
      n(98),
      (i.mode.ECB =
        (((o = i.lib.BlockCipherMode.extend()).Encryptor = o.extend({
          processBlock: function (e, t) {
            this._cipher.encryptBlock(e, t);
          },
        })),
        (o.Decryptor = o.extend({
          processBlock: function (e, t) {
            this._cipher.decryptBlock(e, t);
          },
        })),
        o)),
      i.mode.ECB);
  }