/**
 * Webpack Module #85
 * Type: class
 * Name: GContainer
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58),
      n(19),
      n(168),
      n(96),
      n(8),
      n(3),
      n(71),
      n(4),
      n(13),
      n(169),
      n(26),
      n(125),
      n(126),
      n(114);
    var i = n(1),
      a = n(1036),
      r = n(10),
      s = o(n(734)),
      l = (o(n(355)), o(n(1037))),
      c = n(255),
      d = n(590),
      u = n(18),
      p = n(843),
      g = n(257),
      h = n(219),
      f = n(44),
      m = n(78);
    function y() {}
    i.GObject.inherit(y, i.GEventTarget),
      (y.OpenFileRequest = function (e, t) {
        (this._type = e), (this._content = t);
      }),
      (y.OpenFileRequest.prototype.getType = function () {
        return this._type;
      }),
      (y.OpenFileRequest.prototype.getContent = function () {
        return this._content;
      }),
      (y.OpenFileRequest.Type = {
        Document: "document",
        Token: "token",
        DocumentOrToken: "documentOrToken",
        StoreContent: "storeContent",
        ExternalAsset: "externalAsset",
        Template: "template",
        Preset: "preset",
        MSTeamsDeepLink: "msteamsdeeplink",
      }),
      (y.DeepLinking = {
        ProCoupon: "procoupon",
        PurchaseFlow: "purchase_flow",
        PurchaseFlowNew: "purchase_flow_new",
        Purchase: "purchase",
        ResetPassword: r.PasswordlessAuthenticationActions.ResetPassword,
        SetPassword: r.PasswordlessAuthenticationActions.SetPassword,
        PasswordlessToken:
          r.PasswordlessAuthenticationActions.PasswordlessToken,
        ConfirmEmail: "confirm_email",
        Account: "account",
        Purchases: "purchases",
        EnterpriseLogIn: "enterprise",
        DirectLink: "directlink",
        ResetTrial: "reset_trial",
        PWADialog: "pwainstall",
        FocusAnnot: "annot",
        CreateShare: "create_share",
        ActivateTrial: "activate_trial",
      }),
      (y.Runtime = {
        Browser: "browser",
        Chrome: "chrome",
        WebWorker: "webworker",
        Phonegap: "phonegap",
        Electron: "electron",
        PWA: "pwa",
        IPad: "ipad",
      }),
      (y.GravitLanguages = [...i.GLocale.getAvailableLanguages()]),
      (y.prototype._recentDocuments = null),
      (y.prototype._deepLinking = null),
      (y.prototype.getRuntime = function () {
        throw new Error("Not implemented.");
      }),
      (y.prototype.getStorage = function () {
        throw new Error("Not implemented.");
      }),
      (y.prototype.getRootPath = function () {
        return "";
      }),
      (y.prototype.registerFontProviders = function () {
        c.registerProvider(d);
      }),
      (y.prototype.getSystemFontsProvider = function () {
        return null;
      }),
      (y.prototype.supportsLocalFonts = function () {
        return !1;
      }),
      (y.prototype.getProperty = function (e) {
        return new Promise((t) => {
          var n = window.localStorage.getItem(e) || null;
          t(n ? JSON.parse(n) : null);
        });
      }),
      (y.prototype.setProperty = function (e, t) {
        window.localStorage.setItem(e, JSON.stringify(t));
      }),
      (y.prototype.removeProperty = function (e) {
        window.localStorage.removeItem(e);
      }),
      (y.prototype.getPropertyKeyByIndex = function (e) {
        return window.localStorage.key(e);
      }),
      (y.prototype.getStorageLength = function () {
        return window.localStorage.length;
      }),
      (y.prototype.setCookie = function (e) {
        let { name: t, value: n } = e;
        return navigator.cookieEnabled
          ? ((document.cookie = "".concat(t, "=").concat(n, "; path=/")),
            (document.cookie = ""
              .concat(t, "=")
              .concat(n, "; path=/; domain=")
              .concat(r.DOMAIN)),
            Promise.resolve())
          : Promise.reject();
      }),
      (y.prototype.handleDeepLinking = function (e) {
        const t = new URL(e || window.location.href).searchParams,
          n = Object.keys(y.DeepLinking).find((e) => t.has(y.DeepLinking[e]));
        if (n) {
          const e = {
            link: y.DeepLinking[n],
            options: Array.from(t.entries()).reduce(
              (e, t) => ((e[t[0]] = t[1]), e),
              {}
            ),
          };
          return (this._deepLinking = e), this._deepLinking;
        }
        return null;
      }),
      (y.prototype.shouldBypassEmailVerification = function () {
        return (
          this._deepLinking &&
          this._deepLinking.link === y.DeepLinking.DirectLink
        );
      }),
      (y.prototype.init = function (e) {
        return (
          window.gDesigner &&
            gDesigner.addEventListener(m, this._documentEvent, this),
          e(this)
        );
      }),
      (y.prototype._documentEvent = function (e) {
        (e.type !== m.Type.Activated && e.type !== m.Type.StorageItemUpdated) ||
          this._updateClientAPI(e.document);
      }),
      (y.prototype._updateClientAPI = function (e) {
        const t = e && e.getToken();
        if (t) {
          const n = gDesigner.getActiveDocument();
          (!n || e === n) && r.gApi.setToken({ token: t });
        }
      }),
      (y.prototype.start = function () {}),
      (y.prototype.preLogin = async function () {}),
      (y.prototype.signWithMagicLink = function (e, t, n) {
        return r.gApi.magicLink.authenticate(e, t, n);
      }),
      (y.prototype.canUnload = function (e, t) {
        let n =
          !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2];
        var o = !e && !t;
        return n ? Promise.resolve(o) : o;
      }),
      (y.prototype.openExternalLink = function () {}),
      (y.prototype.copyToClipboard = function () {
        return Promise.resolve();
      }),
      (y.prototype.initLanguage = function (e, t) {
        const n = () =>
          this.getProperty("designer.settings").then(async (e) => {
            if (e && e.hasOwnProperty("language")) {
              const t = e.language;
              if (y.GravitLanguages.indexOf(t) >= 0)
                await l.default.setLanguage(t);
              else {
                let e =
                  i.GSystem.language &&
                  i.GLocale.lookupLanguage(i.GSystem.language);
                e && y.GravitLanguages.includes(e)
                  ? await l.default.setLanguage(e)
                  : await l.default.setLanguage(i.GLocaleLanguage.English);
              }
            }
          });
        if (t)
          return new Promise(async (i) => {
            try {
              await o(t), e && e(), i();
            } catch (t) {
              await n(), e && e(), i();
            }
          });
        async function o(e) {
          const t = i.GLocale.lookupLanguage(e);
          null !== t &&
            (y.GravitLanguages.indexOf(t) >= 0
              ? ("undefined" != typeof gDesigner &&
                  gDesigner.setSetting("language", t),
                await l.default.setLanguage(t))
              : await l.default.setLanguage(i.GLocaleLanguage.English));
        }
        r.gApi
          .getUser()
          .then(async (t) => {
            t && !t.anonymous ? await o(t.locale) : await n(), e && e();
          })
          .catch(async () => {
            await n(), e && e();
          });
      }),
      (y.prototype.newDocumentActionPerformed = function (e) {
        e && e();
      }),
      (y.prototype.getRecentDocuments = function () {
        return this._recentDocuments || [];
      }),
      (y.prototype.isRecentDocument = function (e) {
        return (
          !!(e && this._recentDocuments && this._recentDocuments.length) &&
          !!this._recentDocuments.find((t) => t._id === e._id)
        );
      }),
      (y.prototype.updateRecentDocumentsAction = function (e) {
        var t;
        this._recentDocuments = e;
        const n = gDesigner.getMainMenu();
        if (n) {
          const e = (t = n.findItem(i.GLocale.get(u.CATEGORY_FILE.label)));
          if (e && e.getMenu()) {
            const n = e
              .getMenu()
              .findItem(
                i.GLocale.get(u.CATEGORY_FILE_OPEN_RECENT.label).split("/")[1]
              );
            n && (t = n.getMenu());
          }
        }
        if (t)
          if ((t.clearItems(), e.length > 0))
            for (
              var o = e[0] instanceof this._storage.constructor.Item, a = 0;
              a < e.length;
              ++a
            ) {
              let n = e[a];
              n instanceof this._storage.constructor.Item ||
                !o ||
                (gDesigner.addMenuSeparator(t), (o = !1));
              const i = this.getRecentDocumentIconClass(n),
                r = n.getName() + "." + n.getExtension().toLowerCase();
              gDesigner.addMenuItem(t, r, i, null, null, function () {
                try {
                  gDesigner.openDocument(n);
                } catch (e) {
                  if (!(e instanceof s.default)) throw e;
                  f.externalFileError(!0);
                }
              });
            }
          else {
            var r = gDesigner.addMenuItem(t);
            gDesigner.updateMenuItem(r, i.GLocale.get(p.TITLE), !1, !1);
          }
      }),
      (y.prototype.getRecentDocumentIconClass = function (e) {
        return e instanceof this._storage.constructor.Item
          ? null
          : "[Object GGoogleDriveStorage.Item]" === e.toString()
          ? "gravit-icon-googledrive-logo"
          : "[Object GSharePointStorage.Item]" === e.toString()
          ? "gravit-icon-sharepoint-logo"
          : "[Object GOneDriveBusinessStorage.Item]" === e.toString()
          ? "gravit-icon-onedrivebusiness-logo"
          : g["gravit-icon-cloud-logo"];
      }),
      (y.prototype.triggerClose = function () {}),
      (y.prototype.getGoogleAPI = function () {
        return a.GDefaultGoogleAPI;
      }),
      (y.prototype.signWithOAuth = function (e) {
        return new Promise((t, n) => {
          r.gApi
            .popup("/auth/" + e)
            .then((e) => {
              e ? t(e) : n();
            })
            .catch((e) => {
              let t;
              "string" == typeof e && (t = e),
                !t && e && e.message && (t = e.message),
                !t && e && e.errors && (t = e.errors.toString()),
                !t && e && (t = e),
                n(t);
            });
        });
      }),
      (y.prototype.isMemoryInfoAvailable = function () {
        return !1;
      }),
      (y.prototype.getMemoryInfo = function () {
        return null;
      }),
      (y.prototype._getJsHeapLimitSize = function () {
        return window.performance.memory
          ? window.performance.memory.jsHeapSizeLimit
          : r.JS_HEAP_SIZE_LIMIT_POYFILL;
      }),
      (y.prototype._estimatingMemoryUsage = function () {
        return (
          gDesigner
            .getDocuments()
            .reduce(
              (e, t) =>
                e + (t && t.getStorageItem())
                  ? t.getStorageItem().documentRealFileSize
                  : 0,
              0
            ) *
            r.FILE_SIZE_TO_RAM_COEFFCIENT +
          r.MIN_JS_HEAP_SIZE
        );
      }),
      (y.prototype.verifyEnoughMemoryToSave = function (e) {
        try {
          if (e && e.getStorageItem()) {
            var t = this._estimatingMemoryUsage(),
              n =
                this._getJsHeapLimitSize() -
                (t +=
                  e.getStorageItem().documentRealFileSize *
                  r.FILE_SIZE_TO_SAVING_RAM_COEFFCIENT);
            if (2 * e.getStorageItem().documentRealFileSize > n) {
              var o = i.GLocale.get(
                new i.GLocaleKey("GContainer", "text.not-memary-enough")
              );
              new h(o).open();
            }
          }
        } catch (e) {
          console.error(e);
        }
      }),
      (y.prototype.minimizeWindow = function () {}),
      (y.prototype.maximizeWindow = function () {}),
      (y.prototype.closeWindow = function () {}),
      (y.prototype.getStorageDestinations = function () {
        return [];
      }),
      (y.prototype.getDefaultStorageDestination = function (e) {
        const t = this.getStorageDestinations();
        return t ? t.find((t) => t.isSupported(e)) : null;
      }),
      (y.prototype.getSharepointAuthenticator = function () {
        return null;
      }),
      (y.prototype.toString = function () {
        return "[Object GContainer]";
      }),
      (y.prototype.nativeShareLink = function (e, t, n) {
        return this._getNativeShareLinkInstance().share(e, t, n);
      }),
      (y.prototype.isNativeShareLinkSupported = function () {
        return (
          !!this._getNativeShareLinkInstance() &&
          this._getNativeShareLinkInstance().isSupported()
        );
      }),
      (y.prototype._getNativeShareLinkInstance = function () {
        return null;
      }),
      (e.exports = y);
  }