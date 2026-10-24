/**
 * Webpack Module #27
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(239),
      i = Function.prototype,
      a = i.call,
      r = o && i.bind.bind(a, a);
    e.exports = o
      ? r
      : function (e) {
          return function () {
            return a.apply(e, arguments);
          };
        };
  }