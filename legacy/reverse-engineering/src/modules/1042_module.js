/**
 * Webpack Module #1042
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n.r(t),
      n.d(t, "encode", function () {
        return a;
      }),
      n.d(t, "decode", function () {
        return r;
      }),
      n.d(t, "trim", function () {
        return s;
      }),
      n.d(t, "isBase64", function () {
        return l;
      }),
      n.d(t, "isUrlSafeBase64", function () {
        return c;
      });
    const o = { "+": "-", "/": "_" },
      i = { "-": "+", _: "/", ".": "=" },
      a = (e) => e.replace(/[+/]/g, (e) => o[e]),
      r = (e) => e.replace(/[-_.]/g, (e) => i[e]),
      s = (e) => e.replace(/[.=]{1,2}$/, ""),
      l = (e) => /^[A-Za-z0-9+/]*[=]{0,2}$/.test(e),
      c = (e) => /^[A-Za-z0-9_-]*[.=]{0,2}$/.test(e);
  }