/**
 * Webpack Module #94
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o =
      "undefined" != typeof Uint8Array &&
      "undefined" != typeof Uint16Array &&
      "undefined" != typeof Int32Array;
    function i(e, t) {
      return Object.prototype.hasOwnProperty.call(e, t);
    }
    (t.assign = function (e) {
      for (var t = Array.prototype.slice.call(arguments, 1); t.length; ) {
        var n = t.shift();
        if (n) {
          if ("object" != typeof n)
            throw new TypeError(n + "must be non-object");
          for (var o in n) i(n, o) && (e[o] = n[o]);
        }
      }
      return e;
    }),
      (t.shrinkBuf = function (e, t) {
        return e.length === t
          ? e
          : e.subarray
          ? e.subarray(0, t)
          : ((e.length = t), e);
      });
    var a = {
        arraySet: function (e, t, n, o, i) {
          if (t.subarray && e.subarray) e.set(t.subarray(n, n + o), i);
          else for (var a = 0; a < o; a++) e[i + a] = t[n + a];
        },
        flattenChunks: function (e) {
          var t, n, o, i, a, r;
          for (o = 0, t = 0, n = e.length; t < n; t++) o += e[t].length;
          for (r = new Uint8Array(o), i = 0, t = 0, n = e.length; t < n; t++)
            (a = e[t]), r.set(a, i), (i += a.length);
          return r;
        },
      },
      r = {
        arraySet: function (e, t, n, o, i) {
          for (var a = 0; a < o; a++) e[i + a] = t[n + a];
        },
        flattenChunks: function (e) {
          return [].concat.apply([], e);
        },
      };
    (t.setTyped = function (e) {
      e
        ? ((t.Buf8 = Uint8Array),
          (t.Buf16 = Uint16Array),
          (t.Buf32 = Int32Array),
          t.assign(t, a))
        : ((t.Buf8 = Array),
          (t.Buf16 = Array),
          (t.Buf32 = Array),
          t.assign(t, r));
    }),
      t.setTyped(o);
  }