/**
 * Webpack Module #848
 * Type: class
 * Name: GoogleDriveException
 */

function (e, t, n) {
    "use strict";
    n(557);
    var o = n(16);
    n(19),
      n(96),
      n(30),
      n(8),
      n(20),
      n(3),
      n(34),
      n(4),
      n(41),
      n(38),
      n(97),
      n(26),
      n(125),
      n(126),
      n(114);
    var i = n(1),
      a = n(40),
      r = n(593),
      s = o(n(787)),
      l = (function (e, t) {
        if ("function" == typeof WeakMap)
          var n = new WeakMap(),
            o = new WeakMap();
        return (function (e, t) {
          if (!t && e && e.__esModule) return e;
          var i,
            a,
            r = { __proto__: null, default: e };
          if (null === e || ("object" != typeof e && "function" != typeof e))
            return r;
          if ((i = t ? o : n)) {
            if (i.has(e)) return i.get(e);
            i.set(e, r);
          }
          for (const t in e)
            "default" !== t &&
              {}.hasOwnProperty.call(e, t) &&
              ((a =
                (i = Object.defineProperty) &&
                Object.getOwnPropertyDescriptor(e, t)) &&
              (a.get || a.set)
                ? i(r, t, a)
                : (r[t] = e[t]));
          return r;
        })(e, t);
      })(n(789)),
      c = o(n(594));
    const d = n(1108),
      u = n(595),
      { HTTP_STATUS_CODES: p } = n(10);
    function g(e) {
      this.setTokenIssuer(e);
    }
    (g.TRIAL_UNTIL_FAIL = 3),
      (g.isUsageLimitError = function (e) {
        return (
          !(!e || !e.error) &&
          Number(e.error.code) === p.FORBIDDEN &&
          e.error.errors.some((e) => "usageLimits" === e.domain)
        );
      }),
      (g.ExceptionCode = { LoginAborted: 1 });
    class h extends c.default {
      constructor(e, t) {
        super(e),
          (this.code = t),
          (this.__proto__ = h.prototype),
          (this.name = "GoogleDriveException");
      }
      toString() {
        return "[Object GoogleDriveException]";
      }
    }
    (g.GoogleDriveException = h),
      (g.prototype.setTokenIssuer = function (e) {
        this._tokenIssuer = e;
      }),
      (g.prototype.getTokenIssuerSettings = function () {
        return this._tokenIssuer ? this._tokenIssuer.getSettings() : null;
      }),
      (g.prototype.getSettings = function () {
        return this.getTokenIssuerSettings();
      }),
      (g.prototype.getAccessToken = async function () {
        return (
          this._tokenIssuer &&
            (this._accessToken = await this._tokenIssuer.get()),
          this._accessToken
        );
      }),
      (g.prototype.upload = function (e, t, n) {
        let o =
            arguments.length > 3 && void 0 !== arguments[3]
              ? arguments[3]
              : g.DefaultUploadType,
          i = arguments.length > 4 ? arguments[4] : void 0;
        switch (o) {
          case g.UploadType.Simple:
            return this._simpleUpload(e, t, n);
          case g.UploadType.Resumable:
            return this._resumableUpload(e, t, n, i);
        }
      }),
      (g.prototype.isCorporate = function () {
        if (!this.getTokenIssuerSettings()) throw "No Token Issuer for Google";
        return this.getTokenIssuerSettings().corporate;
      }),
      (g.prototype.getCorporateProviderName = function () {
        return "google";
      }),
      (g.prototype.getFilePermissions = async function (e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        if (
          !this.getTokenIssuerSettings() ||
          !this.getTokenIssuerSettings().corporate
        )
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GGoogleDrive", "error.only-for-corporate")
            )
          );
        if (!e)
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GGoogleDrive", "error.no-file-found")
            )
          );
        let n = [];
        const o = await this.getAccessToken(),
          a = { fields: "*", supportsAllDrives: !0, pageSize: 50 };
        return new Promise((i, r) => {
          !(function l(c) {
            const d = new URL(
                "https://www.googleapis.com/drive/v3/files/".concat(
                  e,
                  "/permissions"
                )
              ),
              u = Object.assign({}, a);
            c && (u.pageToken = c);
            for (var p in u) d.searchParams.append(p, u[p]);
            return fetch(d.toString(), {
              method: "GET",
              headers: new Headers({ Authorization: "Bearer ".concat(o) }),
            })
              .then((e) => e.json())
              .then((e) => {
                const { permissions: o, nextPageToken: a } = e;
                o.length && (n = n.concat(o)),
                  a
                    ? setTimeout(function () {
                        l(a);
                      })
                    : i(
                        t
                          ? n
                          : n.map((e) => {
                              let { emailAddress: t, role: n } = e;
                              return {
                                email: t,
                                role: s.default[n],
                                externalRole: n,
                              };
                            })
                      );
              })
              .catch((e) => r(e));
          })();
        });
      }),
      (g.prototype.createOrUpdateUserShare = async function (e, t) {
        if (!e)
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GGoogleDrive", "error.no-file-found")
            )
          );
        if (
          !this.getTokenIssuerSettings() ||
          !this.getTokenIssuerSettings().corporate
        )
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GGoogleDrive", "error.only-for-corporate")
            )
          );
        const { role: n, emailAddress: o } = t;
        if (!n || !o)
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GGoogleDrive", "error.not-enough-parameters")
            )
          );
        const a = await this.getShareIdForEmail(e, o).catch(() => []),
          r = { type: "user", emailAddress: o, role: l.default[n.id] };
        if (a && a.length > 0) {
          const t = await this.removeShare(e, a[0]);
          if (t.error) {
            const {
              error: {
                errors: [{ message: e }],
              },
            } = t;
            return Promise.reject(e);
          }
          if (r.role === l.NoAccessId) return t;
        }
        return this._createShare(e, r).then((e) => {
          if (e.error) {
            const {
              error: {
                errors: [{ message: t }],
              },
            } = e;
            return Promise.reject(t);
          }
          return e;
        });
      }),
      (g.prototype.createDomainShare = function (e, t) {
        if (!e)
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GGoogleDrive", "error.no-file-found")
            )
          );
        if (
          !this.getTokenIssuerSettings() ||
          !this.getTokenIssuerSettings().corporate
        )
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GGoogleDrive", "error.only-for-corporate")
            )
          );
        const { role: n, domain: o } = t;
        if (!n || !o)
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GGoogleDrive", "error.not-enough-parameters")
            )
          );
        const a = {
          type: "domain",
          domain: o,
          role: l.default[n.id],
          allowFileDiscovery: !0,
        };
        return this._createShare(e, a);
      }),
      (g.prototype._createShare = async function (e, t) {
        if (
          !this.getTokenIssuerSettings() ||
          !this.getTokenIssuerSettings().corporate
        )
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GGoogleDrive", "error.only-for-corporate")
            )
          );
        const n = new URL(
            "https://www.googleapis.com/drive/v3/files/".concat(
              e,
              "/permissions"
            )
          ),
          o = await this.getAccessToken(),
          a = { fields: "*", supportsAllDrives: !0, sendNotificationEmail: !1 };
        for (var r in a) n.searchParams.append(r, a[r]);
        return fetch(n.toString(), {
          method: "POST",
          headers: new Headers({
            Authorization: "Bearer ".concat(o),
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(t),
        }).then((e) => e.json());
      }),
      (g.prototype.getShareIdForEmail = async function (e, t) {
        return this.getTokenIssuerSettings() &&
          this.getTokenIssuerSettings().corporate
          ? (await this.getFilePermissions(e, !0)).filter((e) => {
              let { emailAddress: n } = e;
              return n === t;
            })
          : Promise.reject(
              i.GLocale.get(
                new i.GLocaleKey("GGoogleDrive", "error.only-for-corporate")
              )
            );
      }),
      (g.prototype.removeShare = async function (e, t) {
        let { id: n } = t;
        if (
          !this.getTokenIssuerSettings() ||
          !this.getTokenIssuerSettings().corporate
        )
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GGoogleDrive", "error.only-for-corporate")
            )
          );
        const o = new URL(
            "https://www.googleapis.com/drive/v3/files/"
              .concat(e, "/permissions/")
              .concat(n)
          ),
          a = await this.getAccessToken(),
          r = { fields: "*", supportsAllDrives: !0 };
        for (var s in r) o.searchParams.append(s, r[s]);
        return fetch(o.toString(), {
          method: "DELETE",
          headers: new Headers({ Authorization: "Bearer ".concat(a) }),
        }).then((e) => (204 !== e.status ? e.json() : e));
      }),
      (g.prototype._simpleUpload = async function (e, t, n) {
        const o = await this.getAccessToken();
        return new Promise((i, a) => {
          var r = new FormData();
          r.append(
            "metadata",
            new Blob([JSON.stringify(n)], { type: "application/json" })
          ),
            r.append("file", t);
          var s = new URL(
              "https://www.googleapis.com/upload/drive/v3/files/".concat(
                e || ""
              )
            ),
            l = { uploadType: "multipart", fields: "*" };
          for (var c in (n.hasOwnProperty("driveId") &&
            (l.supportsAllDrives = !0),
          l))
            s.searchParams.append(c, l[c]);
          fetch(s.toString(), {
            method: e ? "PATCH" : "POST",
            headers: new Headers({ Authorization: "Bearer ".concat(o) }),
            body: r,
          })
            .then((e) => e.json())
            .then((e) => {
              i(e);
            })
            .catch((e) => {
              console.error(e), a(e);
            });
        });
      }),
      (g.prototype._resumableUpload = async function (e, t, n, o) {
        const i = await this.getAccessToken();
        return new Promise((a, r) => {
          var s = n.mimeType || "application/octet-stream";
          const l = { fields: "*" };
          n.hasOwnProperty("driveId") && (l.supportsAllDrives = !0),
            new d({
              file: t,
              fileId: e,
              token: i,
              contentType: s,
              metadata: n,
              params: l,
              onComplete: function (e) {
                var t;
                try {
                  t = "string" == typeof e ? JSON.parse(e) : e;
                } catch (n) {
                  t = e;
                }
                a(t);
              },
              onError: function (e) {
                r(e);
              },
              onProgress: function (e) {
                o && o(e.loaded / e.total);
              },
            }).upload();
        });
      }),
      (g.prototype._request = async function (e, t, n, o) {
        o = "number" == typeof o ? o : 0;
        const i = await this.getAccessToken(),
          r = { Authorization: "Bearer ".concat(i) },
          s = t.headers ? Object.assign(r, t.headers) : r;
        return (
          delete t.headers,
          fetch(
            e,
            Object.assign({ headers: new Headers(s), signal: n }, t)
          ).then(async (i) => {
            if (!i.ok) {
              var r = await i.json();
              return i.status === p.UNAUTHORIZED &&
                (await gContainer.getGoogleAPI().signIn(), 0 === o)
                ? this._request(e, t, n, ++o)
                : i.status === p.FORBIDDEN &&
                  g.isUsageLimitError(r) &&
                  o < g.TRIAL_UNTIL_FAIL
                ? (await (0, a.sleep)(1e3 * Math.pow(1 + o, 2)),
                  this._request(e, t, n, ++o))
                : Promise.reject(r);
            }
            return i;
          })
        );
      }),
      (g.prototype._requestWithProgress = async function (e, t, n, o, i) {
        i = "number" == typeof i ? i : 0;
        const s = await this.getAccessToken(),
          l = { Authorization: "Bearer ".concat(s) },
          c = t.headers ? Object.assign(l, t.headers) : l;
        delete t.headers;
        const d = await fetch(
          e,
          Object.assign({ headers: new Headers(c), signal: n }, t)
        );
        if (!d.ok) {
          var u = await d.json();
          return d.status === p.UNAUTHORIZED &&
            (await gContainer.getGoogleAPI().signIn(), 0 === i)
            ? this._requestWithProgress(e, t, n, o, ++i)
            : d.status === p.FORBIDDEN &&
              g.isUsageLimitError(u) &&
              i < g.TRIAL_UNTIL_FAIL
            ? (await (0, a.sleep)(1e3 * Math.pow(1 + i, 2)),
              this._requestWithProgress(e, t, n, o, ++i))
            : Promise.reject(u);
        }
        return (0, r.readResponseWithProgress)(d, o, !0);
      }),
      (g.prototype.getFile = function (e, t, n, o) {
        var i = new URL(
          "https://www.googleapis.com/drive/v3/files/".concat(e, "?alt=media")
        );
        for (var a in t) i.searchParams.append(a, t[a]);
        return this._requestWithProgress(
          i.toString(),
          { method: "GET" },
          n,
          o
        ).then((e) => e.blob());
      }),
      (g.prototype.getFileDetails = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        var n = new URL(
          "https://www.googleapis.com/drive/v3/files/".concat(e, "?fields=*")
        );
        for (var o in t) n.searchParams.append(o, t[o]);
        return this._request(n.toString(), { method: "GET" }).then((e) =>
          e.ok ? e.json() : e.json().then((e) => Promise.reject(e))
        );
      }),
      (g.prototype.fileExists = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        return this.getFileDetails(e, t)
          .then(() => !0)
          .catch((e) => {
            if (e.error) {
              if (e.error.code === p.NOT_FOUND) return !1;
              const t = new Error(e.error.message);
              throw ((t.code = e.error.code), t);
            }
            throw new Error();
          });
      }),
      (g.prototype.updateFileDetails = function (e) {
        let t =
            arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
          n =
            arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
        if (Object.keys(t).length < 1) return Promise.resolve();
        var o = new URL("https://www.googleapis.com/drive/v3/files/".concat(e));
        for (var i in n) o.searchParams.append(i, n[i]);
        return this._request(o.toString(), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(t),
        });
      }),
      (g.prototype.searchFiles = function (e) {
        var t = new URL("https://www.googleapis.com/drive/v3/files");
        for (var n in e) t.searchParams.append(n, e[n]);
        return this._request(t.toString(), { method: "GET" }).then((e) =>
          e.json()
        );
      }),
      (g.prototype.searchTeamDrives = function (e) {
        var t = new URL("https://www.googleapis.com/drive/v3/drives");
        for (var n in e) t.searchParams.append(n, e[n]);
        return this._request(t.toString(), { method: "GET" }).then((e) =>
          e.json()
        );
      }),
      (g.prototype.getAccountByEmail = function (e) {
        if (!e || e.indexOf("@") <= 0)
          return Promise.reject(
            i.GLocale.get(
              new i.GLocaleKey("GShareDialog", "text.invalid-email")
            ).replace("%email", e)
          );
        var t = new URL(
          "https://www.googleapis.com/admin/directory/v1/users/".concat(
            e,
            "?viewType=domain_public"
          )
        );
        return this._request(t.toString(), { method: "GET" }).then((e) =>
          e.json()
        );
      }),
      (g.prototype.supportsEmailDomainCheck = async function () {
        const e = await this.getTokenInfo().catch(() => null);
        if (!e) return !1;
        const { scope: t } = e;
        return Array.isArray(t) ? t.some((e) => n(e)) : n(t);
        function n(e) {
          return e.indexOf("admin.directory.user") >= 0;
        }
      }),
      (g.prototype.getTokenInfo = async function () {
        var e = new URL(
          "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=".concat(
            await this.getAccessToken()
          )
        );
        return this._request(e.toString(), { method: "GET" }).then((e) =>
          e.json()
        );
      }),
      (g.MimeType = { Folder: "application/vnd.google-apps.folder" }),
      (g.Kind = { TeamDrive: "drive#teamDrive", Drive: "drive#drive" }),
      (g.UploadType = { Simple: "simple", Resumable: "resumeable" }),
      (g.DefaultUploadType = g.UploadType.Resumable),
      (g.CloudToGoogleRoleMap = l.default),
      (g.GoogleToCloudRoleMap = s.default),
      (g.SearchEngine = {
        Sorts: { Ascending: "", Descending: "desc" },
        OrderBy: {
          CreatedTime: "createdTime",
          ModifiedTime: "modifiedTime",
          Name: "name",
          ViewedByMeTime: "viewedByMeTime",
        },
      }),
      (g.build = function (e) {
        if (!e) {
          if (!gContainer.getGoogleAPI().isLoaded())
            throw Error("Google Drive Client not loaded!");
          e = gContainer.getGoogleAPI().getTokenConfiguration({
            corporate: !1,
            accountId: this._accountId,
          });
        }
        return new g(new u(e));
      }),
      (e.exports = g);
  }