/**
 * Webpack Module #629
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(29),
      a = n(65),
      r = n(202),
      s = n(304),
      l = n(121);
    o(
      { target: "Promise", stat: !0, forced: n(413) },
      {
        race: function (e) {
          var t = this,
            n = r.f(t),
            o = n.reject,
            c = s(function () {
              var r = a(t.resolve);
              l(e, function (e) {
                i(r, t, e).then(n.resolve, o);
              });
            });
          return c.error && o(c.value), n.promise;
        },
      }
    );
  }