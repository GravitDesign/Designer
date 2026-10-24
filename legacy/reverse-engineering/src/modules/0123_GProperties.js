/**
 * Webpack Module #123
 * Type: class
 * Name: GProperties
 */

function (e, t, n) {
    "use strict";
    function o() {}
    n(3),
      (o.prototype._touchTools = null),
      (o.prototype.init = function (e, t) {
        throw new Error("Not Supported.");
      }),
      (o.prototype.isGroup = function (e) {
        return !0;
      }),
      (o.prototype.isSticky = function () {
        return !1;
      }),
      (o.prototype.isAvailable = function (e) {
        return !e;
      }),
      (o.prototype.update = function (e, t, n) {
        (e = e || this._document) && e.clearActiveStylesList();
      }),
      (o.prototype.openPatternChooser = function () {
        throw new Error("Not Supported.");
      }),
      (o.prototype.openEyeDropper = function (e, t) {
        throw new Error("Not Supported.");
      }),
      (o.prototype.setTouchTools = function (e) {
        this._touchTools = e;
      }),
      (o.prototype.getTouchTools = function () {
        return this._touchTools;
      }),
      (o.prototype.toString = function () {
        return "[Object GProperties]";
      }),
      (e.exports = o);
  }