/**
 * Webpack Module #1508
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8), n(196), n(20), n(3), n(34), n(91), n(4), n(13), n(38);
    var o = n(10),
      i = n(1);
    const { bypassEmailVerification: a } = o.defaultUserSettings,
      r = n(44),
      s = function (e) {
        return e.json().then(function (t) {
          return Promise[e.status >= 400 ? "reject" : "resolve"](t);
        });
      };
    function l(e, t, n) {
      let o =
        arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {};
      (this._user = e),
        (this._messageHandler = t),
        (this._parent = n),
        (this._options = o),
        this._init();
    }
    i.GObject.inherit(l, i.GObject),
      (l.prototype._openAccountDeletionConfirmationDialog = function () {
        let e = "<span>"
          .concat(
            i.GLocale.get(
              new i.GLocaleKey("GAccountPanel", "text.delete-account-title")
            ),
            '</span>\n    <mark style="min-width: 100px;\n        background: #F23C3C;\n        border-radius: 3px;\n        padding: 3px 30px;\n        color: white;\n        margin-top: 2px;\n        margin-bottom: 2px;\n        display: block;\n        text-align: center;">\n        '
          )
          .concat(
            i.GLocale.get(
              new i.GLocaleKey("GAccountPanel", "text.delete-account-sub-title")
            ),
            '\n    </mark>\n    <ul style="list-style-type: disc; transform: translateX(30px); margin-bottom: 10px;">\n        <li>'
          )
          .concat(
            i.GLocale.get(
              new i.GLocaleKey("GAccountPanel", "text.delete-account-list-1")
            ),
            "</li>\n        <li>"
          )
          .concat(
            i.GLocale.get(
              new i.GLocaleKey("GAccountPanel", "text.delete-account-list-2")
            ),
            "</li>\n        <li>"
          )
          .concat(
            i.GLocale.get(
              new i.GLocaleKey("GAccountPanel", "text.delete-account-list-3")
            ),
            "</li>\n    </ul>\n    <span>"
          )
          .concat(
            i.GLocale.get(
              new i.GLocaleKey(
                "GAccountPanel",
                "text.delete-account-action-cant-undone"
              )
            ),
            "</span>"
          );
        r.custom({
          title: e,
          styles: { buttons: { "justify-content": "flex-end" } },
          buttons: [
            {
              label: i.GLocale.get(new i.GLocaleKey("GLocale", "cancel")),
              closeOnClick: !0,
            },
            {
              label: i.GLocale.get(new i.GLocaleKey("GLocale", "ok")),
              highlighted: !0,
              onclick: (e) => {
                e.gDialog("close"), this._deleteAccount();
              },
            },
          ],
        });
      }),
      (l.prototype._deleteAccount = function () {
        return (
          this._toggleLoading(!0),
          fetch(o.gApi.url + "/user/" + this._user.id, {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json", Accept: "json" },
          })
            .then(s)
            .then(() => {
              this._parent.close(),
                gDesigner.stats("profile-dialog_account-panel_delete"),
                gDesigner.signout(!0);
            })
            .catch((e) => {
              this._messageHandler(
                (e && e.message) || (e && e.errors.toString()) || ""
              );
            })
            .finally(() => {
              this._toggleLoading(!1);
            })
        );
      }),
      (l.prototype._getFooter = function () {
        const e = $("<footer></footer>").append(
          $("<div></div>")
            .addClass("buttons")
            .append(
              $("<button></button>")
                .addClass("highlight")
                .attr("type", "submit")
                .text(
                  i.GLocale.get(new i.GLocaleKey("GAccountPanel", "text.save"))
                )
            )
            .append(
              $("<button></button>")
                .attr("type", "button")
                .attr("data-property", "delete-account")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey("GAccountPanel", "text.delete")
                  )
                )
                .on(
                  "click",
                  (e) => (
                    e.preventDefault(),
                    this._openAccountDeletionConfirmationDialog(),
                    !1
                  )
                )
            )
        );
        return (
          o.gApi.hasPurchases({ issued: !0 }).then((t) => {
            t &&
              $("<div/>")
                .addClass("info")
                .append(
                  $(
                    "<span>"
                      .concat(
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GAccountPanel",
                            "text.contact-partner-billing-alternative"
                          )
                        ),
                        "</span>"
                      )
                      .replace(
                        "%partner%",
                        $("<a/>")
                          .addClass("cb-link")
                          .text(
                            i.GLocale.get(
                              new i.GLocaleKey(
                                "GAccountPanel",
                                "text.contact-partner-cleverbridge"
                              )
                            )
                          )
                          .prop("outerHTML")
                      )
                  )
                )
                .appendTo(e),
              this._container.find(".cb-link").on("click", (e) => {
                gDesigner.stats(
                  "profile-dialog_account-panel_cleverbridge-link"
                ),
                  gContainer.openExternalLink(
                    e,
                    o.LINKS.CLEVERBRIDGE_SUPPORT_URL
                  );
              });
          }),
          e
        );
      }),
      (l.prototype._init = function () {
        this._container = $("<div></div>").addClass("g-account-panel");
        const e = $("<form></form>")
            .appendTo(this._container)
            .on(
              "submit",
              (e) => (
                e.preventDefault(),
                gDesigner.stats("profile-dialog_account-panel_save"),
                this._updateUser(),
                !1
              )
            ),
          t = $("<div></div>")
            .addClass("section")
            .append(
              $("<div></div>")
                .addClass("header")
                .append(
                  $("<span></span>").text(
                    i.GLocale.get(
                      new i.GLocaleKey("GAccountPanel", "text.contact")
                    )
                  )
                )
            )
            .appendTo(e),
          n = this._getFooter();
        n && n.appendTo(e);
        const a = (e, t, n, o, i) => {
            const a = $("<input>")
                .attr("type", o || "text")
                .attr("placeholder", i || "")
                .attr("value", t || ""),
              s = r(e, n, a);
            return (
              "password" === o &&
                s.append(
                  $("<span></span>")
                    .addClass("gravit-icon-hide btn-display")
                    .on("click", (e) => {
                      const t = $(e.target)
                          .closest(".btn-display")
                          .toggleClass("gravit-icon-hide gravit-icon-display"),
                        n = !t.data("visible");
                      t.data("visible", n),
                        s.find("input").attr("type", n ? "text" : "password");
                    })
                ),
              s
            );
          },
          r = (e, t, n) =>
            $("<div></div>")
              .addClass("input-field")
              .attr("data-property", t)
              .append($("<label></label>").text(e))
              .append(n);
        let s = this._user.getFirstName(),
          l = this._user.getLastName();
        if (!l) {
          let { first: e, last: t } = ((e) => {
            let t = (e || "").split(" "),
              n = t.slice(0, t.length - 1).join(" "),
              o = t.slice(-1).join("");
            return (
              n.trim().length || ((n = o), (o = "")), { first: n, last: o }
            );
          })(s);
          (s = e), (l = t || "");
        }
        let c = $("<div></div>").addClass("group-section").appendTo(t);
        a(
          i.GLocale.get(new i.GLocaleKey("GAccountPanel", "text.first-name")),
          s,
          "name"
        )
          .appendTo(c)
          .find("input")
          .attr("required", !0),
          a(
            i.GLocale.get(new i.GLocaleKey("GAccountPanel", "text.last-name")),
            l,
            "last_name"
          )
            .appendTo(c)
            .find("input")
            .attr("required", !0),
          a(
            i.GLocale.get(new i.GLocaleKey("GAccountPanel", "text.email")),
            this._user.getEmail(),
            "email"
          ).appendTo(t),
          a(
            i.GLocale.get(
              new i.GLocaleKey("GAccountPanel", "text.old-password")
            ),
            "",
            "old_password",
            "password"
          ).appendTo(t),
          a(
            i.GLocale.get(
              new i.GLocaleKey("GAccountPanel", "text.new-password")
            ),
            "",
            "new_password",
            "password",
            i.GLocale.get(
              new i.GLocaleKey("GPurchasePanel", "text.placeholder-password")
            )
              .replace("%min-number", o.PasswordRules.PasswordLength.Minimum)
              .replace("%max-number", o.PasswordRules.PasswordLength.Maximum)
          ).appendTo(t);
      }),
      (l.prototype._updateUser = async function () {
        this._toggleLoading(!0);
        const e = (e) => {
          let t = i.GLocale.get(
            new i.GLocaleKey("GAccountPanel", "text.error")
          );
          e && e.message
            ? (t = e.message)
            : e && e.errors && (t = e.errors.map((e) => e[1]).join("<br>")),
            this._messageHandler(t),
            this._toggleLoading(!1);
        };
        let t = { webUrl: gDesigner.getWebURL() },
          n = this;
        this._container.find(".input-field > input").each(function () {
          let e = $(this),
            o = e.closest(".input-field").attr("data-property");
          (("login" !== o && "email" !== o) || n._user[o] !== e.val().trim()) &&
            (t[o] = e.val());
        }),
          this._container.find(".input-field > select").each(function () {
            let e = $(this),
              n = e.closest(".input-field").attr("data-property"),
              o = e.find("option:selected").attr("value");
            t[n] = o;
          }),
          this._messageHandler(void 0);
        try {
          await gDesigner
            .getCloudCommunicationManager()
            .updateUser(t)
            .then(() =>
              this._messageHandler(
                i.GLocale.get(
                  new i.GLocaleKey("GAccountPanel", "text.success")
                ),
                "success"
              )
            )
            .then(() => {
              t.email &&
                this._user.getEmail() !== t.email &&
                !a &&
                r.alert(
                  i.GLocale.get(
                    new i.GLocaleKey("GAccountPanel", "text.user-email-message")
                  ).replace("%email", t.email)
                );
            })
            .then(async () => (this._user = await gDesigner.getUser()))
            .catch(e);
        } finally {
          this._toggleLoading(!1);
        }
      }),
      (l.prototype.getHTMLElement = function () {
        return this._container;
      }),
      (l.prototype._toggleLoading = function (e) {
        e
          ? this._container.addClass("g-loading")
          : this._container.removeClass("g-loading");
      }),
      (e.exports = l);
  }