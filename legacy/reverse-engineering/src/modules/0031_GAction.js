/**
 * Webpack Module #31
 * Type: class
 * Name: GAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3);
    var i = n(1),
      a = n(15),
      r = o(n(844));
    function s() {}
    i.GObject.inherit(s, i.GObject),
      (s.SHORTCUT_DELAY = 500),
      (s.getActionShortcutHint = function (e, t) {
        return e ? a.GKey.shortcutToString(e, t) : null;
      }),
      (s.prototype.getId = function () {
        throw new Error("Not Supported");
      }),
      (s.prototype.getTitle = function () {
        throw new Error("Not Supported");
      }),
      (s.prototype.getFullTitle = function () {
        return this.getTitle();
      }),
      (s.prototype.getInfo = function () {
        return null;
      }),
      (s.prototype.getIcon = function () {
        return r.default[this.getId()] || null;
      }),
      (s.prototype.getCategory = function () {
        return null;
      }),
      (s.prototype.getGroup = function () {
        return null;
      }),
      (s.prototype.getGroupIcon = function () {
        return null;
      }),
      (s.prototype.getShortcut = function () {
        return null;
      }),
      (s.prototype.getShortcutHint = function (e) {
        return s.getActionShortcutHint(this.getShortcut(), e);
      }),
      (s.prototype.isShortcutGlobal = function () {
        return !1;
      }),
      (s.prototype.isRegisterShortcut = function () {
        return null;
      }),
      (s.prototype.getAdditionalShortcuts = function () {
        return null;
      }),
      (s.prototype.isEnabled = function () {
        return !0;
      }),
      (s.prototype.isKeyBoardEventRequiredToExecute = function () {
        return !1;
      }),
      (s.prototype.isCheckable = function () {
        return !1;
      }),
      (s.prototype.isChecked = function () {
        return !1;
      }),
      (s.prototype.isAvailable = function (e) {
        return !0;
      }),
      (s.prototype.execute = function () {
        throw new Error("Not Supported");
      }),
      (s.prototype.executeFromShortcut = function (e) {
        return this.execute.apply(this, arguments);
      }),
      (s.prototype.isPro = function () {
        return !1;
      }),
      (s.prototype.getTooltipArea = function () {
        return null;
      }),
      (s.prototype.getTooltipConfig = function (e) {
        return null;
      }),
      (s.prototype.isVisible = function () {
        return !0;
      }),
      (s.prototype.noHover = function () {
        return !1;
      }),
      (s.prototype.getStyleClass = function () {
        return null;
      }),
      (s.prototype.statsValue = function () {
        return null;
      }),
      (s.prototype.toString = function () {
        return "[Object GAction]";
      }),
      (e.exports = s);
  }