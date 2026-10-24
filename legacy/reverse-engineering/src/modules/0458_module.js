/**
 * Webpack Module #458
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(21),
      i = n(23).RegExp;
    e.exports = o(function () {
      var e = i(".", "s");
      return !(e.dotAll && e.test("\n") && "s" === e.flags);
    });
  }