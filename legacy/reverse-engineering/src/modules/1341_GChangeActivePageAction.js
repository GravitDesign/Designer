/**
 * Webpack Module #1341
 * Type: class
 * Name: GChangeActivePageAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(1),
      a = n(15),
      r = o(n(31)),
      s = o(n(18)),
      l = n(198);
    class c extends r.default {
      constructor(e) {
        super(),
          (this._type = e),
          (this._title = new i.GLocaleKey(
            "GChangeActivePageAction",
            "title.".concat(this._type)
          ));
      }
      getId() {
        return "".concat(c.ID, ".").concat(this._type);
      }
      getTitle() {
        return this._title;
      }
      getCategory() {
        return s.default.CATEGORY_VIEW;
      }
      isVisible() {
        return !1;
      }
      getShortcut() {
        const e = [a.GKey.Constant.META, a.GKey.Constant.OPTION];
        switch (this._type) {
          case c.Type.Next:
            return e.concat(a.GKey.Constant.DOWN);
          case c.Type.Previous:
            return e.concat(a.GKey.Constant.UP);
          default:
            return null;
        }
      }
      getAdditionalShortcuts() {
        switch (this._type) {
          case c.Type.Next:
            return [a.GKey.Constant.PAGE_DOWN];
          case c.Type.Previous:
            return [a.GKey.Constant.PAGE_UP];
          default:
            return null;
        }
      }
      execute() {
        const e = gDesigner.getLeftSidebars(),
          t = e && e.getSidebar(l.SidebarsIds.GOutlineSidebar),
          n = gDesigner.getActiveDocument(),
          o = n && n.getScene();
        if (t && o) {
          const e = this.getNextPage(o);
          t.changeActivePage(e);
        }
      }
      getNextPage(e) {
        const t = e.getActivePage();
        for (
          let e = this._getNextPageAccordingToType(t);
          null !== e;
          e = this._getNextPageAccordingToType(e)
        )
          if (e instanceof i.GPage) return e;
        return null;
      }
      _getNextPageAccordingToType(e) {
        switch (this._type) {
          case c.Type.Next:
            return e.getNext();
          case c.Type.Previous:
            return e.getPrevious();
          default:
            return null;
        }
      }
      toString() {
        return "[Object GChangeActivePageAction]";
      }
    }
    (c.ID = "view.change-active-page"),
      (c.Type = { Next: "next", Previous: "previous" }),
      (e.exports = c);
  }