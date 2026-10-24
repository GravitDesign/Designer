/**
 * Webpack Module #1103
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(116),
      i = n(184),
      a = n(243).f,
      r = n(157),
      s =
        "object" == typeof window && window && Object.getOwnPropertyNames
          ? Object.getOwnPropertyNames(window)
          : [];
    e.exports.f = function (e) {
      return s && "Window" === o(e)
        ? (function (e) {
            try {
              return a(e);
            } catch (e) {
              return r(s);
            }
          })(e)
        : a(i(e));
    };
  }