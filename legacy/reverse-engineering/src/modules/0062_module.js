/**
 * Webpack Module #62
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(131),
      i = String;
    e.exports = function (e) {
      if ("Symbol" === o(e))
        throw new TypeError("Cannot convert a Symbol value to a string");
      return i(e);
    };
  }