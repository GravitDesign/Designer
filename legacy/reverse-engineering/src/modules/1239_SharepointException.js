/**
 * Webpack Module #1239
 * Type: class
 * Name: SharepointException
 */

function (e, t, n) {
    "use strict";
    n(842);
    var o = n(16);
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.default = t.TEAMS_COMMANDS = t.GSharePointClient = void 0),
      n(58),
      n(19),
      n(96),
      n(30),
      n(57),
      n(8),
      n(356),
      n(20),
      n(107),
      n(3),
      n(271),
      n(34),
      n(134),
      n(91),
      n(4),
      n(13),
      n(38),
      n(26),
      n(125),
      n(126),
      n(114);
    var i = n(1),
      a = o(n(1476)),
      r = n(802),
      s = o(n(119)),
      l = n(10),
      c = n(593),
      d = o(n(594)),
      u = o(n(1477)),
      p = o(n(1242)),
      g = n(40);
    const h = n(156);
    let f = null,
      m = {};
    const y = (t.TEAMS_COMMANDS = p.default.COMMANDS),
      v = (t.GSharePointClient = function (e) {
        let {
          tenant: t,
          domain: n,
          clientID: o,
          id: i,
          authTenant: a,
          corporate: r,
          token: s,
          relativePath: l,
        } = e;
        (this.TOKEN = f || s),
          (this.BASE_URL = t),
          (this.AUTH_TENANT = a || t),
          (this.DOMAIN = n),
          (this.CLIENT_ID = o),
          (this.SETTINGS_ID = i),
          (this.CORPORATE = r || !1),
          (this.RELATIVE_PATH = l),
          (this.HEADERS = v.requestHeaders);
      });
    (v.prototype.setTenantURL = function (e) {
      this.BASE_URL = e.replace("https://", "");
    }),
      (v.prototype.setRelativePath = function (e) {
        this.RELATIVE_PATH = e;
      }),
      (v.prototype.relativeUrlContainsSubsiteRelativePath = function (e) {
        return 0 === e.indexOf(this.RELATIVE_PATH);
      }),
      (v.prototype.getSanitizedFolderRelativePath = function (e) {
        let t = e;
        return (
          this.RELATIVE_PATH && (t = (0, g.trimStart)(t, this.RELATIVE_PATH)),
          (0, g.trimStart)(t, "/")
        );
      }),
      (v.prototype.getSanitizedFileRelativePath = function (e) {
        return this.RELATIVE_PATH
          ? "".concat(this.RELATIVE_PATH, "/").concat(e)
          : e;
      }),
      (v.prototype.setToken = function (e) {
        this.TOKEN = e;
      }),
      (v.CheckOutStatuses = { CheckedOut: 0, Available: 2 }),
      (v.FILE_STATUS = {
        LOCKED: 3,
        LOCKED_BY_ME: 2,
        AVAILABLE: 1,
        LOADING: -1,
      }),
      (v.requestHeaders = {
        Accept: "application/json;odata=nometadata",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "en-US,en;q=0.8",
      }),
      (v.CheckinType = {
        MinorCheckIn: 0,
        MajorCheckIn: 1,
        OverwriteCheckIn: 2,
      }),
      (v.SpecialCharList = [
        "~",
        '"',
        "'",
        "#",
        "%",
        "&",
        "*",
        ":",
        "<",
        ">",
        "?",
        "/",
        "\\",
        "{",
        "|",
        "}",
      ]),
      (v.InvalidNames = [
        ".lock",
        "CON",
        "PRN",
        "AUX",
        "COM0",
        "COM1",
        "COM2",
        "COM3",
        "COM4",
        "COM5",
        "COM6",
        "COM7",
        "COM8",
        "COM9",
        "LPT0",
        "LPT1",
        "LPT2",
        "LPT3",
        "LPT4",
        "LPT5",
        "LPT6",
        "LPT7",
        "LPT8",
        "LPT9",
        "desktop.ini",
      ]),
      (v.InvalidNameBeginnings = ["~$"]),
      (v.InvalidNameEndings = ["."]),
      (v.InvalidContainings = ["_vti_"]),
      (v.InvalidOnlyCharacters = ["."]),
      (v.convertFileToCloudItem = function (e) {
        const t = (e) => {
          var t = h.from({
            id: e.UniqueId,
            version: e.UIVersionLabel,
            updated: e.TimeLastModified,
            created: e.TimeCreated,
            checkedOut: e.CheckOutType === v.CheckOutStatuses.CheckedOut,
            relativeUrl: e.ServerRelativeUrl,
          });
          (t.storage = h.Storage.SharePoint),
            t.setItemType(h.Type.File),
            (t.type = v.getFileType({ name: e.Name })),
            (t.mimeType = e._mimetype || e.mimeType || t.type);
          const n = l.FILE_FORMATS.find((e) => {
            let { type: n } = e;
            return n === t.type;
          });
          return (
            (t.extension = n && n.ext),
            (t.name = e.Name.replace(
              new RegExp(".(".concat(t.extension, ")$"), "i"),
              ""
            )),
            t.setModificationTime(t.updated),
            e.Length && t.setSize(parseInt(e.Length)),
            t.checkedOut
              ? (t.checkOutStatus = v.FILE_STATUS.LOADING)
              : ((t.checkOutStatus = v.FILE_STATUS.AVAILABLE),
                (t = v.updateFilePermissions(t))),
            t
          );
        };
        return e instanceof Array ? e.map(t) : t(e);
      }),
      (v.updateFilePermissions = function (e) {
        return e instanceof h && e.getType() === h.Type.File
          ? ([v.FILE_STATUS.AVAILABLE, v.FILE_STATUS.LOCKED_BY_ME].includes(
              e.checkOutStatus
            )
              ? e.setPermissions([
                  h.Permission.Open,
                  h.Permission.Delete,
                  h.Permission.Download,
                  h.Permission.Copy,
                  h.Permission.CutPaste,
                ])
              : e.revokePermissions(),
            e)
          : e;
      }),
      (v.hasSpecialChar = function (e) {
        return new RegExp("[".concat(v.SpecialCharList.join("|"), "]")).test(e);
      }),
      (v.isNameValid = function (e) {
        if (!e || !e.trim()) return !1;
        if (v.hasSpecialChar(e)) return !1;
        if (v.InvalidNames.indexOf(e) >= 0) return !1;
        for (let t = 0, n = v.InvalidNameBeginnings.length; t < n; t++) {
          let n = v.InvalidNameBeginnings[t];
          if (e.startsWith(n)) return !1;
        }
        for (let t = 0, n = v.InvalidNameEndings.length; t < n; t++) {
          let n = v.InvalidNameEndings[t];
          if (e.endsWith(n)) return !1;
        }
        for (let t = 0, n = v.InvalidContainings.length; t < n; t++) {
          let n = v.InvalidContainings[t];
          if (e.indexOf(n) >= 0) return !1;
        }
        for (let t = 0, n = v.InvalidOnlyCharacters.length; t < n; t++) {
          const n = v.InvalidOnlyCharacters[t];
          if (RegExp("^[".concat(n, "]+$")).test(e)) return !1;
        }
        return !0;
      }),
      (v.convertFolderToCloudItem = function (e) {
        const t = (e) => {
          var t = h.from({
            id: e.UniqueId ? e.UniqueId : e.id,
            name: e.Name ? e.Name : e.name,
            relativeUrl: e.ServerRelativeUrl
              ? e.ServerRelativeUrl
              : e.relativeUrl,
            type: "folder",
          });
          return (
            t.setItemType(h.Type.Folder),
            t.setPermission(h.Permission.Open),
            t.setPermission(h.Permission.Delete),
            t.setPermission(h.Permission.CutPaste),
            t
          );
        };
        return e instanceof Array ? e.map(t) : t(e);
      }),
      (v.getFileType = function (e) {
        return e.name.toLowerCase().endsWith(".cdrapp")
          ? l.FILE_FORMATS.find((e) => {
              let { ext: t } = e;
              return "cdrapp" === t;
            }).type
          : e.name.toLowerCase().endsWith(".cdr")
          ? l.FILE_FORMATS.find((e) => {
              let { ext: t } = e;
              return "cdr" === t;
            }).type
          : e.name.toLowerCase().endsWith(".des")
          ? l.FILE_FORMATS.find((e) => {
              let { ext: t } = e;
              return "des" === t;
            }).type
          : void 0;
      }),
      (v.ACCESS_TOKEN_PROP_NAME =
        "designer.filespanel.cloud-account.sharepoint.token"),
      (v.getInstance = function (e) {
        return (
          e.id || (e.id = "".concat(e.accountId, ".").concat(e.tenant)),
          (m[e.id] && m[e.id].TOKEN) || (m[e.id] = new v(e)),
          v.clearOldAccessTokens(),
          m[e.id]
        );
      }),
      (v.deleteToken = function (e) {
        gContainer.removeProperty(
          "".concat(v.ACCESS_TOKEN_PROP_NAME, ".").concat(e)
        );
      }),
      (v.getUserId = function () {
        return gDesigner.getSyncUser().id;
      }),
      (v.getUserEmail = function () {
        return gDesigner.getSyncUser().email;
      }),
      (v.clearOldAccessTokens = function () {
        const e = [],
          t = gContainer.getStorageLength();
        for (let n = 0; n < t; n++) {
          let t = gContainer.getPropertyKeyByIndex(n);
          0 === t.indexOf("".concat(v.ACCESS_TOKEN_PROP_NAME, ".")) &&
            e.push(t);
        }
        const n = v.getUserId();
        for (let t = 0; t < e.length; t++) {
          o(e[t]);
        }
        function o(e) {
          gContainer.getProperty(e).then((t) => {
            v.isTokenValid(t, n) || gContainer.removeProperty(e);
          });
        }
      }),
      (v.isTokenValid = function (e, t) {
        const n = gContainer.getSharepointAuthenticator();
        return n
          ? n.isTokenValid(e)
          : !(!e || !e.expires || e.expires <= Date.now() / 1e3) &&
              !(!e.id || e.id !== t);
      }),
      (v.getCachedToken = function (e) {
        return gContainer.getProperty(
          "".concat(v.ACCESS_TOKEN_PROP_NAME, ".").concat(e)
        );
      }),
      (v.getValidCachedTokenOrNull = async function (e) {
        const t = await v.getCachedToken(e);
        return v.isTokenValid(t, v.getUserId()) ? t : null;
      }),
      (v.saveTokenToCache = async function (e, t) {
        gContainer.setProperty(
          "".concat(v.ACCESS_TOKEN_PROP_NAME, ".").concat(e),
          t
        );
      }),
      (v.ExceptionCode = { LoginAborted: 1, FileAlreadyCheckedOut: 423 });
    class _ extends d.default {
      constructor(e, t) {
        super(e),
          (this.code = t),
          (this.__proto__ = _.prototype),
          (this.name = "SharepointException");
      }
      toString() {
        return "[Object SharepointException]";
      }
    }
    (v.SharepointException = _),
      (v._logoutAndClearAdalCache = function (e) {
        var t = new a.default(e);
        t.clearCache(), t.getCachedUser() && t.logOut(), (t._user = null);
        var n = [];
        for (let e = 0; e < localStorage.length; e++)
          "adal." === localStorage.key(e).substring(0, 5) &&
            n.push(localStorage.key(e));
        for (let e = 0; e < n.length; e++) localStorage.removeItem(n[e]);
      }),
      (v.prototype.getSettings = function () {
        return {
          tenant: this.BASE_URL,
          domain: this.DOMAIN,
          clientID: this.CLIENT_ID,
          accountId: this.SETTINGS_ID,
          authTenant: this.AUTH_TENANT,
          corporate: this.CORPORATE,
          token: this.TOKEN,
          relativePath: this.RELATIVE_PATH,
          type: l.EXTERNAL_APP.SHAREPOINT,
        };
      }),
      (v.prototype.getId = function () {
        return this.SETTINGS_ID;
      }),
      (v.prototype.getFile = function (e) {
        return this.getRawFile(e).then(function (e) {
          return s.default.createUint8ArrayFromBlob(e);
        });
      }),
      (v.prototype.queryFiles = function (e) {
        return this.get(this._createQueryFilesURL(e));
      }),
      (v.prototype.fetchFolders = function (e, t, n) {
        const o = this.getSanitizedFolderRelativePath(e.relativeUrl);
        var i = "/_api/web/GetFolderByServerRelativeUrl('"
          .concat(encodeURI(o), "')/Folders?$orderby=")
          .concat(encodeURI(t));
        return (
          n > 0 && (i += "&$top=".concat(n)),
          this.get(i).then((t) => {
            let { value: n } = t;
            const o = [];
            if (!n || !n.length) return o;
            for (let t = 0, i = n.length; t < i; t++) {
              let i = n[t];
              if (!i.Exists) continue;
              const a = v.convertFolderToCloudItem(i);
              (a.parent = e), o.push(a);
            }
            return o;
          })
        );
      }),
      (v.prototype.queryFilesByOwner = function (e, t) {
        const n = (function (e) {
          return (
            e.searchParams.append("$select", "*"),
            e.searchParams.append("$expand", "Author"),
            e.searchParams.append("$filter", "Author/Id eq ".concat(t)),
            e
          );
        })(this._createQueryFilesURL(e));
        return this.get(n);
      }),
      (v.prototype._createQueryFilesURL = function (e) {
        const { folderRelativeUrl: t, orderBy: n, limit: o, skip: i } = e,
          a = this.getSanitizedFolderRelativePath(t),
          r = this.getAPIEndpointURL(
            "/_api/web/GetFolderByServerRelativeUrl('".concat(a, "')/Files")
          );
        return (
          r.searchParams.append("$orderby", n),
          r.searchParams.append("$top", o),
          r.searchParams.append("$skip", i),
          r
        );
      }),
      (v.prototype.findFileById = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        return this.get(
          "/_api/search/query?querytext='" +
            e +
            "'&selectproperties='Title,Filename,ParentLink,DefaultEncodingURL'",
          { headers: t }
        ).then((e) => {
          if (e) {
            const {
                PrimaryQueryResult: {
                  RelevantResults: {
                    Table: {
                      Rows: [t],
                    },
                  },
                },
              } = e,
              n = t.Cells.find((e) => {
                let { Key: t } = e;
                return "Filename" === t;
              }).Value;
            return {
              name: t.Cells.find((e) => {
                let { Key: t } = e;
                return "Title" === t;
              }).Value,
              type: v.getFileType({ name: n }),
              relativeUrl: t.Cells.find((e) => {
                let { Key: t } = e;
                return "DefaultEncodingURL" === t;
              }).Value.replace("https://".concat(this.BASE_URL), ""),
            };
          }
          return null;
        });
      }),
      (v.prototype.getAdditionalItemData = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        const n = "/_api/web/GetFileByServerRelativeUrl('".concat(
          encodeURI("".concat(e.relativeUrl)),
          "')/ListItemAllFields?expand=Properties"
        );
        return this.get(n, { headers: t });
      }),
      (v.prototype.checkOutFile = async function (e) {
        const t = "/_api/web/GetFileByServerRelativeUrl('".concat(
          e.relativeUrl,
          "')/CheckOut()"
        );
        return this.post(t).catch((e) => {
          if (e.status === v.ExceptionCode.FileAlreadyCheckedOut)
            throw new v.SharepointException(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GFilesPanelViewSharepoint",
                  "text.error-file-is-already-checked-out-by-someone-else"
                )
              ),
              v.ExceptionCode.FileAlreadyCheckedOut
            );
          throw e;
        });
      }),
      (v.prototype.discardCheckOut = function (e) {
        var t = "/_api/web/GetFileByServerRelativeUrl('".concat(
          e.relativeUrl,
          "')/UndoCheckOut()"
        );
        return this.post(t);
      }),
      (v.prototype.checkInFile = function (e) {
        let t =
            arguments.length > 1 && void 0 !== arguments[1]
              ? arguments[1]
              : "New Comment",
          n =
            arguments.length > 2 && void 0 !== arguments[2]
              ? arguments[2]
              : v.CheckinType.MinorCheckIn;
        const o = "/_api/web/GetFileByServerRelativeUrl('"
          .concat(e.relativeUrl, "')/CheckIn(comment='")
          .concat(t, "', checkintype=")
          .concat(n, ")");
        return this.post(o);
      }),
      (v.prototype.getCheckOutFileInfo = function (e) {
        const t = "/_api/web/GetFileByServerRelativeUrl('".concat(
          e.relativeUrl,
          "')/checkedOutByUser"
        );
        return this.get(t);
      }),
      (v.prototype.getCheckOutFileStatus = async function (e) {
        if (e.hasOwnProperty("checkedOut") && !e.checkedOut)
          return v.FILE_STATUS.AVAILABLE;
        const t = await this.getCheckOutFileInfo(e).catch(
          (e) => (
            console.error(">>>error retrieving checkout info: ", e.message),
            null
          )
        );
        if (!t || !0 === t["odata.null"]) return v.FILE_STATUS.AVAILABLE;
        const n = await this._getUser();
        return t.UserId.NameId === n.getNameId()
          ? v.FILE_STATUS.LOCKED_BY_ME
          : v.FILE_STATUS.LOCKED;
      }),
      (v.prototype._getUser = async function () {
        return (
          this._user || (this._user = new u.default(await this.getUser())),
          this._user
        );
      }),
      (v.prototype.getFileCreator = async function (e) {
        return new u.default(await this._getFileCreator(e));
      }),
      (v.prototype.getLibrarySettings = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : null;
        return this.get("/_api/web/lists/getByTitle('Documents')", {
          headers: e,
        }).then((e) => ({
          enableVersioning: e.EnableVersioning,
          enableMinorVersions: e.EnableMinorVersions,
          enableFolderCreation: e.EnableFolderCreation,
          forceCheckout: e.ForceCheckout,
        }));
      }),
      (v.prototype.getFileDetails = async function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        try {
          return await this._getFileDetailsByRelativeURL(e, t);
        } catch (n) {
          if (e.id) {
            const n = await this.findFileById(e.id);
            return this._getFileDetailsByRelativeURL(n, t);
          }
          throw n;
        }
      }),
      (v.prototype._getFileDetailsByRelativeURL = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        const n = "/_api/web/GetFileByServerRelativeUrl('".concat(
          encodeURI("".concat(e.relativeUrl)),
          "')"
        );
        return this.get(n, { headers: t });
      }),
      (v.prototype.getFolderDetails = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        const n = this.getSanitizedFolderRelativePath(e.relativeUrl),
          o = "/_api/web/GetFolderByServerRelativeUrl('".concat(
            encodeURI(n),
            "')"
          );
        return this.get(o, { headers: t });
      }),
      (v.prototype.getParentFolder = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        const n = this.getSanitizedFolderRelativePath(e.relativeUrl),
          o = "/_api/Web/GetFolderByServerRelativePath(decodedurl='".concat(
            encodeURI(n),
            "')/ParentFolder"
          );
        return this.get(o, { headers: t });
      }),
      (v.prototype.copyFileTo = function (e, t) {
        var n = "/_api/web/GetFileByServerRelativeUrl('"
          .concat(encodeURI(e.relativeUrl), "')/copyto(strnewurl='")
          .concat(encodeURI(t.relativeUrl), "/")
          .concat(e.name, ".")
          .concat(e.extension, "',boverwrite=false)");
        return this.post(n, null, { rawResponse: !0 });
      }),
      (v.prototype.moveFileTo = function (e, t) {
        var n = "/_api/web/GetFileByServerRelativeUrl('"
          .concat(encodeURI(e.relativeUrl), "')/moveto(newurl='")
          .concat(encodeURI(t.relativeUrl), "/")
          .concat(e.name, ".")
          .concat(e.extension, "',flags=0)");
        return this.post(n, null, { rawResponse: !0 });
      }),
      (v.prototype.moveFolderTo = function (e, t) {
        var n = "/_api/web/GetFolderByServerRelativeUrl('"
          .concat(encodeURI(e.relativeUrl), "')/moveto(newurl='")
          .concat(encodeURI(t.relativeUrl), "/")
          .concat(e.name, "')");
        return this.post(n, null, { rawResponse: !0 });
      }),
      (v.prototype.folderExists = function (e, t) {
        const n = this.getSanitizedFolderRelativePath(t.relativeUrl);
        return this.get(
          "/_api/Web/GetFolderByServerRelativePath(decodedurl='".concat(
            encodeURI("".concat(n) + "".concat(e ? "/".concat(e) : "")),
            "')/Exists/$value"
          )
        ).catch((e) => (!e.status || 404 !== e.status) && Promise.reject(e));
      }),
      (v.prototype.fileExists = function (e, t) {
        return this.get(
          "/_api/web/GetFileByServerRelativeUrl('".concat(
            encodeURI("".concat(t.relativeUrl, "/").concat(e)),
            "')/Exists/$value"
          )
        ).catch((e) => (!e.status || 404 !== e.status) && Promise.reject(e));
      }),
      (v.prototype.getRawFile = function (e, t) {
        var n = "/_api/web/GetFileByServerRelativeUrl('".concat(
          e.relativeUrl,
          "')/$value"
        );
        return this.get(n, { rawResponse: !0, progress: t }).then((e) =>
          e.blob()
        );
      }),
      (v.prototype.getUser = function () {
        return this.get("/_api/Web/CurrentUser");
      }),
      (v.prototype._getFileCreator = function (e) {
        var t = "/_api/web/GetFileByServerRelativeUrl('".concat(
          e.relativeUrl,
          "')/Author"
        );
        return this.get(t);
      }),
      (v.prototype.get = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        return this._query("GET", e, null, t);
      }),
      (v.prototype.post = function (e, t) {
        let n,
          o =
            arguments.length > 2 && void 0 !== arguments[2]
              ? arguments[2]
              : null;
        return (
          (n = o && o.blobRequest ? new Blob([t]) : t),
          this._query("POST", e, n, o)
        );
      }),
      (v.prototype._query = function (e, t) {
        let n,
          o =
            arguments.length > 2 && void 0 !== arguments[2]
              ? arguments[2]
              : null,
          i =
            arguments.length > 3 && void 0 !== arguments[3]
              ? arguments[3]
              : null;
        return (
          (n =
            (i && i.fullLink) || t instanceof URL
              ? t instanceof URL
                ? t.toString()
                : t
              : this.getAPIEndpointURL(t).toString()),
          this.query(e, n, o, i)
        );
      }),
      (v.prototype.getAPIEndpointURL = function (e) {
        return new URL("https://".concat(this.BASE_URL).concat(e));
      }),
      (v.prototype.hasPermissionToAccessFolder = async function (e) {
        try {
          return !!(await this.getFolderDetails(e));
        } catch (e) {
          return (
            (!e ||
              (e.status !== l.HTTP_STATUS_CODES.FORBIDDEN &&
                e.status !== l.HTTP_STATUS_CODES.NOT_FOUND)) &&
            (console.error(
              "GSharePointClient - failed to check folder permissions",
              e
            ),
            !1)
          );
        }
      }),
      (v.prototype.getEffectiveBasePermissions = function (e) {
        return this.query(
          "GET",
          "".concat(e, "/_api/Web/effectiveBasePermissions")
        );
      }),
      (v.prototype.getFileEffectiveBasePermissions = function (e) {
        var t = "/_api/web/GetFileByServerRelativeUrl('".concat(
          e.relativeUrl,
          "')/ListItemAllFields/effectiveBasePermissions"
        );
        return this.get(t);
      }),
      (v.prototype.query = function (e, t) {
        let n =
            arguments.length > 2 && void 0 !== arguments[2]
              ? arguments[2]
              : null,
          o =
            arguments.length > 3 && void 0 !== arguments[3]
              ? arguments[3]
              : null;
        const i = this;
        return new Promise((e, t) =>
          i.TOKEN && v.isTokenValid(i.TOKEN, v.getUserId())
            ? a(e, t)
            : i
                .connect()
                .then(() => {
                  a(e, t);
                })
                .catch((e) => {
                  t(e);
                })
        );
        async function a(r, s) {
          const l = {
            method: e,
            cache: "no-cache",
            headers: i._prepareRequestHeaders(e, n, o),
            body: i._prepareRequestBody(e, n, o),
          };
          let d;
          try {
            d = await fetch(t, l);
          } catch (e) {
            return void s(e);
          }
          if (401 === d.status)
            i.clearUserData(),
              i
                .connect(!0)
                .then(() => {
                  a(r, s);
                })
                .catch((e) => {
                  s(e);
                });
          else if (
            200 === d.status ||
            201 === d.status ||
            202 === d.status ||
            204 === d.status
          ) {
            if (o && o.progress && "function" == typeof o.progress)
              return (0, c.readResponseWithProgress)(d, o.progress, !1).then(
                (e) => r(e)
              );
            if (o && o.rawResponse) return r(d);
            let e = {};
            if (204 !== d.status)
              try {
                e = await d.json();
              } catch (e) {
                console.error("Incorrect response format: ", e.message), s(e);
              }
            r(e);
          } else s({ status: d.status, statusText: d.statusText });
        }
      }),
      (v.prototype._prepareRequestHeaders = function (e, t, n) {
        if (n && n.noHeaders) return;
        const o = Object.assign({}, this.HEADERS, {
          Authorization: "Bearer ".concat(this.TOKEN.token),
        });
        this._isBodyRequestRequired(e, t) &&
          ((o["Content-Type"] =
            (n && n.headers && n.headers["Content-Type"]) ||
            "application/json;odata=verbose"),
          (o["Content-Length"] = JSON.stringify(t).length));
        return Object.assign(o, (n && n.headers) || {});
      }),
      (v.prototype._prepareRequestBody = function (e, t, n) {
        let o;
        return (
          this._isBodyRequestRequired(e, t) &&
            (o = n && n.blobRequest ? t : JSON.stringify(t)),
          o
        );
      }),
      (v.prototype._isBodyRequestRequired = function (e, t) {
        return !(!t || !["POST", "PUT", "PATCH"].includes(e));
      }),
      (v.prototype._getSharePointSettings = function () {
        return {
          tenant: this.AUTH_TENANT,
          clientId: this.CLIENT_ID,
          domain: this.DOMAIN,
          loginHint: v.getUserEmail(),
        };
      }),
      (v.prototype.clearUserData = function () {
        (this.TOKEN = null),
          (this._toClear = !0),
          v._logoutAndClearAdalCache(this._getSharePointSettings());
      }),
      (v.prototype._getCachedToken = function (e) {
        return (
          e || (e = (e) => v.isTokenValid(e, v.getUserId())),
          gContainer.getProperty(this._getTokenPropertyName()).then((t) => {
            if (t && e(t)) return t;
          })
        );
      }),
      (v.prototype._setCachedToken = function (e) {
        this.setToken(e),
          gContainer.setProperty(this._getTokenPropertyName(), e);
      }),
      (v.prototype._getTokenPropertyName = function () {
        return ""
          .concat(v.ACCESS_TOKEN_PROP_NAME, ".")
          .concat(this.SETTINGS_ID);
      }),
      (v.prototype.connect = async function (e) {
        let t =
          !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1];
        const n = this,
          o = this._getSharePointSettings(),
          a = 6e4,
          s = 3e3;
        let c,
          d = !1;
        const u = await v.getValidCachedTokenOrNull(n.SETTINGS_ID);
        if (n._connect) return n._connect;
        const p = gContainer.getSharepointAuthenticator();
        return p
          ? !e && u
            ? void (n.TOKEN = u)
            : (l.msTeamsMode
                ? (n._connect = p.authenticate(n._getTeamsCommand()))
                : (n._connect = p.authenticate(o, { clearCache: e })),
              n._connect.then(
                (e) => (
                  (n.TOKEN = f = { id: v.getUserId() }),
                  e.expires && e.token
                    ? ((n.TOKEN.expires = f.expires = Number(e.expires)),
                      (n.TOKEN.token = f.token = e.token))
                    : "string" == typeof e &&
                      ((n.TOKEN.expires = f.expires =
                        Math.floor(Date.now() / 1e3) + 3600),
                      (n.TOKEN.token = f.token = e)),
                  v.saveTokenToCache(n.SETTINGS_ID, n.TOKEN),
                  delete n._connect,
                  n.TOKEN
                )
              ),
              n._connect)
          : ((n._connect = new Promise((s, l) => {
              !(function t(u) {
                gContainer
                  .getProperty(
                    ""
                      .concat(v.ACCESS_TOKEN_PROP_NAME, ".")
                      .concat(n.SETTINGS_ID)
                  )
                  .then((p) => {
                    if (p && !e && v.isTokenValid(p, v.getUserId()))
                      return (n.TOKEN = p), s(), void (n._connect = null);
                    $(window).on("message", b);
                    var m = new URL(
                      "".concat(window.location.origin, "/sp.html")
                    );
                    const y = n._popupToCenter(
                      m.href,
                      "SharePointToken",
                      680,
                      460
                    );
                    if (!y || y.closed || void 0 === y.closed)
                      return (
                        $(window).off("message", b),
                        void l({
                          status: r.WINDOW_STATUS_BLOCKED,
                          message: i.GLocale.get(
                            new i.GLocaleKey(
                              "GExternalStorage",
                              "text.error-window-blocked-alternative"
                            )
                          ),
                        })
                      );
                    (y.onload = function () {
                      n._toClear &&
                        (y.postMessage(
                          { cmd: "clearCachedUser", sharepointSettings: o },
                          ""
                            .concat(window.location.protocol, "//")
                            .concat(window.location.host, "/sp.html")
                        ),
                        delete n._toClear),
                        y.postMessage(
                          { cmd: "sharepointSettings", sharepointSettings: o },
                          ""
                            .concat(window.location.protocol, "//")
                            .concat(window.location.host, "/sp.html")
                        );
                    }),
                      (y.onclose = function () {
                        _ && (clearInterval(_), (_ = null));
                      });
                    var _ = setInterval(function () {
                      y.closed &&
                        !d &&
                        (clearInterval(_),
                        (_ = null),
                        gContainer.removeProperty("sp_getToken_data"),
                        v._logoutAndClearAdalCache(o),
                        c && clearTimeout(c),
                        l(
                          new v.SharepointException(
                            null,
                            v.ExceptionCode.LoginAborted
                          )
                        ));
                    }, 1e3);
                    async function b(e) {
                      let i = e.originalEvent.data;
                      const { cmd: r } = i;
                      if (r && "saveToken" === r)
                        (n.TOKEN = f =
                          {
                            expires: Math.floor(Date.now() / 1e3) + 3600,
                            token: i.token,
                            id: v.getUserId(),
                          }),
                          v.saveTokenToCache(n.SETTINGS_ID, n.TOKEN),
                          (d = !0),
                          g(y),
                          c && clearTimeout(c),
                          $(window).off("message", b),
                          (n._connect = null),
                          s();
                      else if (r && "saveTokenError" === r) {
                        const { error: e } = i;
                        if ("User login is required" === e) return;
                        if (
                          (console.error(">>saveTokenError data", i),
                          c && clearTimeout(c),
                          u)
                        )
                          return void (c = setTimeout(function () {
                            h(y), v._logoutAndClearAdalCache(o), t(!1);
                          }, a));
                        v._logoutAndClearAdalCache(o),
                          h(y),
                          (n._connect = null),
                          l(e);
                      }
                    }
                    u &&
                      (c = setTimeout(function () {
                        g(y), v._logoutAndClearAdalCache(o), t(!1);
                      }, a));
                  });
              })(t);
            })),
            n._connect);
        function g(e) {
          let t =
            arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0;
          setTimeout(() => {
            e.close();
          }, t);
        }
        function h(e) {
          g(e, s);
        }
      }),
      (v.prototype.updateFileContent = function (e, t) {
        return this._putBlob(
          "/_api/web/GetFileByServerRelativeUrl('".concat(
            e.relativeUrl,
            "')/$value"
          ),
          t
        );
      }),
      (v.prototype.updateItem = function (e, t) {
        const n = this.getSanitizedFolderRelativePath(e.relativeUrl);
        return this.post(
          "/_api/web/GetFolderByServerRelativeUrl('".concat(
            n,
            "')/ListItemAllFields"
          ),
          t,
          { headers: { "X-HTTP-Method": "MERGE" } }
        );
      }),
      (v.prototype.deleteItem = function (e) {
        const t = this.getSanitizedFolderRelativePath(e.relativeUrl);
        return this.post(
          "/_api/web/GetFolderByServerRelativeUrl('".concat(t, "')"),
          null,
          { headers: { "X-HTTP-Method": "DELETE" }, rawResponse: !0 }
        ).then((e) => {
          if (200 !== e.status && 204 !== e.status)
            throw new Error(e.statusText);
        });
      }),
      (v.prototype._popupToCenter = function (e, t, n, o) {
        const i = this._getPopupWindowReference(),
          a = i.outerHeight / 2 + i.screenY - n / 2,
          r = i.outerWidth / 2 + i.screenX - o / 2;
        return window.open(
          e,
          t,
          "left="
            .concat(r, ",top=")
            .concat(a, ",width=")
            .concat(o, ",height=")
            .concat(
              n,
              ",menubar=no,toolbar=no,location=no,resizable=no,scrollbars=no"
            )
        );
      }),
      (v.prototype._getPopupWindowReference = function () {
        try {
          window.top.outerHeight;
          return window.top;
        } catch (e) {
          return window;
        }
      }),
      (v.prototype.updateFileContentById = function (e, t) {
        return this._putBlob(
          "/_api/web/GetFileById('".concat(e, "')/$value"),
          t
        );
      }),
      (v.prototype._putBlob = function (e, t) {
        return this.post(e, t, {
          headers: { "X-HTTP-Method": "PUT" },
          blobRequest: !0,
          rawResponse: !0,
        });
      }),
      (v.prototype._getTeamsCommand = function () {
        return y.SHAREPOINT_COMMAND;
      }),
      (v.prototype.createFile = function (e, t) {
        const n = e.parentUrl || e.parent.relativeUrl,
          o = this.getSanitizedFolderRelativePath(n);
        var i = "/_api/web/GetFolderByServerRelativeUrl('"
          .concat(o, "')/Files/add(url='")
          .concat(e.getNameWithExtension(), "',overwrite=true)");
        return this.post(i, t, { blobRequest: !0, rawResponse: !0 });
      }),
      (v.prototype.getAccountByEmail = function (e) {
        if (!e || e.indexOf("@") <= 0)
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GShareDialog", "text.invalid-email")
            ).replace("%email", e)
          );
        var t = "/_api/web/EnsureUser('".concat(e, "')");
        return this.post(t);
      }),
      (v.prototype.isCorporate = function () {
        return this.CORPORATE;
      }),
      (v.prototype.getCorporateProviderName = function () {
        return "microsoft";
      }),
      (v.prototype.toString = function () {
        return "[Object GSharePointClient]";
      });
    t.default = v;
  }