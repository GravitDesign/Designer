/**
 * Webpack Module #277
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(21),
      i = n(35),
      a = /#|\.prototype\./,
      r = function (e, t) {
        var n = l[s(e)];
        return n === d || (n !== c && (i(t) ? o(t) : !!t));
      },
      s = (r.normalize = function (e) {
        return String(e).replace(a, ".").toLowerCase();
      }),
      l = (r.data = {}),
      c = (r.NATIVE = "N"),
      d = (r.POLYFILL = "P");
    e.exports = r;
  }