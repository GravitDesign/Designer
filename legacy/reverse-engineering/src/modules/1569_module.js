/**
 * Webpack Module #1569
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(30), n(8);
    var i = o(n(11));
    n(1322);
    const a = n(808),
      r = n(1570),
      s = n(392),
      l = n(1323),
      c = n(441),
      {
        SHARE_ENGINE: d,
        HAS_ANNOTATIONS: u,
        ShareRoles: p,
        FileStatus: { APPROVED: g },
        FILE_REVIEW_ENABLED: h,
        LEGACY_SHARE_DIALOG: f,
      } = n(10);
    function m(e) {
      (this._state = new r()),
        d && gDesigner.addEventListener(l, this._shareStateChangedEvent, this),
        gDesigner.addEventListener(a, this._applicationStatusEvent, this),
        gDesigner.addEventListener(c, this._licenseChangedEvent, this),
        this._init(e);
    }
    (m.prototype._init = async function (e) {
      e && e();
    }),
      (m.prototype._shareStateChangedEvent = function (e) {
        const t = new r(Object.assign({}, this._state)),
          {
            owner: n,
            share: o,
            sharing: i,
            edit: a,
            inspect: s,
            copy: l,
            comment: c,
            isPrivate: d,
            role: p,
            realtimeCollaborators: g = [],
          } = e.state;
        n
          ? Object.assign(t, {
              edit: !0,
              saveAs: !0,
              export: !0,
              inspect: !0,
              copyPaste: !0,
              comment: !!u,
            })
          : Object.assign(t, {
              edit: a,
              saveAs: l,
              export: l,
              copyPaste: l,
              inspect: s,
              comment: c,
            }),
          Object.assign(t, {
            isShareEnabled: o,
            isSharing: i,
            isPrivateSharing: d,
            role: p,
            realtimeCollaborators: g,
          }),
          this._setState(t, e.document);
      }),
      (m.prototype._setState = function (e, t) {
        i.default.equals(e, this._state, !0) ||
          ((this._state = e), this._triggerAppStateEvent(t, e));
      }),
      (m.prototype._triggerAppStateEvent = function (e, t) {
        gDesigner.hasEventListeners(s) && gDesigner.trigger(new s(e, t));
      }),
      (m.prototype._applicationStatusEvent = function (e) {
        e.status === a.Status.Ready &&
          gDesigner.isAnonymous() &&
          gDesigner.addNotification({ anonymous: !0 });
      }),
      (m.prototype._licenseChangedEvent = function (e) {}),
      (m.prototype.isShareEnabled = function () {
        return !!this._state.isShareEnabled && d;
      }),
      (m.prototype.isShareEngineEnabled = function () {
        return d;
      }),
      (m.prototype.isSharing = function () {
        return !!this._state.isSharing && d;
      }),
      (m.prototype.isPrivateSharing = function () {
        return this._state.isPrivateSharing && !!d;
      }),
      (m.prototype.getRealtimeCollaborators = function () {
        return (d && this._state.realtimeCollaborators) || [];
      }),
      (m.prototype.isEditingEnabled = function () {
        return (
          !gDesigner.getLicense().isGuest() &&
          (this._state.edit || (!!f && this._state.inspect))
        );
      }),
      (m.prototype.isSavingAsEnabled = function () {
        return !gDesigner.getLicense().isGuest() && this._state.saveAs;
      }),
      (m.prototype.isSavingToCloudEnabled = function () {
        return !gDesigner.getLicense().isGuest() && this._state.edit;
      }),
      (m.prototype.isExportEnabled = function () {
        return !gDesigner.getLicense().isGuest() && this._state.export;
      }),
      (m.prototype.isInspectEnabled = function () {
        return this._state.inspect || this._state.edit;
      }),
      (m.prototype.isPagesInspectEnabled = function () {
        return this.isInspectEnabled();
      }),
      (m.prototype.isCommentingEnabled = function () {
        return this._state.comment && u;
      }),
      (m.prototype.isCommentingEditingEnabled = function () {
        if (!this.isCommentingEnabled()) return !1;
        if (h) {
          var e = !0,
            t = gDesigner.getActiveDocument(),
            n = t && t.getStorageItem(),
            o = n && n.getFile();
          return o && o.status === g && (e = !1), e;
        }
        return !0;
      }),
      (m.prototype.isCopyPasteEnabled = function () {
        return this._state.copyPaste;
      }),
      (m.prototype.hasAccess = async function (e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        const n = gDesigner.getShareManager().getRole();
        return !(!n || !((!t && n.is(p.Owner)) || (await n.can(e))));
      }),
      (m.prototype.hasPermission = function (e, t) {
        const n = gDesigner.getShareManager().getRole(e);
        return !(!n || !n.hasPermission(t));
      }),
      (m.prototype.hasRole = function (e) {
        const t = gDesigner.getShareManager().getRole();
        return !!t && t.is(e);
      }),
      (m.prototype.isFileFormatEnabledForSaveAs = function (e) {
        return this._state.saveAs;
      }),
      (m.prototype.isCreatingNewDocumentEnabled = function () {
        return !gDesigner.getLicense().isGuest();
      }),
      (m.prototype.isOpenFromCloudEnabled = function () {
        return !gDesigner.getLicense().isGuest();
      }),
      (m.prototype.isOnlyFileOpenFromCloudEnabled = function () {
        return !1;
      }),
      (m.prototype.isOpenFromRecentFilesEnabled = function () {
        return !0;
      }),
      (m.prototype.isDocumentTabManagementEnabled = function () {
        return this._state.isDocumentTabManagementEnabled;
      }),
      (m.prototype.isOpenFilesFromLocalEnabled = function () {
        return !gDesigner.getLicense().isGuest();
      }),
      (m.prototype.isReminderManagerEnabled = function (e) {
        return !0;
      }),
      (m.prototype.isInAppPurchaseAvailable = function (e) {
        return !0;
      }),
      (m.prototype.isLicenseUpgradeable = function (e) {
        return (e = e || gDesigner.getLicense()).canUpgrade();
      }),
      (m.prototype.isImportResourcesEnabled = function () {
        return this.isOpenFilesFromLocalEnabled();
      }),
      (e.exports = m);
  }