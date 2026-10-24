/**
 * Webpack Module #1553
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(96), n(30), n(8), n(196), n(4), n(13), n(32), n(38), n(33);
    var i = n(1),
      a = o(n(163)),
      r = o(n(78)),
      s = o(n(86)),
      l = o(n(802)),
      c = o(n(355));
    const d = n(1554),
      u = n(1301),
      p = n(556),
      g = n(156),
      h = n(1555),
      f = n(848),
      m = n(595),
      y = n(520),
      v = n(119),
      { gApi: _, CloudIntegration: b } = n(10),
      { decrypt: w } = n(40),
      C = n(44);
    let x;
    function S() {
      let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
        t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
      l.default.call(this, e), (this._accountId = t);
      const {
        clientId: n = null,
        apiKey: o = null,
        appId: a = null,
        accessToken: r,
        expires: s,
        corporate: c = !1,
      } = this._settings;
      if (
        ((this._settings = Object.assign(this._settings, {
          clientId: n,
          apiKey: o,
          appId: a,
          accessToken: r,
          expires: s,
          corporate: c,
        })),
        this._settings.corporate &&
          (this._securityLevel = y.SecurityLevel.Highest),
        r &&
          (this._googleDriveClient = this._buildGoogleClient({
            accessToken: r,
            expires: s,
            corporate: c,
            accountId: t,
          })),
        (this._clientId = n),
        (this._apiKey = o),
        (this._appId = a),
        (this._folders = {}),
        this.isLowestSecurityLevel())
      ) {
        const e = async (e) =>
          this._googlePickerLoaded
            ? this._openFilePicker(e).catch(() =>
                C.alert(
                  i.GLocale.get(
                    new i.GLocaleKey("GCommonNames", "text.loading-failed")
                  )
                )
              )
            : gContainer
                .getGoogleAPI()
                .loadFilePicker()
                .then(() => {
                  this._googlePickerLoaded = !0;
                })
                .then(() => this._openFilePicker(e))
                .catch((e) => {
                  console.log("[GGoogleDrive error - Google Drive Picker]", e),
                    C.alert(
                      i.GLocale.get(
                        new i.GLocaleKey("GCommonNames", "text.loading-failed")
                      )
                    );
                });
        this.addAction({
          title: i.GLocale.get(
            new i.GLocaleKey("GGoogleDrive", "text.add-files")
          ),
          icon: "gravit-icon-add-files",
          execute: e,
        }),
          this.setDefaultEmptyMessage({
            title: i.GLocale.get(
              new i.GLocaleKey("GGoogleDrive", "text.you-have-not-added")
            ),
            buttons: [
              {
                title: i.GLocale.get(
                  new i.GLocaleKey("GGoogleDrive", "text.add-additional-files")
                ),
                execute: e,
              },
            ],
          }),
          this.addEventListener(l.default.DriveEvent, (t) => {
            if (t.type === l.default.DriveEvent.Type.Added) {
              const n = $("<div/>")
                .gDialog({
                  className: "g-googledrive-warning-dialog",
                  releaseOnClose: !0,
                })
                .append(
                  $("<div></div>")
                    .addClass("g-btn-close")
                    .append($("<span></span>").addClass("gravit-icon-close"))
                    .on("click", () => n.gDialog("close"))
                )
                .append(
                  $("<span/>").text(
                    i.GLocale.get(
                      new i.GLocaleKey("GGoogleDrive", "text.warning-message")
                    )
                  )
                )
                .append(
                  $("<div/>")
                    .addClass("buttons")
                    .append(
                      $("<button/>")
                        .addClass("g-highlight-button")
                        .text(i.GLocale.get(new i.GLocaleKey("GLocale", "ok")))
                        .on("click", () => n.gDialog("close"))
                    )
                    .append(
                      $("<button/>")
                        .addClass("g-highlight-button highlighted")
                        .text(
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GGoogleDrive",
                              "text.add-additional-files"
                            )
                          )
                        )
                        .on("click", () => {
                          e(t.source), n.gDialog("close");
                        })
                    )
                )
                .gDialog("open", !1);
            }
          });
      }
    }
    i.GObject.inherit(S, l.default),
      (S.LAST_TEAM_DRIVE_ID_PROP_NAME =
        (b &&
          b.cloudOptions &&
          (b.cloudOptions.find((e) => "googledrive" === e.type) || {})
            .lastTeamDrivePropName) ||
        null),
      (S.prototype._securityLevel = y.SecurityLevel.Lowest),
      (S.prototype._googlePickerLoaded = !1),
      (S.prototype._googleDriveClient = null),
      (S.prototype.CURRENT_FOLDER_PROP =
        "designer.filespanel.google-drive.current-folder"),
      (S.getInstance = function () {
        return x || (x = new S()), x;
      }),
      (S.prototype.setCorporateStorage = function (e) {
        if (
          (l.default.prototype.setCorporateStorage.call(this, e),
          S.LAST_TEAM_DRIVE_ID_PROP_NAME)
        ) {
          let t = null;
          e && ({ id: t } = e),
            this.saveLastTeamDriveId(S.LAST_TEAM_DRIVE_ID_PROP_NAME, t);
        }
      }),
      (S.prototype.getPreviousSelectedFolder = function () {
        return l.default.prototype.getPreviousSelectedFolder
          .apply(this, arguments)
          .then((e) => (e ? g.from(e) : e));
      }),
      (S.prototype._openFilePicker = function (e) {
        const t = this;
        async function n(e) {
          const n = t.getRootFolder();
          let o,
            i,
            a = !1;
          if ((({ parentId: o } = e[0]), o !== n.id))
            try {
              i = await t._googleDriveClient.getFileDetails(o);
            } catch (e) {
              (o = n.id), (a = !0);
            }
          return i || (i = n), { folder: i, showMessage: a };
        }
        async function o(e, o) {
          for (let n = 0; n < e.length; n++) {
            let o = e[n];
            const { id: i, type: a } = o;
            "folder" !== a &&
              (await t._googleDriveClient.updateFileDetails(i, {
                viewedByMeTime: new Date().toISOString(),
              }));
          }
          const { showMessage: a, folder: r } = await n(e);
          a &&
            C.messageWithInfo({
              mainMessage: i.GLocale.get(
                new i.GLocaleKey(
                  "GGoogleDrive",
                  "text.selected-files-folder-not-added"
                )
              ),
              infoMessage: i.GLocale.get(
                new i.GLocaleKey(
                  "GGoogleDrive",
                  "text.selected-files-folder-not-added-additional"
                )
              ),
            }),
            t.trigger(
              new l.default.DriveEvent(
                null,
                l.default.DriveEvent.Type.FolderSwitchRequired,
                { folder: r }
              )
            ),
            o();
        }
        return new Promise((t, a) => {
          if (!this.isSignedIn() || !this._googlePickerLoaded) return a();
          gContainer.getGoogleAPI().openFilePicker((r) => {
            if ((e.toggleLoading(!0), 1 === r.length)) {
              const s = r[0],
                { id: l, type: c } = s;
              "folder" !== c
                ? (n(r).then((e) => {
                    let { showMessage: t } = e;
                    t &&
                      C.messageWithInfo({
                        mainMessage: i.GLocale.get(
                          new i.GLocaleKey(
                            "GGoogleDrive",
                            "text.selected-file-folder-not-added"
                          )
                        ),
                        infoMessage: i.GLocale.get(
                          new i.GLocaleKey(
                            "GGoogleDrive",
                            "text.selected-files-folder-not-added-additional"
                          )
                        ),
                      });
                  }),
                  this.getFile(l)
                    .then((e) => this._convertToCloudItems(e).then((e) => e[0]))
                    .then(
                      (e) =>
                        new Promise((t, n) => {
                          if (this.isFileSupported(e)) return t(e);
                          C.alert(
                            i.GLocale.get(
                              new i.GLocaleKey(
                                "GDocument",
                                "text.unsupported-file-extension"
                              )
                            ),
                            n
                          );
                        })
                    )
                    .then((e) => this.openFile(e))
                    .then(() => e.close())
                    .then(t)
                    .catch(a)
                    .finally(() => e.toggleLoading(!1)))
                : o(r, t);
            } else o(r, t);
          }, a);
        });
      }),
      (S.prototype.hasUserProfile = function () {
        return !0;
      }),
      (S.prototype.isRootFolder = function (e) {
        e = void 0 !== e ? e : this.getCurrentFolder();
        var t = this.getRootFolder();
        return "string" == typeof e
          ? e === t.id
          : !e || (e && !e.id) || e === t || e.id === t.id;
      }),
      (S.prototype.getRootFolder = function () {
        return this.getCorporateStorage()
          ? this.getCorporateStorage()
          : g.from({
              id: "root",
              name: i.GLocale.get(
                new i.GLocaleKey("GFilesPanel", "action.my-cloud")
              ),
            });
      }),
      (S.prototype.uninstall = async function () {
        return new Promise(
          async (e) => (
            l.default.prototype.uninstall.call(this),
            this.isLowestSecurityLevel() &&
              this.isSignedIn() &&
              (await this.signOut()),
            e()
          )
        );
      }),
      (S.prototype.getUser = async function () {
        return new Promise(async (e, t) => {
          try {
            var n;
            if (this._settings.corporate) n = await gDesigner.getUser();
            else {
              if (!gContainer.getGoogleAPI().isLoaded())
                return t("Google Drive Client not loaded!");
              n = await gContainer.getGoogleAPI().getBasicProfile();
            }
            return e(n);
          } catch (e) {
            t(e);
          }
        });
      }),
      (S.prototype.install = function (e) {
        return this.isInstalled()
          ? Promise.resolve()
          : this.isLowestSecurityLevel()
          ? gContainer
              .getGoogleAPI()
              .install(e)
              .then(() => this._loadClient())
              .then(() => (this._driveInstalled = !0))
          : ((this._driveInstalled = !0), Promise.resolve());
      }),
      (S.prototype.isLowestSecurityLevel = function () {
        return this._securityLevel === y.SecurityLevel.Lowest;
      }),
      (S.prototype._loadClient = function () {
        return new Promise(async (e, t) => {
          const n = this.isLowestSecurityLevel()
            ? "https://www.googleapis.com/auth/drive.file         https://www.googleapis.com/auth/userinfo.email"
            : "https://www.googleapis.com/auth/drive";
          var o, a, r;
          try {
            if (this._apiKey && this._clientId)
              (a = this._clientId), (o = this._apiKey), (r = this._appId);
            else {
              var s =
                await _.cloudServices.googleDrive.getClientConfiguration();
              const {
                GOOGLE_DRIVE_PUBLIC_CLIENT_ID: e,
                GOOGLE_DRIVE_PUBLIC_API_KEY: t,
                GOOGLE_DRIVE_APP_ID: n,
              } = JSON.parse(w(s));
              (a = e),
                (o = t),
                (r = n),
                (this._apiKey = o),
                (this._clientId = a),
                (this._appId = r);
            }
          } catch (e) {
            return t(
              i.GLocale.get(
                new i.GLocaleKey("GCommonNames", "text.loading-failed")
              )
            );
          }
          gContainer
            .getGoogleAPI()
            .init({
              appId: r,
              apiKey: o,
              clientId: a,
              discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
              ],
              scope: n,
            })
            .then(
              () => {
                e();
              },
              (e) => {
                t(e);
              }
            );
        });
      }),
      (S.prototype.isSignedIn = async function () {
        return (
          gContainer.getGoogleAPI().isLoaded() ||
            console.error("Google Drive Client not loaded!"),
          gContainer.getGoogleAPI().isSignedIn()
        );
      }),
      (S.prototype.signIn = function () {
        return new Promise(async (e, t) =>
          gContainer.getGoogleAPI().isLoaded()
            ? (await this.isSignedIn())
              ? ((this._googleDriveClient = await this._buildGoogleClient()),
                e())
              : gContainer
                  .getGoogleAPI()
                  .signIn()
                  .then(async () => {
                    (this._googleDriveClient = await this._buildGoogleClient()),
                      e();
                  })
                  .catch((e) =>
                    e && "popup_blocked_by_browser" === e.error
                      ? t(
                          new c.default(
                            i.GLocale.get(
                              new i.GLocaleKey(
                                "GExternalStorage",
                                "text.error-window-blocked-alternative"
                              )
                            )
                          )
                        )
                      : t(e)
                  )
            : t("Google Drive Client not loaded!")
        );
      }),
      (S.prototype.signOut = function () {
        if (!gContainer.getGoogleAPI().isLoaded())
          throw Error("Google Drive Client not loaded!");
        return gContainer.getGoogleAPI().signOut();
      }),
      (S.prototype.fetchFolders = async function (e, t) {
        let n =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : -1;
        var o = t ? this._getParentReference(t) : this._getParentContext();
        return this._search(
          u.from({
            type: g.Type.Folder,
            limit: n > 0 ? n : 1e3,
            orderBy: S.SearchEngine.SortMap[e],
            parent: o,
          })
        ).then(async (e) => {
          this._currentPage = e;
          let n = e.getItems();
          return (
            this.isRootFolder(t) &&
              !this.PREVIOUS_SELECTED_FOLDER_PATH.length &&
              ((this._rootFolderID =
                n && n.length && "root" === n[0].getParentId()
                  ? n[0].parents[0]
                  : null),
              await this.generatePreviousSelectedFolderPath()),
            n
          );
        });
      }),
      (S.prototype._buildSearchQuery = function (e) {
        const t = new d();
        var n = e.hasValue("type") && e.type;
        const o = n === g.Type.Folder,
          i = n === g.Type.File;
        return (
          o
            ? t.add("mimeType", "=", f.MimeType.Folder)
            : i &&
              (t.group((e) => {
                this.getSupportedExtensions().forEach((t) =>
                  e.or("fileExtension", "=", t)
                ),
                  this.getSupportedMIMETypes().forEach((t) =>
                    e.or("mimeType", "=", t)
                  );
              }),
              this.shouldOnlyListOwnedFiles() && t.in("me", "owners")),
          e.hasValue("parent")
            ? "*" !== e.parent && t.in(e.parent, "parents")
            : t.in("root", "parents"),
          e.hasValue("name") && t.add("name", "contains", e.name),
          e.hasValue("exactname") && t.add("name", "=", e.exactname),
          e.hasValue("fileExtension") &&
            t.add("fileExtension", "=", e.fileExtension.toLowerCase()),
          t.add("trashed", "=", new d.RawValue(!1)),
          t.build()
        );
      }),
      (S.prototype._getParentContext = function () {
        return (
          this._getParentReference(this.getCurrentFolder()) ||
          this._getParentReference(this.getCorporateStorage())
        );
      }),
      (S.prototype.getFolders = function () {
        var e = {},
          t = this._getParentContext();
        return (
          t && (e[t] = { folder: { name: null, id: null, parent: null } }), e
        );
      }),
      (S.prototype._search = async function (e, t) {
        var n =
          (e.hasKey("limit") && e.getAsInt("limit")) || this.getQueryLimit();
        t = t || new h({ query: e });
        return new Promise(async (o, i) => {
          try {
            var a = {
                q: this._buildSearchQuery(e),
                pageSize: n - t.getSize(),
                fields:
                  "nextPageToken, files( id, driveId, parents, name, fileExtension, fullFileExtension, hasThumbnail, thumbnailLink, size, contentHints(thumbnail(image, mimeType)), description, mimeType, version, createdTime, modifiedTime, webContentLink, capabilities(canDownload, canEdit) )",
                pageToken:
                  (e.hasValue("nextPageToken") && e.nextPageToken) || "",
              },
              r = this.getCorporateStorage();
            r &&
              (a = Object.assign(a, {
                includeItemsFromAllDrives: !0,
                corpora: "drive",
                supportsAllDrives: !0,
                driveId: r.id,
              })),
              e.hasValue("orderBy") && (a.orderBy = e.orderBy);
            const i = await this._googleDriveClient.searchFiles(a);
            var { files: s, nextPageToken: l } = i;
            if (!s.length) return o(t);
            s =
              t.getSize() + s.length > n
                ? s.slice(0, Math.max(n - t.getSize(), 0))
                : s;
            var c = await this._convertToCloudItems(s);
            return (
              e.hasValue("parent") &&
                c.forEach((t) => {
                  t.parent = e.parent;
                }),
              t.update({ nextPageToken: l, items: c }),
              t.getSize() < n && l && (t = await this._search(e, t)),
              o(t)
            );
          } catch (e) {
            i();
          }
        });
      }),
      (S.prototype._convertToCloudItems = async function (e) {
        return (e = e instanceof Array ? e : [e]).map((e) =>
          p.convertToCloudItem(e)
        );
      }),
      (S.prototype.navigateToParentFolder = function () {
        var e = this._currentFolder.parent ? this._currentFolder.parent : null;
        return this.setCurrentFolder(this._getParentReference(e)), this;
      }),
      (S.prototype._getParentReference = function (e) {
        return e && "object" == typeof e ? e._id || e.id : e;
      }),
      (S.prototype.getFile = function (e) {
        return this._googleDriveClient.getFileDetails(
          e,
          this.getCorporateStorage() ? { supportsAllDrives: !0 } : {}
        );
      }),
      (S.prototype.getFolder = async function (e) {
        const t = await this._googleDriveClient.getFileDetails(
          e.id || e,
          this.getCorporateStorage() ? { supportsAllDrives: !0 } : {}
        );
        return this._convertToCloudItems(t).then((e) => e[0]);
      }),
      (S.prototype.supportsSaveCollisionFlow = function () {
        return !0;
      }),
      (S.prototype.fileExists = async function (e, t, n) {
        var o = n ? this._getParentReference(n) : this._getParentContext();
        return this._search(
          u.from({
            type: g.Type.File,
            parent: o,
            exactname: "".concat(e, ".").concat(t),
            fileExtension: t,
          })
        ).then((e) => !!e.getItems().length);
      }),
      (S.prototype.folderExists = function (e, t) {
        var n = t ? this._getParentReference(t) : this._getParentContext();
        return this._search(
          u.from({ type: g.Type.Folder, parent: n, exactname: e })
        ).then((e) => !!e.getItems().length);
      }),
      (S.prototype.getRawFile = function (e, t, n) {
        return this._googleDriveClient.getFile(
          e.id,
          this.getCorporateStorage() ? { supportsAllDrives: !0 } : {},
          t,
          n && n.progress
        );
      }),
      (S.prototype._createStorageItem = async function (e, t, n) {
        const o = t && (await v.createUint8ArrayFromBlob(t));
        return new p.Item(gDesigner.getDefaultStorage(), e, o, n);
      }),
      (S.prototype.openFile = async function (e, t) {
        return new Promise(
          async function (n, o) {
            try {
              const o = Object.assign(e, {
                settings: this._googleDriveClient.getTokenIssuerSettings(),
              });
              var i = await this._createStorageItem(
                o,
                await this.getRawFile(e)
              );
              i.setCloudClient(this._googleDriveClient),
                gDesigner.openDocument(i, t),
                await this._googleDriveClient.updateFileDetails(
                  i.getUniqueId(),
                  { viewedByMeTime: new Date().toISOString() },
                  { supportsAllDrives: !0 }
                ),
                n();
            } catch (e) {
              o(e);
            }
          }.bind(this)
        );
      }),
      (S.prototype.saveNewFile = function (e, t) {
        let n =
            arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : "",
          o =
            arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {},
          l = arguments.length > 4 ? arguments[4] : void 0;
        return new Promise(async (c, d) => {
          const u = function (e, t, n) {
            console.log(e);
            const o = gDesigner.getHeader(),
              a = o.getWindowTab(gDesigner.getWindows().getWindow(t)),
              r = o.getWindowTab(gDesigner.getWindows().getWindow(n));
            a && r
              ? (n.updateStatus(s.default.SaveFailed),
                gDesigner.removeDocument(n, function () {
                  t.updateStatus(s.default.SaveFailed);
                }))
              : a
              ? t.updateStatus(s.default.SaveFailed)
              : n.updateStatus(s.default.SaveFailed),
              d(
                i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.error-saving-file")
                )
              );
          };
          var p = new a.default();
          try {
            n = n || this.getDefaultFileFormat().ext.toUpperCase();
            var g = e.getScene();
            g.getActivePage().getGeometryBBox() ||
              d(
                i.GLocale.get(
                  new i.GLocaleKey(
                    "GCommonNames",
                    "text.error-emtpy-infinite-canvas"
                  )
                )
              ),
              (o = e.updateSaveOptionsLastModifiedDate(o));
            const a = (
                this.findFileFormatByExtension(n) || this.getDefaultFileFormat()
              ).mime,
              f = {
                name: t,
                mimeType: a,
                fileExtension: n,
                parent: this._getParentContext(),
                settings: this._settings,
              },
              m = a !== this.getDefaultFileFormat().mime,
              y = this.getCorporateStorage();
            y && (f.driveId = y.id);
            var h = await this._createStorageItem(f);
            h.setCloudClient(this._googleDriveClient),
              gDesigner.addDocument(p),
              p.setSynchronizing(!0),
              p.setTitle(t),
              p.updateStatus(s.default.Saving);
            const v = i.GNode.store(g, o);
            v.cfs = !1;
            const _ = JSON.stringify(v);
            return p
              .deserializeData(_)
              .then(async () => {
                e.getFileFormatVersion() &&
                  p.setFileFormatVersion(e.getFileFormatVersion()),
                  l && l(s.default.Loaded),
                  (o = p.updateSaveOptionsLastModifiedDate(o)),
                  h.write(
                    p,
                    async () => {
                      e &&
                        e.getEditor() &&
                        gDesigner.removeDocument(e, null, !0),
                        p.setStorageItem(h),
                        await p.saveAnnotations(m, !0),
                        p.setSynchronizing(!1),
                        l && l(s.default.Saved),
                        gDesigner.hasEventListeners(r.default) &&
                          (gDesigner.trigger(
                            new r.default(r.default.Type.Modified, p)
                          ),
                          gDesigner.trigger(
                            new r.default(r.default.Type.Activated, p)
                          )),
                        gDesigner.addToRecentFiles(h),
                        p.updateStatus(s.default.Saved),
                        c();
                    },
                    () => {
                      console.error(">>>saveNewFile write error", arguments),
                        p.setSynchronizing(!1),
                        l && l(s.default.SaveFailed),
                        d();
                    },
                    null,
                    o
                  );
              })
              .catch((t) => u(t, p, e));
          } catch (t) {
            u(t, p, e);
          }
        });
      }),
      (S.prototype.fetchRecentFiles = function () {
        return this._fetchFiles(
          null,
          0,
          "-viewed",
          "*",
          this._currentRecentFilesPage
        ).then((e) => ((this._currentRecentFilesPage = e), e.getItems()));
      }),
      (S.prototype.fetchFiles = async function (e, t, n) {
        var o = this.getCurrentFolder(),
          i = o && this._getParentReference(o);
        this._currentFilesPage &&
          ((this._currentFilesPage.__parent === i &&
            this._currentFilesPage.__search === e &&
            this._currentFilesPage.__sort === n) ||
            (this._currentFilesPage = null));
        return await this._fetchFiles(e, t, n, o, this._currentFilesPage).then(
          (t) => (
            (this._currentFilesPage = t),
            (this._currentFilesPage.__search = e),
            (this._currentFilesPage.__sort = n),
            (this._currentFilesPage.__parent = i),
            t.getItems()
          )
        );
      }),
      (S.prototype._fetchFiles = async function (e, t, n) {
        let o =
            arguments.length > 3 && void 0 !== arguments[3]
              ? arguments[3]
              : null,
          i = arguments.length > 4 ? arguments[4] : void 0;
        var a = o ? this._getParentReference(o) : this._getParentContext();
        if (t && i && !i.nextPageToken) {
          var r = h.from(i);
          return (r.items = []), r;
        }
        return this._search(
          u.from({
            type: g.Type.File,
            limit: this.getQueryLimit(),
            orderBy: S.SearchEngine.SortMap[n],
            nextPageToken: t ? i && i.nextPageToken : "",
            parent: a,
            name: e,
          })
        );
      }),
      (S.prototype.isItemAllowedToBeRendered = function (e) {
        return e.hasPermission(g.Permission.Download);
      }),
      (S.prototype.isFileAllowedToBeOpened = function (e) {
        return e.hasPermission(g.Permission.Download);
      }),
      (S.prototype.supportsCorporateStorage = function () {
        return !0;
      }),
      (S.prototype.getCorporateStorages = function () {
        let e =
            arguments.length > 0 && void 0 !== arguments[0]
              ? arguments[0]
              : new u(),
          t = arguments.length > 1 ? arguments[1] : void 0;
        if (this.shouldOnlyListOwnedFiles()) return Promise.resolve([]);
        var n =
          (e.hasKey("limit") && e.getAsInt("limit")) || this.getQueryLimit();
        return (
          (t = t || new h({ query: e })),
          new Promise(async (o, i) => {
            try {
              const i = {
                  pageSize: n - t.getSize(),
                  fields: "*",
                  nextPageToken: e.hasValue("nextPageToken") && e.nextPageToken,
                },
                l = await this._googleDriveClient.searchTeamDrives(i);
              var { drives: a, nextPageToken: r } = l;
              if (!a.length) return o(t);
              a =
                t.getSize() + a.length > n
                  ? a.slice(0, Math.max(n - t.getSize(), 0))
                  : a;
              var s = await this._convertToCloudItems(a);
              return (
                t.update({ nextPageToken: r, items: s }),
                t.getSize() < n && r && (t = await this.getStorages(e, t)),
                o(t.getItems())
              );
            } catch (e) {
              i();
            }
          })
        );
      }),
      (S.prototype._buildGoogleClient = async function (e) {
        if (!e) {
          if (!gContainer.getGoogleAPI().isLoaded())
            throw Error("Google Drive Client not loaded!");
          e = await gContainer.getGoogleAPI().getTokenConfiguration({
            corporate: !1,
            accountId: this._accountId,
          });
        }
        return new f(new m(e));
      }),
      (S.prototype.getSupportedFileFormats = function () {
        return p.getSupportedFileFormats();
      }),
      (S.prototype.generatePreviousSelectedFolderPath = async function () {
        const e = this.getCurrentFolder();
        if (this.isRootFolder(e))
          return (
            (this.PREVIOUS_SELECTED_FOLDER_PATH = []),
            this.PREVIOUS_SELECTED_FOLDER_PATH
          );
        this.PREVIOUS_SELECTED_FOLDER_PATH.push(e.id);
        let t = e.getParentId()
          ? e.getParentId()
          : e.parents
          ? e.parents[0]
          : null;
        if (t && t !== this._rootFolderID) {
          let e = await this.getFolder(t).catch(() => null);
          for (; e; )
            this.PREVIOUS_SELECTED_FOLDER_PATH.push(e.id),
              (t = e.getParentId()
                ? e.getParentId()
                : e.parents
                ? e.parents[0]
                : null),
              (e =
                t && t !== this._rootFolderID
                  ? await this.getFolder(t).catch(() => null)
                  : null);
        }
        return this.PREVIOUS_SELECTED_FOLDER_PATH;
      }),
      (S.SearchEngine = {
        SortMap: {
          "-updated": ""
            .concat(f.SearchEngine.OrderBy.ModifiedTime, " ")
            .concat(f.SearchEngine.Sorts.Descending),
          updated: ""
            .concat(f.SearchEngine.OrderBy.ModifiedTime, " ")
            .concat(f.SearchEngine.Sorts.Ascending),
          "-created": ""
            .concat(f.SearchEngine.OrderBy.CreatedTime, " ")
            .concat(f.SearchEngine.Sorts.Descending),
          created: ""
            .concat(f.SearchEngine.OrderBy.CreatedTime, " ")
            .concat(f.SearchEngine.Sorts.Ascending),
          "-name": ""
            .concat(f.SearchEngine.OrderBy.Name, " ")
            .concat(f.SearchEngine.Sorts.Descending),
          name: ""
            .concat(f.SearchEngine.OrderBy.Name, " ")
            .concat(f.SearchEngine.Sorts.Ascending),
          "-viewed": ""
            .concat(f.SearchEngine.OrderBy.ViewedByMeTime, " ")
            .concat(f.SearchEngine.Sorts.Descending),
          viewed: ""
            .concat(f.SearchEngine.OrderBy.ViewedByMeTime, " ")
            .concat(f.SearchEngine.Sorts.Ascending),
        },
      }),
      (e.exports = S);
  }