/**
 * Webpack Module #1682
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8), n(196), n(4), n(13);
    const o = n(1190),
      i = n(292),
      a = n(291),
      {
        gApi: r,
        MicrosoftB2BKeyType: s,
        PaymentProviders: l,
        DateAPI: c,
        IN_APP_PURCHASE: {
          WINDOWS: { production: d, trunk: u, rc: p, beta: g, lts: h } = {},
        } = {},
      } = n(10),
      { IS_PRODUCTION: f, IS_LTS: m, IS_RC: y, IS_BETA: v } = n(231),
      {
        ERROR_CODES: { ERR_MICROSOFT_STORE_SERVICES_B2B_KEY_NOT_FOUND: _ },
      } = r;
    e.exports = class extends o {
      constructor() {
        if ((super(), !window.napi)) return;
        const { remote: e } = n(881),
          t = e.getCurrentWindow().getNativeWindowHandle();
        (this._store = new window.napi.windowsStore.StoreContext()),
          this._store.initialize(t),
          gDesigner.addEventListener(i, this._userLoggedEvent, this),
          gDesigner.addEventListener(
            a,
            this._networkAvailabilityChangedEvent,
            this
          ),
          (this._intervalId = setInterval(
            () => this.syncLicense(),
            c.daysToMilliseconds(1)
          ));
      }
      async purchase(e, t) {
        try {
          if (
            (gDesigner.toggleLoading(!0),
            e || (e = await this.getProduct()),
            !e)
          )
            return;
        } finally {
          gDesigner.toggleLoading(!1);
        }
        return new Promise((t, n) => {
          const o = setTimeout(() => {
            n();
          }, c.minutesToMilliseconds(3));
          this._store.requestPurchaseAsync(e.productId, (e, i) => {
            clearTimeout(o),
              e
                ? n(e)
                : (gDesigner.toggleLoading(!0),
                  this.syncLicense()
                    .then(t)
                    .catch(n)
                    .finally(() => {
                      gDesigner.toggleLoading(!1);
                    }));
          });
        });
      }
      async getProduct() {
        return new Promise((e, t) => {
          this._store.getAssociatedStoreProductsAsync(["Durable"], (n, o) => {
            if (n) return t(n);
            if (!o) return t();
            const i = this._getInAppOfferToken();
            if (!i) return t();
            const a = Object.values(o).find((e) => e.inAppOfferToken === i);
            if (!a) return t();
            e({
              provider: l.WindowsStore,
              formattedPrice: a.price.formattedRecurrencePrice,
              currency: a.price.currencyCode,
              productId: a.storeId,
            });
          });
        });
      }
      async syncLicense() {
        const e = await gDesigner.getUser();
        if (e)
          return r.microsoftStoreServices
            .syncLicense()
            .then(() => gDesigner.requestLicenseUpdate())
            .catch(async (t) => {
              if (t.cloud && t.code === _) {
                const t = await r.microsoftStoreServices.getAccessToken(),
                  n = await this._createB2BKeyForPurchaseAPI(e, t),
                  o = await this._createB2BKeyForCollectionsAPI(e, t);
                return (
                  await r.microsoftStoreServices.updateB2BKeys({
                    accessToken: t,
                    keys: { [s.Purchase]: n, [s.Collections]: o },
                  }),
                  r.microsoftStoreServices
                    .syncLicense()
                    .then(() => gDesigner.requestLicenseUpdate())
                );
              }
              throw t;
            });
      }
      _getInAppOfferToken() {
        return f ? d : v ? g : m ? h : y ? p : u;
      }
      _createB2BKeyForPurchaseAPI(e, t) {
        return new Promise(async (n, o) => {
          this._store.getCustomerPurchaseIdAsync(t, e.getUID(), (e, t) => {
            e ? o(e) : n(t);
          });
        });
      }
      _createB2BKeyForCollectionsAPI(e, t) {
        return new Promise(async (n, o) => {
          this._store.getCustomerCollectionsIdAsync(t, e.getUID(), (e, t) => {
            e ? o(e) : n(t);
          });
        });
      }
      _userLoggedEvent(e) {
        this.syncLicense();
      }
      _networkAvailabilityChangedEvent(e) {
        e.connected && this.syncLicense();
      }
    };
  }