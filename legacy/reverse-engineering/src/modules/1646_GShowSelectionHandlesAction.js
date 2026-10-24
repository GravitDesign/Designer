/**
 * Webpack Module #1646
 * Type: class
 * Name: GShowSelectionHandlesAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(4), n(13);
    var i = n(1),
      a = n(15),
      r = n(53),
      s = o(n(18)),
      l = o(n(31));
    class c extends l.default {
      constructor() {
        super(), (this._lastIsCheckedValue = !0);
      }
      getId() {
        return c.ID;
      }
      getTitle() {
        return c.TITLE;
      }
      getCategory() {
        return s.default.CATEGORY_VIEW_CANVAS;
      }
      isCheckable() {
        return !0;
      }
      isEnabled() {
        return !!this._getSelection();
      }
      isChecked() {
        const e = this._getSelection();
        if (!e) return this._lastIsCheckedValue;
        const t = !!e.find(
          (e) =>
            !r.GElementEditor.getEditor(e).hasFlag(
              r.GBaseEditor.Flag.HideEditor
            )
        );
        return (this._lastIsCheckedValue = t), t;
      }
      getShortcut() {
        return [a.GKey.Constant.SHIFT, a.GKey.Constant.META, "X"];
      }
      execute() {
        const e = this._getEditor();
        if (e) {
          this.isChecked() ? e.hideSelection() : e.resetHideSelection();
        }
      }
      _getEditor() {
        const e = gDesigner.getActiveDocument();
        return e && e.getEditor();
      }
      _getSelection() {
        const e = this._getEditor(),
          t = e && e.getSelection();
        return t && t.length > 0 ? t : null;
      }
      toString() {
        return "[Object GShowSelectionHandlesAction]";
      }
    }
    (c.ID = "view.canvas.show-selection-handles"),
      (c.TITLE = new i.GLocaleKey("GShowSelectionHandlesAction", "title")),
      (e.exports = c);
  }