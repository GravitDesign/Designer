/**
 * Webpack Module #630
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(202);
    o(
      { target: "Promise", stat: !0, forced: n(201).CONSTRUCTOR },
      {
        reject: function (e) {
          var t = i.f(this);
          return (0, t.reject)(e), t.promise;
        },
      }
    );
  }