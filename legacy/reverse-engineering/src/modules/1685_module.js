/**
 * Webpack Module #1685
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    const i = {
      [o.GLocaleLanguage.Portuguese]: "pt-br",
      [o.GLocaleLanguage.Spanish]: "es",
      [o.GLocaleLanguage.German]: "de",
      [o.GLocaleLanguage.Italian]: "it",
      [o.GLocaleLanguage.French]: "fr",
    };
    e.exports = class {
      constructor() {
        const e = i[o.GLocale.getLanguage()] || 'en',
          t = $('<iframe>')
            .attr(
              'src',
              ''
            )
            .on('load error', () => this._dialog.removeClass('g-loading'));
        this._dialog = $("<div/>")
          .addClass("g-loading")
          .gDialog({
            releaseOnClose: !0,
            className: "g-windows-store-announcement-dialog",
            buttons: [
              $("<button/>")
                .addClass("primary")
                .text(o.GLocale.get(new o.GLocaleKey("GLocale", "ok")))
                .on("click", () => this.close()),
            ],
          })
          .append(t);
      }
      open() {
        this._dialog.gDialog("open", !1);
      }
      close() {
        this._dialog.gDialog("close");
      }
    };
  }