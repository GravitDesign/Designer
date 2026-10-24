/**
 * Webpack Module #399
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(49),
      i = n(21),
      a = n(242);
    e.exports =
      !o &&
      !i(function () {
        return (
          7 !==
          Object.defineProperty(a("div"), "a", {
            get: function () {
              return 7;
            },
          }).a
        );
      });
  }