/**
 * Webpack Module #312
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(94),
      i = !0,
      a = !0;
    try {
      String.fromCharCode.apply(null, [0]);
    } catch (e) {
      i = !1;
    }
    try {
      String.fromCharCode.apply(null, new Uint8Array(1));
    } catch (e) {
      a = !1;
    }
    for (var r = new o.Buf8(256), s = 0; s < 256; s++)
      r[s] =
        s >= 252
          ? 6
          : s >= 248
          ? 5
          : s >= 240
          ? 4
          : s >= 224
          ? 3
          : s >= 192
          ? 2
          : 1;
    function l(e, t) {
      if (t < 65534 && ((e.subarray && a) || (!e.subarray && i)))
        return String.fromCharCode.apply(null, o.shrinkBuf(e, t));
      for (var n = "", r = 0; r < t; r++) n += String.fromCharCode(e[r]);
      return n;
    }
    (r[254] = r[254] = 1),
      (t.string2buf = function (e) {
        var t,
          n,
          i,
          a,
          r,
          s = e.length,
          l = 0;
        for (a = 0; a < s; a++)
          55296 == (64512 & (n = e.charCodeAt(a))) &&
            a + 1 < s &&
            56320 == (64512 & (i = e.charCodeAt(a + 1))) &&
            ((n = 65536 + ((n - 55296) << 10) + (i - 56320)), a++),
            (l += n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4);
        for (t = new o.Buf8(l), r = 0, a = 0; r < l; a++)
          55296 == (64512 & (n = e.charCodeAt(a))) &&
            a + 1 < s &&
            56320 == (64512 & (i = e.charCodeAt(a + 1))) &&
            ((n = 65536 + ((n - 55296) << 10) + (i - 56320)), a++),
            n < 128
              ? (t[r++] = n)
              : n < 2048
              ? ((t[r++] = 192 | (n >>> 6)), (t[r++] = 128 | (63 & n)))
              : n < 65536
              ? ((t[r++] = 224 | (n >>> 12)),
                (t[r++] = 128 | ((n >>> 6) & 63)),
                (t[r++] = 128 | (63 & n)))
              : ((t[r++] = 240 | (n >>> 18)),
                (t[r++] = 128 | ((n >>> 12) & 63)),
                (t[r++] = 128 | ((n >>> 6) & 63)),
                (t[r++] = 128 | (63 & n)));
        return t;
      }),
      (t.buf2binstring = function (e) {
        return l(e, e.length);
      }),
      (t.binstring2buf = function (e) {
        for (var t = new o.Buf8(e.length), n = 0, i = t.length; n < i; n++)
          t[n] = e.charCodeAt(n);
        return t;
      }),
      (t.buf2string = function (e, t) {
        var n,
          o,
          i,
          a,
          s = t || e.length,
          c = new Array(2 * s);
        for (o = 0, n = 0; n < s; )
          if ((i = e[n++]) < 128) c[o++] = i;
          else if ((a = r[i]) > 4) (c[o++] = 65533), (n += a - 1);
          else {
            for (i &= 2 === a ? 31 : 3 === a ? 15 : 7; a > 1 && n < s; )
              (i = (i << 6) | (63 & e[n++])), a--;
            a > 1
              ? (c[o++] = 65533)
              : i < 65536
              ? (c[o++] = i)
              : ((i -= 65536),
                (c[o++] = 55296 | ((i >> 10) & 1023)),
                (c[o++] = 56320 | (1023 & i)));
          }
        return l(c, o);
      }),
      (t.utf8border = function (e, t) {
        var n;
        for (
          (t = t || e.length) > e.length && (t = e.length), n = t - 1;
          n >= 0 && 128 == (192 & e[n]);

        )
          n--;
        return n < 0 || 0 === n ? t : n + r[e[n]] > t ? n : t;
      });
  }