/**
 * Webpack Module #1522
 * Type: class
 * Name: GInfo
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(8), n(20), n(3), n(34);
    var i = n(10),
      a = n(1),
      r = o(n(78));
    const s = n(44),
      l = n(863),
      c = n(85),
      d = n(805),
      u = n(292),
      { bypassEmailVerification: p } = i.defaultUserSettings;
    function g(e) {
      this._htmlElement = e;
    }
    a.GObject.inherit(g, a.GObject),
      (g.prototype._interval = null),
      (g.prototype._needToShow = !1),
      (g.prototype.init = function () {
        this.update(),
          gDesigner.addEventListener(d, this._userPropertiesChangedEvent, this),
          gDesigner.addEventListener(u, this._userLoggedEvent, this),
          gDesigner.addEventListener(r.default, this._documentEvent, this);
      }),
      (g.prototype.update = async function () {
        return gDesigner.getUser().then((e) => this._updateInfo(e));
      }),
      (g.prototype._userPropertiesChangedEvent = function (e) {
        this._updateInfo(e.user);
      }),
      (g.prototype._togglePanel = function (e) {
        "boolean" == typeof e &&
          ((!e && !this._needToShow) || e) &&
          gDesigner.setPartVisible(l.Info, e);
      }),
      (g.prototype._userLoggedEvent = function (e) {
        this._updateInfo(e.user);
      }),
      (g.prototype._documentEvent = function (e) {
        this._togglePanel(!1),
          this._updateSaveInfo(e),
          this._updateDocumentSubscription(e);
      }),
      (g.prototype._updateSaveInfo = function () {}),
      (g.prototype._updateDocumentSubscription = function () {}),
      (g.prototype._updateInfo = function (e) {
        if (
          (this._togglePanel(!1),
          this._interval && clearInterval(this._interval),
          !p &&
            gDesigner.isEnabledSubscriptions() &&
            !gDesigner.getLicense().isGuest() &&
            e &&
            !e.isEmailVerified() &&
            !e.isAnonymous())
        ) {
          (this._interval = setInterval(
            this.update.bind(this),
            i.DateAPI.daysToMilliseconds(1)
          )),
            i.gApi.listen("/confirmation", () => this.update(), !0);
          let t = new Date(e.created);
          e.email_expire && (t = new Date(e.email_expire));
          let n = a.GLocale.get(
            new a.GLocaleKey("GInfo", "text.title")
          ).replace("%date", a.GLocale.toLocaleDate(t));
          this._htmlElement
            .empty()
            .append($("<span></span>").text(n))
            .append(
              $("<span/>")
                .addClass("link")
                .text(
                  a.GLocale.get(new a.GLocaleKey("GInfo", "text.resend-email"))
                )
                .on("click", () => {
                  let t, n;
                  if (gContainer.getRuntime() === c.Runtime.Electron) {
                    const e = gContainer.getPlatform();
                    ("darwin" !== e && "win32" !== e) || (t = "designer://"),
                      (n = gDesigner.getAssetsURL());
                  } else n = location.origin;
                  return (
                    i.gApi
                      .resendEmailConfirmation({
                        appUrl: t,
                        webUrl: n,
                        email: e.email,
                        force: !0,
                        origin: location.origin,
                      })
                      .then(() => {
                        s.custom({
                          title: a.GLocale.get(
                            new a.GLocaleKey("GInfo", "text.email-sent")
                          ),
                          subtitle: a.GLocale.get(
                            new a.GLocaleKey(
                              "GInfo",
                              "text.email-sent-submessage"
                            )
                          ),
                          icon: "ok",
                        });
                      })
                      .catch((e) => {
                        s.custom({
                          title: a.GLocale.get(
                            new a.GLocaleKey(
                              "GInfo",
                              "text.something-went-wrong"
                            )
                          ),
                          subtitle: i.gApi.formatError(e),
                        });
                      }),
                    !1
                  );
                })
            ),
            this._togglePanel(!0);
        }
      }),
      (g.prototype.toString = function () {
        return "[Object GInfo]";
      }),
      (e.exports = g);
  }