/**
 * Webpack Module #1379
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(57), n(4), n(41), n(32), n(33);
    var o = n(1),
      i = n(381);
    function a(e) {
      i.call(this, e);
    }
    o.GObject.inherit(a, i);
    var r = o.GUtil.uuid(),
      s = [],
      l = {};
    o.GObject.inherit(a, i),
      (a.prototype._totalFonts = 0),
      (a.prototype._initialized = !1),
      (a.prototype._initializing = !1),
      (a.prototype._resolveCallbacks = []),
      (a.prototype._loadCallbacks = []),
      (a.prototype._clearCallbacks = function (e) {
        this._resolveCallbacks.forEach(function (t) {
          t(e);
        }),
          (this._resolveCallbacks = []),
          this._loadCallbacks.forEach(function (t) {
            t(e);
          }),
          (this._loadCallbacks = []);
      }),
      (a.prototype.addPreviews = function (e, t) {
        for (
          var n = new DOMParser(),
            o = !1,
            i = function (e, t) {
              e
                ? ((this.cb = e), this.svg && e(this.svg))
                : ((this.svg = t), this.cb && this.cb(t));
            },
            a = 0;
          a < e.length;
          a++
        )
          e[a].cachedPreview ||
            e[a].addPreviewCallback ||
            (e[a].addPreviewCallback = i);
        if (t) {
          e.length;
          if (!e.length) return;
          var r = [];
          for (a = 0; a < e.length; a++) {
            for (var l = 0; l < s.length; l++)
              if (s[l].family === e[a].family) {
                var c = parseInt(l / 10);
                r.indexOf(c) < 0 && r.push(c);
                break;
              }
            if (l === s.length)
              return void console.warn(
                "Error while generating previews: couldn't find font."
              );
          }
          for (a = 0; a < r.length; a++) {
            c = r[a];
            if ((s[10 * c].cachedPreview || (o = !0), o)) {
              var d = new XMLHttpRequest(),
                u = gContainer.getRootPath();
              d.open(
                "GET",
                u + "/assets/data/google_previews/previews" + c + ".json"
              ),
                (d.num = c),
                (d.onload = function () {
                  if (this.status >= 200 && this.status < 300) {
                    var e;
                    try {
                      e = JSON.parse(this.response);
                    } catch (e) {
                      return void (
                        "undefined" != typeof gdb_loaddesign &&
                        console.warn("couldn't parse font preview")
                      );
                    }
                    for (
                      var t =
                          Math.min(s.length, 10 * (this.num + 1)) -
                          10 * this.num,
                        o = 0;
                      o < t;
                      o++
                    ) {
                      var a,
                        r = s[10 * this.num + o];
                      r.addPreviewCallback || (r.addPreviewCallback = i);
                      try {
                        (a = n.parseFromString(
                          e[o],
                          "image/svg+xml"
                        ).firstChild) &&
                          a.getAttribute("xmlns") &&
                          (a.setAttribute("height", "20px"),
                          r.addPreviewCallback(null, a));
                      } catch (e) {
                        "undefined" != typeof gdb_loaddesign &&
                          console.warn("error parsing svg");
                      }
                    }
                  }
                }),
                d.send();
            }
          }
        }
      }),
      (a.prototype.initialize = function () {
        this._initialized ||
          this._initializing ||
          this._load.apply(this, arguments);
      }),
      (a.prototype._load = function () {
        this._initializing = !0;
        var e = Array.prototype.slice.call(arguments),
          t = gContainer.getRootPath(),
          n = new XMLHttpRequest(),
          o = gDesigner ? gDesigner.getVersion() : ~~(1e4 * Math.random());
        n.open("GET", t + "/assets/data/googlefonts.json?" + o),
          (n.onload = function () {
            n.status >= 200 && n.status < 300
              ? ((this._initialized = !0),
                (this._initializing = !1),
                (s = JSON.parse(n.response)),
                (this._totalFonts = s.length),
                e.length,
                this._clearCallbacks())
              : n.status >= 400 &&
                ((this._initialized = !0),
                (this._initializing = !1),
                this._clearCallbacks(!0));
          }.bind(this)),
          (n.onerror = function () {
            (this._initialized = !0),
              (this._initializing = !1),
              this._clearCallbacks(i.Errors.ConnectionError);
          }.bind(this)),
          n.send();
      }),
      (a.prototype.load = function (e, t, n, o) {
        if (!this._initialized && !this._initializing)
          return (
            this._loadCallbacks.push(
              function (i) {
                i ? o.fail(i) : this.load(e, t, n, o);
              }.bind(this)
            ),
            void this.initialize(this.load, e, t, n, o)
          );
        this._initializing
          ? this._loadCallbacks.push(
              function (i) {
                i ? o.fail(i) : this.load(e, t, n, o);
              }.bind(this)
            )
          : o.done(s.filter(this._searchFilter(e)).slice(t, t + n), !0, null);
      }),
      (a.prototype.getTotalFonts = function (e) {
        return e ? s.filter(this._searchFilter(e)).length : this._totalFonts;
      }),
      (a.prototype.resolveFont = function (e, t, n, a) {
        if (!this._initialized && !this._initializing)
          return (
            this._loadCallbacks.push(
              function (o) {
                o ? a.fail(o) : this.resolveFont(e, t, n, a);
              }.bind(this)
            ),
            void this.initialize(this.resolveFont, e, t, n, a)
          );
        if (this._initializing)
          this._resolveCallbacks.push(
            function (o) {
              o ? a.fail(o) : this.resolveFont(e, t, n, a);
            }.bind(this)
          );
        else {
          for (var r = 0; r < s.length; r++) {
            var c = s[r];
            if (c.family === e)
              for (var d = c.fonts, u = 0; u < d.length; u++) {
                var p = d[u];
                if (
                  p.weight === (n || 400) &&
                  p.style === (t || o.GFont.Style.Normal)
                ) {
                  if (l[p.url]) l[p.url].push(a);
                  else {
                    var g = new XMLHttpRequest();
                    (g.responseType = "arraybuffer"),
                      g.open("GET", p.url),
                      (l[p.url] = []),
                      l[p.url].push(a),
                      (g.onload = function () {
                        if (this.status >= 200 && this.status < 300) {
                          var e = l[p.url];
                          delete l[p.url],
                            e.forEach((e) => {
                              e.done(this.response);
                            });
                        }
                      }),
                      (g.onerror = () => {
                        delete l[p.url], a.fail(i.Errors.ConnectionError);
                      }),
                      g.send();
                  }
                  return;
                }
              }
          }
          a.fail();
        }
      }),
      (a.prototype.getProviderId = function () {
        return r;
      }),
      (a.prototype.resetProvider = function () {
        this._load();
      }),
      (e.exports = a);
  }