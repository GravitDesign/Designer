/**
 * Webpack Module #1644
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(32), n(33);
    var o = n(1),
      i = n(15);
    e.exports = class {
      constructor() {
        (this._dialog = this._createDialog()),
          this._dialog.append(
            this._createCloseButton(),
            this._getTitle(),
            this._getContent()
          );
      }
      open() {
        this._dialog.gDialog("open", !0);
      }
      close() {
        this._dialog.gDialog("close");
      }
      _getTitle() {
        const e = o.GLocale.getValue("GShortcutsDialog", "text.title");
        return $("<div />").addClass("title").text(e);
      }
      _getContent() {
        const e = $("<table/>"),
          t = $("<tbody/>").appendTo(e);
        return (
          gDesigner.getActions().forEach((e) => {
            if (!e.isAvailable()) return;
            const n = e.getShortcutHint({ isWordMode: !0 });
            if (n) {
              const i = o.GLocale.get(e.getFullTitle());
              this._createTableRow(i, n).appendTo(t);
            }
          }),
          gravit.tools.forEach((e) => {
            if (e.key) {
              const n = i.GKey.shortcutToString(e.key);
              if (!n) return;
              const a = o.GLocale.get(e.richTooltipConfig.getConfig().title);
              this._createTableRow(a, n).appendTo(t);
            }
          }),
          $("<div/>").addClass("wrapper").append(e)
        );
      }
      _createDialog() {
        return $("<div/>").gDialog({
          releaseOnClose: !0,
          className: "g-shortcuts-dialog",
        });
      }
      _createCloseButton() {
        const e = $("<span />").addClass("gravit-icon-close");
        return $("<div />")
          .addClass("g-btn-close")
          .append(e)
          .on("click", this.close.bind(this));
      }
      _createTableRow(e, t) {
        const n = $("<tr/>");
        return (
          $("<td/>").text(e).appendTo(n), $("<td/>").text(t).appendTo(n), n
        );
      }
    };
  }