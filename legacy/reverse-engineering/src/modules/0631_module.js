/**
 * Webpack Module #631
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(110),
      a = n(74),
      r = n(186),
      s = n(201).CONSTRUCTOR,
      l = n(453),
      c = i("Promise"),
      d = a && !s;
    o(
      { target: "Promise", stat: !0, forced: a || s },
      {
        resolve: function (e) {
          return l(d && this === c ? r : this, e);
        },
      }
    );
  }