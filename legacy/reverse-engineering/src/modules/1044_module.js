/**
 * Webpack Module #1044
 * Type: unknown
 */

function (e, t, n) {
    var o;
    e.exports =
      ((o = n(55)),
      (function () {
        if ("function" == typeof ArrayBuffer) {
          var e = o.lib.WordArray,
            t = e.init;
          (e.init = function (e) {
            if (
              (e instanceof ArrayBuffer && (e = new Uint8Array(e)),
              (e instanceof Int8Array ||
                ("undefined" != typeof Uint8ClampedArray &&
                  e instanceof Uint8ClampedArray) ||
                e instanceof Int16Array ||
                e instanceof Uint16Array ||
                e instanceof Int32Array ||
                e instanceof Uint32Array ||
                e instanceof Float32Array ||
                e instanceof Float64Array) &&
                (e = new Uint8Array(e.buffer, e.byteOffset, e.byteLength)),
              e instanceof Uint8Array)
            ) {
              for (var n = e.byteLength, o = [], i = 0; i < n; i++)
                o[i >>> 2] |= e[i] << (24 - (i % 4) * 8);
              t.call(this, o, n);
            } else t.apply(this, arguments);
          }).prototype = e;
        }
      })(),
      o.lib.WordArray);
  }