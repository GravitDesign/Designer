/**
 * Webpack Module #1252
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(30), n(8), n(3), n(4), n(32), n(33), n(26), n(125), n(126), n(114);
    const o = n(604);
    e.exports = class {
      constructor() {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        this._settings = e;
      }
      getFrame() {
        return this._iframe;
      }
      open(e) {
        const t = gDesigner.getUTM();
        if (t && t.size) {
          const n = new URL(e),
            o = n.searchParams;
          t.forEach((e, t) => o.set(t, e)), (e = n.toString());
        }
        if (
          ((this._iframe = $("<iframe></iframe>")
            .addClass("cross-frame")
            .attr("src", e)
            .appendTo($("body"))),
          this._settings)
        ) {
          const { id: e, className: t, css: n } = this._settings;
          e && this._iframe.attr("id", e),
            t && this._iframe.addClass(t),
            n && this._iframe.css(n);
        }
        let n = this.close.bind(this);
        return (
          this._settings.close && (n = this._settings.close),
          (this._messageHandler = async (e) => {
            if (e.originalEvent.source !== this._iframe[0].contentWindow)
              return;
            let t = e.originalEvent.data;
            const { cmd: i } = t;
            if (i) {
              if (this._settings[i]) return void this._settings[i](t);
              switch (i) {
                case "close":
                  n(t);
                  break;
                case "settings":
                  let e = await gDesigner.getUser();
                  new o(e, "purchase").open();
                  break;
                case "purchase_flow":
                  const { options: i = {} } = t,
                    { immediatePurchase: a = !1, closeable: r = !0 } = i;
                  a &&
                    Object.assign(i, {
                      autoClose: !0,
                      paymentCallback: () => {
                        n();
                      },
                    }),
                    r ||
                      Object.assign(i, {
                        paymentCallback: (e) => {
                          let { licenseHasBeenUpgraded: t = !1 } = e;
                          n({ licenseHasBeenUpgraded: t, closeable: r });
                        },
                      });
                  let s = t.options;
                  gInAppPurchase.getOptions() &&
                    (s = Object.assign({}, gInAppPurchase.getOptions(), s)),
                    gDesigner
                      .openPaymentDialog(null, s)
                      .then(function () {
                        let { reinstate: e } =
                          arguments.length > 0 && void 0 !== arguments[0]
                            ? arguments[0]
                            : {};
                        (a && !e) || n({ closeable: r });
                      })
                      .catch(() => {
                        n({ closeable: r });
                      });
                  break;
                case "link":
                  gContainer.openExternalLink(null, t.link);
              }
            }
          }),
          $(window).on("message", this._messageHandler),
          this
        );
      }
      close() {
        let { licenseHasBeenUpgraded: e = !1, closeable: t = !0 } =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        this._messageHandler &&
          (t || e) &&
          ($(window).unbind("message", this._messageHandler),
          this._iframe.remove()),
          e && gDesigner.requestLicenseUpdate();
      }
      on(e, t) {
        this._iframe.on(e, t);
      }
      postMessage() {
        this._iframe[0].contentWindow.postMessage.apply(
          this._iframe[0].contentWindow,
          arguments
        );
      }
    };
  }