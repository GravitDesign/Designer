/**
 * Webpack Module #199
 * Type: exports
 * Name: Exports_GURABLE
 */

function (e, t, n) {
    "use strict";
    var o = n(49),
      i = n(61),
      a = Function.prototype,
      r = o && Object.getOwnPropertyDescriptor,
      s = i(a, "name"),
      l = s && "something" === function () {}.name,
      c = s && (!o || (o && r(a, "name").configurable));
    e.exports = { EXISTS: s, PROPER: l, CONFIGURABLE: c };
  }