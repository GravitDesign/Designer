/**
 * GContainer
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GContainer() {
  // Constructor (reconstructed)
}

// Prototype methods
GContainer.prototype._updateClientAPI = function (e) {
        const t = e && e.getToken();
        if (t) {
          const n = gDesigner.getActiveDocument();
          (!n || e === n) && r.gApi.setToken({ token: t });
        }
      }

GContainer.prototype.start = function () {}

GContainer.prototype.signWithMagicLink = function (e, t, n) {
        return r.gApi.magicLink.authenticate(e, t, n);
      }

GContainer.prototype.canUnload = function (e, t) {
        let n =
          !(arguments.length > 2 && undefined !== arguments[2]) || arguments[2];
        var o = !e && !t;
        return n ? Promise.resolve(o) : o;
      }

GContainer.prototype.openExternalLink = function () {}

GContainer.prototype.copyToClipboard = function () {
        return Promise.resolve();
      }

GContainer.prototype.initLanguage = function (e, t) {
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
      }

GContainer.prototype.newDocumentActionPerformed = function (e) {
        e && e();
      }

GContainer.prototype.getRecentDocuments = function () {
        return this._recentDocuments || [];
      }

GContainer.prototype.isRecentDocument = function (e) {
        return (
          !!(e && this._recentDocuments && this._recentDocuments.length) &&
          !!this._recentDocuments.find((t) => t._id === e._id)
        );
      }

GContainer.prototype.updateRecentDocumentsAction = function (e) {
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
                (gDesigner.addMenuSeparator(t), (o = false));
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
      }

GContainer.prototype.getRecentDocumentIconClass = function (e) {
        return e instanceof this._storage.constructor.Item
          ? null
          : "[Object GGoogleDriveStorage.Item]" === e.toString()
          ? "gravit-icon-googledrive-logo"
          : "[Object GSharePointStorage.Item]" === e.toString()
          ? "gravit-icon-sharepoint-logo"
          : "[Object GOneDriveBusinessStorage.Item]" === e.toString()
          ? "gravit-icon-onedrivebusiness-logo"
          : g["gravit-icon-cloud-logo"];
      }

GContainer.prototype.triggerClose = function () {}

GContainer.prototype.getGoogleAPI = function () {
        return a.GDefaultGoogleAPI;
      }

GContainer.prototype.signWithOAuth = function (e) {
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
      }

GContainer.prototype.isMemoryInfoAvailable = function () {
        return false;
      }

GContainer.prototype.getMemoryInfo = function () {
        return null;
      }

GContainer.prototype._getJsHeapLimitSize = function () {
        return window.performance.memory
          ? window.performance.memory.jsHeapSizeLimit
          : r.JS_HEAP_SIZE_LIMIT_POYFILL;
      }

GContainer.prototype._estimatingMemoryUsage = function () {
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
      }

GContainer.prototype.verifyEnoughMemoryToSave = function (e) {
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
      }

GContainer.prototype.minimizeWindow = function () {}

GContainer.prototype.maximizeWindow = function () {}

GContainer.prototype.closeWindow = function () {}

GContainer.prototype.getStorageDestinations = function () {
        return [];
      }

GContainer.prototype.getDefaultStorageDestination = function (e) {
        const t = this.getStorageDestinations();
        return t ? t.find((t) => t.isSupported(e)) : null;
      }

GContainer.prototype.getSharepointAuthenticator = function () {
        return null;
      }

GContainer.prototype.toString = function () {
        return "[Object GContainer]";
      }

GContainer.prototype.nativeShareLink = function (e, t, n) {
        return this._getNativeShareLinkInstance().share(e, t, n);
      }

GContainer.prototype.isNativeShareLinkSupported = function () {
        return (
          !!this._getNativeShareLinkInstance() &&
          this._getNativeShareLinkInstance().isSupported()
        );
      }

GContainer.prototype._getNativeShareLinkInstance = function () {
        return null;
      }

module.exports = GContainer;
