/**
 * Webpack Module #1635
 * Type: class
 * Name: GOpenAccountSettingsAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    const i = n(18),
      a = n(31);
    function r() {}
    o.GObject.inherit(r, a),
      (r.ID = "account.open"),
      (r.TITLE = new o.GLocaleKey("GOpenAccountSettingsAction", "title")),
      (r.prototype.getId = function () {
        return r.ID;
      }),
      (r.prototype.getTitle = function () {
        return r.TITLE;
      }),
      (r.prototype.getCategory = function () {
        return i.CATEGORY_ACCOUNT;
      }),
      (r.prototype.getGroup = function () {
        return "account";
      }),
      (r.prototype.execute = function () {
        gDesigner.runDeepLink("account");
      }),
      (r.prototype.isVisible = function () {
        const e = gDesigner.getSyncUser();
        return (
          !(e && !e.canUpdateSelfAccountData()) && gDesigner.isTouchEnabled()
        );
      }),
      (r.prototype.toString = function () {
        return "[Object GOpenAccountSettingsAction]";
      }),
      (e.exports = r);
  }