/**
 * Webpack Module #1577
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(30), n(8);
    var i = n(10),
      a = n(1),
      r = o(n(1187));
    function s() {}
    a.GObject.inherit(s, i.GPaywallDialog.Impl),
      (s.prototype.open = function (e) {
        let { dialog: t } = e;
        this._dialog = t
          .getHTMLElement()
          .gDialog({ releaseOnClose: !0, nowrap: !0 })
          .gDialog("open");
      }),
      (s.prototype.close = function () {
        let { licenseHasBeenUpgraded: e = !1 } =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        this._dialog.closest(".g-dialog-container").remove(),
          e && gDesigner.requestLicenseUpdate();
      }),
      (s.prototype.openPurchaseFlow = async function (e) {
        let { dialog: t, options: n = {} } = e;
        await gDesigner.openPaymentDialog(null, n).catch(() => null), t.close();
      }),
      (s.prototype.openExternalLink = function (e) {
        let { link: t } = e;
        gContainer.openExternalLink(null, t);
      }),
      (s.prototype.getProduct = function () {
        return Promise.resolve({
          price: -1,
          listPrice: -1,
          locale: navigator.language,
          currency: "USD",
        });
      }),
      (s.prototype.getLicense = function () {
        let e = gDesigner.getLicense();
        return Promise.resolve({
          license: e.getLicenseType(),
          expire: e.getExpirationDate(),
          created: e.getCreationDate(),
          legacy: e.isLegacy(),
        });
      }),
      (s.prototype.getUser = function () {
        return gDesigner.getSyncUser();
      }),
      (s.prototype.getLanguage = function () {
        return a.GLocale.getLanguage();
      });
    class l extends r.default {
      constructor(e) {
        super(), (this._dialogOptions = e);
      }
      async open() {
        new i.GPaywallDialog(
          Object.assign(this._dialogOptions, { impl: new s(), gApi: i.gApi })
        ).open();
      }
    }
    e.exports = l;
  }