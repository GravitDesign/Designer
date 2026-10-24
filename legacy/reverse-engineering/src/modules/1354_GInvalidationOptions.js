/**
 * Webpack Module #1354
 * Type: class
 * Name: GInvalidationOptions
 */

function (e, t, n) {
    "use strict";
    function o() {
      let e =
        arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
      Object.assign(this, { fileCache: !0, collaboratorsCache: !0 }, e);
    }
    n(30),
      n(3),
      (o.NO_CACHE_INVALIDATION = Object.freeze(
        new o({ fileCache: !1, collaboratorsCache: !1 })
      )),
      (o.prototype.collaboratorsCache = !0),
      (o.prototype.fileCache = !0),
      (o.prototype.toString = function () {
        return "[Object GInvalidationOptions]";
      }),
      (e.exports = o);
  }