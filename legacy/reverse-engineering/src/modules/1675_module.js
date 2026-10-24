/**
 * Webpack Module #1675
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    e.exports = class {
      constructor() {
        (this._dialog = $("<div></div>").gDialog({
          relaseOnClose: !0,
          className: "g-maintenance-dialog",
        })),
          $("<iframe></iframe>")
            .attr("src", "assets/static/maintenance/index.html")
            .appendTo(this._dialog);
      }
      open() {
        this._dialog.gDialog("open", !0);
      }
      close() {
        this._dialog.gDialog("close");
      }
    };
  }