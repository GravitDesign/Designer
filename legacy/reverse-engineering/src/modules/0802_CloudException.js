/**
 * Webpack Module #802
 * Type: class
 * Name: CloudException
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.default = t.WINDOW_STATUS_BLOCKED = void 0),
      n(58),
      n(19),
      n(96),
      n(57),
      n(8),
      n(71),
      n(134),
      n(4),
      n(41),
      n(13),
      n(38),
      n(97),
      n(26);
    var i = n(1),
      a = o(n(355)),
      r = o(n(594)),
      s = n(858);
    const l = n(1240),
      c = n(520),
      { FILE_FORMATS: d } = n(10);
    t.WINDOW_STATUS_BLOCKED = "window-blocked";
    function u(e) {
      (this._settings = e),
        this.setQueryLimit(10),
        (this._currentFolder = null),
        (this._folders = {}),
        (this._actions = []),
        (this._filterFileTypes = new Set()),
        (this.PREVIOUS_SELECTED_FOLDER_PATH = []),
        this.getPreviousSelectedFolder().then((e) => {
          e && this.setCurrentFolder(e);
        });
    }
    i.GObject.inheritAndMix(u, i.GObject, [i.GEventTarget]),
      (u.DriveEvent = function (e, t) {
        let n =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : null;
        (this.source = e), (this.type = t), (this.data = n);
      }),
      i.GObject.inherit(u.DriveEvent, i.GEvent),
      (u.DriveEvent.type = null),
      (u.DriveEvent.source = null),
      (u.DriveEvent.data = null),
      (u.DriveEvent.Type = {
        Added: 0,
        UserUpdated: 1,
        FolderSwitchRequired: 2,
        FileDeleted: 3,
      }),
      (u.ExceptionCode = { InvalidCredentials: 1 });
    class p extends r.default {
      constructor(e, t) {
        super(e),
          (this.code = t),
          (this.__proto__ = p.prototype),
          (this.name = "CloudException");
      }
      toString() {
        return "[Object CloudException]";
      }
    }
    function g(e) {
      return e.type || e.mime;
    }
    (u.CloudException = p),
      (u.prototype._driveSettings = null),
      (u.prototype.setDriveSettings = function (e) {
        this._driveSettings = l.from(e);
      }),
      (u.prototype.shouldOnlyListOwnedFiles = function () {
        return (
          !!this._driveSettings && this._driveSettings.onlyListFilesOwnedByUser
        );
      }),
      (u.prototype._queryLimit = null),
      (u.prototype._currentFolder = null),
      (u.prototype.SORT_TYPES = s.GFilesPanelSortTypes),
      (u.prototype.FILTER_FILE_TYPES = s.GFilesPanelFileTypesFilter),
      (u.prototype._sortType = u.prototype.SORT_TYPES.UPDATED),
      (u.prototype._filterFileTypes = null),
      (u.prototype._sortDirection = s.GFilesPanelSortDirections.DESCEND),
      (u.prototype._folders = null),
      (u.prototype._corporateStorage = null),
      (u.prototype._actions = null),
      (u.prototype._defaultEmpyMessage = null),
      (u.prototype.CURRENT_FOLDER_PROP =
        "designer.filespanel.base-drive.current-folder"),
      (u.prototype.getUser = function () {
        throw Error("Not implemented!");
      }),
      (u.prototype._driveInstalled = !1),
      (u.getInstance = function () {
        throw Error("Not implemented!");
      }),
      (u.prototype.hasUserProfile = function () {
        return !1;
      }),
      (u.prototype.getSortType = function () {
        return this._sortType;
      }),
      (u.prototype.setSortType = function (e) {
        Object.values(this.SORT_TYPES).includes(e) && (this._sortType = e);
      }),
      (u.prototype.getAvailableFileTypesFilter = function () {
        return this._driveSettings && this._driveSettings.supportedFileFilters
          ? this._driveSettings.supportedFileFilters
          : this.FILTER_FILE_TYPES;
      }),
      (u.prototype.getSelectedFilterForFileTypes = function () {
        return Array.from(this._filterFileTypes);
      }),
      (u.prototype.addFileTypeToSelectedFilter = function (e) {
        this._isFilterFileTypeSupported(e) && this._filterFileTypes.add(e);
      }),
      (u.prototype.deleteFileTypeFromSelectedFilter = function (e) {
        this._isFilterFileTypeSupported(e) && this._filterFileTypes.delete(e);
      }),
      (u.prototype._isFilterFileTypeSupported = function (e) {
        return this.getAvailableFileTypesFilter().some((t) => t.type === e);
      }),
      (u.prototype.clearAllFileTypesFromSelectedFilter = function () {
        this._filterFileTypes = new Set();
      }),
      (u.prototype.getSortDirection = function () {
        return this._sortDirection;
      }),
      (u.prototype.setSortDirection = function (e) {
        Object.values(s.GFilesPanelSortDirections).includes(e) &&
          (this._sortDirection = e);
      }),
      (u.prototype.hasMoreItemsToLoad = function () {
        return !1;
      }),
      (u.prototype.setQueryLimit = function (e) {
        return (this._queryLimit = parseInt(e, 10)), this;
      }),
      (u.prototype.isInstalled = function () {
        return this._driveInstalled;
      }),
      (u.prototype.install = function (e) {
        return (this._driveInstalled = !0), Promise.resolve();
      }),
      (u.prototype.uninstall = function () {
        return (this._driveInstalled = !1), Promise.resolve();
      }),
      (u.prototype.getQueryLimit = function () {
        return this._queryLimit;
      }),
      (u.prototype.setCurrentFolder = function (e) {
        return (
          (this._currentFolder = e),
          gContainer.setProperty(this.CURRENT_FOLDER_PROP, JSON.stringify(e)),
          this
        );
      }),
      (u.prototype.isFolderSharedWithMeFolder = function (e) {
        return !1;
      }),
      (u.prototype.getCurrentFolder = function () {
        return this._currentFolder;
      }),
      (u.prototype.fetchFolders = function (e) {
        throw Error("Not implemented!");
      }),
      (u.prototype.isLoadFoldersOnDemandSupported = function () {
        return !1;
      }),
      (u.prototype.hasFolders = async function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : null;
        return this.fetchFolders("name", e, 1).then((e) => !!e && e.length > 0);
      }),
      (u.prototype.getFolders = function () {
        return this._folders;
      }),
      (u.prototype.createFolder = function (e) {
        throw Error("Not implemented!");
      }),
      (u.prototype.navigateToParentFolder = function () {
        throw Error("Not implemented!");
      }),
      (u.prototype.getFile = function (e) {
        throw Error("Not implemented!");
      }),
      (u.prototype.getFolder = function (e) {
        throw Error("Not implemented!");
      }),
      (u.prototype.getRawFile = function (e, t, n) {
        throw Error("Not implemented!");
      }),
      (u.prototype.openFile = async function (e, t) {
        return new Promise((e, t) => {
          t("Not implemented!");
        });
      }),
      (u.prototype.saveNewFile = function (e, t) {
        throw Error("Not implemented!");
      }),
      (u.prototype.fetchFiles = function (e, t, n) {
        throw Error("Not implemented!");
      }),
      (u.prototype.fetchRecentFiles = async function () {
        return [];
      }),
      (u.prototype.filterSupportedFileFormats = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [];
        const t = this.getSupportedMIMETypes();
        return e.filter((e) => t.includes(e.getMimeType()));
      }),
      (u.prototype.renameItem = function (e, t) {
        throw Error("Not implemented!");
      }),
      (u.prototype.isItemAllowedToBeRendered = function (e) {
        throw Error("Not implemented!");
      }),
      (u.prototype.itemRequiresLazyUpdate = async function (e) {
        return !1;
      }),
      (u.prototype.getItemLazyUpdate = async function (e) {
        return e;
      }),
      (u.prototype.isFileAllowedToBeOpened = function (e) {
        throw Error("Not implemented!");
      }),
      (u.prototype.deleteItem = function (e) {
        throw Error("Not implemented!");
      }),
      (u.prototype.cutPaste = function (e) {
        throw Error("Not implemented!");
      }),
      (u.prototype.fileMove = function (e, t) {
        throw Error("Not implemented!");
      }),
      (u.prototype.copyPaste = function (e) {
        throw Error("Not implemented!");
      }),
      (u.prototype.supportsCorporateStorage = function () {
        return !1;
      }),
      (u.prototype.setCorporateStorage = async function (e) {
        this._corporateStorage = e;
      }),
      (u.prototype.initLastCorporateStorage = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "id";
        const n = this;
        async function o(e) {
          if (!e) return null;
          const o = await n.getCorporateStorages();
          return o.length ? o.find((n) => n[t] === e) : null;
        }
        async function i(e) {
          n.setCorporateStorage(e);
          let t = await n.getPreviousSelectedFolder();
          n.setCurrentFolder(t || n.getRootFolder());
        }
        return e && this.supportsCorporateStorage()
          ? gContainer.getProperty(e).then(o).then(i)
          : i(null);
      }),
      (u.prototype.saveLastTeamDriveId = function (e, t) {
        if (!e)
          throw new a.default(
            "Invalid arguments for saving last team drive id"
          );
        return gContainer.setProperty(e, t), this;
      }),
      (u.prototype.getCorporateStorage = function () {
        return this._corporateStorage;
      }),
      (u.prototype.getCorporateStorages = async function () {
        return [];
      }),
      (u.prototype.isRootFolder = function (e) {
        throw new Error("Not implemented!");
      }),
      (u.prototype.getRootFolder = function () {
        throw new Error("Not implemented!");
      }),
      (u.prototype.supportsSaveCollisionFlow = function () {
        return !1;
      }),
      (u.prototype.requiresOverwriteCollisionHandling = function () {
        return !1;
      }),
      (u.prototype.fileExists = async function (e, t, n) {
        throw new Error("Not implemented!");
      }),
      (u.prototype.folderExists = function (e, t) {
        throw new Error("Not implemented!");
      }),
      (u.prototype.getPreviousSelectedFolder = function () {
        return this.CURRENT_FOLDER_PROP
          ? gContainer
              .getProperty(this.CURRENT_FOLDER_PROP)
              .then(JSON.parse)
              .catch((e) => {
                console.log("Current folder is not set", e.message);
              })
          : Promise.resolve(null);
      }),
      (u.prototype.clearPreviousSelectedFolder = function () {
        return gContainer.removeProperty(this.CURRENT_FOLDER_PROP);
      }),
      (u.prototype.getSupportedExtensions = function () {
        return this.getSupportedFileFormats().map((e) => {
          let { ext: t } = e;
          return t.toLowerCase();
        });
      }),
      (u.prototype.getSupportedMIMETypes = function () {
        return this.getSupportedFileFormats().map((e) => g(e));
      }),
      (u.prototype.filterTypesWithSearchString = function (e, t) {
        if (!t || !e) return e;
        let n;
        if (
          ((t = t.toLowerCase()).startsWith(".")
            ? (n = t.slice(1))
            : t.startsWith("*.") && (n = t.slice(2)),
          !n)
        )
          return e;
        const o = this.getSupportedFileFormats(),
          i = o
            .filter((t) => e.includes(g(t)))
            .map((e) => e.ext)
            .filter((e) => e.startsWith(n));
        if (i.length > 0) {
          return o.filter((e) => i.includes(e.ext)).map(g);
        }
        return [];
      }),
      (u.prototype.getSupportedFileFormats = function () {
        return this._driveSettings && this._driveSettings.supportedFileFormats
          ? this._driveSettings.supportedFileFormats
          : d;
      }),
      (u.prototype.getDefaultFileFormat = function () {
        return this.getSupportedFileFormats().find((e) => e.default);
      }),
      (u.prototype.findFileFormatByExtension = function (e) {
        return this.getSupportedFileFormats().find((t) => {
          let { ext: n } = t;
          return !!n && n.toLowerCase() === e.toLowerCase();
        });
      }),
      (u.prototype.lookupByMimeType = function (e) {
        const t = e.toLowerCase();
        return this.getSupportedFileFormats().find((e) => {
          const n = g(e);
          return !!n && n.toLowerCase() === t;
        });
      }),
      (u.prototype.getFileFormat = function (e) {
        var t = this.findFileFormatByExtension(e.extension || e.ext);
        return t || (t = this.lookupByMimeType(e.type)), t;
      }),
      (u.prototype.isFileSupported = function (e) {
        return !(
          !e ||
          !(
            this.getSupportedMIMETypes().includes(e.type) ||
            this.getSupportedMIMETypes().includes(e.mimeType) ||
            (e.extension &&
              this.getSupportedExtensions().includes(e.extension.toLowerCase()))
          )
        );
      }),
      (u.prototype.canAccessFile = async function () {
        return !0;
      }),
      (u.prototype.addAction = function (e) {
        this._actions.push(e);
      }),
      (u.prototype.getActions = function () {
        return this._actions;
      }),
      (u.prototype.setDefaultEmptyMessage = function (e) {
        this._defaultEmpyMessage = e;
      }),
      (u.prototype.getDefaultEmptyMessage = function () {
        return this._defaultEmpyMessage;
      }),
      (u.prototype.generatePreviousSelectedFolderPath = function () {
        throw new Error("Not implemented!");
      }),
      (u.prototype.containsInPreviousPath = function (e) {
        return this.PREVIOUS_SELECTED_FOLDER_PATH.find((t) => t === e.getId());
      }),
      (u.prototype.resetPreviousSelectedFolderPath = function () {
        this.PREVIOUS_SELECTED_FOLDER_PATH = [];
      }),
      (u.prototype.removeLoadedFolderFromPreviousPath = function (e) {
        this.PREVIOUS_SELECTED_FOLDER_PATH =
          this.PREVIOUS_SELECTED_FOLDER_PATH.filter((t) => t !== e.getId());
      }),
      (u.prototype.hasTitleValidation = function () {
        return !1;
      }),
      (u.prototype.getTitleValidator = function () {
        throw Error("NOT IMPLEMENTED");
      }),
      (u.prototype.loadExampleFiles = async function () {
        return Promise.resolve([]);
      }),
      (u.prototype.isAssetsSharedWithMeFolder = function () {
        return !1;
      }),
      (u.prototype.getSharedFilesWithMeFolder = function () {
        return null;
      }),
      (u.prototype.getDriveIdPropertyName = function () {
        return "id";
      }),
      (u.Provider = c.Provider);
    t.default = u;
  }