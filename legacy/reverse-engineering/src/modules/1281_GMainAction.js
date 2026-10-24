/**
 * Webpack Module #1281
 * Type: class
 * Name: GMainAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58), n(71), n(4), n(41), n(13), n(38);
    var i = n(15),
      a = o(n(31)),
      r = o(n(1168));
    class s extends a.default {
      constructor(e) {
        super(), (this.Type = e.Type);
        const t = Object.values(this.Type);
        (this._subActionIds = t.map((e) =>
          r.default.getSubActionId(this.getId(), e)
        )),
          (this._timeoutId = null),
          (this._shortcutSubKeyHandlerBind =
            this._shortcutSubKeyHandler.bind(this));
      }
      executeFromShortcut() {
        this._setShortcutSubKeyListener();
      }
      execute() {}
      getSubActions() {
        return this._subActionIds
          ? this._subActionIds.map((e) => gDesigner.getAction(e))
          : null;
      }
      getShortcutSubKeys() {
        const e = this.getSubActions();
        return e ? e.map((e) => e.getShortcutSubKey()).filter((e) => e) : null;
      }
      getShortcutHint(e) {
        return null;
      }
      _setShortcutSubKeyListener() {
        this._resetShortcutSubKeyListener(),
          document.addEventListener(
            "keydown",
            this._shortcutSubKeyHandlerBind,
            !0
          ),
          (this._timeoutId = setTimeout(() => {
            this._resetShortcutSubKeyListener(), this.execute();
          }, a.default.SHORTCUT_DELAY));
      }
      _executeFromShortcutSubKey(e) {
        const t = this.getSubActions();
        if (!t) return;
        const n = t.find((t) => t.getShortcutSubKey() === e);
        n && n.execute();
      }
      _shortcutSubKeyHandler(e) {
        const t = i.GKey.translateCode(e.code),
          n = this.getShortcutSubKeys();
        this._resetShortcutSubKeyListener(),
          t &&
            n &&
            n.includes(t) &&
            (e.preventDefault(),
            e.stopPropagation(),
            this._executeFromShortcutSubKey(t));
      }
      _resetShortcutSubKeyListener() {
        this._timeoutId &&
          (document.removeEventListener(
            "keydown",
            this._shortcutSubKeyHandlerBind,
            !0
          ),
          clearTimeout(this._timeoutId),
          (this._timeoutId = null));
      }
      toString() {
        return "[Object GMainAction]";
      }
    }
    e.exports = s;
  }