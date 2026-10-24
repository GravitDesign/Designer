/**
 * Webpack Module #119
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19),
      n(180),
      n(181),
      n(8),
      n(20),
      n(107),
      n(34),
      n(134),
      n(218),
      n(189),
      n(190),
      n(191),
      n(192),
      n(4),
      n(41),
      n(13),
      n(38),
      n(26),
      n(125),
      n(126),
      n(114);
    var o = n(10),
      i = n(1),
      a = n(15),
      r = n(40),
      s = n(845);
    const l = n(1092);
    var c = n(78),
      d = n(44);
    const u = n(1093);
    var p = n(85),
      g = n(219),
      h = n(358);
    const f = n(86),
      m = (n(156), n(256)),
      y = n(337),
      v = n(435),
      _ = n(165);
    var b = o.FILE_FORMATS.find((e) => e.default),
      w = o.FILE_FORMATS.filter((e) => e.secondary),
      C = o.FOLDER_FORMAT;
    const x = n(555),
      S = 10,
      E = 80,
      A = 90,
      T = 100;
    class G {
      static convertToCloudItem(e) {
        const t = (e) => l.createFrom(e);
        return e instanceof Array ? e.map(t) : t(e);
      }
      static _getAuthorizationToken() {
        return null;
      }
      static syncCloudImages(e, t, n, a) {
        return new Promise((l, c) => {
          try {
            var d = e.getScene(),
              u = d.getDictionary().getEntries(),
              p = [];
            d.acceptChildren((e) => {
              e instanceof i.GImage &&
                p.push({
                  name: e.getProperty("name"),
                  url: e.getProperty("url"),
                });
            });
            const h = G._getAuthorizationToken();
            var g = o.gApi.url;
            (0, s.syncImagesToCloud)(
              (e) => (0, s.listFilesFn)(e, h, g),
              i.GLocale.get(
                new i.GLocaleKey("GCommonNames", "text.untitled-image")
              ),
              p,
              u,
              async (e, t) =>
                (0, s.createFileAndGetSignedPutUrlsFn)(e, t, g, h),
              async (e, t, n) =>
                (0, s.updateFileFn)(
                  e,
                  t,
                  n,
                  g,
                  h,
                  o.COMPUTE_SHA256_FOR_FILES,
                  r.getFileSHA256Digest
                ),
              (e) => {
                try {
                  var t = d.getDictionary().merge(e);
                  try {
                    var o = i.GNode.serialize(
                      d,
                      i.GUtil.extend({ save: !0 }, n)
                    );
                  } finally {
                    d.getDictionary().merge(t);
                  }
                  l([o]);
                } catch (e) {
                  c(e);
                }
              },
              t,
              a
            );
          } catch (e) {
            c(e);
          }
        });
      }
      static resolveImage(e, t) {
        function n(e, t) {
          let n = e.url,
            o = e.scene;
          if (o && o.isReleased()) return !1;
          let r = o && o.getDictionary() && o.getDictionary().getEntry(n);
          return (
            !r ||
            !/^data:.{0,255};base64,/i.exec(r.value) ||
            (r.value.length > a.GPlatform.maxImgDataUrlLength &&
              new g(
                i.GLocale.get(
                  new i.GLocaleKey("GDocument", "text.image-in-design-too-big")
                )
              ).open(),
            e.resolved(r.value),
            !1)
          );
        }
        !(async function () {
          let r = e.url,
            s =
              e.scene &&
              e.scene.getDictionary() &&
              e.scene.getDictionary().getEntry(r);
          if (n(e))
            if ("string" == typeof r && r.startsWith("123rf://")) {
              var l = r.slice(8),
                c = "ec23d185aa5ffb6495e02635803bb081";
              (function (e) {
                var t = "https://www.123rfapis.com/?method=download&id=" + e;
                t += "&dl_type=png";
                const n = Math.floor(Date.now() / 1e3);
                t += "&current_time=" + n;
                var o = (function (e, t, n) {
                  return v(c + "759561ac90761219f6415da66f18a154" + e + t + n);
                })(e, "png", n);
                return (
                  (t += "&sign=" + o),
                  (t += "&api_key=" + c),
                  new Promise((e, n) => {
                    var o = new XMLHttpRequest();
                    o.open("GET", t),
                      (o.onload = function () {
                        if (this.status >= 200 && this.status < 300) {
                          var t = JSON.parse(this.response);
                          e(t.download_url);
                        } else n();
                      }),
                      o.send();
                  })
                );
              })(l).then(
                (n) => {
                  if (n) {
                    var o = new XMLHttpRequest();
                    o.open("GET", n),
                      (o.responseType = "arraybuffer"),
                      (o.onload = function () {
                        if (this.status < 200 || this.status >= 400)
                          alert(
                            "There was a problem downloading requested image"
                          );
                        else {
                          var n = new Blob([this.response], { type: "image" });
                          if (n.size > a.GPlatform.maxPngDataSize)
                            new g(
                              i.GLocale.get(
                                new i.GLocaleKey(
                                  "GDocument",
                                  "text.image-in-design-too-big"
                                )
                              )
                            ).open();
                          else {
                            var o = new FileReader();
                            (o.onload = function () {
                              if (
                                this.result.length >
                                a.GPlatform.maxImgDataUrlLength
                              )
                                return void new g(
                                  i.GLocale.get(
                                    new i.GLocaleKey(
                                      "GDocument",
                                      "text.image-in-design-too-big"
                                    )
                                  )
                                ).open();
                              let n =
                                e.scene &&
                                e.scene.getDictionary() &&
                                e.scene.getDictionary().getEntry(e.url);
                              n &&
                                t &&
                                ((n.cloud = n.value), (n.value = this.result)),
                                e.resolved(this.result);
                            }),
                              (o.onerror = function () {
                                new g(
                                  i.GLocale.get(
                                    new i.GLocaleKey(
                                      "GDocument",
                                      "text.image-in-design-too-big"
                                    )
                                  )
                                ).open();
                              }),
                              o.readAsDataURL(n);
                          }
                        }
                      }),
                      o.send();
                  } else
                    alert("There was a problem downloading the image selected");
                },
                () => {
                  alert("There was a problem downloading requested image");
                }
              );
            } else if (
              /^(dictionary|gravit|document|asset|magenta)/.test(r) &&
              (r.startsWith(i.GDictionary.PROTOCOL) &&
                ((r =
                  e.scene && e.scene.getDictionary()
                    ? e.scene.getDictionary().getValue(e.url)
                    : null),
                "string" == typeof r &&
                  r.startsWith(i.GDictionary.CLOUD_PROTOCOL) &&
                  (s =
                    e.scene &&
                    e.scene.getDictionary() &&
                    e.scene.getDictionary().getEntry(e.url))),
              "string" == typeof r)
            ) {
              const n = await gDesigner.getUser(),
                i = r.startsWith("magenta"),
                a =
                  e.scene && t.getScene() !== e.scene
                    ? t.getTempCloudStorageItem()
                    : t.getStorageItem();
              var d = a && a.getId();
              if (!n.isAnonymous() && !d && t) {
                (d = (await o.gApi.createFile({ trashed: null })).id),
                  t.setReservedId(d);
              }
              const l = r.slice(r.indexOf("://") + 3),
                c = new URLSearchParams(l);
              let p,
                g,
                h = l;
              if (c.has("id"))
                (h = c.get("id")), (p = c.get("width")), (g = c.get("height"));
              else if (c.has("url")) {
                const e = new URL(c.get("url")).pathname.slice(1).split("/");
                h = "public" == e[0] ? e[2] : e[1];
              } else h = r.slice(r.indexOf("://") + 3);
              return gDesigner.isAnonymous() && i
                ? o.gApi.getFile(h).then((n) => {
                    u(
                      n.url,
                      p,
                      g,
                      (n) => {
                        s && t && ((s.cloud = s.value), (s.value = n)),
                          e.resolved(n);
                      },
                      !0
                    );
                  })
                : o.gApi.resolveUrls(d, h).then((n) => {
                    u(
                      n[0][1],
                      p,
                      g,
                      (n) => {
                        s && t && ((s.cloud = s.value), (s.value = n)),
                          e.resolved(n);
                      },
                      i
                    );
                  });
            }
          function u(t, o, r, s, l) {
            if (!n(e)) return;
            const c = new Image();
            c.crossOrigin = "Anonymous";
            o && (c.width = o),
              r && (c.height = r),
              (c.onload = function () {
                if (!n(e)) return void (c.onload = null);
                const t = document.createElement("CANVAS"),
                  d = t.getContext("2d");
                l &&
                  ([c.width, c.height] = (function (e, t, n) {
                    const o = e.width / t,
                      i = e.height / n;
                    return o < 1 || i < 1
                      ? [e.width, e.height]
                      : o > i
                      ? [t, (t * e.height) / e.width]
                      : [(n * e.width) / e.height, n];
                  })(c, o || 1080, r || 1080));
                let u = !1;
                (c.width > a.GPlatform.maxImgLinearDimension ||
                  c.height > a.GPlatform.maxImgLinearDimension ||
                  c.width * c.height > a.GPlatform.maxImgAreaDots) &&
                  (new g(
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GDocument",
                        "text.image-in-design-too-big"
                      )
                    )
                  ).open(),
                  (u = !0)),
                  (t.width = c.width),
                  (t.height = c.height),
                  d.drawImage(c, 0, 0, c.width, c.height);
                var p = t.toDataURL();
                p.length > a.GPlatform.maxImgDataUrlLength &&
                  !u &&
                  (new g(
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GDocument",
                        "text.image-in-design-too-big"
                      )
                    )
                  ).open(),
                  (u = !0)),
                  (c.onload = null),
                  s(p);
              }),
              (c.src = t);
          }
        })();
      }
      static createFolder(e, t) {
        return new Promise((n, i) => {
          var a = this;
          !(async function () {
            try {
              var r = a.definePath(t);
              await o.gApi.createFile({
                name: e,
                type: C,
                parent: r,
                trashed: !1,
              }),
                n();
            } catch (e) {
              i(e);
            }
          })();
        });
      }
      static definePath(e) {
        return e ? e.id : null;
      }
      static fileExists(e) {
        return o.gApi
          .getFile(e)
          .then(() => !0)
          .catch((e) => {
            if (e.status === o.HTTP_STATUS_CODES.NOT_FOUND) return !1;
            throw e;
          });
      }
      static changePathTree(e, t) {
        return new Promise((n, i) => {
          !(async function () {
            try {
              for (var a = 0; a < e.length; ++a) {
                var r = e[a],
                  s = r.parent;
                t !== s &&
                  r.id !== t &&
                  (await o.gApi.updateFile(r.id, { parent: t }));
              }
              n();
            } catch (e) {
              i(e);
            }
          })();
        });
      }
      static performSignup() {
        return this.performLogin(u.Forms.SignUp);
      }
      static performLogin(e) {
        return new Promise((t, n) => {
          try {
            const n = () => {
              new u((e) => {
                gDesigner.getUser(), t(e);
              }, e).open();
            };
            gDesigner
              .getUser()
              .then((e) => {
                !e || gDesigner.isAnonymous() ? n() : t(e);
              })
              .catch(() => {
                n();
              });
          } catch (e) {
            n(e);
          }
        });
      }
      static createFile(e, t) {
        !(async function () {
          var n = null;
          let i = e.getScene().getActivePage().getGeometryBBox(),
            a = 0,
            r = 0;
          i && ((a = i.getWidth()), (r = i.getHeight()));
          const s = {
            name: e.getTitle(),
            parent: null,
            type: b.type,
            app: "designer",
            unit: e.getScene().getProperty("ut"),
            width: a,
            height: r,
            trashed: null,
          };
          e.getReservedId()
            ? (await o.gApi.updateFile(e.getReservedId(), s),
              (n = e.getReservedId()))
            : (n = await o.gApi.createFile(s)),
            t(n);
        })();
      }
      static loadDesignData(e, t, n, i, a, r) {
        return new Promise(async (s, l) => {
          try {
            let p;
            if (e && r) {
              let t = (a = await o.gApi.getFile(e)).url;
              if (n) {
                t = (await o.gApi.getAutoSave(e, n)).url;
              } else a.autosave && (t = a.autosave_url);
              (p = a.url), (a.url = t);
            } else if (e && !a)
              if (i) a = await o.gApi.getShare(i);
              else {
                var c = n ? "/version/" + n : "";
                a = t
                  ? await o.gApi.getFile(e + c + "?edit")
                  : await o.gApi.getFile(e + c);
              }
            else if (t) {
              const t = a ? a.id : e;
              t &&
                (await o.gApi.file.registerAccess(t).catch((e) => {
                  console.error("Could not register access", e);
                }));
            }
            const g = (e) =>
              fetch(e).then(function (e) {
                if (!e.ok)
                  throw new Error("failed to download, status = " + e.status);
                return e.blob();
              });
            var d = await g(a.url).catch((e) => {
                if (!p) throw e;
                return g(p);
              }),
              u = new FileReader();
            (u.onload = function () {
              s({ data: new Uint8Array(this.result), file: a });
            }),
              (u.onerror = l),
              u.readAsArrayBuffer(
                new Blob([d], { type: "application/octet-stream" })
              );
          } catch (e) {
            l(e);
          }
        });
      }
      static getDesigneDataSize(e) {
        return new Promise(async (t, n) => {
          try {
            var i = await o.gApi.getFile(e);
            return await fetch(i.url, { method: "HEAD" }).then(function (e) {
              var n = e.headers.get("Content-Length");
              t(n);
            });
          } catch (e) {
            n(e);
          }
        });
      }
      static renameFile(e, t, n) {
        !(async function () {
          try {
            await o.gApi.updateFile(e.id, { name: t }), n(!0);
          } catch (e) {
            console.error(e), n(!1);
          }
        })();
      }
      static _checkSecondaryFormatSanity() {
        return !0;
      }
      static performSave(e, t, n, a, r) {
        let s = arguments.length > 5 && void 0 !== arguments[5] && arguments[5];
        if (e.hasPagesWithInfiniteEmptyCanvas())
          return void (n
            ? n({
                code: 507,
                message: i.GLocale.get(
                  new i.GLocaleKey(
                    "GCommonNames",
                    "text.error-emtpy-infinite-canvas"
                  )
                ),
                noFailCall: !0,
              })
            : d.alert(
                i.GLocale.get(
                  new i.GLocaleKey(
                    "GCommonNames",
                    "text.error-emtpy-infinite-canvas"
                  )
                )
              ));
        var l = a;
        function u() {
          let a = !1;
          if (e.isCommercialProductFile()) return void e.openPaywall();
          var u = r || e.getStorageItem();
          const p =
            u &&
            w.length &&
            w.find((e) => e.ext.toUpperCase() === u.getExtension());
          if (p && !G._checkSecondaryFormatSanity(e)) return void (n && n());
          const g = e.getEditor().markSavePoint();
          var m = function (o) {
            g.rollback(),
              s ||
                (o && 507 === o.code
                  ? d.alert(o.message)
                  : d.confirm(
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GCommonNames",
                          "text.save-to-cloud-failed"
                        )
                      ),
                      function (o) {
                        o
                          ? (gDesigner.stats(
                              "savealert_save-failed_click-save-local"
                            ),
                            gDesigner.executeAction(
                              "file.save-as.".concat(b.ext),
                              [null, e],
                              void 0,
                              !0
                            ))
                          : (gDesigner.stats(
                              "savealert_save-failed_dont-save-local"
                            ),
                            "function" != typeof n || a
                              ? "function" == typeof t && t(!1)
                              : ((a = !0), n()));
                      },
                      i.GLocale.get(new i.GLocaleKey("GLocale", "no")),
                      i.GLocale.get(new i.GLocaleKey("GLocale", "yes"))
                    )),
              o && console.log(o),
              e.updateStatus(f.SaveFailed),
              e.setSynchronizing(!1),
              e.setErrored(!0),
              gDesigner.trigger(new c(c.Type.SynchronismUpdateFailed, e)),
              n && !a && ((a = !0), n());
          };
          try {
            const n = {};
            e.setSynchronizing(!0), e.updateStatus(f.Saving, n);
            const { progress: a } = n,
              r = (e) => {
                a && a(e);
              };
            !(async function (t) {
              var n = null;
              try {
                let t = {
                  unit: e.getScene().getProperty("ut"),
                  width: 0,
                  height: 0,
                };
                if (o.HAS_ANNOTATIONS)
                  if (p) {
                    let t = !0;
                    await h.saveDocumentAnnotations(e, t);
                    l = e.updateSaveOptionsLastModifiedDate(l);
                  } else
                    try {
                      let n = (await h.getCloudAnnotationsForDocument(e))
                        .annotationsCollection;
                      e.getScene().iteratePages((e) => {
                        !!h.findAnnotationsListForPage(e, n) ||
                          n.push(i.GNode.store(e.getAnnotations()));
                      }, !0),
                        (t.annotations = n);
                    } catch (e) {
                      console.warn("Annotations couldn't be updated on server");
                    }
                let n = e.getScene().getActivePage().getGeometryBBox();
                n && ((t.width = n.getWidth()), (t.height = n.getHeight())),
                  await o.gApi.updateFile(u._id, t);
              } catch (e) {
                n = e;
              }
              t(n);
            })(function (n) {
              r(S),
                n
                  ? m(n)
                  : u.write(
                      e,
                      function () {
                        r(A),
                          e.setSynchronizing(!1),
                          e.setErrored(!1),
                          gDesigner.hasEventListeners(c) &&
                            gDesigner.trigger(new c(c.Type.Modified, e));
                        var n = (n, o) => {
                          try {
                            n &&
                              (e.updateStatus(f.Saved, l),
                              gDesigner.updateRecentDocumentsAction(),
                              e
                                .getStorageItem()
                                .setFileAutoSaveLastModifiedDate(
                                  new Date(o.autosave_updated)
                                ),
                              e
                                .getStorageItem()
                                .setFileLastModifiedDate(new Date(o.updated)));
                          } finally {
                            r(T), t && t();
                          }
                        };
                        o.gApi
                          .getFile(u._id + "?edit")
                          .then((e) => n(!0, e))
                          .catch(n);
                      },
                      function (e) {
                        m(e);
                      },
                      (e) => {
                        r(x.calculateProgress(S, E, e / 100));
                      },
                      l
                    );
            });
          } catch (e) {
            m(e);
          }
        }
        const p = () => {
          gDesigner.getUser().then((e) => {
            !e || gDesigner.isAnonymous() ? G.performLogin().then(u) : u();
          });
        };
        gDesigner.isOffline() ? m.openUnavailableFeature(p) : p();
      }
      static async updateFileThumbnail(e, t, n, i) {
        var a = await o.gApi.signedPutUrls(e, { type_t: n, commit: i }),
          r = new XMLHttpRequest();
        r.open("PUT", a.url_t);
        var s = {
          "Content-Type": n,
          "Cache-Control": "public,max-age=31600000",
        };
        for (var l in s) r.setRequestHeader(l, s[l]);
        r.send(t);
      }
      static async saveDocumentAnnotations(e, t, n) {
        return (
          !!o.HAS_ANNOTATIONS &&
          (gDesigner.isOffline()
            ? (console.warn("Failed to record annotations"), !1)
            : gDesigner
                .getUser()
                .then(
                  (o) =>
                    !(!o || gDesigner.isAnonymous()) &&
                    h.saveDocumentAnnotations(e, t, void 0, n)
                ))
        );
      }
      static async getCloudAnnotations(e) {
        if (o.HAS_ANNOTATIONS) {
          if (!gDesigner.isOffline())
            return gDesigner.getUser().then((e) => {
              e && gDesigner.isAnonymous();
            });
          console.warn("Failed to get annotations");
        }
      }
      static isOnline() {
        return (
          "undefined" != typeof window &&
          void 0 !== window.gApi &&
          window.gApi.url
        );
      }
      static getRecentStorageItems() {
        let e =
          arguments.length > 0 && void 0 !== arguments[0]
            ? arguments[0]
            : o.FILE_FORMATS;
        var t = this;
        return new Promise((n, i) => {
          !(async function () {
            const a = e.map((e) => e.type).join("|");
            try {
              if (t.isOnline()) {
                var r = await o.gApi.listFiles({
                  type: a,
                  accessed: "true",
                  sort: "-accessed",
                  parent: "*",
                  limit: "10",
                });
                n(r);
              }
            } catch (e) {}
            i([]);
          })();
        });
      }
      static unzipData(e) {
        var t = null;
        try {
          t = _.ungzip(e, { to: "string" });
        } catch (a) {
          if ("undefined" == typeof TextDecoder && e.length > 1e7) {
            for (var n = [], o = e.length, i = 0; i < o; i += 32768)
              n.push(String.fromCharCode.apply(null, e.subarray(i, i + 32768)));
            t = n.join("");
          } else
            try {
              t =
                "undefined" == typeof TextDecoder
                  ? new FakeTextEncoding.TextDecoder("utf-8").decode(e)
                  : new TextDecoder("utf-8").decode(e);
            } catch (e) {
              console.warn("Couldn't unzip data. Data corrupted?");
            }
        }
        return t;
      }
      static resendEmailConfirmation(e) {
        let t, n;
        if (gContainer.getRuntime() === p.Runtime.Electron) {
          const e = gContainer.getPlatform();
          ("darwin" !== e && "win32" !== e) || (t = "designer://"),
            (n = gDesigner.getAssetsURL());
        } else n = location.origin;
        return o.gApi
          .resendEmailConfirmation({
            appUrl: t,
            webUrl: n,
            email: e.getEmail(),
            force: !0,
            origin: location.origin,
          })
          .then(() => {
            let e = {},
              t = new Promise((t) => (e.resolve = t));
            return (
              d.custom({
                title: i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.email-sent-title")
                ),
                subtitle: i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.email-sent-info")
                ),
                icon: "ok",
                closeCallback: () => e.resolve(),
              }),
              t
            );
          })
          .catch((e) =>
            d.custom({
              title: i.GLocale.get(
                new i.GLocaleKey("GCommonNames", "text.something-wrong")
              ),
              subtitle: o.gApi.formatError(e),
            })
          );
      }
      static createUint8ArrayFromBlob(e) {
        return new Promise((t, n) => {
          const o = new FileReader();
          (o.onload = function () {
            t(new Uint8Array(this.result));
          }),
            (o.onerror = n),
            o.readAsArrayBuffer(e);
        });
      }
      static getFileDataForVersionOrAutoSave(e, t, n) {
        return t && !n ? o.gApi.getFile(e, !1, t) : o.gApi.getFile(e);
      }
      static async activateCoupon(e) {
        try {
          const t = await o.gApi.coupon.activate(e);
          await y.checkLicense(),
            gDesigner.addNotification({ message: t.message });
        } catch (e) {
          if (!e.ok && e.code)
            switch (e.code) {
              case o.gApi.ERROR_CODES.ERR_SUBSCRIPTION_COULD_NOT_BE_DEACTIVATED:
                const e = $(
                  "<div>".concat(
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GCloudUtil",
                        "text.err-subscription-could-not-be-deactivated"
                      )
                    ),
                    "</div>"
                  )
                );
                return (
                  e
                    .find("a")
                    .addClass("link")
                    .attr("href", "javascript:void(0)")
                    .on(
                      "click",
                      (e) => (
                        e.preventDefault(),
                        gDesigner.runDeepLink("purchases"),
                        !1
                      )
                    ),
                  d.alert(e)
                );
              case o.gApi.ERROR_CODES.ERR_SUBSCRIPTION_IS_ACTIVE:
                const { nextBillingDate: t } =
                  await o.gApi.subscription.getNextBillingDate();
                return d.alert(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GCloudUtil",
                      "text.err-subscription-is-active"
                    )
                  ).replace("%date", o.DateAPI.format(t))
                );
              case o.gApi.ERROR_CODES.ERR_SUBSCRIPTION_IS_NOT_EXPIRED:
                return d.alert(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GCloudUtil",
                      "text.err-subscription-is-not-expired"
                    )
                  ).replace(
                    "%date",
                    o.DateAPI.format(gDesigner.getLicense().getExpirationDate())
                  )
                );
              case o.gApi.ERROR_CODES.ERR_SUBSCRIPTION_IS_LIFETIME:
                return d.alert(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GCloudUtil",
                      "text.err-subscription-is-lifetime"
                    )
                  )
                );
            }
          gDesigner.addNotification({ message: o.gApi.formatError(e) });
        }
      }
    }
    e.exports = G;
  }