/**
 * Webpack Module #1167
 * Type: class
 * Name: GMagnificationAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(15),
      a = n(18),
      r = n(31);
    function s(e) {
      this._zoomLevel = e;
    }
    o.GObject.inherit(s, r),
      (s.ID = "view.magnification"),
      (s.ZOOM_LEVELS = [
        6, 12, 25, 50, 66, 100, 150, 200, 300, 400, 800, 1600, 3200, 6400,
        12800, 25600,
      ]),
      (s.prototype._zoomLevel = null),
      (s.prototype.getId = function () {
        return s.ID + "." + this._zoomLevel.toString();
      }),
      (s.prototype.getTitle = function () {
        let e = this._zoomLevel.toString() + "%";
        return (
          gDesigner.isTouchEnabled() &&
            100 === this._zoomLevel &&
            (e += " (".concat(
              o.GLocale.get(
                new o.GLocaleKey("GMagnificationAction", "text.actual-size")
              ),
              ")"
            )),
          e
        );
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_VIEW_MAGNIFICATION;
      }),
      (s.prototype.getGroup = function () {
        return "zoom/magnification-level";
      }),
      (s.prototype.getShortcut = function () {
        switch (this._zoomLevel) {
          case 50:
            return [i.GKey.Constant.META, "5"];
          case 100:
            return [i.GKey.Constant.META, "1"];
          case 400:
            return [i.GKey.Constant.META, "4"];
          case 800:
            return [i.GKey.Constant.META, "8"];
          default:
            return null;
        }
      }),
      (s.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
      }),
      (s.prototype.execute = function () {
        var e = this._zoomLevel / 100,
          t = gDesigner.getWindows().getActiveWindow().getView(),
          n = t.getScene(),
          i = n ? n.getPaintBBox() : null,
          a =
            i && !i.isEmpty()
              ? i.getSide(o.GRect.Side.CENTER)
              : new o.GPoint(0, 0);
        if (t.getViewConfiguration().multiPageView) {
          var r = n.getActivePage();
          r && (a = a.add(r.getPosition(!0)));
        }
        t.zoomAtCenter(a, e);
      }),
      (s.prototype.toString = function () {
        return "[Object GMagnificationAction]";
      }),
      (e.exports = s);
  }