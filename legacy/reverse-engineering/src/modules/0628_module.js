/**
 * Webpack Module #628
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(74),
      a = n(201).CONSTRUCTOR,
      r = n(186),
      s = n(110),
      l = n(35),
      c = n(79),
      d = r && r.prototype;
    if (
      (o(
        { target: "Promise", proto: !0, forced: a, real: !0 },
        {
          catch: function (e) {
            return this.then(void 0, e);
          },
        }
      ),
      !i && l(r))
    ) {
      var u = s("Promise").prototype.catch;
      d.catch !== u && c(d, "catch", u, { unsafe: !0 });
    }
  }