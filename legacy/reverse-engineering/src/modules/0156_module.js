/**
 * Webpack Module #156
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58),
      n(30),
      n(20),
      n(271),
      n(71),
      n(151),
      n(34),
      n(91),
      n(4),
      n(32),
      n(33);
    var i = n(40),
      a = o(n(263));
    const { FILE_ID_PREFIX: r } = n(10);
    function s() {
      this._permissions = [];
    }
    (s.prototype.parent = null),
      (s.prototype._previewURL = null),
      (s.prototype.setPreviewURL = function (e) {
        this._previewURL = e;
      }),
      (s.prototype.getPreviewURL = function () {
        return this._previewURL;
      }),
      (s.prototype.getParentId = function () {
        const e = this.getParent();
        return e instanceof s ? e.getId() : e;
      }),
      (s.prototype.getParent = function () {
        return this.parent;
      }),
      (s.prototype.getId = function () {
        return this.id;
      }),
      (s.prototype._permissions = null),
      (s.prototype._itemType = null),
      (s.prototype.storage = null),
      (s.prototype.settings = null),
      (s.prototype.autosave = null),
      (s.prototype.getStorage = function () {
        return this.storage;
      }),
      (s.prototype.isAutoSavedVersion = function () {
        return this.autosave;
      }),
      (s.prototype.getExtension = function () {
        const e = this.extension || this.ext;
        return (e && e.toLowerCase()) || null;
      }),
      (s.prototype.getNameWithExtension = function () {
        let e = this.getName();
        e = s.normalizeMultipleDotsEnd(e);
        const t = ".".concat(this.getExtension());
        return (
          !e.toLowerCase().endsWith(t)
            ? (e += t)
            : (e = e.substr(0, e.lastIndexOf(".")) + t),
          e
        );
      }),
      (s.prototype.getNameWithoutExtension = function () {
        return (0, i.getFileNameWithoutExtension)(
          this.getName(),
          this.getExtension()
        );
      }),
      (s.prototype.getName = function () {
        return (this.name && this.name.trim()) || this.name;
      }),
      (s.prototype.setItemType = function (e) {
        if (!Object.values(s.Type).includes(e)) throw Error("Invalid type!");
        this._itemType = e;
      }),
      (s.prototype.getType = function () {
        return this._itemType;
      }),
      (s.prototype.getPermissions = function () {
        return this._permissions;
      }),
      (s.prototype.revokePermissions = function () {
        this._permissions = [];
      }),
      (s.prototype.getIcon = function () {
        return this.icon;
      }),
      (s.prototype.setMimeType = function (e) {
        this._mimetype = e;
      }),
      (s.prototype.getMimeType = function () {
        return this._mimetype || this.mimeType || this.type;
      }),
      (s.prototype.setSize = function (e) {
        this._size = e;
      }),
      (s.prototype.getSize = function () {
        return this._size;
      }),
      (s.prototype.hasPermission = function (e) {
        return this._permissions.includes(e);
      }),
      (s.prototype.setPermission = function (e) {
        let t =
          !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1];
        if (this._permissionSupported(e)) {
          if (t) this.hasPermission(e) || this._permissions.push(e);
          else if (this.hasPermission(e)) {
            var n = this._permissions.indexOf(e);
            this._permissions.splice(n, 1);
          }
        } else console.warn("Permission not supported: " + e);
      }),
      (s.prototype.setVersion = function (e) {
        this._version = e;
      }),
      (s.prototype.getVersion = function () {
        return this._version;
      }),
      (s.prototype.setModificationTime = function (e) {
        this._modificationTime = e;
      }),
      (s.prototype.getModificationTime = function () {
        return this._modificationTime;
      }),
      (s.prototype.setPermissions = function (e) {
        let t =
          !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1];
        e.forEach((e) => this.setPermission(e, t));
      }),
      (s.prototype._permissionSupported = function (e) {
        return Object.values(s.Permission).includes(e);
      }),
      (s.from = function (e) {
        var t = new s();
        return (
          (t = Object.assign(t, e)).settings &&
            (t.settings = s.GCloudSettings.from(t.settings)),
          t
        );
      }),
      (s.parseFromJSON = function (e, t) {
        try {
          const t = JSON.parse(e);
          return s.from(t);
        } catch (e) {
          if (!t && void 0 === t) throw e;
          return t;
        }
      }),
      (s.Permission = {
        Open: "open",
        Copy: "copy",
        Editing: "editing",
        Rename: "rename",
        CutPaste: "cutPaste",
        Download: "download",
        Delete: "delete",
        UnshareWithMe: "unshareWithMe",
      }),
      (s.Storage = {
        GoogleDrive: "GOOGLE_DRIVE",
        SharePoint: "SHAREPOINT",
        OneDriveBusiness: "ONEDRIVE_BUSINESS",
        Gravit: "GRAVIT_CLOUD",
      }),
      (s.Type = {
        Folder: "folder",
        File: "file",
        CorporateStorage: "corporate-storage",
      }),
      (s.GCloudSettings = function () {}),
      (s.GCloudSettings.from = function (e) {
        let t = new s.GCloudSettings();
        return (t = Object.assign(t, e)), t;
      }),
      (s.GCloudSettings.parseFromJSON = function (e, t) {
        try {
          const t = JSON.parse(e);
          return s.GCloudSettings.from(t);
        } catch (e) {
          if (!t && void 0 === t) throw e;
          return t;
        }
      }),
      (s.getPrefixIdForStorage = function (e) {
        switch (e) {
          case s.Storage.Gravit:
            return "";
          case s.Storage.GoogleDrive:
            return r.GOOGLEDRIVE;
          case s.Storage.SharePoint:
            return r.SHAREPOINT;
          case s.Storage.OneDriveBusiness:
            return r.ONEDRIVEBUSINESS;
        }
        throw new Error("Unsupported storage!");
      }),
      (s.getFileStorageId = function (e) {
        if (!e.id) return null;
        const t = s.getPrefixIdForStorage(e.storage);
        let n = e.id;
        return t && (n = n.replace("".concat(t, "_"), "")), n;
      }),
      (s.getCollaborativeFileId = function (e, t) {
        const n = s.getPrefixIdForStorage(t);
        return "".concat(n ? n + "_" : "").concat(e);
      }),
      (s.createOrReturnSelfInstance = function (e) {
        return e instanceof s ? e : s.from(e);
      }),
      (s.getExtensionFromName = function (e) {
        const t = e.match(a.default.String.FileExtension);
        return t ? t[0].slice(1) : null;
      }),
      (s.normalizeMultipleDotsEnd = function (e) {
        if (e.endsWith(".")) {
          const t = e.match(a.default.String.MultipleDotsEnd);
          if (t) return e.slice(0, t.index);
        }
        return e;
      }),
      (e.exports = s);
  }