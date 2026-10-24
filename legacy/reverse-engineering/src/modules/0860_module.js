/**
 * Webpack Module #860
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19),
      n(30),
      n(8),
      n(20),
      n(3),
      n(34),
      n(4),
      n(13),
      n(32),
      n(33),
      n(26),
      n(125),
      n(126),
      n(114);
    var o = n(1),
      i = n(263),
      a = n(40);
    const { gApi: r, GLoginDialog: s, DESIGNER: { TITLE: l } = {} } = n(10),
      c = n(85),
      d = n(1252),
      u = n(859),
      p = function (e) {
        return gContainer.signWithOAuth(e);
      };
    function g(e) {
      this._closeCallback = e;
    }
    function h(e) {
      (this._callback = e), (this._loginConfiguration = {});
    }
    o.GObject.inherit(g, s.Impl),
      (g.prototype.openOAuth = function (e) {
        let { dialog: t, provider: n } = e;
        p(n)
          .then((e) => t._postLogin(e))
          .catch((e) => t._handleError(e));
      }),
      (g.prototype.openPurchaseFlow = async function (e) {
        let { dialog: t, options: n = {} } = e;
        await gDesigner.openPaymentDialog(null, n).catch(() => null), t.close();
      }),
      (g.prototype.openExternalLink = function (e) {
        let { link: t } = e;
        gContainer.openExternalLink(null, t);
      }),
      (g.prototype.close = function () {
        this._closeCallback();
      }),
      (g.prototype.getLanguage = function () {
        return o.GLocale.getLanguage();
      }),
      o.GObject.inherit(h, o.GObject),
      (h.prototype._callback = null),
      (h.prototype._newTitle = null),
      (h.prototype._oldTitle = null),
      (h.prototype._loginConfiguration = null),
      (h.prototype._popupInfo = null),
      (h.prototype.open = function () {
        var e = this;
        let t =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        const n = u.getRuntimeCode();
        this._loginConfiguration = Object.assign({ runtime: n }, t);
        const {
          anonymous: i = !1,
          animate: a = !1,
          version: l = "",
          options: c = {},
        } = t;
        let h;
        if (
          ((this._oldTitle = document.title),
          (this._newTitle = o.GLocale.get(
            new o.GLocaleKey("GEmbeddedLogin", "text.title")
          )),
          (document.title = this._newTitle),
          gDesigner.isOffline())
        ) {
          this._frame = $("<div></div>")
            .addClass("cross-frame")
            .toggleClass("g-anonymous", i)
            .appendTo($("body"));
          const e = new g(() => this.close());
          new s({
            impl: e,
            gApi: r,
            origin: location.origin,
            anonymous: i,
            version: l,
            options: c,
            runtime: n,
          }).open(this._frame);
        } else {
          const t = this._buildURL(this._loginConfiguration);
          (this._crossFrame = new d({
            className: i ? "g-anonymous" : "",
            oauth: (e) =>
              p(e.provider)
                .then((e) =>
                  this._crossFrame.postMessage(
                    { cmd: "postLogin", user: e },
                    "*"
                  )
                )
                .catch((t) => this._handleOAuthError(e.provider, t)),
            close: function () {
              let { token: t } =
                arguments.length > 0 && void 0 !== arguments[0]
                  ? arguments[0]
                  : {};
              return e.close(t);
            },
          }).open(t)),
            a &&
              ((h = this._crossFrame.getFrame()),
              h.css({ position: "fixed", height: "300%" }),
              h.on("load", f));
        }
        function f() {
          h && (h.animate({ height: "100%" }, "slow"), h.off("load", f));
        }
      }),
      (h.prototype._handleOAuthError = function (e, t) {
        t && t.code === r.ERROR_CODES.ERR_POPUP_HAS_BEEN_BLOCKED
          ? this._showPopupInfo(e)
          : this._crossFrame.postMessage({ cmd: "error", error: t }, "*");
      }),
      (h.prototype._showPopupInfo = function (e) {
        this._popupInfo && this._popupInfo.remove();
        const t = e.charAt(0).toUpperCase() + e.slice(1);
        (this._popupInfo = $("<div/>")
          .addClass("g-embedded-login")
          .addClass("popup-info")
          .append(
            $("<div/>")
              .addClass("container")
              .append(
                $("<div/>")
                  .addClass("message")
                  .html(
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GEmbeddedLogin",
                        "text.pop-has-been-blocked"
                      )
                    )
                      .replace("%provider", t)
                      .replace("%app", l)
                  )
              )
              .append(
                $("<img/>")
                  .addClass("close-button")
                  .attr("src", "assets/icon/login/close.svg")
                  .on("click", () => {
                    this._popupInfo.remove();
                  })
              )
          )),
          this._popupInfo.find("a").on("click", (t) => {
            t.preventDefault(),
              this._popupInfo.remove(),
              p(e)
                .then((e) => {
                  this._crossFrame.postMessage(
                    { cmd: "postLogin", user: e },
                    "*"
                  );
                })
                .catch((e) => {
                  this._crossFrame.postMessage({ cmd: "error", error: e }, "*");
                });
          }),
          this._popupInfo.appendTo($("body"));
      }),
      (h.prototype._buildURL = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        const {
          anonymous: t = !1,
          signup: n = !1,
          closeable: s = !0,
          flow: l,
          options: d = {},
          runtime: u,
        } = e;
        let p, g, h, f;
        if (gContainer.getRuntime() === c.Runtime.Electron) {
          const e = gContainer.getPlatform();
          ("darwin" !== e && "win32" !== e) || (p = window.btoa("designer://")),
            (g = (0, a.stringToBase64String)(gDesigner.getAssetsURL()));
        } else g = (0, a.stringToBase64String)(location.origin);
        const m = new URL("".concat(r.url, "/pro/login")),
          y = m.searchParams,
          v = gDesigner.getSignupOptions();
        v &&
          Object.entries(v).forEach((e) => {
            let [t, n] = e;
            n && y.set(t, n);
          }),
          g && y.set("webUrl", g),
          p && y.set("appUrl", p),
          (gDesigner.showCreateAccount() || n || v) && y.set("newuser", !0),
          gDesigner.enterpriseLoginForm() && y.set("enterprise", "1"),
          t && y.set("anonymous", t),
          s || y.set("closeable", s),
          l && y.set("flow", l),
          gContainer.shouldBypassEmailVerification() &&
            y.set("bypassEmailVerification", !0),
          u && y.set("runtime", u);
        var _ = new URL(window.location.href);
        if (_.searchParams)
          (h = _.searchParams.get("token")), (f = _.searchParams.get("d"));
        else {
          for (
            var b, w = {};
            (b = i.GRegex.URLQuery.NextParameter.exec(window.location.href));

          )
            w[b[1]] = b[2];
          (h = w.token), (f = w.d);
        }
        return (
          h && y.set("token", h),
          f && y.set("d", f),
          Object.keys(d).forEach((e) => {
            y.set(e, d[e]);
          }),
          y.set("lang", o.GLocale.getLanguage()),
          m.toString()
        );
      }),
      (h.prototype.close = async function (e) {
        e && r.setAuthorizationToken && r.setAuthorizationToken(e);
        const t = await gDesigner.getUser();
        t &&
          (this._isDeactivatedUser(t)
            ? this._handleDeactivatedUser(t)
            : (document.title === this._newTitle &&
                (document.title = this._oldTitle),
              this._crossFrame
                ? this._crossFrame.close()
                : this._frame && this._frame.remove(),
              this._callback && this._callback(t)));
      }),
      (h.prototype._isDeactivatedUser = function (e) {
        return (
          (!this._loginConfiguration.anonymous ||
            !gContainer.shouldBypassEmailVerification()) &&
          e.isDeactivated()
        );
      }),
      (h.prototype._handleDeactivatedUser = function (e) {
        if (this._crossFrame) {
          const { flow: e } = this._loginConfiguration;
          if ("purchase_flow_new" === e) {
            const e = this._buildURL(
              Object.assign(this._loginConfiguration, { flow: void 0 })
            );
            this._crossFrame.getFrame().attr("src", e);
          }
        }
        gDesigner.openDeactivatedUserDialog(e);
      }),
      (e.exports = h);
  }