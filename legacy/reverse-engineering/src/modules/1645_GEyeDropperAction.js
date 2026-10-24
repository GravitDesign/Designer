/**
 * Webpack Module #1645
 * Type: class
 * Name: GEyeDropperAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(4), n(41), n(13);
    var i = n(15),
      a = n(1),
      r = o(n(18)),
      s = n(198);
    const l = n(31);
    class c extends l {
      constructor(e) {
        super(),
          (this._type = e),
          (this._title = new a.GLocaleKey(
            "GEyeDropperAction",
            "title.".concat(e)
          )),
          (this.pageX = 0),
          (this.pageY = 0);
      }
      getId() {
        return "".concat(c.ID, ".").concat(this._type);
      }
      getTitle() {
        return this._title;
      }
      getCategory() {
        return r.default.CATEGORY_EDIT;
      }
      getShortcut() {
        switch (this._type) {
          case c.Type.Fill:
            return [i.GKey.Constant.META, i.GKey.Constant.OPTION, "C"];
          case c.Type.Border:
            return [
              i.GKey.Constant.SHIFT,
              i.GKey.Constant.META,
              i.GKey.Constant.OPTION,
              "C",
            ];
          default:
            return null;
        }
      }
      getAdditionalShortcuts() {
        switch (this._type) {
          case c.Type.Fill:
            return [["I"]];
          default:
            return null;
        }
      }
      isVisible() {
        return !1;
      }
      execute() {
        const e = gDesigner.getActiveDocument(),
          t = e && e.getEditor(),
          n = t && t.getSelection(),
          o = gDesigner
            .getRightSidebars()
            .getSidebar(s.SidebarsIds.GInspectorSidebar),
          i = n && n.filter((e) => e && e.hasMixin(a.GStylable));
        if (!(i && i.length > 0)) return;
        const { pageX: r, pageY: l } = this._getLastCursorPoint();
        switch (this._type) {
          case c.Type.Fill:
            i.find((e) => e.hasStyleFill() && !(e instanceof a.GText))
              ? o.openFillEyeDropper(r, l)
              : i.find((e) => e instanceof a.GText)
              ? o.openTextColorEyeDropper(r, l)
              : i.find((e) => !e.hasStyleBorder()) ||
                o.openBorderEyeDropper(r, l);
            break;
          case c.Type.Border:
            i.find((e) => !e.hasStyleBorder()) || o.openBorderEyeDropper(r, l);
        }
      }
      _getLastCursorPoint() {
        const e = gDesigner.getCursorManager().getLastCursorPoint();
        return { pageX: (e && e.getX()) || 0, pageY: (e && e.getY()) || 0 };
      }
      toString() {
        return "[Object GEyeDropperAction]";
      }
    }
    (c.ID = "edit.eyedropper"),
      (c.Type = { Border: "border", Fill: "fill", Text: "text" }),
      (e.exports = c);
  }