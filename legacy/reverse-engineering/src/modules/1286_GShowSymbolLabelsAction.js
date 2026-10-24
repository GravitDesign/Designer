/**
 * Webpack Module #1286
 * Type: class
 * Name: GShowSymbolLabelsAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = (n(15), n(18)),
      a = n(31);
    function r() {}
    o.GObject.inherit(r, a),
      (r.ID = "view.canvas.show-symbol-labels"),
      (r.TITLE = new o.GLocaleKey("GShowSymbolLabelsAction", "title")),
      (r.prototype.getId = function () {
        return r.ID;
      }),
      (r.prototype.getTitle = function () {
        return r.TITLE;
      }),
      (r.prototype.getCategory = function () {
        return i.CATEGORY_VIEW_CANVAS;
      }),
      (r.prototype.getGroup = function () {
        return "show/canvas";
      }),
      (r.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
      }),
      (r.prototype.isCheckable = function () {
        return !0;
      }),
      (r.prototype.isChecked = function () {
        var e = gDesigner.getWindows().getActiveWindow();
        if (e) {
          var t = e.getView().getViewConfiguration();
          return !!t && !!t.symbolLabelsVisible;
        }
        return !1;
      }),
      (r.prototype.execute = function () {
        var e = gDesigner.getWindows().getActiveWindow().getView();
        (e.getViewConfiguration().symbolLabelsVisible =
          !e.getViewConfiguration().symbolLabelsVisible),
          e.invalidate(),
          gDesigner.setSetting(
            "symbol_labels_visible",
            e.getViewConfiguration().symbolLabelsVisible
          );
      }),
      (r.prototype.toString = function () {
        return "[Object GShowSymbolLabelsAction]";
      }),
      (e.exports = r);
  }