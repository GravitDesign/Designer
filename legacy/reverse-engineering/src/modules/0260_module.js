/**
 * Webpack Module #260
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(110),
      i = n(120),
      a = n(43),
      r = n(49),
      s = a("species");
    e.exports = function (e) {
      var t = o(e);
      r &&
        t &&
        !t[s] &&
        i(t, s, {
          configurable: !0,
          get: function () {
            return this;
          },
        });
    };
  }