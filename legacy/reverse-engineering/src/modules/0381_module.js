/**
 * Webpack Module #381
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    function o(e) {
      this._providerManager = e;
    }
    n(20),
      n(34),
      n(134),
      (o.Errors = { UnknownError: 0, ConnectionError: 1 }),
      (o.prototype._providerManager = null),
      (o.prototype._enabled = !0),
      (o.prototype.addPreviews = function (e) {
        throw new Error("GFontsProvider.addPreviews: virtual");
      }),
      (o.prototype.load = function (e, t, n, o) {
        throw new Error("GFontsProvider.load: virtual");
      }),
      (o.prototype.getTotalFonts = function (e) {
        throw new Error("GFontsProvider.getTotalFonts: virtual");
      }),
      (o.prototype.getProviderId = function () {
        throw new Error("GFontsProvider.getProviderId: virtual");
      }),
      (o.prototype.resolveFont = function (e, t, n, o) {
        throw new Error("GFontsProvider.resolveFont: virtual");
      }),
      (o.prototype.isInitialized = function () {
        return !0;
      }),
      (o.prototype.resetProvider = function () {}),
      (o.prototype.hasEnabler = function () {
        return !1;
      }),
      (o.prototype.getEnabler = function () {
        return null;
      }),
      (o.prototype.setEnabled = function (e) {
        this._enabled = !!e;
      }),
      (o.prototype.isEnabled = function () {
        return this._enabled;
      }),
      (o.prototype._searchFilter = function (e) {
        return function (t) {
          return e.indexOf("%") >= 0
            ? t.family.toLowerCase().startsWith(e.replace(/%/g, ""))
            : t.family.toLowerCase() == e.toLowerCase();
        };
      }),
      (o.prototype._getClosestKey = function (e, t, n, o) {
        var i,
          a = Number.POSITIVE_INFINITY;
        n = Number(n);
        for (var r = -1, s = 0; s < e.length; s++) {
          var l = e[s];
          l.family === t &&
            ((i = (n - l.weight) * (n - l.weight)),
            o !== l.style && (i += 9e4),
            i < a && ((a = i), (r = s)));
        }
        return r;
      }),
      (e.exports = o);
  }