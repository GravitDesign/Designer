/**
 * Webpack Module #1169
 * Type: class
 * Name: GShowGuideLinesAction
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
      (s.ID = "view.canvas.show-guide-lines"),
      (s.TITLE = new o.GLocaleKey("GShowGuideLinesAction", "title")),
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
        return [i.GKey.Constant.META, ","];
      }),
      (s.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
      }),
      (s.prototype.isCheckable = function () {
        return !0;
      }),
      (s.prototype.isChecked = function () {
        var e = gDesigner.getWindows().getActiveWindow();
        if (e) {
          var t = e.getView().getViewConfiguration();
          return !!t && !0 === t.guideLinesVisible;
        }
        return !1;
      }),
      (s.prototype.execute = function () {
        var e = gDesigner.getWindows().getActiveWindow().getView();
        (e.getViewConfiguration().guideLinesVisible =
          !e.getViewConfiguration().guideLinesVisible),
          e.invalidate(),
          gDesigner.setSetting(
            "guide_lines_visible",
            e.getViewConfiguration().guideLinesVisible
          );
      }),
      (s.prototype.toString = function () {
        return "[Object GShowGuideLinesAction]";
      }),
      (e.exports = s);
  }