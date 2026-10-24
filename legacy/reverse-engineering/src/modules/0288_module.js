/**
 * Webpack Module #288
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(35),
      i = n(46),
      a = n(175);
    e.exports = function (e, t, n) {
      var r, s;
      return (
        a &&
          o((r = t.constructor)) &&
          r !== n &&
          i((s = r.prototype)) &&
          s !== n.prototype &&
          a(e, s),
        e
      );
    };
  }