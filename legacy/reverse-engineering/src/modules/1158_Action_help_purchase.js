/**
 * Webpack Module #1158
 * Type: action
 * Name: Action_help_purchase
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(31),
      a = n(18);
    function r() {}
    o.GObject.inherit(r, i),
      (r.ID = "help.purchase"),
      (r.TITLE = new o.GLocaleKey("GPurchaseProAction", "title")),
      (r.prototype.getId = function () {
        return r.ID;
      }),
      (r.prototype.getTitle = function () {
        return r.TITLE;
      }),
      (r.prototype.getCategory = function () {
        return a.CATEGORY_HELP;
      }),
      (r.prototype.getGroup = function () {
        return "help";
      }),
      (r.prototype.isVisible = function () {
        if (!gDesigner.isInAppPurchaseAllowed()) return !1;
        var e = gDesigner.getLicense();
        return !(gDesigner.isAnonymous() || (e.isPro() && !e.isExpired()));
      }),
      (r.prototype.isEnabled = function () {
        var e = gDesigner.getLicense();
        return !(e.isPro() && !e.isExpired());
      }),
      (r.prototype.execute = function () {
        gDesigner.openPaymentDialog();
      }),
      (r.prototype.getStyleClass = function () {
        return "purchase-pro-menu-item";
      }),
      (r.prototype.noHover = function () {
        return !0;
      }),
      (r.prototype.toString = function () {
        return "[GObject GPurchaseProAction]";
      }),
      (e.exports = r);
  }