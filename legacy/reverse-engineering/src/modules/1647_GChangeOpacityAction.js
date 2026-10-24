/**
 * Webpack Module #1647
 * Type: class
 * Name: GChangeOpacityAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(20), n(34), n(4), n(32), n(33);
    var i = n(1),
      a = n(53),
      r = n(15),
      s = o(n(31)),
      l = o(n(18));
    class c extends s.default {
      constructor() {
        super(),
          (this._opacityLevel = null),
          (this._timeoutId = null),
          (this._currentValue = "");
      }
      getId() {
        return c.ID;
      }
      getTitle() {
        return c.TITLE;
      }
      getFullTitle() {
        return i.GLocale.getValue("GChangeOpacityAction", "full-title").replace(
          "%value",
          "100% (10%, 20%, 25%, 26%, 30%, 40%, ... 90%)"
        );
      }
      getCategory() {
        return l.default.CATEGORY_EDIT;
      }
      isVisible() {
        return !1;
      }
      getAdditionalShortcuts() {
        return [
          r.GKey.Constant.Digit0,
          r.GKey.Constant.Digit1,
          r.GKey.Constant.Digit2,
          r.GKey.Constant.Digit3,
          r.GKey.Constant.Digit4,
          r.GKey.Constant.Digit5,
          r.GKey.Constant.Digit6,
          r.GKey.Constant.Digit7,
          r.GKey.Constant.Digit8,
          r.GKey.Constant.Digit9,
        ].map((e) => [r.GKey.Constant.SHIFT, e]);
      }
      execute() {
        const e = gDesigner.getActiveDocument(),
          t = e && e.getEditor(),
          n = e && e.getScene(),
          o = t && t.getSelection();
        n &&
          o &&
          (a.GEditor.tryRunTransaction(
            n,
            () => {
              o.forEach((e) => {
                e.hasMixin(i.GStylable) &&
                  e.setProperty("_stop", this._opacityLevel);
              });
            },
            i.GLocale.get(c.TITLE)
          ),
          this._setOpacityLevel());
      }
      executeFromShortcut(e) {
        const t = r.GKey.translateCode(e.code),
          n = this._currentValue;
        this._setCurrentValue(t),
          n
            ? this._processDefinedCurrentValue()
            : (this._timeoutId = setTimeout(() => {
                this._processDefinedCurrentValue();
              }, s.default.SHORTCUT_DELAY));
      }
      isKeyBoardEventRequiredToExecute() {
        return !0;
      }
      getShortcutHint(e) {
        const t = [r.GKey.Constant.SHIFT, "0 (1, 2, 25, 26, 3, 4, ... 9)"];
        return s.default.getActionShortcutHint(t, e);
      }
      _processDefinedCurrentValue() {
        this._clearTimeout(),
          this._currentValue.length > 1 &&
            "0" === this._currentValue[0] &&
            (this._currentValue = this._currentValue.replace("0", "."));
        const e = i.GUtil.parseNumber(this._currentValue);
        if ("number" == typeof e && !isNaN(e)) {
          const t = this._getOpacityLevel(e);
          this._setOpacityLevel(t), this.execute.apply(this);
        }
        this._setCurrentValue();
      }
      _getOpacityLevel(e) {
        return 0 === e ? 1 : e < 10 ? e / 10 : e < 100 ? e / 100 : 1;
      }
      _setCurrentValue(e) {
        e ? (this._currentValue += e) : (this._currentValue = "");
      }
      _setOpacityLevel() {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : null;
        this._opacityLevel = e;
      }
      _clearTimeout() {
        this._timeoutId && clearTimeout(this._timeoutId);
      }
      toString() {
        return "[Object GChangeOpacityAction]";
      }
    }
    (c.ID = "edit.change-opacity"),
      (c.TITLE = new i.GLocaleKey("GChangeOpacityAction", "title")),
      (e.exports = c);
  }