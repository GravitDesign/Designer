/**
 * Webpack Module #1358
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    (function (e) {
      n.d(t, "a", function () {
        return p;
      });
      var o = (function () {
          function e() {}
          return (
            (e.prototype.getApplicationContext = function () {
              return {
                versionName: this.versionName,
                language: i(),
                platform: "Web",
                os: void 0,
                deviceModel: void 0,
              };
            }),
            e
          );
        })(),
        i = function () {
          return (
            ("undefined" != typeof navigator &&
              ((navigator.languages && navigator.languages[0]) ||
                navigator.language)) ||
            ""
          );
        },
        a = (function () {
          function e() {
            this.queue = [];
          }
          return (
            (e.prototype.logEvent = function (e) {
              this.receiver
                ? this.receiver(e)
                : this.queue.length < 512 && this.queue.push(e);
            }),
            (e.prototype.setEventReceiver = function (e) {
              (this.receiver = e),
                this.queue.length > 0 &&
                  (this.queue.forEach(function (t) {
                    e(t);
                  }),
                  (this.queue = []));
            }),
            e
          );
        })(),
        r = function () {
          return (r =
            Object.assign ||
            function (e) {
              for (var t, n = 1, o = arguments.length; n < o; n++)
                for (var i in (t = arguments[n]))
                  Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
              return e;
            }).apply(this, arguments);
        };
      function s(e) {
        var t = "function" == typeof Symbol && Symbol.iterator,
          n = t && e[t],
          o = 0;
        if (n) return n.call(e);
        if (e && "number" == typeof e.length)
          return {
            next: function () {
              return (
                e && o >= e.length && (e = void 0),
                { value: e && e[o++], done: !e }
              );
            },
          };
        throw new TypeError(
          t ? "Object is not iterable." : "Symbol.iterator is not defined."
        );
      }
      function l(e, t) {
        var n = "function" == typeof Symbol && e[Symbol.iterator];
        if (!n) return e;
        var o,
          i,
          a = n.call(e),
          r = [];
        try {
          for (; (void 0 === t || t-- > 0) && !(o = a.next()).done; )
            r.push(o.value);
        } catch (e) {
          i = { error: e };
        } finally {
          try {
            o && !o.done && (n = a.return) && n.call(a);
          } finally {
            if (i) throw i.error;
          }
        }
        return r;
      }
      "function" == typeof SuppressedError && SuppressedError;
      var c = function (e, t) {
        var n,
          o,
          i = typeof e;
        if (i !== typeof t) return !1;
        try {
          for (
            var a = s(["string", "number", "boolean", "undefined"]),
              r = a.next();
            !r.done;
            r = a.next()
          ) {
            if (r.value === i) return e === t;
          }
        } catch (e) {
          n = { error: e };
        } finally {
          try {
            r && !r.done && (o = a.return) && o.call(a);
          } finally {
            if (n) throw n.error;
          }
        }
        if (null == e && null == t) return !0;
        if (null == e || null == t) return !1;
        if (e.length !== t.length) return !1;
        var l = Array.isArray(e),
          d = Array.isArray(t);
        if (l !== d) return !1;
        if (!l || !d) {
          var u = Object.keys(e).sort(),
            p = Object.keys(t).sort();
          if (!c(u, p)) return !1;
          var g = !0;
          return (
            Object.keys(e).forEach(function (n) {
              c(e[n], t[n]) || (g = !1);
            }),
            g
          );
        }
        for (var h = 0; h < e.length; h++) if (!c(e[h], t[h])) return !1;
        return !0;
      };
      Object.entries ||
        (Object.entries = function (e) {
          for (var t = Object.keys(e), n = t.length, o = new Array(n); n--; )
            o[n] = [t[n], e[t[n]]];
          return o;
        });
      var d = (function () {
          function e() {
            (this.identity = { userProperties: {} }),
              (this.listeners = new Set());
          }
          return (
            (e.prototype.editIdentity = function () {
              var e = this,
                t = r({}, this.identity.userProperties),
                n = r(r({}, this.identity), { userProperties: t });
              return {
                setUserId: function (e) {
                  return (n.userId = e), this;
                },
                setDeviceId: function (e) {
                  return (n.deviceId = e), this;
                },
                setUserProperties: function (e) {
                  return (n.userProperties = e), this;
                },
                setOptOut: function (e) {
                  return (n.optOut = e), this;
                },
                updateUserProperties: function (e) {
                  var t,
                    o,
                    i,
                    a,
                    r,
                    c,
                    d = n.userProperties || {};
                  try {
                    for (
                      var u = s(Object.entries(e)), p = u.next();
                      !p.done;
                      p = u.next()
                    ) {
                      var g = l(p.value, 2),
                        h = g[0],
                        f = g[1];
                      switch (h) {
                        case "$set":
                          try {
                            for (
                              var m = ((i = void 0), s(Object.entries(f))),
                                y = m.next();
                              !y.done;
                              y = m.next()
                            ) {
                              var v = l(y.value, 2),
                                _ = v[0],
                                b = v[1];
                              d[_] = b;
                            }
                          } catch (e) {
                            i = { error: e };
                          } finally {
                            try {
                              y && !y.done && (a = m.return) && a.call(m);
                            } finally {
                              if (i) throw i.error;
                            }
                          }
                          break;
                        case "$unset":
                          try {
                            for (
                              var w = ((r = void 0), s(Object.keys(f))),
                                C = w.next();
                              !C.done;
                              C = w.next()
                            ) {
                              delete d[(_ = C.value)];
                            }
                          } catch (e) {
                            r = { error: e };
                          } finally {
                            try {
                              C && !C.done && (c = w.return) && c.call(w);
                            } finally {
                              if (r) throw r.error;
                            }
                          }
                          break;
                        case "$clearAll":
                          d = {};
                      }
                    }
                  } catch (e) {
                    t = { error: e };
                  } finally {
                    try {
                      p && !p.done && (o = u.return) && o.call(u);
                    } finally {
                      if (t) throw t.error;
                    }
                  }
                  return (n.userProperties = d), this;
                },
                commit: function () {
                  return e.setIdentity(n), this;
                },
              };
            }),
            (e.prototype.getIdentity = function () {
              return r({}, this.identity);
            }),
            (e.prototype.setIdentity = function (e) {
              var t = r({}, this.identity);
              (this.identity = r({}, e)),
                c(t, this.identity) ||
                  this.listeners.forEach(function (t) {
                    t(e);
                  });
            }),
            (e.prototype.addIdentityListener = function (e) {
              this.listeners.add(e);
            }),
            (e.prototype.removeIdentityListener = function (e) {
              this.listeners.delete(e);
            }),
            e
          );
        })(),
        u =
          "undefined" != typeof globalThis
            ? globalThis
            : void 0 !== e
            ? e
            : self,
        p = (function () {
          function e() {
            (this.identityStore = new d()),
              (this.eventBridge = new a()),
              (this.applicationContextProvider = new o());
          }
          return (
            (e.getInstance = function (t) {
              return (
                u.analyticsConnectorInstances ||
                  (u.analyticsConnectorInstances = {}),
                u.analyticsConnectorInstances[t] ||
                  (u.analyticsConnectorInstances[t] = new e()),
                u.analyticsConnectorInstances[t]
              );
            }),
            e
          );
        })();
    }).call(this, n(109));
  }