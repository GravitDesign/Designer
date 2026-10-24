/**
 * GInfo
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GInfo(e) {
      this._htmlElement = e;
    }

GObject.inherit(GInfo, GObject);

// Prototype methods
GInfo.prototype.init = function () {
        this.update(),
          gDesigner.addEventListener(d, this._userPropertiesChangedEvent, this),
          gDesigner.addEventListener(u, this._userLoggedEvent, this),
          gDesigner.addEventListener(r.default, this._documentEvent, this);
      }

GInfo.prototype._userPropertiesChangedEvent = function (e) {
        this._updateInfo(e.user);
      }

GInfo.prototype._togglePanel = function (e) {
        "boolean" == typeof e &&
          ((!e && !this._needToShow) || e) &&
          gDesigner.setPartVisible(l.Info, e);
      }

GInfo.prototype._userLoggedEvent = function (e) {
        this._updateInfo(e.user);
      }

GInfo.prototype._documentEvent = function (e) {
        this._togglePanel(!1),
          this._updateSaveInfo(e),
          this._updateDocumentSubscription(e);
      }

GInfo.prototype._updateSaveInfo = function () {}

GInfo.prototype._updateDocumentSubscription = function () {}

GInfo.prototype._updateInfo = function (e) {
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
      }

GInfo.prototype.toString = function () {
        return "[Object GInfo]";
      }

module.exports = GInfo;
