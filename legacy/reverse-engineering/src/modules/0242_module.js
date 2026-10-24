/**
 * Webpack Module #242
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(46),
      a = o.document,
      r = i(a) && i(a.createElement);
    e.exports = function (e) {
      return r ? a.createElement(e) : {};
    };
  }