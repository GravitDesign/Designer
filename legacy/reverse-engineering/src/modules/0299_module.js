/**
 * Webpack Module #299
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(27),
      i = n(35),
      a = n(297),
      r = o(Function.toString);
    i(a.inspectSource) ||
      (a.inspectSource = function (e) {
        return r(e);
      }),
      (e.exports = a.inspectSource);
  }