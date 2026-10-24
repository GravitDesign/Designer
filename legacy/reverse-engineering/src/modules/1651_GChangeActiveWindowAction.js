/**
 * Webpack Module #1651
 * Type: class
 * Name: GChangeActiveWindowAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(1),
      a = n(15),
      r = o(n(31)),
      s = o(n(18));
    class l extends r.default {
      constructor(e) {
        super(),
          (this._type = e),
          (this._title = new i.GLocaleKey(
            "GChangeActiveWindowAction",
            "title.".concat(this._type)
          ));
      }
      getId() {
        return "".concat(l.ID, ".").concat(this._type);
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
        const e = [a.GKey.Constant.OPTION];
        switch (this._type) {
          case l.Type.Next:
            return e.concat(a.GKey.Constant.PERIOD);
          case l.Type.Previous:
            return e.concat(a.GKey.Constant.COMMA);
          default:
            return null;
        }
      }
      isEnabled() {
        const e = gDesigner.getWindows(),
          t = e && e.getWindows();
        return t && t.length > 1;
      }
      execute() {
        if (this.isEnabled()) {
          const e = gDesigner.getWindows(),
            t = this._getNextWindowAccordingToType(e);
          e.activateWindow(t);
        }
      }
      _getNextWindowAccordingToType(e) {
        const t = e.getWindows(),
          n = e && e.getActiveWindow(),
          o = t.findIndex((e) => e === n);
        switch (this._type) {
          case l.Type.Next:
            return o === t.length - 1 ? t[0] : t[o + 1];
          case l.Type.Previous:
            return 0 === o ? t[t.length - 1] : t[o - 1];
          default:
            return null;
        }
      }
      toString() {
        return "[Object GChangeActiveWindowAction]";
      }
    }
    (l.ID = "view.change-active-window"),
      (l.Type = { Next: "next", Previous: "previous" }),
      (e.exports = l);
  }