/**
 * Webpack Module #627
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
        all: function (e) {
          var t = this,
            n = r.f(t),
            o = n.resolve,
            c = n.reject,
            d = s(function () {
              var n = a(t.resolve),
                r = [],
                s = 0,
                d = 1;
              l(e, function (e) {
                var a = s++,
                  l = !1;
                d++,
                  i(n, t, e).then(function (e) {
                    l || ((l = !0), (r[a] = e), --d || o(r));
                  }, c);
              }),
                --d || o(r);
            });
          return d.error && c(d.value), n.promise;
        },
      }
    );
  }