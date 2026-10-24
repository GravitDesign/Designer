/**
 * Webpack Module #397
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(29),
      i = n(46),
      a = n(241),
      r = n(145),
      s = n(614),
      l = n(43),
      c = TypeError,
      d = l("toPrimitive");
    e.exports = function (e, t) {
      if (!i(e) || a(e)) return e;
      var n,
        l = r(e, d);
      if (l) {
        if ((void 0 === t && (t = "default"), (n = o(l, e, t)), !i(n) || a(n)))
          return n;
        throw new c("Can't convert object to primitive value");
      }
      return void 0 === t && (t = "number"), s(e, t);
    };
  }