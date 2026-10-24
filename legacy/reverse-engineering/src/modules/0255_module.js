/**
 * Webpack Module #255
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(328), n(20), n(34), n(38);
    var o = n(1),
      i = n(841),
      a = n(217),
      r = n(86);
    const s = n(381),
      l = n(256),
      c = n(291);
    var d = [],
      u = function () {};
    function p() {
      if (p._instance)
        throw new Error("FontsProviderManager can be instantiated only once.");
      p._instance = this;
    }
    function g(e) {
      var t = gDesigner.getActiveDocument(),
        n = function (o) {
          var s = p.getInstance();
          if (o)
            switch (o.status) {
              case r.Saved:
              case r.SyncFailed:
              case r.Ready:
              case r.SaveFailed:
                s.removeEventListener(a, n), delete s._listenerFor[t.sessionId];
                break;
              case r.LoadFailed:
                s.removeEventListener(a, n), delete s._listenerFor[t.sessionId];
              default:
                return;
            }
          if (
            !((t.getScene().getProperty("cst") || []).indexOf(e.family) >= 0)
          ) {
            var l = [e.family],
              c = d
                .filter(function (e) {
                  return !e.isInitialized() && e.hasEnabler();
                })
                .map(function (e) {
                  return e.getEnabler();
                });
            !(function (e, t) {
              var n = p.getInstance();
              n._missingFontsActions || (n._missingFontsActions = {});
              n._missingFontsActions[t.sessionId] ||
                (n._missingFontsActions[t.sessionId] = {});
              for (
                var o = n._missingFontsActions[t.sessionId], i = e.length - 1;
                i >= 0;
                i--
              ) {
                var a = e[i];
                o.hasOwnProperty(a) ? e.splice(i, 1) : (o[a] = null);
              }
            })(l, t),
              l.length &&
                (s._missingFontsDialog
                  ? (s._missingFontsDialog.setProviderEnablers(c),
                    s._missingFontsDialog.setMissingFonts(l))
                  : l.length &&
                    (s._missingFontsDialog = new i(t, l, c, (e) => {
                      (s._missingFontsDialog = null),
                        (s.keepFontsMessage = null);
                      var n = s._missingFontsActions[t.sessionId];
                      for (var o in e) n[o] = e[o];
                    })),
                e.tryToResolveMissingFont &&
                  s._showMissingFontsDialog &&
                  !s._missingFontsDialog.opened &&
                  s._missingFontsDialog.open(s.keepFontsMessage),
                (s._firstCallback = u));
          }
        };
      if (t && t.getStatus() === r.Ready) n();
      else {
        var o = p.getInstance();
        t &&
          !o._listenerFor[t.sessionId] &&
          ((o._listenerFor[t.sessionId] = n), o.addEventListener(a, n));
      }
    }
    o.GObject.inherit(p, o.GEventTarget),
      (p.ResetEvent = function (e) {
        this.manager = e;
      }),
      o.GObject.inherit(p.ResetEvent, o.GEvent),
      (p.MissingFontEvent = function (e, t, n) {
        (this.manager = e), (this.evt = t), (this.provider = n);
      }),
      o.GObject.inherit(p.MissingFontEvent, o.GEvent),
      (p.prototype.manager = null),
      (p.prototype._resetProviders = null),
      (p.prototype.init = function () {
        gDesigner.addEventListener(
          c,
          this._networkAvailabilityChangedEvent,
          this
        );
      }),
      (p.prototype._networkAvailabilityChangedEvent = function (e) {
        if (this._resetProviders && this._resetProviders.length && e.connected)
          for (; this._resetProviders.length; )
            this.reset(this._resetProviders.shift(), !0);
      }),
      (p.registerProvider = function (e) {
        var t = new e(p._instance);
        d.indexOf(t) < 0 && d.push(t);
      }),
      (p.unregisterProvider = function (e) {
        for (var t = 0; t < d.length; t++)
          d[t] instanceof e && d.splice(t--, 1);
      }),
      (p.getInstance = function () {
        return p._instance || new p();
      }),
      p.getInstance(),
      (p.getProvider = function (e) {
        return v[e] || null;
      }),
      (p.getProviders = function () {
        return d.slice();
      }),
      (p.getProviderInstance = function (e) {
        if (p._instance)
          for (var t = 0; t < d.length; t++) if (d[t] instanceof e) return d[t];
        return null;
      }),
      (p.disableProviders = function (e) {
        if (p._instance) {
          for (var t = 0; t < e.length; t++)
            for (var n = e[t], o = 0; o < d.length; o++)
              d[o] instanceof n ? d[o].setEnabled(!1) : d[o].setEnabled(!0);
          p._instance.reset(null, !1, !0);
        }
      }),
      (p.enableProviders = function (e, t) {
        if (p._instance) {
          for (var n = 0; n < e.length; n++)
            for (var o = e[n], i = 0; i < d.length; i++)
              d[i] instanceof o
                ? d[i].setEnabled(!0)
                : t || d[i].setEnabled(!1);
          t || p._instance.reset(null, !1, !0);
        }
      }),
      (p.resolveQueryFontFamily = function (e) {
        var t = p.getInstance(),
          n = () => {
            var n = t.searchFamilyInCache(e.family);
            e.callback(n && n.fonts && n.fonts.length ? n.fonts : []);
          };
        t.isCacheEmpty() ? t.query(n, "%", !0) : n();
      }),
      (p._triggerMissingFont = function (e, t) {
        var n = p.getInstance();
        n.hasEventListeners(p.MissingFontEvent) &&
          n.trigger(new p.MissingFontEvent(n, e, t));
      }),
      (p.resolveFont = function (e, t) {
        var n;
        e && void 0 === t
          ? (n = p.getProvider(e.family))
            ? n.resolveFont(e.family, e.style, e.weight, {
                done: function (t) {
                  var n;
                  e.sender instanceof o.GFontManager &&
                    (n = e.sender._getFont(e.family, e.style, e.weight)),
                    (n && n.isResolved()) ||
                      (n = o.GOpenTypeFont.create(
                        e.family,
                        e.style,
                        e.weight,
                        t
                      )),
                    n && e.resolved(n);
                },
                fail: function (t) {
                  t && t === s.Errors.ConnectionError
                    ? gDesigner.isOffline() &&
                      l.openUnavailableFeature(() => p.resolveFont(e))
                    : (e.failed(), p._triggerMissingFont(e, n), g(e));
                },
              })
            : p.resolveFont(e, 0)
          : "number" == typeof t &&
            ((n = d[t])
              ? n.resolveFont(e.family, e.style, e.weight, {
                  done: function (n) {
                    var i;
                    e.sender instanceof o.GFontManager &&
                      (i = e.sender._getFont(e.family, e.style, e.weight)),
                      (i && i.isResolved()) ||
                        (i = o.GOpenTypeFont.create(
                          e.family,
                          e.style,
                          e.weight,
                          n
                        )),
                      i ? e.resolved(i) : p.resolveFont(e, t + 1);
                  },
                  fail: function () {
                    p.resolveFont(e, t + 1);
                  },
                })
              : d && t === d.length
              ? (e.failed(), p._triggerMissingFont(e, n), g(e))
              : p.resolveFont(e, t + 1));
      }),
      (p.prototype._lock = null),
      (p.prototype._loaded = 0),
      (p.prototype._lastLoaded = 0),
      (p.prototype._loadedPreviews = 0),
      (p.prototype._lastLoadedPreviews = 0),
      (p.prototype._loading = !1),
      (p.prototype._timeStamp = 0),
      (p.prototype._firstCallback = null),
      (p.prototype._missingFontsDialog = null),
      (p.prototype._missingFontsActions = null),
      (p.prototype._showMissingFontsDialog = !0),
      (p.prototype._listenerFor = {}),
      (p.prototype.getMissingFontsDialog = function () {
        return this._missingFontsDialog;
      }),
      (p.prototype.keepFontsMessage = null);
    var h = {},
      f = [],
      m = {},
      y = [],
      v = {};
    (p.prototype.isLoading = function () {
      return this._loading;
    }),
      (p.prototype.releaseDocumentListener = function (e) {
        this._listenerFor[e.sessionId] &&
          this.removeEventListener(a, this._listenerFor[e.sessionId]);
      }),
      (p.prototype.setShowMissingFontsDialog = function (e) {
        this._showMissingFontsDialog = e;
      }),
      (p.prototype.resetMissingFontsDialog = function () {
        this._missingFontsDialog = null;
      }),
      (p.prototype._providerProbe = function (e, t, n, o, i, a, r, l, c, u) {
        for (
          var p, g, _, b = this, w = l ? 20 : 9999;
          d[e] && !c && !d[e].isEnabled();

        )
          e++;
        if (
          (l
            ? ((p = this._loadedPreviews), (g = this._lastLoadedPreviews))
            : ((p = this._loaded), (g = this._lastLoaded)),
          e >= d.length)
        )
          return (
            (this._loading = !1),
            (this._timeStamp = o),
            void (l
              ? (this._loadedPreviews = this._lastLoadedPreviews)
              : ((this._loaded = this._lastLoaded),
                r &&
                  i.length &&
                  ((!c && this.hasDisabled()) ||
                    ((m[n] = { faces: i.slice(), total: a }),
                    y.unshift(n) > 30 && delete m[y.pop()]),
                  c ||
                    ((h[n] = { faces: i, total: a }),
                    f.unshift(n) > 30 && delete h[f.pop()])),
                t({ faces: i, total: a }),
                c || this._providerProbe(0, t, n, o, [], 0, r, !0, c, u)))
          );
        var C,
          x = p + (p < 9999 ? 9999 : w),
          S = 0;
        if (0 === e && !r) {
          var E = 0;
          for (e = 0; e < d.length; e++)
            if (
              (c || d[e].isEnabled()) &&
              (E += d[e].getTotalFonts(this.normalizeQuery(n))) > p
            ) {
              S = p - E + d[e].getTotalFonts(this.normalizeQuery(n));
              break;
            }
        }
        ((!n || "%" === n) && g < a) || e >= d.length
          ? this._providerProbe(d.length, t, n, o, i, a, r, l, c, u)
          : ((C = x - g),
            (_ = d[e]).load(
              this.normalizeQuery(n),
              S,
              C,
              {
                done: function (s, u, p) {
                  if (o < this._timeStamp) console.log("discarded");
                  else {
                    (d.indexOf(_) < 0 || (!c && !d[e].isEnabled())) &&
                      this._providerProbe(e + 1, t, n, o, i, a, r, l, c);
                    for (var g = 0; g < s.length; g++)
                      v.hasOwnProperty(s[g].family) || (v[s[g].family] = _);
                    if (!l) {
                      var f = h[this.normalizeQuery(n)] || { faces: [] };
                      if (i !== f.faces || c) {
                        for (g = 0; g < i.length; g++) {
                          if (
                            (y = d.indexOf(v[i[g].family])) > e &&
                            d[y].isEnabled()
                          ) {
                            Array.prototype.splice.apply(i, [g, 0].concat(s));
                            break;
                          }
                        }
                        if (
                          (g == i.length && Array.prototype.push.apply(i, s),
                          !c)
                        ) {
                          var m = f.faces;
                          for (g = 0; g < m.length; g++) {
                            if (
                              (y = d.indexOf(v[m[g].family])) > e &&
                              d[y].isEnabled()
                            ) {
                              Array.prototype.splice.apply(m, [g, 0].concat(s));
                              break;
                            }
                          }
                          g == m.length && Array.prototype.push.apply(m, s);
                        }
                      } else {
                        for (var g = 0; g < i.length; g++) {
                          var y;
                          if (
                            (y = d.indexOf(v[i[g].family])) > e &&
                            d[y].isEnabled()
                          ) {
                            Array.prototype.splice.apply(
                              f.faces,
                              [g, 0].concat(s)
                            );
                            break;
                          }
                        }
                        g == i.length && Array.prototype.push.apply(i, s);
                      }
                    }
                    _.addPreviews(s, l),
                      (a += _.getTotalFonts(this.normalizeQuery(n))),
                      r &&
                        0 === e &&
                        (l ? (this._loadedPreviews = 0) : (this._loaded = 0)),
                      l
                        ? (this._lastLoadedPreviews += s.length)
                        : (this._lastLoaded += s.length),
                      i.sort((e, t) => e.family.localeCompare(t.family)),
                      this._providerProbe(e + 1, t, n, o, i, a, r, l, c);
                  }
                }.bind(b),
                fail: function (d) {
                  u ||
                    (d &&
                      d === s.Errors.ConnectionError &&
                      (b._resetProviders || (b._resetProviders = []),
                      b._resetProviders.push(_.constructor))),
                    b._providerProbe(e + 1, t, n, o, i, a, r, l, c);
                }.bind(b),
              },
              u
            ));
      }),
      (p.prototype.setLock = function () {
        this._lock && clearTimeout(this._lock),
          (this._lock = setTimeout(
            function () {
              this._lock = null;
            }.bind(this),
            1e4
          ));
      }),
      (p.prototype.getLock = function () {
        return !!this._lock;
      }),
      (p.prototype.reset = function (e, t, n) {
        if (e)
          for (var o = 0; o < d.length; o++)
            d[o] instanceof e &&
              (t || d[o].isEnabled()) &&
              d[o].resetProvider();
        this._lock && (clearTimeout(this._lock), (this._lock = null)),
          (this._loaded = 0),
          (this._lastLoaded = 0),
          (this._loadedPreviews = 0),
          (this._lastLoadedPreviews = 0),
          (this._loading = !1),
          (this._timeStamp = 0),
          (h = {}),
          (f = []),
          n || ((m = {}), (y = [])),
          this._firstCallback && this.query(this._firstCallback, "%"),
          this._missingFontsDialog && (this._missingFontsDialog = null),
          this.hasEventListeners(p.ResetEvent) &&
            this.trigger(new p.ResetEvent(this));
      }),
      (p.prototype.loadMore = function (e, t) {
        if (!this._loading) {
          if (0 === this._loadedPreviews && 0 === this._lastLoadedPreviews)
            this._providerProbe(0, e, t, n, [], 0, !1, !0);
          else if (
            this._loadedPreviews >= 9999 &&
            this._lastLoadedPreviews < this._loadedPreviews + 20
          )
            if (
              this._loaded >= 9999 &&
              this._lastLoaded < this._loaded + 9999
            ) {
              this._loading = !0;
              var n = new Date().getTime();
              this._providerProbe(0, e, t, n, [], 0, !1, !1);
            } else {
              this._loading = !0;
              n = new Date().getTime();
              this._providerProbe(0, e, t, n, [], 0, !1, !0);
            }
          else if (
            this._loaded >= 9999 &&
            this._lastLoaded < this._loaded + 9999
          ) {
            this._loading = !0;
            n = new Date().getTime();
            this._providerProbe(0, e, t, n, [], 0, !1, !1);
          }
          return this._lastLoadedPreviews;
        }
      }),
      (p.prototype.query = function (e, t, n) {
        if ((t && (t = t.toLowerCase()), n && m.hasOwnProperty(t)))
          e((o = m[t]));
        else if (!n && h.hasOwnProperty(t)) {
          (this._lastLoaded = 0), (this._lastLoadedPreviews = 0);
          var o = h[t];
          (this._loaded = o.faces.length),
            (this._loadedPreviews = o.faces.length),
            e(o);
        } else {
          if (t.length > 2) {
            var i = t.substr(0, t.length - 2);
            for (i = this.normalizeQuery(i); i.length > 1; ) {
              if (h.hasOwnProperty(i))
                if (
                  (o = h[i]).faces.length < 9999 ||
                  o.faces.length == o.total
                ) {
                  for (var a = [], r = 0; r < o.faces.length; r++)
                    o.faces[r].family.substr(0, t.length - 1).toLowerCase() ==
                      t.substr(0, t.length - 1).toLowerCase() &&
                      a.push(o.faces[r]);
                  return (
                    (this._lastLoaded = this._lastLoadedPreviews = 0),
                    (this._loaded = this._loadedPreviews = a.length),
                    void e({ faces: a })
                  );
                }
              (i = i.substr(0, i.length - 2)), (i = this.normalizeQuery(i));
            }
          }
          var s = new Date().getTime();
          (this._loading = !0),
            (this._loaded = this._loadedPreviews = 0),
            (this._lastLoaded = this._lastLoadedPreviews = 0),
            this._providerProbe(0, e, t, s, [], 0, !0, !1, n);
        }
      }),
      (p.prototype.normalizeQuery = function (e) {
        return (
          "%" != e && (e ? (e += "%") : (e = "%"), (e = e.replace(/%+$/, "%"))),
          e
        );
      }),
      (p.prototype.isCacheEmpty = function () {
        return !m || !m.hasOwnProperty("%");
      }),
      (p.prototype.hasDisabled = function () {
        return d.some((e) => !e.isEnabled());
      }),
      (p.prototype.searchFamilyInCache = function (e) {
        var t = e.toLowerCase() + ("%" == e ? "" : "%");
        if (this.isCacheEmpty()) return null;
        for (; t.length > 0; ) {
          if (m.hasOwnProperty(t)) {
            var n = m[t];
            if (n.faces)
              for (var o = 0; o < n.faces.length; o++) {
                var i = n.faces[o];
                if (i.family === e) return i;
                if (i.families && i.families.indexOf(e) >= 0) return i;
              }
          }
          if (1 === t.length) break;
          (t = t.substr(0, t.length - 2)), (t = this.normalizeQuery(t));
        }
        return null;
      }),
      (e.exports = p);
  }