/**
 * Webpack Module #343
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(43)("iterator"),
      i = !1;
    try {
      var a = 0,
        r = {
          next: function () {
            return { done: !!a++ };
          },
          return: function () {
            i = !0;
          },
        };
      (r[o] = function () {
        return this;
      }),
        Array.from(r, function () {
          throw 2;
        });
    } catch (e) {}
    e.exports = function (e, t) {
      try {
        if (!t && !i) return !1;
      } catch (e) {
        return !1;
      }
      var n = !1;
      try {
        var a = {};
        (a[o] = function () {
          return {
            next: function () {
              return { done: (n = !0) };
            },
          };
        }),
          e(a);
      } catch (e) {}
      return n;
    };
  }