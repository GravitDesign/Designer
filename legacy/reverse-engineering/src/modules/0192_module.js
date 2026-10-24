/**
 * Webpack Module #192
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(200),
      a = n(152),
      r = n(21),
      s = n(157),
      l = o.Int8Array,
      c = a.aTypedArray,
      d = a.exportTypedArrayMethod,
      u = [].toLocaleString,
      p =
        !!l &&
        r(function () {
          u.call(new l(1));
        });
    d(
      "toLocaleString",
      function () {
        return i(u, p ? s(c(this)) : c(this), s(arguments));
      },
      r(function () {
        return [1, 2].toLocaleString() !== new l([1, 2]).toLocaleString();
      }) ||
        !r(function () {
          l.prototype.toLocaleString.call([1, 2]);
        })
    );
  }