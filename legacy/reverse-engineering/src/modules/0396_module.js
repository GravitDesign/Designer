/**
 * Webpack Module #396
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = {}.propertyIsEnumerable,
      i = Object.getOwnPropertyDescriptor,
      a = i && !o.call({ 1: 2 }, 1);
    t.f = a
      ? function (e) {
          var t = i(this, e);
          return !!t && t.enumerable;
        }
      : o;
  }