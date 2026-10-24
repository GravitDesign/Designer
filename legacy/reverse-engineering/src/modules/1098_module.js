/**
 * Webpack Module #1098
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    var o = n(10);
    const i = n(292),
      a = n(846);
    e.exports = class {
      constructor() {
        this._isListening = !1;
      }
      async checkLicense() {
        let e;
        if (gDesigner.isOffline()) e = a.newOfflineLicense();
        else
          try {
            e = a.newLicense(await o.gApi.license.get());
          } catch (t) {
            (e = a.newDefaultLicense()),
              console.info("CheckLicense", "exception", t);
          }
        this._setApplicationLicense(e);
      }
      async _listenLicense() {
        if (!this._isListening)
          try {
            if (!gDesigner.isOffline()) {
              (await gDesigner.getUser()) &&
                !gDesigner.isAnonymous() &&
                (o.gApi.license.listen((e) => {
                  this._setApplicationLicense(a.newLicense(e));
                }),
                (this._isListening = !0));
            }
          } catch (e) {
            console.info("LicenseChanged", "exception", e);
          }
      }
      _setApplicationLicense(e) {
        gDesigner.setLicense(e);
      }
      async start() {
        gDesigner.addEventListener(i, this._userLoggedEvent, this),
          $(window).on("online", this.checkLicense.bind(this)),
          $(window).on("offline", this.checkLicense.bind(this));
        try {
          await this.checkLicense();
        } catch (e) {
          console.error(e);
        }
        try {
          this._listenLicense();
        } catch (e) {
          console.error(e);
        }
        setInterval(
          this.checkLicense.bind(this),
          o.DateAPI.daysToMilliseconds(1)
        );
      }
      _userLoggedEvent() {
        this.checkLicense(), this._listenLicense();
      }
    };
  }