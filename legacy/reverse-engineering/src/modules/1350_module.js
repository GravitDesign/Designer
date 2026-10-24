/**
 * Webpack Module #1350
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(30), n(8);
    const o = n(337),
      i = n(1338),
      { gApi: a, PurchaseStatus: r } = n(10),
      { IS_TRUNK: s } = n(231);
    let l;
    class c {
      static getInstance() {
        return l || (l = new c()), l;
      }
      waitForPurchase() {
        return (
          this.cancelPurchase(),
          (this._promiseCapabilities = {}),
          new Promise((e, t) => {
            Object.assign(this._promiseCapabilities, { resolve: e, reject: t }),
              (this._ws = new a.WebSocketClient()),
              this._ws.connect("/payload"),
              this._ws.on("payload", async (t) => {
                try {
                  const { data: n } = t;
                  await this._tryCheckLicense(),
                    await this._tryFireEvent(n),
                    (n.licenseHasBeenUpgraded =
                      this._shouldFireUserCompletedPurchaseEvent(n)),
                    e(n);
                } finally {
                  this._ws.close();
                }
              });
          })
        );
      }
      cancelPurchase() {
        this._promiseCapabilities &&
          this._promiseCapabilities.resolve &&
          this._promiseCapabilities.resolve(),
          this._ws && this._ws.close();
      }
      async _tryCheckLicense() {
        try {
          await o.checkLicense();
        } catch (e) {
          console.error("GLicenseManager.checkLicense", e);
        }
      }
      async _tryFireEvent(e) {
        try {
          this._shouldFireUserCompletedPurchaseEvent(e) &&
            i.fireEvent(i.Events.USER_COMPLETED_PURCHASE_EVENT);
        } catch (e) {
          console.error("GTMHelper.fireEvent", e);
        }
      }
      _shouldFireUserCompletedPurchaseEvent(e) {
        const { statusId: t } = e;
        return !(!s || t !== r.SuccessfulTestOrder) || t === r.Paid;
      }
    }
    e.exports = c;
  }