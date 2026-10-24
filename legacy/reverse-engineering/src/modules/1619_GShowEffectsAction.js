/**
 * Webpack Module #1619
 * Type: class
 * Name: GShowEffectsAction
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
      (s.ID = "view.canvas.show-effects"),
      (s.TITLE = new o.GLocaleKey("GShowEffectsAction", "title")),
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
      (s.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
      }),
      (s.prototype.isCheckable = function () {
        return !0;
      }),
      (s.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, "E"];
      }),
      (s.prototype.isChecked = function () {
        var e = gDesigner.getWindows().getActiveWindow();
        return !!e && !e.getView().getViewConfiguration().ignoreEffects;
      }),
      (s.prototype.execute = function () {
        var e = gDesigner.getWindows().getActiveWindow();
        if (!e) return !1;
        var t = e.getView();
        (t.getViewConfiguration().ignoreEffects =
          !t.getViewConfiguration().ignoreEffects),
          t.invalidateAndResetCache(null);
      }),
      (s.prototype.toString = function () {
        return "[Object GShowEffectsAction]";
      }),
      (e.exports = s);
  }