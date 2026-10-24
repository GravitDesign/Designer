/**
 * Webpack Module #1152
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58), n(30), n(8), n(196), n(3);
    var i = n(1),
      a = n(847),
      r = o(n(1239)),
      s = o(n(388)),
      l = o(n(1481)),
      c = n(10),
      d = o(n(594));
    const u = n(86),
      p = n(336),
      g = n(436),
      h = n(78),
      f = n(156),
      m = 10,
      y = 50,
      v = 80,
      _ = 100;
    function b() {}
    i.GObject.inherit(b, s.default),
      (b.Item = function (e, t) {
        let n =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : null;
        s.default.Item.call(this, e, t),
          (this._ext = null),
          (this._token = n),
          this._setExtension(),
          g.call(this, c.FILE_ID_PREFIX.SHAREPOINT);
      }),
      i.GObject.inheritAndMix(b.Item, s.default.Item, [g]),
      (b.Item.prototype._app = c.FILE_ID_PREFIX.SHAREPOINT),
      (b.Item.prototype.getId = function () {
        const e = this._getSharepointId();
        return e ? "".concat(this._app, "_").concat(e) : null;
      }),
      (b.Item.prototype.setFile = function (e) {
        e &&
          ((e.storage = f.Storage.SharePoint),
          !e.relativeUrl &&
            e instanceof f &&
            (e.relativeUrl =
              e.parent &&
              e.parent.relativeUrl + "/" + e.getNameWithExtension())),
          s.default.Item.prototype.setFile.call(this, e);
      }),
      (b.Item.prototype._getSharepointId = function () {
        return this._id ? this._id : null;
      }),
      (b.Item.prototype.getCollaborativeFile = async function () {
        return (
          (this._collaborativeFile = await gDesigner
            .getCloudCommunicationManager()
            .getExternalFile(this.getId())
            .catch(() => null)),
          this._collaborativeFile
        );
      }),
      (b.Item.prototype.setCollaborativeFileStatus = async function (e) {
        const t = this._collaborativeFile;
        if (t && t.status !== e) {
          var n = t.status;
          (t.status = e),
            gDesigner.hasEventListeners(p.FileStatusUpdate) &&
              gDesigner.trigger(new p.FileStatusUpdate(this, n, e));
        }
      }),
      (b.Item.prototype.getOrCreateCollaborativeFile = async function () {
        var e = await this.getCollaborativeFile();
        return (
          e ||
            (await this.createShadowFile(),
            (e = await this.getCollaborativeFile())),
          e
        );
      }),
      (b.Item.prototype.read = function (e, t) {
        const n = this.getFile();
        if (this._rawData) {
          var o = this._rawData;
          return (this._rawData = null), e(o);
        }
        return function o() {
          let i =
            arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
          return this._getClient()
            .getFile(n)
            .then(async (t) => {
              const o = r.default.convertFileToCloudItem(
                await this._getClient().getFileDetails(this.getFile())
              );
              (o.status = n.status),
                (o.checkOutStatus = n.checkOutStatus),
                this.setFile(o),
                this._setExtension(),
                await this.syncShadowFile(),
                e(t);
            })
            .catch((e) => {
              const { id: a } = n;
              return !i && e && e.status && 404 === e.status && a
                ? this._getClient()
                    .findFileById(a)
                    .then((e) => {
                      let { relativeUrl: t, name: i, type: a } = e;
                      const r = Object.assign(n, {
                        name: i,
                        relativeUrl: t,
                        type: a,
                      });
                      return (
                        this.setFile(r),
                        this._setExtension(),
                        this.updateShadowFile(),
                        o.call(this, !0)
                      );
                    })
                    .catch(r)
                : r();
              function r() {
                if (!t) throw e;
                t(e);
              }
            });
        }.call(this);
      }),
      (b.Item.prototype.isVersionNewerThan = function (e) {
        if (
          e instanceof b.Item &&
          this.getFile().id === e.getFile().id &&
          new Date(this.getFile().updated) > new Date(e.getFile().updated)
        )
          return !0;
        const t = this.getFile(),
          n = e.getFile();
        return (
          new Date(t.getModificationTime()).getTime() >
          new Date(n.getModificationTime()).getTime()
        );
      }),
      (b.Item.prototype.hasVersionControl = function () {
        return !0;
      }),
      (b.Item.prototype.hasUpdates = async function () {
        const e = this.getFile();
        if (!this.getId() || !e || (!e.updated && !e.getModificationTime()))
          return !1;
        const t = await this.getLatestFileInfo();
        return new b.Item(this.getStorage(), t).isVersionNewerThan(this);
      }),
      (b.Item.prototype.getLatestFileVersion = async function () {
        let e = this._getClient();
        const t = this.getFile(),
          n = await this.getLatestFileInfo(),
          o = new b.Item(
            this.getStorage(),
            Object.assign(n, {
              settings: t.settings,
              relativeUrl: t.relativeUrl,
            })
          );
        return (o._rawData = await e.getFile(t)), o.setCloudClient(e), o;
      }),
      (b.Item.prototype.getLatestFileInfo = async function () {
        const e = this.getFile(),
          t = { relativeUrl: e.relativeUrl };
        if (!t.relativeUrl) {
          const n = e.getParent();
          n instanceof f &&
            (t.relativeUrl = ""
              .concat(n.relativeUrl, "/")
              .concat(e.getNameWithExtension()));
        }
        const n = await this._getClient().getFileDetails(t);
        return r.default.convertFileToCloudItem(n);
      }),
      (b.Item.prototype.exists = async function () {
        const e = this.getFile();
        return this._getClient().fileExists(
          e.getNameWithExtension(),
          e.getParent()
        );
      }),
      (b.Item.prototype._setFileSizeAfterSaved = async function (e) {
        return this._getClient()
          .getFileDetails(e)
          .then((e) => {
            this._fileSizeAfterSaved = e.size;
          });
      }),
      (b.Item.prototype.write = async function (e, t, n, o, a) {
        if (this._writing) return;
        this._writing = !0;
        let r = null;
        try {
          gContainer.verifyEnoughMemoryToSave(e),
            (r = e.getEditor().markSavePoint());
          const n = {};
          e.updateStatus(u.Saving, n);
          const s = o || n.progress,
            l = (e) => {
              s && s(e);
            },
            c = e.isNew();
          l(m), i.GUtil.prepareForSaving(e.getScene(), this.getExtension());
          const d = await this._getDocumentBlob(e, o, a);
          l(y),
            this._verifyFileNotTooSmall(d.size, e),
            this._setFileSizeBeforeSaved(d.size),
            await this._createOrUpdateFile(d),
            l(v),
            c && (await this.createShadowFile());
          try {
            await this._setFileSizeAfterSaved(this.getFile()).catch((e) => {
              console.error(e);
            }),
              this._verifyFileSizeAfterSaved();
          } catch (e) {
            console.error(e);
          }
          e.updateStatus(u.Saved),
            gDesigner.hasEventListeners(h) &&
              gDesigner.trigger(new h(h.Type.StorageItemUpdated, e)),
            await this._updateModificationTime(),
            l(_),
            t && t(this.getFile());
        } catch (t) {
          e.updateStatus(u.SaveFailed), r && r.rollback(), n && n(t);
        } finally {
          this._writing = !1;
        }
      }),
      (b.Item.prototype._getDocumentBlob = async function (e, t, n) {
        let o = null;
        if ("CDR" === this.getExtension() || "DES" === this.getExtension()) {
          var a = { progress: t, ext: this.getExtension().toLowerCase() };
          o = await this._exportDocumentToCDR(e, a, n);
        } else {
          var r = e.getScene(),
            s = i.GNode.serialize(r, i.GUtil.extend({ save: !0 }, n));
          o = new Blob([s]);
        }
        return o;
      }),
      (b.Item.prototype._checkHttpResponseAndThrowIfNecessary = function (e) {
        if (e.status >= c.HTTP_STATUS_CODES.BAD_REQUEST) {
          if (e.status === c.HTTP_STATUS_CODES.BAD_REQUEST)
            throw Error(
              "Invalid this.response, probably corrupted upload: " + e.status
            );
          throw Error("Invalid response status: " + e.status);
        }
      }),
      (b.Item.prototype._updateFileWithCreatedResponse = function (e) {
        const t = r.default.convertFileToCloudItem(e);
        (t.settings = f.GCloudSettings.from(this._getClient().getSettings())),
          this.setFile(Object.assign(this.getFile(), t));
      }),
      (b.Item.prototype._updateModificationTime = async function () {
        const e = this._getClient();
        if (this.getFile().relativeUrl) {
          const t = r.default.convertFileToCloudItem(
            await e.getFileDetails(this.getFile())
          );
          this.getFile().setModificationTime(t.updated),
            this.setFile(Object.assign(this.getFile(), { updated: t.updated }));
        }
      }),
      (b.Item.prototype.createOrUpdateFileWithMetadata = async function (e) {
        if (!this._writing) {
          this._writing = !0;
          try {
            await this._createOrUpdateFile(e);
          } finally {
            this._writing = !1;
          }
        }
      }),
      (b.Item.prototype._createOrUpdateFile = async function (e) {
        let t;
        const n = this._getClient(),
          o = e instanceof Blob ? e : new Blob([e]);
        this._getSharepointId()
          ? ((t = await n.updateFileContentById(this._getSharepointId(), o)),
            this._checkHttpResponseAndThrowIfNecessary(t))
          : ((t = await n.createFile(this.getFile(), o)),
            this._checkHttpResponseAndThrowIfNecessary(t),
            this._updateFileWithCreatedResponse(await t.json())),
          await async function () {
            const e = this.getFile(),
              t = this._getClient();
            let n = Object.assign(e, {
              settings: f.GCloudSettings.from(t.getSettings()),
            });
            e.relativeUrl ||
              (e.relativeUrl =
                e.parent &&
                e.parent.relativeUrl + "/" + e.getNameWithExtension());
            if (e.relativeUrl) {
              const o = await t.getFileDetails(e),
                i = r.default.convertFileToCloudItem(o);
              Object.assign(n, i);
            }
            this.setFile(n);
          }.call(this);
      }),
      (b.Item.prototype.getToken = function () {
        return this._token;
      }),
      (b.Item.prototype.checkOut = async function () {
        try {
          const e = this.getFile(),
            t = await this._getAndUpdateCheckOutFileStatus();
          if (this.isCheckedOutByMe()) return;
          if (t === r.default.FILE_STATUS.LOCKED)
            throw new d.default(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GSharePointStorage",
                  "text.error-failed-check-out-file"
                )
              )
            );
          await this._getClient().checkOutFile(e),
            this._setCheckOutStatus(r.default.FILE_STATUS.LOCKED_BY_ME);
        } catch (e) {
          throw e instanceof d.default
            ? e
            : new d.default(
                i.GLocale.get(
                  new i.GLocaleKey(
                    "GSharePointStorage",
                    "text.error-failed-check-out-file"
                  )
                )
              );
        }
      }),
      (b.Item.prototype.checkIn = async function (e, t) {
        try {
          const n = this.getFile();
          await this._getClient().checkInFile(n, e, t),
            await this._updateModificationTime(),
            this._setCheckOutStatus(r.default.FILE_STATUS.AVAILABLE),
            this._triggerStorageItemEvent(p.Type.FileCheckIn);
        } catch (e) {
          throw (
            (console.error("Error checking in", e),
            e instanceof d.default
              ? e
              : new d.default(
                  i.GLocale.get(
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GFilesPanelViewSharepoint",
                        "text.error-could-not-check-in"
                      )
                    )
                  )
                ))
          );
        }
      }),
      (b.Item.prototype._setCheckOutStatus = function (e) {
        const t = this.getFile();
        e === r.default.FILE_STATUS.AVAILABLE
          ? (t.checkedOut = !1)
          : (e !== r.default.FILE_STATUS.LOCKED_BY_ME &&
              e !== r.default.FILE_STATUS.LOCKED) ||
            (t.checkedOut = !0),
          (t.checkOutStatus = e),
          this._triggerStorageItemEvent(p.Type.FileUpdated);
      }),
      (b.Item.prototype.refreshCheckOutStatus = async function () {
        return (
          this._refreshCheckOutPromise ||
            ((this.getFile().checkOutStatus = r.default.FILE_STATUS.LOADING),
            (this._refreshCheckOutPromise =
              this._getAndUpdateCheckOutFileStatus().finally(() => {
                delete this._refreshCheckOutPromise;
              }))),
          this._refreshCheckOutPromise
        );
      }),
      (b.Item.prototype.isCheckedOutByMe = function () {
        return (
          this.getFile().checkOutStatus === r.default.FILE_STATUS.LOCKED_BY_ME
        );
      }),
      (b.Item.prototype.isCheckedOutLoading = function () {
        return this.getFile().checkOutStatus === r.default.FILE_STATUS.LOADING;
      }),
      (b.Item.prototype.isEditingEnabled = function () {
        return !c.msTeamsMode || this.isCheckedOutByMe();
      }),
      (b.Item.prototype._getAndUpdateCheckOutFileStatus = async function () {
        const e = await this._getCheckOutFileStatus();
        return this._setCheckOutStatus(e), this.getFile().checkOutStatus;
      }),
      (b.Item.prototype._triggerStorageItemEvent = async function (e) {
        gDesigner.hasEventListeners(p) && gDesigner.trigger(new p(e, this));
      }),
      (b.Item.prototype._getCheckOutFileStatus = async function () {
        const e = this.getFile();
        return e.checkOutStatus &&
          e.checkOutStatus !== r.default.FILE_STATUS.LOADING
          ? e.checkOutStatus
          : this._getClient().getCheckOutFileStatus(e);
      }),
      (b.Item.prototype.getMimeType = function () {
        return this.getFile().type;
      }),
      (b.Item.prototype.isEmailFromCorporateDomain = async function (e) {
        const t = this._getClient();
        return !!(await t.getAccountByEmail(e).catch(() => null));
      }),
      (b.Item.prototype._exportDocumentToCDR = function (e, t) {
        let n =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
        return new Promise(async (o, i) => {
          (0, a.prepareCDRforSaving)(
            e,
            function (e) {
              return i(e);
            },
            t,
            n,
            function (e) {
              return o(new Blob([e]));
            }
          );
        });
      }),
      (b.Item.prototype._getClient = function () {
        let e = this.getCloudClient();
        const t = this.getFile();
        return (
          !e &&
            t &&
            t.settings &&
            ((e = r.default.getInstance(t.settings)), this.setCloudClient(e)),
          e
        );
      }),
      (b.Item.prototype._setExtension = function (e) {
        const t = e || this.getFile();
        t &&
          t.type &&
          (["application/vnd.corel-draw", "application/cdr"].includes(t.type)
            ? (this._ext = "CDR")
            : "application/des" === t.type && (this._ext = "DES"));
      }),
      (b.Item.prototype.getMyPermissionsList = async function () {
        const e = this._getClient(),
          t = this.getFile(),
          { High: n, Low: o } = await e
            .getFileEffectiveBasePermissions(t)
            .catch(() => ({ High: 0, Low: 0 }));
        if (
          new l.default(n, o).hasPermission(l.default.Permissions.EditListItems)
        ) {
          const n = await e._getUser(),
            o = await e.getFileCreator(t);
          return [
            { email: n.getEmail(), role: c.ShareRoles.ContentEditor.id },
            { email: o.getEmail(), role: c.ShareRoles.Owner.id },
          ];
        }
        return [];
      }),
      (b.Item.prototype.toString = function () {
        return "[Object GSharePointStorage.Item]";
      }),
      (e.exports = b);
  }