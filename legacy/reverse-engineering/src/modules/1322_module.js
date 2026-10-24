/**
 * Webpack Module #1322
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(19),
      n(30),
      n(8),
      n(20),
      n(3),
      n(34),
      n(4),
      n(13),
      n(32),
      n(38),
      n(97),
      n(33),
      n(26),
      n(125),
      n(126),
      n(114);
    var i = n(1),
      a = o(n(256)),
      r = o(n(355)),
      s = n(40);
    const l = n(44),
      c = n(292),
      d = n(78),
      u = n(217),
      p = n(220),
      g = n(393),
      h = n(1323),
      f = n(86),
      {
        DESIGNER: m,
        SHARE_ENGINE: y,
        HAS_ANNOTATIONS: v,
        gApi: _,
        ShareRoles: b,
        SharePermissions: w,
        Share: C,
        LEGACY_SHARE_DIALOG: x,
        ENABLE_REQUEST_ACCESS: S,
      } = n(10),
      E = n(433),
      A = n(1324),
      T = n(177),
      G = n(1565),
      P = n(868),
      D = n(536),
      L = n(237),
      I = n(x ? 1566 : 1567);
    function k() {
      y &&
        (gDesigner.addEventListener(c, this._userEvent, this),
        gDesigner.addEventListener(d, this._documentEvent, this)),
        (this._states = new Map()),
        (this._isDefaulNotificationAlreadyShown = new Map());
    }
    (k.prototype._states = null),
      (k.prototype._requestAccessDialog = null),
      (k.prototype._requestPermissionDialog = null),
      (k.prototype._requestEmailHasBeenSent = !1),
      (k.prototype._collaboratorsCached = {}),
      (k.prototype.share = function (e, t) {
        const n = this,
          o = e instanceof L.Item,
          i = async function () {
            let i = null;
            if (o) i = e;
            else {
              const t = e || gDesigner.getActiveDocument();
              i = t && t.getStorageItem();
            }
            i.supportsExternalSharing() &&
              (await n._syncExternalPermissions(i)),
              n._openShareDialog(await gDesigner.getUser(), i, t);
          };
        gDesigner.isOffline()
          ? a.default.openUnavailableFeature(i)
          : this.isShareProRestricted()
          ? gDesigner.handlePROFeatureInterruption()
          : i();
      }),
      (k.prototype._openShareDialog = async function (e, t, n) {
        const o = new I(e, t, n);
        await o.open();
      }),
      (k.prototype._documentEvent = async function (e) {
        const t = e.document;
        if (!t || !t.isLockedByVersionHistory())
          switch (e.type) {
            case d.Type.Activated:
              (await this._checkAccessAndUpdateState(t)) &&
                (this._showDefaultNotification(t),
                t.removeEventListener(g, this._collaborationEvent, this),
                t.addEventListener(g, this._collaborationEvent, this));
              break;
            case d.Type.Deactivated:
              t.removeEventListener(g, this._collaborationEvent, this);
              break;
            case d.Type.Removed:
              t.getId() && delete this._collaboratorsCached[t.getId()],
                this._states.delete(t);
              break;
            case d.Type.StorageItemUpdated: {
              t.isShareable() && t.lock();
              const e = async (n) => {
                if (n.status !== f.Loading)
                  try {
                    t.removeEventListener(u, e),
                      (await this._checkAccessAndUpdateState(t)) &&
                        this._showDefaultNotification(t);
                  } finally {
                    t.unlock();
                  }
              };
              t.addEventListener(u, e);
              break;
            }
          }
      }),
      (k.prototype.isPermissionRequestEnabled = function () {
        return S && !gDesigner.getLicense().isGuest();
      }),
      (k.prototype.getRole = function (e) {
        e = e || gDesigner.getActiveDocument();
        const { role: t } = this._getState(e);
        return t || E.ROLES.NO_ACCESS_ROLE;
      }),
      (k.prototype._collaborationEvent = async function (e) {
        const { sender: t, type: n } = e;
        if (t === gDesigner.getActiveDocument())
          switch (n) {
            case g.Type.ShareUpdate:
              this.resetCollaboratorsCached(t),
                this._getState(t).sharing || (await this._updateState(t));
              const e = this.getRole(t);
              if (await this._checkAccessAndUpdateState(t)) {
                const n = this.getRole(t);
                e.equals(n) ||
                  (t.getStatus() !== f.Loading &&
                    this._showRoleNotification(t));
              }
              break;
            case g.Type.UserUpdate:
              this._updateRealtimeCollaborators(t);
          }
      }),
      (k.prototype._userEvent = async function () {
        const e = gDesigner.getActiveDocument();
        e && (await this._updateState(e), this._showDefaultNotification(e));
      }),
      (k.prototype._showRoleNotification = function (e) {
        if (!e) return;
        const t = this.getRole(e);
        if (!t) return;
        const n = i.GLocale.get(
          new i.GLocaleKey(
            "GShareManager",
            "text.new-role-is-".concat(t.getId())
          )
        );
        n &&
          gDesigner.addNotification({
            document: e,
            message: n,
            anonymous: gDesigner.isAnonymous(),
            popup: !0,
          });
      }),
      (k.prototype._showDefaultNotification = async function (e) {
        if (!e) return;
        if (
          (void 0 === this._isDefaulNotificationAlreadyShown.get(e.sessionId) &&
            this._isDefaulNotificationAlreadyShown.set(e.sessionId, !1),
          this._isDefaulNotificationAlreadyShown.get(e.sessionId))
        )
          return;
        const t = e.isDocumentFromTemplate() && e.isShared();
        let n;
        if (t) n = { name: m.TITLE };
        else {
          const t = await gDesigner.getUser(),
            o = await this._getFileExtended(e);
          if (t && o) {
            o.getPrivateShareList().some((e) => {
              if (e.owner && e.id !== t.getUID())
                return (n = { name: e.name || e.email, id: e.id }), !0;
            });
            const e = new URL(location.href).searchParams.get("token");
            if (e) {
              const i = o.getPublicShare();
              if (i && i.token === e) {
                const e = i.shared_by;
                e && e.id && e.id !== t.getUID() && (n = e);
              }
            }
          }
        }
        if (n) {
          e.setOwner(n);
          const o = [];
          if (t)
            o.push(
              i.GLocale.get(
                new i.GLocaleKey("GShareManager", "text.template-shared-by")
              ).replace("%name", n.name)
            );
          else if (
            (o.push(
              i.GLocale.get(
                new i.GLocaleKey("GShareManager", "text.shared-by")
              ).replace("%name", n.name)
            ),
            !x)
          ) {
            const t = this.getRole(e);
            t && t.getStatus() && o.push(t.getStatus());
          }
          if (x) {
            const t = this._getState(e);
            t.copy || t.inspect
              ? (t.copy ||
                  o.push(
                    i.GLocale.get(
                      new i.GLocaleKey("GShareManager", "text.save-warning")
                    )
                  ),
                t.inspect ||
                  o.push(
                    i.GLocale.get(
                      new i.GLocaleKey("GShareManager", "text.inspect-warning")
                    )
                  ))
              : o.push(
                  i.GLocale.get(
                    new i.GLocaleKey("GShareManager", "text.combined-warnings")
                  )
                );
          }
          o.length &&
            gDesigner.addNotification({
              document: e,
              message: o.join(" "),
              anonymous: gDesigner.isAnonymous(),
              popup: !0,
              closeCallback: () => {
                this._isDefaulNotificationAlreadyShown.set(e.sessionId, !0);
              },
            });
        }
      }),
      (k.prototype._canAccess = async function (e) {
        return !!(await this._getFileExtended(e).catch(() => !1));
      }),
      (k.prototype.getRealtimeCollaborators = async function (e) {
        return _.realtime
          .getCollaborators(e.id, { anonymous: !1 })
          .then((t) =>
            t.map((t) => {
              const n = ((t) => {
                const n = e.getPrivateShare(t.access_id);
                if (n) return E.makeFromShare(n);
                const o = e.getPublicShare();
                return o ? E.makeFromShare(o) : E.makeFromShareRole(b.NoAccess);
              })(t);
              return new A(Object.assign(t, { role: n }));
            })
          )
          .catch(() => []);
      }),
      (k.prototype._getFileExtended = function (e) {
        return gDesigner
          .getCloudCommunicationManager()
          .getFileExtendedCached(e);
      }),
      (k.prototype._getCollaborators = async function (e) {
        const t = await this._getFileExtended(e);
        if (!t) return null;
        let n = [];
        return (
          (n = n.concat(await this._getFileCollaboratorsAsUsers(t))),
          (n = n.concat(this._getInvitedCollaboratorsAsUsers(t))),
          n
        );
      }),
      (k.prototype._getInvitedCollaboratorsAsUsers = function (e) {
        return e.getInvitedShareList().map((e) => {
          const t = E.makeFromShare(e),
            n = new T({ id: e.email });
          return n.setRole(t), n;
        });
      }),
      (k.prototype._getFileCollaboratorsAsUsers = function (e) {
        return gDesigner
          .getCloudCommunicationManager()
          .getCollaborators(e.id)
          .then((t) =>
            t.map((t) => {
              const n = new T(t),
                o = ((t) => {
                  const n = e.getPrivateShare(t.getUID());
                  if (n) return E.makeFromShare(n);
                  const o = e.getPublicShare();
                  return o
                    ? E.makeFromShare(o)
                    : E.makeFromShareRole(b.NoAccess);
                })(n);
              return n.setRole(o), n;
            })
          )
          .catch(() => []);
      }),
      (k.prototype.resetCollaboratorsCached = function (e) {
        if ((e = e || gDesigner.getActiveDocument()) && e.getId()) {
          const t = this._collaboratorsCached[e.getId()];
          t && t.reset();
        }
      }),
      (k.prototype.getCollaboratorsCached = async function (e) {
        return (e = e || gDesigner.getActiveDocument()) && e.getId()
          ? (this._collaboratorsCached[e.getId()] ||
              (this._collaboratorsCached[e.getId()] = new D(() =>
                this._getCollaborators(e)
              )),
            this._collaboratorsCached[e.getId()].get())
          : [];
      }),
      (k.prototype.getPrivateInvitedShareList = async function (e) {
        const t = await this._getFileExtended(e);
        return this._getPrivateInvitedShareListForFile(t);
      }),
      (k.prototype.getRoleNameByUserId = async function (e) {
        const t = gDesigner.getActiveDocument();
        if (!t.isCloudFile() && !t.isExternalFile())
          return E.ROLES.OWNER_ROLE.getName();
        const n = await this.getCollaboratorById(e);
        return ((n && n.getRole()) || E.ROLES.NO_ACCESS_ROLE).getName();
      }),
      (k.prototype.getCollaboratorById = async function (e) {
        let t = null;
        const n = await this.getCollaboratorsCached();
        return n && (t = n.find((t) => t.getUID() === e)), t;
      }),
      (k.prototype._getPrivateInvitedShareListForFile = function (e) {
        if (!e) return null;
        const t = e.getPrivateShareList(),
          n = (e.getInvitedShareList && e.getInvitedShareList()) || [];
        return t.concat(n);
      }),
      (k.prototype.updateStateForDocument = function (e) {
        this._updateState(e);
      }),
      (k.prototype._updateState = async function (e) {
        const t = this._createDefaultShareStateForDoc(e),
          n = e && e.getStorageItem(),
          o = await gDesigner.getUser();
        if (!o) return this._setState(e, t);
        if (e && e.isDocumentFromTemplate() && e.isShared())
          this._applyStateFromTemplate(t);
        else if (n instanceof p.Item) {
          const n = await this._getFileExtended(e);
          n && (await this._applyStateFromFile(o, n, t));
        } else if (
          n &&
          n.getId() &&
          n.supportsSharing() &&
          n.supportsShadowFile()
        ) {
          const n = await this._getFileExtended(e);
          n && ((t.share = !0), await this._applyStateFromFile(o, n, t));
        } else await this._getFileExtended(e);
        this._setState(e, t),
          gDesigner.hasEventListeners(P) &&
            gDesigner.trigger(new P(P.Type.Updated));
      }),
      (k.prototype._createDefaultShareStateForDoc = function (e) {
        return new G(
          Object.assign({}, this._getState(e), {
            owner: !0,
            share: !1,
            sharing: !1,
            role: E.ROLES.OWNER_ROLE,
            isPrivate: !0,
          })
        );
      }),
      (k.prototype._applyStateFromTemplate = function (e) {
        return Object.assign(e, {
          edit: !0,
          inspect: !0,
          copy: !0,
          comment: !1,
          share: !1,
          owner: !1,
          sharing: !1,
          realtimeCollaborators: [],
        });
      }),
      (k.prototype._applyStateFromFile = async function (e, t, n) {
        if (!t) throw new r.default("File object is required");
        const o = (0, s.getFileStateAndRole)(e, t, n);
        let i = o.role;
        const { state: a } = o;
        if (!i) {
          const e = t.getPublicShare();
          if (e) {
            const { copy: t, inspect: n, comment: o, edit: r } = e;
            (i = E.makeFromShare(e)),
              Object.assign(a, {
                owner: !1,
                edit: r,
                copy: t,
                inspect: n,
                comment: !!v && o,
              });
          }
        }
        a.role = i || E.ROLES.NO_ACCESS_ROLE;
        const l = await this.getRealtimeCollaborators(t);
        Object.assign(a, { realtimeCollaborators: l });
      }),
      (k.prototype._updateRealtimeCollaborators = async function (e) {
        const t = await this._getFileExtended(e);
        if (t) {
          const n = await this.getRealtimeCollaborators(t);
          this._setState(
            e,
            new G(
              Object.assign({}, this._getState(e), { realtimeCollaborators: n })
            )
          );
        }
      }),
      (k.prototype._setState = function (e, t) {
        this._states.set(e, t),
          gDesigner.hasEventListeners(h) && gDesigner.trigger(new h(e, t));
      }),
      (k.prototype._getState = function (e) {
        return this._states.get(e) || new G();
      }),
      (k.prototype._checkAccessAndUpdateState = async function (e) {
        if (!(await this._requestAccessIfAbsent(e))) return !1;
        this._closeRequestAccessDialog();
        const t = this.getRole(e);
        await this._updateState(e);
        const n = this.getRole(e);
        return (
          (t && t.equals(n)) || this._requestPermissionToCommentIfAbsent(e),
          (await this._isUserUnableToOperateSystem(e)) &&
            this._openRequestAccessDialog(e),
          !0
        );
      }),
      (k.prototype._isUserUnableToOperateSystem = async function (e) {
        if (!e.getId()) return !1;
        var t = await this._getShareLevelForCurrentUser(e);
        return !!(gDesigner.getLicense().isGuest() && t < 1);
      }),
      (k.prototype._getShareLevelForCurrentUser = async function (e) {
        const t = await gDesigner.getUser(),
          n = await this._getFileExtended(e);
        if (t && n) {
          var o = n.getPrivateShareList().find((e) => {
            if (e.id === t.getUID()) return !0;
          });
          if (o) return o.getRole().level;
          const e = n.getPublicShare();
          return e ? e.getRole().level : new E.makeFromShareRole(b.NoAccess);
        }
        return new E.makeFromShareRole(b.NoAccess).level;
      }),
      (k.prototype._requestAccessIfAbsent = async function (e) {
        return (
          !e.isShareable() ||
          !!(await this._canAccess(e)) ||
          (this._openRequestAccessDialog(e), !1)
        );
      }),
      (k.prototype._requestPermissionToCommentIfAbsent = function (e) {
        if (!e.isShareable()) return;
        if (!e.getFocusAnnotationId()) return;
        const t = this.getRole(e);
        (t && t.is(b.Owner)) ||
          t.hasPermission(w.COMMENT) ||
          this._requestPermissionToComment(e);
      }),
      (k.prototype._requestPermissionToComment = function (e) {
        if (this._requestPermissionDialog) return;
        const t = this.getRole(e);
        t &&
          !t.is(b.NoAccess) &&
          (this._requestPermissionDialog = this._createRequestDialog(e, {
            className: "g-request-permission-dialog",
            openCallback: () => {
              gDesigner.stats("permission-dialog_comment-access_open");
            },
            closeCallback: () => {
              this._requestPermissionDialog = null;
            },
            title: i.GLocale.get(
              new i.GLocaleKey(
                "GShareManager",
                "text.file-can-not-be-commented-title"
              )
            ).replace("%role", t.getName()),
            subtitle: i.GLocale.get(
              new i.GLocaleKey(
                "GShareManager",
                "text.file-can-not-be-commented-info"
              )
            ),
            requestButton: {
              label: i.GLocale.get(
                new i.GLocaleKey(
                  "GShareManager",
                  "text.file-request-permission-to-comment"
                )
              ),
              permissions: { comment: !0 },
            },
            statType: "comment-access",
          }));
      }),
      (k.prototype._openRequestAccessDialog = function (e) {
        this._requestAccessDialog ||
          (this._requestAccessDialog = this._createRequestDialog(e, {
            className: "g-request-access-dialog",
            openCallback: () => {
              gDesigner.stats("permission-dialog_no-access_open");
            },
            closeCallback: async () => {
              (this._requestAccessDialog = null),
                (await this._canAccess(e)) ||
                  (gDesigner.removeDocument(e, null, !0),
                  this._requestEmailHasBeenSent &&
                    (l.alert(
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GShareManager",
                          "text.sent-request-email"
                        )
                      )
                    ),
                    (this._requestEmailHasBeenSent = !1)));
            },
            title: i.GLocale.get(
              new i.GLocaleKey(
                "GShareManager",
                "text.file-can-not-be-accessed-title"
              )
            ),
            subtitle: i.GLocale.get(
              new i.GLocaleKey(
                "GShareManager",
                "text.file-can-not-be-accessed-info"
              )
            ),
            requestButton: {
              label: i.GLocale.get(
                new i.GLocaleKey("GShareManager", "text.file-request-access")
              ),
              permissions: { access: !0 },
            },
            statType: "no-access",
          }));
      }),
      (k.prototype._closeRequestAccessDialog = function () {
        this._requestAccessDialog &&
          (this._requestAccessDialog.gDialog("close"),
          (this._requestAccessDialog = null));
      }),
      (k.prototype._createRequestDialog = function (e) {
        let {
          className: t = "",
          title: n,
          subtitle: o,
          closeCallback: a,
          requestButton: { label: r, permissions: s = {} } = {},
          statType: c,
        } = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        var d = [];
        return (
          this.isPermissionRequestEnabled() &&
            d.push({
              label: r,
              onclick: (t) => {
                gDesigner.stats(
                  "permission-dialog_".concat(c, "_request-access")
                );
                const n = Object.assign(s, { isToken: !e.getId() });
                _.requestPermission(
                  e.getId() || e.getFailedDocumentIdOrToken(),
                  n
                )
                  .then(() => {
                    t.gDialog("close"), (this._requestEmailHasBeenSent = !0);
                  })
                  .catch(() => {
                    l.error(
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GShareManager",
                          "text.cannot-request-access"
                        )
                      )
                    );
                  });
              },
            }),
          d.push({
            label: i.GLocale.get(new i.GLocaleKey("GLocale", "ok")),
            onclick: async (t) => {
              gDesigner.stats("permission-dialog_".concat(c, "_click-ok")),
                t.gDialog("close"),
                (await this._isUserUnableToOperateSystem(e)) &&
                  gDesigner.signout(!0);
            },
            highlighted: !0,
          }),
          l.custom({
            icon: "error",
            closeable: !1,
            className: t,
            closeCallback: a,
            title: n,
            subtitle: o,
            buttons: d,
          })
        );
      }),
      (k.prototype._syncExternalPermissions = async function (e) {
        const t = await e.getPermissionsList(),
          n = await async function t() {
            return gDesigner
              .getCloudCommunicationManager()
              .getExternalFile(e.getId())
              .catch((n) => {
                if (n && 404 === n.status && e.supportsShadowFile())
                  return e.createShadowFile().then(() => t.call(this));
                throw n;
              });
          }.call(this),
          o = this._getPrivateInvitedShareListForFile(n),
          i = await gDesigner.getUser();
        return function () {
          const n = [],
            a = [],
            r = [];
          t.forEach((t) => {
            let { email: i, role: a, externalRole: r } = t;
            if (i) {
              let t = !1;
              o.some((n) => {
                let { email: o, role: a } = n;
                if (i && i === o && e.rolesMatch(r, a)) return (t = !0), t;
              }),
                t || n.push({ email: i, role: a });
            }
          }),
            o.forEach((e) => {
              let n = !1;
              t.some((t) => {
                let { email: o } = t;
                if (e.email === o) return (n = !0), n;
              }),
                n ||
                  E.makeFromShare(e).is(b.NoAccess) ||
                  a.push({ email: e.email });
            }),
            n.length &&
              r.concat(
                n.map(async (t) => {
                  let { email: n, role: o } = t;
                  if (i.getEmail() === n) return null;
                  const a = Object.values(b).find((e) => {
                      let { id: t } = e;
                      return t === o;
                    }),
                    r = o && a ? a : b.NoAccess,
                    s = new C().assignRole(r);
                  try {
                    return await _.shareWithUser(e.getId(), n, s);
                  } catch (e) {
                    return null;
                  }
                })
              );
          a.length &&
            r.concat(
              a.map(async (t) => {
                let { email: n } = t;
                return _.shareWithUser(
                  e.getId(),
                  n,
                  new C().assignRole(b.NoAccess)
                );
              })
            );
          return Promise.all(r);
        }.call(this);
      }),
      (k.prototype.getPermalink = async function (e, t) {
        const n = await this._getFileExtended(e);
        if (n) {
          const e = gDesigner.getAppBaseUrl(!0),
            o = new URL(n.getShareLink(e));
          return o.searchParams.set("annot", t.getId()), o.toString();
        }
        return null;
      }),
      (k.prototype.isShareProRestricted = function () {
        return C.isPro() && !gDesigner.isEnabledProFeatures();
      }),
      (e.exports = k);
  }