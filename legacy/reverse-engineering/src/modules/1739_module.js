/**
 * Webpack Module #1739
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n.r(t),
      n.d(t, "createInstance", function () {
        return Le;
      }),
      n.d(t, "add", function () {
        return ke;
      }),
      n.d(t, "flush", function () {
        return Oe;
      }),
      n.d(t, "getDeviceId", function () {
        return Fe;
      }),
      n.d(t, "getSessionId", function () {
        return Re;
      }),
      n.d(t, "getUserId", function () {
        return Me;
      }),
      n.d(t, "groupIdentify", function () {
        return Ne;
      }),
      n.d(t, "identify", function () {
        return Be;
      }),
      n.d(t, "init", function () {
        return Ue;
      }),
      n.d(t, "logEvent", function () {
        return $e;
      }),
      n.d(t, "remove", function () {
        return je;
      }),
      n.d(t, "reset", function () {
        return Ke;
      }),
      n.d(t, "revenue", function () {
        return Ve;
      }),
      n.d(t, "setDeviceId", function () {
        return He;
      }),
      n.d(t, "setGroup", function () {
        return We;
      }),
      n.d(t, "setOptOut", function () {
        return ze;
      }),
      n.d(t, "setSessionId", function () {
        return qe;
      }),
      n.d(t, "setTransport", function () {
        return Ye;
      }),
      n.d(t, "setUserId", function () {
        return Xe;
      }),
      n.d(t, "track", function () {
        return Qe;
      }),
      n.d(t, "runQueuedFunctions", function () {
        return ne;
      }),
      n.d(t, "Revenue", function () {
        return O;
      }),
      n.d(t, "Identify", function () {
        return k;
      }),
      n.d(t, "Types", function () {
        return o;
      });
    var o = {};
    n.r(o),
      n.d(o, "ServerZone", function () {
        return m;
      }),
      n.d(o, "SpecialEventType", function () {
        return w;
      }),
      n.d(o, "IdentifyOperation", function () {
        return _;
      }),
      n.d(o, "RevenueProperty", function () {
        return b;
      }),
      n.d(o, "LogLevel", function () {
        return f;
      }),
      n.d(o, "PluginType", function () {
        return g;
      }),
      n.d(o, "Status", function () {
        return h;
      }),
      n.d(o, "TransportType", function () {
        return V;
      });
    var i = function (e, t) {
      return (i =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (e, t) {
            e.__proto__ = t;
          }) ||
        function (e, t) {
          for (var n in t)
            Object.prototype.hasOwnProperty.call(t, n) && (e[n] = t[n]);
        })(e, t);
    };
    function a(e, t) {
      if ("function" != typeof t && null !== t)
        throw new TypeError(
          "Class extends value " + String(t) + " is not a constructor or null"
        );
      function n() {
        this.constructor = e;
      }
      i(e, t),
        (e.prototype =
          null === t
            ? Object.create(t)
            : ((n.prototype = t.prototype), new n()));
    }
    var r = function () {
      return (r =
        Object.assign ||
        function (e) {
          for (var t, n = 1, o = arguments.length; n < o; n++)
            for (var i in (t = arguments[n]))
              Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
          return e;
        }).apply(this, arguments);
    };
    function s(e, t) {
      var n = {};
      for (var o in e)
        Object.prototype.hasOwnProperty.call(e, o) &&
          t.indexOf(o) < 0 &&
          (n[o] = e[o]);
      if (null != e && "function" == typeof Object.getOwnPropertySymbols) {
        var i = 0;
        for (o = Object.getOwnPropertySymbols(e); i < o.length; i++)
          t.indexOf(o[i]) < 0 &&
            Object.prototype.propertyIsEnumerable.call(e, o[i]) &&
            (n[o[i]] = e[o[i]]);
      }
      return n;
    }
    function l(e, t, n, o) {
      return new (n || (n = Promise))(function (i, a) {
        function r(e) {
          try {
            l(o.next(e));
          } catch (e) {
            a(e);
          }
        }
        function s(e) {
          try {
            l(o.throw(e));
          } catch (e) {
            a(e);
          }
        }
        function l(e) {
          var t;
          e.done
            ? i(e.value)
            : ((t = e.value),
              t instanceof n
                ? t
                : new n(function (e) {
                    e(t);
                  })).then(r, s);
        }
        l((o = o.apply(e, t || [])).next());
      });
    }
    function c(e, t) {
      var n,
        o,
        i,
        a = {
          label: 0,
          sent: function () {
            if (1 & i[0]) throw i[1];
            return i[1];
          },
          trys: [],
          ops: [],
        },
        r = Object.create(
          ("function" == typeof Iterator ? Iterator : Object).prototype
        );
      return (
        (r.next = s(0)),
        (r.throw = s(1)),
        (r.return = s(2)),
        "function" == typeof Symbol &&
          (r[Symbol.iterator] = function () {
            return this;
          }),
        r
      );
      function s(s) {
        return function (l) {
          return (function (s) {
            if (n) throw new TypeError("Generator is already executing.");
            for (; r && ((r = 0), s[0] && (a = 0)), a; )
              try {
                if (
                  ((n = 1),
                  o &&
                    (i =
                      2 & s[0]
                        ? o.return
                        : s[0]
                        ? o.throw || ((i = o.return) && i.call(o), 0)
                        : o.next) &&
                    !(i = i.call(o, s[1])).done)
                )
                  return i;
                switch (((o = 0), i && (s = [2 & s[0], i.value]), s[0])) {
                  case 0:
                  case 1:
                    i = s;
                    break;
                  case 4:
                    return a.label++, { value: s[1], done: !1 };
                  case 5:
                    a.label++, (o = s[1]), (s = [0]);
                    continue;
                  case 7:
                    (s = a.ops.pop()), a.trys.pop();
                    continue;
                  default:
                    if (
                      !((i = a.trys),
                      (i = i.length > 0 && i[i.length - 1]) ||
                        (6 !== s[0] && 2 !== s[0]))
                    ) {
                      a = 0;
                      continue;
                    }
                    if (3 === s[0] && (!i || (s[1] > i[0] && s[1] < i[3]))) {
                      a.label = s[1];
                      break;
                    }
                    if (6 === s[0] && a.label < i[1]) {
                      (a.label = i[1]), (i = s);
                      break;
                    }
                    if (i && a.label < i[2]) {
                      (a.label = i[2]), a.ops.push(s);
                      break;
                    }
                    i[2] && a.ops.pop(), a.trys.pop();
                    continue;
                }
                s = t.call(e, a);
              } catch (e) {
                (s = [6, e]), (o = 0);
              } finally {
                n = i = 0;
              }
            if (5 & s[0]) throw s[1];
            return { value: s[0] ? s[1] : void 0, done: !0 };
          })([s, l]);
        };
      }
    }
    Object.create;
    function d(e) {
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
    function u(e, t) {
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
    function p(e, t, n) {
      if (n || 2 === arguments.length)
        for (var o, i = 0, a = t.length; i < a; i++)
          (!o && i in t) ||
            (o || (o = Array.prototype.slice.call(t, 0, i)), (o[i] = t[i]));
      return e.concat(o || Array.prototype.slice.call(t));
    }
    Object.create;
    "function" == typeof SuppressedError && SuppressedError;
    var g, h;
    !(function (e) {
      (e.BEFORE = "before"),
        (e.ENRICHMENT = "enrichment"),
        (e.DESTINATION = "destination");
    })(g || (g = {})),
      (function (e) {
        (e.Unknown = "unknown"),
          (e.Skipped = "skipped"),
          (e.Success = "success"),
          (e.RateLimit = "rate_limit"),
          (e.PayloadTooLarge = "payload_too_large"),
          (e.Invalid = "invalid"),
          (e.Failed = "failed"),
          (e.Timeout = "Timeout"),
          (e.SystemError = "SystemError");
      })(h || (h = {}));
    var f,
      m,
      y = "".concat("AMP", "_unsent"),
      v = function (e, t, n) {
        return (
          void 0 === t && (t = 0),
          void 0 === n && (n = h.Unknown),
          { event: e, code: t, message: n }
        );
      };
    !(function (e) {
      (e[(e.None = 0)] = "None"),
        (e[(e.Error = 1)] = "Error"),
        (e[(e.Warn = 2)] = "Warn"),
        (e[(e.Verbose = 3)] = "Verbose");
    })(f || (f = {})),
      (function (e) {
        (e.US = "US"), (e.EU = "EU");
      })(m || (m = {}));
    var _,
      b,
      w,
      C = "Amplitude Logger ",
      x = (function () {
        function e() {
          this.logLevel = f.None;
        }
        return (
          (e.prototype.disable = function () {
            this.logLevel = f.None;
          }),
          (e.prototype.enable = function (e) {
            void 0 === e && (e = f.Warn), (this.logLevel = e);
          }),
          (e.prototype.log = function () {
            for (var e = [], t = 0; t < arguments.length; t++)
              e[t] = arguments[t];
            this.logLevel < f.Verbose ||
              console.log("".concat(C, "[Log]: ").concat(e.join(" ")));
          }),
          (e.prototype.warn = function () {
            for (var e = [], t = 0; t < arguments.length; t++)
              e[t] = arguments[t];
            this.logLevel < f.Warn ||
              console.warn("".concat(C, "[Warn]: ").concat(e.join(" ")));
          }),
          (e.prototype.error = function () {
            for (var e = [], t = 0; t < arguments.length; t++)
              e[t] = arguments[t];
            this.logLevel < f.Error ||
              console.error("".concat(C, "[Error]: ").concat(e.join(" ")));
          }),
          e
        );
      })(),
      S = function () {
        return {
          flushMaxRetries: 12,
          flushQueueSize: 200,
          flushIntervalMillis: 1e4,
          logLevel: f.Warn,
          loggerProvider: new x(),
          optOut: !1,
          serverUrl: "https://api2.amplitude.com/2/httpapi",
          serverZone: m.US,
          useBatch: !1,
        };
      },
      E = (function () {
        function e(e) {
          var t, n, o;
          this._optOut = !1;
          var i = S();
          (this.apiKey = e.apiKey),
            (this.flushIntervalMillis =
              e.flushIntervalMillis || i.flushIntervalMillis),
            (this.flushMaxRetries = e.flushMaxRetries || i.flushMaxRetries),
            (this.flushQueueSize = e.flushQueueSize || i.flushQueueSize),
            (this.loggerProvider = e.loggerProvider || i.loggerProvider),
            (this.logLevel =
              null !== (t = e.logLevel) && void 0 !== t ? t : i.logLevel),
            (this.minIdLength = e.minIdLength),
            (this.plan = e.plan),
            (this.ingestionMetadata = e.ingestionMetadata),
            (this.optOut =
              null !== (n = e.optOut) && void 0 !== n ? n : i.optOut),
            (this.serverUrl = e.serverUrl),
            (this.serverZone = e.serverZone || i.serverZone),
            (this.storageProvider = e.storageProvider),
            (this.transportProvider = e.transportProvider),
            (this.useBatch =
              null !== (o = e.useBatch) && void 0 !== o ? o : i.useBatch),
            this.loggerProvider.enable(this.logLevel);
          var a = T(e.serverUrl, e.serverZone, e.useBatch);
          (this.serverZone = a.serverZone), (this.serverUrl = a.serverUrl);
        }
        return (
          Object.defineProperty(e.prototype, "optOut", {
            get: function () {
              return this._optOut;
            },
            set: function (e) {
              this._optOut = e;
            },
            enumerable: !1,
            configurable: !0,
          }),
          e
        );
      })(),
      A = function (e, t) {
        return e === m.EU
          ? t
            ? "https://api.eu.amplitude.com/batch"
            : "https://api.eu.amplitude.com/2/httpapi"
          : t
          ? "https://api2.amplitude.com/batch"
          : "https://api2.amplitude.com/2/httpapi";
      },
      T = function (e, t, n) {
        if (
          (void 0 === e && (e = ""),
          void 0 === t && (t = S().serverZone),
          void 0 === n && (n = S().useBatch),
          e)
        )
          return { serverUrl: e, serverZone: void 0 };
        var o = [m.US, m.EU].includes(t) ? t : S().serverZone;
        return { serverZone: o, serverUrl: A(o, n) };
      },
      G = (function () {
        function e() {
          (this.name = "amplitude"),
            (this.type = g.DESTINATION),
            (this.retryTimeout = 1e3),
            (this.throttleTimeout = 3e4),
            (this.storageKey = ""),
            (this.scheduled = !1),
            (this.queue = []);
        }
        return (
          (e.prototype.setup = function (e) {
            var t;
            return l(this, void 0, void 0, function () {
              var n,
                o = this;
              return c(this, function (i) {
                switch (i.label) {
                  case 0:
                    return (
                      (this.config = e),
                      (this.storageKey = ""
                        .concat(y, "_")
                        .concat(this.config.apiKey.substring(0, 10))),
                      [
                        4,
                        null === (t = this.config.storageProvider) ||
                        void 0 === t
                          ? void 0
                          : t.get(this.storageKey),
                      ]
                    );
                  case 1:
                    return (
                      (n = i.sent()),
                      this.saveEvents(),
                      n &&
                        n.length > 0 &&
                        Promise.all(
                          n.map(function (e) {
                            return o.execute(e);
                          })
                        ).catch(),
                      [2, Promise.resolve(void 0)]
                    );
                }
              });
            });
          }),
          (e.prototype.execute = function (e) {
            var t = this;
            return new Promise(function (n) {
              var o = {
                event: e,
                attempts: 0,
                callback: function (e) {
                  return n(e);
                },
                timeout: 0,
              };
              t.addToQueue(o);
            });
          }),
          (e.prototype.addToQueue = function () {
            for (var e = this, t = [], n = 0; n < arguments.length; n++)
              t[n] = arguments[n];
            var o = t.filter(function (t) {
              return t.attempts < e.config.flushMaxRetries
                ? ((t.attempts += 1), !0)
                : (e.fulfillRequest(
                    [t],
                    500,
                    "Event rejected due to exceeded retry count"
                  ),
                  !1);
            });
            o.forEach(function (t) {
              (e.queue = e.queue.concat(t)),
                0 !== t.timeout
                  ? setTimeout(function () {
                      (t.timeout = 0), e.schedule(0);
                    }, t.timeout)
                  : e.schedule(e.config.flushIntervalMillis);
            }),
              this.saveEvents();
          }),
          (e.prototype.schedule = function (e) {
            var t = this;
            this.scheduled ||
              ((this.scheduled = !0),
              setTimeout(function () {
                t.flush(!0).then(function () {
                  (t.scheduled = !1), t.queue.length > 0 && t.schedule(e);
                });
              }, e));
          }),
          (e.prototype.flush = function (e) {
            return (
              void 0 === e && (e = !1),
              l(this, void 0, void 0, function () {
                var t,
                  n,
                  o,
                  i = this;
                return c(this, function (a) {
                  switch (a.label) {
                    case 0:
                      return (
                        (t = []),
                        (n = []),
                        this.queue.forEach(function (e) {
                          return 0 === e.timeout ? t.push(e) : n.push(e);
                        }),
                        (this.queue = n),
                        (r = t),
                        (s = this.config.flushQueueSize),
                        (l = Math.max(s, 1)),
                        (o = r.reduce(function (e, t, n) {
                          var o = Math.floor(n / l);
                          return e[o] || (e[o] = []), e[o].push(t), e;
                        }, [])),
                        [
                          4,
                          Promise.all(
                            o.map(function (t) {
                              return i.send(t, e);
                            })
                          ),
                        ]
                      );
                    case 1:
                      return a.sent(), [2];
                  }
                  var r, s, l;
                });
              })
            );
          }),
          (e.prototype.send = function (e, t) {
            return (
              void 0 === t && (t = !0),
              l(this, void 0, void 0, function () {
                var n, o, i, a;
                return c(this, function (r) {
                  switch (r.label) {
                    case 0:
                      if (!this.config.apiKey)
                        return [
                          2,
                          this.fulfillRequest(
                            e,
                            400,
                            "Event rejected due to missing API key"
                          ),
                        ];
                      (n = {
                        api_key: this.config.apiKey,
                        events: e.map(function (e) {
                          var t = e.event;
                          t.extra;
                          return s(t, ["extra"]);
                        }),
                        options: { min_id_length: this.config.minIdLength },
                      }),
                        (r.label = 1);
                    case 1:
                      return (
                        r.trys.push([1, 3, , 4]),
                        (o = T(
                          this.config.serverUrl,
                          this.config.serverZone,
                          this.config.useBatch
                        ).serverUrl),
                        [4, this.config.transportProvider.send(o, n)]
                      );
                    case 2:
                      return null === (i = r.sent())
                        ? (this.fulfillRequest(
                            e,
                            0,
                            "Unexpected error occurred"
                          ),
                          [2])
                        : t
                        ? (this.handleReponse(i, e), [3, 4])
                        : (this.fulfillRequest(e, i.statusCode, i.status), [2]);
                    case 3:
                      return (
                        (a = r.sent()),
                        this.fulfillRequest(e, 0, String(a)),
                        [3, 4]
                      );
                    case 4:
                      return [2];
                  }
                });
              })
            );
          }),
          (e.prototype.handleReponse = function (e, t) {
            switch (e.status) {
              case h.Success:
                this.handleSuccessResponse(e, t);
                break;
              case h.Invalid:
                this.handleInvalidResponse(e, t);
                break;
              case h.PayloadTooLarge:
                this.handlePayloadTooLargeResponse(e, t);
                break;
              case h.RateLimit:
                this.handleRateLimitResponse(e, t);
                break;
              default:
                this.handleOtherReponse(t);
            }
          }),
          (e.prototype.handleSuccessResponse = function (e, t) {
            this.fulfillRequest(t, e.statusCode, "Event tracked successfully");
          }),
          (e.prototype.handleInvalidResponse = function (e, t) {
            var n = this;
            if (
              e.body.missingField ||
              e.body.error.startsWith("Invalid API key")
            )
              this.fulfillRequest(t, e.statusCode, e.body.error);
            else {
              var o = p(
                  p(
                    p(
                      p(
                        [],
                        u(Object.values(e.body.eventsWithInvalidFields)),
                        !1
                      ),
                      u(Object.values(e.body.eventsWithMissingFields)),
                      !1
                    ),
                    u(Object.values(e.body.eventsWithInvalidIdLengths)),
                    !1
                  ),
                  u(e.body.silencedEvents),
                  !1
                ).flat(),
                i = new Set(o),
                a = t.filter(function (t, o) {
                  if (!i.has(o)) return !0;
                  n.fulfillRequest([t], e.statusCode, e.body.error);
                });
              this.addToQueue.apply(this, p([], u(a), !1));
            }
          }),
          (e.prototype.handlePayloadTooLargeResponse = function (e, t) {
            1 !== t.length
              ? ((this.config.flushQueueSize /= 2),
                this.addToQueue.apply(this, p([], u(t), !1)))
              : this.fulfillRequest(t, e.statusCode, e.body.error);
          }),
          (e.prototype.handleRateLimitResponse = function (e, t) {
            var n = this,
              o = Object.keys(e.body.exceededDailyQuotaUsers),
              i = Object.keys(e.body.exceededDailyQuotaDevices),
              a = e.body.throttledEvents,
              r = new Set(o),
              s = new Set(i),
              l = new Set(a),
              c = t.filter(function (t, o) {
                if (
                  !(
                    (t.event.user_id && r.has(t.event.user_id)) ||
                    (t.event.device_id && s.has(t.event.device_id))
                  )
                )
                  return l.has(o) && (t.timeout = n.throttleTimeout), !0;
                n.fulfillRequest([t], e.statusCode, e.body.error);
              });
            this.addToQueue.apply(this, p([], u(c), !1));
          }),
          (e.prototype.handleOtherReponse = function (e) {
            var t = this;
            this.addToQueue.apply(
              this,
              p(
                [],
                u(
                  e.map(function (e) {
                    return (e.timeout = e.attempts * t.retryTimeout), e;
                  })
                ),
                !1
              )
            );
          }),
          (e.prototype.fulfillRequest = function (e, t, n) {
            this.saveEvents(),
              e.forEach(function (e) {
                return e.callback(v(e.event, t, n));
              });
          }),
          (e.prototype.saveEvents = function () {
            if (this.config.storageProvider) {
              var e = Array.from(
                this.queue.map(function (e) {
                  return e.event;
                })
              );
              this.config.storageProvider.set(this.storageKey, e);
            }
          }),
          e
        );
      })(),
      P = function (e) {
        return e
          ? (e ^ ((16 * Math.random()) >> (e / 4))).toString(16)
          : (
              String(1e7) +
              String(-1e3) +
              String(-4e3) +
              String(-8e3) +
              String(-1e11)
            ).replace(/[018]/g, P);
      };
    !(function (e) {
      (e.SET = "$set"),
        (e.SET_ONCE = "$setOnce"),
        (e.ADD = "$add"),
        (e.APPEND = "$append"),
        (e.PREPEND = "$prepend"),
        (e.REMOVE = "$remove"),
        (e.PREINSERT = "$preInsert"),
        (e.POSTINSERT = "$postInsert"),
        (e.UNSET = "$unset"),
        (e.CLEAR_ALL = "$clearAll");
    })(_ || (_ = {})),
      (function (e) {
        (e.REVENUE_PRODUCT_ID = "$productId"),
          (e.REVENUE_QUANTITY = "$quantity"),
          (e.REVENUE_PRICE = "$price"),
          (e.REVENUE_TYPE = "$revenueType"),
          (e.REVENUE = "$revenue");
      })(b || (b = {})),
      (function (e) {
        (e.IDENTIFY = "$identify"),
          (e.GROUP_IDENTIFY = "$groupidentify"),
          (e.REVENUE = "revenue_amount");
      })(w || (w = {}));
    var D,
      L = function (e) {
        if (Object.keys(e).length > 1e3) return !1;
        for (var t in e) {
          var n = e[t];
          if (!I(t, n)) return !1;
        }
        return !0;
      },
      I = function (e, t) {
        var n, o;
        if ("string" != typeof e) return !1;
        if (Array.isArray(t)) {
          var i = !0;
          try {
            for (var a = d(t), r = a.next(); !r.done; r = a.next()) {
              var s = r.value;
              if (Array.isArray(s)) return !1;
              if ("object" == typeof s) i = i && L(s);
              else if (!["number", "string"].includes(typeof s)) return !1;
              if (!i) return !1;
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
        } else {
          if (null == t) return !1;
          if ("object" == typeof t) return L(t);
          if (!["number", "string", "boolean"].includes(typeof t)) return !1;
        }
        return !0;
      },
      k = (function () {
        function e() {
          (this._propertySet = new Set()), (this._properties = {});
        }
        return (
          (e.prototype.getUserProperties = function () {
            return r({}, this._properties);
          }),
          (e.prototype.set = function (e, t) {
            return this._safeSet(_.SET, e, t), this;
          }),
          (e.prototype.setOnce = function (e, t) {
            return this._safeSet(_.SET_ONCE, e, t), this;
          }),
          (e.prototype.append = function (e, t) {
            return this._safeSet(_.APPEND, e, t), this;
          }),
          (e.prototype.prepend = function (e, t) {
            return this._safeSet(_.PREPEND, e, t), this;
          }),
          (e.prototype.postInsert = function (e, t) {
            return this._safeSet(_.POSTINSERT, e, t), this;
          }),
          (e.prototype.preInsert = function (e, t) {
            return this._safeSet(_.PREINSERT, e, t), this;
          }),
          (e.prototype.remove = function (e, t) {
            return this._safeSet(_.REMOVE, e, t), this;
          }),
          (e.prototype.add = function (e, t) {
            return this._safeSet(_.ADD, e, t), this;
          }),
          (e.prototype.unset = function (e) {
            return this._safeSet(_.UNSET, e, "-"), this;
          }),
          (e.prototype.clearAll = function () {
            return (
              (this._properties = {}),
              (this._properties[_.CLEAR_ALL] = "-"),
              this
            );
          }),
          (e.prototype._safeSet = function (e, t, n) {
            if (this._validate(e, t, n)) {
              var o = this._properties[e];
              return (
                void 0 === o && ((o = {}), (this._properties[e] = o)),
                (o[t] = n),
                this._propertySet.add(t),
                !0
              );
            }
            return !1;
          }),
          (e.prototype._validate = function (e, t, n) {
            return (
              void 0 === this._properties[_.CLEAR_ALL] &&
              !this._propertySet.has(t) &&
              (e === _.ADD
                ? "number" == typeof n
                : e === _.UNSET || e === _.REMOVE || I(t, n))
            );
          }),
          e
        );
      })(),
      O = (function () {
        function e() {
          (this.productId = ""), (this.quantity = 1), (this.price = 0);
        }
        return (
          (e.prototype.setProductId = function (e) {
            return (this.productId = e), this;
          }),
          (e.prototype.setQuantity = function (e) {
            return e > 0 && (this.quantity = e), this;
          }),
          (e.prototype.setPrice = function (e) {
            return (this.price = e), this;
          }),
          (e.prototype.setRevenueType = function (e) {
            return (this.revenueType = e), this;
          }),
          (e.prototype.setRevenue = function (e) {
            return (this.revenue = e), this;
          }),
          (e.prototype.setEventProperties = function (e) {
            return L(e) && (this.properties = e), this;
          }),
          (e.prototype.getEventProperties = function () {
            var e = this.properties ? r({}, this.properties) : {};
            return (
              (e[b.REVENUE_PRODUCT_ID] = this.productId),
              (e[b.REVENUE_QUANTITY] = this.quantity),
              (e[b.REVENUE_PRICE] = this.price),
              (e[b.REVENUE_TYPE] = this.revenueType),
              (e[b.REVENUE] = this.revenue),
              e
            );
          }),
          e
        );
      })(),
      F = (function () {
        function e() {
          (this.queue = []), (this.applying = !1), (this.plugins = []);
        }
        return (
          (e.prototype.register = function (e, t) {
            return l(this, void 0, void 0, function () {
              return c(this, function (n) {
                switch (n.label) {
                  case 0:
                    return [4, e.setup(t)];
                  case 1:
                    return n.sent(), this.plugins.push(e), [2];
                }
              });
            });
          }),
          (e.prototype.deregister = function (e) {
            return (
              this.plugins.splice(
                this.plugins.findIndex(function (t) {
                  return t.name === e;
                }),
                1
              ),
              Promise.resolve()
            );
          }),
          (e.prototype.reset = function () {
            (this.applying = !1), (this.plugins = []);
          }),
          (e.prototype.push = function (e) {
            var t = this;
            return new Promise(function (n) {
              t.queue.push([e, n]), t.scheduleApply(0);
            });
          }),
          (e.prototype.scheduleApply = function (e) {
            var t = this;
            this.applying ||
              ((this.applying = !0),
              setTimeout(function () {
                t.apply(t.queue.shift()).then(function () {
                  (t.applying = !1), t.queue.length > 0 && t.scheduleApply(0);
                });
              }, e));
          }),
          (e.prototype.apply = function (e) {
            return l(this, void 0, void 0, function () {
              var t, n, o, i, a, s, l, p, h, f, m, y, _, b, w, C, x, S;
              return c(this, function (c) {
                switch (c.label) {
                  case 0:
                    if (!e) return [2];
                    (t = u(e, 1)),
                      (n = t[0]),
                      (o = u(e, 2)),
                      (i = o[1]),
                      (a = this.plugins.filter(function (e) {
                        return e.type === g.BEFORE;
                      })),
                      (c.label = 1);
                  case 1:
                    c.trys.push([1, 6, 7, 8]),
                      (s = d(a)),
                      (l = s.next()),
                      (c.label = 2);
                  case 2:
                    return l.done ? [3, 5] : [4, l.value.execute(r({}, n))];
                  case 3:
                    (n = c.sent()), (c.label = 4);
                  case 4:
                    return (l = s.next()), [3, 2];
                  case 5:
                    return [3, 8];
                  case 6:
                    return (p = c.sent()), (w = { error: p }), [3, 8];
                  case 7:
                    try {
                      l && !l.done && (C = s.return) && C.call(s);
                    } finally {
                      if (w) throw w.error;
                    }
                    return [7];
                  case 8:
                    (h = this.plugins.filter(function (e) {
                      return e.type === g.ENRICHMENT;
                    })),
                      (c.label = 9);
                  case 9:
                    c.trys.push([9, 14, 15, 16]),
                      (f = d(h)),
                      (m = f.next()),
                      (c.label = 10);
                  case 10:
                    return m.done ? [3, 13] : [4, m.value.execute(r({}, n))];
                  case 11:
                    (n = c.sent()), (c.label = 12);
                  case 12:
                    return (m = f.next()), [3, 10];
                  case 13:
                    return [3, 16];
                  case 14:
                    return (y = c.sent()), (x = { error: y }), [3, 16];
                  case 15:
                    try {
                      m && !m.done && (S = f.return) && S.call(f);
                    } finally {
                      if (x) throw x.error;
                    }
                    return [7];
                  case 16:
                    return (
                      (_ = this.plugins.filter(function (e) {
                        return e.type === g.DESTINATION;
                      })),
                      (b = _.map(function (e) {
                        var t = r({}, n);
                        return e.execute(t).catch(function (e) {
                          return v(t, 0, String(e));
                        });
                      })),
                      Promise.all(b).then(function (e) {
                        var t = u(e, 1)[0];
                        i(t);
                      }),
                      [2]
                    );
                }
              });
            });
          }),
          (e.prototype.flush = function () {
            return l(this, void 0, void 0, function () {
              var e,
                t,
                n,
                o = this;
              return c(this, function (i) {
                switch (i.label) {
                  case 0:
                    return (
                      (e = this.queue),
                      (this.queue = []),
                      [
                        4,
                        Promise.all(
                          e.map(function (e) {
                            return o.apply(e);
                          })
                        ),
                      ]
                    );
                  case 1:
                    return (
                      i.sent(),
                      (t = this.plugins.filter(function (e) {
                        return e.type === g.DESTINATION;
                      })),
                      (n = t.map(function (e) {
                        return e.flush && e.flush();
                      })),
                      [4, Promise.all(n)]
                    );
                  case 2:
                    return i.sent(), [2];
                }
              });
            });
          }),
          e
        );
      })(),
      R = (function () {
        function e(e) {
          void 0 === e && (e = "$default"),
            (this.initializing = !1),
            (this.q = []),
            (this.dispatchQ = []),
            (this.logEvent = this.track.bind(this)),
            (this.timeline = new F()),
            (this.name = e);
        }
        return (
          (e.prototype._init = function (e) {
            return l(this, void 0, void 0, function () {
              return c(this, function (t) {
                switch (t.label) {
                  case 0:
                    return (
                      (this.config = e),
                      this.timeline.reset(),
                      [4, this.runQueuedFunctions("q")]
                    );
                  case 1:
                    return t.sent(), [2];
                }
              });
            });
          }),
          (e.prototype.runQueuedFunctions = function (e) {
            return l(this, void 0, void 0, function () {
              var t, n, o, i, a, r;
              return c(this, function (s) {
                switch (s.label) {
                  case 0:
                    (t = this[e]), (this[e] = []), (s.label = 1);
                  case 1:
                    s.trys.push([1, 6, 7, 8]),
                      (n = d(t)),
                      (o = n.next()),
                      (s.label = 2);
                  case 2:
                    return o.done ? [3, 5] : [4, (0, o.value)()];
                  case 3:
                    s.sent(), (s.label = 4);
                  case 4:
                    return (o = n.next()), [3, 2];
                  case 5:
                    return [3, 8];
                  case 6:
                    return (i = s.sent()), (a = { error: i }), [3, 8];
                  case 7:
                    try {
                      o && !o.done && (r = n.return) && r.call(n);
                    } finally {
                      if (a) throw a.error;
                    }
                    return [7];
                  case 8:
                    return [2];
                }
              });
            });
          }),
          (e.prototype.track = function (e, t, n) {
            var o = (function (e, t, n) {
              return r(
                r(r({}, "string" == typeof e ? { event_type: e } : e), n),
                t && { event_properties: t }
              );
            })(e, t, n);
            return this.dispatch(o);
          }),
          (e.prototype.identify = function (e, t) {
            var n = (function (e, t) {
              return r(r({}, t), {
                event_type: w.IDENTIFY,
                user_properties: e.getUserProperties(),
              });
            })(e, t);
            return this.dispatch(n);
          }),
          (e.prototype.groupIdentify = function (e, t, n, o) {
            var i = (function (e, t, n, o) {
              var i;
              return r(r({}, o), {
                event_type: w.GROUP_IDENTIFY,
                group_properties: n.getUserProperties(),
                groups: ((i = {}), (i[e] = t), i),
              });
            })(e, t, n, o);
            return this.dispatch(i);
          }),
          (e.prototype.setGroup = function (e, t, n) {
            var o = (function (e, t, n) {
              var o,
                i = new k();
              return (
                i.set(e, t),
                r(r({}, n), {
                  event_type: w.IDENTIFY,
                  user_properties: i.getUserProperties(),
                  groups: ((o = {}), (o[e] = t), o),
                })
              );
            })(e, t, n);
            return this.dispatch(o);
          }),
          (e.prototype.revenue = function (e, t) {
            var n = (function (e, t) {
              return r(r({}, t), {
                event_type: w.REVENUE,
                event_properties: e.getEventProperties(),
              });
            })(e, t);
            return this.dispatch(n);
          }),
          (e.prototype.add = function (e) {
            return l(this, void 0, void 0, function () {
              return c(this, function (t) {
                return this.config
                  ? [2, this.timeline.register(e, this.config)]
                  : (this.q.push(this.add.bind(this, e)), [2]);
              });
            });
          }),
          (e.prototype.remove = function (e) {
            return l(this, void 0, void 0, function () {
              return c(this, function (t) {
                return this.config
                  ? [2, this.timeline.deregister(e)]
                  : (this.q.push(this.remove.bind(this, e)), [2]);
              });
            });
          }),
          (e.prototype.dispatchWithCallback = function (e, t) {
            if (!this.config) return t(v(e, 0, "Client not initialized"));
            this.process(e).then(t);
          }),
          (e.prototype.dispatch = function (e) {
            return l(this, void 0, void 0, function () {
              var t = this;
              return c(this, function (n) {
                return this.config
                  ? [2, this.process(e)]
                  : [
                      2,
                      new Promise(function (n) {
                        t.dispatchQ.push(t.dispatchWithCallback.bind(t, e, n));
                      }),
                    ];
              });
            });
          }),
          (e.prototype.process = function (e) {
            return l(this, void 0, void 0, function () {
              var t, n, o;
              return c(this, function (i) {
                switch (i.label) {
                  case 0:
                    return (
                      i.trys.push([0, 2, , 3]),
                      this.config.optOut
                        ? [2, v(e, 0, "Event skipped due to optOut config")]
                        : [4, this.timeline.push(e)]
                    );
                  case 1:
                    return (
                      200 === (o = i.sent()).code
                        ? this.config.loggerProvider.log(o.message)
                        : this.config.loggerProvider.error(o.message),
                      [2, o]
                    );
                  case 2:
                    return (
                      (t = i.sent()),
                      (n = String(t)),
                      this.config.loggerProvider.error(n),
                      [2, (o = v(e, 0, n))]
                    );
                  case 3:
                    return [2];
                }
              });
            });
          }),
          (e.prototype.setOptOut = function (e) {
            this.config
              ? (this.config.optOut = Boolean(e))
              : this.q.push(this.setOptOut.bind(this, Boolean(e)));
          }),
          (e.prototype.flush = function () {
            return this.timeline.flush();
          }),
          e
        );
      })(),
      M = function (e) {
        return function () {
          for (var t = [], n = 0; n < arguments.length; n++)
            t[n] = arguments[n];
          return { promise: e.apply(void 0, p([], u(t), !1)) };
        };
      },
      N = n(1358),
      B = function () {
        return N.a.getInstance("$default_instance");
      };
    !(function (e) {
      (e.BEFORE = "before"),
        (e.ENRICHMENT = "enrichment"),
        (e.DESTINATION = "destination");
    })(D || (D = {}));
    var U,
      $,
      j,
      K = (function () {
        function e() {
          (this.name = "identity"),
            (this.type = D.BEFORE),
            (this.identityStore = B().identityStore);
        }
        return (
          (e.prototype.execute = function (e) {
            return l(this, void 0, void 0, function () {
              var t;
              return c(this, function (n) {
                return (
                  (t = e.user_properties) &&
                    this.identityStore
                      .editIdentity()
                      .updateUserProperties(t)
                      .commit(),
                  [2, e]
                );
              });
            });
          }),
          (e.prototype.setup = function (e) {
            return Promise.resolve(void 0);
          }),
          e
        );
      })();
    !(function (e) {
      (e.SET = "$set"),
        (e.SET_ONCE = "$setOnce"),
        (e.ADD = "$add"),
        (e.APPEND = "$append"),
        (e.PREPEND = "$prepend"),
        (e.REMOVE = "$remove"),
        (e.PREINSERT = "$preInsert"),
        (e.POSTINSERT = "$postInsert"),
        (e.UNSET = "$unset"),
        (e.CLEAR_ALL = "$clearAll");
    })(U || (U = {})),
      (function (e) {
        (e.REVENUE_PRODUCT_ID = "$productId"),
          (e.REVENUE_QUANTITY = "$quantity"),
          (e.REVENUE_PRICE = "$price"),
          (e.REVENUE_TYPE = "$revenueType"),
          (e.REVENUE = "$revenue");
      })($ || ($ = {})),
      (function (e) {
        (e.IDENTIFY = "$identify"),
          (e.GROUP_IDENTIFY = "$groupidentify"),
          (e.REVENUE = "revenue_amount");
      })(j || (j = {}));
    var V,
      H = "AMP",
      W =
        ("".concat(H, "_unsent"),
        function (e) {
          if (Object.keys(e).length > 1e3) return !1;
          for (var t in e) {
            var n = e[t];
            if (!z(t, n)) return !1;
          }
          return !0;
        }),
      z = function (e, t) {
        var n, o;
        if ("string" != typeof e) return !1;
        if (Array.isArray(t)) {
          var i = !0;
          try {
            for (var a = d(t), r = a.next(); !r.done; r = a.next()) {
              var s = r.value;
              if (Array.isArray(s)) return !1;
              if ("object" == typeof s) i = i && W(s);
              else if (!["number", "string"].includes(typeof s)) return !1;
              if (!i) return !1;
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
        } else {
          if (null == t) return !1;
          if ("object" == typeof t) return W(t);
          if (!["number", "string", "boolean"].includes(typeof t)) return !1;
        }
        return !0;
      },
      q = (function () {
        function e() {
          (this._propertySet = new Set()), (this._properties = {});
        }
        return (
          (e.prototype.getUserProperties = function () {
            return r({}, this._properties);
          }),
          (e.prototype.set = function (e, t) {
            return this._safeSet(U.SET, e, t), this;
          }),
          (e.prototype.setOnce = function (e, t) {
            return this._safeSet(U.SET_ONCE, e, t), this;
          }),
          (e.prototype.append = function (e, t) {
            return this._safeSet(U.APPEND, e, t), this;
          }),
          (e.prototype.prepend = function (e, t) {
            return this._safeSet(U.PREPEND, e, t), this;
          }),
          (e.prototype.postInsert = function (e, t) {
            return this._safeSet(U.POSTINSERT, e, t), this;
          }),
          (e.prototype.preInsert = function (e, t) {
            return this._safeSet(U.PREINSERT, e, t), this;
          }),
          (e.prototype.remove = function (e, t) {
            return this._safeSet(U.REMOVE, e, t), this;
          }),
          (e.prototype.add = function (e, t) {
            return this._safeSet(U.ADD, e, t), this;
          }),
          (e.prototype.unset = function (e) {
            return this._safeSet(U.UNSET, e, "-"), this;
          }),
          (e.prototype.clearAll = function () {
            return (
              (this._properties = {}),
              (this._properties[U.CLEAR_ALL] = "-"),
              this
            );
          }),
          (e.prototype._safeSet = function (e, t, n) {
            if (this._validate(e, t, n)) {
              var o = this._properties[e];
              return (
                void 0 === o && ((o = {}), (this._properties[e] = o)),
                (o[t] = n),
                this._propertySet.add(t),
                !0
              );
            }
            return !1;
          }),
          (e.prototype._validate = function (e, t, n) {
            return (
              void 0 === this._properties[U.CLEAR_ALL] &&
              !this._propertySet.has(t) &&
              (e === U.ADD
                ? "number" == typeof n
                : e === U.UNSET || e === U.REMOVE || z(t, n))
            );
          }),
          e
        );
      })(),
      Y = function (e, t, n) {
        return (
          void 0 === t && (t = ""),
          void 0 === n && (n = 10),
          [H, t, e.substring(0, n)].filter(Boolean).join("_")
        );
      },
      X = n(611),
      Q = function () {
        var e,
          t = Object(X.a)();
        return (
          null === (e = null == t ? void 0 : t.location) || void 0 === e
            ? void 0
            : e.search
        )
          ? t.location.search
              .substring(1)
              .split("&")
              .filter(Boolean)
              .reduce(function (e, t) {
                var n = t.split("=", 2),
                  o = J(n[0]),
                  i = J(n[1]);
                return i ? ((e[o] = i), e) : e;
              }, {})
          : {};
      },
      J = function (e) {
        void 0 === e && (e = "");
        try {
          return decodeURIComponent(e);
        } catch (e) {
          return "";
        }
      },
      Z = {
        utm_source: void 0,
        utm_medium: void 0,
        utm_campaign: void 0,
        utm_term: void 0,
        utm_content: void 0,
        referrer: void 0,
        referring_domain: void 0,
        dclid: void 0,
        gbraid: void 0,
        gclid: void 0,
        fbclid: void 0,
        ko_click_id: void 0,
        msclkid: void 0,
        ttclid: void 0,
        twclid: void 0,
        wbraid: void 0,
      },
      ee = (function () {
        function e() {}
        return (
          (e.prototype.parse = function () {
            return l(this, void 0, void 0, function () {
              return c(this, function (e) {
                return [
                  2,
                  r(
                    r(r(r({}, Z), this.getUtmParam()), this.getReferrer()),
                    this.getClickIds()
                  ),
                ];
              });
            });
          }),
          (e.prototype.getUtmParam = function () {
            var e = Q();
            return {
              utm_source: e.utm_source,
              utm_medium: e.utm_medium,
              utm_campaign: e.utm_campaign,
              utm_term: e.utm_term,
              utm_content: e.utm_content,
            };
          }),
          (e.prototype.getReferrer = function () {
            var e,
              t,
              n = { referrer: void 0, referring_domain: void 0 };
            try {
              (n.referrer = document.referrer || void 0),
                (n.referring_domain =
                  null !==
                    (t =
                      null === (e = n.referrer) || void 0 === e
                        ? void 0
                        : e.split("/")[2]) && void 0 !== t
                    ? t
                    : void 0);
            } catch (e) {}
            return n;
          }),
          (e.prototype.getClickIds = function () {
            var e,
              t = Q();
            return (
              ((e = {}).dclid = t.dclid),
              (e.fbclid = t.fbclid),
              (e.gbraid = t.gbraid),
              (e.gclid = t.gclid),
              (e.ko_click_id = t.ko_click_id),
              (e.msclkid = t.msclkid),
              (e.ttclid = t.ttclid),
              (e.twclid = t.twclid),
              (e.wbraid = t.wbraid),
              e
            );
          }),
          e
        );
      })(),
      te = (function () {
        function e(e, t) {
          var n, o;
          (this.storage = t.storage),
            (this.storageKey = Y(e, "MKTG")),
            (this.parser = new ee()),
            (this.track = t.track),
            (this.onNewCampaign = t.onNewCampaign),
            (this.disabled = Boolean(t.disabled)),
            (this.trackNewCampaigns = Boolean(t.trackNewCampaigns)),
            (this.trackPageViews = Boolean(t.trackPageViews)),
            (this.excludeReferrers =
              null !== (n = t.excludeReferrers) && void 0 !== n ? n : []),
            "undefined" != typeof location &&
              this.excludeReferrers.unshift(location.hostname),
            (this.initialEmptyValue =
              null !== (o = t.initialEmptyValue) && void 0 !== o ? o : "EMPTY");
        }
        return (
          (e.prototype.isNewCampaign = function (e, t) {
            e.referrer;
            var n = s(e, ["referrer"]),
              o = t || {},
              i = (o.referrer, s(o, ["referrer"])),
              a = Boolean(
                n.referring_domain &&
                  this.excludeReferrers.includes(n.referring_domain)
              ),
              r = JSON.stringify(n) !== JSON.stringify(i);
            return !a && (!t || r);
          }),
          (e.prototype.saveCampaignToStorage = function (e) {
            return l(this, void 0, void 0, function () {
              return c(this, function (t) {
                switch (t.label) {
                  case 0:
                    return [4, this.storage.set(this.storageKey, e)];
                  case 1:
                    return t.sent(), [2];
                }
              });
            });
          }),
          (e.prototype.getCampaignFromStorage = function () {
            return l(this, void 0, void 0, function () {
              return c(this, function (e) {
                switch (e.label) {
                  case 0:
                    return [4, this.storage.get(this.storageKey)];
                  case 1:
                    return [2, e.sent()];
                }
              });
            });
          }),
          (e.prototype.createCampaignEvent = function (e) {
            var t,
              n,
              o = this,
              i = r(r({}, Z), e),
              a = Object.entries(i).reduce(function (e, t) {
                var n = u(t, 2),
                  i = n[0],
                  a = n[1];
                return (
                  e.setOnce("initial_".concat(i), a || o.initialEmptyValue),
                  a ? e.set(i, a) : e.unset(i)
                );
              }, new q()),
              s = {
                event_type: "Page View",
                event_properties: {
                  page_title:
                    ("undefined" != typeof document && document.title) || "",
                  page_location:
                    ("undefined" != typeof location && location.href) || "",
                  page_path:
                    ("undefined" != typeof location && location.pathname) || "",
                },
              };
            return r(
              r(
                {},
                ((t = a),
                r(r({}, n), {
                  event_type: j.IDENTIFY,
                  user_properties: t.getUserProperties(),
                }))
              ),
              this.trackPageViews && s
            );
          }),
          (e.prototype.send = function (e) {
            return l(this, void 0, void 0, function () {
              var t, n;
              return c(this, function (o) {
                switch (o.label) {
                  case 0:
                    return this.disabled ? [2] : [4, this.parser.parse()];
                  case 1:
                    return (t = o.sent()), [4, this.getCampaignFromStorage()];
                  case 2:
                    if (((n = o.sent()), !e)) {
                      if (!this.trackNewCampaigns || !this.isNewCampaign(t, n))
                        return [2];
                      this.onNewCampaign(t);
                    }
                    return [4, this.track(this.createCampaignEvent(t))];
                  case 3:
                    return o.sent(), [4, this.saveCampaignToStorage(t)];
                  case 4:
                    return o.sent(), [2];
                }
              });
            });
          }),
          e
        );
      })(),
      ne = function (e, t) {
        oe(e, t);
      },
      oe = function (e, t) {
        for (var n = 0; n < t.length; n++) {
          var o = t[n],
            i = o.name,
            a = o.args,
            r = o.resolve,
            s = e && e[i];
          if ("function" == typeof s) {
            var l = s.apply(e, a);
            "function" == typeof r && r(null == l ? void 0 : l.promise);
          }
        }
        return e;
      },
      ie = function (e) {
        return e && void 0 !== e._q;
      },
      ae = n(610),
      re = n.n(ae),
      se = function () {
        var e, t, n, o;
        if ("undefined" == typeof navigator) return "";
        var i = navigator.userLanguage;
        return null !==
          (o =
            null !==
              (n =
                null !==
                  (t =
                    null === (e = navigator.languages) || void 0 === e
                      ? void 0
                      : e[0]) && void 0 !== t
                  ? t
                  : navigator.language) && void 0 !== n
              ? n
              : i) && void 0 !== o
          ? o
          : "";
      },
      le = (function () {
        function e() {
          var e;
          (this.name = "context"),
            (this.type = g.BEFORE),
            (this.eventId = 0),
            (this.library = "amplitude-ts/".concat("1.5.8")),
            "undefined" != typeof navigator && (e = navigator.userAgent),
            (this.uaResult = new re.a(e).getResult());
        }
        return (
          (e.prototype.setup = function (e) {
            return (this.config = e), Promise.resolve(void 0);
          }),
          (e.prototype.execute = function (e) {
            return l(this, void 0, void 0, function () {
              var t, n, o, i, a;
              return c(this, function (s) {
                return (
                  this.isSessionValid() || (this.config.sessionId = Date.now()),
                  (this.config.lastEventTime = Date.now()),
                  (t = new Date().getTime()),
                  (n = this.uaResult.browser.name),
                  (o = this.uaResult.browser.version),
                  (i = this.uaResult.device.model || this.uaResult.os.name),
                  (a = this.uaResult.device.vendor),
                  [
                    2,
                    r(
                      r(
                        r(
                          r(
                            r(
                              r(
                                r(
                                  r(
                                    r(
                                      r(
                                        r(
                                          r(
                                            {
                                              user_id: this.config.userId,
                                              device_id: this.config.deviceId,
                                              session_id: this.config.sessionId,
                                              time: t,
                                            },
                                            this.config.appVersion && {
                                              app_version:
                                                this.config.appVersion,
                                            }
                                          ),
                                          this.config.trackingOptions
                                            .platform && { platform: "Web" }
                                        ),
                                        this.config.trackingOptions.osName && {
                                          os_name: n,
                                        }
                                      ),
                                      this.config.trackingOptions.osVersion && {
                                        os_version: o,
                                      }
                                    ),
                                    this.config.trackingOptions
                                      .deviceManufacturer && {
                                      device_manufacturer: a,
                                    }
                                  ),
                                  this.config.trackingOptions.deviceModel && {
                                    device_model: i,
                                  }
                                ),
                                this.config.trackingOptions.language && {
                                  language: se(),
                                }
                              ),
                              this.config.trackingOptions.ipAddress && {
                                ip: "$remote",
                              }
                            ),
                            {
                              insert_id: P(),
                              partner_id: this.config.partnerId,
                              plan: this.config.plan,
                            }
                          ),
                          this.config.ingestionMetadata && {
                            ingestion_metadata: {
                              source_name:
                                this.config.ingestionMetadata.sourceName,
                              source_version:
                                this.config.ingestionMetadata.sourceVersion,
                            },
                          }
                        ),
                        e
                      ),
                      { event_id: this.eventId++, library: this.library }
                    ),
                  ]
                );
              });
            });
          }),
          (e.prototype.isSessionValid = function () {
            var e = this.config.lastEventTime || Date.now();
            return Date.now() - e < this.config.sessionTimeout;
          }),
          e
        );
      })();
    !(function (e) {
      (e.XHR = "xhr"), (e.SendBeacon = "beacon"), (e.Fetch = "fetch");
    })(V || (V = {}));
    var ce,
      de = (function () {
        function e() {
          this.memoryStorage = new Map();
        }
        return (
          (e.prototype.isEnabled = function () {
            return l(this, void 0, void 0, function () {
              return c(this, function (e) {
                return [2, !0];
              });
            });
          }),
          (e.prototype.get = function (e) {
            return l(this, void 0, void 0, function () {
              return c(this, function (t) {
                return [2, this.memoryStorage.get(e)];
              });
            });
          }),
          (e.prototype.getRaw = function (e) {
            return l(this, void 0, void 0, function () {
              var t;
              return c(this, function (n) {
                switch (n.label) {
                  case 0:
                    return [4, this.get(e)];
                  case 1:
                    return [2, (t = n.sent()) ? JSON.stringify(t) : void 0];
                }
              });
            });
          }),
          (e.prototype.set = function (e, t) {
            return l(this, void 0, void 0, function () {
              return c(this, function (n) {
                return this.memoryStorage.set(e, t), [2];
              });
            });
          }),
          (e.prototype.remove = function (e) {
            return l(this, void 0, void 0, function () {
              return c(this, function (t) {
                return this.memoryStorage.delete(e), [2];
              });
            });
          }),
          (e.prototype.reset = function () {
            return l(this, void 0, void 0, function () {
              return c(this, function (e) {
                return this.memoryStorage.clear(), [2];
              });
            });
          }),
          e
        );
      })(),
      ue = (function () {
        function e(e, t) {
          (this.storage = e),
            (this.isSessionCacheValid = !0),
            (this.storageKey = Y(t)),
            (this.cache = { optOut: !1 });
        }
        return (
          (e.prototype.load = function () {
            var e;
            return l(this, void 0, void 0, function () {
              var t;
              return c(this, function (n) {
                switch (n.label) {
                  case 0:
                    return (t = this), [4, this.storage.get(this.storageKey)];
                  case 1:
                    return (
                      (t.cache =
                        null !== (e = n.sent()) && void 0 !== e
                          ? e
                          : { optOut: !1 }),
                      [2, this]
                    );
                }
              });
            });
          }),
          (e.prototype.setSession = function (e) {
            (this.cache = r(r({}, this.cache), e)),
              this.storage.set(this.storageKey, this.cache);
          }),
          (e.prototype.getSessionId = function () {
            var e = this;
            return (
              (this.isSessionCacheValid = !0),
              this.storage.get(this.storageKey).then(function (t) {
                e.isSessionCacheValid &&
                  (e.cache.sessionId = null == t ? void 0 : t.sessionId);
              }),
              this.cache.sessionId
            );
          }),
          (e.prototype.setSessionId = function (e) {
            (this.isSessionCacheValid = !1), this.setSession({ sessionId: e });
          }),
          (e.prototype.getDeviceId = function () {
            return this.cache.deviceId;
          }),
          (e.prototype.setDeviceId = function (e) {
            this.setSession({ deviceId: e });
          }),
          (e.prototype.getUserId = function () {
            return this.cache.userId;
          }),
          (e.prototype.setUserId = function (e) {
            this.setSession({ userId: e });
          }),
          (e.prototype.getLastEventTime = function () {
            return this.cache.lastEventTime;
          }),
          (e.prototype.setLastEventTime = function (e) {
            this.setSession({ lastEventTime: e });
          }),
          (e.prototype.getOptOut = function () {
            return this.cache.optOut;
          }),
          (e.prototype.setOptOut = function (e) {
            this.setSession({ optOut: e });
          }),
          e
        );
      })();
    !(function (e) {
      (e.Unknown = "unknown"),
        (e.Skipped = "skipped"),
        (e.Success = "success"),
        (e.RateLimit = "rate_limit"),
        (e.PayloadTooLarge = "payload_too_large"),
        (e.Invalid = "invalid"),
        (e.Failed = "failed"),
        (e.Timeout = "Timeout"),
        (e.SystemError = "SystemError");
    })(ce || (ce = {}));
    var pe = (function (e) {
        function t() {
          return (null !== e && e.apply(this, arguments)) || this;
        }
        return (
          a(t, e),
          (t.prototype.send = function (e, t) {
            return l(this, void 0, void 0, function () {
              var n, o;
              return c(this, function (i) {
                switch (i.label) {
                  case 0:
                    if ("undefined" == typeof fetch)
                      throw new Error("FetchTransport is not supported");
                    return (
                      (n = {
                        headers: {
                          "Content-Type": "application/json",
                          Accept: "*/*",
                        },
                        body: JSON.stringify(t),
                        method: "POST",
                      }),
                      [4, fetch(e, n)]
                    );
                  case 1:
                    return [4, i.sent().json()];
                  case 2:
                    return (o = i.sent()), [2, this.buildResponse(o)];
                }
              });
            });
          }),
          t
        );
      })(
        (function () {
          function e() {}
          return (
            (e.prototype.send = function (e, t) {
              return Promise.resolve(null);
            }),
            (e.prototype.buildResponse = function (e) {
              var t,
                n,
                o,
                i,
                a,
                r,
                s,
                l,
                c,
                d,
                u,
                p,
                g,
                h,
                f,
                m,
                y,
                v,
                _,
                b,
                w,
                C;
              if ("object" != typeof e) return null;
              var x = e.code || 0,
                S = this.buildStatus(x);
              switch (S) {
                case ce.Success:
                  return {
                    status: S,
                    statusCode: x,
                    body: {
                      eventsIngested:
                        null !== (t = e.events_ingested) && void 0 !== t
                          ? t
                          : 0,
                      payloadSizeBytes:
                        null !== (n = e.payload_size_bytes) && void 0 !== n
                          ? n
                          : 0,
                      serverUploadTime:
                        null !== (o = e.server_upload_time) && void 0 !== o
                          ? o
                          : 0,
                    },
                  };
                case ce.Invalid:
                  return {
                    status: S,
                    statusCode: x,
                    body: {
                      error: null !== (i = e.error) && void 0 !== i ? i : "",
                      missingField:
                        null !== (a = e.missing_field) && void 0 !== a ? a : "",
                      eventsWithInvalidFields:
                        null !== (r = e.events_with_invalid_fields) &&
                        void 0 !== r
                          ? r
                          : {},
                      eventsWithMissingFields:
                        null !== (s = e.events_with_missing_fields) &&
                        void 0 !== s
                          ? s
                          : {},
                      eventsWithInvalidIdLengths:
                        null !== (l = e.events_with_invalid_id_lengths) &&
                        void 0 !== l
                          ? l
                          : {},
                      epsThreshold:
                        null !== (c = e.eps_threshold) && void 0 !== c ? c : 0,
                      exceededDailyQuotaDevices:
                        null !== (d = e.exceeded_daily_quota_devices) &&
                        void 0 !== d
                          ? d
                          : {},
                      silencedDevices:
                        null !== (u = e.silenced_devices) && void 0 !== u
                          ? u
                          : [],
                      silencedEvents:
                        null !== (p = e.silenced_events) && void 0 !== p
                          ? p
                          : [],
                      throttledDevices:
                        null !== (g = e.throttled_devices) && void 0 !== g
                          ? g
                          : {},
                      throttledEvents:
                        null !== (h = e.throttled_events) && void 0 !== h
                          ? h
                          : [],
                    },
                  };
                case ce.PayloadTooLarge:
                  return {
                    status: S,
                    statusCode: x,
                    body: {
                      error: null !== (f = e.error) && void 0 !== f ? f : "",
                    },
                  };
                case ce.RateLimit:
                  return {
                    status: S,
                    statusCode: x,
                    body: {
                      error: null !== (m = e.error) && void 0 !== m ? m : "",
                      epsThreshold:
                        null !== (y = e.eps_threshold) && void 0 !== y ? y : 0,
                      throttledDevices:
                        null !== (v = e.throttled_devices) && void 0 !== v
                          ? v
                          : {},
                      throttledUsers:
                        null !== (_ = e.throttled_users) && void 0 !== _
                          ? _
                          : {},
                      exceededDailyQuotaDevices:
                        null !== (b = e.exceeded_daily_quota_devices) &&
                        void 0 !== b
                          ? b
                          : {},
                      exceededDailyQuotaUsers:
                        null !== (w = e.exceeded_daily_quota_users) &&
                        void 0 !== w
                          ? w
                          : {},
                      throttledEvents:
                        null !== (C = e.throttled_events) && void 0 !== C
                          ? C
                          : [],
                    },
                  };
                case ce.Timeout:
                default:
                  return { status: S, statusCode: x };
              }
            }),
            (e.prototype.buildStatus = function (e) {
              return e >= 200 && e < 300
                ? ce.Success
                : 429 === e
                ? ce.RateLimit
                : 413 === e
                ? ce.PayloadTooLarge
                : 408 === e
                ? ce.Timeout
                : e >= 400 && e < 500
                ? ce.Invalid
                : e >= 500
                ? ce.Failed
                : ce.Unknown;
            }),
            e
          );
        })()
      ),
      ge = (function () {
        function e(e) {
          this.options = r({}, e);
        }
        return (
          (e.prototype.isEnabled = function () {
            return l(this, void 0, void 0, function () {
              var t, n, o;
              return c(this, function (i) {
                switch (i.label) {
                  case 0:
                    if (!Object(X.a)()) return [2, !1];
                    (t = String(Date.now())),
                      (n = new e(this.options)),
                      (o = "AMP_TEST"),
                      (i.label = 1);
                  case 1:
                    return i.trys.push([1, 4, 5, 7]), [4, n.set(o, t)];
                  case 2:
                    return i.sent(), [4, n.get(o)];
                  case 3:
                    return [2, i.sent() === t];
                  case 4:
                    return i.sent(), [2, !1];
                  case 5:
                    return [4, n.remove(o)];
                  case 6:
                    return i.sent(), [7];
                  case 7:
                    return [2];
                }
              });
            });
          }),
          (e.prototype.get = function (e) {
            return l(this, void 0, void 0, function () {
              var t;
              return c(this, function (n) {
                switch (n.label) {
                  case 0:
                    return [4, this.getRaw(e)];
                  case 1:
                    if (!(t = n.sent())) return [2, void 0];
                    try {
                      try {
                        t = decodeURIComponent(atob(t));
                      } catch (e) {}
                      return [2, JSON.parse(t)];
                    } catch (e) {
                      return [2, void 0];
                    }
                    return [2];
                }
              });
            });
          }),
          (e.prototype.getRaw = function (e) {
            var t;
            return l(this, void 0, void 0, function () {
              var n, o, i;
              return c(this, function (a) {
                return (
                  (n = Object(X.a)()),
                  (o =
                    null !==
                      (t =
                        null == n ? void 0 : n.document.cookie.split("; ")) &&
                    void 0 !== t
                      ? t
                      : []),
                  (i = o.find(function (t) {
                    return 0 === t.indexOf(e + "=");
                  }))
                    ? [2, i.substring(e.length + 1)]
                    : [2, void 0]
                );
              });
            });
          }),
          (e.prototype.set = function (e, t) {
            var n;
            return l(this, void 0, void 0, function () {
              var o, i, a, r, s, l;
              return c(this, function (c) {
                try {
                  (o =
                    null !== (n = this.options.expirationDays) && void 0 !== n
                      ? n
                      : 0),
                    (a = void 0),
                    (i = null !== t ? o : -1) &&
                      ((r = new Date()).setTime(
                        r.getTime() + 24 * i * 60 * 60 * 1e3
                      ),
                      (a = r)),
                    (s = ""
                      .concat(e, "=")
                      .concat(btoa(encodeURIComponent(JSON.stringify(t))))),
                    a && (s += "; expires=".concat(a.toUTCString())),
                    (s += "; path=/"),
                    this.options.domain &&
                      (s += "; domain=".concat(this.options.domain)),
                    this.options.secure && (s += "; Secure"),
                    this.options.sameSite &&
                      (s += "; SameSite=".concat(this.options.sameSite)),
                    (l = Object(X.a)()) && (l.document.cookie = s);
                } catch (e) {}
                return [2];
              });
            });
          }),
          (e.prototype.remove = function (e) {
            return l(this, void 0, void 0, function () {
              return c(this, function (t) {
                switch (t.label) {
                  case 0:
                    return [4, this.set(e, null)];
                  case 1:
                    return t.sent(), [2];
                }
              });
            });
          }),
          (e.prototype.reset = function () {
            return l(this, void 0, void 0, function () {
              return c(this, function (e) {
                return [2];
              });
            });
          }),
          e
        );
      })(),
      he = (function () {
        function e() {}
        return (
          (e.prototype.isEnabled = function () {
            return l(this, void 0, void 0, function () {
              var t, n, o;
              return c(this, function (i) {
                switch (i.label) {
                  case 0:
                    if (!Object(X.a)()) return [2, !1];
                    (t = String(Date.now())),
                      (n = new e()),
                      (o = "AMP_TEST"),
                      (i.label = 1);
                  case 1:
                    return i.trys.push([1, 4, 5, 7]), [4, n.set(o, t)];
                  case 2:
                    return i.sent(), [4, n.get(o)];
                  case 3:
                    return [2, i.sent() === t];
                  case 4:
                    return i.sent(), [2, !1];
                  case 5:
                    return [4, n.remove(o)];
                  case 6:
                    return i.sent(), [7];
                  case 7:
                    return [2];
                }
              });
            });
          }),
          (e.prototype.get = function (e) {
            return l(this, void 0, void 0, function () {
              var t;
              return c(this, function (n) {
                switch (n.label) {
                  case 0:
                    return n.trys.push([0, 2, , 3]), [4, this.getRaw(e)];
                  case 1:
                    return (t = n.sent()) ? [2, JSON.parse(t)] : [2, void 0];
                  case 2:
                    return n.sent(), [2, void 0];
                  case 3:
                    return [2];
                }
              });
            });
          }),
          (e.prototype.getRaw = function (e) {
            var t;
            return l(this, void 0, void 0, function () {
              return c(this, function (n) {
                return [
                  2,
                  (null === (t = Object(X.a)()) || void 0 === t
                    ? void 0
                    : t.localStorage.getItem(e)) || void 0,
                ];
              });
            });
          }),
          (e.prototype.set = function (e, t) {
            var n;
            return l(this, void 0, void 0, function () {
              return c(this, function (o) {
                try {
                  null === (n = Object(X.a)()) ||
                    void 0 === n ||
                    n.localStorage.setItem(e, JSON.stringify(t));
                } catch (e) {}
                return [2];
              });
            });
          }),
          (e.prototype.remove = function (e) {
            var t;
            return l(this, void 0, void 0, function () {
              return c(this, function (n) {
                try {
                  null === (t = Object(X.a)()) ||
                    void 0 === t ||
                    t.localStorage.removeItem(e);
                } catch (e) {}
                return [2];
              });
            });
          }),
          (e.prototype.reset = function () {
            var e;
            return l(this, void 0, void 0, function () {
              return c(this, function (t) {
                try {
                  null === (e = Object(X.a)()) ||
                    void 0 === e ||
                    e.localStorage.clear();
                } catch (e) {}
                return [2];
              });
            });
          }),
          e
        );
      })(),
      fe = (function () {
        function e() {}
        return (
          (e.prototype.send = function (e, t) {
            return Promise.resolve(null);
          }),
          (e.prototype.buildResponse = function (e) {
            var t,
              n,
              o,
              i,
              a,
              r,
              s,
              l,
              c,
              d,
              u,
              p,
              g,
              f,
              m,
              y,
              v,
              _,
              b,
              w,
              C,
              x;
            if ("object" != typeof e) return null;
            var S = e.code || 0,
              E = this.buildStatus(S);
            switch (E) {
              case h.Success:
                return {
                  status: E,
                  statusCode: S,
                  body: {
                    eventsIngested:
                      null !== (t = e.events_ingested) && void 0 !== t ? t : 0,
                    payloadSizeBytes:
                      null !== (n = e.payload_size_bytes) && void 0 !== n
                        ? n
                        : 0,
                    serverUploadTime:
                      null !== (o = e.server_upload_time) && void 0 !== o
                        ? o
                        : 0,
                  },
                };
              case h.Invalid:
                return {
                  status: E,
                  statusCode: S,
                  body: {
                    error: null !== (i = e.error) && void 0 !== i ? i : "",
                    missingField:
                      null !== (a = e.missing_field) && void 0 !== a ? a : "",
                    eventsWithInvalidFields:
                      null !== (r = e.events_with_invalid_fields) &&
                      void 0 !== r
                        ? r
                        : {},
                    eventsWithMissingFields:
                      null !== (s = e.events_with_missing_fields) &&
                      void 0 !== s
                        ? s
                        : {},
                    eventsWithInvalidIdLengths:
                      null !== (l = e.events_with_invalid_id_lengths) &&
                      void 0 !== l
                        ? l
                        : {},
                    epsThreshold:
                      null !== (c = e.eps_threshold) && void 0 !== c ? c : 0,
                    exceededDailyQuotaDevices:
                      null !== (d = e.exceeded_daily_quota_devices) &&
                      void 0 !== d
                        ? d
                        : {},
                    silencedDevices:
                      null !== (u = e.silenced_devices) && void 0 !== u
                        ? u
                        : [],
                    silencedEvents:
                      null !== (p = e.silenced_events) && void 0 !== p ? p : [],
                    throttledDevices:
                      null !== (g = e.throttled_devices) && void 0 !== g
                        ? g
                        : {},
                    throttledEvents:
                      null !== (f = e.throttled_events) && void 0 !== f
                        ? f
                        : [],
                  },
                };
              case h.PayloadTooLarge:
                return {
                  status: E,
                  statusCode: S,
                  body: {
                    error: null !== (m = e.error) && void 0 !== m ? m : "",
                  },
                };
              case h.RateLimit:
                return {
                  status: E,
                  statusCode: S,
                  body: {
                    error: null !== (y = e.error) && void 0 !== y ? y : "",
                    epsThreshold:
                      null !== (v = e.eps_threshold) && void 0 !== v ? v : 0,
                    throttledDevices:
                      null !== (_ = e.throttled_devices) && void 0 !== _
                        ? _
                        : {},
                    throttledUsers:
                      null !== (b = e.throttled_users) && void 0 !== b ? b : {},
                    exceededDailyQuotaDevices:
                      null !== (w = e.exceeded_daily_quota_devices) &&
                      void 0 !== w
                        ? w
                        : {},
                    exceededDailyQuotaUsers:
                      null !== (C = e.exceeded_daily_quota_users) &&
                      void 0 !== C
                        ? C
                        : {},
                    throttledEvents:
                      null !== (x = e.throttled_events) && void 0 !== x
                        ? x
                        : [],
                  },
                };
              case h.Timeout:
              default:
                return { status: E, statusCode: S };
            }
          }),
          (e.prototype.buildStatus = function (e) {
            return e >= 200 && e < 300
              ? h.Success
              : 429 === e
              ? h.RateLimit
              : 413 === e
              ? h.PayloadTooLarge
              : 408 === e
              ? h.Timeout
              : e >= 400 && e < 500
              ? h.Invalid
              : e >= 500
              ? h.Failed
              : h.Unknown;
          }),
          e
        );
      })(),
      me = (function (e) {
        function t() {
          var t = (null !== e && e.apply(this, arguments)) || this;
          return (t.state = { done: 4 }), t;
        }
        return (
          a(t, e),
          (t.prototype.send = function (e, t) {
            return l(this, void 0, void 0, function () {
              var n = this;
              return c(this, function (o) {
                return [
                  2,
                  new Promise(function (o, i) {
                    "undefined" == typeof XMLHttpRequest &&
                      i(new Error("XHRTransport is not supported."));
                    var a = new XMLHttpRequest();
                    a.open("POST", e, !0),
                      (a.onreadystatechange = function () {
                        if (a.readyState === n.state.done)
                          try {
                            var e = a.responseText,
                              t = JSON.parse(e),
                              r = n.buildResponse(t);
                            o(r);
                          } catch (e) {
                            i(e);
                          }
                      }),
                      a.setRequestHeader("Content-Type", "application/json"),
                      a.setRequestHeader("Accept", "*/*"),
                      a.send(JSON.stringify(t));
                  }),
                ];
              });
            });
          }),
          t
        );
      })(fe),
      ye = (function (e) {
        function t() {
          return (null !== e && e.apply(this, arguments)) || this;
        }
        return (
          a(t, e),
          (t.prototype.send = function (e, t) {
            return l(this, void 0, void 0, function () {
              var n = this;
              return c(this, function (o) {
                return [
                  2,
                  new Promise(function (o, i) {
                    var a = Object(X.a)();
                    if (!(null == a ? void 0 : a.navigator.sendBeacon))
                      throw new Error("SendBeaconTransport is not supported");
                    try {
                      var r = JSON.stringify(t);
                      return o(
                        a.navigator.sendBeacon(e, JSON.stringify(t))
                          ? n.buildResponse({
                              code: 200,
                              events_ingested: t.events.length,
                              payload_size_bytes: r.length,
                              server_upload_time: Date.now(),
                            })
                          : n.buildResponse({ code: 500 })
                      );
                    } catch (e) {
                      i(e);
                    }
                  }),
                ];
              });
            });
          }),
          t
        );
      })(fe),
      ve = function () {
        var e = new de();
        return {
          cookieExpiration: 365,
          cookieSameSite: "Lax",
          cookieSecure: !1,
          cookieStorage: e,
          disableCookies: !1,
          domain: "",
          sessionManager: new ue(e, ""),
          sessionTimeout: 18e5,
          storageProvider: new de(),
          trackingOptions: {
            deviceManufacturer: !0,
            deviceModel: !0,
            ipAddress: !0,
            language: !0,
            osName: !0,
            osVersion: !0,
            platform: !0,
          },
          transportProvider: new pe(),
        };
      },
      _e = (function (e) {
        function t(t, n, o) {
          var i,
            a,
            s,
            l,
            c,
            d,
            u,
            p,
            g,
            h,
            f,
            m,
            y = this,
            v = ve();
          return (
            ((y =
              e.call(
                this,
                r(
                  r(
                    {
                      flushIntervalMillis: 1e3,
                      flushMaxRetries: 5,
                      flushQueueSize: 30,
                    },
                    o
                  ),
                  {
                    apiKey: t,
                    storageProvider:
                      null !== (i = null == o ? void 0 : o.storageProvider) &&
                      void 0 !== i
                        ? i
                        : v.storageProvider,
                    transportProvider:
                      null !== (a = null == o ? void 0 : o.transportProvider) &&
                      void 0 !== a
                        ? a
                        : v.transportProvider,
                  }
                )
              ) || this).cookieStorage =
              null !== (s = null == o ? void 0 : o.cookieStorage) &&
              void 0 !== s
                ? s
                : v.cookieStorage),
            (y.sessionManager =
              null !== (l = null == o ? void 0 : o.sessionManager) &&
              void 0 !== l
                ? l
                : v.sessionManager),
            (y.sessionTimeout =
              null !== (c = null == o ? void 0 : o.sessionTimeout) &&
              void 0 !== c
                ? c
                : v.sessionTimeout),
            (y.appVersion = null == o ? void 0 : o.appVersion),
            (y.attribution = null == o ? void 0 : o.attribution),
            (y.cookieExpiration =
              null !== (d = null == o ? void 0 : o.cookieExpiration) &&
              void 0 !== d
                ? d
                : v.cookieExpiration),
            (y.cookieSameSite =
              null !== (u = null == o ? void 0 : o.cookieSameSite) &&
              void 0 !== u
                ? u
                : v.cookieSameSite),
            (y.cookieSecure =
              null !== (p = null == o ? void 0 : o.cookieSecure) && void 0 !== p
                ? p
                : v.cookieSecure),
            (y.deviceId = null == o ? void 0 : o.deviceId),
            (y.disableCookies =
              null !== (g = null == o ? void 0 : o.disableCookies) &&
              void 0 !== g
                ? g
                : v.disableCookies),
            (y.domain =
              null !== (h = null == o ? void 0 : o.domain) && void 0 !== h
                ? h
                : v.domain),
            (y.lastEventTime =
              null !== (f = y.lastEventTime) && void 0 !== f
                ? f
                : null == o
                ? void 0
                : o.lastEventTime),
            (y.optOut = Boolean(null == o ? void 0 : o.optOut)),
            (y.partnerId = null == o ? void 0 : o.partnerId),
            (y.sessionId = null == o ? void 0 : o.sessionId),
            (y.trackingOptions =
              null !== (m = null == o ? void 0 : o.trackingOptions) &&
              void 0 !== m
                ? m
                : v.trackingOptions),
            (y.userId = n),
            y
          );
        }
        return (
          a(t, e),
          Object.defineProperty(t.prototype, "deviceId", {
            get: function () {
              return this.sessionManager.getDeviceId();
            },
            set: function (e) {
              this.sessionManager.setDeviceId(e);
            },
            enumerable: !1,
            configurable: !0,
          }),
          Object.defineProperty(t.prototype, "userId", {
            get: function () {
              return this.sessionManager.getUserId();
            },
            set: function (e) {
              this.sessionManager.setUserId(e);
            },
            enumerable: !1,
            configurable: !0,
          }),
          Object.defineProperty(t.prototype, "sessionId", {
            get: function () {
              return this.sessionManager.getSessionId();
            },
            set: function (e) {
              this.sessionManager.setSessionId(e);
            },
            enumerable: !1,
            configurable: !0,
          }),
          Object.defineProperty(t.prototype, "optOut", {
            get: function () {
              return this.sessionManager.getOptOut();
            },
            set: function (e) {
              var t;
              null === (t = this.sessionManager) ||
                void 0 === t ||
                t.setOptOut(Boolean(e));
            },
            enumerable: !1,
            configurable: !0,
          }),
          Object.defineProperty(t.prototype, "lastEventTime", {
            get: function () {
              return this.sessionManager.getLastEventTime();
            },
            set: function (e) {
              this.sessionManager.setLastEventTime(e);
            },
            enumerable: !1,
            configurable: !0,
          }),
          t
        );
      })(E),
      be = function (e, t, n) {
        return l(void 0, void 0, void 0, function () {
          var o, i, a, s, l, d, u, p, g, h, f, m, y, v, _, b, w;
          return c(this, function (c) {
            switch (c.label) {
              case 0:
                return (
                  (o = ve()),
                  null === (y = null == n ? void 0 : n.domain) || void 0 === y
                    ? [3, 1]
                    : ((a = y), [3, 3])
                );
              case 1:
                return [4, Ae()];
              case 2:
                (a = c.sent()), (c.label = 3);
              case 3:
                return (i = a), [4, we(r(r({}, n), { domain: i }))];
              case 4:
                return (s = c.sent()), (l = Y(e)), [4, s.get(l)];
              case 5:
                return (d = c.sent()), (u = Q()), [4, new ue(s, e).load()];
              case 6:
                return (
                  (p = c.sent()),
                  (g = _e.bind),
                  (h = [
                    void 0,
                    e,
                    null != t ? t : null == d ? void 0 : d.userId,
                  ]),
                  (f = [r({}, n)]),
                  (m = {
                    cookieStorage: s,
                    sessionManager: p,
                    deviceId: Se(
                      null == d ? void 0 : d.deviceId,
                      null == n ? void 0 : n.deviceId,
                      u.deviceId
                    ),
                    domain: i,
                    optOut:
                      null !== (v = null == n ? void 0 : n.optOut) &&
                      void 0 !== v
                        ? v
                        : Boolean(null == d ? void 0 : d.optOut),
                  }),
                  [4, s.get(l)]
                );
              case 7:
                return (
                  (m.sessionId =
                    null !==
                      (b =
                        null === (_ = c.sent()) || void 0 === _
                          ? void 0
                          : _.sessionId) && void 0 !== b
                      ? b
                      : null == n
                      ? void 0
                      : n.sessionId),
                  [4, xe(n)]
                );
              case 8:
                return [
                  2,
                  new (g.apply(
                    _e,
                    h.concat([
                      r.apply(
                        void 0,
                        f.concat([
                          ((m.storageProvider = c.sent()),
                          (m.trackingOptions = r(
                            r({}, o.trackingOptions),
                            null == n ? void 0 : n.trackingOptions
                          )),
                          (m.transportProvider =
                            null !==
                              (w = null == n ? void 0 : n.transportProvider) &&
                            void 0 !== w
                              ? w
                              : Ee(null == n ? void 0 : n.transport)),
                          m),
                        ])
                      ),
                    ])
                  ))(),
                ];
            }
          });
        });
      },
      we = function (e, t) {
        return (
          void 0 === t && (t = ve()),
          l(void 0, void 0, void 0, function () {
            var n, o, i;
            return c(this, function (a) {
              switch (a.label) {
                case 0:
                  return (
                    (n = r(r({}, t), e)),
                    (o = null == e ? void 0 : e.cookieStorage),
                    (i = !o) ? [3, 2] : [4, o.isEnabled()]
                  );
                case 1:
                  (i = !a.sent()), (a.label = 2);
                case 2:
                  return i ? [2, Ce(n)] : [2, o];
              }
            });
          })
        );
      },
      Ce = function (e) {
        return l(void 0, void 0, void 0, function () {
          var t, n;
          return c(this, function (o) {
            switch (o.label) {
              case 0:
                return (
                  (t = new ge({
                    domain: e.domain,
                    expirationDays: e.cookieExpiration,
                    sameSite: e.cookieSameSite,
                    secure: e.cookieSecure,
                  })),
                  (n = e.disableCookies) ? [3, 2] : [4, t.isEnabled()]
                );
              case 1:
                (n = !o.sent()), (o.label = 2);
              case 2:
                return n ? [4, (t = new he()).isEnabled()] : [3, 4];
              case 3:
                o.sent() || (t = new de()), (o.label = 4);
              case 4:
                return [2, t];
            }
          });
        });
      },
      xe = function (e) {
        return l(void 0, void 0, void 0, function () {
          var t, n, o, i, a, r, s;
          return c(this, function (l) {
            switch (l.label) {
              case 0:
                if (
                  e &&
                  Object.prototype.hasOwnProperty.call(e, "storageProvider") &&
                  !e.storageProvider
                )
                  return [3, 9];
                l.label = 1;
              case 1:
                l.trys.push([1, 7, 8, 9]),
                  (t = d([null == e ? void 0 : e.storageProvider, new he()])),
                  (n = t.next()),
                  (l.label = 2);
              case 2:
                return n.done
                  ? [3, 6]
                  : ((o = n.value), (i = o) ? [4, o.isEnabled()] : [3, 4]);
              case 3:
                (i = l.sent()), (l.label = 4);
              case 4:
                if (i) return [2, o];
                l.label = 5;
              case 5:
                return (n = t.next()), [3, 2];
              case 6:
                return [3, 9];
              case 7:
                return (a = l.sent()), (r = { error: a }), [3, 9];
              case 8:
                try {
                  n && !n.done && (s = t.return) && s.call(t);
                } finally {
                  if (r) throw r.error;
                }
                return [7];
              case 9:
                return [2, void 0];
            }
          });
        });
      },
      Se = function (e, t, n) {
        return t || n || e || P();
      },
      Ee = function (e) {
        return e === V.XHR
          ? new me()
          : e === V.SendBeacon
          ? new ye()
          : ve().transportProvider;
      },
      Ae = function (e) {
        return l(void 0, void 0, void 0, function () {
          var t, n, o, i, a, r, s;
          return c(this, function (l) {
            switch (l.label) {
              case 0:
                return [4, new ge().isEnabled()];
              case 1:
                if (!l.sent() || (!e && "undefined" == typeof location))
                  return [2, ""];
                for (
                  t = null != e ? e : location.hostname,
                    n = t.split("."),
                    o = [],
                    i = "AMP_TLDTEST",
                    a = n.length - 2;
                  a >= 0;
                  --a
                )
                  o.push(n.slice(a).join("."));
                (a = 0), (l.label = 2);
              case 2:
                return a < o.length
                  ? ((r = o[a]),
                    [4, (s = new ge({ domain: "." + r })).set(i, 1)])
                  : [3, 7];
              case 3:
                return l.sent(), [4, s.get(i)];
              case 4:
                return l.sent() ? [4, s.remove(i)] : [3, 6];
              case 5:
                return l.sent(), [2, "." + r];
              case 6:
                return a++, [3, 2];
              case 7:
                return [2, ""];
            }
          });
        });
      },
      Te = function (e, t) {
        return l(void 0, void 0, void 0, function () {
          var n, o, i, a, r, s, l, d, p;
          return c(this, function (c) {
            switch (c.label) {
              case 0:
                return [4, (n = new ge()).isEnabled()];
              case 1:
                return (
                  (c.sent() && !(null == t ? void 0 : t.disableCookies)) ||
                    (n = new he()),
                  [4, n.isEnabled()]
                );
              case 2:
                return c.sent()
                  ? ((o = (function (e) {
                      return ""
                        .concat(H.toLowerCase(), "_")
                        .concat(e.substring(0, 6));
                    })(e)),
                    [4, n.getRaw(o)])
                  : [2, { optOut: !1 }];
              case 3:
                return (i = c.sent()) ? [4, n.remove(o)] : [2, { optOut: !1 }];
              case 4:
                return (
                  c.sent(),
                  (a = u(i.split("."), 5)),
                  (r = a[0]),
                  (s = a[1]),
                  (l = a[2]),
                  (d = a[3]),
                  (p = a[4]),
                  [
                    2,
                    {
                      deviceId: r,
                      userId: Pe(s),
                      sessionId: Ge(d),
                      lastEventTime: Ge(p),
                      optOut: Boolean(l),
                    },
                  ]
                );
            }
          });
        });
      },
      Ge = function (e) {
        var t = parseInt(e, 32);
        if (!isNaN(t)) return t;
      },
      Pe = function (e) {
        if (atob && escape && e)
          try {
            return decodeURIComponent(escape(atob(e)));
          } catch (e) {
            return;
          }
      },
      De = (function (e) {
        function t() {
          return (null !== e && e.apply(this, arguments)) || this;
        }
        return (
          a(t, e),
          (t.prototype.init = function (t, n, o) {
            var i, a, s;
            return (
              void 0 === t && (t = ""),
              l(this, void 0, void 0, function () {
                var l,
                  d,
                  u,
                  p,
                  g = this;
                return c(this, function (c) {
                  switch (c.label) {
                    case 0:
                      return this.initializing
                        ? [2]
                        : ((this.initializing = !0), [4, Te(t, o)]);
                    case 1:
                      return (
                        (l = c.sent()),
                        [
                          4,
                          be(
                            t,
                            n || l.userId,
                            r(r({}, o), {
                              deviceId:
                                null !== (i = l.deviceId) && void 0 !== i
                                  ? i
                                  : null == o
                                  ? void 0
                                  : o.deviceId,
                              sessionId:
                                null !== (a = l.sessionId) && void 0 !== a
                                  ? a
                                  : null == o
                                  ? void 0
                                  : o.sessionId,
                              optOut:
                                null !== (s = null == o ? void 0 : o.optOut) &&
                                void 0 !== s
                                  ? s
                                  : l.optOut,
                              lastEventTime: l.lastEventTime,
                            })
                          ),
                        ]
                      );
                    case 2:
                      return (
                        (d = c.sent()), [4, e.prototype._init.call(this, d)]
                      );
                    case 3:
                      return (
                        c.sent(),
                        (u = !this.config.lastEventTime),
                        (!this.config.sessionId ||
                          (this.config.lastEventTime &&
                            Date.now() - this.config.lastEventTime >
                              this.config.sessionTimeout)) &&
                          (this.setSessionId(Date.now()), (u = !0)),
                        (p = B()).eventBridge.setEventReceiver(function (e) {
                          g.track(e.eventType, e.eventProperties);
                        }),
                        p.identityStore.setIdentity({
                          userId: this.config.userId,
                          deviceId: this.config.deviceId,
                        }),
                        [4, this.add(new le())]
                      );
                    case 4:
                      return c.sent(), [4, this.add(new K())];
                    case 5:
                      return c.sent(), [4, this.add(new G())];
                    case 6:
                      return (
                        c.sent(),
                        (this.initializing = !1),
                        [4, this.runAttributionStrategy(d.attribution, u)]
                      );
                    case 7:
                      return (
                        c.sent(), [4, this.runQueuedFunctions("dispatchQ")]
                      );
                    case 8:
                      return c.sent(), [2];
                  }
                });
              })
            );
          }),
          (t.prototype.runAttributionStrategy = function (e, t) {
            return (
              void 0 === t && (t = !1),
              l(this, void 0, void 0, function () {
                var n, o, i;
                return c(this, function (a) {
                  switch (a.label) {
                    case 0:
                      return (
                        (n = this.track.bind(this)),
                        (o = this.setSessionId.bind(this, Date.now())),
                        [4, Ce(this.config)]
                      );
                    case 1:
                      return (
                        (i = a.sent()),
                        [
                          4,
                          new te(
                            this.config.apiKey,
                            r(r({}, e), {
                              storage: i,
                              track: n,
                              onNewCampaign: o,
                            })
                          ).send(t),
                        ]
                      );
                    case 2:
                      return a.sent(), [2];
                  }
                });
              })
            );
          }),
          (t.prototype.getUserId = function () {
            var e;
            return null === (e = this.config) || void 0 === e
              ? void 0
              : e.userId;
          }),
          (t.prototype.setUserId = function (e) {
            this.config
              ? (this.config.userId = e)
              : this.q.push(this.setUserId.bind(this, e));
          }),
          (t.prototype.getDeviceId = function () {
            var e;
            return null === (e = this.config) || void 0 === e
              ? void 0
              : e.deviceId;
          }),
          (t.prototype.setDeviceId = function (e) {
            this.config
              ? (this.config.deviceId = e)
              : this.q.push(this.setDeviceId.bind(this, e));
          }),
          (t.prototype.reset = function () {
            this.setUserId(void 0), this.setDeviceId(P());
          }),
          (t.prototype.getSessionId = function () {
            var e;
            return null === (e = this.config) || void 0 === e
              ? void 0
              : e.sessionId;
          }),
          (t.prototype.setSessionId = function (e) {
            this.config
              ? ((this.config.sessionId = e),
                (this.config.lastEventTime = void 0))
              : this.q.push(this.setSessionId.bind(this, e));
          }),
          (t.prototype.setTransport = function (e) {
            this.config
              ? (this.config.transportProvider = Ee(e))
              : this.q.push(this.setTransport.bind(this, e));
          }),
          (t.prototype.identify = function (t, n) {
            if (ie(t)) {
              var o = t._q;
              (t._q = []), (t = oe(new k(), o));
            }
            return (
              (null == n ? void 0 : n.user_id) && this.setUserId(n.user_id),
              (null == n ? void 0 : n.device_id) &&
                this.setDeviceId(n.device_id),
              e.prototype.identify.call(this, t, n)
            );
          }),
          (t.prototype.groupIdentify = function (t, n, o, i) {
            if (ie(o)) {
              var a = o._q;
              (o._q = []), (o = oe(new k(), a));
            }
            return e.prototype.groupIdentify.call(this, t, n, o, i);
          }),
          (t.prototype.revenue = function (t, n) {
            if (ie(t)) {
              var o = t._q;
              (t._q = []), (t = oe(new O(), o));
            }
            return e.prototype.revenue.call(this, t, n);
          }),
          t
        );
      })(R),
      Le = function () {
        var e = new De();
        return {
          init: M(e.init.bind(e)),
          add: M(e.add.bind(e)),
          remove: M(e.remove.bind(e)),
          track: M(e.track.bind(e)),
          logEvent: M(e.logEvent.bind(e)),
          identify: M(e.identify.bind(e)),
          groupIdentify: M(e.groupIdentify.bind(e)),
          setGroup: M(e.setGroup.bind(e)),
          revenue: M(e.revenue.bind(e)),
          flush: M(e.flush.bind(e)),
          getUserId: e.getUserId.bind(e),
          setUserId: e.setUserId.bind(e),
          getDeviceId: e.getDeviceId.bind(e),
          setDeviceId: e.setDeviceId.bind(e),
          reset: e.reset.bind(e),
          getSessionId: e.getSessionId.bind(e),
          setSessionId: e.setSessionId.bind(e),
          setOptOut: e.setOptOut.bind(e),
          setTransport: e.setTransport.bind(e),
        };
      },
      Ie = Le(),
      ke = Ie.add,
      Oe = Ie.flush,
      Fe = Ie.getDeviceId,
      Re = Ie.getSessionId,
      Me = Ie.getUserId,
      Ne = Ie.groupIdentify,
      Be = Ie.identify,
      Ue = Ie.init,
      $e = Ie.logEvent,
      je = Ie.remove,
      Ke = Ie.reset,
      Ve = Ie.revenue,
      He = Ie.setDeviceId,
      We = Ie.setGroup,
      ze = Ie.setOptOut,
      qe = Ie.setSessionId,
      Ye = Ie.setTransport,
      Xe = Ie.setUserId,
      Qe = Ie.track;
  }