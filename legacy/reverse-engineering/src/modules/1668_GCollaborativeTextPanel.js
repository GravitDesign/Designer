/**
 * Webpack Module #1668
 * Type: class
 * Name: GCollaborativeTextPanel
 */

function (e, t, n) {
    "use strict";
    n(8), n(196), n(20), n(3), n(34);
    var o = n(1);
    const i = n(606),
      a = n(394),
      r = n(392),
      s = n(393),
      l = n(78),
      c = n(291),
      d = n(1346),
      u = n(1348),
      p = n(44),
      g = n(177),
      { DateAPI: h, ShareRoles: f } = n(10);
    function m() {}
    o.GObject.inherit(m, i),
      (m.ID = "collaborative-text-panel"),
      (m.prototype._htmlElement = null),
      (m.prototype._requestLockDialog = null),
      (m.prototype._lastRequestLockTime = 0),
      (m.prototype._isModified = !1),
      (m.prototype._applicationStateChangedEvent = function (e) {
        e.document === this._document && this._update();
      }),
      (m.prototype._documentEvent = function (e) {
        if (!e.document.isLockedByVersionHistory())
          switch (e.type) {
            case l.Type.Activated:
              this._deactivate(),
                (this._document = e.document),
                this._document.addEventListener(
                  u.StatusChangedEvent,
                  this._update,
                  this
                ),
                this._document.addEventListener(
                  u.LockUpdateEvent,
                  this._update,
                  this
                ),
                this._document.addEventListener(
                  s,
                  this._collaborationEvent,
                  this
                ),
                gDesigner.addEventListener(
                  c,
                  this._networkAvailabilityChangedEvent,
                  this
                ),
                this._update();
              break;
            case l.Type.Deactivated:
              e.document === this._document &&
                (this._deactivate(), this._htmlElement.css("display", "none"));
              break;
            case l.Type.Modified:
              if (!this.isEnabled()) return;
              if (
                e.document === this._document &&
                this._document.isCollaborativeTextEditing()
              ) {
                const e = this._document.isModified();
                this._isModified !== e &&
                  ((this._isModified = e), this._update());
              }
          }
      }),
      (m.prototype._deactivate = function () {
        this._document &&
          (this._document.removeEventListener(
            u.StatusChangedEvent,
            this._update,
            this
          ),
          this._document.removeEventListener(
            u.LockUpdateEvent,
            this._update,
            this
          ),
          this._document.removeEventListener(s, this._collaborationEvent, this),
          gDesigner.removeEventListener(
            c,
            this._networkAvailabilityChangedEvent,
            this
          ));
      }),
      (m.prototype._collaborationEvent = function (e) {
        e.type === s.Type.LockRequest &&
          this._requestLock(e.data.from && e.data.from.name);
      }),
      (m.prototype._networkAvailabilityChangedEvent = function (e) {
        this._htmlElement.toggleClass("offline", !e.connected);
      }),
      (m.prototype._update = async function () {
        if (
          (this._htmlElement.css("display", this.isEnabled() ? "" : "none"),
          this.isEnabled())
        ) {
          const e = this._document.getCollaborativeTextController();
          if (e)
            if (e.getStatus() === u.Status.UpdateAvailable)
              this._document.lock(), this._showUpdatePanel();
            else if (e.getStatus() === u.Status.Updating)
              this._showUpdatingPanel();
            else if (gDesigner.getApplicationManager().hasRole(f.Owner))
              this._showOwnerPanel();
            else if (await e.canLock())
              switch (e.getStatus()) {
                case u.Status.Initial:
                case u.Status.Editing:
                  this._showEditPanel();
                  break;
                case u.Status.Finished:
                case u.Status.Previewed:
                  this._showFinishedPanel();
                  break;
                case u.Status.Previewing:
                  this._showPreviewPanel();
                  break;
                case u.Status.Sending:
                  this._showSendingPanel();
              }
            else this._showRequestPanel();
        }
        this.trigger(a.UPDATE_EVENT);
      }),
      (m.prototype._showOwnerPanel = function () {
        this._htmlElement.empty().append(
          $("<div/>")
            .addClass("container")
            .addClass("owner-panel")
            .append(
              $("<span/>")
                .addClass("message")
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GCollaborativeTextPanel",
                      "text.owner-message"
                    )
                  )
                )
            )
        );
      }),
      (m.prototype._showUpdatePanel = function () {
        this._htmlElement.empty().append(
          $("<div/>")
            .addClass("container")
            .addClass("update-panel")
            .append(
              $("<span/>")
                .addClass("message")
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GCollaborativeTextPanel",
                      "text.update-available-message"
                    )
                  )
                )
            )
            .append(
              $("<div/>")
                .addClass("buttons")
                .append(
                  $("<button/>")
                    .addClass("g-highlight-button")
                    .addClass("highlighted")
                    .addClass("online-action")
                    .text(
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GCollaborativeTextPanel",
                          "text.update-now"
                        )
                      )
                    )
                    .on("click", () => {
                      gDesigner.stats("collabtextpanel_bottom-bar_file-update"),
                        this._document
                          .getCollaborativeTextController()
                          .reloadDocument();
                    })
                )
            )
        );
      }),
      (m.prototype._showUpdatingPanel = function () {
        this._htmlElement.empty().append(
          $("<div/>")
            .addClass("container")
            .addClass("updating-panel")
            .append($("<div>").addClass("g-loading"))
            .append(
              $("<span/>")
                .addClass("message")
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey("GCollaborativeTextPanel", "text.updating")
                  )
                )
            )
        );
      }),
      (m.prototype._showEditPanel = function () {
        this._htmlElement.empty().append(
          $("<div/>")
            .addClass("container")
            .addClass("edit-panel")
            .append(
              $("<span/>")
                .addClass("message")
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GCollaborativeTextPanel",
                      "text.finish-editing-message"
                    )
                  )
                )
            )
            .append(
              $("<button/>")
                .addClass("g-highlight-button")
                .addClass("highlighted")
                .addClass("online-action")
                .prop("disabled", !this._document.isModified())
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GCollaborativeTextPanel",
                      "text.finish-editing"
                    )
                  )
                )
                .on("click", () => {
                  gDesigner.stats("collabtextpanel_bottom-bar_finish-editing"),
                    this._document
                      .getCollaborativeTextController()
                      .finishTextEditing();
                })
            )
        );
      }),
      (m.prototype._showFinishedPanel = function () {
        this._htmlElement.empty().append(
          $("<div/>")
            .addClass("container")
            .addClass("finish-panel")
            .append(
              $("<button/>")
                .prop(
                  "disabled",
                  this._document
                    .getCollaborativeTextController()
                    .getStatus() === u.Status.Previewed
                )
                .addClass("g-highlight-button")
                .addClass("outlined")
                .addClass("online-action")
                .append(
                  $("<span/>")
                    .addClass("icon")
                    .addClass("gravit-icon-co-text-editing-display")
                )
                .append(
                  $("<span/>").text(
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GCollaborativeTextPanel",
                        "text.preview-changes"
                      )
                    )
                  )
                )
                .on("click", () => {
                  gDesigner.stats("collabtextpanel_bottom-bar_preview-changes"),
                    this._document
                      .getCollaborativeTextController()
                      .previewChanges();
                })
            )
            .append(
              $("<span/>")
                .addClass("message")
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GCollaborativeTextPanel",
                      "text.send-changes-message"
                    )
                  )
                )
            )
            .append(
              $("<div/>")
                .addClass("buttons")
                .append(
                  $("<button/>")
                    .addClass("g-highlight-button")
                    .addClass("secondary")
                    .text(
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GCollaborativeTextPanel",
                          "text.back-to-editing"
                        )
                      )
                    )
                    .on("click", () => {
                      gDesigner.stats(
                        "collabtextpanel_bottom-bar_back-to-editing"
                      ),
                        this._document
                          .getCollaborativeTextController()
                          .backToTextEditing();
                    })
                )
                .append(
                  $("<button/>")
                    .addClass("g-highlight-button")
                    .addClass("highlighted")
                    .addClass("online-action")
                    .text(
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GCollaborativeTextPanel",
                          "text.send-changes"
                        )
                      )
                    )
                    .on("click", () => {
                      gDesigner.stats(
                        "collabtextpanel_bottom-bar_send-changes"
                      ),
                        p.confirm(
                          o.GLocale.get(
                            new o.GLocaleKey(
                              "GCollaborativeTextPanel",
                              "text.send-to-owner"
                            )
                          ),
                          (e) => {
                            e &&
                              this._document
                                .getCollaborativeTextController()
                                .sendChanges()
                                .then(() => {
                                  p.alert(
                                    o.GLocale.get(
                                      new o.GLocaleKey(
                                        "GCollaborativeTextPanel",
                                        "text.your-changes-were-applied"
                                      )
                                    )
                                  );
                                })
                                .catch(() => {
                                  p.alert(
                                    o.GLocale.get(
                                      new o.GLocaleKey(
                                        "GCollaborativeTextPanel",
                                        "text.send-changes-failed"
                                      )
                                    )
                                  );
                                });
                          }
                        );
                    })
                )
            )
        );
      }),
      (m.prototype._showPreviewPanel = function () {
        this._htmlElement.empty().append(
          $("<div/>")
            .addClass("container")
            .addClass("preview-panel")
            .append($("<div>").addClass("g-loading"))
            .append(
              $("<span/>")
                .addClass("message")
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GCollaborativeTextPanel",
                      "text.rendering-preview"
                    )
                  )
                )
            )
        );
      }),
      (m.prototype._showSendingPanel = function () {
        this._htmlElement.empty().append(
          $("<div/>")
            .addClass("container")
            .addClass("sending-panel")
            .append($("<div>").addClass("g-loading"))
            .append(
              $("<span/>")
                .addClass("message")
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GCollaborativeTextPanel",
                      "text.sending-changes"
                    )
                  )
                )
            )
        );
      }),
      (m.prototype._showRequestPanel = async function () {
        const e = await this._document
          .getCollaborativeTextController()
          .getCurrentLock();
        if (!e)
          return this._document
            .getCollaborativeTextController()
            .resetTextEditing();
        const t = new g(e.user);
        this._htmlElement.empty().append(
          $("<div/>")
            .addClass("container")
            .addClass("request-access-panel")
            .append(
              $("<span/>")
                .addClass("message")
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GCollaborativeTextPanel",
                      "text.request-access-message"
                    )
                  ).replace("%name", t.getFullUserName())
                )
            )
            .append(
              $("<button/>")
                .addClass("g-highlight-button")
                .addClass("highlighted")
                .addClass("online-action")
                .prop(
                  "disabled",
                  this._document
                    .getCollaborativeTextController()
                    .hasAlreadyRequestedAccess()
                )
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GCollaborativeTextPanel",
                      "text.request-access"
                    )
                  )
                )
                .on("click", (e) => {
                  gDesigner.stats("collabtextpanel_bottom-bar_request-access"),
                    gDesigner.toggleLoading(!0),
                    this._document
                      .getCollaborativeTextController()
                      .requestAccess()
                      .then(() => {
                        $(e.target).closest("button").attr("disabled", !0),
                          p.alert(
                            o.GLocale.get(
                              new o.GLocaleKey(
                                "GCollaborativeTextPanel",
                                "text.request-has-been-sent"
                              )
                            ).replace("%name", t.getFullUserName())
                          );
                      })
                      .catch((e) => {
                        e.status &&
                          e.status !== gApi.HTTP_STATUS_CODES.NOT_FOUND &&
                          p.error(e);
                      })
                      .finally(() => {
                        this._update(), gDesigner.toggleLoading(!1);
                      });
                })
            )
        );
      }),
      (m.prototype._requestLock = function (e) {
        if (!this.isEnabled()) return;
        if (this._requestLockDialog) return;
        const t = h.now(),
          n = h.minutesToMilliseconds(5);
        (this._lastRequestLockTime && t - this._lastRequestLockTime < n) ||
          ((this._lastRequestLockTime = t),
          (this._requestLockDialog = p.custom({
            className: "g-request-lock-dialog",
            closeCallback: () => (this._requestLockDialog = null),
            closeable: !1,
            subtitle: o.GLocale.get(
              new o.GLocaleKey(
                "GCollaborativeTextPanel",
                "text.wants-to-take-over"
              )
            ).replace(
              /%name/g,
              e ||
                o.GLocale.get(
                  new o.GLocaleKey("GCommonNames", "text.unknown-user")
                )
            ),
            buttons: [
              {
                label: o.GLocale.get(
                  new o.GLocaleKey(
                    "GCollaborativeTextPanel",
                    "text.save-my-edits-and-allow"
                  )
                ),
                onclick: (e) => {
                  e.gDialog("close"),
                    this._document
                      .getCollaborativeTextController()
                      .sendChanges()
                      .catch(() => {
                        p.alert(
                          o.GLocale.get(
                            new o.GLocaleKey(
                              "GCollaborativeTextPanel",
                              "text.send-changes-failed"
                            )
                          )
                        );
                      });
                },
              },
              {
                label: o.GLocale.get(
                  new o.GLocaleKey(
                    "GCollaborativeTextPanel",
                    "text.discard-my-edits-and-allow"
                  )
                ),
                onclick: (e) => {
                  e.addClass("g-loading"),
                    this._document
                      .getCollaborativeTextController()
                      .releaseLock()
                      .catch((e) => {
                        p.error(e);
                      })
                      .finally(() => {
                        e.gDialog("close");
                      });
                },
              },
              {
                label: o.GLocale.get(
                  new o.GLocaleKey("GCollaborativeTextPanel", "text.decline")
                ),
                highlighted: !0,
                onclick: (e) => {
                  e.gDialog("close");
                },
              },
            ],
          })));
      }),
      (m.prototype.init = function (e) {
        (this._htmlElement = e),
          this._htmlElement
            .addClass("g-collaborative-text-panel")
            .css("display", "none"),
          gDesigner.addEventListener(l, this._documentEvent, this),
          gDesigner.addEventListener(d, this._unloadEvent, this),
          gDesigner.addEventListener(
            r,
            this._applicationStateChangedEvent,
            this
          );
      }),
      (m.prototype._unloadEvent = function (e) {
        if (this._document)
          try {
            gApi.lock.releaseSync(this._document.getId());
          } catch (e) {}
      }),
      (m.prototype.isEnabled = function () {
        return !!this._document && this._document.isCollaborativeTextEditing();
      }),
      (m.prototype.toString = function () {
        return "[Object GCollaborativeTextPanel]";
      }),
      (m.prototype.getId = function () {
        return m.ID;
      }),
      (e.exports = m);
  }