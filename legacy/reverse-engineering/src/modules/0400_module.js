/**
 * Webpack Module #400
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(49),
      i = n(21);
    e.exports =
      o &&
      i(function () {
        return (
          42 !==
          Object.defineProperty(function () {}, "prototype", {
            value: 42,
            writable: !1,
          }).prototype
        );
      });
  }