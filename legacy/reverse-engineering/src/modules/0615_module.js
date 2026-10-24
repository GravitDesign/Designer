/**
 * Webpack Module #615
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(110),
      i = n(27),
      a = n(243),
      r = n(404),
      s = n(37),
      l = i([].concat);
    e.exports =
      o("Reflect", "ownKeys") ||
      function (e) {
        var t = a.f(s(e)),
          n = r.f;
        return n ? l(t, n(e)) : t;
      };
  }