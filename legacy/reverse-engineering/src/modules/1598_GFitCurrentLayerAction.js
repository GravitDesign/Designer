/**
 * Webpack Module #1598
 * Type: class
 * Name: GFitCurrentLayerAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(18),
      a = n(31);
    function r() {}
    o.GObject.inherit(r, a),
      (r.ID = "view.zoom.fit-current-layer"),
      (r.TITLE = new o.GLocaleKey("GFitCurrentLayerAction", "title")),
      (r.prototype.getId = function () {
        return r.ID;
      }),
      (r.prototype.getTitle = function () {
        return r.TITLE;
      }),
      (r.prototype.getCategory = function () {
        return i.CATEGORY_VIEW;
      }),
      (r.prototype.getGroup = function () {
        return "zoom";
      }),
      (r.prototype.isEnabled = function () {
        var e = gDesigner.getActiveDocument(),
          t = e ? e.getScene().getActiveLayer() : null;
        return t && t.getPaintBBox() && !t.getPaintBBox().isEmpty();
      }),
      (r.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = e.getScene().getActiveLayer();
        e.getActiveWindow().getView().zoomAll(t.getPaintBBox(), !1, !0);
      }),
      (r.prototype.toString = function () {
        return "[Object GFitCurrentLayerAction]";
      }),
      (e.exports = r);
  }