/**
 * Webpack Module #1666
 * Type: class
 * Name: GNotificationPanel
 */

function (e, t, n) {
    "use strict";
    n(8), n(20), n(3), n(34), n(4), n(13);
    var o = n(1);
    const {
        DESIGNER: { TITLE: i },
      } = n(10),
      a = n(606),
      r = n(394),
      s = n(1321),
      l = n(78),
      c = n(860),
      d = n(1667);
    function u() {}
    o.GObject.inherit(u, a),
      (u.ID = "notification-panel"),
      (u.prototype._htmlElement = null),
      (u.prototype._lastNotification = null),
      (u.prototype._closeCallback = null),
      (u.prototype.init = function (e) {
        (this._htmlElement = e),
          this._htmlElement
            .addClass("g-hide")
            .addClass("g-notification-panel")
            .on("click", function () {
              $(this).toggleClass("bring-to-front", !0),
                gDesigner.sendSideBarAndAssistBarToBack();
            }),
          $("<div></div>")
            .addClass("g-btn-close")
            .append($("<span></span>").addClass("gravit-icon-close"))
            .on("click", () => {
              this._close(!0);
            })
            .appendTo(this._htmlElement),
          gDesigner.addEventListener(s, this._notificationEvent, this),
          gDesigner.addEventListener(l, this._documentEvent, this);
      }),
      (u.prototype.isEnabled = function () {
        return !this._htmlElement.hasClass("g-hide");
      }),
      (u.prototype._documentEvent = function (e) {
        if (
          !e.document.isLockedByVersionHistory() &&
          this._lastNotification &&
          this._lastNotification.document
        )
          switch (e.type) {
            case l.Type.Activated: {
              let t = e.document !== this._lastNotification.document;
              this._htmlElement.toggleClass("g-hide", t),
                this._htmlElement.toggleClass("bring-to-front", t),
                t && gDesigner.sendSideBarAndAssistBarToBack();
              break;
            }
            case l.Type.Removed:
              e.document === this._lastNotification.document && this._close();
          }
      }),
      (u.prototype._notificationEvent = async function (e) {
        if (
          ((this._lastNotification = e.notification),
          (this._closeCallback = e.notification.closeCallback),
          this._htmlElement.removeClass("g-hide"),
          this._htmlElement.toggleClass("bring-to-front", !0),
          gDesigner.sendSideBarAndAssistBarToBack(),
          this._htmlElement.toggleClass(
            "popup",
            !!e.notification.popup && !e.notification.anonymous
          ),
          e.notification.anonymous)
        ) {
          const t = gDesigner.getActiveDocument(),
            n = t && t.isDocumentFromTemplate() && t.isShared(),
            a = (e) => {
              e &&
                !e.isAnonymous() &&
                ((this._lastNotification = null),
                this._htmlElement.addClass("g-hide"));
            };
          let r = n
            ? o.GLocale.get(
                new o.GLocaleKey(
                  "GNotificationPanel",
                  "text.create-account-template"
                )
              )
            : o.GLocale.get(
                new o.GLocaleKey("GNotificationPanel", "text.create-account")
              );
          const s = $("<div/>")
            .addClass("anonymous")
            .append($("<div/>").addClass("logo"))
            .append(
              $("<div/>")
                .addClass("content")
                .append(
                  $("<span/>")
                    .addClass("title")
                    .text(
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GNotificationPanel",
                          "text.title-welcome"
                        )
                      ).replace("%app", i)
                    )
                )
                .append(
                  $("<span/>")
                    .text(e.notification.message)
                    .css("display", e.notification.message && !n ? "" : "none")
                )
                .append(
                  $("<span/>").html(
                    r
                      .replace("%signup", () =>
                        $("<span/>")
                          .attr("id", "signup-link")
                          .addClass("link")
                          .text(
                            o.GLocale.get(
                              new o.GLocaleKey(
                                "GNotificationPanel",
                                "text.sign-up"
                              )
                            )
                          )
                          .prop("outerHTML")
                      )
                      .replace("%signin", () =>
                        $("<span/>")
                          .attr("id", "signin-link")
                          .addClass("link")
                          .text(
                            o.GLocale.get(
                              new o.GLocaleKey(
                                "GNotificationPanel",
                                "text.sign-in"
                              )
                            )
                          )
                          .prop("outerHTML")
                      )
                  )
                )
                .append(
                  $("<span/>")
                    .addClass("footer")
                    .html(
                      o.GLocale.get(
                        new o.GLocaleKey("GNotificationPanel", "text.footer")
                      ).replace("%app", () =>
                        $("<span/>")
                          .attr("id", "learnmore-link")
                          .addClass("link")
                          .text(i)
                          .prop("outerHTML")
                      )
                    )
                )
            );
          s.find("#signup-link").on("click", () => {
            gDesigner.stats("open-shared_click_create-account"),
              new c(a).open({ anonymous: !0, signup: !0, animate: !0 });
          }),
            s.find("#signin-link").on("click", () => {
              gDesigner.stats("open-shared_click_login"),
                new c(a).open({ anonymous: !0, animate: !0 });
            }),
            s.find('#learnmore-link').on('click', (e) => {
              gDesigner.stats('open-shared_click_learn-more'),
                gContainer.openExternalLink(
                  e,
                  window.location.origin
                );
            }),
            this._updateContent(s);
        } else if (e.notification.custom) {
          if (
            ((this._closeCallback = e.notification.closeCallback),
            this._htmlElement.addClass([
              e.notification.class,
              e.notification.enter,
            ]),
            this._updateContent(e.notification.content),
            e.notification.timeout)
          ) {
            let t = this;
            new Promise(function (n) {
              setTimeout(function () {
                t._htmlElement.removeClass(e.notification.enter),
                  t._htmlElement.addClass(e.notification.exit),
                  n(!0);
              }, e.notification.timeout);
            }).then(function () {
              setTimeout(function () {
                t._htmlElement.removeClass(e.notification.exit), t._close(!1);
              }, 600);
            });
          }
        } else
          e.builder instanceof d
            ? (e.builder.addEventListener(d.Event, (e) => {
                e.type === d.Event.Type.Close && this._close();
              }),
              this._updateContent(
                $("<div></div>")
                  .addClass("message")
                  .append(await e.builder.build())
              ))
            : this._updateContent(
                $("<div></div>")
                  .addClass("message")
                  .append(e.notification.message)
              );
        this.trigger(r.UPDATE_EVENT);
      }),
      (u.prototype._updateContent = function (e) {
        this._htmlElement.find(".content").remove(),
          this._htmlElement.append(
            $("<div></div>").addClass("content").append(e)
          );
      }),
      (u.prototype._close = function (e) {
        (this._lastNotification = null),
          this._htmlElement.addClass("g-hide"),
          this._closeCallback && e && this._closeCallback(),
          this.trigger(r.UPDATE_EVENT);
      }),
      (u.prototype.toString = function () {
        return "[Object GNotificationPanel]";
      }),
      (u.prototype.getId = function () {
        return u.ID;
      }),
      (e.exports = u);
  }