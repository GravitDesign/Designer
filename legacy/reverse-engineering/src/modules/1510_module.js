/**
 * Webpack Module #1510
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    var o = n(1),
      i = n(40),
      a = n(257);
    class r {
      constructor(e) {
        let { closeCallback: t } =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        var n = this;
        (this._dialog = $("<div/>")
          .addClass("g-save-chooser")
          .append(
            $("<div/>")
              .addClass("save-to-file")
              .append(
                $("<div/>")
                  .addClass("content")
                  .append(
                    $("<span/>")
                      .addClass("gravit-icon-local-file")
                      .addClass("icon")
                  )
                  .append(
                    $("<span/>")
                      .addClass("label")
                      .text(
                        o.GLocale.get(
                          new o.GLocaleKey("GCommonNames", "text.save-to-file")
                        )
                      )
                  )
              )
              .on("click", async function () {
                gDesigner.stats("savedialog_save_file"),
                  await n.close(),
                  e(r.file());
              })
          )
          .append($("<hr/>"))
          .append(
            $("<div/>")
              .addClass("save-to-file")
              .append(
                $("<div/>")
                  .addClass("content")
                  .append(
                    $("<span/>")
                      .addClass(a["gravit-icon-cloud-save-choose"])
                      .addClass("icon")
                  )
                  .append(
                    $("<span/>")
                      .addClass("label")
                      .text(
                        o.GLocale.get(
                          new o.GLocaleKey("GCommonNames", "text.save-to-cloud")
                        )
                      )
                  )
              )
              .on("click", async function () {
                gDesigner.stats("savedialog_save_cloud"),
                  await n.close(),
                  e(r.cloud());
              })
          )),
          this._dialog.gDialog({
            releaseOnClose: !0,
            className: "g-save-chooser-dialog",
            closeTimeout: 0,
            closeCallback: t,
          });
      }
      open() {
        this._dialog.gDialog("open", !0);
      }
      close() {
        return this._dialog.gDialog("close", !1), (0, i.sleep)(0);
      }
      static file() {
        return "file";
      }
      static cloud() {
        return "cloud";
      }
    }
    e.exports = r;
  }