/**
 * Webpack Module #33
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(421),
      a = n(422),
      r = n(671),
      s = n(100),
      l = function (e) {
        if (e && e.forEach !== r)
          try {
            s(e, "forEach", r);
          } catch (t) {
            e.forEach = r;
          }
      };
    for (var c in i) i[c] && l(o[c] && o[c].prototype);
    l(a);
  }