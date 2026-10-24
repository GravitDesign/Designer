/**
 * Webpack Module #1326
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    var o = n(1);
    const i = n(1327),
      a = n(1577);
    class r {
      static openOfferReminder(e) {
        return r._openPaywall("reminder", e);
      }
      static openSubscriptionOffer(e) {
        return r._openPaywall("subscribe", e);
      }
      static async _openPaywall() {
        let e =
            arguments.length > 0 && void 0 !== arguments[0]
              ? arguments[0]
              : "reminder",
          t =
            arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        const n = await this._getProduct(),
          r = this._getLayout(),
          s = gDesigner.getApplicationManager().isInAppPurchaseAvailable();
        return (await i.newBuilder(a))
          .setId("paywall-cross-frame")
          .setEndpoint("/pro/paywall/".concat(e))
          .setTime(gDesigner.now())
          .setLanguage(o.GLocale.getLanguage())
          .setCampaign(t.campaign)
          .setShareFile(t.shareFile)
          .setDashboard(t.dashboard)
          .setProduct(n)
          .setInAppPurchasesAvailable(s)
          .setLayout(r)
          .build()
          .open();
      }
      static _getProduct() {
        return gInAppPurchase.getProduct().catch(() => null);
      }
      static _getLayout() {
        return a.DEFAULT_LAYOUT;
      }
    }
    e.exports = r;
  }