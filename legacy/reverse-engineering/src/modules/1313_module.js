/**
 * Webpack Module #1313
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(58), n(19), n(8), n(71), n(4), n(41), n(32), n(38), n(33), n(26);
    var o = n(53),
      i = n(1),
      a = n(15),
      r = n(255),
      s = n(590),
      l = n(567);
    const c = ["text/xml", "text/plain"],
      d = [
        "image/svg+xml",
        "image/png",
        "image/jpg",
        "image/jpeg",
        "image/gif",
        "application/pdf",
      ],
      u = c.concat(d).concat(["text/uri-list"]);
    function p() {
      var e = navigator.userAgent.toLowerCase().indexOf("safari") >= 0;
      window.hasOwnProperty("ClipboardEvent")
        ? ((navigator.userAgent.toLowerCase().indexOf("firefox") >= 0 || e) &&
            (this._pasteArea = $("<div></div>")
              .css({
                overflow: "hidden",
                height: "1px",
                top: "-9999px",
                position: "absolute",
              })
              .prop("contenteditable", !0)
              .prop("tabindex", -1)
              .appendTo($("body"))),
          document.addEventListener(
            "paste",
            this._documentPasteEvent.bind(this)
          ))
        : ((this._pasteArea = $("<div></div>")
            .css({
              overflow: "hidden",
              height: "1px",
              top: "-9999px",
              position: "absolute",
            })
            .prop("contenteditable", !0)
            .prop("tabindex", -1)
            .appendTo($("body"))),
          this._pasteArea[0].addEventListener(
            "paste",
            this._documentPasteEvent.bind(this)
          )),
        this._pasteArea &&
          this._pasteArea.on("focus", () => {
            gDesigner.getWindows() &&
              (this._allowFocus ||
                (this._pasteArea.blur(),
                gDesigner.getWindows().getActiveWindow() &&
                  gDesigner.getWindows().getActiveWindow().getView().focus()));
          });
    }
    i.GObject.inherit(p, i.GObject),
      (p.URIListHandler = function () {}),
      (p.URIListHandler.prototype.handle = async function (e, t) {
        const n = (await e.text())
          .split("\n")
          .filter((e) => !(0 === e.indexOf("#")))
          .map((e) =>
            fetch(e).then((e) => (e.ok ? e.blob() : Promise.reject()))
          );
        (await Promise.all(n)).forEach((e) => {
          t[e.type] = e;
        });
      }),
      (p.TextHandler = function () {}),
      (p.TextHandler.prototype.handle = async function (e, t) {
        const n = await e.text();
        t[e.type] = n;
      });
    const g = {
      "text/plain": new p.TextHandler(),
      "text/xml": new p.TextHandler(),
      "text/uri-list": new p.URIListHandler(),
    };
    (p.prototype._pasteArea = null),
      (p.prototype._allowFocus = !1),
      (p.prototype._callback = null),
      (p.prototype.pasteFromClipboard = async function () {
        if (!navigator.clipboard) return Promise.reject();
        if (navigator.permissions) {
          const e = await navigator.permissions.query({
            name: "clipboard-read",
            allowWithoutGesture: !0,
          });
          if (!e || "denied" === e.state) return Promise.reject();
        }
        const e = await navigator.clipboard.read();
        if (!e) return Promise.reject();
        for (const t of e) {
          const e = {};
          for (const n of t.types) {
            if (!u.includes(n)) continue;
            const o = await t.getType(n),
              i = g[n];
            i ? await i.handle(o, e) : (e[n] = o);
          }
          this.handlePasteData(e);
        }
      }),
      (p.prototype._documentPasteEvent = function (e) {
        if (!this._canTrigger()) return !1;
        if (
          !document.activeElement ||
          !$(document.activeElement).is(":editable") ||
          (this._pasteArea && document.activeElement === this._pasteArea[0]) ||
          gDesigner.isGravitIME(document.activeElement)
        ) {
          var t = e.clipboardData;
          if (
            e.clipboardData &&
            e.clipboardData.items &&
            e.clipboardData.items.length
          ) {
            for (var n = t.items, o = {}, r = 0; r < n.length; r++) {
              var s = null;
              switch ((d = n[r].type)) {
                case "image/png":
                case "image/jpeg":
                case "image/gif":
                case "application/pdf":
                  s = n[r].getAsFile();
                  break;
                default:
                  s = t.getData(d) || null;
              }
              s && (o[d] = s);
            }
            this._handlePasteData(o),
              a.GPlatform.webBrowser ===
                a.GPlatform.constructor.WebBrowser.Firefox &&
                (e.stopPropagation(), e.preventDefault());
          } else if (this._pasteArea) {
            o = {};
            var l = 0;
            if (t.types && t.types.length) {
              var c = t.types;
              for (r = 0; r < c.length; r++) {
                var d;
                if (
                  "public.file-url" === (d = c[r]) &&
                  t.files &&
                  l < t.files.length
                ) {
                  var u = t.files[l++];
                  u && (o[u.type] = u);
                } else {
                  (s = t.getData(d)) && (o[d] = s);
                }
              }
            }
            setTimeout(
              function () {
                var e = this._pasteArea.children();
                if (1 === e.length && e.is("img")) {
                  var t = i.GUtil.dataUrlToBlob(e[0].src);
                  t && (o[t.type] = t);
                }
                this._handlePasteData(o), this._pasteArea.empty();
              }.bind(this),
              1
            );
          }
          this._pasteArea &&
            ((this._allowFocus = !1),
            this._pasteArea.blur(),
            gDesigner.getWindows().getActiveWindow() &&
              gDesigner.getWindows().getActiveWindow().getView().focus());
        }
      }),
      (p.prototype._canTrigger = function () {
        var e = gDesigner.getActiveDocument();
        const t = e && e.getEditor();
        if (t && t.isInlineEditing()) {
          const e = this._filterForInlineEditing(t.getSelection());
          if (e && 1 === e.length && e[0] instanceof i.GText) return !0;
        }
        return !(!e || gDesigner.getRightSidebars().getActiveSidebar() == l.ID);
      }),
      (p.prototype.handlePasteData = function (e) {
        return this._handlePasteData(e);
      }),
      (p.prototype._handlePasteData = function (e) {
        if (!this._canTrigger()) return !1;
        for (
          var t = !this._callback,
            n = gDesigner.getActiveDocument(),
            a = n.getEditor(),
            l = 0;
          l < c.length;
          ++l
        ) {
          var u = e[c[l]];
          if (u)
            try {
              var p = $.parseXML(u);
              if (p) {
                if ("svg" === p.documentElement.nodeName) {
                  e["image/svg+xml"] = new Blob([u], { type: "image/svg+xml" });
                  break;
                }
                if (
                  "gravit" === p.documentElement.nodeName &&
                  p.documentElement.hasAttribute("mimeType")
                ) {
                  if (p.documentElement.hasAttribute("restricted")) {
                    let e = p.documentElement.getAttribute("restricted");
                    if (
                      e &&
                      "false" != e &&
                      (!n.getStorageItem() || n.getStorageItem().getId() != e)
                    )
                      return;
                  }
                  e[p.documentElement.getAttribute("mimeType")] = $("<div/>")
                    .html(p.documentElement.textContent)
                    .text();
                }
              }
            } catch (e) {}
          if (e[i.GNode.MIME_TYPE]) {
            var g = i.GNode.deserialize(e[i.GNode.MIME_TYPE]),
              h = g instanceof i.GPage,
              f = n.filterUnrestrictedCommercialFileElements(
                h ? g.getChildren() : g
              );
            if ((f && f.length > 0) || h) {
              var m = f.filter(function (e) {
                  return e instanceof i.GElement;
                }),
                y = f.filter(function (e) {
                  return e instanceof i.GStyle;
                }),
                v =
                  1 === f.length &&
                  f[0] instanceof i.GText &&
                  a.hasSelection() &&
                  a.getSelection()[0] instanceof i.GText &&
                  a.isInlineEditing();
              if (v || (0 == m.length && 1 == f.length && !h)) {
                var _ = f[0];
                a.beginTransaction();
                try {
                  if (v) {
                    if (!o.GInlineTextEditor.HANDLECOPYPASTE) {
                      var b = a.getSelection()[0];
                      o.GElementEditor.getEditor(b).processPaste(_);
                    }
                  } else if (
                    _ instanceof i.GStylable.FillPaintLayer ||
                    _ instanceof i.GStylable.BorderPaintLayer
                  ) {
                    m = a.getSelection();
                    0 != (m = this._filterForStyleExceptions(m)).length &&
                      (m.length > 1
                        ? m.forEach(function (e) {
                            var t =
                              _ instanceof i.GStylable.FillPaintLayer
                                ? new i.GStylable.FillPaintLayer()
                                : new i.GStylable.BorderPaintLayer();
                            t.assignFrom(_), e.getPaintLayers().appendChild(t);
                          })
                        : m[0].getPaintLayers().appendChild(_));
                  } else if (_ instanceof i.GStylable.Effect) {
                    m = a.getSelection();
                    0 != (m = this._filterForStyleExceptions(m)).length &&
                      (m.length > 1
                        ? m.forEach(function (e) {
                            var t = new i.GStylable.Effect();
                            t.assignFrom(_), e.getEffects().appendChild(t);
                          })
                        : m[0].getEffects().appendChild(_));
                  }
                } finally {
                  a.commitTransaction(
                    i.GLocale.get(new i.GLocaleKey("GPaste", "action.paste"))
                  );
                }
              } else {
                var w = n.getScene().getStyles();
                if (m.length > 0 || h) {
                  t && a.beginTransaction();
                  try {
                    for (var C = 0; C < y.length; ++C) {
                      let e = y[C],
                        t = e.getReferenceId(),
                        o = null;
                      for (
                        var x = w.getFirstChild();
                        null !== x;
                        x = x.getNext()
                      )
                        if (
                          x.arePropertiesEqual(e, ["ps", "defaultStyle"]) &&
                          x.equalsStyle(e)
                        ) {
                          o = x;
                          break;
                        }
                      o ||
                        ((o = new i.GStyle()),
                        o.setProperties(
                          ["name", "defaultStyle", "ps"],
                          [e.getProperty("name"), !1, e.getProperty("ps")]
                        ),
                        o.assignStyleFrom(e),
                        n.getScene().getStyles().insertChild(o));
                      for (var S = 0; S < m.length; ++S) {
                        let e = m[S];
                        e.hasProperty("sref") &&
                          e.getProperty("sref") === t &&
                          e.setProperty("sref", o.getReferenceId());
                      }
                    }
                    if (!this.executeCallback(m)) {
                      var E = gDesigner.getActiveDocument().getScene();
                      h
                        ? (g.clearChildren(),
                          g.setProperty("off", null),
                          E.appendChild(g),
                          m.length > 0 &&
                            a.insertElements(m, !0, !0, !1, !0, g),
                          E.setActivePage(g))
                        : a.insertElements(m, !0, !0, !0, !0),
                        E.isFixedSized() || this._centerToView(!0);
                    }
                  } finally {
                    t &&
                      a.commitTransaction(
                        i.GLocale.get(
                          new i.GLocaleKey("GPaste", "action.paste")
                        )
                      );
                  }
                }
              }
            }
            return;
          }
          if (u) {
            var A,
              T = r.getProviderInstance(s),
              G =
                gDesigner.getWorkspace() &&
                gDesigner.getWorkspace().getFontManager() &&
                gDesigner.getWorkspace().getFontManager().getDefaultFont() &&
                gDesigner
                  .getWorkspace()
                  .getFontManager()
                  .getDefaultFont()
                  .getFamily();
            const e = this._filterForInlineEditing(a.getSelection());
            if (
              e &&
              e.length > 0 &&
              e[0] instanceof i.GText &&
              a.isInlineEditing()
            ) {
              if (!o.GInlineTextEditor.HANDLECOPYPASTE) {
                var P = e[0];
                return void o.GElementEditor.getEditor(P).processPaste(u);
              }
            } else {
              (P = new i.GText()).setText(u, !0, !0), t && a.beginTransaction();
              try {
                if (!this.executeCallback([P], !0)) {
                  if (
                    (a.insertElements([P], !1, !0, !0),
                    (A = T && T.getDefaultFamilyForString(u)) && A !== G)
                  ) {
                    var D = i.GOpenTypeFont.getDirectionForString(u);
                    D !== i.GTLDirectionTextTransformer.LTR
                      ? P.setProperties(["_tff", "dir", "_we"], [A, D, !0])
                      : P.setProperties(["_tff", "_we"], [A, !0]);
                  } else P.setProperty("_we", !0);
                  o.GElementEditor.getEditor(P).invalidateTextWidth(),
                    this._centerToView();
                }
              } finally {
                return void (
                  t &&
                  a.commitTransaction(
                    i.GLocale.get(new i.GLocaleKey("GPaste", "action.paste"))
                  )
                );
              }
            }
          }
        }
        for (var L = 0; L < d.length; ++L) {
          var I = d[L];
          if (e[I]) {
            t && a.beginTransaction();
            try {
              n.placeOrImport(
                e[I],
                null,
                !1,
                !0,
                this.executeCallback.bind(this)
              );
            } finally {
              t &&
                a.commitTransaction(
                  i.GLocale.get(
                    new i.GLocaleKey("GPaste", "action.paste-image")
                  )
                );
            }
            return;
          }
        }
      }),
      (p.prototype._filterForInlineEditing = function (e) {
        return e
          ? e.filter((e) => !(e instanceof i.GCollaborativeTextAnnotation))
          : null;
      }),
      (p.prototype._filterForStyleExceptions = function (e) {
        for (
          var t = [i.GPage, i.GGroup, i.GSymbol], n = [], o = 0;
          o < e.length;
          o++
        ) {
          for (var a = e[o], r = !0, s = 0; s < t.length; s++) {
            if (a instanceof t[s]) {
              r = !1;
              break;
            }
          }
          r && n.push(a);
        }
        return n;
      }),
      (p.prototype._centerToView = function (e) {
        var t,
          n,
          a = gDesigner.getActiveDocument().getEditor(),
          r = gDesigner.getActiveDocument().getScene(),
          s = gDesigner.getWindows().getActiveWindow(),
          l = r.getActivePage();
        if (
          ((n = r.isFixedSized() ? l.getGeometryBBox() : r.getPaintBBox()), s)
        ) {
          var c = s.getView(),
            d = c.getViewTransform(l),
            u = i.GPaintCanvas.getScreenDPI(),
            p = c.getViewBox().scaled(u, u);
          (t = d.mapRect(p)),
            r.isFixedSized() && (t = t.intersected(n)),
            t.isEmpty() && (t = n);
        } else t = n;
        a.arrangeAlign(
          o.GEditor.ArrangeAlignType.AlignCenter,
          null,
          !0,
          t,
          !0,
          e
        ),
          a.arrangeAlign(
            o.GEditor.ArrangeAlignType.AlignMiddle,
            null,
            !0,
            t,
            !0,
            e
          );
      }),
      (p.prototype.getArea = function () {
        return this._pasteArea;
      }),
      (p.prototype.setAllowFocus = function (e) {
        this._allowFocus = e;
      }),
      (p.prototype.getAllowFocus = function () {
        return this._allowFocus;
      }),
      (p.prototype.assignCallback = function (e) {
        this._callback = e;
      }),
      (p.prototype.executeCallback = function (e, t) {
        return (
          !!this._callback &&
          (this._callback(e, t), (this._callback = null), !0)
        );
      }),
      (e.exports = p);
  }