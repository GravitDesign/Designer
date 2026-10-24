/**
 * Webpack Module #231
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    const o = {
      IS_LOCALHOST: "localhost" === window.location.hostname,
      IS_RC: !1,
      IS_BETA: !1,
      IS_TRUNK: !1,
      IS_PRODUCTION: !0,
      IS_LTS: !1,
      IS_WEB_WORKER:
        "undefined" != typeof WorkerGlobalScope &&
        self instanceof WorkerGlobalScope,
    };
    e.exports = o;
  }