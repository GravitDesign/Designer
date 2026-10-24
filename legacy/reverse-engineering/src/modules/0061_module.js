/**
 * Webpack Module #61
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(27),
      i = n(93),
      a = o({}.hasOwnProperty);
    e.exports =
      Object.hasOwn ||
      function (e, t) {
        return a(i(e), t);
      };
  }