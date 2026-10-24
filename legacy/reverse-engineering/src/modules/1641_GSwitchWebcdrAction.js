/**
 * Webpack Module #1641
 * Type: class
 * Name: GSwitchWebcdrAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    const i = n(18),
      a = n(31);
    var r = n(219),
      s = n(85);
    const { IS_TRUNK: l, IS_LOCALHOST: c, IS_BETA: d } = n(231);
    function u(e) {
      let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
      (this._serverName = e), (this._isDefault = !!t);
    }
    o.GObject.inherit(u, a),
      (u.ID = "help.switchwebcdr"),
      (u.TITLE = new o.GLocaleKey("GSwitchWebcdrAction", "title")),
      (u.prototype.getId = function () {
        return u.ID + "." + this._serverName;
      }),
      (u.prototype.isCheckable = function () {
        return !0;
      }),
      (u.prototype.isChecked = function () {
        let e = gDesigner.getSetting("webcdr_choice");
        return (!!e && e === this._serverName) || (!e && this._isDefault);
      }),
      (u.prototype.getTitle = function () {
        return this._serverName;
      }),
      (u.prototype.getCategory = function () {
        return i.CATEGORY_HELP_SWITCHWEBCDR;
      }),
      (u.prototype.getGroup = function () {
        return "help/switchwebcdr";
      }),
      (u.prototype.isEnabled = function () {
        return !0;
      }),
      (u.prototype.isVisible = function () {
        return !!(l || d || c);
      }),
      (u.prototype.execute = function () {
        gDesigner.setSetting("webcdr_choice", this._serverName),
          this._reloadApp();
      }),
      (u.prototype._reloadApp = function () {
        gContainer.getRuntime() === s.Runtime.Browser ||
        gContainer.getRuntime() === s.Runtime.PWA
          ? location.reload()
          : new r(
              o.GLocale.get(
                new o.GLocaleKey("GNewDocumentDialog", "text.restart-app")
              )
            ).open();
      }),
      (u.prototype.toString = function () {
        return "[Object GSwitchWebcdrAction]";
      }),
      (e.exports = u);
  }