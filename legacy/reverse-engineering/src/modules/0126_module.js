/**
 * Webpack Module #126
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(29);
    o(
      { target: "URL", proto: !0, enumerable: !0 },
      {
        toJSON: function () {
          return i(URL.prototype.toString, this);
        },
      }
    );
  }