/**
 * Webpack Module #1515
 * Type: unknown
 */

function (e, t) {
    (function () {
      !(function () {
        "use strict";
        var e,
          t,
          n = zip.TextWriter,
          o = zip.BlobWriter,
          i = zip.Data64URIWriter,
          a = zip.Reader,
          r = zip.TextReader,
          s = zip.BlobReader,
          l = zip.Data64URIReader,
          c = zip.createReader,
          d = zip.createWriter;
        function u(e) {
          var t,
            n = this;
          (n.size = 0),
            (n.init = function (t) {
              (n.size = e.uncompressedSize), t();
            }),
            (n.readUint8Array = function (i, a, r, l) {
              !(function (i) {
                n.data
                  ? i()
                  : e.getData(
                      new o(),
                      function (e) {
                        (n.data = e), (t = new s(e)), i();
                      },
                      null,
                      n.checkCrc32
                    );
              })(function () {
                t.readUint8Array(i, a, r, l);
              });
            });
        }
        function p(e) {
          var t = 0;
          return (
            (function e(n) {
              (t += n.uncompressedSize || 0), n.children.forEach(e);
            })(e),
            t
          );
        }
        function g(e, t, n) {
          var o = 0;
          function i() {
            ++o < e.children.length ? a(e.children[o]) : t();
          }
          function a(e) {
            e.directory
              ? g(e, i, n)
              : ((e.reader = new e.Reader(e.data, n)),
                e.reader.init(function () {
                  (e.uncompressedSize = e.reader.size), i();
                }));
          }
          e.children.length ? a(e.children[o]) : t();
        }
        function h(e) {
          var t = e.parent.children;
          t.forEach(function (n, o) {
            n.id == e.id && t.splice(o, 1);
          });
        }
        function f(e, t, n, o) {
          t.isDirectory
            ? (function e(t, n, i) {
                !(function (e, t) {
                  var n = [];
                  if (e.isDirectory) {
                    var i = e.createReader();
                    !(function e() {
                      i.readEntries(function (o) {
                        o.length ? ((n = n.concat(o)), e()) : t(n);
                      }, o);
                    })();
                  }
                  e.isFile && t(n);
                })(n, function (n) {
                  var a = 0;
                  function r() {
                    var s = n[a];
                    s
                      ? (function (n) {
                          function i(t) {
                            e(t, n, function () {
                              a++, r();
                            });
                          }
                          n.isDirectory && i(t.addDirectory(n.name)),
                            n.isFile &&
                              n.file(function (e) {
                                var o = t.addBlob(n.name, e);
                                (o.uncompressedSize = e.size), i(o);
                              }, o);
                        })(s)
                      : i();
                  }
                  r();
                });
              })(e, t, n)
            : t.file(function (o) {
                e.addBlob(t.name, o), n();
              }, o);
        }
        function m(e, t, n, o, i, a, r) {
          var s = 0;
          t.directory
            ? (function e(t, n, o, i, a, l) {
                var c = 0;
                function d() {
                  var u = n.children[c];
                  u
                    ? (function (n) {
                        function o(t) {
                          (s += n.uncompressedSize || 0),
                            e(
                              t,
                              n,
                              function () {
                                c++, d();
                              },
                              i,
                              a,
                              l
                            );
                        }
                        n.directory
                          ? t.getDirectory(n.name, { create: !0 }, o, a)
                          : t.getFile(
                              n.name,
                              { create: !0 },
                              function (e) {
                                n.getData(
                                  new zip.FileWriter(
                                    e,
                                    zip.getMimeType(n.name)
                                  ),
                                  o,
                                  function (e) {
                                    i && i(s + e, l);
                                  },
                                  r
                                );
                              },
                              a
                            );
                      })(u)
                    : o();
                }
                d();
              })(e, t, n, o, i, a)
            : t.getData(
                new zip.FileWriter(e, zip.getMimeType(t.name)),
                n,
                o,
                r
              );
        }
        function y(e) {
          (e.entries = []), (e.root = new w(e));
        }
        function v(e, t, n, o) {
          if (e.directory)
            return o ? new w(e.fs, t, n, e) : new b(e.fs, t, n, e);
          throw "Parent entry is not a directory.";
        }
        function _() {}
        function b(e, t, n, o) {
          _.prototype.init.call(this, e, t, n, o),
            (this.Reader = n.Reader),
            (this.Writer = n.Writer),
            (this.data = n.data),
            n.getData && (this.getData = n.getData);
        }
        function w(e, t, n, o) {
          _.prototype.init.call(this, e, t, n, o), (this.directory = !0);
        }
        function C() {
          y(this);
        }
        (u.prototype = new a()),
          (u.prototype.constructor = u),
          (u.prototype.checkCrc32 = !1),
          (_.prototype = {
            init: function (e, t, n, o) {
              if (e.root && o && o.getChildByName(t))
                throw "Entry filename already exists.";
              n || (n = {}),
                (this.fs = e),
                (this.name = t),
                (this.id = e.entries.length),
                (this.parent = o),
                (this.children = []),
                (this.zipVersion = n.zipVersion || 20),
                (this.uncompressedSize = 0),
                e.entries.push(this),
                o && this.parent.children.push(this);
            },
            getFileEntry: function (e, t, n, o, i) {
              var a = this;
              g(
                a,
                function () {
                  m(e, a, t, n, o, p(a), i);
                },
                o
              );
            },
            moveTo: function (e) {
              if (!e.directory) throw "Target entry is not a directory.";
              if (e.isDescendantOf(this))
                throw "Entry is a ancestor of target entry.";
              if (this != e) {
                if (e.getChildByName(this.name))
                  throw "Entry filename already exists.";
                h(this), (this.parent = e), e.children.push(this);
              }
            },
            getFullname: function () {
              for (var e = this.name, t = this.parent; t; )
                (e = (t.name ? t.name + "/" : "") + e), (t = t.parent);
              return e;
            },
            isDescendantOf: function (e) {
              for (var t = this.parent; t && t.id != e.id; ) t = t.parent;
              return !!t;
            },
          }),
          (_.prototype.constructor = _),
          (b.prototype = e = new _()),
          (e.constructor = b),
          (e.getData = function (e, t, n, o) {
            var i = this;
            !e || (e.constructor == i.Writer && i.data)
              ? t(i.data)
              : (i.reader || (i.reader = new i.Reader(i.data, o)),
                i.reader.init(function () {
                  e.init(function () {
                    !(function (e, t, n, o, i) {
                      var a = 0;
                      !(function r() {
                        var s = 524288 * a;
                        o && o(s, e.size),
                          s < e.size
                            ? e.readUint8Array(
                                s,
                                Math.min(524288, e.size - s),
                                function (e) {
                                  t.writeUint8Array(
                                    new Uint8Array(e),
                                    function () {
                                      a++, r();
                                    }
                                  );
                                },
                                i
                              )
                            : t.getData(n);
                      })();
                    })(i.reader, e, t, n, o);
                  }, o);
                }));
          }),
          (e.getText = function (e, t, o, i) {
            this.getData(new n(i), e, t, o);
          }),
          (e.getBlob = function (e, t, n, i) {
            this.getData(new o(e), t, n, i);
          }),
          (e.getData64URI = function (e, t, n, o) {
            this.getData(new i(e), t, n, o);
          }),
          (w.prototype = t = new _()),
          (t.constructor = w),
          (t.addDirectory = function (e) {
            return v(this, e, null, !0);
          }),
          (t.addText = function (e, t) {
            return v(this, e, { data: t, Reader: r, Writer: n });
          }),
          (t.addBlob = function (e, t) {
            return v(this, e, { data: t, Reader: s, Writer: o });
          }),
          (t.addData64URI = function (e, t) {
            return v(this, e, { data: t, Reader: l, Writer: i });
          }),
          (t.addFileEntry = function (e, t, n) {
            f(this, e, t, n);
          }),
          (t.addData = function (e, t) {
            return v(this, e, t);
          }),
          (t.importBlob = function (e, t, n) {
            this.importZip(new s(e), t, n);
          }),
          (t.importText = function (e, t, n) {
            this.importZip(new r(e), t, n);
          }),
          (t.importData64URI = function (e, t, n) {
            this.importZip(new l(e), t, n);
          }),
          (t.exportBlob = function (e, t, n) {
            this.exportZip(new o("application/zip"), e, t, n);
          }),
          (t.exportText = function (e, t, o) {
            this.exportZip(new n(), e, t, o);
          }),
          (t.exportFileEntry = function (e, t, n, o) {
            this.exportZip(new zip.FileWriter(e, "application/zip"), t, n, o);
          }),
          (t.exportData64URI = function (e, t, n) {
            this.exportZip(new i("application/zip"), e, t, n);
          }),
          (t.importZip = function (e, t, n) {
            var o = this;
            c(
              e,
              function (e) {
                e.getEntries(function (e) {
                  e.forEach(function (e) {
                    var t = o,
                      n = e.filename.split("/"),
                      i = n.pop();
                    n.forEach(function (e) {
                      t = t.getChildByName(e) || new w(o.fs, e, null, t);
                    }),
                      e.directory || v(t, i, { data: e, Reader: u });
                  }),
                    t();
                });
              },
              n
            );
          }),
          (t.exportZip = function (e, t, n, o) {
            var i = this;
            g(
              i,
              function () {
                d(
                  e,
                  function (e) {
                    !(function (e, t, n, o, i) {
                      var a = 0;
                      !(function e(t, n, o, i, r) {
                        var s = 0;
                        !(function l() {
                          var c = n.children[s];
                          c
                            ? t.add(
                                c.getFullname(),
                                c.reader,
                                function () {
                                  (a += c.uncompressedSize || 0),
                                    e(
                                      t,
                                      c,
                                      function () {
                                        s++, l();
                                      },
                                      i,
                                      r
                                    );
                                },
                                function (e) {
                                  i && i(a + e, r);
                                },
                                {
                                  directory: c.directory,
                                  version: c.zipVersion,
                                }
                              )
                            : o();
                        })();
                      })(e, t, n, o, i);
                    })(
                      e,
                      i,
                      function () {
                        e.close(t);
                      },
                      n,
                      p(i)
                    );
                  },
                  o
                );
              },
              o
            );
          }),
          (t.getChildByName = function (e) {
            var t, n;
            for (t = 0; t < this.children.length; t++)
              if ((n = this.children[t]).name == e) return n;
          }),
          (C.prototype = {
            remove: function (e) {
              h(e), (this.entries[e.id] = null);
            },
            find: function (e) {
              var t,
                n = e.split("/"),
                o = this.root;
              for (t = 0; o && t < n.length; t++) o = o.getChildByName(n[t]);
              return o;
            },
            getById: function (e) {
              return this.entries[e];
            },
            importBlob: function (e, t, n) {
              y(this), this.root.importBlob(e, t, n);
            },
            importText: function (e, t, n) {
              y(this), this.root.importText(e, t, n);
            },
            importData64URI: function (e, t, n) {
              y(this), this.root.importData64URI(e, t, n);
            },
            exportBlob: function (e, t, n) {
              this.root.exportBlob(e, t, n);
            },
            exportText: function (e, t, n) {
              this.root.exportText(e, t, n);
            },
            exportFileEntry: function (e, t, n, o) {
              this.root.exportFileEntry(e, t, n, o);
            },
            exportData64URI: function (e, t, n) {
              this.root.exportData64URI(e, t, n);
            },
          }),
          (zip.fs = { FS: C, ZipDirectoryEntry: w, ZipFileEntry: b }),
          (zip.getMimeType = function () {
            return "application/octet-stream";
          });
      })();
    }).call(window);
  }