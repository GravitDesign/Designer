/**
 * Webpack Module #556
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58),
      n(30),
      n(57),
      n(8),
      n(196),
      n(356),
      n(20),
      n(3),
      n(34),
      n(4),
      n(41),
      n(13),
      n(97);
    var i = n(1),
      a = n(40),
      r = o(n(847)),
      s = o(n(848)),
      l = o(n(44)),
      c = n(10),
      d = o(n(787)),
      u = o(n(789)),
      p = o(n(555));
    const g = n(388),
      h = n(119),
      f = n(595),
      m = n(336),
      y = n(436),
      v = n(78),
      _ = n(156),
      b = n(389),
      w = n(86),
      C = n(790),
      x = n(554),
      { FILE_FORMATS: S } = n(10),
      E = Object.values(S).find((e) => e.default),
      A = 10,
      T = 50,
      G = 80,
      P = 100;
    function D() {}
    i.GObject.inherit(D, g),
      (D.getSupportedFileFormats = function () {
        return b.getFileTypesArray().filter((e) => e.load);
      }),
      (D.convertToCloudItem = function (e) {
        var t = _.from(e);
        if (
          ((t.updated = e.modifiedTime),
          (t.created = e.createdTime),
          (t.storage = _.Storage.GoogleDrive),
          !t.kind ||
          (t.kind !== s.default.Kind.TeamDrive &&
            t.kind !== s.default.Kind.Drive)
            ? t.mimeType === s.default.MimeType.Folder
              ? t.setItemType(_.Type.Folder)
              : (t.setItemType(_.Type.File),
                t.setVersion(e.version),
                t.setModificationTime(e.modifiedTime))
            : t.setItemType(_.Type.CorporateStorage),
          t.mimeType && (t.type = t.mimeType),
          t.fileExtension)
        ) {
          (t.extension = t.fileExtension),
            (t.name = e.name.replace(
              new RegExp(".(".concat(t.extension, ")$"), "i"),
              ""
            ));
          const n = D.getSupportedFileFormats().find(
            (e) => e.ext.toLowerCase() === t.fileExtension.toLowerCase()
          );
          n && ((t.type = n.type || n.mime), t.setMimeType(t.type));
        }
        return (
          t.capabilities &&
            (t.capabilities.canDownload &&
              (t.setPermission(_.Permission.Download),
              t.setPermission(_.Permission.Open)),
            t.capabilities.canEdit && t.setPermission(_.Permission.Editing)),
          t.parent || (t.parent = null),
          t.hasThumbnail && t.setPreviewURL(t.thumbnailLink),
          t.size && t.setSize(t.size),
          t
        );
      }),
      (D.Item = function (e, t, n) {
        let o =
          arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : null;
        g.Item.call(this, e, t),
          (this._rawData = n),
          (this._token = o),
          t && (this._setExtension(), t.version && (this._version = t.version));
      }),
      i.GObject.inheritAndMix(D.Item, g.Item, [y]),
      (D.Item.prototype._version = null),
      (D.Item.prototype._writing = !1),
      (D.Item.prototype.setFile = function (e) {
        if (!e) throw "File is incorrect";
        e instanceof _ || (e = D.convertToCloudItem(e));
        const t = this._getOrCreateClient(),
          n = t && t.getTokenIssuerSettings();
        !e.settings && n && (e = Object.assign(e, { settings: n })),
          g.Item.prototype.setFile.call(this, e),
          this._setExtension(),
          this._setVersion(e.version);
      }),
      (D.Item.prototype.isVersionNewerThan = function (e) {
        if (e instanceof D.Item && this.getUniqueId() === e.getUniqueId()) {
          var t = this.getVersion() > e.getVersion(),
            n = e.getFile();
          const i = this.getFile();
          if (t && o(i.modifiedTime, n.modifiedTime)) return !0;
          const a = i.getVersion() > n.getVersion(),
            r = o(i.getModificationTime(), n.getModificationTime());
          if (a && r) return !0;
        }
        return !1;
        function o(e, t) {
          return new Date(e).getTime() > new Date(t).getTime();
        }
      }),
      (D.Item.prototype.supportsShadowFile = function () {
        const e = this._getOrCreateClient();
        return !!e && e.isCorporate();
      }),
      (D.Item.prototype.getCollaborativeFile = async function () {
        if (!this.supportsShadowFile()) throw "Not the collaborative mode";
        return (
          (this._collaborativeFile = await gDesigner
            .getCloudCommunicationManager()
            .getExternalFile(this.getId())
            .catch(() => null)),
          this._collaborativeFile
        );
      }),
      (D.Item.prototype.setCollaborativeFileStatus = async function (e) {
        if (!this.supportsShadowFile()) throw "Not the collaborative mode";
        const t = this._collaborativeFile
          ? this._collaborativeFile
          : await this.getCollaborativeFile();
        if (t && Number(t.status) !== Number(e)) {
          var n = t.status;
          (t.status = e),
            gDesigner.hasEventListeners(m.FileStatusUpdate) &&
              gDesigner.trigger(new m.FileStatusUpdate(this, n, e));
        }
      }),
      (D.Item.prototype.getOrCreateCollaborativeFile = async function () {
        if (!this.supportsShadowFile()) throw "Not the collaborative mode";
        var e = await this.getCollaborativeFile();
        return (
          e ||
            (await this.createShadowFile(),
            (e = await this.getCollaborativeFile())),
          e
        );
      }),
      (D.Item.prototype._app = c.FILE_ID_PREFIX.GOOGLEDRIVE),
      (D.Item.prototype.getId = function () {
        const e = this._getGoogleId();
        return e ? _.getCollaborativeFileId(e, _.Storage.GoogleDrive) : null;
      }),
      (D.Item.prototype._getGoogleId = function () {
        return this._id || null;
      }),
      (D.Item.prototype._setExtension = function () {
        const e = this.getFile();
        e &&
          (e.fileExtension
            ? (this._ext = e.fileExtension)
            : ["application/vnd.corel-draw", "application/cdr"].includes(
                e.mimeType
              )
            ? (this._ext = "CDR")
            : "application/des" === e.mimeType && (this._ext = "DES"));
      }),
      (D.Item.prototype._setFileSizeAfterSaved = async function () {
        return this._getOrCreateClient()
          .getFileDetails(this.getUniqueId())
          .then((e) => {
            this._fileSizeAfterSaved = e.Length;
          });
      }),
      (D.Item.prototype.write = async function (e, t, n, o, a) {
        gContainer.verifyEnoughMemoryToSave(e);
        try {
          if (this._writing) return;
          if (e.hasPagesWithInfiniteEmptyCanvas())
            return void (n
              ? n({
                  code: 507,
                  noFailCall: !0,
                  message: i.GLocale.get(
                    new i.GLocaleKey(
                      "GCommonNames",
                      "text.error-emtpy-infinite-canvas"
                    )
                  ),
                })
              : l.default.alert(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GCommonNames",
                      "text.error-emtpy-infinite-canvas"
                    )
                  )
                ));
          this._writing = !0;
          const h = e.getEditor().markSavePoint(),
            f = (e) => {
              h.rollback(), n && n(e);
            };
          try {
            const n = {};
            e.updateStatus(w.Saving, n);
            const l = o || n.progress,
              h = (e) => {
                l && l(e);
              };
            let m;
            var r = this.getExtension();
            const y = e.isNew();
            if (
              (h(A),
              i.GUtil.prepareForSaving(e.getScene(), r),
              "CDR" === r || "DES" === r)
            ) {
              var c = { progress: o, ext: r.toLowerCase() };
              m = await this._exportDocumentToCDR(e, c, a);
            } else {
              var d = e.getScene(),
                u = i.GNode.serialize(d, i.GUtil.extend({ save: !0 }, a));
              m = new Blob([u]);
            }
            h(T),
              this._verifyFileNotTooSmall(m.size, e),
              this._setFileSizeBeforeSaved(m.size);
            const _ = await this._buildGoogleMetadataForDoc(e),
              b = (e) => {
                h(p.default.calculateProgress(T, G, e));
              };
            var g = this._id ? this._id : null;
            await this._getOrCreateClient()
              .upload(g, m, _, s.default.DefaultUploadType, b)
              .then(async (n) => {
                this._updateInternalFileWithGoogleResponse(n);
                try {
                  await this._setFileSizeAfterSaved(),
                    this._verifyFileSizeAfterSaved();
                } catch (e) {
                  console.error(e);
                }
                if ((e.updateStatus(w.Saved), y && this.supportsShadowFile()))
                  return this.createShadowFile().then(() => {
                    gDesigner.hasEventListeners(v) &&
                      gDesigner.trigger(new v(v.Type.StorageItemUpdated, e)),
                      t && t();
                  });
                gDesigner.hasEventListeners(v) &&
                  gDesigner.trigger(new v(v.Type.StorageItemUpdated, e)),
                  h(P),
                  t && t();
              })
              .catch((t) => {
                e.updateStatus(w.SaveFailed), f(t);
              })
              .finally(() => {
                this._writing = !1;
              });
          } catch (e) {
            f(e);
          }
        } catch (t) {
          return e.updateStatus(w.SaveFailed), (this._writing = !1), n && n(t);
        }
      }),
      (D.Item.prototype.createOrUpdateFileWithMetadata = async function (e, t) {
        try {
          if (this._writing) return;
          this._writing = !0;
          const n = await this._buildGoogleMetadata(t),
            o = await this._getOrCreateClient().upload(
              this._getGoogleId(),
              new Blob([e]),
              n
            );
          this._updateInternalFileWithGoogleResponse(o);
        } finally {
          this._writing = !1;
        }
      }),
      (D.Item.prototype._updateInternalFileWithGoogleResponse = function (e) {
        this.setFile(
          Object.assign(D.convertToCloudItem(e), {
            settings: this._getOrCreateClient().getTokenIssuerSettings(),
          })
        );
      }),
      (D.Item.prototype._getOrCreateClient = function () {
        let e = this.getCloudClient();
        return (
          !e &&
            this._file &&
            ((e = new s.default(new f(this._file.settings))),
            this.setCloudClient(e)),
          e
        );
      }),
      (D.Item.prototype._getClient = function () {
        return this._getOrCreateClient();
      }),
      (D.Item.prototype._exportDocumentToCDR = function (e, t) {
        let n =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
        return new Promise(async (o, i) => {
          r.default.prepareCDRforSaving(
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
      (D.Item.prototype._setVersion = function (e) {
        this._version = e;
      }),
      (D.Item.prototype.getVersion = function () {
        return parseInt(this._version);
      }),
      (D.Item.prototype.read = async function (e, t) {
        if (this._rawData) {
          var n = this._rawData;
          return (this._rawData = null), e(n);
        }
        await this._getOrCreateClient()
          .getFile(this.getUniqueId(), this._getQuery())
          .then(async (t) => {
            const n = await this._getOrCreateClient().getFileDetails(
              this.getUniqueId(),
              this._getQuery()
            );
            this.setFile(n),
              this.supportsShadowFile() && (await this.syncShadowFile()),
              e(await h.createUint8ArrayFromBlob(t));
          })
          .catch((e) => t(e));
      }),
      (D.Item.prototype.getToken = function () {
        return this._token;
      }),
      (D.Item.prototype.getMimeType = function () {
        return this.getFile().mimeType;
      }),
      (D.Item.prototype.getPermissionsList = function () {
        return this._getOrCreateClient().getFilePermissions(this.getUniqueId());
      }),
      (D.Item.prototype.rolesMatch = function (e, t) {
        return d.default[e] === t || u.default[t] === e;
      }),
      (D.Item.prototype.getShareRole = async function (e) {
        return this._getOrCreateClient()
          .getFilePermissions(this.getUniqueId())
          .then((t) => {
            let n = null;
            return (
              t &&
                t.permissions &&
                t.permissions.length &&
                t.permissions.some((t) => {
                  let { email: o, role: i } = t;
                  if (e === o) return (n = i), !0;
                }),
              n
            );
          });
      }),
      (D.Item.prototype.requestExternalShare = function (e, t) {
        let n = !1;
        try {
          n = this._getOrCreateClient().isCorporate();
        } catch (e) {}
        return n
          ? e
            ? this._shareWithUser(e, t.getRole())
            : this._shareWithDomain(t.getRole())
          : Promise.reject(
              i.GLocale.get(
                new i.GLocaleKey("GGoogleDrive", "error.only-for-corporate")
              )
            );
      }),
      (D.Item.prototype.requestExternalUnShare = async function (e, t) {
        let n = !1;
        try {
          n = this._getOrCreateClient().isCorporate();
        } catch (e) {}
        if (!n)
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GGoogleDrive", "error.only-for-corporate")
            )
          );
        if (t && t.is(c.ShareRoles.NoAccess)) return Promise.resolve();
        const o = await this._getOrCreateClient().getShareIdForEmail(
          this.getUniqueId(),
          e
        );
        for (let e = 0, t = o.length; e < t; e++)
          try {
            const t = await this._getOrCreateClient().removeShare(
              this.getUniqueId(),
              o[e]
            );
            if (
              t.status !== c.gApi.HTTP_STATUS_CODES.OK &&
              t.status !== c.gApi.HTTP_STATUS_CODES.NO_CONTENT
            ) {
              const e =
                (t && t.error && t.error.message) ||
                i.GLocale.get(
                  new i.GLocaleKey("GGoogleDrive", "error.google-api-error")
                );
              return Promise.reject(e);
            }
          } catch (e) {
            return Promise.reject(e);
          }
        return Promise.resolve();
      }),
      (D.Item.prototype._shareWithUser = async function (e, t) {
        return this._getOrCreateClient().createOrUpdateUserShare(
          this.getUniqueId(),
          { role: t, emailAddress: e }
        );
      }),
      (D.Item.prototype.isEmailFromCorporateDomain = async function (e) {
        const t = gDesigner.getSyncUser();
        let n = !0;
        if (await this._getOrCreateClient().supportsEmailDomainCheck()) {
          (await this._getOrCreateClient()
            .getAccountByEmail(e)
            .catch(() => !1)) || (n = !1);
        } else c.gApi.sameDomain(t, { email: e }) || (n = !1);
        return n;
      }),
      (D.Item.prototype._shareWithDomain = async function (e) {
        const t = await gDesigner.getUser(),
          n = t && t.email.split("@")[1];
        return this._getOrCreateClient().createDomainShare(this.getUniqueId(), {
          role: e,
          domain: n,
        });
      }),
      (D.Item.prototype._setId = function (e) {
        (this._id = e), this._file && (this._file.id = e);
      }),
      (D.Item.prototype._buildGoogleMetadataForDoc = async function (e) {
        const t = new C();
        t.thumbnail = await x.fromBlob(await e.buildPreview());
        const n = e.getScene();
        t.unit = n.getProperty("ut");
        const o = n.getActivePage(),
          i = o && o.getGeometryBBox();
        return (
          i && ((t.width = i.getWidth()), (t.height = i.getHeight())),
          this._buildGoogleMetadata(t)
        );
      }),
      (D.Item.prototype._buildGoogleMetadata = async function (e) {
        const t = this._file.getExtension() || E.ext.toUpperCase(),
          n =
            this._file.getMimeType() ||
            ((o = t),
            Object.values(S).find((e) => {
              let { ext: t } = e;
              return !!t && t.toLowerCase() === o.toLowerCase();
            }) || E).type;
        var o;
        const i = e.thumbnail.getImageAsBlob(),
          a = await this._buildSafeEncodedBase64ForBlob(i),
          r = {
            name: this._file.getNameWithExtension(),
            mimeType: n,
            contentHints: {
              thumbnail: { mimeType: e.thumbnail.getMimeType(), image: a },
            },
            appProperties: {
              type: n,
              app: "designer",
              unit: e.unit,
              width: e.width,
              height: e.height,
              trashed: null,
            },
            viewedByMeTime: new Date().toISOString(),
          };
        return (
          this._file.parent &&
            !this.getUniqueId() &&
            (r.parents = [this._file.getParentId()]),
          this._isFromGSuite() && (r.driveId = this._getTeamDriveId()),
          r
        );
      }),
      (D.Item.prototype._buildSafeEncodedBase64ForBlob = function (e) {
        return new Promise((t, n) => {
          const o = new FileReader();
          (o.onload = (e) => {
            const n = e.target.result,
              o = n.substr(n.indexOf(",") + 1),
              i = (0, a.base64URLSafeEncode)(o);
            t(i);
          }),
            (o.onerror = function () {
              n(o.error);
            }),
            o.readAsDataURL(e);
        });
      }),
      (D.Item.prototype.hasVersionControl = function () {
        return !0;
      }),
      (D.Item.prototype.hasUpdates = async function () {
        if (!this.getUniqueId() || !this.getVersion()) return !1;
        const e = await this._getOrCreateClient().getFileDetails(
          this.getUniqueId(),
          this._getQuery()
        );
        return new D.Item(this.getStorage(), e).isVersionNewerThan(this);
      }),
      (D.Item.prototype._getQuery = function () {
        return this._isFromGSuite() ? { supportsAllDrives: !0 } : {};
      }),
      (D.Item.prototype._isFromGSuite = function () {
        return !!this._getTeamDriveId();
      }),
      (D.Item.prototype._getTeamDriveId = function () {
        const e = this._file.driveId;
        if (e) return e;
        const t = this._file.parent && this._file.parent.driveId;
        return t || null;
      }),
      (D.Item.prototype.getLatestFileVersion = async function () {
        const e = this._getOrCreateClient(),
          t = await this.getLatestFileInfo(),
          n = await e.getFile(this.getUniqueId(), this._getQuery()),
          o = await h.createUint8ArrayFromBlob(n),
          i = new D.Item(this._storage, t, o);
        return i.setCloudClient(e), i;
      }),
      (D.Item.prototype.getLatestFileInfo = async function () {
        const e = await this._getOrCreateClient().getFileDetails(
          this.getUniqueId(),
          this._getQuery()
        );
        return D.convertToCloudItem(e);
      }),
      (D.Item.prototype.exists = function () {
        return this._getOrCreateClient().fileExists(
          this.getUniqueId(),
          this._getQuery()
        );
      }),
      (D.Item.prototype.toString = function () {
        return "[Object GGoogleDriveStorage.Item]";
      }),
      (e.exports = D);
  }