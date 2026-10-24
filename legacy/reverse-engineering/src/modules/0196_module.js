/**
 * Webpack Module #196
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(74),
      a = n(186),
      r = n(21),
      s = n(110),
      l = n(35),
      c = n(342),
      d = n(453),
      u = n(79),
      p = a && a.prototype;
    if (
      (o(
        {
          target: "Promise",
          proto: !0,
          real: !0,
          forced:
            !!a &&
            r(function () {
              p.finally.call({ then: function () {} }, function () {});
            }),
        },
        {
          finally: function (e) {
            var t = c(this, s("Promise")),
              n = l(e);
            return this.then(
              n
                ? function (n) {
                    return d(t, e()).then(function () {
                      return n;
                    });
                  }
                : e,
              n
                ? function (n) {
                    return d(t, e()).then(function () {
                      throw n;
                    });
                  }
                : e
            );
          },
        }
      ),
      !i && l(a))
    ) {
      var g = s("Promise").prototype.finally;
      p.finally !== g && u(p, "finally", g, { unsafe: !0 });
    }
  }