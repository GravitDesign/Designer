/**
 * Webpack Module #698
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(101);
    e.exports = function (e, t, n) {
      for (
        var i = 0, a = arguments.length > 2 ? n : o(t), r = new e(a);
        a > i;

      )
        r[i] = t[i++];
      return r;
    };
  }