/**
 * Webpack Module #1312
 * Type: class
 * Name: GEditElementActon
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(53),
      i = n(1),
      a = (n(15), n(18)),
      r = n(106);
    function s() {
      this._title = new i.GLocaleKey("GEditElementActon", "title");
    }
    i.GObject.inherit(s, r),
      (s.ID = "edit.edit"),
      (s.prototype._title = null),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return this._title;
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_EDIT;
      }),
      (s.prototype.getGroup = function () {
        return "select";
      }),
      (s.prototype.getShortcut = function () {
        return null;
      }),
      (s.prototype.isEnabled = function (e) {
        if (!r.prototype.isEnabled.call(this)) return !1;
        var t = !1;
        if (
          (e =
            e ||
            (gDesigner.getActiveDocument()
              ? gDesigner
                  .getActiveDocument()
                  .getEditor()
                  .getIndividualSelection()
              : null)) &&
          e.length > 0 &&
          !gDesigner.getActiveDocument().getEditor().isInlineEditing()
        )
          if (
            gDesigner.getToolManager().getActiveTool() !=
            gDesigner.getToolManager().getTool(o.GSubSelectTool)
          )
            t = !0;
          else
            for (var n = 0; n < e.length; ++n)
              e[n] instanceof i.GText && (t = !0);
        return t;
      }),
      (s.prototype.execute = function (e) {
        var t = !1;
        if (
          (e =
            e ||
            (gDesigner.getActiveDocument()
              ? gDesigner
                  .getActiveDocument()
                  .getEditor()
                  .getIndividualSelection()
              : null)) &&
          e.length > 0
        ) {
          for (var n = 0; n < e.length && !t; ++n)
            if (e[n] instanceof i.GText) {
              var a = e[n].getGeometryBBox(),
                r = gDesigner.getWindows().getActiveWindow(),
                s = r ? r.getView() : null;
              a &&
                s &&
                (t = gDesigner
                  .getActiveDocument()
                  .getEditor()
                  .openInlineEditor(e[n], s, new i.GPoint(a.getX(), a.getY())));
            }
          t ||
            gDesigner.getToolManager().getActiveTool() ==
              gDesigner.getToolManager().getTool(o.GSubSelectTool) ||
            gDesigner.getToolManager().activateTool(o.GSubSelectTool, null, !0);
        }
      }),
      (s.prototype.toString = function () {
        return "[Object GEditElementActon]";
      }),
      (e.exports = s);
  }