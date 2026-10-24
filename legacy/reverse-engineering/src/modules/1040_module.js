/**
 * Webpack Module #1040
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(88).f;
    e.exports = function (e, t, n) {
      n in e ||
        o(e, n, {
          configurable: !0,
          get: function () {
            return t[n];
          },
          set: function (e) {
            t[n] = e;
          },
        });
    };
  }