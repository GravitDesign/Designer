/**
 * Webpack Module #1512
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(1196),
      n(19),
      n(1197),
      n(180),
      n(181),
      n(8),
      n(134),
      n(218),
      n(189),
      n(190),
      n(191),
      n(192),
      n(4),
      n(32),
      n(38),
      n(33);
    var o = n(176),
      i = n(0);
    n(10);
    var a = n(237),
      r = n(1117).saveAs,
      s = null,
      l = null;
    function c() {
      (this._fileInput = null), (this._fileInputCallback = null);
    }
    function d(e) {
      return e
        .queryPermission({ writable: !0 })
        .then((t) =>
          "granted" !== t ? e.requestPermission({ writable: !0 }) : t
        )
        .then((e) => {
          if ("granted" !== e) throw new Error("Cannot get write access");
        });
    }
    i.inherit(c, a),
      (c.Directory = function (e, t) {
        a.Directory.call(this, e), (this._dirHandle = t), (this._id = null);
      }),
      i.inherit(c.Directory, a.Directory),
      (c.Directory.prototype._dirHandle = null),
      (c.Directory.prototype._id = null),
      (c.Directory.prototype.getUniqueId = function () {
        return null;
      }),
      (c.Directory.prototype.addDirectory = async function (e) {
        let t = null;
        try {
          return (
            (t = await this._dirHandle.getDirectory(e, { create: !0 })),
            await d(t),
            new c.Directory(this._storage, t)
          );
        } catch (t) {
          throw new Error("Cannot create a directory: " + e);
        }
      }),
      (c.Directory.prototype.addFile = async function (e) {
        let t = null;
        try {
          return (
            (t = await this._dirHandle.getFile(e, { create: !0 })),
            await d(t),
            new c.Item(this._storage, null, t.name, t)
          );
        } catch (e) {
          throw new Error("Cannot create a file");
        }
      }),
      (c.Item = function (e, t, n, o) {
        a.Item.call(this, e),
          (this._data = t),
          (this._filename = n),
          (this._fileHandle = o);
      }),
      i.inherit(c.Item, a.Item),
      (c.Item.prototype._data = null),
      (c.Item.prototype._filename = null),
      (c.Item.prototype._fileHandle = null),
      (c.Item.prototype.getFullName = function () {
        return this._filename;
      }),
      (c.Item.prototype.setFileName = function (e) {
        this._filename = e;
      }),
      (c.Item.prototype.read = function (e) {
        if (this._data || !this._fileHandle) return e(this._data);
        this._fileHandle
          .getFile()
          .then((e) => e.arrayBuffer())
          .then((t) => {
            (this._data = t), e(this._data);
          });
      }),
      (c.Item.prototype.write = function (e, t, n, o, i) {
        if ((this._verifyFileNotTooSmall(e.length, i), this._fileHandle)) {
          let o = null;
          this._fileHandle
            .createWritable()
            .then((e) => ((o = e), o.truncate(0)))
            .then(() => o.write(e))
            .then(() => o.close())
            .then(() => {
              t && t();
            })
            .catch((o) => {
              if (
                o instanceof DOMException &&
                o.code === DOMException.QUOTA_EXCEEDED_ERR
              )
                return this.notEnoughDiskSpace(), void (n ? n() : t && t());
              r(new Blob([e]), this._filename), t && t();
            });
        } else r(new Blob([e]), this._filename), t && t();
      }),
      (c.prototype._isFileAPIAvailable = function () {
        return !1;
      }),
      (c.prototype._hasDirectoryWriteAPI = function () {
        return "function" == typeof window.chooseFileSystemEntries;
      }),
      (c.prototype.canChooseDirectory = function () {
        return this._hasDirectoryWriteAPI() && !0;
      }),
      (c.prototype.canPromptOpen = function () {
        return !0;
      }),
      (c.prototype.canPromptSave = function () {
        return this._isFileAPIAvailable();
      }),
      (c.prototype.canSave = function () {
        return this._isFileAPIAvailable();
      }),
      (c.prototype.canDownload = function () {
        return !this._isFileAPIAvailable();
      }),
      (c.prototype.chooseDirectory = function (e, t, n) {
        if (!this._isFileAPIAvailable() || !this.canChooseDirectory()) return;
        var o = { type: l || "open-directory" };
        let i = null;
        var a = !1;
        window
          .chooseFileSystemEntries(o)
          .then((e) => ((i = e), d(e)))
          .then(() => {
            let t = e(new c.Directory(this, i));
            return (a = !0), t;
          })
          .catch((e) => {
            if (e instanceof DOMException && "SecurityError" === e.name) {
              if ((console.warn("Bugged!"), n)) return void n();
            } else !a && !l && e instanceof TypeError && (l = "openDirectory");
            t && t();
          });
      }),
      (c.prototype.openPrompt = function (e, t, n) {
        let { disableFileSystemAccessAPI: i = !1, silent: a = !1 } =
          arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {};
        if (!i && this._isFileAPIAvailable()) {
          var r = { multiple: !!n };
          if (e.length > 0) {
            const t = {};
            r.excludeAcceptAllOptions = !0;
            for (let n = 0, o = e.length; n < o; n++) {
              const { mime: o, ext: i } = e[n];
              o && i
                ? void 0 !== t[o]
                  ? (Array.isArray(t[o]) || (t[o] = [t[o]]),
                    t[o].push(i.startsWith(".") ? i : ".".concat(i)))
                  : (t[o] = i.startsWith(".") ? i : ".".concat(i))
                : console.warn(
                    'openPrompt warning: no mime or ext. given mime: "'
                      .concat(o, '", given ext: "')
                      .concat(i, '"')
                  );
            }
            r.types = [{ accept: t }];
          }
          return (
            window
              .showOpenFilePicker(r)
              .then((e) => {
                Array.isArray(e) || (e = [e]),
                  e.forEach((n) => {
                    n.getFile()
                      .then((e) => e.arrayBuffer())
                      .then((o) =>
                        t(
                          new c.Item(this, new Uint8Array(o), n.name, n),
                          e.length
                        )
                      )
                      .catch(() => {
                        console.log("ERROR reading file");
                      });
                  });
              })
              .catch((e) => {
                e instanceof DOMException ||
                  console.warn("showOpenFilePicker warning", e);
              }),
            void (this._fileInputCallback = t)
          );
        }
        const s = e.map((e) => e.ext).flat();
        if (!this._fileInput) {
          (this._fileInput = document.createElement("input")),
            this._fileInput.setAttribute("type", "file"),
            this._fileInput.setAttribute("id", "file-input"),
            (this._fileInput.multiple = n),
            (this._fileInput.style.opacity = 0),
            (this._fileInput.style.position = "absolute"),
            (this._fileInput.style.zIndex = -1),
            (this._fileInput.style.left = "-9999px"),
            (this._fileInput.style.top = "-9999px");
          var l = function (e) {
            var t = this._fileInput.files.length;
            if (e >= t) this._fileInput.value = "";
            else {
              var n = this._fileInput.files[e],
                o = n.name;
              if (n instanceof File || n instanceof Blob) {
                var i = new FileReader();
                (i.onload = function () {
                  this._fileInputCallback(
                    new c.Item(this, new Uint8Array(i.result), o),
                    t
                  ),
                    l(e + 1);
                }.bind(this)),
                  i.readAsArrayBuffer(n);
              } else l(e + 1);
            }
          }.bind(this);
          this._fileInput.addEventListener("change", () => {
            l(0);
          }),
            document.body.appendChild(this._fileInput);
        }
        o.hardware === o.Hardware.Tablet &&
        o.operatingSystem === o.OperatingSystem.OSX_IOS
          ? this._fileInput.removeAttribute("accept")
          : s && s.length
          ? this._fileInput.setAttribute(
              "accept",
              s.map((e) => "." + e).join(",")
            )
          : this._fileInput.removeAttribute("accept"),
          (this._fileInputCallback = t),
          this._fileInput.focus(),
          a || this._fileInput.click();
      }),
      (c.prototype.savePrompt = function (e, t, n, o) {
        if (this._isFileAPIAvailable()) {
          var i = { suggestedName: e };
          if (t.length > 0) {
            const e = {};
            i.excludeAcceptAllOptions = !0;
            for (let n = 0, o = t.length; n < o; n++) {
              let { mime: o, ext: i } = t[n];
              o && i
                ? ("jpg" === i && (o = "x-really-an-image/jpeg"),
                  void 0 !== e[o]
                    ? (Array.isArray(e[o]) || (e[o] = [e[o]]),
                      e[o].push(i.startsWith(".") ? i : ".".concat(i)))
                    : (e[o] = i.startsWith(".") ? i : ".".concat(i)))
                : console.warn(
                    'openPrompt warning: no mime or ext. given mime: "'
                      .concat(o, '", given ext: "')
                      .concat(i, '"')
                  );
            }
            let n = [{ accept: e }];
            const o = Object.keys(e);
            (o || []).length > 1 &&
              (n = o.map((t) => {
                let n = {};
                return (n[t] = e[t]), { accept: n };
              })),
              (i.types = n);
          }
          var a = !1;
          window
            .showSaveFilePicker(i)
            .then((e) => ((a = !0), n(new c.Item(this, null, e.name, e))))
            .catch((t) => {
              if (
                (!a && !s && t instanceof TypeError && (s = "saveFile"),
                !a && t.code !== DOMException.ABORT_ERR)
              )
                return this.download(e, n);
              o && o();
            });
        }
      }),
      (c.prototype.download = function (e, t) {
        return t(new c.Item(this, null, e));
      }),
      (e.exports = c);
  }