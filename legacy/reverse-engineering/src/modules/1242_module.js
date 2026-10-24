/**
 * Webpack Module #1242
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(96), n(30), n(8);
    var i = n(1),
      a = n(1479),
      r = o(n(44)),
      s = o(n(443)),
      l = n(1243),
      c = n(40);
    const { getAuthenticator: d, getTeamsContext: u } = s.default;
    function p() {}
    (p.Error = {
      NOT_REGISTERED: 1,
      ONEDRIVE_BUSINESS_ERROR: 2,
      SHAREPOINT_ERROR: 3,
      SHAREPOINT_ONEDRIVE_BUSINESS_ERROR: 4,
      OFFLINE: 5,
      FAILED_TO_OPEN_WINDOW: 6,
      CANCELLED_BY_USER: 7,
    }),
      (p.COMMANDS = {
        ONE_DRIVE_BUSINESS_COMMAND: l.ONE_DRIVE_BUSINESS_COMMAND,
        SHAREPOINT_COMMAND: l.SHAREPOINT_COMMAND,
        MS_TEAMS_COMMAND: l.MS_TEAMS_COMMAND,
      }),
      (p.FAIL_REASONS = {
        POPUP_WINDOW_BLOCKED: "FailedToOpenWindow",
        CANCELLED_BY_USER: "CancelledByUser",
      }),
      (p._instance = null),
      (p.CACHED_TOKENS_PROPERTY_NAME = "msteams.authentication.tokens"),
      (p.getInstance = () => (
        p._instance || (p._instance = new p()), p._instance
      )),
      (p.prototype._loaded = !1),
      (p.prototype._loading = !1),
      (p.prototype._authenticated = !1),
      (p.prototype._tokens = null),
      (p.prototype.authenticate = async function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0]
            ? arguments[0]
            : [l.MS_TEAMS_COMMAND];
        if (!(e instanceof Array)) return this._connectDrives(e);
        if (this._authenticated) return !0;
        const t = this;
        return new Promise(
          async (n, o) => (
            await t._authenticateCommand(e),
            t
              ._authWithCorelCloud(await t.getOrFetchMSTeamsAccessToken())
              .then((e) => {
                e ? ((t._authenticated = !0), n(!0)) : o();
              })
              .catch(() => {
                o();
              })
          )
        );
      }),
      (p.prototype._connectDrives = async function (e) {
        return this._tokens[e] && this.isTokenValid(this._tokens[e])
          ? Promise.resolve(this._tokens[e])
          : (await this._authenticateCommand([e]), this._tokens[e]);
      }),
      (p.prototype.isTokenValid = function (e) {
        return !(!e || !e.expires || e.expires <= Date.now() / 1e3);
      }),
      (p.prototype.isAuthenticated = function () {
        const e = (this._tokens && this._tokens[l.MS_TEAMS_COMMAND]) || null;
        return (
          !(!e || !this.isTokenValid(e)) || ((this._authenticated = !1), !1)
        );
      }),
      (p.prototype._authenticateCommand = async function (e) {
        const t = this,
          n = await this._getValidCachedTokens(),
          o = {};
        let i = [];
        if (!n || !Object.values(n).length)
          return this._processAuthenticationCommands(e);
        for (let t = 0, a = e.length; t < a; t++)
          n[e[t]] ? (o[e[t]] = n[e[t]]) : i.push(e[t]);
        return 0 === i.length
          ? (await t.setTokens(o, !1), o)
          : this._processAuthenticationCommands(e, o);
      }),
      (p.prototype._processAuthenticationCommands = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        const n = this;
        return new Promise((o, a) => {
          d()
            .then((r) =>
              r.authenticate({
                url: ""
                  .concat(window.location.origin, "/msteams-sp.html#")
                  .concat(l.COMMAND_QUERY_PARAM, "=")
                  .concat(e.join(",")),
                width: 600,
                height: 535,
                successCallback: async function (e) {
                  const i = {};
                  for (let t in e) {
                    const { expires: n, accessToken: o } = e[t];
                    i[t] = { token: o, expires: Number(n) };
                  }
                  await n.setTokens(Object.assign(t, i)), o(i);
                },
                failureCallback: function (t) {
                  t === p.FAIL_REASONS.POPUP_WINDOW_BLOCKED
                    ? n._handleError(
                        p.Error.FAILED_TO_OPEN_WINDOW,
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GMSTeamsAuthenticator",
                            "text.authenticate"
                          )
                        ),
                        (t) => {
                          console.log("target", t.target),
                            n
                              ._processAuthenticationCommands(e)
                              .then((e) => {
                                o(e);
                              })
                              .catch((e) => {
                                console.error(">>>reautherror", e), a(e);
                              });
                        }
                      )
                    : t === p.FAIL_REASONS.CANCELLED_BY_USER
                    ? (n._handleError(
                        p.Error.CANCELLED_BY_USER,
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GMSTeamsAuthenticator",
                            "text.try-again"
                          )
                        ),
                        () => window.location.reload()
                      ),
                      a())
                    : (n._handleError({ message: t }), a());
                },
              })
            )
            .catch((e) => {
              a(e);
            });
        });
      }),
      (p.prototype._getValidCachedTokens = async function () {
        const e = this._getCachedTokens();
        if (!e) return null;
        const t = await u(),
          n = {};
        if (e.userId !== t.loginHint) return n;
        const o = Object.keys(e);
        for (let t = 0, i = o.length; t < i; t++) {
          const i = e[o[t]];
          this.isTokenValid(i) && (n[o[t]] = i);
        }
        return n;
      }),
      (p.prototype._getCachedTokens = function () {
        const e = window.localStorage.getItem(p.CACHED_TOKENS_PROPERTY_NAME);
        if (!e) return null;
        let t = null;
        try {
          t = JSON.parse((0, c.base64StringToString)(e));
        } catch (e) {
          console.error("Cant decode cache tokens");
        }
        return t;
      }),
      (p.prototype.setTokens = async function (e) {
        let t =
          !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1];
        const n = (await u()).loginHint,
          o = await this._getValidCachedTokens();
        (this._tokens = Object.assign({ userId: n }, o, e)),
          t &&
            localStorage.setItem(
              p.CACHED_TOKENS_PROPERTY_NAME,
              (0, c.stringToBase64String)(JSON.stringify(this._tokens))
            );
      }),
      (p.prototype.getOrFetchMSTeamsAccessToken = async function () {
        const e = (this._tokens && this._tokens[l.MS_TEAMS_COMMAND]) || null;
        return (
          (e && this.isTokenValid(e)) ||
            ((this._authenticated = !1), await this.authenticate()),
          (this._tokens &&
            this._tokens[l.MS_TEAMS_COMMAND] &&
            this._tokens[l.MS_TEAMS_COMMAND].token) ||
            null
        );
      }),
      (p.prototype._handleError = function (e, t, n) {
        let o = null;
        switch (e) {
          case p.Error.OFFLINE:
            o = i.GLocale.get(
              new i.GLocaleKey("GMSTeamsAuthenticator", "text.offline")
            );
            break;
          case p.Error.ONEDRIVE_BUSINESS_ERROR:
            o = i.GLocale.get(
              new i.GLocaleKey(
                "GMSTeamsAuthenticator",
                "text.onedrive-business-error"
              )
            );
            break;
          case p.Error.SHAREPOINT_ERROR:
            o = i.GLocale.get(
              new i.GLocaleKey("GMSTeamsAuthenticator", "text.sharepoint-error")
            );
            break;
          case p.Error.SHAREPOINT_ONEDRIVE_BUSINESS_ERROR:
            o = i.GLocale.get(
              new i.GLocaleKey(
                "GMSTeamsAuthenticator",
                "text.sharepoint-onedrive-business-error"
              )
            );
            break;
          case p.Error.NOT_REGISTERED:
            o = i.GLocale.get(
              new i.GLocaleKey("GMSTeamsAuthenticator", "text.not_registered")
            );
            break;
          case p.Error.FAILED_TO_OPEN_WINDOW:
            o = i.GLocale.get(
              new i.GLocaleKey(
                "GMSTeamsAuthenticator",
                "text.failed-to-open-window"
              )
            );
            break;
          case p.Error.CANCELLED_BY_USER:
            o = i.GLocale.get(
              new i.GLocaleKey(
                "GMSTeamsAuthenticator",
                "text.cancelled-by-user"
              )
            );
            break;
          default:
            o =
              e && e.message
                ? e.message
                : i.GLocale.get(
                    new i.GLocaleKey("GMSTeamsAuthenticator", "text.unknown")
                  );
        }
        r.default.splashScreenError(o, t, n);
      }),
      (p.prototype._validateAuthenticatedUser = async function () {
        const e = await this.getUser();
        return !e || e.reload || e.deactivated
          ? (this._handleError(p.Error.NOT_REGISTERED), !1)
          : e && e.microsoft_corporate_config
          ? e.microsoft_corporate_config.client_id
            ? !!e.microsoft_corporate_config.odb_client_id ||
              (this._handleError(p.Error.ONEDRIVE_BUSINESS_ERROR), !1)
            : (this._handleError(p.Error.SHAREPOINT_ERROR), !1)
          : (this._handleError(p.Error.SHAREPOINT_ONEDRIVE_BUSINESS_ERROR), !1);
      }),
      (p.prototype._authWithCorelCloud = async function (e) {
        if (this._loaded || this._loading) return !1;
        this._loading = !0;
        if (await a.gApi.isOffline({ includeCredentials: !1 }))
          return (this._loading = !1), this._handleError(p.Error.OFFLINE), null;
        const t = await a.gApi
          .authenticateMsTeamsUser(e)
          .catch(
            (e) => (
              console.error(">>>authenticateMsTeamsUser error", e),
              this._handleError(p.Error.NOT_REGISTERED),
              null
            )
          );
        if (!t || !t.ok)
          return (
            this._handleError(p.Error.NOT_REGISTERED), (this._loading = !1), !1
          );
        return (await t.json().catch(() => null))
          ? ((this._loaded = !0),
            (this._loading = !1),
            this._validateAuthenticatedUser())
          : (this._handleError(p.Error.NOT_REGISTERED),
            (this._loading = !1),
            !1);
      }),
      (p.prototype.getUser = async function () {
        if (this._user) return this._user;
        const e = await gDesigner.getUser();
        return e ? ((this._user = e), this._user) : null;
      }),
      (e.exports = p);
  }