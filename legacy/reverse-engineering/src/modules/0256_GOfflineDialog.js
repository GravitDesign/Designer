/**
 * Webpack Module #256
 * Type: class
 * Name: GOfflineDialog
 */

function (e, t, n) {
    "use strict";
    n(8), n(20), n(3), n(34), n(38);
    var o = n(1),
      i = n(15),
      a = n(40),
      r = n(10),
      s = n(357);
    function l(e, t, n) {
      const a = (e) => {
        if (i.GKey.translateKey(e.keyCode) === i.GKey.Constant.ESC)
          return (
            e.preventDefault(),
            e.stopPropagation(),
            $(document).off("keydown", a),
            this._dialog.gDialog("close"),
            !1
          );
      };
      (this._dialog = $("<div></div>").gDialog({
        releaseOnClose: !0,
        className: "g-offline-dialog",
        alwaysCloseable: !0,
        closeCallback: () => $(document).off("keydown", a),
      })),
        $(document).on("keydown", a),
        $("<div></div>")
          .addClass("g-btn-close")
          .append($("<span></span>").addClass("gravit-icon-close"))
          .on("click", this.close.bind(this))
          .appendTo(this._dialog),
        $("<div></div>").addClass("logo").appendTo(this._dialog);
      const l = $("<div></div>")
        .addClass("content")
        .append($("<span></span>").addClass("title").html(e))
        .append($("<span></span>").addClass("subtitle").html(t))
        .append(
          $("<div></div>")
            .addClass("buttons")
            .append(
              n.map((e) => {
                let { label: t, onclick: n, highlighted: o } = e;
                return $("<button></button>")
                  .append($("<span></span>").text(t))
                  .addClass("g-pro-button " + (o ? "highlighted" : ""))
                  .on("click", () => n(this));
              })
            )
        );
      s.OFFLINEDIALOG.HAS_FOOTER &&
        l.append(
          $("<span></span>")
            .addClass("footer")
            .html(
              o.GLocale.getValue(
                "GOfflineDialog",
                "text.offline-footer"
              ).replace("%link", r.gApi.link.getSupportUrl())
            )
        ),
        l.appendTo(this._dialog);
    }
    o.GObject.inherit(l, o.GObject),
      (l.openOfflineWarning = async function () {
        const e = await gDesigner.getUser();
        if (!e) return;
        const t = gDesigner.getLicense(),
          n = gDesigner.now();
        let i = r.DateAPI.millisecondsToDays(
          r.DateAPI.diff(r.DateAPI.toUTCZone(n), t.getOfflineExpirationDate())
        );
        new l(
          o.GLocale.get(
            new o.GLocaleKey("GOfflineDialog", "text.offline-title")
          ).replace("%name", e.getFullUserName()),
          o.GLocale.get(
            new o.GLocaleKey("GOfflineDialog", "text.offline-subtitle")
          ).replace("%days", i),
          [
            {
              label: o.GLocale.get(
                new o.GLocaleKey("GOfflineDialog", "text.offline-check")
              ),
              onclick: (e) => e.close(),
            },
          ]
        ).open();
      }),
      (l.openUnavailableFeature = function (e) {
        l.openRetryConnection(
          e,
          o.GLocale.get(
            new o.GLocaleKey("GOfflineDialog", "title.unavailable-feature")
          )
        );
      }),
      (l.openRetryConnection = async function (e, t) {
        if ($(".g-offline-dialog").length) return;
        const n = await gDesigner.getUser();
        new l(
          t ||
            o.GLocale.get(
              new o.GLocaleKey("GOfflineDialog", "text.offline-title-retry")
            ).replace(
              "%name",
              n
                ? n.getFullUserName()
                : o.GLocale.get(
                    new o.GLocaleKey(
                      "GOfflineDialog",
                      "text.display-name-in-case-missing"
                    )
                  )
            ),
          "",
          [
            {
              label: o.GLocale.get(
                new o.GLocaleKey("GOfflineDialog", "text.offline-retry")
              ),
              highlighted: !0,
              onclick: async (t) => {
                gDesigner.stats("offline-dialog_retry"),
                  t._dialog.addClass("g-loading"),
                  await (0, a.sleep)(500),
                  t._dialog.removeClass("g-loading"),
                  (await gDesigner.isOfflineAsync()) || (e && e(), t.close());
              },
            },
            {
              label: o.GLocale.get(
                new o.GLocaleKey("GOfflineDialog", "text.offline-cancel")
              ),
              onclick: (e) => {
                gDesigner.stats("offline-dialog_cancel"), e.close();
              },
            },
          ]
        ).open();
      }),
      (l.prototype._dialog = null),
      (l.prototype.open = function () {
        this._dialog.gDialog("open", !1);
      }),
      (l.prototype.close = function () {
        this._dialog.gDialog("close");
      }),
      (l.prototype.toString = function () {
        return "[Object GOfflineDialog]";
      }),
      (e.exports = l);
  }