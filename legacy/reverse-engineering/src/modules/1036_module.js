/**
 * Webpack Module #1036
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.GGoogleAPI = t.GDefaultGoogleAPI = void 0),
      n(19),
      n(30),
      n(8),
      n(26);
    var o = n(10),
      i = n(1);
    class a {
      isLoaded() {
        return !0;
      }
      init() {
        let {
          appId: e,
          apiKey: t,
          clientId: n,
          discoveryDocs: o,
          scope: i,
        } = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        throw "Not implemented";
      }
      isSignedIn() {
        throw "Not implemented";
      }
      listenSignInStateChanges(e) {}
      install(e) {}
      signIn() {
        throw "Not implemented";
      }
      signOut() {
        throw "Not implemented";
      }
      getTokenConfiguration(e) {
        throw "Not implemented";
      }
      loadFilePicker() {
        throw "Not implemented";
      }
      openFilePicker(e, t) {
        throw "Not implemented";
      }
      getBasicProfile() {
        throw "Not implemented";
      }
      getAccessToken() {
        throw "Not implemented";
      }
      getRefreshToken() {
        throw "Not implemented";
      }
    }
    t.GGoogleAPI = a;
    t.GDefaultGoogleAPI = new (class extends a {
      isLoaded() {
        return !!window.gapi;
      }
      async init() {
        let {
          appId: e,
          apiKey: t,
          clientId: n,
          discoveryDocs: o,
          scope: a,
        } = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        return (
          (this._appId = e),
          (this._apiKey = t),
          (this._clientId = n),
          (this._discoveryDocs = o),
          (this._scope = a),
          await new Promise((e, t) => {
            gapi.load("client", { callback: e, onerror: t });
          }),
          await gapi.client.init({ apiKey: t, discoveryDocs: o }),
          new Promise(async (e, t) => {
            try {
              const t = await gContainer.getProperty(
                "googleapi_auth_email_hint"
              );
              (this._tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: n,
                scope: a,
                prompt: "",
                callback: "",
                hint: t || "",
                error_callback: () => location.reload(),
              })),
                e();
            } catch (e) {
              t(
                i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.loading-failed")
                )
              );
            }
          })
        );
      }
      async isSignedIn() {
        if (this.isLoaded()) {
          const e = await gContainer.getProperty("googleapi_auth_key");
          return fetch(
            "https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=".concat(
              e && e.access_token
            )
          )
            .then((e) => e.json())
            .then((e) => !!e.email)
            .catch(() => !1);
        }
        return !1;
      }
      install(e) {
        const t = [],
          n = (t) =>
            new Promise((n, o) => {
              let i = document.createElement("script");
              (i.async = !0),
                (i.src = t),
                (i.onload = n),
                (i.onerror = o),
                (e || document.getElementsByTagName("head")[0]).appendChild(i);
            });
        return (
          t.push(n("https://apis.google.com/js/api.js")),
          t.push(n("https://accounts.google.com/gsi/client")),
          Promise.all(t)
        );
      }
      async signIn() {
        return (
          await gContainer.setProperty("googleapi_auth_key", null),
          new Promise(async (e, t) => {
            try {
              const n = await gContainer.getProperty(
                "googleapi_auth_email_hint"
              );
              (this._tokenClient.callback = async (n) => {
                n.error && t();
                const o = gapi.client.getToken(),
                  i = {
                    access_token: o.access_token,
                    expires_at: 1e3 * o.expires_in + Date.now(),
                  };
                await gContainer.setProperty("googleapi_auth_key", i), e();
              }),
                this._tokenClient.requestAccessToken({
                  prompt: "",
                  hint: n || "",
                });
            } catch (e) {
              t(
                i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.loading-failed")
                )
              );
            }
          })
        );
      }
      async signOut() {
        this._picker && delete this._picker;
        const e = await gContainer.getProperty("googleapi_auth_key");
        await google.accounts.oauth2.revoke(e && e.access_token),
          gapi.client.setToken(null),
          gContainer.setProperty("googleapi_auth_key", null),
          gContainer.setProperty("googleapi_auth_email_hint", null);
      }
      async getTokenConfiguration() {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        const t = await gContainer.getProperty("googleapi_auth_key");
        return Object.assign(e, {
          accessToken: t.access_token,
          expires: t.expires_at,
          corporate: !1,
        });
      }
      async loadFilePicker() {
        return new Promise((e, t) => {
          gapi.load("picker", {
            timeout: 2e4,
            callback: e,
            ontimeout: () =>
              t(
                i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.loading-failed")
                )
              ),
            onerror: () =>
              t(
                i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.loading-failed")
                )
              ),
          });
        });
      }
      async openFilePicker(e, t) {
        try {
          (await this.isSignedIn()) || (await this.signIn());
          const t = (await gContainer.getProperty("googleapi_auth_key"))
            .access_token;
          this._picker && delete this._picker,
            (this._picker = (0, o.GooglePickerBuilder)({
              appId: this._appId,
              apiKey: this._apiKey,
              accessToken: t,
              language: i.GLocale.getLanguage(),
            })),
            this._picker.setCallback((t) => {
              t.action === google.picker.Action.PICKED && e(t.docs);
            }),
            this._picker.setVisible(!0);
        } catch (e) {
          t && t(e);
        }
      }
      async getBasicProfile() {
        (await this.isSignedIn()) || (await this.signIn());
        const e = await gContainer.getProperty("googleapi_auth_key");
        return fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo?access_token=".concat(
            e && e.access_token
          )
        )
          .then((e) => e.json())
          .then(
            (e) => (
              e.email &&
                gContainer.setProperty("googleapi_auth_email_hint", e.email),
              { email: e.email, imageUrl: e.picture, name: e.name }
            )
          )
          .catch(() =>
            reject(
              i.GLocale.get(
                new i.GLocaleKey("GCommonNames", "text.loading-failed")
              )
            )
          );
      }
      async getAccessToken() {
        (await this.isSignedIn()) || (await this.signIn());
        const e = await gContainer.getProperty("googleapi_auth_key");
        return { expires: e.expires_at, accessToken: e.access_token };
      }
    })();
  }