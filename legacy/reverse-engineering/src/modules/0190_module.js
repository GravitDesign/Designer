/**
 * Webpack Module #190
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(29),
      a = n(152),
      r = n(101),
      s = n(428),
      l = n(93),
      c = n(21),
      d = o.RangeError,
      u = o.Int8Array,
      p = u && u.prototype,
      g = p && p.set,
      h = a.aTypedArray,
      f = a.exportTypedArrayMethod,
      m = !c(function () {
        var e = new Uint8ClampedArray(2);
        return i(g, e, { length: 1, 0: 3 }, 1), 3 !== e[1];
      }),
      y =
        m &&
        a.NATIVE_ARRAY_BUFFER_VIEWS &&
        c(function () {
          var e = new u(2);
          return e.set(1), e.set("2", 1), 0 !== e[0] || 2 !== e[1];
        });
    f(
      "set",
      function (e) {
        h(this);
        var t = s(arguments.length > 1 ? arguments[1] : void 0, 1),
          n = l(e);
        if (m) return i(g, this, n, t);
        var o = this.length,
          a = r(n),
          c = 0;
        if (a + t > o) throw new d("Wrong length");
        for (; c < a; ) this[t + c] = n[c++];
      },
      !m || y
    );
  }