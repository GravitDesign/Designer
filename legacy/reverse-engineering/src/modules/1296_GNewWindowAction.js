/**
 * Webpack Module #1296
 * Type: class
 * Name: GNewWindowAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(15),
      a = n(18),
      r = n(31);
    function s() {}
    o.GObject.inherit(s, r),
      (s.ID = "view.clone"),
      (s.TITLE = new o.GLocaleKey("GNewWindowAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_VIEW;
      }),
      (s.prototype.getGroup = function () {
        return "view";
      }),
      (s.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, i.GKey.Constant.OPTION, "N"];
      }),
      (s.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
      }),
      (s.prototype.execute = function () {
        gDesigner
          .getWindows()
          .addWindow(gDesigner.getWindows().getActiveWindow());
      }),
      (s.prototype.toString = function () {
        return "[Object GNewWindowAction]";
      }),
      (e.exports = s);
  }