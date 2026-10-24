/**
 * Webpack Module #665
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(21);
    e.exports = !o(function () {
      function e() {}
      return (
        (e.prototype.constructor = null),
        Object.getPrototypeOf(new e()) !== e.prototype
      );
    });
  }