/**
 * Webpack Module #149
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23);
    e.exports = function (e, t) {
      var n = o.Iterator,
        i = n && n.prototype,
        a = i && i[e],
        r = !1;
      if (a)
        try {
          a.call(
            {
              next: function () {
                return { done: !0 };
              },
              return: function () {
                r = !0;
              },
            },
            -1
          );
        } catch (e) {
          e instanceof t || (r = !1);
        }
      if (!r) return a;
    };
  }