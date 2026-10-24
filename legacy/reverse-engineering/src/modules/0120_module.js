/**
 * Webpack Module #120
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(401),
      i = n(88);
    e.exports = function (e, t, n) {
      return (
        n.get && o(n.get, t, { getter: !0 }),
        n.set && o(n.set, t, { setter: !0 }),
        i.f(e, t, n)
      );
    };
  }