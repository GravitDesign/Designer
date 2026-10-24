/**
 * Webpack Module #1476
 * Type: unknown
 */

function (e, t, n) {
    var o = (function () {
      "use strict";
      return (
        (o = function (e) {
          if (
            ((this.REQUEST_TYPE = {
              LOGIN: "LOGIN",
              RENEW_TOKEN: "RENEW_TOKEN",
              UNKNOWN: "UNKNOWN",
            }),
            (this.RESPONSE_TYPE = {
              ID_TOKEN_TOKEN: "id_token token",
              TOKEN: "token",
            }),
            (this.CONSTANTS = {
              ACCESS_TOKEN: "access_token",
              EXPIRES_IN: "expires_in",
              ID_TOKEN: "id_token",
              ERROR_DESCRIPTION: "error_description",
              SESSION_STATE: "session_state",
              ERROR: "error",
              STORAGE: {
                TOKEN_KEYS: "adal.token.keys",
                ACCESS_TOKEN_KEY: "adal.access.token.key",
                EXPIRATION_KEY: "adal.expiration.key",
                STATE_LOGIN: "adal.state.login",
                STATE_RENEW: "adal.state.renew",
                NONCE_IDTOKEN: "adal.nonce.idtoken",
                SESSION_STATE: "adal.session.state",
                USERNAME: "adal.username",
                IDTOKEN: "adal.idtoken",
                ERROR: "adal.error",
                ERROR_DESCRIPTION: "adal.error.description",
                LOGIN_REQUEST: "adal.login.request",
                LOGIN_ERROR: "adal.login.error",
                RENEW_STATUS: "adal.token.renew.status",
                ANGULAR_LOGIN_REQUEST: "adal.angular.login.request",
              },
              RESOURCE_DELIMETER: "|",
              CACHE_DELIMETER: "||",
              LOADFRAME_TIMEOUT: 6e3,
              TOKEN_RENEW_STATUS_CANCELED: "Canceled",
              TOKEN_RENEW_STATUS_COMPLETED: "Completed",
              TOKEN_RENEW_STATUS_IN_PROGRESS: "In Progress",
              LOGGING_LEVEL: { ERROR: 0, WARN: 1, INFO: 2, VERBOSE: 3 },
              LEVEL_STRING_MAP: {
                0: "ERROR:",
                1: "WARNING:",
                2: "INFO:",
                3: "VERBOSE:",
              },
              POPUP_WIDTH: 483,
              POPUP_HEIGHT: 600,
            }),
            o.prototype._singletonInstance)
          )
            return o.prototype._singletonInstance;
          if (
            ((o.prototype._singletonInstance = this),
            (this.instance = "https://login.microsoftonline.com/"),
            (this.config = {}),
            (this.callback = null),
            (this.popUp = !1),
            (this.isAngular = !1),
            (this._user = null),
            (this._activeRenewals = {}),
            (this._loginInProgress = !1),
            (this._acquireTokenInProgress = !1),
            (this._renewStates = []),
            (this._callBackMappedToRenewStates = {}),
            (this._callBacksMappedToRenewStates = {}),
            (this._openedWindows = []),
            (this._requestType = this.REQUEST_TYPE.LOGIN),
            (window._adalInstance = this),
            e.displayCall && "function" != typeof e.displayCall)
          )
            throw new Error("displayCall is not a function");
          if (!e.clientId) throw new Error("clientId is required");
          (this.config = this._cloneConfig(e)),
            void 0 === this.config.navigateToLoginRequestUrl &&
              (this.config.navigateToLoginRequestUrl = !0),
            this.config.popUp && (this.popUp = !0),
            this.config.callback &&
              "function" == typeof this.config.callback &&
              (this.callback = this.config.callback),
            this.config.instance && (this.instance = this.config.instance),
            this.config.loginResource ||
              (this.config.loginResource = this.config.clientId),
            this.config.redirectUri ||
              (this.config.redirectUri = window.location.href
                .split("?")[0]
                .split("#")[0]),
            this.config.postLogoutRedirectUri ||
              (this.config.postLogoutRedirectUri = window.location.href
                .split("?")[0]
                .split("#")[0]),
            this.config.anonymousEndpoints ||
              (this.config.anonymousEndpoints = []),
            this.config.isAngular && (this.isAngular = this.config.isAngular),
            this.config.loadFrameTimeout &&
              (this.CONSTANTS.LOADFRAME_TIMEOUT = this.config.loadFrameTimeout);
        }),
        "undefined" != typeof window &&
          (window.Logging = {
            piiLoggingEnabled: !1,
            level: 0,
            log: function (e) {},
          }),
        (o.prototype.login = function () {
          if (this._loginInProgress) this.info("Login in progress");
          else {
            this._loginInProgress = !0;
            var e = this._guid();
            (this.config.state = e), (this._idTokenNonce = this._guid());
            var t = this._getItem(this.CONSTANTS.STORAGE.ANGULAR_LOGIN_REQUEST);
            t && "" !== t
              ? this._saveItem(this.CONSTANTS.STORAGE.ANGULAR_LOGIN_REQUEST, "")
              : (t = window.location.href),
              this.verbose("Expected state: " + e + " startPage:" + t),
              this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, t),
              this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, ""),
              this._saveItem(this.CONSTANTS.STORAGE.STATE_LOGIN, e, !0),
              this._saveItem(
                this.CONSTANTS.STORAGE.NONCE_IDTOKEN,
                this._idTokenNonce,
                !0
              ),
              this._saveItem(this.CONSTANTS.STORAGE.ERROR, ""),
              this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, "");
            var n =
              this._getNavigateUrl("id_token", null) +
              "&nonce=" +
              encodeURIComponent(this._idTokenNonce);
            this.config.displayCall
              ? this.config.displayCall(n)
              : this.popUp
              ? (this._saveItem(this.CONSTANTS.STORAGE.STATE_LOGIN, ""),
                this._renewStates.push(e),
                this.registerCallback(e, this.config.clientId, this.callback),
                this._loginPopup(n))
              : this.promptUser(n);
          }
        }),
        (o.prototype._openPopup = function (e, t, n, o) {
          try {
            var i = window.screenLeft ? window.screenLeft : window.screenX,
              a = window.screenTop ? window.screenTop : window.screenY,
              r =
                window.innerWidth ||
                document.documentElement.clientWidth ||
                document.body.clientWidth,
              s =
                window.innerHeight ||
                document.documentElement.clientHeight ||
                document.body.clientHeight,
              l = r / 2 - n / 2 + i,
              c = s / 2 - o / 2 + a,
              d = window.open(
                e,
                t,
                "width=" + n + ", height=" + o + ", top=" + c + ", left=" + l
              );
            return d.focus && d.focus(), d;
          } catch (e) {
            return (
              this.warn("Error opening popup, " + e.message),
              (this._loginInProgress = !1),
              (this._acquireTokenInProgress = !1),
              null
            );
          }
        }),
        (o.prototype._handlePopupError = function (e, t, n, o, i) {
          this.warn(o),
            this._saveItem(this.CONSTANTS.STORAGE.ERROR, n),
            this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, o),
            this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, i),
            t && this._activeRenewals[t] && (this._activeRenewals[t] = null),
            (this._loginInProgress = !1),
            (this._acquireTokenInProgress = !1),
            e && e(o, null, n);
        }),
        (o.prototype._loginPopup = function (e, t, n) {
          var o = this._openPopup(
              e,
              "login",
              this.CONSTANTS.POPUP_WIDTH,
              this.CONSTANTS.POPUP_HEIGHT
            ),
            i = n || this.callback;
          if (null != o) {
            if (
              (this._openedWindows.push(o),
              -1 != this.config.redirectUri.indexOf("#"))
            )
              var a = this.config.redirectUri.split("#")[0];
            else a = this.config.redirectUri;
            var r = this,
              s = window.setInterval(function () {
                if (!o || o.closed || void 0 === o.closed) {
                  var e = "Popup Window closed",
                    n =
                      "Popup Window closed by UI action/ Popup Window handle destroyed due to cross zone navigation in IE/Edge";
                  return (
                    r.isAngular &&
                      r._broadcast(
                        "adal:popUpClosed",
                        n + r.CONSTANTS.RESOURCE_DELIMETER + e
                      ),
                    r._handlePopupError(i, t, e, n, n),
                    void window.clearInterval(s)
                  );
                }
                try {
                  var l = o.location;
                  if (-1 != encodeURI(l.href).indexOf(encodeURI(a)))
                    return (
                      r.isAngular
                        ? r._broadcast("adal:popUpHashChanged", l.hash)
                        : r.handleWindowCallback(l.hash),
                      window.clearInterval(s),
                      (r._loginInProgress = !1),
                      (r._acquireTokenInProgress = !1),
                      r.info("Closing popup window"),
                      (r._openedWindows = []),
                      void o.close()
                    );
                } catch (e) {}
              }, 1);
          } else {
            var l = "Popup Window is null. This can happen if you are using IE";
            this._handlePopupError(i, t, "Error opening popup", l, l);
          }
        }),
        (o.prototype._broadcast = function (e, t) {
          !(function () {
            if ("function" == typeof window.CustomEvent) return !1;
            function e(e, t) {
              t = t || { bubbles: !1, cancelable: !1, detail: void 0 };
              var n = document.createEvent("CustomEvent");
              return n.initCustomEvent(e, t.bubbles, t.cancelable, t.detail), n;
            }
            (e.prototype = window.Event.prototype), (window.CustomEvent = e);
          })();
          var n = new CustomEvent(e, { detail: t });
          window.dispatchEvent(n);
        }),
        (o.prototype.loginInProgress = function () {
          return this._loginInProgress;
        }),
        (o.prototype._hasResource = function (e) {
          var t = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS);
          return (
            t &&
            !this._isEmpty(t) &&
            t.indexOf(e + this.CONSTANTS.RESOURCE_DELIMETER) > -1
          );
        }),
        (o.prototype.getCachedToken = function (e) {
          if (!this._hasResource(e)) return null;
          var t = this._getItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + e),
            n = this._getItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + e),
            o = this.config.expireOffsetSeconds || 300;
          return n && n > this._now() + o
            ? t
            : (this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + e, ""),
              this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + e, 0),
              null);
        }),
        (o.prototype.getCachedUser = function () {
          if (this._user) return this._user;
          var e = this._getItem(this.CONSTANTS.STORAGE.IDTOKEN);
          return (this._user = this._createUser(e)), this._user;
        }),
        (o.prototype.registerCallback = function (e, t, n) {
          (this._activeRenewals[t] = e),
            this._callBacksMappedToRenewStates[e] ||
              (this._callBacksMappedToRenewStates[e] = []);
          var o = this;
          this._callBacksMappedToRenewStates[e].push(n),
            this._callBackMappedToRenewStates[e] ||
              (this._callBackMappedToRenewStates[e] = function (n, i, a, r) {
                o._activeRenewals[t] = null;
                for (
                  var s = 0;
                  s < o._callBacksMappedToRenewStates[e].length;
                  ++s
                )
                  try {
                    o._callBacksMappedToRenewStates[e][s](n, i, a, r);
                  } catch (a) {
                    o.warn(a);
                  }
                (o._callBacksMappedToRenewStates[e] = null),
                  (o._callBackMappedToRenewStates[e] = null);
              });
        }),
        (o.prototype._renewToken = function (e, t, n) {
          this.info("renewToken is called for resource:" + e);
          var o = this._addAdalFrame("adalRenewFrame" + e),
            i = this._guid() + "|" + e;
          (this.config.state = i),
            this._renewStates.push(i),
            this.verbose("Renew token Expected state: " + i),
            (n = n || "token");
          var a = this._urlRemoveQueryStringParameter(
            this._getNavigateUrl(n, e),
            "prompt"
          );
          n === this.RESPONSE_TYPE.ID_TOKEN_TOKEN &&
            ((this._idTokenNonce = this._guid()),
            this._saveItem(
              this.CONSTANTS.STORAGE.NONCE_IDTOKEN,
              this._idTokenNonce,
              !0
            ),
            (a += "&nonce=" + encodeURIComponent(this._idTokenNonce))),
            (a += "&prompt=none"),
            (a = this._addHintParameters(a)),
            this.registerCallback(i, e, t),
            this.verbosePii("Navigate to:" + a),
            (o.src = "about:blank"),
            this._loadFrameTimeout(a, "adalRenewFrame" + e, e);
        }),
        (o.prototype._renewIdToken = function (e, t) {
          this.info("renewIdToken is called");
          var n = this._addAdalFrame("adalIdTokenFrame"),
            o = this._guid() + "|" + this.config.clientId;
          (this._idTokenNonce = this._guid()),
            this._saveItem(
              this.CONSTANTS.STORAGE.NONCE_IDTOKEN,
              this._idTokenNonce,
              !0
            ),
            (this.config.state = o),
            this._renewStates.push(o),
            this.verbose("Renew Idtoken Expected state: " + o);
          var i = null == t ? null : this.config.clientId,
            a =
              ((t = t || "id_token"),
              this._urlRemoveQueryStringParameter(
                this._getNavigateUrl(t, i),
                "prompt"
              ));
          (a += "&prompt=none"),
            (a = this._addHintParameters(a)),
            (a += "&nonce=" + encodeURIComponent(this._idTokenNonce)),
            this.registerCallback(o, this.config.clientId, e),
            this.verbosePii("Navigate to:" + a),
            (n.src = "about:blank"),
            this._loadFrameTimeout(a, "adalIdTokenFrame", this.config.clientId);
        }),
        (o.prototype._urlContainsQueryStringParameter = function (e, t) {
          return new RegExp("[\\?&]" + e + "=").test(t);
        }),
        (o.prototype._urlRemoveQueryStringParameter = function (e, t) {
          var n = new RegExp("(\\&" + t + "=)[^&]+");
          return (
            (e = e.replace(n, "")),
            (n = new RegExp("(" + t + "=)[^&]+&")),
            (e = e.replace(n, "")),
            (n = new RegExp("(" + t + "=)[^&]+")),
            (e = e.replace(n, ""))
          );
        }),
        (o.prototype._loadFrameTimeout = function (e, t, n) {
          this.verbose("Set loading state to pending for: " + n),
            this._saveItem(
              this.CONSTANTS.STORAGE.RENEW_STATUS + n,
              this.CONSTANTS.TOKEN_RENEW_STATUS_IN_PROGRESS
            ),
            this._loadFrame(e, t);
          var o = this;
          setTimeout(function () {
            if (
              o._getItem(o.CONSTANTS.STORAGE.RENEW_STATUS + n) ===
              o.CONSTANTS.TOKEN_RENEW_STATUS_IN_PROGRESS
            ) {
              o.verbose(
                "Loading frame has timed out after: " +
                  o.CONSTANTS.LOADFRAME_TIMEOUT / 1e3 +
                  " seconds for resource " +
                  n
              );
              var e = o._activeRenewals[n];
              e &&
                o._callBackMappedToRenewStates[e] &&
                o._callBackMappedToRenewStates[e](
                  "Token renewal operation failed due to timeout",
                  null,
                  "Token Renewal Failed"
                ),
                o._saveItem(
                  o.CONSTANTS.STORAGE.RENEW_STATUS + n,
                  o.CONSTANTS.TOKEN_RENEW_STATUS_CANCELED
                );
            }
          }, o.CONSTANTS.LOADFRAME_TIMEOUT);
        }),
        (o.prototype._loadFrame = function (e, t) {
          var n = this;
          n.info("LoadFrame: " + t);
          var o = t;
          setTimeout(function () {
            var t = n._addAdalFrame(o);
            ("" !== t.src && "about:blank" !== t.src) ||
              ((t.src = e), n._loadFrame(e, o));
          }, 500);
        }),
        (o.prototype.acquireToken = function (e, t) {
          if (this._isEmpty(e))
            return (
              this.warn("resource is required"),
              void t("resource is required", null, "resource is required")
            );
          var n = this.getCachedToken(e);
          return n
            ? (this.info("Token is already in cache for resource:" + e),
              void t(null, n, null))
            : this._user ||
              (this.config.extraQueryParameter &&
                -1 !== this.config.extraQueryParameter.indexOf("login_hint"))
            ? void (this._activeRenewals[e]
                ? this.registerCallback(this._activeRenewals[e], e, t)
                : ((this._requestType = this.REQUEST_TYPE.RENEW_TOKEN),
                  e === this.config.clientId
                    ? this._user
                      ? (this.verbose("renewing idtoken"),
                        this._renewIdToken(t))
                      : (this.verbose("renewing idtoken and access_token"),
                        this._renewIdToken(
                          t,
                          this.RESPONSE_TYPE.ID_TOKEN_TOKEN
                        ))
                    : this._user
                    ? (this.verbose("renewing access_token"),
                      this._renewToken(e, t))
                    : (this.verbose("renewing idtoken and access_token"),
                      this._renewToken(
                        e,
                        t,
                        this.RESPONSE_TYPE.ID_TOKEN_TOKEN
                      ))))
            : (this.warn("User login is required"),
              void t("User login is required", null, "login required"));
        }),
        (o.prototype.acquireTokenPopup = function (e, t, n, o) {
          if (this._isEmpty(e))
            return (
              this.warn("resource is required"),
              void o("resource is required", null, "resource is required")
            );
          if (!this._user)
            return (
              this.warn("User login is required"),
              void o("User login is required", null, "login required")
            );
          if (this._acquireTokenInProgress)
            return (
              this.warn("Acquire token interactive is already in progress"),
              void o(
                "Acquire token interactive is already in progress",
                null,
                "Acquire token interactive is already in progress"
              )
            );
          var i = this._guid() + "|" + e;
          (this.config.state = i),
            this._renewStates.push(i),
            (this._requestType = this.REQUEST_TYPE.RENEW_TOKEN),
            this.verbose("Renew token Expected state: " + i);
          var a = this._urlRemoveQueryStringParameter(
            this._getNavigateUrl("token", e),
            "prompt"
          );
          if (
            ((a += "&prompt=select_account"),
            t && (a += t),
            n && -1 === a.indexOf("&claims"))
          )
            a += "&claims=" + encodeURIComponent(n);
          else if (n && -1 !== a.indexOf("&claims"))
            throw new Error(
              "Claims cannot be passed as an extraQueryParameter"
            );
          (a = this._addHintParameters(a)),
            (this._acquireTokenInProgress = !0),
            this.info(
              "acquireToken interactive is called for the resource " + e
            ),
            this.registerCallback(i, e, o),
            this._loginPopup(a, e, o);
        }),
        (o.prototype.acquireTokenRedirect = function (e, t, n) {
          if (this._isEmpty(e))
            return (
              this.warn("resource is required"),
              void o("resource is required", null, "resource is required")
            );
          var o = this.callback;
          if (!this._user)
            return (
              this.warn("User login is required"),
              void o("User login is required", null, "login required")
            );
          if (this._acquireTokenInProgress)
            return (
              this.warn("Acquire token interactive is already in progress"),
              void o(
                "Acquire token interactive is already in progress",
                null,
                "Acquire token interactive is already in progress"
              )
            );
          var i = this._guid() + "|" + e;
          (this.config.state = i),
            this.verbose("Renew token Expected state: " + i);
          var a = this._urlRemoveQueryStringParameter(
            this._getNavigateUrl("token", e),
            "prompt"
          );
          if (
            ((a += "&prompt=select_account"),
            t && (a += t),
            n && -1 === a.indexOf("&claims"))
          )
            a += "&claims=" + encodeURIComponent(n);
          else if (n && -1 !== a.indexOf("&claims"))
            throw new Error(
              "Claims cannot be passed as an extraQueryParameter"
            );
          (a = this._addHintParameters(a)),
            (this._acquireTokenInProgress = !0),
            this.info(
              "acquireToken interactive is called for the resource " + e
            ),
            this._saveItem(
              this.CONSTANTS.STORAGE.LOGIN_REQUEST,
              window.location.href
            ),
            this._saveItem(this.CONSTANTS.STORAGE.STATE_RENEW, i, !0),
            this.promptUser(a);
        }),
        (o.prototype.promptUser = function (e) {
          e
            ? (this.infoPii("Navigate to:" + e), window.location.replace(e))
            : this.info("Navigate url is empty");
        }),
        (o.prototype.clearCache = function () {
          this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, ""),
            this._saveItem(this.CONSTANTS.STORAGE.ANGULAR_LOGIN_REQUEST, ""),
            this._saveItem(this.CONSTANTS.STORAGE.SESSION_STATE, ""),
            this._saveItem(this.CONSTANTS.STORAGE.STATE_LOGIN, ""),
            this._saveItem(this.CONSTANTS.STORAGE.STATE_RENEW, ""),
            (this._renewStates = []),
            this._saveItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN, ""),
            this._saveItem(this.CONSTANTS.STORAGE.IDTOKEN, ""),
            this._saveItem(this.CONSTANTS.STORAGE.ERROR, ""),
            this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, ""),
            this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, ""),
            this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, "");
          var e = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS);
          if (!this._isEmpty(e)) {
            e = e.split(this.CONSTANTS.RESOURCE_DELIMETER);
            for (var t = 0; t < e.length && "" !== e[t]; t++)
              this._saveItem(
                this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + e[t],
                ""
              ),
                this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + e[t], 0);
          }
          this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, "");
        }),
        (o.prototype.clearCacheForResource = function (e) {
          this._saveItem(this.CONSTANTS.STORAGE.STATE_RENEW, ""),
            this._saveItem(this.CONSTANTS.STORAGE.ERROR, ""),
            this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, ""),
            this._hasResource(e) &&
              (this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + e, ""),
              this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + e, 0));
        }),
        (o.prototype.logOut = function () {
          var e;
          if ((this.clearCache(), (this._user = null), this.config.logOutUri))
            e = this.config.logOutUri;
          else {
            var t = "common",
              n = "";
            this.config.tenant && (t = this.config.tenant),
              this.config.postLogoutRedirectUri &&
                (n =
                  "post_logout_redirect_uri=" +
                  encodeURIComponent(this.config.postLogoutRedirectUri)),
              (e = this.instance + t + "/oauth2/logout?" + n);
          }
          this.infoPii("Logout navigate to: " + e), this.promptUser(e);
        }),
        (o.prototype._isEmpty = function (e) {
          return void 0 === e || !e || 0 === e.length;
        }),
        (o.prototype.getUser = function (e) {
          if ("function" != typeof e)
            throw new Error("callback is not a function");
          if (this._user) e(null, this._user);
          else {
            var t = this._getItem(this.CONSTANTS.STORAGE.IDTOKEN);
            this._isEmpty(t)
              ? (this.warn("User information is not available"),
                e("User information is not available", null))
              : (this.info("User exists in cache: "),
                (this._user = this._createUser(t)),
                e(null, this._user));
          }
        }),
        (o.prototype._addHintParameters = function (e) {
          if (this._user && this._user.profile)
            if (this._user.profile.sid && -1 !== e.indexOf("&prompt=none"))
              this._urlContainsQueryStringParameter("sid", e) ||
                (e += "&sid=" + encodeURIComponent(this._user.profile.sid));
            else if (
              this._user.profile.upn &&
              (this._urlContainsQueryStringParameter("login_hint", e) ||
                (e +=
                  "&login_hint=" + encodeURIComponent(this._user.profile.upn)),
              !this._urlContainsQueryStringParameter("domain_hint", e) &&
                this._user.profile.upn.indexOf("@") > -1)
            ) {
              var t = this._user.profile.upn.split("@");
              e += "&domain_hint=" + encodeURIComponent(t[t.length - 1]);
            }
          return e;
        }),
        (o.prototype._createUser = function (e) {
          var t = null,
            n = this._extractIdToken(e);
          return (
            n &&
              n.hasOwnProperty("aud") &&
              (n.aud.toLowerCase() === this.config.clientId.toLowerCase()
                ? ((t = { userName: "", profile: n }),
                  n.hasOwnProperty("upn")
                    ? (t.userName = n.upn)
                    : n.hasOwnProperty("email") && (t.userName = n.email))
                : this.warn("IdToken has invalid aud field")),
            t
          );
        }),
        (o.prototype._getHash = function (e) {
          return (
            e.indexOf("#/") > -1
              ? (e = e.substring(e.indexOf("#/") + 2))
              : e.indexOf("#") > -1 && (e = e.substring(1)),
            e
          );
        }),
        (o.prototype.isCallback = function (e) {
          e = this._getHash(e);
          var t = this._deserialize(e);
          return (
            t.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION) ||
            t.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN) ||
            t.hasOwnProperty(this.CONSTANTS.ID_TOKEN)
          );
        }),
        (o.prototype.getLoginError = function () {
          return this._getItem(this.CONSTANTS.STORAGE.LOGIN_ERROR);
        }),
        (o.prototype.getRequestInfo = function (e) {
          e = this._getHash(e);
          var t = this._deserialize(e),
            n = {
              valid: !1,
              parameters: {},
              stateMatch: !1,
              stateResponse: "",
              requestType: this.REQUEST_TYPE.UNKNOWN,
            };
          if (
            t &&
            ((n.parameters = t),
            t.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION) ||
              t.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN) ||
              t.hasOwnProperty(this.CONSTANTS.ID_TOKEN))
          ) {
            n.valid = !0;
            var o = "";
            if (!t.hasOwnProperty("state"))
              return this.warn("No state returned"), n;
            if (
              (this.verbose("State: " + t.state),
              (o = t.state),
              (n.stateResponse = o),
              this._matchState(n))
            )
              return n;
            if (!n.stateMatch && window.parent) {
              n.requestType = this._requestType;
              for (var i = this._renewStates, a = 0; a < i.length; a++)
                if (i[a] === n.stateResponse) {
                  n.stateMatch = !0;
                  break;
                }
            }
          }
          return n;
        }),
        (o.prototype._matchNonce = function (e) {
          var t = this._getItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN);
          if (t) {
            t = t.split(this.CONSTANTS.CACHE_DELIMETER);
            for (var n = 0; n < t.length; n++)
              if (t[n] && t[n] === e.profile.nonce) return !0;
          }
          return !1;
        }),
        (o.prototype._matchState = function (e) {
          var t = this._getItem(this.CONSTANTS.STORAGE.STATE_LOGIN);
          if (t) {
            t = t.split(this.CONSTANTS.CACHE_DELIMETER);
            for (var n = 0; n < t.length; n++)
              if (t[n] && t[n] === e.stateResponse)
                return (
                  (e.requestType = this.REQUEST_TYPE.LOGIN),
                  (e.stateMatch = !0),
                  !0
                );
          }
          var o = this._getItem(this.CONSTANTS.STORAGE.STATE_RENEW);
          if (o) {
            o = o.split(this.CONSTANTS.CACHE_DELIMETER);
            for (n = 0; n < o.length; n++)
              if (o[n] && o[n] === e.stateResponse)
                return (
                  (e.requestType = this.REQUEST_TYPE.RENEW_TOKEN),
                  (e.stateMatch = !0),
                  !0
                );
          }
          return !1;
        }),
        (o.prototype._getResourceFromState = function (e) {
          if (e) {
            var t = e.indexOf("|");
            if (t > -1 && t + 1 < e.length) return e.substring(t + 1);
          }
          return "";
        }),
        (o.prototype.saveTokenFromHash = function (e) {
          this.info(
            "State status:" + e.stateMatch + "; Request type:" + e.requestType
          ),
            this._saveItem(this.CONSTANTS.STORAGE.ERROR, ""),
            this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, "");
          var t,
            n = this._getResourceFromState(e.stateResponse);
          e.parameters.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION)
            ? (this.infoPii(
                "Error :" +
                  e.parameters.error +
                  "; Error description:" +
                  e.parameters[this.CONSTANTS.ERROR_DESCRIPTION]
              ),
              this._saveItem(this.CONSTANTS.STORAGE.ERROR, e.parameters.error),
              this._saveItem(
                this.CONSTANTS.STORAGE.ERROR_DESCRIPTION,
                e.parameters[this.CONSTANTS.ERROR_DESCRIPTION]
              ),
              e.requestType === this.REQUEST_TYPE.LOGIN &&
                ((this._loginInProgress = !1),
                this._saveItem(
                  this.CONSTANTS.STORAGE.LOGIN_ERROR,
                  e.parameters.error_description
                )))
            : e.stateMatch
            ? (this.info("State is right"),
              e.parameters.hasOwnProperty(this.CONSTANTS.SESSION_STATE) &&
                this._saveItem(
                  this.CONSTANTS.STORAGE.SESSION_STATE,
                  e.parameters[this.CONSTANTS.SESSION_STATE]
                ),
              e.parameters.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN) &&
                (this.info("Fragment has access token"),
                this._hasResource(n) ||
                  ((t = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) || ""),
                  this._saveItem(
                    this.CONSTANTS.STORAGE.TOKEN_KEYS,
                    t + n + this.CONSTANTS.RESOURCE_DELIMETER
                  )),
                this._saveItem(
                  this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + n,
                  e.parameters[this.CONSTANTS.ACCESS_TOKEN]
                ),
                this._saveItem(
                  this.CONSTANTS.STORAGE.EXPIRATION_KEY + n,
                  this._expiresIn(e.parameters[this.CONSTANTS.EXPIRES_IN])
                )),
              e.parameters.hasOwnProperty(this.CONSTANTS.ID_TOKEN) &&
                (this.info("Fragment has id token"),
                (this._loginInProgress = !1),
                (this._user = this._createUser(
                  e.parameters[this.CONSTANTS.ID_TOKEN]
                )),
                this._user && this._user.profile
                  ? this._matchNonce(this._user)
                    ? (this._saveItem(
                        this.CONSTANTS.STORAGE.IDTOKEN,
                        e.parameters[this.CONSTANTS.ID_TOKEN]
                      ),
                      (n = this.config.loginResource
                        ? this.config.loginResource
                        : this.config.clientId),
                      this._hasResource(n) ||
                        ((t =
                          this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) ||
                          ""),
                        this._saveItem(
                          this.CONSTANTS.STORAGE.TOKEN_KEYS,
                          t + n + this.CONSTANTS.RESOURCE_DELIMETER
                        )),
                      this._saveItem(
                        this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + n,
                        e.parameters[this.CONSTANTS.ID_TOKEN]
                      ),
                      this._saveItem(
                        this.CONSTANTS.STORAGE.EXPIRATION_KEY + n,
                        this._user.profile.exp
                      ))
                    : (this._saveItem(
                        this.CONSTANTS.STORAGE.LOGIN_ERROR,
                        "Nonce received: " +
                          this._user.profile.nonce +
                          " is not same as requested: " +
                          this._getItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN)
                      ),
                      (this._user = null))
                  : ((e.parameters.error = "invalid id_token"),
                    (e.parameters.error_description =
                      "Invalid id_token. id_token: " +
                      e.parameters[this.CONSTANTS.ID_TOKEN]),
                    this._saveItem(
                      this.CONSTANTS.STORAGE.ERROR,
                      "invalid id_token"
                    ),
                    this._saveItem(
                      this.CONSTANTS.STORAGE.ERROR_DESCRIPTION,
                      "Invalid id_token. id_token: " +
                        e.parameters[this.CONSTANTS.ID_TOKEN]
                    ))))
            : ((e.parameters.error = "Invalid_state"),
              (e.parameters.error_description =
                "Invalid_state. state: " + e.stateResponse),
              this._saveItem(this.CONSTANTS.STORAGE.ERROR, "Invalid_state"),
              this._saveItem(
                this.CONSTANTS.STORAGE.ERROR_DESCRIPTION,
                "Invalid_state. state: " + e.stateResponse
              ));
          this._saveItem(
            this.CONSTANTS.STORAGE.RENEW_STATUS + n,
            this.CONSTANTS.TOKEN_RENEW_STATUS_COMPLETED
          );
        }),
        (o.prototype.getResourceForEndpoint = function (e) {
          if (this.config && this.config.anonymousEndpoints)
            for (var t = 0; t < this.config.anonymousEndpoints.length; t++)
              if (e.indexOf(this.config.anonymousEndpoints[t]) > -1)
                return null;
          if (this.config && this.config.endpoints)
            for (var n in this.config.endpoints)
              if (e.indexOf(n) > -1) return this.config.endpoints[n];
          return e.indexOf("http://") > -1 || e.indexOf("https://") > -1
            ? this._getHostFromUri(e) ===
              this._getHostFromUri(this.config.redirectUri)
              ? this.config.loginResource
              : null
            : this.config.loginResource;
        }),
        (o.prototype._getHostFromUri = function (e) {
          var t = String(e).replace(/^(https?:)\/\//, "");
          return (t = t.split("/")[0]);
        }),
        (o.prototype.handleWindowCallback = function (e) {
          if ((null == e && (e = window.location.hash), this.isCallback(e))) {
            var t = null,
              n = !1;
            this._openedWindows.length > 0 &&
            this._openedWindows[this._openedWindows.length - 1].opener &&
            this._openedWindows[this._openedWindows.length - 1].opener
              ._adalInstance
              ? ((t =
                  this._openedWindows[this._openedWindows.length - 1].opener
                    ._adalInstance),
                (n = !0))
              : window.parent &&
                window.parent._adalInstance &&
                (t = window.parent._adalInstance);
            var o,
              i,
              a = t.getRequestInfo(e),
              r = null;
            (i =
              n || window.parent !== window
                ? t._callBackMappedToRenewStates[a.stateResponse]
                : t.callback),
              t.info("Returned from redirect url"),
              t.saveTokenFromHash(a),
              a.requestType === this.REQUEST_TYPE.RENEW_TOKEN && window.parent
                ? (window.parent !== window
                    ? t.verbose("Window is in iframe, acquiring token silently")
                    : t.verbose("acquiring token interactive in progress"),
                  (o =
                    a.parameters[t.CONSTANTS.ACCESS_TOKEN] ||
                    a.parameters[t.CONSTANTS.ID_TOKEN]),
                  (r = t.CONSTANTS.ACCESS_TOKEN))
                : a.requestType === this.REQUEST_TYPE.LOGIN &&
                  ((o = a.parameters[t.CONSTANTS.ID_TOKEN]),
                  (r = t.CONSTANTS.ID_TOKEN));
            var s = a.parameters[t.CONSTANTS.ERROR_DESCRIPTION],
              l = a.parameters[t.CONSTANTS.ERROR];
            try {
              i && i(s, o, l, r);
            } catch (e) {
              t.error("Error occurred in user defined callback function: " + e);
            }
            window.parent !== window ||
              n ||
              (t.config.navigateToLoginRequestUrl
                ? (window.location.href = t._getItem(
                    t.CONSTANTS.STORAGE.LOGIN_REQUEST
                  ))
                : (window.location.hash = ""));
          }
        }),
        (o.prototype._getNavigateUrl = function (e, t) {
          var n = "common";
          this.config.tenant && (n = this.config.tenant);
          var o =
            this.instance +
            n +
            "/oauth2/authorize" +
            this._serialize(e, this.config, t) +
            this._addLibMetadata();
          return this.info("Navigate url:" + o), o;
        }),
        (o.prototype._extractIdToken = function (e) {
          var t = this._decodeJwt(e);
          if (!t) return null;
          try {
            var n = t.JWSPayload,
              o = this._base64DecodeStringUrlSafe(n);
            return o
              ? JSON.parse(o)
              : (this.info(
                  "The returned id_token could not be base64 url safe decoded."
                ),
                null);
          } catch (e) {
            this.error("The returned id_token could not be decoded", e);
          }
          return null;
        }),
        (o.prototype._base64DecodeStringUrlSafe = function (e) {
          return (
            (e = e.replace(/-/g, "+").replace(/_/g, "/")),
            window.atob
              ? decodeURIComponent(escape(window.atob(e)))
              : decodeURIComponent(escape(this._decode(e)))
          );
        }),
        (o.prototype._decode = function (e) {
          var t =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
            n = (e = String(e).replace(/=+$/, "")).length;
          if (n % 4 == 1)
            throw new Error(
              "The token to be decoded is not correctly encoded."
            );
          for (var o, i, a, r, s, l, c, d, u = "", p = 0; p < n; p += 4) {
            if (
              ((o = t.indexOf(e.charAt(p))),
              (i = t.indexOf(e.charAt(p + 1))),
              (a = t.indexOf(e.charAt(p + 2))),
              (r = t.indexOf(e.charAt(p + 3))),
              p + 2 === n - 1)
            ) {
              (l = ((s = (o << 18) | (i << 12) | (a << 6)) >> 16) & 255),
                (c = (s >> 8) & 255),
                (u += String.fromCharCode(l, c));
              break;
            }
            if (p + 1 === n - 1) {
              (l = ((s = (o << 18) | (i << 12)) >> 16) & 255),
                (u += String.fromCharCode(l));
              break;
            }
            (l = ((s = (o << 18) | (i << 12) | (a << 6) | r) >> 16) & 255),
              (c = (s >> 8) & 255),
              (d = 255 & s),
              (u += String.fromCharCode(l, c, d));
          }
          return u;
        }),
        (o.prototype._decodeJwt = function (e) {
          if (this._isEmpty(e)) return null;
          var t = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/.exec(e);
          return !t || t.length < 4
            ? (this.warn("The returned id_token is not parseable."), null)
            : { header: t[1], JWSPayload: t[2], JWSSig: t[3] };
        }),
        (o.prototype._convertUrlSafeToRegularBase64EncodedString = function (
          e
        ) {
          return e.replace("-", "+").replace("_", "/");
        }),
        (o.prototype._serialize = function (e, t, n) {
          var o = [];
          if (null !== t) {
            o.push("?response_type=" + e),
              o.push("client_id=" + encodeURIComponent(t.clientId)),
              n && o.push("resource=" + encodeURIComponent(n)),
              o.push("redirect_uri=" + encodeURIComponent(t.redirectUri)),
              o.push("state=" + encodeURIComponent(t.state)),
              t.hasOwnProperty("slice") &&
                o.push("slice=" + encodeURIComponent(t.slice)),
              t.hasOwnProperty("extraQueryParameter") &&
                o.push(t.extraQueryParameter);
            var i = t.correlationId ? t.correlationId : this._guid();
            o.push("client-request-id=" + encodeURIComponent(i));
          }
          return o.join("&");
        }),
        (o.prototype._deserialize = function (e) {
          var t,
            n = /\+/g,
            o = /([^&=]+)=([^&]*)/g,
            i = function (e) {
              return decodeURIComponent(e.replace(n, " "));
            },
            a = {};
          for (t = o.exec(e); t; ) (a[i(t[1])] = i(t[2])), (t = o.exec(e));
          return a;
        }),
        (o.prototype._decimalToHex = function (e) {
          for (var t = e.toString(16); t.length < 2; ) t = "0" + t;
          return t;
        }),
        (o.prototype._guid = function () {
          var e = window.crypto || window.msCrypto;
          if (e && e.getRandomValues) {
            var t = new Uint8Array(16);
            return (
              e.getRandomValues(t),
              (t[6] |= 64),
              (t[6] &= 79),
              (t[8] |= 128),
              (t[8] &= 191),
              this._decimalToHex(t[0]) +
                this._decimalToHex(t[1]) +
                this._decimalToHex(t[2]) +
                this._decimalToHex(t[3]) +
                "-" +
                this._decimalToHex(t[4]) +
                this._decimalToHex(t[5]) +
                "-" +
                this._decimalToHex(t[6]) +
                this._decimalToHex(t[7]) +
                "-" +
                this._decimalToHex(t[8]) +
                this._decimalToHex(t[9]) +
                "-" +
                this._decimalToHex(t[10]) +
                this._decimalToHex(t[11]) +
                this._decimalToHex(t[12]) +
                this._decimalToHex(t[13]) +
                this._decimalToHex(t[14]) +
                this._decimalToHex(t[15])
            );
          }
          for (
            var n = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
              o = "0123456789abcdef",
              i = 0,
              a = "",
              r = 0;
            r < 36;
            r++
          )
            "-" !== n[r] && "4" !== n[r] && (i = (16 * Math.random()) | 0),
              "x" === n[r]
                ? (a += o[i])
                : "y" === n[r]
                ? ((i &= 3), (a += o[(i |= 8)]))
                : (a += n[r]);
          return a;
        }),
        (o.prototype._expiresIn = function (e) {
          return e || (e = 3599), this._now() + parseInt(e, 10);
        }),
        (o.prototype._now = function () {
          return Math.round(new Date().getTime() / 1e3);
        }),
        (o.prototype._addAdalFrame = function (e) {
          if (void 0 !== e) {
            this.info("Add adal frame to document:" + e);
            var t = document.getElementById(e);
            if (!t) {
              if (
                document.createElement &&
                document.documentElement &&
                (window.opera ||
                  -1 === window.navigator.userAgent.indexOf("MSIE 5.0"))
              ) {
                var n = document.createElement("iframe");
                n.setAttribute("id", e),
                  n.setAttribute("aria-hidden", "true"),
                  (n.style.visibility = "hidden"),
                  (n.style.position = "absolute"),
                  (n.style.width = n.style.height = n.borderWidth = "0px"),
                  (t = document.getElementsByTagName("body")[0].appendChild(n));
              } else
                document.body &&
                  document.body.insertAdjacentHTML &&
                  document.body.insertAdjacentHTML(
                    "beforeEnd",
                    '<iframe name="' +
                      e +
                      '" id="' +
                      e +
                      '" style="display:none"></iframe>'
                  );
              window.frames && window.frames[e] && (t = window.frames[e]);
            }
            return t;
          }
        }),
        (o.prototype._saveItem = function (e, t, n) {
          if (
            this.config &&
            this.config.cacheLocation &&
            "localStorage" === this.config.cacheLocation
          ) {
            if (!this._supportsLocalStorage())
              return this.info("Local storage is not supported"), !1;
            if (n) {
              var o = this._getItem(e) || "";
              localStorage.setItem(e, o + t + this.CONSTANTS.CACHE_DELIMETER);
            } else localStorage.setItem(e, t);
            return !0;
          }
          return this._supportsSessionStorage()
            ? (sessionStorage.setItem(e, t), !0)
            : (this.info("Session storage is not supported"), !1);
        }),
        (o.prototype._getItem = function (e) {
          return this.config &&
            this.config.cacheLocation &&
            "localStorage" === this.config.cacheLocation
            ? this._supportsLocalStorage()
              ? localStorage.getItem(e)
              : (this.info("Local storage is not supported"), null)
            : this._supportsSessionStorage()
            ? sessionStorage.getItem(e)
            : (this.info("Session storage is not supported"), null);
        }),
        (o.prototype._supportsLocalStorage = function () {
          try {
            return (
              !!window.localStorage &&
              (window.localStorage.setItem("storageTest", "A"),
              "A" == window.localStorage.getItem("storageTest") &&
                (window.localStorage.removeItem("storageTest"),
                !window.localStorage.getItem("storageTest")))
            );
          } catch (e) {
            return !1;
          }
        }),
        (o.prototype._supportsSessionStorage = function () {
          try {
            return (
              !!window.sessionStorage &&
              (window.sessionStorage.setItem("storageTest", "A"),
              "A" == window.sessionStorage.getItem("storageTest") &&
                (window.sessionStorage.removeItem("storageTest"),
                !window.sessionStorage.getItem("storageTest")))
            );
          } catch (e) {
            return !1;
          }
        }),
        (o.prototype._cloneConfig = function (e) {
          if (null === e || "object" != typeof e) return e;
          var t = {};
          for (var n in e) e.hasOwnProperty(n) && (t[n] = e[n]);
          return t;
        }),
        (o.prototype._addLibMetadata = function () {
          return "&x-client-SKU=Js&x-client-Ver=" + this._libVersion();
        }),
        (o.prototype.log = function (e, t, n, o) {
          if (e <= Logging.level) {
            if (!Logging.piiLoggingEnabled && o) return;
            var i = new Date().toUTCString(),
              a = "";
            (a = this.config.correlationId
              ? i +
                ":" +
                this.config.correlationId +
                "-" +
                this._libVersion() +
                "-" +
                this.CONSTANTS.LEVEL_STRING_MAP[e] +
                " " +
                t
              : i +
                ":" +
                this._libVersion() +
                "-" +
                this.CONSTANTS.LEVEL_STRING_MAP[e] +
                " " +
                t),
              n && (a += "\nstack:\n" + n.stack),
              Logging.log(a);
          }
        }),
        (o.prototype.error = function (e, t) {
          this.log(this.CONSTANTS.LOGGING_LEVEL.ERROR, e, t);
        }),
        (o.prototype.warn = function (e) {
          this.log(this.CONSTANTS.LOGGING_LEVEL.WARN, e, null);
        }),
        (o.prototype.info = function (e) {
          this.log(this.CONSTANTS.LOGGING_LEVEL.INFO, e, null);
        }),
        (o.prototype.verbose = function (e) {
          this.log(this.CONSTANTS.LOGGING_LEVEL.VERBOSE, e, null);
        }),
        (o.prototype.errorPii = function (e, t) {
          this.log(this.CONSTANTS.LOGGING_LEVEL.ERROR, e, t, !0);
        }),
        (o.prototype.warnPii = function (e) {
          this.log(this.CONSTANTS.LOGGING_LEVEL.WARN, e, null, !0);
        }),
        (o.prototype.infoPii = function (e) {
          this.log(this.CONSTANTS.LOGGING_LEVEL.INFO, e, null, !0);
        }),
        (o.prototype.verbosePii = function (e) {
          this.log(this.CONSTANTS.LOGGING_LEVEL.VERBOSE, e, null, !0);
        }),
        (o.prototype._libVersion = function () {
          return "1.0.18";
        }),
        e.exports &&
          ((e.exports = o),
          (e.exports.inject = function (e) {
            return new o(e);
          })),
        o
      );
    })();
  }