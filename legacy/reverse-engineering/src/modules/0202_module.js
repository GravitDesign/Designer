/**
 * Webpack Module #202
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(65),
      i = TypeError,
      a = function (e) {
        var t, n;
        (this.promise = new e(function (e, o) {
          if (void 0 !== t || void 0 !== n)
            throw new i("Bad Promise constructor");
          (t = e), (n = o);
        })),
          (this.resolve = o(t)),
          (this.reject = o(n));
      };
    e.exports.f = function (e) {
      return new a(e);
    };
  }