/**
 * Webpack Module #1038
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(185),
      i = TypeError;
    e.exports = function (e, t) {
      if (!delete e[t])
        throw new i("Cannot delete property " + o(t) + " of " + o(e));
    };
  }