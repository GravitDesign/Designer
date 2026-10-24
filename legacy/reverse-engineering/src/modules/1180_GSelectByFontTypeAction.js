/**
 * Webpack Module #1180
 * Type: class
 * Name: GSelectByFontTypeAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(53),
      i = n(1),
      a = n(18),
      r = n(106);
    function s() {}
    i.GObject.inherit(s, r),
      (s.ID = "edit.selectbyfonttype"),
      (s.TITLE = new i.GLocaleKey("GSelectByFontTypeAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getGroup = function () {
        return "edit/select-by-font";
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_EDIT_SELECT_SAME;
      }),
      (s.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        if (e && e.getEditor() && e.getEditor().getSelection()) {
          var t = this._getFontFamily();
          return !(!t || !t.length);
        }
        return !1;
      }),
      (s.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = this._getFontFamily(),
          n = gDesigner.getWorkspace().getFontManager().getDefaultFont(),
          o = [];
        e.getScene().acceptChildren(function (e) {
          (e.removeFlag(i.GNode.Flag.Selected), e instanceof i.GText) &&
            (e.getProperty("_tff") || (n && n.getFamily())) === t &&
            o.push(e);
        }),
          e.getEditor().updateSelection(!0, o);
      }),
      (s.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-select-by-font" : "";
      }),
      (s.prototype.toString = function () {
        return "[Object GSelectByFontTypeAction]";
      }),
      (s.prototype._getFontFamily = function () {
        for (
          var e,
            t = gDesigner.getActiveDocument().getEditor().getSelection(),
            n = gDesigner.getWorkspace().getFontManager().getDefaultFont(),
            a = 0;
          a < t.length;
          a++
        ) {
          var r = t[a];
          if (r instanceof i.GText) {
            var s = (o.GElementEditor.getEditor(r) || r).getProperty("_tff");
            if ((s || (s = n && n.getFamily()), e)) {
              if (e !== s) {
                e = "";
                break;
              }
            } else e = s;
          }
        }
        return e;
      }),
      (e.exports = s);
  }