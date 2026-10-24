/**
 * Webpack Module #806
 * Type: class
 * Name: GSidebar
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(394);
    function a() {
      i.call(this);
    }
    o.GObject.inherit(a, i),
      (a.prototype.getOrientation = function () {
        return null;
      }),
      (a.prototype.getMinimumWidth = function () {
        throw new Error("Not implemented.");
      }),
      (a.prototype.getDefaultWidth = function () {
        throw new Error("Not implemented.");
      }),
      (a.prototype.getSettingWidth = function () {
        return gDesigner.getSetting(
          "sidebars_width_".concat(this.getId()),
          this.getDefaultWidth()
        );
      }),
      (a.prototype.isResizeable = function () {
        return !1;
      }),
      (a.prototype.isDeactivatable = function () {
        return !0;
      }),
      (a.prototype.relayout = function () {}),
      (a.prototype.resize = function () {}),
      (a.prototype.init = function (e) {}),
      (a.prototype.activate = function () {}),
      (a.prototype.isToolAllowed = function (e) {
        return !0;
      }),
      (a.prototype.deactivate = function () {}),
      (a.prototype.getTouchTools = function (e) {
        let { disableContextSensitive: t = !1 } = e;
        return null;
      }),
      (a.prototype.updateBadge = function (e) {
        return !1;
      }),
      (a.prototype.toString = function () {
        return "[Object GSidebar]";
      }),
      (e.exports = a);
  }