/**
 * Webpack Module #43
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(296),
      a = n(61),
      r = n(258),
      s = n(295),
      l = n(398),
      c = o.Symbol,
      d = i("wks"),
      u = l ? c.for || c : (c && c.withoutSetter) || r;
    e.exports = function (e) {
      return a(d, e) || (d[e] = s && a(c, e) ? c[e] : u("Symbol." + e)), d[e];
    };
  }