/**
 * Webpack Module #1380
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19),
      n(596),
      n(180),
      n(181),
      n(57),
      n(20),
      n(34),
      n(134),
      n(218),
      n(692),
      n(189),
      n(190),
      n(191),
      n(192),
      n(4),
      n(41),
      n(32),
      n(33);
    var o = n(1),
      i = n(10),
      a = n(381);
    function r(e) {
      if (r._instance)
        throw new Error("This class cannot be instantiated multiple times");
      (r._instance = this), a.call(this, e);
    }
    o.GObject.inherit(r, a);
    var s = o.GUtil.uuid();
    (r.DEFAULT_PORT = 32119),
      (r.START_PORT_SPAN = 1),
      (r.PORT_SPAN = 5),
      (r.HOST =
        "undefined" == typeof window ||
        !window ||
        (window.process && window.process.type)
          ? ""
          : window.location.href.replace(/\/$/, "")),
      (r.LAUNCHER_PATH = "/assets/data/launcher.swf"),
      (r.Cmd = {
        success: 0,
        font: 1,
        list: 2,
        probe: 3,
        close: 4,
        previews: 5,
        error: 255,
        stamp: 3735941121,
      }),
      (r._instance = null),
      (r._launcherInstall = function () {
        r._instance._providerManager.setLock();
      }),
      (r._closeLauncher = function () {
        var e,
          t = 0,
          n = function () {
            if (this._isInitialized())
              return console.log("initialized: finish"), void clearInterval(e);
            if (!this._taskLock) {
              if (((this._fontList = null), this._cachedInstallButton)) {
                var n = this._cachedInstallButton.parentElement;
                n &&
                  n.contains(this._cachedInstallButton) &&
                  n.removeChild(this._cachedInstallButton),
                  (this._cachedInstallButton = null);
              }
              this._providerManager.reset(),
                t++ > 10 && (this._cbFatal(), clearInterval(e));
            }
          }.bind(r._instance);
        e = setInterval(n, 2e3);
      }),
      (r.prototype._firstConnect = !0),
      (r.prototype._tlsError = !1),
      (r.prototype._initialized = !1),
      (r.prototype._connection = null),
      (r.prototype._tmpConnection = null),
      (r.prototype._fontList = null),
      (r.prototype._doReverse = !1),
      (r.prototype._fontListLength = -1),
      (r.prototype._taskQueue = []),
      (r.prototype._taskLock = !1),
      (r.prototype._resolveCallback = null),
      (r.prototype._oldUnresolved = null),
      (r.prototype._listCallbacks = []),
      (r.prototype._previewCallback = null),
      (r.prototype._cachedInstallButton = null),
      (r.prototype._timeout = null),
      (r.prototype._connect = function (e) {
        var t = e || r.DEFAULT_PORT;
        if (
          (this._firstConnect
            ? t > r.DEFAULT_PORT + r.START_PORT_SPAN && this._error()
            : t > r.DEFAULT_PORT + r.PORT_SPAN && this._error(),
          !((this._tmpConnection && this._taskLock) || this._connection))
        )
          if (
            this._fontList &&
            1 == this._fontList.length &&
            this._fontList[0].special
          )
            this._cbFail();
          else
            try {
              console.log("tasklock: true (connect)"),
                (this._taskLock = !0),
                t === r.DEFAULT_PORT
                  ? (this._tmpConnection = new WebSocket(
                      "wss://127.0.0.1:" + t
                    ))
                  : (this._tmpConnection = new WebSocket(
                      "ws://127.0.0.1:" + t
                    )),
                (this._tmpConnection.onopen = this._onOpen.bind(this)),
                (this._tmpConnection.onclose = this._onClose.bind(this)),
                (this._tmpConnection.onerror = this._error.bind(this)),
                this._timeout ||
                  (this._timeout = setTimeout(
                    function () {
                      this._tmpConnection &&
                        this._taskLock &&
                        (this._tmpConnection.close(),
                        (this._tmpConnection = null),
                        console.log("tasklock: false"),
                        (this._taskLock = !1),
                        (this._timeout = null),
                        console.log("connection time out"),
                        this._cbFatal());
                    }.bind(this),
                    3e4
                  ));
            } catch (e) {
              t === r.DEFAULT_PORT
                ? ((this._tlsError = !0),
                  setTimeout(this._connect.bind(this), 50, t + 1))
                : setTimeout(this._connect.bind(this), 2e3, t + 1);
            }
      }),
      (r.prototype._onOpen = function () {
        (this._connection = this._tmpConnection),
          (this._connection.onmessage = this._onmsg.bind(this)),
          (this._tmpConnection = null),
          (this._timeout = null);
        var e = new Uint8Array(5);
        this._setData(e, r.Cmd.probe), this._connection.send(e.buffer);
      }),
      (r.prototype._onClose = function (e) {
        console.log("socket closing:" + e),
          (this._connection = null),
          (this._tmpConnection = null),
          (this._initialized = !1);
      }),
      (r.prototype._error = function () {
        if (
          (console.log("tasklock: false (error)"),
          (this._taskLock = !1),
          this._tmpConnection && !this._connection)
        ) {
          var e = this._tmpConnection.url.split(":"),
            t = parseInt(e[e.length - 1]);
          this._tmpConnection = null;
          var n = this._firstConnect ? r.START_PORT_SPAN : r.PORT_SPAN;
          if (t > r.DEFAULT_PORT + n) return void this._cbFatal();
          setTimeout(this._connect.bind(this), 2e3, t + 1);
        }
      }),
      (r.prototype._onmsg = function (e) {
        var t = e.data;
        if (t instanceof Blob) {
          var n = t.slice(0, 1),
            o = t.slice(1, 5);
          t = t.slice(5);
          var i = null,
            a = null,
            s = new FileReader();
          s.addEventListener(
            "loadend",
            function () {
              var e = !1;
              if (null === i)
                (i = s.result),
                  (i = (i = new Uint8Array(i))[0]),
                  s.readAsArrayBuffer(o);
              else if (null === a) {
                a = s.result;
                var n = new Uint8Array(a),
                  l = new Uint32Array(n.buffer);
                l[0] !== r.Cmd.stamp
                  ? (n.reverse(),
                    (l = new Uint32Array(n.buffer))[0] === r.Cmd.stamp &&
                      ((this._doReverse = !0), (e = !0)))
                  : (e = !0),
                  e && s.readAsArrayBuffer(t);
              } else this._handleCmd(i, s.result);
            }.bind(this)
          );
          try {
            s.readAsArrayBuffer(n);
          } catch (e) {
            return;
          }
        }
      }),
      (r.prototype._cbFail = function () {
        for (var e = 0; e < this._listCallbacks.length; e++) {
          var t = this._listCallbacks[e];
          this._listCallbacks.shift(),
            this._fontList &&
            1 == this._fontList.length &&
            this._fontList[0].special
              ? t.done(this._fontList, !0, null)
              : t.fail();
        }
        this._resolveCallback &&
          ((t = this._resolveCallback),
          this._isInitialized() ||
            (this._oldUnresolved
              ? this._oldUnresolved.push(t)
              : (this._oldUnresolved = [t])),
          (this._resolveCallback = null),
          t.fail ? t.fail() : t(!0)),
          (this._taskLock = !1);
      }),
      (r.prototype._cbFatal = function () {
        gDesigner.getSetting("system_fonts_enabled", !0)
          ? ((this._fontListLength = 1),
            (this._fontList = [
              { family: "", special: !0, fonts: [{ weight: 400, style: "N" }] },
            ]))
          : ((this._fontListLength = 0), (this._fontList = [])),
          (this._firstConnect = !1),
          this._cbFail();
      }),
      (r.prototype._cbDone = function (e) {
        var t;
        if ((console.log("cb done"), this._listCallbacks))
          for (var n = 0; n < this._listCallbacks.length; n++)
            (t = this._listCallbacks[n]),
              this._listCallbacks.shift(),
              (this._listCallbacks = null),
              t.done(this._fontList, !0, null);
        this._resolveCallback &&
          ((t = this._resolveCallbacks[n]),
          (this._resolveCallback = null),
          e ? t.done(e) : t()),
          this._oldUnresolved &&
            (this._oldUnresolved.forEach(function (t) {
              e ? t.done(e) : t();
            }),
            (this._oldUnresolved = null)),
          (this._taskLock = !1);
      }),
      (r.prototype._handleCmd = function (e, t) {
        try {
          switch (e) {
            case r.Cmd.probe:
              var n;
              if (this._doReverse) {
                var o = new Uint8Array(t);
                o.reverse(), (n = new Uint32Array(o.buffer));
              } else n = new Uint32Array(t);
              this._fontListLength = n[0];
              var i = new Uint8Array(13);
              this._setData(i, r.Cmd.list), this._connection.send(i.buffer);
              break;
            case r.Cmd.list:
              if ((w = (b = new Uint8Array(t))[0]) == r.Cmd.success) {
                b = b.slice(3);
                var a = String.fromCharCode.apply(
                    null,
                    new Uint8Array(b.buffer)
                  ),
                  s = JSON.parse(a),
                  l = [],
                  c = {};
                if (s.length)
                  if ("string" == typeof s[0] || s[0] instanceof String) {
                    for (var d = 0; d < s.length; d++) {
                      var u = s[d].split("_"),
                        p = (h = u[0]).toLowerCase(),
                        g = {
                          weight: parseInt(u[1]),
                          style: 0 == parseInt(u[2]) ? "N" : "I",
                          f: h,
                        };
                      c[p] ? c[p].push(g) : (c[p] = [g]);
                    }
                    for (var h in c) {
                      g = c[h];
                      l.push({ family: g[0].f, fonts: g });
                    }
                  } else
                    for (d = 0; d < s.length; d++) {
                      for (
                        var f = s[d],
                          m = ((h = f[0]), []),
                          y = { family: h, fonts: m },
                          v = 1;
                        v < f.length;
                        v++
                      ) {
                        var _ = f[v].split("_");
                        m.push({
                          weight: parseInt(_[0]),
                          style: 0 == parseInt(_[1]) ? "N" : "I",
                        });
                      }
                      l.push(y);
                    }
                (this._fontListLength = l.length),
                  (this._fontList = l),
                  (this._initialized = !0),
                  console.log("tasklock: false (cmd list)"),
                  (this._taskLock = !1),
                  this._cbDone();
              } else
                w == r.Cmd.error
                  ? (console.log("tasklock: false (cmd list err1)"),
                    (this._taskLock = !1),
                    this._cbFail())
                  : (console.log("tasklock: false (cmd list err2)"),
                    (this._taskLock = !1),
                    this._cbFail());
              break;
            case r.Cmd.previews:
              break;
            case r.Cmd.font:
              var b, w;
              (w = (b = new Uint8Array(t))[0]) == r.Cmd.success
                ? ((b = b.slice(1)), this._cbDone(b.buffer))
                : (w == r.Cmd.error || console.warn("Error receiving data"),
                  this._cbFail());
          }
        } catch (e) {
          console.warn("Error receiving data from server:" + e.message);
        }
      }),
      (r.prototype._setData = function (e, t) {
        var n = r.Cmd.stamp;
        (e[0] = n >> 24),
          (e[1] = (n >> 16) & 255),
          (e[2] = (n >> 8) & 255),
          (e[3] = (n >> 0) & 255),
          (e[4] = t);
      }),
      (r.prototype.hasEnabler = function () {
        return !0;
      }),
      (r.prototype.getEnabler = function () {
        var e = document.createElement("div");
        return e.appendChild(this._getInstallButton()), e;
      }),
      (r.prototype.isInitialized = function () {
        return this._isInitialized();
      }),
      (r.prototype._isInitialized = function () {
        return (
          !(!this._connection || !this._initialized) &&
          (0 == this._connection.readyState ||
            1 == this._connection.readyState ||
            ((this._connection = null),
            (this._tmpConnection = null),
            (this._initialized = !1),
            !1))
        );
      }),
      (r.prototype._getInstallButton = function () {
        if (this._cachedInstallButton) return this._cachedInstallButton;
        "http://127.0.0.1:9000" === r.HOST &&
          (r.HOST =
            "https://" +
            (i.domain.startsWith("corelvector") ? "app-" : "") +
            gDesigner.getEnv().split(".")[0] +
            "." +
            i.domain);
        var e = document.createElement("object");
        e.data = r.LAUNCHER_PATH;
        var t = document.createElement("div");
        (t.innerHTML =
          "<b>To enable system fonts, either:</b><ul style='list-style:initial'><li>enable flash</li><li>download, install and run gravit font server manually: <a name='_SPECIAL_' href='/assets/data/fonts.air?no_redirect=true'>DOWNLOAD LINK</a></li><li>import fonts into browser in the settings panel.</li></ul>"),
          (t.style.width = "310px"),
          (t.style.textAlign = "left");
        var n = document.createElement("param");
        return (
          n.setAttribute("name", "FlashVars"),
          n.setAttribute(
            "value",
            "host=" +
              escape(r.HOST) +
              "&appurl=" +
              escape("/assets/data/fonts.air?no_redirect=true")
          ),
          e.appendChild(n),
          (n = document.createElement("param")).setAttribute("name", "wmode"),
          n.setAttribute("value", "transparent"),
          e.appendChild(n),
          (e.type = "application/x-shockwave-flash"),
          (e.name = "_SPECIAL_"),
          (e.height = "150"),
          (e.width = "300"),
          (this._cachedInstallButton = e),
          e
        );
      }),
      (r.prototype.addPreviews = function (e) {
        if (e.length)
          if (1 == e.length && e[0].special) {
            var t = this;
            e[0].addPreviewCallback = function (e) {
              e(t.getEnabler());
            };
          } else {
            if (!this._isInitialized())
              return (
                (this._previewCallback = this.addPreviews),
                void this._initialize()
              );
            for (var n = 0; n < e.length; n++)
              e[n].cachedPreview ||
                (e[n].addPreviewCallback = function (e) {
                  var t = document.createElement("div");
                  (t.innerHTML = this.family),
                    (t.style.fontFamily = this.family),
                    (t.style.fontSize = "13px"),
                    e(t);
                });
          }
      }),
      (r.prototype._initialize = function () {
        gDesigner.getSetting("system_fonts_enabled", !0)
          ? this._taskLock ||
            (this._tlsError
              ? this._connect(r.DEFAULT_PORT + 1)
              : this._connect(r.DEFAULT_PORT))
          : this._cbFatal();
      }),
      (r.prototype.load = function (e, t, n, o) {
        if (!this._isInitialized())
          return this._listCallbacks.push(o), void this._initialize();
        o.done(
          this._fontList
            .filter(function (t) {
              return e.indexOf("%") >= 0
                ? t.family.toLowerCase().startsWith(e.replace(/%/g, ""))
                : t.family.toLowerCase() == e.toLowerCase();
            })
            .slice(t, t + n),
          !0,
          null
        );
      }),
      (r.prototype.getTotalFonts = function (e) {
        return this._isInitialized()
          ? e
            ? this._fontList.filter(this._searchFilter(e)).length
            : this._fontListLength
          : (this._initialize(), 0);
      }),
      (r.prototype.resolveFont = function (e, t, n, o) {
        if (!this._isInitialized())
          return (
            (this._resolveCallback = function (i) {
              i ? o.fail() : this.resolveFont(e, t, n, o);
            }.bind(this)),
            void this._initialize()
          );
        if (!this._taskLock) {
          var i = e.length;
          this._resolveCallback = o;
          var a = new Uint8Array(9 + i + 4);
          this._setData(a, r.Cmd.font),
            (a[5] = (4278190080 & i) >> 24),
            (a[6] = (16711680 & i) >> 16),
            (a[7] = (65280 & i) >> 8),
            (a[8] = (255 & i) >> 0);
          for (var s = 9; s < 9 + i; s++) a[s] = e.charCodeAt(s - 9);
          var l = parseInt(n);
          (a[s] = (65280 & l) >> 8),
            (a[s + 1] = (255 & l) >> 0),
            (a[s + 3] = "N" == t ? 0 : 1),
            this._connection.send(a);
        }
      }),
      (r.prototype.getProviderId = function () {
        return s;
      }),
      (e.exports = r);
  }