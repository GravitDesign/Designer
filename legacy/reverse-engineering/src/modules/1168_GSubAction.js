/**
 * Webpack Module #1168
 * Type: class
 * Name: GSubAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(20), n(34);
    var i = n(1),
      a = o(n(31));
    class r extends a.default {
      static getSubActionId(e, t) {
        return "".concat(e, ".").concat(t);
      }
      constructor(e) {
        super(), (this._type = e), (this._title = null);
      }
      getId() {
        return r.getSubActionId(this._getMainActionId(), this._type);
      }
      _getMainActionId() {
        throw new Error("Not implemented.");
      }
      getTitle() {
        return this._title;
      }
      getMainAction() {
        const e = this._getMainActionId();
        return gDesigner.getAction(e);
      }
      isVisible() {
        return !1;
      }
      isEnabled() {
        return this.getMainAction().isEnabled();
      }
      getShortcutSubKey() {
        return null;
      }
      getShortcutHint(e) {
        const t = this.getMainAction().getShortcut(),
          n = this.getShortcutSubKey(),
          o = a.default.getActionShortcutHint(t, e);
        return o && n
          ? i.GLocale.getValue("GSubAction", "shortcut-hint-template")
              .replace("%mainShortcutHint", o)
              .replace("%shortcutSubKeyHint", n)
          : null;
      }
      toString() {
        return "[Object GSubAction]";
      }
    }
    (r.Type = {}), (e.exports = r);
  }