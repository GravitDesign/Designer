/**
 * Webpack Module #1511
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    function i(e, t) {
      (this._neverRemind = !1),
        (this._agreeCb = e),
        (this._rejectCb = t || this.close),
        gContainer
          .getProperty(
            "designer.settings.warn-linked-image-dialog.never-remind"
          )
          .then((t) => {
            (t = t || !1) ? e() : this._init();
          });
    }
    o.GObject.inherit(i, o.GObject),
      (i.prototype._init = function () {
        (this._dialog = $("<div></div>")
          .addClass("container")
          .append(
            $("<div />")
              .addClass("text-content")
              .text(
                o.GLocale.get(
                  new o.GLocaleKey(
                    "GWarnLinkedImageDialog",
                    "warn-linked-image.text"
                  )
                )
              )
          )
          .append(
            $("<div />")
              .addClass("checkbox-content")
              .append(
                $("<input />")
                  .attr("type", "checkbox")
                  .attr("name", "never-remind")
                  .attr("checked", this._neverRemind)
                  .on(
                    "change",
                    function () {
                      this._neverRemind = !this._neverRemind;
                    }.bind(this)
                  )
              )
              .append(
                $("<span />")
                  .addClass("checkbox-text")
                  .html(
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GWarnLinkedImageDialog",
                        "warn-linked-image.never-remind"
                      )
                    )
                  )
              )
          )
          .gDialog({
            releaseOnClose: !0,
            className: "g-warn-linked-image-dialog",
            buttons: [
              $("<button />")
                .addClass("native-button")
                .attr("type", "submit")
                .html(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GWarnLinkedImageDialog",
                      "warn-linked-image.proceed"
                    )
                  )
                )
                .on("click", this.save.bind(this)),
              $("<button />")
                .addClass("native-button")
                .html(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GWarnLinkedImageDialog",
                      "warn-linked-image.cancel"
                    )
                  )
                )
                .on("click", this._rejectCb.bind(this)),
            ],
          })),
          $("<div></div>")
            .addClass("g-btn-close")
            .append($("<span></span>").addClass("gravit-icon-close"))
            .on("click", this.close.bind(this))
            .appendTo(this._dialog);
      }),
      (i.prototype.save = function () {
        this._neverRemind &&
          gContainer &&
          gContainer.setProperty &&
          gContainer.setProperty(
            "designer.settings.warn-linked-image-dialog.never-remind",
            !0
          ),
          this.close(),
          this._agreeCb();
      }),
      (i.prototype.open = function () {
        this._dialog.gDialog("open", !0);
      }),
      (i.prototype.close = function () {
        this._dialog.gDialog("close");
      }),
      (e.exports = i);
  }