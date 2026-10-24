/**
 * Webpack Module #1285
 * Type: class
 * Name: GShowGridAction
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
      (s.ID = "view.canvas.show-grid"),
      (s.TITLE = new o.GLocaleKey("GShowGridAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_VIEW_CANVAS;
      }),
      (s.prototype.getGroup = function () {
        return "show/canvas";
      }),
      (s.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, i.GKey.Constant.OPTION, "G"];
      }),
      (s.prototype.isEnabled = function () {
        return !!gDesigner.getActiveDocument();
      }),
      (s.prototype.isCheckable = function () {
        return !0;
      }),
      (s.prototype.isChecked = function () {
        var e = gDesigner.getActiveDocument();
        return !!e && !!e.getScene().getProperty("gm");
      }),
      (s.prototype.execute = function () {
        var e = gDesigner.getActiveDocument().getScene();
        e.getProperty("gm")
          ? e.setProperty("gm", null)
          : e.setProperty(
              "gm",
              e.getProperty("lgm") || o.GScene.GridMode.Boxed
            );
      }),
      (s.prototype.toString = function () {
        return "[Object GShowGridAction]";
      }),
      (e.exports = s);
  }