/**
 * Webpack Module #240
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(27),
      i = n(21),
      a = n(116),
      r = Object,
      s = o("".split);
    e.exports = i(function () {
      return !r("z").propertyIsEnumerable(0);
    })
      ? function (e) {
          return "String" === a(e) ? s(e, "") : r(e);
        }
      : r;
  }