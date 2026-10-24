/**
 * Webpack Module #1253
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19),
      n(180),
      n(181),
      n(8),
      n(91),
      n(218),
      n(189),
      n(190),
      n(191),
      n(192),
      n(4),
      n(41),
      n(13),
      n(38);
    var o = n(1),
      i = n(797),
      a = n(40),
      r = n(10),
      s = n(237),
      l = n(163),
      c = n(442);
    const d = n(389);
    function u() {}
    (window.pako = n(165)),
      n(1514),
      n(1515),
      n(1516),
      (zip.useWebWorkers = !1),
      (u.generateExportables = function (e, t, n) {
        var i = e instanceof Array ? e : [e];
        e instanceof o.GScene &&
          (i = e
            .getChildren()
            .filter((e) => e instanceof o.GPage && e.isVisible()));
        var a = [],
          r = {};
        function s(e) {
          var t = e.getProperty("name");
          if (!t) {
            var n = o.GObject.getTypeId(e);
            r.hasOwnProperty(n) || (r[n] = 0), (t = e.getNodeNameTranslated());
            var i = ++r[n];
            i > 1 && (t += "_" + i);
          }
          return t;
        }
        function l(e) {
          if (t)
            a.push(
              o.GUtil.extend({}, t, {
                element: e,
                name: 1 === i.length && t.name ? t.name : s(e),
              })
            );
          else if (e.hasMixin(o.GNode.Properties)) {
            var r = e.getProperty(c.EXPORT_PROPERTY_NAME, !0);
            if (r && r instanceof Array && r.length)
              for (var d = s(e), u = 0; u < r.length; ++u) {
                var p = r[u];
                p.fm &&
                  a.push(
                    o.GUtil.extend(
                      {},
                      {
                        size: p.sz,
                        suffix: p.sf,
                        format: p.fm,
                        element: e,
                        name: d,
                      }
                    )
                  );
              }
          }
          if (n && e.hasMixin(o.GNode.Container))
            for (var g = e.getFirstChild(); null !== g; g = g.getNext())
              g instanceof o.GElement && l(g);
        }
        for (var d = 0; d < i.length; ++d) {
          l(i[d]);
        }
        return a;
      }),
      (u._validateCommercialDocument = function () {
        const e = gDesigner.getActiveDocument();
        return !e || !e.isCommercialProductFile() || (e.openPaywall(), !1);
      }),
      (u.exportExportable = function (e, t, n, s) {
        if (this._validateCommercialDocument()) {
          var l = e.element,
            c = e.format;
          if ("png" === c || "jpg" === c) {
            var u = null,
              p = null;
            switch (c) {
              case "png":
                u = o.GBitmap.ImageType.PNG;
                break;
              case "jpg":
                (u = o.GBitmap.ImageType.JPEG),
                  (p = (e.jpegQuality || 100) / 100);
            }
            var g = o.GLength.DPI,
              h = i.GBitmapExport.export(
                e.element,
                e.size,
                e.backgroundColor,
                e.configuration,
                g,
                e.backgroundOpacity,
                !0
              );
            h && h.toImageBlob(u, t, p);
          } else if ("svg" === c)
            i.GSVGExport.export(
              l,
              {
                convertTextToPath: e.convertTextToPath,
                decimalPlacesPrecision: a.watchDog.check(
                  e.decimalPlacesPrecision,
                  3
                ),
                preserveEditingCapabilities: a.watchDog.check(
                  e.preserveEditingCapabilities,
                  !1
                ),
                backgroundColor: e.backgroundColor,
                backgroundOpacity: e.backgroundOpacity,
                sceneBackground:
                  !e.configuration ||
                  e.configuration.sceneBackground ||
                  !!e.backgroundColor,
                layerNamesAsId: a.watchDog.check(e.layerNamesAsId, !1),
              },
              function (e, n) {
                !e && n && t(new Blob([n], { type: "image/svg+xml" }));
              }
            );
          else {
            if (c !== d.PDF.ext) throw new Error("Unknown format.");
            gDesigner.getUser().then(function (c) {
              var u;
              u =
                c && c.getFullUserName()
                  ? c.getFullUserName()
                  : o.GLocale.get(
                      new o.GLocaleKey(
                        "GDocument",
                        "text.default-export-author"
                      )
                    );
              var p = {
                  dpi: a.watchDog.check(
                    o.GUtil.parseNumber(e.size),
                    o.GUtil.parseNumber("72dpi")
                  ),
                  colorSpace: e.colorSpace,
                  jpegQuality: e.jpegQuality || r.JPEG_EXPORT_QUALITY_DEFAULT,
                  configuration: e.configuration,
                  backgroundColor: e.backgroundColor,
                  backgroundOpacity: e.backgroundOpacity,
                  convertTextToPath: e.convertTextToPath,
                  progress: n,
                  user: u,
                  title: gDesigner.getWindows().getActiveWindow().getTitle(),
                  downsampleImages: e.downsampleImages,
                },
                g = i.GPDFExport.export(
                  l,
                  p,
                  function (e, n) {
                    !e && n && t(new Blob([n], { type: d.PDF.mime })),
                      s &&
                        (g.isAbort()
                          ? s.close && s.close()
                          : e && s.error && s.error(e));
                  },
                  null,
                  s
                );
              s && (s.abort = () => g && g.abort());
            });
          }
        }
      }),
      (u.generateExportName = function (e, t, n) {
        var i = o.GUtil.sanitizeFilename(t || e.name) + (e.suffix || "");
        if (n) {
          var a = n.filter(function (t) {
            return t.name === i && t.format === e.format;
          });
          n.push({ name: i, format: e.format }),
            a.length && (i += "(" + (a.length + 1) + ")");
        }
        return (i += "." + e.format);
      }),
      (u.exportToDirectory = async function (e, t, n, i) {
        if (this._validateCommercialDocument())
          for (var a = {}, r = 0, s = [], l = 0; l < e.length; ++l) {
            var c = null,
              d = t;
            if ((c = e[l].name)) {
              if (c.indexOf("/") >= 0) {
                var p = c.split("/"),
                  g = [];
                for (let e = 0; e < p.length; ++e) {
                  var h = o.GUtil.sanitizeFilename(p[e].trim());
                  h && g.push(h);
                }
                if (g.length > 1) {
                  c = g.pop();
                  var f = "";
                  for (let e = 0; e < g.length; ++e) {
                    var m = g[e];
                    f && (f += "/");
                    var y = a[(f += m.toLowerCase())];
                    if (y) d = y;
                    else
                      try {
                        (d = await d.addDirectory(m)), (a[f] = d);
                      } catch (e) {}
                  }
                } else g.length && (c = g[0]);
              } else c = o.GUtil.sanitizeFilename(c.trim());
              c &&
                d &&
                u.exportExportable(
                  e[l],
                  (function (t, o) {
                    return function (i) {
                      var a = new FileReader();
                      if (
                        ((a.onload = () => {
                          t.addFile(o)
                            .then((t) => {
                              t.write(new Uint8Array(a.result), () => {
                                ++r === e.length && n && n();
                              });
                            })
                            .catch(() => {
                              ++r === e.length && n && n();
                            });
                        }),
                        i instanceof Blob || i instanceof File)
                      )
                        try {
                          a.readAsArrayBuffer(i);
                        } catch (t) {
                          ++r === e.length && n && n();
                        }
                      else ++r === e.length && n && n();
                    };
                  })(d, u.generateExportName(e[l], c, s)),
                  i
                );
            }
          }
      }),
      (u.export = function (e, t, n, i, a, r, c, p, g, h) {
        if (this._validateCommercialDocument()) {
          var f = (e, t, n) => {
              var o = new FileReader();
              (o.onload = () => {
                t.write(new Uint8Array(o.result), () => (n ? n() : void 0), g);
              }),
                o.readAsArrayBuffer(e);
            },
            m = (e, n, o, i, r, l) => {
              t instanceof s.Item
                ? f(e, t, o)
                : t instanceof s &&
                  (!r && t.canPromptSave()
                    ? t.savePrompt(
                        n,
                        [i],
                        (t) => {
                          f(e, t, o);
                        },
                        a,
                        l
                      )
                    : t.canDownload() &&
                      t.download(
                        n,
                        (t) => {
                          f(e, t, o);
                        },
                        l
                      ));
            },
            y = e[0],
            v = e.length > 1,
            _ = l.FileTypes.find((e) => e.ext === y.format);
          if (
            (v &&
              (y.format !== d.PDF.ext ||
                r ||
                ((v = !1),
                ((y = o.GUtil.extend({}, y)).name = n),
                (y.element = e.map((e) => e.element)))),
            v)
          )
            if (t instanceof s && t.canChooseDirectory())
              t.chooseDirectory(
                (t) => {
                  u.exportToDirectory(e, t, i, c);
                },
                a,
                () => {
                  var t = new u.ZipDirectory();
                  u.exportToDirectory(
                    e,
                    t,
                    () => {
                      t.exportBlob((e) => {
                        m(e, n + ".zip", i, _, !0, h);
                      });
                    },
                    c
                  );
                }
              );
            else {
              var b = new u.ZipDirectory();
              u.exportToDirectory(
                e,
                b,
                () => {
                  b.exportBlob((e) => {
                    m(
                      e,
                      n + ".zip",
                      i,
                      { ext: "zip", mime: "application/zip" },
                      !1,
                      h
                    );
                  });
                },
                c
              );
            }
          else
            u.exportExportable(
              y,
              function (e) {
                const n =
                  t instanceof s && t.canDownload() && _ && _.ext === d.PDF.ext;
                m(e, u.generateExportName(y), i, _, n, h);
              },
              c,
              p
            );
        }
      }),
      (u.ZipDirectory = function (e, t) {
        s.Directory.call(this, e),
          (this._zipRoot = t ? null : new zip.fs.FS()),
          (this._zipDirectory = t || this._zipRoot.root);
      }),
      o.GObject.inherit(u.ZipDirectory, s.Directory),
      (u.ZipDirectory.prototype.addDirectory = async function (e) {
        return new u.ZipDirectory(
          this._storage,
          this._zipDirectory.addDirectory(e)
        );
      }),
      (u.ZipDirectory.prototype.addFile = async function (e) {
        return {
          _zipDirectory: this._zipDirectory,
          _name: e,
          write: function (e, t) {
            if ((this._zipDirectory.addBlob(this._name, new Blob([e])), t))
              return t();
          },
        };
      }),
      (u.ZipDirectory.prototype.exportBlob = function (e) {
        this._zipDirectory.exportBlob(e);
      }),
      (e.exports = u);
  }