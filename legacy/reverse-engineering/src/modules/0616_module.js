/**
 * Webpack Module #616
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = Math.ceil,
      i = Math.floor;
    e.exports =
      Math.trunc ||
      function (e) {
        var t = +e;
        return (t > 0 ? i : o)(t);
      };
  }