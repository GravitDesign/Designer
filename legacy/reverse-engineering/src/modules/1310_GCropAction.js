/**
 * Webpack Module #1310
 * Type: class
 * Name: GCropAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(53),
      a = n(18),
      r = n(106);
    function s() {}
    o.GObject.inherit(s, r),
      (s.ID = "modify.crop"),
      (s.TITLE = new o.GLocaleKey("GCropAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getIcon = function () {
        return "gravit-icon-crop";
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_MODIFY;
      }),
      (s.prototype.getGroup = function () {
        return "structure-group";
      }),
      (s.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor(),
            n = t.getIndividualSelection();
          if (
            n &&
            n.length &&
            n[0] instanceof o.GImage &&
            t.hasSelectionDetail()
          )
            return n[0].isReady();
        }
        return !1;
      }),
      (s.prototype.execute = function (e, t) {
        var n = gDesigner.getToolManager();
        n.getActiveTool() instanceof i.GSubSelectTool
          ? (n.activateTool(i.GPointerTool, null, !0),
            n.getActiveTool().setEditMode(i.GSelectTool.EditMode.Select))
          : n.getActiveTool() instanceof i.GPointerTool &&
            n.getActiveTool().setEditMode(i.GSelectTool.EditMode.Select);
      }),
      (s.prototype.toString = function () {
        return "[Object GCropAction]";
      }),
      (e.exports = s);
  }