/**
 * Webpack Module #40
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(91), n(842);
    var o = n(16);
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t._cloneChildrenIntoReceiver = E),
      (t._mergeChildren = x),
      (t._mergePath = C),
      (t._mergeProperties = b),
      (t._mergeStyle = w),
      (t._removeDeletedChildren = S),
      (t._tryAndCatch = void 0),
      (t._updateCommonChildren = A),
      (t.areNodePropertiesDifferent = y),
      (t.base64StringToString = function (e) {
        let t;
        try {
          t = f(l.toByteArray(e));
        } catch (e) {
          t = "";
        }
        return t;
      }),
      (t.base64URLSafeEncode = function (e) {
        return (0, r.trim)((0, r.encode)(e));
      }),
      (t.blockChanges = function (e, t, n, o) {
        n && n.startBlockReferenceChanges();
        o && o.beginUpdate();
        e && e._beginSelectionUpdate();
        t &&
          t.forEach((e) => {
            e.beginUpdate();
          });
      }),
      (t.buildDialogDocumentHasUpdates = function (e, t, n, o) {
        return c.custom({
          subtitle: i.GLocale.get(
            new i.GLocaleKey("GSaveAction", "has-new-version-when-save-message")
          ),
          className: "g-has-updates-warning-dialog",
          icon: "info",
          closeable: !1,
          buttons: [
            {
              label: i.GLocale.get(
                new i.GLocaleKey("GCommonNames", "text.cancel")
              ),
              closeOnClick: !0,
              shortcut: c.Shortcut.Esc,
              position: "left",
              onclick: () => {
                o && o.call(this, e);
              },
            },
            {
              label: i.GLocale.get(
                new i.GLocaleKey(
                  "GSaveAction",
                  "has-new-version-when-save-reload"
                )
              ),
              closeOnClick: !0,
              onclick: () => {
                gDesigner.getToolbar()._updateActions(), t.call(this, e);
              },
            },
            {
              label: i.GLocale.get(
                new i.GLocaleKey(
                  "GSaveAction",
                  "has-new-version-when-save-save"
                )
              ),
              className: "primary",
              closeOnClick: !0,
              shortcut: c.Shortcut.Enter,
              onclick: () => {
                n.call(this, e);
              },
            },
          ],
        });
      }),
      (t.chaining = void 0),
      (t.debounce = function (e, t) {
        let n;
        return function () {
          const o = arguments;
          let i = () => {
            (n = 0), e.apply(this, o);
          };
          n && clearTimeout(n), (n = setTimeout(i, t));
        };
      }),
      (t.decodeFromUTF8 = f),
      (t.decodeHTML = function (e) {
        return $("<textarea/>").html(e).text();
      }),
      (t.decrypt = function (e) {
        try {
          var t = e.split(":"),
            n = t.shift(),
            o = s.enc.Hex.parse(n),
            i = t.join(":");
          return s.AES.decrypt(i, g, {
            iv: o,
            format: s.format.OpenSSL,
            mode: s.mode.CBC,
          }).toString(s.enc.Utf8);
        } catch (e) {
          return;
        }
      }),
      (t.encodeToUTF8 = m),
      (t.encrypt = function (e) {
        try {
          var t = s.lib.WordArray.random(32),
            n = s.AES.encrypt(e, g, {
              iv: t,
              format: s.format.OpenSSL,
              mode: s.mode.CBC,
            });
          return t.toString(s.enc.Hex) + ":" + n.toString();
        } catch (e) {
          return;
        }
      }),
      (t.fakeFunction = function () {}),
      (t.getAnnotationType = function (e) {
        let t = e
          .toString()
          .match(
            /\[G((?:[\0-\t\x0B\f\x0E-\u2027\u202A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)Annotation\]/
          );
        return (t && t[1]) || null;
      }),
      (t.getExtensionFromString = function (e, t) {
        var n = new RegExp("\\b" + t.join("|") + "\\b", "gim"),
          o = e.match(n);
        return o ? o[0] : null;
      }),
      (t.getFileNameWithoutExtension = function (e, t) {
        e.toLowerCase().endsWith(".".concat(t).toLowerCase()) &&
          (e = e.substr(0, e.lastIndexOf(".")));
        return e;
      }),
      (t.getFileSHA256Digest = async function (e) {
        e instanceof Blob
          ? (e = await e.arrayBuffer())
          : "string" == typeof e && (e = m(e));
        return s
          .SHA256(
            (function (e) {
              for (
                var t = new Uint8Array(e), n = [], o = 0;
                o < t.length;
                o += 4
              )
                n.push(
                  (t[o] << 24) | (t[o + 1] << 16) | (t[o + 2] << 8) | t[o + 3]
                );
              return s.lib.WordArray.create(n, t.length);
            })(e)
          )
          .toString();
      }),
      (t.getFileStateAndRole = function (e, t) {
        let n,
          o =
            arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
        const i = t.getPrivateShareList();
        i.forEach((t) => {
          const {
            id: i,
            copy: a,
            inspect: r,
            comment: s,
            owner: l,
            access: c,
            edit: p,
          } = t;
          e.getUID() === i
            ? ((n = d.makeFromShare(t)),
              l
                ? Object.assign(o, {
                    owner: !0,
                    edit: !0,
                    inspect: !0,
                    copy: !0,
                    comment: !!u,
                    share: !0,
                  })
                : Object.assign(o, {
                    owner: !1,
                    share: !1,
                    edit: p,
                    copy: a,
                    inspect: r,
                    comment: !!u && s,
                    sharing: c,
                  }))
            : c && Object.assign(o, { sharing: !0 });
        });
        const a = i.find((e) => e.owner);
        if (a) {
          const t = e.getUID() === a.id;
          (o.owner = t), (o.share = t);
        }
        const r = t.getPublicShare();
        r && r.access && ((o.isPrivate = !1), (o.sharing = !0));
        return (
          Object.assign(o, {
            isPrivate: i && i.filter((e) => !e.owner).length > 0,
          }),
          { state: o, role: n, publicShare: r }
        );
      }),
      (t.getSizeInfo = function (e) {
        var t = e;
        const n = 1e6,
          o = 1e3 * n;
        var i = { gb: 0, mb: 0, kb: 0 },
          a = Math.floor(t / o);
        a && ((i.gb = a), (t -= a * o));
        var r = Math.floor(t / n);
        r && ((i.mb = r), (t -= r * n));
        var s = Math.floor(t / 1e3);
        s && ((i.kb = s), (t -= 1e3 * s));
        return i;
      }),
      (t.getVersionFromString = function (e, t, n) {
        var o = e.match(t.join("|"));
        return o ? o[0] : n;
      }),
      (t.isDifferent = v),
      (t.isFunction = function (e) {
        if (void 0 === e) return !1;
        var t = Object.prototype.toString.call(e);
        return (
          [
            "[object Function]",
            "[object AsyncFunction]",
            "[object GeneratorFunction]",
            "[object Proxy]",
          ].indexOf(t) >= 0
        );
      }),
      (t.isPassiveSupported = function () {
        if (void 0 === T) {
          T = !1;
          try {
            const e = {
              get passive() {
                return (T = !0), !1;
              },
            };
            window.addEventListener("test", null, e),
              window.removeEventListener("test", null, e);
          } catch (e) {
            T = !1;
          }
        }
        return T;
      }),
      (t.isSupportedScreenSize = function (e) {
        if (!e && i.GSystem.hardware === i.GSystem.Hardware.Tablet) {
          return (
            (window.screen.height > window.screen.width
              ? window.screen.height
              : window.screen.width) >= p
          );
        }
        return (e || window.screen.availWidth) >= p;
      }),
      (t.isSymbol = h),
      (t.isSymbolInstance = void 0),
      (t.iterateAroundIndex = function (e, t, n) {
        var o = 0,
          i = 0,
          a = e.length;
        for (; o < a; ) {
          var r = t + i;
          n(e[r], r),
            o++,
            i > 0 && t - i >= 0
              ? (i = -i)
              : i > 0
              ? i++
              : t - i + 1 < a
              ? (i = 1 - i)
              : i--;
        }
      }),
      (t.iterateEqualStyleLayers = function (e, t, n, o) {
        var a = [];
        if (n.length > 1) {
          for (var r = 0; r < n.length; r++) {
            var s = n[r],
              l = [];
            if ("fill" === e) l = s.getPaintLayers().getFillLayers();
            else if ("border" === e) l = s.getPaintLayers().getBorderLayers();
            else if ("effect" === e)
              for (
                var c = s.getEffects().getFirstChild();
                null !== c;
                c = c.getNext()
              )
                l.push(c);
            for (var d = 0; d < l.length; d++) {
              var u = l[d];
              (("fill" === e && i.GStylable.FillPaintLayer.equals(u, t)) ||
                ("border" === e && i.GStylable.BorderPaintLayer.equals(u, t)) ||
                ("effect" === e && i.GUtil.equals(u, t))) &&
                a.push(u);
            }
          }
          a.forEach(function (e) {
            o(e);
          });
        } else o(t);
      }),
      (t.mergeNode = _),
      (t.releaseChanges = function (e, t, n) {
        t &&
          t.forEach((e) => {
            e.endUpdate();
          });
        e && e._finishSelectionUpdate();
        for (
          var o = arguments.length, i = new Array(o > 3 ? o - 3 : 0), a = 3;
          a < o;
          a++
        )
          i[a - 3] = arguments[a];
        i &&
          i.forEach((e) => {
            e.endUpdate();
          });
        n && n.endBlockReferenceChanges();
      }),
      (t.removeAllSuffixWhichLikeExtension = function (e, t) {
        const n = ".".concat(t).toLowerCase();
        for (; e.toLowerCase().endsWith(n); )
          e = e.substr(0, e.lastIndexOf("."));
        return e;
      }),
      (t.resolveDocumentImages = function (e, t) {
        let n =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
        return new Promise(async (o, a) => {
          const r = (e) =>
            e === i.GImage.ImageStatus.Loaded ||
            e === i.GImage.ImageStatus.Error;
          let s = 0;
          if (
            (e.accept((e) => {
              e instanceof i.GImage && !r(e.getStatus()) && s++;
            }),
            s > 0)
          ) {
            let l = setTimeout(() => {
              (s > 0 || n.cancelled) &&
                (e.removeEventListener(i.GImage.StatusEvent, c), a());
            }, t);
            const c = (t) => {
              let { status: d } = t;
              r(d) &&
                --s <= 0 &&
                (l && (clearTimeout(l), (l = null)),
                e.removeEventListener(i.GImage.StatusEvent, c),
                o(!0)),
                n.cancelled &&
                  (l && (clearTimeout(l), (l = null)),
                  e.removeEventListener(i.GImage.StatusEvent, c),
                  a());
            };
            e.addEventListener(i.GImage.StatusEvent, c);
          } else o(!0);
        });
      }),
      (t.saveBBoxes = function (e) {
        var t = [];
        e.accept(function (e) {
          if (e instanceof i.GElement) {
            var n = e.getPaintBBox(!1, null, !0);
            t.push(n);
          }
        });
        for (var n = new Float64Array(4 * t.length), o = 0; o < t.length; ++o)
          for (var a = i.GRect.serialize(t[o]), r = 0; r < 4; ++r)
            n[4 * o + r] = a[r];
        (s = "Test_invisible-.dat"),
          (l = n),
          navigator.webkitTemporaryStorage.requestQuota(1e3, function (e) {
            var t = e;
            console.log("Requested bytes:", 1e3, "Granted bytes:", t),
              window.webkitRequestFileSystem(
                window.TEMPORARY,
                t,
                function (e) {
                  const t = e.root.toURL();
                  window.webkitResolveLocalFileSystemURL(
                    t,
                    function (e) {
                      e.getFile(s, { create: !0 }, function (e) {
                        e.createWriter(
                          function (e) {
                            (e.onwriteend = function () {
                              console.log("Write completed.");
                            }),
                              (e.onerror = function (e) {
                                console.log("Write failed: " + e.toString());
                              }),
                              e.seek(0);
                            var t = new Blob([l.buffer], {
                              type: "application/octet-stream",
                            });
                            e.write(t);
                          },
                          function (e) {
                            console.log(e);
                          }
                        );
                      });
                    },
                    function (e) {
                      console.log(e);
                    }
                  );
                },
                function (e) {
                  console.log(e);
                }
              );
          });
        var s, l;
      }),
      (t.sleep = function (e) {
        return new Promise((t) => setTimeout(t, e));
      }),
      (t.stringToBase64String = function (e) {
        return l.fromByteArray(m(e));
      }),
      (t.throttle = function (e, t) {
        let n;
        return function () {
          const o = arguments;
          n || (e.apply(this, o), (n = !0), setTimeout(() => (n = !1), t));
        };
      }),
      (t.toCapitalize = function (e) {
        return e.charAt(0).toUpperCase() + e.slice(1);
      }),
      (t.toMD5 = function (e) {
        return s.MD5(e).toString();
      }),
      (t.trimStart = function (e, t) {
        if (!t || !t.length) return e;
        if (!e || !e.startsWith(t)) return e;
        return e.substring(t.length);
      }),
      (t.watchDog = void 0),
      n(58),
      n(19),
      n(180),
      n(181),
      n(30),
      n(8),
      n(356),
      n(20),
      n(3),
      n(271),
      n(71),
      n(151),
      n(134),
      n(1041),
      n(218),
      n(189),
      n(190),
      n(191),
      n(192),
      n(4),
      n(41),
      n(13),
      n(32),
      n(38),
      n(97),
      n(33);
    var i = n(1),
      a = o(n(84)),
      r = n(1042);
    const s = n(1043);
    var l = n(250),
      c = n(44);
    const d = n(433),
      { HAS_ANNOTATIONS: u, MIN_SUPPORTED_SCREEN_SIZE: p } = n(10);
    t.watchDog = {
      trap: (e, t, n, o) => (i) =>
        ((e, t, n, o, i) =>
          gDesigner.isEnabledProFeatures(i) || (n && n(e))
            ? t
              ? t(e)
              : void 0
            : (o && o(e),
              e.stopImmediatePropagation(),
              e.preventDefault(),
              gDesigner.handlePROFeatureInterruption(),
              !1))(i, e, t, n, o),
      check: (e, t) => (gDesigner.isEnabledProFeatures() ? e : t),
    };
    t._tryAndCatch = async (e) => {
      try {
        await e();
      } catch (e) {
        console.log(e);
      }
    };
    const g = s.enc.Latin1.parse(
      s.enc.Latin1.stringify(
        s.SHA256("#a09j!@10jas-109827s*%#1098XAapoc-9908#!123")
      )
    );
    function h(e, t) {
      const n = (e) => e && e instanceof i.GSymbol && (!t || !e.isMaster());
      return !!n(e) || !!e.findParent(n);
    }
    function f(e) {
      return new TextDecoder("utf-8").decode(e);
    }
    function m(e) {
      return new TextEncoder("utf-8").encode(e);
    }
    t.isSymbolInstance = (e) => h(e, !0);
    function y(e, t) {
      let n =
        arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : [];
      const o = (e) =>
          Object.keys(e)
            .filter(
              (e) => (e.startsWith("$") || e.startsWith("@")) && !n.includes(e)
            )
            .map((e) => e.slice(1)),
        a = o(e),
        r = o(t);
      return !i.GUtil.equals(a, r) || !e.arePropertiesEqual(t, a);
    }
    function v(e, t, n) {
      if (
        (n || (n = ["$lmd", "$storedUrl", "$__ids"]),
        !(e instanceof t.constructor))
      )
        return !0;
      if (e.hasMixin(i.GNode.Properties) !== t.hasMixin(i.GNode.Properties))
        return !0;
      if (e.hasMixin(i.GNode.Properties) && y(e, t, n)) return !0;
      if (e.hasMixin(i.GElement.Stylable) !== t.hasMixin(i.GElement.Stylable))
        return !0;
      if (e.hasMixin(i.GElement.Stylable)) {
        const o = e.getEffects(),
          i = t.getEffects();
        if (Boolean(o) !== Boolean(i)) return !0;
        if (o && v(o, i, n)) return !0;
        const a = e.getPaintLayers(),
          r = t.getPaintLayers();
        if (Boolean(a) !== Boolean(r)) return !0;
        if (a && v(a, r, n)) return !0;
      }
      if (e.hasMixin(i.GNode.Container) !== t.hasMixin(i.GNode.Container))
        return !0;
      if (e instanceof i.GPathBase != t instanceof i.GPathBase) return !0;
      if (e instanceof i.GPathBase) {
        var o = e.getAnchorPoints(),
          a = o.getChildren(),
          r = t.getAnchorPoints(),
          s = r.getChildren();
        if (a.length !== s.length) return !0;
        for (var l = 0; l < a.length; l++) {
          var c = o.getChildByIndex(l),
            d = r.getChildByIndex(l);
          if (c ^ d) return !0;
          if (y(c, d, n)) return !0;
        }
      }
      if (e.hasMixin(i.GNode.Container)) {
        const o = e.getChildren(),
          i = t.getChildren();
        if (o.length !== i.length) return !0;
        for (let e = 0; e < o.length; e++) if (v(o[e], i[e], n)) return !0;
      }
      return !1;
    }
    function _(e, t) {
      try {
        w(e, t), C(e, t), x(e, t), b(e, t);
      } catch (e) {
        console.log(e, e && e.stack);
      }
    }
    function b(e, t) {
      const n = (function (e) {
        const t = [];
        return Object.keys(e)
          .filter((e) => e.startsWith("$") && !t.includes(e))
          .map((e) => e.slice(1));
      })(t);
      e.setProperties(n, t.getProperties(n));
    }
    function w(e, t) {
      if (e.hasMixin(i.GElement.Stylable)) {
        var n = e.getPaintLayers(),
          o = t.getPaintLayers(),
          r = n.getBorderLayers(),
          s = o.getBorderLayers(),
          l = n.getFillLayers(),
          c = o.getFillLayers();
        e.hasMixin(a.default)
          ? (s.length && r.length && r[0].assignFrom(s[0]),
            c.length && l.length && l[0].assignFrom(c[0]))
          : (r.forEach((e) => {
              var t = s.find((t) => t.getId() === e.getId());
              t && e.assignFrom(t);
            }),
            l.forEach((e) => {
              var t = c.find((t) => t.getId() === e.getId());
              t && e.assignFrom(t);
            }));
      }
    }
    function C(e, t) {
      if (e instanceof i.GPathBase) {
        var n = e.getAnchorPoints();
        n.beginUpdate(),
          n.clearChildren(),
          n.deserialize(t.getAnchorPoints().serialize()),
          n.endUpdate();
      }
    }
    function x(e, t) {
      if (!e.hasMixin(i.GNode.Container)) return;
      let n = e.getChildren(),
        o = t.getChildren();
      S(e, t), E(e, t), A(n, o);
    }
    function S(e, t) {
      let n = e.getChildren(),
        o = t.getChildren();
      n.forEach((t) => {
        o.some((e) => e.getId() === t.getId()) || e.removeChild(t);
      });
    }
    function E(e, t) {
      for (var n = t.getLastChild(); null !== n; n = n.getPrevious()) {
        if (e.getChildren().some((e) => e.getId() === n.getId())) continue;
        let t = n.getNext(),
          o = t && e.getChildren().find((e) => e.getId() === t.getId());
        e.insertChild(n.clone(), o);
      }
    }
    function A(e, t) {
      e.forEach((e) => {
        let n = t.find((t) => t.getId() === e.getId());
        n && v(e, n) && _(e, n);
      });
    }
    let T;
    t.chaining = (e, t) => () => e() && t();
  }