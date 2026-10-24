/**
 * Webpack Module #1282
 * Type: class
 * Name: GOriginalViewAction
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
      (s.ID = "view.zoom.original"),
      (s.TITLE = new o.GLocaleKey("GOriginalViewAction", "title")),
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
        return "zoom";
      }),
      (s.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, "0"];
      }),
      (s.prototype.isEnabled = function () {
        return !!gDesigner.getActiveDocument();
      }),
      (s.prototype.execute = function () {
        var e,
          t = gDesigner.getActiveDocument(),
          n = t
            .getActiveWindow()
            .getView()
            .getViewConfiguration().multiPageView,
          i = t.getScene();
        if (i.isFixedSized()) {
          var a = i.getActivePage();
          if (
            ((e = new o.GRect(0, 0, a.getProperty("w"), a.getProperty("h"))), n)
          ) {
            var r = a.getPosition(!0);
            r && (e = e.translated(r.getX(), r.getY()));
          }
        } else e = i.getPaintBBox(n);
        e &&
          !e.isEmpty() &&
          t
            .getActiveWindow()
            .getView()
            .zoomAtCenter(e.getSide(o.GRect.Side.CENTER), 1);
      }),
      (s.prototype.toString = function () {
        return "[Object GOriginalViewAction]";
      }),
      (e.exports = s);
  }