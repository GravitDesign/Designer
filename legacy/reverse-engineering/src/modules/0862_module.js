/**
 * Webpack Module #862
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.lookupByMimeType =
        t.lookupByExtension =
        t.default =
        t.TYPES =
        t.FILE_MIME_TYPES =
        t.FILE_EXTENSIONS =
        t.DEFAULT_TYPE =
          void 0),
      n(58),
      n(19),
      n(168),
      n(96),
      n(30),
      n(57),
      n(8),
      n(71),
      n(4),
      n(41),
      n(13),
      n(32),
      n(38),
      n(169),
      n(33),
      n(26);
    var i = n(1),
      a = n(10),
      r = o(n(119)),
      s = o(n(220)),
      l = o(n(163)),
      c = o(n(86)),
      d = o(n(802)),
      u = n(593);
    const p = n(156),
      {
        FILE_FORMATS: g,
        FOLDER_FORMAT: h,
        MAX_FOLDER_DEPTH_FOR_CLOUD: f,
      } = n(10);
    let m;
    function y() {
      d.default.apply(this, arguments),
        (this.CURRENT_FOLDER = this.getRootFolder()),
        (this.FOLDERS = {}),
        (this.QUERY_LIMIT = 10),
        (this.EXAMPLE_FILES_CACHE = []),
        this.getPreviousSelectedFolder().then((e) => {
          e && this.setCurrentFolder(e);
        }),
        this.setDefaultEmptyMessage({
          title: i.GLocale.get(
            new i.GLocaleKey(
              "GCommonNames",
              "text.message-explore-cloud-templates"
            )
          ),
        });
    }
    i.GObject.inherit(y, d.default),
      (y.prototype.CURRENT_FOLDER_PROP =
        "designer.filespanel.cloud-drive.current-folder"),
      (y.getInstance = function () {
        return m || (m = new y()), m;
      }),
      (y.prototype.getPreviousSelectedFolder = function () {
        return d.default.prototype.getPreviousSelectedFolder
          .apply(this, arguments)
          .then((e) => (e ? this._convertToFolderElement(e) : e));
      }),
      (y.prototype.setQueryLimit = function (e) {
        return (this.QUERY_LIMIT = parseInt(e, 10)), this;
      }),
      (y.prototype.setCurrentFolder = function (e) {
        return (
          (this.CURRENT_FOLDER = e),
          gContainer.setProperty(this.CURRENT_FOLDER_PROP, JSON.stringify(e)),
          this
        );
      }),
      (y.prototype.isRootFolder = function (e) {
        return (
          !(e = void 0 !== e ? e : this.getCurrentFolder()) ||
          (e && "object" == typeof e && !e.id)
        );
      }),
      (y.prototype.getRootFolder = function () {
        return p.from({
          id: null,
          name: i.GLocale.get(
            new i.GLocaleKey("GFilesPanel", "action.my-cloud")
          ),
        });
      }),
      (y.prototype.getFolder = function (e) {
        return a.gApi
          .getFile(e.id || e)
          .then((e) => this._convertToFolderElement(e));
      }),
      (y.prototype.getCurrentFolder = function () {
        return this.CURRENT_FOLDER;
      }),
      (y.prototype.buildFoldersHierarchy = function (e) {
        var t = {},
          n = new Set(),
          o = {};
        if (!e.length) return t;
        for (let t = 0; t < e.length; t++) {
          let n = r.default.definePath(e[t]);
          o[n] = e[t];
        }
        function i(e) {
          let t = new Set();
          for (; e && e.parent; ) {
            if (e.id === e.parent)
              return console.warn("Invalid folder"), (e.parent = null), [];
            if (t.has(e.parent))
              return console.warn("Invalid folder"), (e.parent = null), [];
            t.add(e.parent), (e = o[e.parent]);
          }
          return [...t];
        }
        return (
          e.forEach((e) => {
            if (n.has(e.id)) return;
            let o = { path: i(e), folder: e };
            if (o.path.length > f)
              for (let e = 0; e < o.path.length - f; e++) n.add(o.path[e]);
            else t[e.id] = o;
          }),
          t
        );
      }),
      (y.prototype.isLoadFoldersOnDemandSupported = function () {
        return !0;
      }),
      (y.prototype.fetchFolders = async function (e, t) {
        let n =
            arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : -1,
          o =
            arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : 0;
        return (
          Object.keys(this.FOLDERS).length ||
            (await this._buildFolderStructure(e)),
          this.isRootFolder(t) && this.generatePreviousSelectedFolderPath(),
          (t = t || this.CURRENT_FOLDER),
          a.gApi
            .listFiles({
              type: h,
              parent: this._extractId(t),
              sort: e + "",
              limit: n > 0 ? n : 100,
              skip: o,
            })
            .then((e) => this._convertToFolderElement(e))
        );
      }),
      (y.prototype._convertToFolderElement = function (e) {
        const t = (e) => {
          var t = p.from(e);
          return (
            t.setItemType(p.Type.Folder),
            t.setPermissions([
              p.Permission.Open,
              p.Permission.Copy,
              p.Permission.Editing,
              p.Permission.Rename,
              p.Permission.CutPaste,
              p.Permission.Delete,
            ]),
            t
          );
        };
        return e instanceof Array ? e.map(t) : t(e);
      }),
      (y.prototype._buildFolderStructure = async function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0]
            ? arguments[0]
            : "asc";
        if (Object.keys(this.FOLDERS).length) return;
        const t = await a.gApi.listFiles({
          type: h,
          parent: "*",
          sort: e + "",
          limit: Number.MAX_SAFE_INTEGER,
        });
        (this.FOLDERS = this.buildFoldersHierarchy(t)),
          !this.CURRENT_FOLDER ||
            this.FOLDERS[this.CURRENT_FOLDER.id] ||
            this.isRootFolder(this.CURRENT_FOLDER) ||
            this._isCustomFolder(this.CURRENT_FOLDER) ||
            this.setCurrentFolder(null);
      }),
      (y.prototype._isCustomFolder = function (e) {
        return !1;
      }),
      (y.prototype.getFolders = function () {
        return this.FOLDERS;
      }),
      (y.prototype.createFolder = function (e) {
        return r.default.createFolder(e, this.CURRENT_FOLDER);
      }),
      (y.prototype.navigateToParentFolder = function () {
        var e =
          this.CURRENT_FOLDER && this.CURRENT_FOLDER.parent
            ? this.FOLDERS[this.CURRENT_FOLDER.parent].folder
            : null;
        return this.setCurrentFolder(e), this;
      }),
      (y.prototype.getFile = function (e) {
        return a.gApi
          .getFile(e, !0)
          .then((e) => r.default.convertToCloudItem(e));
      }),
      (y.prototype.getRawFile = async function (e, t, n) {
        const o = await a.gApi.getFileExtended(e.id),
          i = await fetch(o.getFileDataURL(), { signal: t });
        return (0, u.readResponseWithProgress)(i, n.progress, !0).then((e) =>
          e.blob()
        );
      }),
      (y.prototype.openFile = function (e, t) {
        return new Promise(async (n, o) => {
          try {
            const o = await s.default.from(
              gDesigner.getDefaultStorage(),
              e,
              void 0,
              void 0,
              e.autosave
            );
            gDesigner.openDocument(o, t), n();
          } catch (e) {
            o(e);
          }
        });
      }),
      (y.prototype.saveNewFile = function (e, t) {
        let n =
            arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : "",
          o =
            arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {},
          d =
            arguments.length > 4 && void 0 !== arguments[4]
              ? arguments[4]
              : null;
        n = n || _.ext.toUpperCase();
        var u = e.getScene();
        if (e.hasPagesWithInfiniteEmptyCanvas())
          return Promise.reject({
            message: i.GLocale.get(
              new i.GLocaleKey(
                "GCommonNames",
                "text.error-emtpy-infinite-canvas"
              )
            ),
            dontExtend: !0,
          });
        let p = gDesigner.getWindows().getActiveWindow().getView();
        const g = p.getZoom(),
          h = p.getScrollX(),
          f = p.getScrollY(),
          m = u.getActivePage(),
          y = m.getReferenceId(),
          v = u.getActivePage().getGeometryBBox();
        return a.gApi
          .createFile({
            name: t,
            parent: this._extractId(this.CURRENT_FOLDER),
            type: (b(n) || _).type,
            app: "designer",
            unit: u.getProperty("ut"),
            width: v.getWidth(),
            height: v.getHeight(),
            trashed: null,
          })
          .then(async (a) => {
            a.type === _.type && u.setCloudSynchronization(a.id);
            const m = a.type !== _.type;
            await e.saveAnnotations(m),
              (o = e.updateSaveOptionsLastModifiedDate(o));
            var v = await s.default.from(gDesigner.getDefaultStorage(), a.id);
            e.setStorageItem(v);
            var b = new l.default(v);
            return b
              .deserializeData(i.GNode.serialize(u, o))
              .then(
                async () => (
                  e.getFileFormatVersion() &&
                    b.setFileFormatVersion(e.getFileFormatVersion()),
                  await b.saveAnnotations(m, !0),
                  (u = b.getScene()).iteratePages((e) => {
                    if (e.getReferenceId() === y) return u.setActivePage(e), !1;
                  }),
                  gDesigner.addDocument(b),
                  d
                    ? d(c.default.Loaded)
                    : gDesigner.removeDocument(e, null, !0),
                  (p = gDesigner.getWindows().getActiveWindow().getView()),
                  p.transform(h, f, g),
                  (o = b.updateSaveOptionsLastModifiedDate(o)),
                  i.GUtil.prepareForSaving(u, n),
                  r.default.performSave(
                    b,
                    () => {
                      b.getFileFormatVersion() &&
                        b
                          .getStorageItem()
                          .storeFileFormatVersion(b.getFileFormatVersion()),
                        d && d(c.default.Saved);
                    },
                    () => {
                      d && d(c.default.SaveFailed);
                    },
                    o
                  ),
                  e.isCloudFile() || e.setTitle(t),
                  a
                )
              )
              .catch(
                (e) => (
                  console.error(e),
                  new Promise((e, t) => {
                    t(
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GCommonNames",
                          "text.error-saving-file"
                        )
                      )
                    );
                  })
                )
              );
          })
          .catch(
            (e) => (
              console.error(e),
              new Promise((e, t) => {
                t(
                  i.GLocale.get(
                    new i.GLocaleKey("GCommonNames", "text.error-saving-file")
                  )
                );
              })
            )
          );
      }),
      (y.prototype.fetchRecentFiles = function () {
        const e = this._getFileTypesForFilter().map((e) => ({ type: e }));
        return r.default
          .getRecentStorageItems(e)
          .then((e) => this._convertAndUpdateCloudItems(e));
      }),
      (y.prototype.fetchFiles = function (e, t, n) {
        var o = {
          type: this._getFileTypesForFilter().join("|"),
          parent: this._extractId(this.CURRENT_FOLDER),
          limit: this.QUERY_LIMIT + "",
          skip: t + "",
          sort: n + "",
        };
        return (
          e && ((o.name = e), (o.parent = "*")),
          a.gApi.listFiles(o).then((e) => this._convertAndUpdateCloudItems(e))
        );
      }),
      (y.prototype._convertAndUpdateCloudItems = function (e) {
        return r.default.convertToCloudItem(e);
      }),
      (y.prototype._getFileTypesForFilter = function () {
        const e = this.getSelectedFilterForFileTypes();
        return 0 !== e.length ? e : this.getSupportedMIMETypes();
      }),
      (y.prototype.renameItem = function (e, t) {
        return a.gApi.updateFile(e.id, { name: t });
      }),
      (y.prototype.isItemAllowedToBeRendered = function (e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1],
          n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        return (
          !(!t && !n) || r.default.definePath(this.CURRENT_FOLDER) === e.parent
        );
      }),
      (y.prototype.deleteItem = function (e) {
        return a.gApi
          .updateFile(e.id, { trashed: !0 })
          .then(() => a.gApi.deleteFile(e.id));
      }),
      (y.prototype.cutPaste = function (e) {
        var t = r.default.definePath(this.CURRENT_FOLDER);
        return r.default.changePathTree(e, t);
      }),
      (y.prototype.fileMove = function (e, t) {
        return r.default.changePathTree([e], t.id);
      }),
      (y.prototype.copyPaste = function (e) {
        const t = r.default.definePath(this.CURRENT_FOLDER);
        return Promise.all(
          e.map(async (e) => {
            const { id: n } = await a.gApi.copyFile(e.id, { parent: t });
            return { id: n, parent: t };
          })
        );
      }),
      (y.prototype.supportsSaveCollisionFlow = function () {
        return !0;
      }),
      (y.prototype._extractId = function (e) {
        return e ? ("string" == typeof e ? e || null : e.id || null) : null;
      }),
      (y.prototype.fileExists = async function (e, t, n) {
        n = n || this.CURRENT_FOLDER;
        var o = {
          type: this.getSupportedFileFormats().find(
            (e) => e.ext.toLocaleLowerCase() === t.toLocaleLowerCase()
          ).type,
          parent: this._extractId(n),
          name: '"'.concat(e, '"'),
        };
        return a.gApi.listFiles(o).then((e) => !!e.length);
      }),
      (y.prototype.folderExists = function (e, t) {
        return (
          (t = t || this.CURRENT_FOLDER),
          a.gApi
            .listFiles({
              type: h,
              parent: this._extractId(t),
              name: '"'.concat(e, '"'),
            })
            .then((e) => !!e.length)
        );
      }),
      (y.prototype.generatePreviousSelectedFolderPath = function () {
        if (!this.PREVIOUS_SELECTED_FOLDER_PATH.length && this.CURRENT_FOLDER) {
          const e = this.FOLDERS && this.FOLDERS[this.CURRENT_FOLDER.getId()];
          if (!e) return;
          (this.PREVIOUS_SELECTED_FOLDER_PATH =
            this.PREVIOUS_SELECTED_FOLDER_PATH.concat(e.path)),
            this.PREVIOUS_SELECTED_FOLDER_PATH.find((t) => t === e.folder.id) ||
              this.PREVIOUS_SELECTED_FOLDER_PATH.push(e.folder.id);
        }
      }),
      (y.prototype.loadExampleFiles = async function () {
        0 === this.EXAMPLE_FILES_CACHE.length &&
          (this.EXAMPLE_FILES_CACHE = await a.gApi
            .getExampleFiles()
            .catch(() => []));
        const e = this.getSelectedFilterForFileTypes();
        let t = this.EXAMPLE_FILES_CACHE;
        return (
          0 !== e.length &&
            (t = t.filter((e) =>
              this._getFileTypesForFilter().includes(e.type)
            )),
          t.map((e) => {
            let t = p.from(e);
            return t.setPermissions([p.Permission.Open]), t;
          })
        );
      });
    t.default = y;
    const v = (t.TYPES = Object.assign(
        { FOLDER: h },
        g.reduce((e, t) => ((e[t.ext.toUpperCase() + "_FILE"] = t), e), {})
      )),
      _ = (t.DEFAULT_TYPE = Object.values(v).find((e) => e.default));
    (t.FILE_EXTENSIONS = g.map((e) => {
      let { ext: t } = e;
      return t.toUpperCase();
    })),
      (t.FILE_MIME_TYPES = g.map((e) => {
        let { type: t } = e;
        return t;
      }));
    t.lookupByMimeType = (e) =>
      Object.values(v).find((t) => {
        let { type: n } = t;
        return !!n && n.toLowerCase() === e.toLowerCase();
      });
    const b = (e) =>
      Object.values(v).find((t) => {
        let { ext: n } = t;
        return !!n && n.toLowerCase() === e.toLowerCase();
      });
    t.lookupByExtension = b;
  }