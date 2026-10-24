/**
 * Webpack Module #219
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    e.exports = class {
      constructor(e, t) {
        (this._cb = t || null),
          (this._dialog = $("<div></div>")),
          $("<div/>")
            .addClass("message")
            .css({ lineHeight: "1.5em" })
            .append($("<span/>").html(e))
            .appendTo(this._dialog),
          this._dialog.gDialog({
            releaseOnClose: !0,
            buttons: [
              $(
                "<button>" +
                  o.GLocale.get(new o.GLocaleKey("GLocale", "ok")) +
                  "</button>"
              ).on("click", () => this.close()),
            ],
          });
      }
      open() {
        this._dialog.gDialog("open", !0);
      }
      close() {
        this._dialog.gDialog("close"), this._cb && this._cb();
      }
    };
  }