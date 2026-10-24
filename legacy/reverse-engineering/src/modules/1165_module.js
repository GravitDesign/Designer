/**
 * Webpack Module #1165
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(58), n(8), n(71), n(4), n(13), n(38), n(97);
    var o = n(1);
    const i = n(78),
      a = n(393),
      r = n(433),
      s = n(336),
      l = n(868),
      {
        GFileReviewFlow: c,
        gApi: d,
        FileStatus: u,
        FILE_REVIEW_ENABLED: p,
        Notification: g,
        NotificationConstants: { FILE_REVIEW_FLOW: h = [] },
      } = n(10);
    function f() {
      if (!p) return this;
      gDesigner.addEventListener(i, this._documentEvent, this),
        gDesigner.addEventListener(
          s.FileStatusUpdate,
          this._storageItemFileStatusEvent,
          this
        ),
        gDesigner.addEventListener(l, this._handleShareEvent, this),
        gDesigner.getActiveDocument() &&
          (this._addDocumentEvents(gDesigner.getActiveDocument()),
          this._updateFromDocument(gDesigner.getActiveDocument()));
    }
    o.GObject.inherit(f, o.GEventTarget),
      (f.UpdateEvent = function () {}),
      o.GObject.inherit(f.UpdateEvent, o.GEvent),
      (f.prototype._addDocumentEvents = function (e) {
        e.addEventListener(a, this._collaborationEvent, this);
      }),
      (f.prototype._removeDocumentEvents = function (e) {
        e.removeEventListener(a, this._collaborationEvent, this);
      }),
      (f.prototype._storageItemFileStatusEvent = async function (e) {
        let { storageItem: t, newStatus: n } = e;
        this._fileId === t.getId() &&
          this._doc.isCollaborative() &&
          this._setStatus(n) &&
          this.trigger(new f.UpdateEvent());
      }),
      (f.prototype._handleShareEvent = async function (e) {
        switch (e.type) {
          case l.Type.Updated:
            await this._updateCollaboratorRoleListIfInitialized(),
              this.hasEventListeners(f.UpdateEvent) &&
                this.trigger(new f.UpdateEvent());
        }
      }),
      (f.prototype._documentEvent = async function (e) {
        const t = e.document;
        switch (e.type) {
          case i.Type.Activated:
            this._addDocumentEvents(t), this._updateFromDocument(t);
            break;
          case i.Type.Deactivated:
            this._removeDocumentEvents(t),
              this._updateFromDocument(t),
              (this._doc = null);
            break;
          case i.Type.StorageItemUpdated:
            this._updateFromDocument(t);
        }
      }),
      (f.prototype._collaborationEvent = async function (e) {
        const { type: t, sender: n } = e;
        if (n === gDesigner.getActiveDocument())
          switch (t) {
            case a.Type.ShareUpdate:
            case a.Type.UserUpdate:
              await this._updateCollaboratorRoleListIfInitialized(),
                this.hasEventListeners(f.UpdateEvent) &&
                  this.trigger(new f.UpdateEvent());
          }
      }),
      (f.prototype._updateFromDocument = async function (e) {
        if (
          (e !== this._doc &&
            ((this._flow = null),
            (this._fileId = null),
            (this._status = null),
            (this._doc = e),
            (this._collaboratorRoleList = null),
            (this._collaboratorList = null)),
          this._doc &&
            this._doc.getId() &&
            this._doc.getStorageItem() &&
            this._doc.isCollaborative())
        ) {
          this._fileId = this._doc.getId();
          const e = await this._doc
            .getStorageItem()
            .getOrCreateCollaborativeFile();
          e && this._setStatus(e.status) && this.trigger(new f.UpdateEvent());
        } else this._setStatus(null) && this.trigger(new f.UpdateEvent());
      }),
      (f.prototype._setStatus = function (e) {
        return (
          this._status !== e &&
          ((this._status = e),
          (void 0 !== this._status && null !== this._status) ||
            (this._status = u.IN_REVIEW),
          void 0 !== c && c.constructor && (this._flow = new c(this._status)),
          !0)
        );
      }),
      (f.prototype._isCurrentUserApprover = function () {
        const e = gDesigner.getSyncUser();
        if (!e) return !1;
        if (!this._collaboratorList) return !1;
        const t = this._collaboratorList.find((t) => t.getUID() === e.getUID());
        return t && t.getRole().is(r.ROLES.APPROVER_ROLE);
      }),
      (f.prototype._shouldStatusDisabledForApproverWithCurrentStatus =
        function (e) {
          if (this._isCurrentUserApprover())
            switch (this._status) {
              case u.IN_REVIEW:
              case u.REOPENED:
                return !0;
              case u.APPROVED:
                return e === u.IN_REVIEW || e === u.AWAITING_APPROVAL;
              case u.AWAITING_APPROVAL:
                return e === u.IN_REVIEW;
            }
          return !1;
        }),
      (f.prototype.getStatus = function () {
        return this._status;
      }),
      (f.prototype.updateReviewStatus = function (e) {
        return this.canUpdateToStatus(e) && this._fileId
          ? d.updateStatus(this._fileId, e)
          : Promise.reject(
              o.GLocale.get(
                new o.GLocaleKey(
                  "GFileReviewManager",
                  "text.cant-update-file-to-status"
                )
              )
            );
      }),
      (f.prototype.canUpdateToStatus = function (e) {
        return (
          !!this._flow &&
          (this._isCurrentUserApprover()
            ? !this._shouldStatusDisabledForApproverWithCurrentStatus(e)
            : this._flow.canMoveTo(e))
        );
      }),
      (f.prototype._updateCollaboratorRoleListIfInitialized =
        async function () {
          this._canUpdateCollaboratorList() &&
            this._collaboratorRoleList &&
            (await this._updateCollaboratorRoleList());
        }),
      (f.prototype._canUpdateCollaboratorList = function () {
        return this._doc && this._fileId;
      }),
      (f.prototype._updateCollaboratorRoleList = async function () {
        if (!this._canUpdateCollaboratorList()) return;
        const e = await gDesigner
          .getShareManager()
          .getCollaboratorsCached(this._doc);
        e &&
          ((this._collaboratorList = e),
          (this._collaboratorRoleList = e.map((e) => e.getRole())));
      }),
      (f.prototype.hasApprovers = async function () {
        return (
          !(!this._doc || !this._fileId) &&
          (this._collaboratorRoleList ||
            (await this._updateCollaboratorRoleList()),
          this._collaboratorRoleList.some((e) => e.is(r.ROLES.APPROVER_ROLE)))
        );
      }),
      (f.prototype.getDocumentReviewHistory = async function (e) {
        const t = await d.annotations.getDesignHistory(e).catch(() => []),
          n = [];
        for (let e = 0; e < t.length; e++) {
          const o = t[e],
            i = g.from(o);
          h.includes(i.getAction()) && n.push(i);
        }
        return n;
      }),
      (e.exports = f);
  }