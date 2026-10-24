/**
 * Webpack Module #1074
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    const o = new Proxy({}, { get: (e, t) => (void 0 !== e[t] ? e[t] : t) });
    e.exports = o;
  }