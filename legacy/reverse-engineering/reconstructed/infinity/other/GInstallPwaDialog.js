/**
 * GInstallPwaDialog
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GInstallPwaDialog(e) {
      const t = (e) => {
        if (a.GKey.translateKey(e.keyCode) === a.GKey.Constant.ESC)
          return (
            e.preventDefault(),
            e.stopPropagation(),
            $(document).off("keydown", t),
            this._dialog.gDialog("close"),
            !1
          );
      };
      let n = "g-install-pwa-dialog";
      e && (n += "-dark"),
        (this._dialog = $("<div />").gDialog({
          releaseOnClose: !0,
          className: n,
          alwaysCloseable: !0,
          closeCallback: () => $(document).off("keydown", t),
        })),
        $(document).on("keydown", t),
        this._dialog
          .append(this._getCloseButton())
          .append(this._getDialogContent());
    }

// Prototype methods
GInstallPwaDialog.prototype._getCloseButton = function () {
        return $("<div />")
          .addClass("g-btn-close")
          .append($("<span />").addClass("gravit-icon-close"))
          .on("click", this.close.bind(this));
      }

GInstallPwaDialog.prototype._getDialogContent = function () {
        return $("<div />")
          .addClass("content")
          .append(this._getHeader())
          .append(this._getMainContent());
      }

GInstallPwaDialog.prototype._getHeader = function () {
        return $("<div />").addClass("header");
      }

GInstallPwaDialog.prototype._getMainContent = function () {
        return $("<div />")
          .addClass("main-content")
          .append(
            $("<div />")
              .addClass("title")
              .text(
                i.GLocale.get(
                  new i.GLocaleKey("GInstallPwaDialog", "text.title")
                )
              )
          )
          .append(
            $("<div />")
              .addClass("description")
              .append(
                $("<span />").text(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GInstallPwaDialog",
                      "text.description-text"
                    )
                  )
                )
              )
              .append(
                $('<a />')
                  .attr('href', '')
                  .attr('target', '_blank')
                  .text(
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GInstallPwaDialog",
                        "text.description-pro-link"
                      )
                    )
                  )
              )
              .append(
                $("<span />").text(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GInstallPwaDialog",
                      "text.end-sentence-dot"
                    )
                  )
                )
              )
          )
          .append(
            s.default.isSupported()
              ? this._getButtons()
              : this._buildChromiumInfoSection()
          )
          .append(this._getFooter());
      }

GInstallPwaDialog.prototype._getButtons = function () {
        var e = this;
        return $("<div />")
          .addClass("buttons")
          .append(
            $("<button />")
              .addClass("primary")
              .addClass("g-button")
              .text(
                i.GLocale.get(
                  new i.GLocaleKey("GInstallPwaDialog", "action.install-button")
                )
              )
              .on("click", function (t) {
                try {
                  gDesigner.executeAction(r.default.ID);
                } catch (t) {
                  r.default.install();
                }
                e.close();
              })
          )
          .append(
            $("<button />")
              .addClass("g-button")
              .text(
                i.GLocale.get(
                  new i.GLocaleKey("GInstallPwaDialog", "action.not-now-button")
                )
              )
              .on("click", () => {
                const e = gDesigner.now().getTime();
                gContainer.setProperty(
                  r.default.closedInstallPWADialogDatePropName,
                  e
                ),
                  this.close();
              })
          );
      }

GInstallPwaDialog.prototype._buildChromiumInfoSection = function () {
        return $("<div />")
          .addClass("chromium-section")
          .append(
            $("<div/>")
              .addClass("chromium-content")
              .html(
                i.GLocale.get(
                  new i.GLocaleKey("GInstallPwaDialog", "text.pwa-requires")
                )
              )
          );
      }

GInstallPwaDialog.prototype._getFooter = function () {
        return $("<div />")
          .addClass("footer")
          .append(
            $("<span />").text(
              i.GLocale.get(
                new i.GLocaleKey("GInstallPwaDialog", "text.footer-main-text")
              )
            )
          )
          .append(
            $("<span />").text(
              i.GLocale.get(
                new i.GLocaleKey("GInstallPwaDialog", "action.footer-link-text")
              )
            )
          )
          .append(
            $("<span />").text(
              i.GLocale.get(
                new i.GLocaleKey("GInstallPwaDialog", "text.end-sentence-dot")
              )
            )
          )
          .append($('<span> </span>'))
          .append(
            $('<a />')
              .attr(
                'href',
                ''
              )
              .attr('target', '_blank')
              .text(
                i.GLocale.get(
                  new i.GLocaleKey(
                    "GInstallPwaDialog",
                    "action.footer-more-information"
                  )
                )
              )
          );
      }

GInstallPwaDialog.prototype.open = function () {
        this._dialog.gDialog("open", !1);
      }

GInstallPwaDialog.prototype.close = function () {
        this._dialog.gDialog("close");
      }

GInstallPwaDialog.prototype.toString = function () {
        return "[Object GInstallPwaDialog]";
      }

module.exports = GInstallPwaDialog;
