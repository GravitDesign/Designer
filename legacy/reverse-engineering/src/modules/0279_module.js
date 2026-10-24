/**
 * Webpack Module #279
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(29),
      i = n(37),
      a = n(35),
      r = n(116),
      s = n(306),
      l = TypeError;
    e.exports = function (e, t) {
      var n = e.exec;
      if (a(n)) {
        var c = o(n, e, t);
        return null !== c && i(c), c;
      }
      if ("RegExp" === r(e)) return o(s, e, t);
      throw new l("RegExp#exec called on incompatible receiver");
    };
  }