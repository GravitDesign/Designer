/**
 * Webpack Module #200
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(239),
      i = Function.prototype,
      a = i.apply,
      r = i.call;
    e.exports =
      ("object" == typeof Reflect && Reflect.apply) ||
      (o
        ? r.bind(a)
        : function () {
            return r.apply(a, arguments);
          });
  }