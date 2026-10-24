/**
 * Webpack Module #19
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(184),
      i = n(360),
      a = n(203),
      r = n(80),
      s = n(88).f,
      l = n(418),
      c = n(252),
      d = n(74),
      u = n(49),
      p = r.set,
      g = r.getterFor("Array Iterator");
    e.exports = l(
      Array,
      "Array",
      function (e, t) {
        p(this, { type: "Array Iterator", target: o(e), index: 0, kind: t });
      },
      function () {
        var e = g(this),
          t = e.target,
          n = e.index++;
        if (!t || n >= t.length) return (e.target = null), c(void 0, !0);
        switch (e.kind) {
          case "keys":
            return c(n, !1);
          case "values":
            return c(t[n], !1);
        }
        return c([n, t[n]], !1);
      },
      "values"
    );
    var h = (a.Arguments = a.Array);
    if ((i("keys"), i("values"), i("entries"), !d && u && "values" !== h.name))
      try {
        s(h, "name", { value: "values" });
      } catch (e) {}
  }