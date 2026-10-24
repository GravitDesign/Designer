/**
 * Webpack Module #208
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(61),
      i = n(35),
      a = n(93),
      r = n(300),
      s = n(665),
      l = r("IE_PROTO"),
      c = Object,
      d = c.prototype;
    e.exports = s
      ? c.getPrototypeOf
      : function (e) {
          var t = a(e);
          if (o(t, l)) return t[l];
          var n = t.constructor;
          return i(n) && t instanceof n
            ? n.prototype
            : t instanceof c
            ? d
            : null;
        };
  }