/**
 * Webpack Module #1482
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    const o = n(1117).saveAs;
    function i() {}
    (i.prototype.download = async function () {
      let {
        buffer: e,
        name: t,
        extension: n,
        mime: i,
      } = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
      o(new Blob([e], i), "".concat(t, ".").concat(n));
    }),
      (e.exports = i);
  }