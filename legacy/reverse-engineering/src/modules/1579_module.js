/**
 * Webpack Module #1579
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(30), n(8);
    var i = n(10),
      a = n(1),
      r = o(n(1187));
    class s extends i.GReminderDialog.Impl {
      open(e) {
        let { dialog: t } = e;
        this._dialog = t
          .getHTMLElement()
          .gDialog({ releaseOnClose: !0, nowrap: !0 })
          .gDialog("open");
      }
      async openPurchaseFlow(e) {
        let { dialog: t, options: n = {} } = e;
        await gDesigner.openPaymentDialog(null, n).catch(() => null);
      }
      openExternalLink(e) {
        let { link: t } = e;
        gContainer.openExternalLink(null, t);
      }
      close() {
        this._dialog.gDialog("close");
      }
      getProduct() {
        return Promise.resolve({
          price: -1,
          listPrice: -1,
          locale: navigator.language,
          currency: "USD",
        });
      }
      getLicense() {
        let e = gDesigner.getLicense();
        return Promise.resolve({
          license: e._license,
          expire: e._expire,
          created: e._created,
          legacy: e._legacy,
        });
      }
      getLanguage() {
        return a.GLocale.getLanguage();
      }
    }
    class l extends r.default {
      constructor(e) {
        super(), (this._dialogOptions = e);
      }
      async open() {
        const e = new s(),
          t = Object.assign(this._dialogOptions, { impl: e });
        switch (this._dialogOptions.endpoint) {
          case "/pro/reminder/proexpiresoon":
            (await i.GReminderDialogFactory.newProExpireSoon(t)).open();
            break;
          case "/pro/reminder/proexpired":
            (await i.GReminderDialogFactory.newProExpired(t)).open();
            break;
          case "/pro/reminder/trialexpired":
            (await i.GReminderDialogFactory.newTrialExpired(t)).open();
            break;
          case "/pro/reminder/trialmessage":
            (await i.GReminderDialogFactory.newTrialMessage(t)).open();
            break;
          case "/pro/reminder/upgrade":
            (await i.GReminderDialogFactory.newUpgradeScreen(t)).open();
        }
      }
    }
    e.exports = l;
  }