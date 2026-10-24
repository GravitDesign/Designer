/**
 * Webpack Module #1679
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(30), n(8), n(196);
    var i = o(n(1249)),
      a = o(n(1155)),
      r = n(1);
    const {
        gApi: s,
        IN_APP_PURCHASE: {
          CLEVERBRIDGE: { openCartInAPopup: l = !1 } = {},
        } = {},
      } = n(10),
      c = n(808),
      d = n(292),
      u = n(604),
      p = n(256),
      g = n(1680),
      h = n(1681),
      f = n(1190);
    e.exports = class extends f {
      getOptions() {
        return this._paymentFlow ? this._paymentFlow.getOptions() : null;
      }
      async purchase(e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        return (
          gDesigner.toggleLoading(!0),
          this._purchase(e, t).finally(() => {
            gDesigner.toggleLoading(!1);
          })
        );
      }
      _purchase(e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        return $(".g-payment-dialog").length
          ? Promise.reject(!1)
          : new Promise(async (n, o) => {
              try {
                this._paymentFlow && this._paymentFlow.abort(),
                  (this._paymentFlow = new i.default(t));
                const l = async () => {
                  const {
                      immediatePurchase: i = !1,
                      paymentCallback: l = () => {},
                      autoClose: p = !1,
                    } = t,
                    g = await gDesigner.getUser();
                  if (!e) {
                    if (!g)
                      return (
                        this._paymentFlow.step(
                          new a.default()
                            .listen(d)
                            .when((e) => !!e && !!e.user)
                            .do(() => {
                              gDesigner.openPaymentDialog(e, t);
                            })
                        ),
                        void n()
                      );
                    {
                      const n = gDesigner.now().getTime();
                      e = await s.getProduct(
                        Object.assign(
                          {
                            time: n,
                            language: r.GLocale.getLocaleLanguageTag().slice(
                              0,
                              2
                            ),
                          },
                          t
                        )
                      );
                    }
                  }
                  if (!e) return void o(new Error("Product is missing"));
                  const { reinstate: h = !1 } = e;
                  if (h)
                    return (
                      this._paymentFlow.step(
                        gDesigner.executeWhenReady(() => {
                          new u(this._user, "purchase").open();
                        })
                      ),
                      void n({ reinstate: !0 })
                    );
                  this._paymentFlow.step(
                    new a.default()
                      .listen(c)
                      .when(() => gDesigner.isInitialized())
                      .do(async () => {
                        try {
                          const t = await this._openCart(e, i, p);
                          l(t);
                        } catch (e) {
                          l({});
                        }
                      }, i)
                  ),
                    n();
                };
                gDesigner.isOffline()
                  ? (p.openRetryConnection(l), gDesigner.toggleLoading(!1))
                  : await l();
              } catch (e) {
                o(e);
              }
            }).then(
              (e) => (
                (e && e.reinstate) ||
                  ("undefined" != typeof dataLayer &&
                    dataLayer.push({ event: "USER_CART_VIEW_EVENT" })),
                e
              )
            );
      }
      _openCart(e, t, n) {
        return l && !t ? this._openCartPopup(e) : this._openCartDialog(e, n);
      }
      _openCartPopup(e) {
        return new h().open(e.url);
      }
      _openCartDialog(e, t) {
        return new g().open(e.url, t);
      }
    };
  }