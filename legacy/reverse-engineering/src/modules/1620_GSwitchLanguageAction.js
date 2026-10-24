/**
 * Webpack Module #1620
 * Type: class
 * Name: GSwitchLanguageAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3);
    var i = n(1),
      a = o(n(443)),
      r = n(10),
      s = n(18),
      l = n(31),
      c = n(219),
      d = n(85),
      u = n(119);
    const p = n(44),
      { isExecutingOnMSTeamsSync: g } = a.default;
    function h(e, t) {
      (this._locale = e), (this._title = h.Translations[e] || t);
    }
    (h.Translations = [
      "English",
      "Deutsch",
      "中文",
      "Português",
      "Español",
      "Français",
    ]),
      i.GObject.inherit(h, l),
      (h.ID = "language"),
      (h.prototype._locale = null),
      (h.prototype._title = null),
      (h.prototype.getId = function () {
        return h.ID + "." + this._locale;
      }),
      (h.prototype.isCheckable = function () {
        return !0;
      }),
      (h.prototype.isChecked = function () {
        return i.GLocale.getLanguage() === this._locale;
      }),
      (h.prototype.getTitle = function () {
        return this._title;
      }),
      (h.prototype.getCategory = function () {
        return s.CATEGORY_HELP_LANGUAGE;
      }),
      (h.prototype.getGroup = function () {
        return "help/language";
      }),
      (h.prototype.isEnabled = function () {
        return !0;
      }),
      (h.prototype.isVisible = function () {
        return !g();
      }),
      (h.prototype.execute = function () {
        if (i.GLocale.getLanguage() !== this._locale) {
          let e = () => gDesigner.setSetting("language", this._locale),
            t = () =>
              r.gApi
                .updateUser({ locale: i.GLocale.lookupLocale(this._locale) })
                .then(() => e())
                .then(() => this._reloadApp())
                .catch((e) => p.alert(r.gApi.formatError(e)));
          gDesigner.getUser().then((n) => {
            n
              ? gDesigner.isAnonymous()
                ? (e(), this._reloadApp())
                : t()
              : u.performLogin().then((e) => {
                  e && t();
                });
          });
        }
      }),
      (h.prototype._reloadApp = function () {
        gContainer.getRuntime() === d.Runtime.Browser ||
        gContainer.getRuntime() === d.Runtime.PWA
          ? location.reload()
          : new c(
              i.GLocale.get(
                new i.GLocaleKey("GNewDocumentDialog", "text.restart-app")
              )
            ).open();
      }),
      (h.prototype.toString = function () {
        return "[Object GSwitchLanguageAction]";
      }),
      (e.exports = h);
  }