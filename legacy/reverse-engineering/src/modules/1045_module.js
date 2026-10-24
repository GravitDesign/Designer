/**
 * Webpack Module #1045
 * Type: unknown
 */

function (e, t, n) {
    var o;
    e.exports =
      ((o = n(55)),
      (function () {
        var e = o,
          t = e.lib.WordArray,
          n = e.enc;
        function i(e) {
          return ((e << 8) & 4278255360) | ((e >>> 8) & 16711935);
        }
        (n.Utf16 = n.Utf16BE =
          {
            stringify: function (e) {
              for (
                var t = e.words, n = e.sigBytes, o = [], i = 0;
                i < n;
                i += 2
              ) {
                var a = (t[i >>> 2] >>> (16 - (i % 4) * 8)) & 65535;
                o.push(String.fromCharCode(a));
              }
              return o.join("");
            },
            parse: function (e) {
              for (var n = e.length, o = [], i = 0; i < n; i++)
                o[i >>> 1] |= e.charCodeAt(i) << (16 - (i % 2) * 16);
              return t.create(o, 2 * n);
            },
          }),
          (n.Utf16LE = {
            stringify: function (e) {
              for (
                var t = e.words, n = e.sigBytes, o = [], a = 0;
                a < n;
                a += 2
              ) {
                var r = i((t[a >>> 2] >>> (16 - (a % 4) * 8)) & 65535);
                o.push(String.fromCharCode(r));
              }
              return o.join("");
            },
            parse: function (e) {
              for (var n = e.length, o = [], a = 0; a < n; a++)
                o[a >>> 1] |= i(e.charCodeAt(a) << (16 - (a % 2) * 16));
              return t.create(o, 2 * n);
            },
          });
      })(),
      o.enc.Utf16);
  }