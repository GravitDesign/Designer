/**
 * Webpack Module #220
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(19), n(96), n(30), n(8), n(4), n(41), n(13), n(26);
    var i = n(1),
      a = n(10),
      r = o(n(336)),
      s = o(n(44)),
      l = n(40),
      c = o(n(554)),
      d = o(n(555)),
      u = n(237),
      p = n(119);
    const g = n(436),
      h = n(86);
    var f = a.FILE_FORMATS.find((e) => e.default),
      m = a.FILE_FORMATS.filter((e) => !e.default);
    const y = n(435),
      v = n(165);
    function _(e) {
      return fetch(a.gApi.url + "/error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.assign(e, { ua: window.navigator.userAgent })
        ),
      });
    }
    function b() {}
    i.GObject.inherit(b, u),
      (b.ProgressStages = {
        Preparing: 0,
        SyncingImages: 50,
        UploadingFile: 100,
      }),
      (b.from = async function (e, t, n, o, i) {
        let a = t;
        return (
          "string" == typeof t &&
            (a = await p.getFileDataForVersionOrAutoSave(t, o, i)),
          a
            ? new b.Item(e, a.id, n || a.name, a, o || a.version, null, i)
            : null
        );
      }),
      (b.Item = function (e, t, n, o, i, a, r) {
        if (
          (u.Item.call(this, e),
          (this._filename = n),
          (this._id = t),
          (this._file = o && p.convertToCloudItem(o)),
          (this._versionId = i),
          (this._token = a),
          (this._isAutoSave = "boolean" == typeof r ? r : !(!o || !o.autosave)),
          (this._fileLastModifiedDate = o && new Date(o.updated || o.created)),
          (this._fileAutoSaveLastModifiedDate =
            o && new Date(o.autosave_updated)),
          o && m.length)
        ) {
          var s = null;
          o.type
            ? (s = m.find((e) => e.type === this._file.getMimeType()))
            : this._file.getExtension() &&
              (s = m.find((e) => e.ext === this._file.getExtension())),
            s && ((this._ext = s.ext.toUpperCase()), (this._type = s.type));
        }
      }),
      i.GObject.inheritAndMix(b.Item, u.Item, [g]),
      (b.Item.prototype._filename = null),
      (b.Item.prototype._ext = null),
      (b.Item.prototype._type = null),
      (b.Item.prototype._id = null),
      (b.Item.prototype._file = null),
      (b.Item.prototype._versionId = null),
      (b.Item.prototype._token = null),
      (b.Item.prototype._isAutoSave = null),
      (b.Item.prototype.isRegistrable = function () {
        return !!this.getId();
      }),
      (b.Item.prototype.getId = function () {
        return this._id;
      }),
      (b.Item.prototype.isVersionAutoSave = function () {
        return this._isAutoSave;
      }),
      (b.Item.prototype.getToken = function () {
        return this._token;
      }),
      (b.Item.prototype.getFullName = function () {
        return this._filename;
      }),
      (b.Item.prototype.getName = function () {
        return i.GUtil.xss(this._filename);
      }),
      (b.Item.prototype.getVersionId = function () {
        return this._versionId || null;
      }),
      (b.Item.prototype.setVersionId = function (e) {
        this._versionId = e;
      }),
      (b.Item.prototype.storeFileFormatVersion = function (e) {
        return (
          (this._fileFormatVersion = e),
          this.supportsSharing()
            ? a.gApi.updateFileFormat(this.getId(), {
                fileFormat: this._fileFormatVersion,
              })
            : Promise.resolve()
        );
      }),
      (b.Item.prototype.setCollaborativeFileStatus = async function (e) {
        if (this._file.status !== e) {
          var t = this._file.status;
          (this._file.status = e),
            gDesigner.hasEventListeners(r.default.FileStatusUpdate) &&
              gDesigner.trigger(new r.default.FileStatusUpdate(this, t, e));
        }
      }),
      (b.Item.prototype.getCollaborativeFile = async function () {
        return this._file;
      }),
      (b.Item.prototype.setFileName = function (e) {
        this._filename = e;
      }),
      (b.Item.prototype.getOrCreateCollaborativeFile = async function () {
        return gDesigner
          .getCloudCommunicationManager()
          .getFileExtended(this.getId());
      }),
      (b.Item.prototype.getExtension = function () {
        return this._ext || f.ext.toUpperCase();
      }),
      (b.Item.prototype.getType = function () {
        return this._type || f.type;
      }),
      (b.Item.prototype.setFile = function (e) {
        if (!e) throw new Error("File can not be null");
        const t = this._file && this._file.status,
          n = new a.FileExtended(e);
        (this._file = p.convertToCloudItem(e)),
          (this._id = e.id),
          (this._name = e.name),
          (this._versionId = e.version),
          (this._fileLastModifiedDate = new Date(e.updated)),
          (this._fileAutoSaveLastModifiedDate = new Date(e.autosave_updated)),
          (this._isAutoSave = !!n.isAutoSave()),
          this._file.status !== t &&
            null != t &&
            gDesigner.hasEventListeners(r.default.FileStatusUpdate) &&
            gDesigner.trigger(
              new r.default.FileStatusUpdate(this, t, this._file.status)
            );
      }),
      (b.Item.prototype.getFile = function () {
        return this._file;
      }),
      (b.Item.prototype.read = async function (e, t) {
        if (!this._file.url) {
          const e = await p.getFileDataForVersionOrAutoSave(
            this._id,
            this._versionId,
            this._isAutoSave
          );
          this._file.url = e.url;
        }
        p.loadDesignData(
          this._id,
          !0,
          this._versionId,
          this._token,
          this._file,
          this._isAutoSave
        )
          .then((t) => {
            e(t.data);
          })
          .catch(t);
      }),
      (b.Item.prototype.supportsSharing = function () {
        let e = !0;
        return this._id || (e = !1), e;
      }),
      (b.Item.prototype._canPerformExtensionSpecificWrite = function () {
        return !1;
      }),
      (b.Item.prototype._performExtensionSpecificWrite = async function () {}),
      (b.Item.prototype._syncPreviewThumbnailWithCloud = async function (e) {
        if (e)
          try {
            const t = await c.default.fromBlob(e);
            await this._uploadThumbnail(t, !1);
          } catch (e) {
            console.warn(
              "GCloudStorage.Item.prototype._performDefaultWrite",
              "_uploadThumbnail",
              e
            );
          }
      }),
      (b.Item.prototype._performDefaultWrite = async function (e, t, n, o, i) {
        e.updateStatus(h.Saving);
        const s = (e) => {
          o && o(e);
        };
        return p
          .syncCloudImages(e, this._id, i, (e) => {
            s(
              d.default.calculateProgress(
                b.ProgressStages.Preparing,
                b.ProgressStages.SyncingImages,
                e
              )
            );
          })
          .then((o) => {
            let [c] = o;
            return (async () => {
              if (!c)
                return (
                  _({
                    message: "[cloud] scene is null",
                    stack: "id: ".concat(this._id, "\nscene: ").concat(c),
                  }),
                  (this._writing = !1),
                  n && n("scene is null")
                );
              try {
                const u = v.gzip(c, { level: 9 }),
                  p = u.hasOwnProperty("size") ? u.size : u.length;
                if (p <= 0)
                  return (
                    _({
                      message: "[cloud] empty scene/blob",
                      stack: "id: ".concat(this._id, "\nscene: ").concat(c),
                    }),
                    (this._writing = !1),
                    n && n("empty blob")
                  );
                const g = v.ungzip(u, { to: "string" });
                if ((this._verifyFileNotTooSmall(p, e), !g))
                  return (
                    _({
                      message: "[cloud] invalid Scene",
                      stack: "id: "
                        .concat(this._id, "\nscene original: ")
                        .concat(c, "\nscene parsed: ")
                        .concat(g),
                    }),
                    (this._writing = !1),
                    n &&
                      n(
                        "Scene invalid, sending error, please try again or submit a bug issue on https://discuss.gravit.io"
                      )
                  );
                var o = y.base64(u);
                const m = await e.buildPreview().catch(() => null),
                  w = await a.gApi.signedPutUrls(this._id, {
                    type: f.type,
                    md5: o,
                    commit: !1,
                  }),
                  C = await this._uploadWithProgress(w.url, {
                    method: "PUT",
                    headers: {
                      "Content-Type": f.type,
                      "Content-Encoding": "gzip",
                      "Cache-Control": "public,max-age=31536000",
                      "Content-MD5": o,
                    },
                    body: u,
                    onProgress: (e) => {
                      s(
                        d.default.calculateProgress(
                          b.ProgressStages.SyncingImages,
                          b.ProgressStages.UploadingFile,
                          e
                        )
                      );
                    },
                  });
                if (C.status >= 400)
                  return (
                    e.updateStatus(h.SaveFailed),
                    (this._writing = !1),
                    400 === C.status
                      ? n &&
                        n(
                          "Invalid response, probably corrupted upload: " +
                            C.status
                        )
                      : n && n("Invalid response status: " + C.status)
                  );
                await this._syncPreviewThumbnailWithCloud(m);
                const x = a.COMPUTE_SHA256_FOR_FILES
                  ? await (0, l.getFileSHA256Digest)(u)
                  : null;
                await a.gApi.commitManualFileUpdate(this._id, [
                  a.FileTypes.MainFile,
                  a.FileTypes.ThumbnailPreview,
                ]),
                  await a.gApi.updateFile(this._id, { trashed: !1, sha256: x }),
                  this.setVersionId(null),
                  gDesigner.hasEventListeners(r.default) &&
                    gDesigner.trigger(
                      new r.default(r.default.Type.VersionUpdate, this)
                    ),
                  e.updateStatus(h.Saved, i),
                  t && t(),
                  (this._writing = !1);
              } catch (t) {
                (this._writing = !1), e.updateStatus(h.SaveFailed), n && n(t);
              }
            })();
          })
          .catch((e) => {
            n(e), (this._writing = !1);
          });
      }),
      (b.Item.prototype.write = async function (e, t, n, o, a) {
        if ((gContainer.verifyEnoughMemoryToSave(e), !this._writing)) {
          if (!e.hasPagesWithInfiniteEmptyCanvas()) {
            this._writing = !0;
            try {
              await this._checkUserQuotaLimit();
            } catch (e) {
              return n && n(e), void (this._writing = !1);
            }
            return this._canPerformExtensionSpecificWrite()
              ? this._performExtensionSpecificWrite(e, t, n, o, a)
              : this._performDefaultWrite(e, t, n, o, a);
          }
          n
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
            : s.default.alert(
                i.GLocale.get(
                  new i.GLocaleKey(
                    "GCommonNames",
                    "text.error-emtpy-infinite-canvas"
                  )
                )
              );
        }
      }),
      (b.Item.prototype.createOrUpdateFileWithMetadata = async function (e, t) {
        if (!this._writing) {
          this._writing = !0;
          try {
            await this._checkUserQuotaLimit(),
              await this._createFileInCaseNew(),
              await this._uploadBinary(e),
              await this._uploadThumbnail(t.thumbnail),
              await this._makeFileVisibleUpdateInternalVersionAndHash(e),
              await this._updateFileAfterSave();
          } finally {
            this._writing = !1;
          }
        }
      }),
      (b.Item.prototype._makeFileVisibleUpdateInternalVersionAndHash =
        async function (e) {
          const t = a.COMPUTE_SHA256_FOR_FILES
              ? await (0, l.getFileSHA256Digest)(e)
              : null,
            n = { trashed: !1 };
          t && (n.sha256 = t);
          const o = await a.gApi.updateFile(this.getId(), n);
          this.setVersionId(o.versionId);
        }),
      (b.Item.prototype._updateFileAfterSave = async function () {
        const e = await a.gApi.getFile(this._id);
        (this._fileLastModifiedDate = new Date(e.updated)),
          (this._file = p.convertToCloudItem(e));
      }),
      (b.Item.prototype._isNewFile = function () {
        return !this.getId();
      }),
      (b.Item.prototype._createFileInCaseNew = async function () {
        if (this._isNewFile()) {
          const e = await a.gApi.createFile({
              name: this.getName(),
              parent: this._file.getParentId(),
              type: this.getType(),
              app: "designer",
              trashed: null,
            }),
            t = await a.gApi.getFile(e.id, !0);
          (this._id = this._file.id = e.id),
            (this._fileLastModifiedDate = new Date(t.updated || t.created)),
            this._file.setModificationTime(new Date(t.updated || t.created));
        }
      }),
      (b.Item.prototype._uploadBinary = async function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        const n = y.base64(e),
          o = await a.gApi.signedPutUrls(this.getId(), {
            type: this.getType(),
            md5: n,
          }),
          i = await fetch(o.url, {
            method: "PUT",
            headers: Object.assign(
              {
                "Content-Type": this.getType(),
                "Cache-Control": "public,max-age=31536000",
                "Content-MD5": n,
              },
              t
            ),
            body: e,
          });
        if (i.status >= 400) {
          if (400 === i.status)
            throw new Error(
              "Invalid response, probably corrupted upload: " + i.status
            );
          throw new Error("Invalid response status: " + i.status);
        }
      }),
      (b.Item.prototype._uploadThumbnail = async function (e, t) {
        if (e)
          return p.updateFileThumbnail(
            this.getId(),
            e.getImageAsBlob(),
            e.getMimeType(),
            t
          );
      }),
      (b.Item.prototype._checkUserQuotaLimit = async function () {
        const { pro: e, free: t } = gDesigner.getLicense().getQuotas(),
          n = gDesigner.isEnabledProFeatures() ? e : t;
        if (n > 0) {
          if ((await a.gApi.quota()) > n) {
            const e = new Error(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GCommonNames",
                  "text.running-out-of-cloud-space"
                )
              )
            );
            throw ((e.code = 507), e);
          }
        }
      }),
      n(1100)(b),
      (b.Item.prototype.getUniqueId = function () {
        return this._id;
      }),
      (b.Item.prototype.hasUpdates = async function () {
        if (!this.getUniqueId()) return !1;
        let e = await this.getLatestFileInfo();
        const t = e.getModificationTime() || e.updated || e.created,
          n =
            this._file.getModificationTime() ||
            this._file.updated ||
            this._file.created;
        (this._fileLastModifiedDate &&
          !isNaN(this._fileLastModifiedDate.getTime())) ||
          (this._fileLastModifiedDate = new Date(n)),
          (this._fileAutoSaveLastModifiedDate &&
            !isNaN(this._fileAutoSaveLastModifiedDate.getTime())) ||
            (this._fileAutoSaveLastModifiedDate = new Date(
              this._file.autosave_updated
            ));
        return (
          (e.autosave
            ? Math.max(
                new Date(t).getTime(),
                new Date(e.autosave_updated).getTime()
              )
            : new Date(t).getTime()) >
          (this._file.autosave
            ? Math.max(
                this._fileLastModifiedDate.getTime(),
                this._fileAutoSaveLastModifiedDate.getTime()
              )
            : this._fileLastModifiedDate.getTime())
        );
      }),
      (b.Item.prototype.getLatestFileInfo = async function () {
        const e = await gDesigner
          .getCloudCommunicationManager()
          .getFile(this._id);
        return p.convertToCloudItem(e);
      }),
      (b.Item.prototype.exists = async function () {
        return p.fileExists(this._id);
      }),
      (b.Item.prototype._uploadWithProgress = function (e, t) {
        return new Promise((n, o) => {
          const i = new XMLHttpRequest();
          if ((i.open(t.method || "PUT", e), t.headers))
            for (let e in t.headers) i.setRequestHeader(e, t.headers[e]);
          (i.onload = () => n(i)),
            (i.onerror = () => o(i)),
            i.upload &&
              t.onProgress &&
              (i.upload.onprogress = (e) => {
                t.onProgress(e.loaded / e.total);
              }),
            i.send(t.body);
        });
      }),
      (e.exports = b);
  }