/**
 * Webpack Module #679
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(29),
      a = n(121),
      r = n(65),
      s = n(37),
      l = n(143),
      c = n(102),
      d = n(149)("find", TypeError);
    o(
      { target: "Iterator", proto: !0, real: !0, forced: d },
      {
        find: function (e) {
          s(this);
          try {
            r(e);
          } catch (e) {
            c(this, "throw", e);
          }
          if (d) return i(d, this, e);
          var t = l(this),
            n = 0;
          return a(
            t,
            function (t, o) {
              if (e(t, n++)) return o(t);
            },
            { IS_RECORD: !0, INTERRUPTED: !0 }
          ).result;
        },
      }
    );
  }