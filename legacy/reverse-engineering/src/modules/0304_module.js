/**
 * Webpack Module #304
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    e.exports = function (e) {
      try {
        return { error: !1, value: e() };
      } catch (e) {
        return { error: !0, value: e };
      }
    };
  }