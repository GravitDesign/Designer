/**
 * Webpack Module #693
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(21),
      a = n(343),
      r = n(152).NATIVE_ARRAY_BUFFER_VIEWS,
      s = o.ArrayBuffer,
      l = o.Int8Array;
    e.exports =
      !r ||
      !i(function () {
        l(1);
      }) ||
      !i(function () {
        new l(-1);
      }) ||
      !a(function (e) {
        new l(), new l(null), new l(1.5), new l(e);
      }, !0) ||
      i(function () {
        return 1 !== new l(new s(2), 1, void 0).length;
      });
  }