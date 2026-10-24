/**
 * Webpack Module #1572
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16)(n(1573));
    e.exports = class {
      constructor(e, t) {
        this._promiseManager = new o.default();
      }
      getAnnotations(e, t) {
        return this._fetch({ id: e, shareToken: t });
      }
      updateAnnotations(e, t, n) {
        return this._fetch({ id: e, data: t, shareToken: n });
      }
      _fetch(e) {
        let { id: t, data: n, shareToken: o } = e;
        const i = n
          ? () => gApi.updateAnnotations(t, n, o)
          : () => gApi.getAnnotations(t, o);
        return this._promiseManager.pushPromise(i);
      }
    };
  }