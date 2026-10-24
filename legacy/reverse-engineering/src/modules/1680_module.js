/**
 * Webpack Module #1680
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(8), n(20), n(3), n(34), n(26), n(125), n(126), n(114);
    var o = n(1),
      i = n(10);
    const a = n(256),
      r = n(44),
      s = n(1350);
    e.exports = class {
      async open(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        (this._url = e), (this._autoClose = t), (this._isPending = !0);
        return (await gDesigner.isOfflineAsync())
          ? new Promise((e, t) => {
              a.openRetryConnection(() => {
                this._open().then(e).catch(t);
              });
            })
          : this._open();
      }
      async _open() {
        if ($(".g-payment-dialog").length) return Promise.reject();
        const e = s.getInstance();
        this._dialog = $("<div></div>")
          .gDialog({
            className: "g-payment-dialog",
            releaseOnClose: !0,
            closeCallback: () => {
              e.cancelPurchase();
            },
          })
          .append(
            $("<div></div>")
              .addClass("g-btn-close")
              .append($("<span></span>").addClass("gravit-icon-close"))
              .on("click", () => {
                this._close();
              })
          );
        const t = $("<div></div>").addClass("content").appendTo(this._dialog);
        this._dialog.addClass("g-loading"), this._dialog.gDialog("open", !1);
        const n = this._getURL();
        $("<iframe/>")
          .attr("src", n)
          .on("load", () => {
            this._dialog.removeClass("g-loading");
          })
          .on("error", () => {
            this._dialog.removeClass("g-loading");
          })
          .appendTo(t);
        try {
          await e.waitForPurchase();
        } catch (e) {
          r.alert(
            o.GLocale.getValue(
              "GPaymentDialog",
              "text.payment-not-confirmed"
            ).replace("%link", i.gApi.link.getSupportUrl())
          );
        } finally {
          this._isPending = !1;
        }
      }
      _getURL() {
        let e = this._url;
        const t = gDesigner.getLinkerParam();
        if (t) {
          const n = new URL(e);
          n.searchParams.set.apply(n.searchParams, t.split("=")),
            (e = n.toString());
        }
        return e;
      }
      _close() {
        if (this._isPending) {
          const e = o.GLocale.get(
              new o.GLocaleKey("GPaymentDialog", "text.dialog-dont-leave")
            ),
            t = o.GLocale.get(
              new o.GLocaleKey("GPaymentDialog", "text.cancel")
            ),
            n = o.GLocale.get(
              new o.GLocaleKey("GPaymentDialog", "text.finish-my-order")
            );
          r.confirm(
            e,
            (e) => {
              e
                ? ((this._autoClose = !0), this._isPending || this.close())
                : this.close();
            },
            t,
            n
          );
        } else this.close();
      }
      close() {
        this._dialog.gDialog("close");
      }
    };
  }