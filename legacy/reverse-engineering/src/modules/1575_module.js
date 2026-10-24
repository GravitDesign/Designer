/**
 * Webpack Module #1575
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    const o = n(1252),
      i = n(1187),
      { gApi: a } = n(10);
    e.exports = class extends i {
      constructor(e, t) {
        super(), (this._id = e), (this._url = t);
      }
      open() {
        if (this._isOpen()) return;
        const e = new o({ id: this._id, className: "overlay" });
        e.open(this._url),
          e.on("error", () => {
            e.close();
          }),
          a.isCookieEnabled &&
            !a.isCookieEnabled() &&
            e.on("load", () => {
              e.postMessage(
                { cmd: "auth", token: a.getAuthorizationToken() },
                a.url
              );
            });
      }
      _isOpen() {
        return !!$("#".concat(this._id)).length;
      }
    };
  }