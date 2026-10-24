/**
 * Webpack Module #1626
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    const i = n(31);
    function a(e) {
      this._action = e;
    }
    o.GObject.inherit(a, i),
      (a.prototype._action = null),
      (a.prototype.getId = function () {
        return this._action.getId();
      }),
      (a.prototype.getTitle = function () {
        return this._action.getTitle();
      }),
      (a.prototype.getIcon = function () {
        return this._action.getIcon();
      }),
      (a.prototype.getCategory = function () {
        return this._action.getCategory();
      }),
      (a.prototype.getGroup = function () {
        return this._action.getGroup();
      }),
      (a.prototype.getGroupIcon = function () {
        return this._action.getGroupIcon();
      }),
      (a.prototype.getShortcut = function () {
        return this._action.getShortcut();
      }),
      (a.prototype.isShortcutGlobal = function () {
        return this._action.isShortcutGlobal();
      }),
      (a.prototype.isRegisterShortcut = function () {
        return this._action.isRegisterShortcut();
      }),
      (a.prototype.getAdditionalShortcuts = function () {
        return this._action.getAdditionalShortcuts();
      }),
      (a.prototype.isEnabled = function () {
        return this._action.isEnabled();
      }),
      (a.prototype.isCheckable = function () {
        return this._action.isCheckable();
      }),
      (a.prototype.isChecked = function () {
        return this._action.isChecked();
      }),
      (a.prototype.isAvailable = function (e) {
        return this._action.isAvailable(e);
      }),
      (a.prototype.execute = function () {
        if (gDesigner.isEnabledProFeatures(this._action.getId()))
          return this._action.execute.apply(this._action, arguments);
        gDesigner.handlePROFeatureInterruption();
      }),
      (a.prototype.executeFromShortcut = function () {
        return this.execute.apply(this, arguments);
      }),
      (a.prototype.isPro = function () {
        return !0;
      }),
      (a.prototype.getTooltipArea = function () {
        return this._action.getTooltipArea();
      }),
      (a.prototype.getTooltipConfig = function (e) {
        return this._action.getTooltipConfig(e);
      }),
      (a.prototype.statsValue = function () {
        return this._action.statsValue();
      }),
      (a.prototype.toString = function () {
        return this._action.toString();
      }),
      (e.exports = a);
  }