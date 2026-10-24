/**
 * Webpack Module #1567
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(58),
      n(19),
      n(30),
      n(8),
      n(196),
      n(20),
      n(3),
      n(71),
      n(34),
      n(91),
      n(4),
      n(41),
      n(13),
      n(38),
      n(26),
      n(125),
      n(126),
      n(114);
    var o = n(1),
      i = n(15);
    const {
        FileExtended: a,
        gApi: r,
        trunkURL: s,
        betaURL: l,
        ltsURL: c,
        rcURL: d,
        prodURL: u,
        DateAPI: p,
        ShareRoles: g,
        Share: h,
        REMOVE_GUEST_USER_WHEN_ROLE_IS_NO_ACCESS: f,
        ENABLE_GUEST_ACCESS: m,
        defaultUserSettings: {
          share: {
            defaults: { private: { pro: y = !0 } = {} } = {},
            quotas: { free: { private: v = 0 } = {} } = {},
          } = {},
        } = {},
      } = n(10),
      { IS_TRUNK: _, IS_BETA: b, IS_RC: w, IS_LTS: C } = n(231),
      { sleep: x } = n(40),
      S = n(177),
      E = n(44),
      A = n(85),
      T = n(388),
      G = n(433),
      P = n(257),
      D = n(436),
      L = n(336);
    class I {
      constructor(e, t, n) {
        (this._user = e),
          (this._sharedFile = new a()),
          (this._initialSharedFile = null),
          (this._statistics = null),
          (this._storageItem = t),
          (this._closeCallback = n);
      }
      _initialize() {
        if (!this._isInitialized)
          return (
            this._initLayout(),
            this._toggleLoading(!0),
            this._loadShare()
              .then(() => this._loadShareInit())
              .then(() => this._updateProperties())
              .then(() => {
                this._isInitialized = !0;
              })
              .catch((e) => this._handleException(e))
              .finally(() => this._toggleLoading(!1))
          );
      }
      async _loadShareInit() {
        if (!this._sharedFile.getPublicShare()) {
          const t = G.ROLES.DEFAULT_PUBLIC_ROLE;
          if (t) {
            const n = new h().assignRole(t);
            return this._storageItem.supportsExternalSharing()
              ? this._storageItem
                  .requestExternalShare(null, n)
                  .then(() => e.call(this, n))
                  .catch((e) => this._handleException(e))
              : e.call(this, n);
          }
        }
        function e(e) {
          return r
            .createShare(this._storageItem.getId(), e)
            .then(
              () => (
                gDesigner.hasEventListeners(L) &&
                  gDesigner.trigger(
                    new L(L.Type.ShareCreated, this._storageItem)
                  ),
                this._loadShare()
              )
            );
        }
      }
      _initLayout() {
        (this._infoSection = $("<div/>")
          .addClass("share-info-section")
          .css("display", "none")
          .append($("<span/>").addClass("gravit-icon-info"))
          .append(
            $("<span/>").text(
              o.GLocale.get(
                new o.GLocaleKey(
                  "GShareDialog",
                  "text.participants-will-be-invited"
                )
              )
            )
          )),
          (this._dialog = $("<div/>")
            .append(
              $("<div/>")
                .addClass("header")
                .append(
                  $("<span/>")
                    .addClass("title")
                    .text(
                      o.GLocale.get(
                        new o.GLocaleKey("GShareDialog", "text.title")
                      )
                    )
                )
            )
            .append(
              $("<div/>")
                .addClass("share-link")
                .append(
                  $("<div/>")
                    .addClass("share-input")
                    .append(
                      $("<input>").attr("type", "text").attr("readonly", !0)
                    )
                    .append(
                      $("<div/>")
                        .addClass("share-copied")
                        .append(
                          $("<span/>").text(
                            o.GLocale.get(
                              new o.GLocaleKey("GShareDialog", "text.copied")
                            )
                          )
                        )
                    )
                )
                .append(
                  $("<div/>")
                    .addClass("share-copy")
                    .addClass("g-highlight-button")
                    .addClass("highlighted")
                    .append(
                      $("<span/>")
                        .addClass("icon")
                        .addClass(P["gravit-icon-share-copy"])
                    )
                    .append(
                      $("<span/>").text(
                        o.GLocale.get(
                          new o.GLocaleKey("GShareDialog", "text.copy")
                        )
                      )
                    )
                    .on("click", async (e) => {
                      const t = $(e.target).closest(".share-link"),
                        n = t.find("input").val();
                      if (n && n.trim().length)
                        return (
                          gDesigner.stats("sharedialog_click_copy"),
                          gContainer
                            .copyToClipboard(n.trim())
                            .then(async () => {
                              const e = t.find(".share-copied");
                              e.addClass("visible"),
                                await x(2e3),
                                e.removeClass("visible");
                            })
                            .catch((e) => {
                              E.alert(
                                (e && e.message) ||
                                  o.GLocale.get(
                                    new o.GLocaleKey(
                                      "GShareDialog",
                                      "text.failed-copying-to-clipboard"
                                    )
                                  )
                              );
                            })
                        );
                    })
                )
                .append(this._buildNativeShareButton())
            )
            .append(this._buildShareByLink())
            .append(this._buildShareByUser())
            .append(this._infoSection)
            .gDialog({
              releaseOnClose: !0,
              className: "g-share-dialog",
              closeCallback: () => {
                this._sendInvitationEmails(),
                  this._closeCallback && this._closeCallback();
              },
            })),
          $("<div/>")
            .addClass("g-btn-close")
            .append($("<span />").addClass("gravit-icon-close"))
            .on("click", () => this.close())
            .appendTo($(this._dialog).parent());
      }
      _buildNativeShareButton() {
        if (!gContainer.isNativeShareLinkSupported()) return null;
        const e = $("<div/>")
          .addClass("share-native")
          .addClass("g-highlight-button")
          .addClass("highlighted")
          .append(
            $("<span/>")
              .addClass("icon")
              .addClass("gravit-icon-share-link-native")
          );
        return (
          e.on("click", (e) => {
            gDesigner.stats("sharedialog_click_native-sharing");
            const t = this._dialog.find(".share-link").find("input").val();
            if (t && t.trim().length) {
              const e = this._user.getFullUserName(),
                n = this._sharedFile.name,
                i = o.GLocale.get(
                  new o.GLocaleKey(
                    "GShareDialog",
                    "text.native-link-share-title"
                  )
                ).replace("%filename", n),
                a = o.GLocale.get(
                  new o.GLocaleKey(
                    "GShareDialog",
                    "text.native-link-share-description"
                  )
                ).replace("%username", e);
              gContainer
                .nativeShareLink(i, a, t)
                .catch((e) => console.error(e));
            }
          }),
          e
        );
      }
      _getRole(e) {
        return G.makeFromShare(e);
      }
      _loadShare() {
        if (!this._storageItem.hasMixin(D))
          throw (
            (console.log("Storage item not supported"), "Storage not supported")
          );
        return this._storageItem
          .getOrCreateCollaborativeFile()
          .then((e) => {
            (this._sharedFile = e),
              this._initialSharedFile ||
                (this._initialSharedFile = this._sharedFile.clone());
          })
          .then(async () => {
            this._statistics = await r.getSharingStatistics();
          });
      }
      _setSelectedPrivateShare(e) {
        if (
          (this._dialog
            .find(
              ".share-by-user > .share-settings > .share-setting.g-selected"
            )
            .removeClass("g-selected"),
          e)
        ) {
          const t = this._dialog
            .find(
              '.share-by-user > .share-settings > .share-setting[user_id="'.concat(
                e,
                '"]'
              )
            )
            .addClass("g-selected")[0];
          t && t.scrollIntoView({ behavior: "smooth" });
        }
      }
      _handleException(e) {
        console.error(e.stack ? e.stack : e),
          E.alert(r.formatError(e)),
          this._toggleLoading(!1);
      }
      _getPrivateAndInvitedShareList() {
        const e = this._sharedFile
            .getPrivateShareList()
            .filter((e) => !e.owner || e.id !== this._user.getUID()),
          t =
            (this._sharedFile.getInvitedShareList &&
              this._sharedFile.getInvitedShareList()) ||
            [];
        return e.concat(t);
      }
      _getShareListLayout(e) {
        return o.GUtil.bubbleSort(e, (e, t) => {
          let { created: n } = e,
            { created: o } = t;
          return p.gt(n, o, !1) ? 1 : p.lt(n, o, !1) ? -1 : 0;
        }).map((e) => {
          const t = new S(e),
            n = t.getUID(),
            i = t.getEmail(),
            { guest: a = !1 } = e,
            s = this._getRole(e),
            l = this._canResendInvitationEmail(e)
              ? [
                  {
                    icon: "gravit-icon-resend-invitation-email",
                    label: o.GLocale.get(
                      new o.GLocaleKey(
                        "GShareDialog",
                        "text.resend-invitation-email"
                      )
                    ),
                    click: () => {
                      gDesigner.stats("sharedialog_private-share_resend"),
                        this._toggleLoading(!0),
                        r.share
                          .sendInvitationEmails(this._storageItem.getId(), [i])
                          .then(() => {
                            E.alert(
                              o.GLocale.get(
                                new o.GLocaleKey(
                                  "GShareDialog",
                                  "text.resent-invitation-email"
                                )
                              ).replace("%email", i)
                            );
                          })
                          .catch((e) => this._handleException(e))
                          .finally(() => this._toggleLoading(!1));
                    },
                  },
                ]
              : [],
            c = this._createShareSetting({
              label: i,
              icon: this._getAvatar(t),
              defaultRole: G.ROLES.DEFAULT_PRIVATE_ROLE,
              removeCallback: () => {
                this._unshareWithUser({ id: n, email: i, role: s });
              },
              buttons: l,
            })
              .attr("user_id", n)
              .on("click", () => {
                this._setSelectedPrivateShare(n);
              });
          return (
            c
              .find(".g-role-selector")
              .gRoleSelector("role", s)
              .on("rolechange", (t) => {
                const r = $(t.target)
                  .closest(".g-role-selector")
                  .gRoleSelector("role");
                r
                  ? f && a && r.is(g.NoAccess)
                    ? this._unshareWithUser({ id: n, email: i, role: r })
                    : this._shareWithUser(
                        { id: n, email: i, role: r },
                        e.assignRole(r)
                      ).catch(() => {
                        $(t.target)
                          .closest(".g-role-selector")
                          .gRoleSelector("restoreRole");
                      })
                  : E.alert(
                      o.GLocale.get(
                        new o.GLocaleKey("GShareDialog", "text.role-required")
                      )
                    );
              }),
            c
          );
        });
      }
      _updateProperties() {
        if (this._sharedFile.getPublicShare()) {
          const e = this._getRole(this._sharedFile.getPublicShare());
          this._dialog
            .find(".share-by-link .g-role-selector")
            .gRoleSelector("role", e);
        }
        this._infoSection.css(
          "display",
          this._hasNewInvitationEmails() ? "" : "none"
        );
        const e = this._getPrivateAndInvitedShareList(),
          t = gDesigner.getLicense();
        if (0 === t.getPrivateShareQuota())
          this._dialog
            .find(".share-by-user")
            .addClass("g-disabled")
            .on("click", (e) => {
              $(e.target).hasClass("share-by-user") &&
                gDesigner.handlePROFeatureInterruption();
            });
        else if (t.getPrivateShareQuota() > 0) {
          const n = this._statistics
              ? this._statistics.getPrivateShareQuota()
              : 0,
            i = t.getPrivateShareQuota() - n;
          this._dialog
            .find(".share-by-user .subtitle")
            .css("display", "")
            .text(
              o.GLocale.get(
                new o.GLocaleKey("GShareDialog", "text.projects-left")
              ).replace("%number", i)
            );
          const a = i <= 0 && !(e && e.length);
          this._dialog.find(".share-by-user .add-button").prop("disabled", a);
        } else
          this._dialog.find(".share-by-user .subtitle").css("display", "none"),
            this._dialog
              .find(".share-by-user .add-button")
              .prop("disabled", !1);
        this._dialog.find(".share-by-user > .share-settings").empty(),
          e &&
            e.length &&
            this._dialog
              .find(".share-by-user > .share-settings")
              .append(this._getShareListLayout(e));
        let n = "";
        const i = new URL(this._getOrigin()),
          a = i.searchParams;
        this._sharedFile.getPublicShare()
          ? a.set("token", this._sharedFile.getPublicShare().token)
          : a.set("d", this._storageItem.getId()),
          (n = i.toString()),
          this._dialog.find(".share-link > .share-input > input").val(n);
      }
      _getOrigin() {
        return gContainer.getRuntime() === A.Runtime.Browser ||
          gContainer.getRuntime() === A.Runtime.PWA
          ? location.origin
          : _
          ? s
          : b
          ? l
          : w
          ? d
          : C
          ? c
          : u;
      }
      _buildShareByLink() {
        const e = this._createShareSetting({
            icon: $("<span/>")
              .addClass("gravit-icon-public-share-link")
              .addClass("icon"),
            label: o.GLocale.get(
              new o.GLocaleKey("GShareDialog", "text.public-share-link")
            ),
            defaultRole: G.ROLES.DEFAULT_PUBLIC_ROLE,
          }),
          t = e.find(".g-role-selector");
        return (
          e.find(".g-role-selector").on("rolechange", () => {
            const n = t.gRoleSelector("role");
            if (!n)
              return void E.alert(
                o.GLocale.get(
                  new o.GLocaleKey("GShareDialog", "text.role-required")
                )
              );
            gDesigner.stats("sharedialog_public-share_role", n.name);
            const i = this._sharedFile.getPublicShare();
            if (i)
              return (
                this._toggleLoading(!0),
                this._storageItem.supportsExternalSharingByLink()
                  ? this._storageItem
                      .updateDomainShare(n)
                      .then(() => {
                        a.call(this);
                      })
                      .catch((t) => {
                        E.alert(
                          o.GLocale.get(
                            new o.GLocaleKey(
                              "GShareDialog",
                              "text.error-change-role-failed"
                            )
                          )
                        ),
                          e
                            .find(".g-role-selector")
                            .gRoleSelector("restoreRole"),
                          this._toggleLoading(!1),
                          console.error("updateDomainShare error: ", t);
                      })
                  : a.call(this)
              );
            function a() {
              r.updateShare(i.token, i.assignRole(n))
                .then(() => this._loadShare())
                .then(() => this._updateProperties())
                .catch((e) => this._handleException(e))
                .finally(() => this._toggleLoading(!1));
            }
          }),
          $("<div/>")
            .addClass("share-settings-section")
            .append(
              $("<div/>")
                .addClass("share-settings-container")
                .addClass("share-by-link")
                .append($("<div/>").addClass("share-settings").append(e))
            )
        );
      }
      _buildShareByUser() {
        const e = $("<input/>")
            .addClass("private-share-email-input")
            .attr(
              "placeholder",
              o.GLocale.get(
                new o.GLocaleKey(
                  "GShareDialog",
                  "text.private-share-placeholder"
                )
              )
            )
            .attr("type", "email")
            .on("keypress", (e) => {
              const t = e.which || e.charCode || e.keyCode;
              if (i.GKey.translateKey(t) === i.GKey.Constant.ENTER)
                return (
                  e.preventDefault(),
                  e.stopPropagation(),
                  $(e.target)
                    .closest(".share-by-user")
                    .find(".add-button")
                    .trigger("click"),
                  !1
                );
            }),
          t = $("<div/>").gRoleSelector({
            defaultRole: G.ROLES.DEFAULT_PRIVATE_ROLE,
          });
        return (
          t.on("rolechange", () => {
            const e = t.gRoleSelector("role");
            gDesigner.stats("sharedialog_private-share_role", e.name);
          }),
          $("<div/>")
            .addClass("share-settings-section")
            .append(
              $("<div/>")
                .addClass("share-settings-container")
                .addClass("share-by-user")
                .append(
                  $("<div/>")
                    .addClass("share-settings-header")
                    .append(
                      $("<div/>")
                        .addClass("share-settings-header-caption")
                        .append(
                          $("<span/>")
                            .addClass("title")
                            .text(
                              o.GLocale.get(
                                new o.GLocaleKey(
                                  "GShareDialog",
                                  "text.private-sharing"
                                )
                              )
                            )
                            .gPro({
                              pro: y || -1 !== v,
                              badgeAlwaysVisible: !0,
                            })
                        )
                        .append($("<span/>").addClass("subtitle"))
                    )
                    .append(
                      $("<div/>")
                        .addClass("share-settings-header-input")
                        .append(
                          $("<div/>")
                            .addClass("input-section")
                            .append(e)
                            .append(t)
                        )
                        .append(
                          $("<button/>")
                            .addClass("add-button")
                            .addClass("g-highlight-button highlighted")
                            .text(
                              o.GLocale.get(
                                new o.GLocaleKey(
                                  "GShareDialog",
                                  "text.private-sharing-add"
                                )
                              )
                            )
                            .on("click", (n) => {
                              const o = (e.val() || "").trim(),
                                i = t.gRoleSelector("role");
                              this._tryPrivateShareWithUser(o, i, n);
                            })
                        )
                    )
                )
                .append($("<div/>").addClass("share-settings"))
            )
        );
      }
      async _tryPrivateShareWithUser(e, t, n) {
        if ((gDesigner.stats("sharedialog_private-share_add"), !e))
          return void E.alert(
            o.GLocale.get(new o.GLocaleKey("GShareDialog", "text.empty-email"))
          );
        if (!t)
          return void E.alert(
            o.GLocale.get(
              new o.GLocaleKey("GShareDialog", "text.role-required")
            )
          );
        this._toggleLoading(!0);
        try {
          if (
            this._storageItem instanceof T.Item &&
            !(await this._storageItem.isEmailFromCorporateDomain(e))
          )
            return (
              this._handleException(
                o.GLocale.get(
                  new o.GLocaleKey(
                    "GShareDialog",
                    "text.you-can-not-invite-user-from-another-domain"
                  )
                )
              ),
              void this._toggleLoading(!1)
            );
        } catch (e) {}
        const i = (e) => {
          this._toggleLoading(!0);
          const n = new h().assignRole(t),
            o = this._dialog.find(".share-settings-header-input"),
            i = o.find(".g-role-selector"),
            a = o.find(".private-share-email-input");
          this._shareWithUser(e, n, !1)
            .then((e) => {
              e ? a.val(null) : gDesigner.stats("sharedialog_invalid-email");
            })
            .catch(() => {
              i.gRoleSelector("restoreRole");
            })
            .finally(() => {
              this._toggleLoading(!1);
            });
        };
        try {
          let t = await r
            .listUsers({ q: e, all: !0 })
            .then((e) =>
              e.filter((e) => e.id !== this._user.getUID()).map((e) => new S(e))
            );
          const a = t && t.length > 0;
          let s = !0;
          if (a) {
            this._storageItem instanceof T.Item &&
              this._storageItem.getCloudClient().isCorporate() &&
              (t = t.filter(
                (e) =>
                  e.corporate_provider &&
                  e.corporate_provider ===
                    this._storageItem
                      .getCloudClient()
                      .getCorporateProviderName()
              ));
            const e = (this._sharedFile.getPrivateShareList() || [])
              .filter((e) => e.role !== g.Owner.id)
              .map((e) => e.id);
            e &&
              e.length &&
              ((t = t.filter((t) => {
                let { id: n } = t;
                return !e.includes(n);
              })),
              (s = !1));
          }
          if (t && t.length > 0)
            if ((this._toggleLoading(!1), t.length > 1)) {
              const o = $(n.target).closest(".share-settings-header-input");
              this._pickUser(e, t, o)
                .then((t) => {
                  t && i(Object.assign(t, { email: e }));
                })
                .catch(this._handleException);
            } else i(Object.assign(t[0], { email: e }));
          else
            s
              ? i({ id: e, email: e })
              : this._handleException(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GShareDialog",
                      "text.private-share-no-options-left"
                    )
                  ).replace("%email", e)
                );
        } catch (e) {
          this._handleException(e);
        }
      }
      _createShareSetting(e) {
        let {
          icon: t,
          label: n,
          defaultRole: o,
          removeCallback: i,
          buttons: a,
        } = e;
        return $("<div/>")
          .addClass("share-setting")
          .append(t || "")
          .append($("<span/>").addClass("label").text(n))
          .append($("<div/>").gRoleSelector({ defaultRole: o, buttons: a }))
          .append(
            i ? $("<div/>").addClass("gravit-icon-x-delete").on("click", i) : ""
          );
      }
      _getAvatar(e) {
        const t = e.getUserColor(),
          { avatar: n } = e,
          o = $("<div/>").addClass("avatar");
        return (
          this._shouldShowAvatar(e)
            ? this._isSVGAvatar(n)
              ? $(n).appendTo(o)
              : o.css({ backgroundImage: 'url("'.concat(n, '")') })
            : ((e.getFirstName() && !e.guest) || (e.name = e.getFullUserName()),
              o
                .css("border-color", t)
                .css("background-color", t)
                .append($("<span/>").text(e.getUserNameInitials()))),
          o
        );
      }
      _getAvatarForPicker(e) {
        const t = e.getUserColor(),
          { avatar: n } = e,
          o = $("<div/>")
            .append(
              $("<div/>")
                .addClass("g-user-selector-avatar")
                .css("border-color", t)
                .css("background-color", t)
                .append($("<span/>").text(e.getUserNameInitials()))
            )
            .addClass("g-user-selector-all-avatar");
        return (
          this._shouldShowAvatar(e) &&
            (this._isSVGAvatar(n)
              ? $(n).appendTo(o)
              : o.append(
                  $("<div/>")
                    .addClass("avatar")
                    .append(
                      $("<div/>")
                        .addClass("gravatar-avatar")
                        .css({ backgroundImage: 'url("'.concat(n, '")') })
                    )
                )),
          o
        );
      }
      _isSVGAvatar(e) {
        return "<svg>" === e.substr(0, "<svg>".length);
      }
      _shouldShowAvatar(e) {
        return (
          !!e.hasOwnPictureAvatar() ||
          !(!e.avatar || -1 === e.avatar.indexOf("static/assets"))
        );
      }
      _isSameUser(e, t) {
        let n = Object.assign({}, e),
          o = Object.assign({}, t);
        return (
          n.id || (n.id = n.email),
          o.id || (o.id = o.email),
          e.id === t.id ||
            e.id === t.email ||
            e.id === t.login ||
            e.email === t.email ||
            e.login === t.email
        );
      }
      _shareWithUser(e, t) {
        let n,
          i,
          a =
            !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2];
        if ("object" != typeof e || !e.email) throw Error("Invalid args");
        ({ email: i, id: n } = e), n || (n = i);
        const r = this._user;
        return n === r.id || n === r.email || n === r.login
          ? (E.alert(
              o.GLocale.get(
                new o.GLocaleKey(
                  "GShareDialog",
                  "text.you-can-not-invite-yourself"
                )
              )
            ),
            Promise.reject())
          : (this._toggleLoading(!0),
            this._storageItem instanceof T.Item
              ? this._storageItem
                  .isEmailFromCorporateDomain(i)
                  .then((e) => {
                    if (e) return this._prepareShare(i, t, n, a);
                    throw o.GLocale.get(
                      new o.GLocaleKey(
                        "GShareDialog",
                        "text.you-can-not-invite-user-from-another-domain"
                      )
                    );
                  })
                  .catch((e) => {
                    throw (this._handleException(e), e);
                  })
              : this._prepareShare(i, t, n, a));
      }
      _prepareShare(e, t, n, o) {
        return this._storageItem.supportsExternalSharing()
          ? this._storageItem
              .requestExternalShare(e, t)
              .then(() => this._processShare(e, t, n, o))
              .catch((e) => {
                throw (this._handleException(e), e);
              })
          : this._processShare(e, t, n, o);
      }
      _processShare(e, t, n, i) {
        const a = i ? t : Object.assign(t, { sendEmail: i, validated: !0 }),
          s = this._storageItem.toString();
        let l = !1;
        return (
          this._storageItem instanceof T.Item &&
            (l = this._storageItem.getCloudClient().isCorporate()),
          s.indexOf("GCloudStorage") >= 0
            ? gDesigner.stats("sharedialog_private-share_cloud")
            : s.indexOf("GGoogleDriveStorage") >= 0
            ? gDesigner.stats(
                "sharedialog_private-share_".concat(
                  l ? "corporate-" : "",
                  "googledrive"
                )
              )
            : s.indexOf("GSharePointStorage") >= 0 &&
              gDesigner.stats(
                "sharedialog_private-share_".concat(
                  l ? "corporate-" : "",
                  "sharepoint"
                )
              ),
          r
            .shareWithUser(this._storageItem.getId(), n, a)
            .then(
              async (e) => (
                await this._loadShare(),
                this._updateProperties(),
                this._setSelectedPrivateShare(e.user_id),
                e
              )
            )
            .catch((t) => {
              if (t.status)
                switch (t.status) {
                  case r.HTTP_STATUS_CODES.CONFLICT:
                    return void E.alert(
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GShareDialog",
                          "text.you-can-not-invite-yourself"
                        )
                      )
                    );
                  case r.HTTP_STATUS_CODES.NOT_FOUND:
                    return void E.alert(
                      o.GLocale.get(
                        new o.GLocaleKey("GShareDialog", "text.invalid-email")
                      ).replace("%email", e)
                    );
                  case r.HTTP_STATUS_CODES.FORBIDDEN:
                    return void ("only same domain users allowed" === t.message
                      ? E.alert(
                          o.GLocale.get(
                            new o.GLocaleKey(
                              "GShareDialog",
                              "text.you-can-not-invite-user-from-another-domain"
                            )
                          )
                        )
                      : E.alert(
                          o.GLocale.get(
                            new o.GLocaleKey(
                              "GCommonNames",
                              "error.http.forbidden"
                            )
                          )
                        ));
                }
              this._handleException(t);
            })
            .finally(() => this._toggleLoading(!1))
        );
      }
      _unshareWithUser(e) {
        const { email: t, role: n } = e,
          { id: o = t } = e;
        return (
          this._toggleLoading(!0),
          this._storageItem.supportsExternalSharing()
            ? this._storageItem
                .requestExternalUnShare(t, n)
                .then(() => i.call(this))
                .catch((e) => {
                  this._handleException(e);
                })
            : i.call(this)
        );
        function i() {
          return r
            .unshareWithUser(this._storageItem.getId(), o)
            .then(() => this._setSelectedPrivateShare(null))
            .then(() => this._loadShare())
            .then(() => this._updateProperties())
            .catch((e) => this._handleException(e))
            .finally(() => this._toggleLoading(!1));
        }
      }
      _toggleLoading(e) {
        (this._isLoading = !!e),
          ($(this._dialog).data("gdialog").closable = !e),
          this._dialog.toggleClass("g-loading", !!e);
      }
      async open() {
        await this._initialize(), this._dialog.gDialog("open", !0);
      }
      close() {
        this._isLoading || this._dialog.gDialog("close");
      }
      _canResendInvitationEmail(e) {
        const t = G.makeFromShare(e);
        if (t && !t.is(g.NoAccess)) {
          return (
            (this._initialSharedFile &&
              this._initialSharedFile
                .getPrivateShareList()
                .map((e) => e.id)
                .concat(
                  this._initialSharedFile.getInvitedShareList().map((e) => e.id)
                )) ||
            []
          ).includes(e.id);
        }
        return !1;
      }
      _hasNewInvitationEmails() {
        return this._getNewAddedShareEmails().length > 0;
      }
      async _sendInvitationEmails() {
        const e = this._getNewAddedShareEmails();
        if (e && e.length > 0)
          return m ? this._sendGuestInvitation(e) : this._sendUserInvitation(e);
      }
      _sendUserInvitation(e) {
        return (
          gDesigner.stats("sharedialog_private-share_invite"),
          r.share
            .sendInvitationEmails(this._storageItem.getId(), e)
            .then(() => {
              this._showSentInvitationEmailAlert(e);
            })
        );
      }
      _sendGuestInvitation(e) {
        let t = [],
          n = e.slice();
        return Promise.all(
          n.map((e) =>
            r
              .signupGuestUser({ email: e, file_id: this._storageItem.getId() })
              .catch(() => {
                t.push(e);
              })
          )
        )
          .then(() => {
            if (t.length)
              return r.share
                .sendInvitationEmails(this._storageItem.getId(), t)
                .catch(() => {});
          })
          .then(() => {
            this._showSentInvitationEmailAlert(e);
          });
      }
      _showSentInvitationEmailAlert(e) {
        E.alert(
          o.GLocale.get(
            new o.GLocaleKey("GShareDialog", "text.sent-invitation-email")
          ).replace("%emails", e.join(", ")),
          null,
          { className: "g-sent-invitation-email-dialog" }
        );
      }
      _pickUser(e, t, n) {
        return new Promise((o) => {
          let i;
          const a = $("<div/>")
            .addClass("g-user-selector")
            .append(
              $("<div/>")
                .addClass("g-user-selector-container")
                .append(
                  t.map((t) =>
                    $("<div/>")
                      .addClass("g-user-selector-content")
                      .append(this._getAvatarForPicker(t))
                      .append(
                        $("<div/>")
                          .addClass("g-user-selector-info")
                          .append($("<span/>").text(t.getFullUserName()))
                          .append($("<span/>").text(e))
                      )
                      .on("click", () => {
                        (i = t), a.gOverlay("close");
                      })
                  )
                )
            )
            .gOverlay({
              clazz: "g-share-dialog-user-selector",
              releaseOnClose: !0,
              padding: !1,
              closeCallback: () => o(i),
            })
            .gOverlay("open", n);
        });
      }
      _getNewAddedShareEmails() {
        const e =
            (this._initialSharedFile &&
              this._initialSharedFile.getPrivateShareList().map((e) => e.id)) ||
            [],
          t =
            (this._initialSharedFile &&
              this._initialSharedFile
                .getInvitedShareList()
                .map((e) => e.email)) ||
            [];
        return this._sharedFile
          .getPrivateShareList()
          .filter((t) => !e.includes(t.id))
          .filter((e) => !t.includes(e.email))
          .map((e) => e.email)
          .concat(
            this._sharedFile
              .getInvitedShareList()
              .filter((e) => !t.includes(e.email))
              .map((e) => e.email)
          );
      }
    }
    (I.prototype._isInitialized = !1),
      (I.prototype._sharedFile = null),
      (I.prototype._isLoading = !1),
      (e.exports = I);
  }