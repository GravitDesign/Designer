/**
 * Webpack Module #1303
 * Type: class
 * Name: GContextMenu
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(41);
    var o = n(53),
      i = n(1),
      a = n(15),
      r = n(866),
      s = n(869),
      l = n(1176),
      c = n(810),
      d = n(608),
      u = n(874),
      p = n(1177),
      g = n(1178),
      h = n(867),
      f = n(811),
      m = n(1179);
    const y = n(812);
    var v = n(1180);
    const _ = n(1304),
      b = n(1305),
      w = n(1306),
      C = n(1307),
      x = n(1308),
      S = n(1309);
    var E = n(870),
      A = n(873),
      T = n(871),
      G = n(872),
      P = n(238),
      D = n(339),
      L = n(804),
      I = n(1181),
      k = n(1310),
      O = n(1311),
      F = n(1312),
      R = n(875),
      M = n(1182);
    const N = n(876);
    var B = n(861),
      U = n(450),
      j = n(44),
      K = n(78);
    function V(e) {
      var t = this._createContextMenu(),
        n = this._createCropMenu(),
        i = this._createPageMenu(),
        a = this._createTouchContextMenu(),
        r = this._createFillPropertyMenu(),
        s = this._createBorderPropertyMenu(),
        l = this._createEffectPropertyMenu();
      e.on(
        "contextmenu",
        function (e, c) {
          if (gDesigner.getWindows().getActiveWindow().getView()) {
            var d = c && c.previousEvent ? c.previousEvent : c,
              u = gDesigner.getToolManager().getActiveTool(),
              p = (e.data && e.data.context) || (d && d.data && d.data.context);
            if (!u || !u.catchesContextMenu(p == U.LayerPanel || !1)) {
              var g = t,
                h = !1;
              p === U.PagePanel
                ? ((g = i), gDesigner.stats("contextmenu_open_page-menu"))
                : p === U.LayerPanel
                ? ((h = !0), gDesigner.stats("contextmenu_open_layer-menu"))
                : p === U.FillPropertyPanel
                ? ((g = r),
                  gDesigner.stats("contextmenu_open_fill-properties-menu"))
                : p === U.BorderPropertyPanel
                ? ((g = s),
                  gDesigner.stats("contextmenu_open_border-properties-menu"))
                : p === U.EffectPropertyPanel
                ? ((g = l),
                  gDesigner.stats("contextmenu_open_effect-properties-menu"))
                : u instanceof o.GSelectTool && u.isCropContext()
                ? ((g = n), gDesigner.stats("contextmenu_open_crop-menu"))
                : ((h = !0), gDesigner.stats("contextmenu_open_context-menu"));
              var f = "number" == typeof e.clientX ? e : d;
              this._contextMenuClientPosition = gDesigner
                .getWindows()
                .getActiveWindow()
                .getView()
                ._convertClientPositionFromMousePosition(f);
              var m = e.pageX ? e.pageX : d.pageX,
                y = e.pageY ? e.pageY : d.pageY;
              return (
                (this._mouseEvent = e.pageX ? e : d),
                (this._options = c),
                gDesigner.isTouchEnabled() && h
                  ? a.gOverlay("open", { x: m, y: y }, void 0, () => {
                      gDesigner.trigger(
                        new K(
                          K.Type.ContextMenuOpened,
                          gDesigner.getActiveDocument()
                        )
                      );
                    })
                  : g.open({ x: m, y: y }),
                (this._contextMenuTouch = a),
                (this._contextMenuDesktop = g),
                !0
              );
            }
          }
        }.bind(this)
      );
    }
    (V.ID = "context.menu"),
      (V.prototype._contextMenuClientPosition = null),
      (V.prototype._mouseEvent = null),
      (V.prototype._options = null),
      (V.prototype._contextMenuTouch = null),
      (V.prototype._contextMenuDesktop = null),
      (V.prototype._createContextMenu = function () {
        var e = new P();
        (e.__which = "context"), e.createAddItem(gDesigner.getAction(F.ID));
        var t = new D(D.Type.Menu, P);
        t.setCaption(i.GLocale.get(new i.GLocaleKey("GPaste", "action.paste"))),
          t
            .getMenu()
            .createAddItem(gDesigner.getAction(M.ID), null, null, null, V.ID)
            .addEventListener(
              D.UpdateEvent,
              function () {
                gDesigner
                  .getAction(M.ID)
                  .setPosition(this._contextMenuClientPosition);
              }.bind(this)
            ),
          t.getMenu().createAddItem(gDesigner.getAction(N.ID)),
          t.getMenu().createAddItem(gDesigner.getAction(R.ID)),
          e.addItem(t),
          e.createAddDivider();
        var n = new D(D.Type.Menu, P);
        n.setCaption(
          i.GLocale.get(new i.GLocaleKey("GContextMenu", "text.arrange"))
        ),
          n
            .getMenu()
            .createAddItem(
              gDesigner.getAction(
                s.ID + "." + o.GEditor.ArrangeOrderType.SendToFront
              )
            ),
          n
            .getMenu()
            .createAddItem(
              gDesigner.getAction(
                s.ID + "." + o.GEditor.ArrangeOrderType.BringForward
              )
            ),
          n
            .getMenu()
            .createAddItem(
              gDesigner.getAction(
                s.ID + "." + o.GEditor.ArrangeOrderType.SendBackward
              )
            ),
          n
            .getMenu()
            .createAddItem(
              gDesigner.getAction(
                s.ID + "." + o.GEditor.ArrangeOrderType.SendToBack
              )
            ),
          e.addItem(n);
        var L = new D(D.Type.Menu, P);
        L.setCaption(
          i.GLocale.get(new i.GLocaleKey("GContextMenu", "text.align"))
        ),
          L.getMenu().createAddItem(
            gDesigner.getAction(
              r.ID + "." + o.GEditor.ArrangeAlignType.AlignLeft
            )
          ),
          L.getMenu().createAddItem(
            gDesigner.getAction(
              r.ID + "." + o.GEditor.ArrangeAlignType.AlignCenter
            )
          ),
          L.getMenu().createAddItem(
            gDesigner.getAction(
              r.ID + "." + o.GEditor.ArrangeAlignType.AlignRight
            )
          ),
          L.getMenu().createAddItem(
            gDesigner.getAction(
              r.ID + "." + o.GEditor.ArrangeAlignType.AlignJustifyHorizontal
            )
          ),
          L.getMenu().createAddDivider(),
          L.getMenu().createAddItem(
            gDesigner.getAction(
              r.ID + "." + o.GEditor.ArrangeAlignType.AlignTop
            )
          ),
          L.getMenu().createAddItem(
            gDesigner.getAction(
              r.ID + "." + o.GEditor.ArrangeAlignType.AlignMiddle
            )
          ),
          L.getMenu().createAddItem(
            gDesigner.getAction(
              r.ID + "." + o.GEditor.ArrangeAlignType.AlignBottom
            )
          ),
          L.getMenu().createAddItem(
            gDesigner.getAction(
              r.ID + "." + o.GEditor.ArrangeAlignType.AlignJustifyVertical
            )
          ),
          L.getMenu().createAddDivider(),
          L.getMenu().createAddItem(
            gDesigner.getAction(h.ID + "." + h.Type.Horizontal)
          ),
          L.getMenu().createAddItem(
            gDesigner.getAction(h.ID + "." + h.Type.Vertical)
          ),
          e.addItem(L);
        var k = new D(D.Type.Menu, P);
        k.setCaption(
          i.GLocale.get(new i.GLocaleKey("GContextMenu", "text.transform"))
        ),
          k
            .getMenu()
            .createAddItem(
              gDesigner.getAction(T.ID + "." + T.Type.Rotate90Left)
            ),
          k
            .getMenu()
            .createAddItem(
              gDesigner.getAction(T.ID + "." + T.Type.Rotate90Right)
            ),
          k
            .getMenu()
            .createAddItem(
              gDesigner.getAction(T.ID + "." + T.Type.FlipHorizontal)
            ),
          k
            .getMenu()
            .createAddItem(
              gDesigner.getAction(T.ID + "." + T.Type.FlipVertical)
            ),
          e.addItem(k),
          e.createAddDivider(),
          e.createAddItem(gDesigner.getAction(f.ID)),
          e.createAddItem(gDesigner.getAction(y.ID)),
          e.createAddItem(gDesigner.getAction(E.ID)),
          e.createAddItem(gDesigner.getAction(I.ID)),
          e.createAddDivider(),
          e.createAddItem(gDesigner.getAction(c.ID)),
          e.createAddItem(gDesigner.getAction(G.ID)),
          e.createAddItem(gDesigner.getAction(m.ID)),
          e.createAddItem(gDesigner.getAction(A.ID)),
          e.createAddDivider(),
          e.createAddItem(gDesigner.getAction(d.ID)),
          e.createAddItem(gDesigner.getAction(p.ID)),
          e.createAddItem(gDesigner.getAction(u.ID)),
          e.createAddDivider(),
          e.createAddItem(gDesigner.getAction(l.ID)),
          e.createAddItem(gDesigner.getAction(g.ID)),
          e.createAddDivider();
        const O = new D(D.Type.Menu, P);
        O.setCaption(
          i.GLocale.get(new i.GLocaleKey("GContextMenu", "text.select-same"))
        ),
          O.getMenu().createAddItem(gDesigner.getAction(v.ID)),
          O.getMenu().createAddDivider(),
          O.getMenu().createAddItem(gDesigner.getAction(_.getId(_.Type.Fill))),
          O.getMenu().createAddItem(
            gDesigner.getAction(_.getId(_.Type.Border))
          ),
          O.getMenu().createAddItem(
            gDesigner.getAction(_.getId(_.Type.FillAndBorder))
          ),
          O.getMenu().createAddDivider(),
          O.getMenu().createAddItem(gDesigner.getAction(b.ID)),
          O.getMenu().createAddItem(gDesigner.getAction(w.ID)),
          O.getMenu().createAddItem(gDesigner.getAction(C.ID)),
          O.getMenu().createAddItem(gDesigner.getAction(x.ID)),
          O.getMenu().createAddItem(gDesigner.getAction(S.ID)),
          e.addItem(O),
          e.createAddDivider();
        var B = new D(D.Type.Menu, P);
        return (
          B.setCaption(
            i.GLocale.get(new i.GLocaleKey("GContextMenu", "text.select"))
          ),
          B.setIcon("gravit-icon-cursor-filled"),
          B.addEventListener(
            D.UpdateEvent,
            function () {
              B.getMenu().clearItems(), B.setEnabled(!1);
              var {
                elementHits: e,
                filteredElementHits: t,
                submenus: n,
              } = this._getHitsElments();
              if (
                !(e && e.length > 0 && e[0] instanceof i.GPage) &&
                e &&
                e.length > 0
              ) {
                B.setEnabled(!0);
                for (var o = 0; o < t.length; o++) {
                  var r = t[o].element,
                    s =
                      r instanceof i.GBlock
                        ? r.getLabel()
                        : r.getNodeNameTranslated(),
                    l = "temp-" + e.indexOf(t[o]);
                  if (n[l]) {
                    var c = new D(D.Type.Menu, P);
                    c.setCaption((o + 1).toString() + ". " + s),
                      c.setData(l),
                      c.addEventListener(D.UpdateEvent, function () {
                        var e = n[this.getData()];
                        this.getMenu().clearItems();
                        for (var t = 0; t < e.length; t++)
                          this.getMenu().createAddItem(
                            (t + 1).toString() +
                              ". " +
                              (e[t] instanceof i.GBlock
                                ? e[t].getLabel()
                                : e[t].getNodeNameTranslated()),
                            function () {
                              this.element.removeFlag(i.GNode.Flag.Highlighted),
                                gDesigner
                                  .getActiveDocument()
                                  .getEditor()
                                  .updateSelection(
                                    a.GPlatform.modifiers.shiftKey,
                                    [this.element]
                                  );
                            },
                            function () {
                              this.element.setFlag(i.GNode.Flag.Highlighted);
                            },
                            function () {
                              this.element.removeFlag(i.GNode.Flag.Highlighted);
                            }
                          ).element = e[t];
                      }),
                      B.getMenu().addItem(c);
                  } else
                    B.getMenu().createAddItem(
                      (o + 1).toString() + ". " + s,
                      function () {
                        this.element.removeFlag(i.GNode.Flag.Highlighted),
                          gDesigner
                            .getActiveDocument()
                            .getEditor()
                            .updateSelection(a.GPlatform.modifiers.shiftKey, [
                              this.element,
                            ]);
                      },
                      function () {
                        this.element.setFlag(i.GNode.Flag.Highlighted);
                      },
                      function () {
                        this.element.removeFlag(i.GNode.Flag.Highlighted);
                      }
                    ).element = r;
                }
              }
            }.bind(this)
          ),
          e.addItem(B),
          e
        );
      }),
      (V.prototype._createCropMenu = function () {
        var e = new P();
        return (
          (e.__which = "crop"),
          e.createAddItem(gDesigner.getAction(k.ID)),
          e.createAddItem(gDesigner.getAction(O.ID)),
          e
        );
      }),
      (V.prototype._getHitsElments = function (e) {
        e = e || this._mouseEvent;
        var t = gDesigner
            .getWindows()
            .getActiveWindow()
            .getView()
            ._convertClientPositionFromMousePosition(e),
          n = gDesigner.getActiveDocument().getScene(),
          a = gDesigner.getWindows().getActiveWindow().getView(),
          r = a.getWorldTransform(n),
          s = function (e) {
            return !(e instanceof i.GPage);
          }.bind(this),
          l = n.hitTest(
            t,
            r,
            s,
            !0,
            -1,
            o.GEditorOptions.pickDistance,
            !0,
            null,
            !0,
            !1,
            a.getViewConfiguration().multiPageView
          );
        if (
          (l &&
            l.length > 0 &&
            (l = l.filter(function (e) {
              var t = e.element.getProperty("plkt");
              return !(
                t & i.GBlock.ProgramLck.NoEdit &&
                t & i.GBlock.ProgramLck.NoSizeChanges &&
                t & i.GBlock.ProgramLck.NoMove &&
                t & i.GBlock.ProgramLck.NoDelete
              );
            })),
          l && l.length > 0 && l[0] instanceof i.GPage)
        )
          return { elementHits: l };
        var c = [],
          d = {};
        if (l && l.length > 0)
          for (var u = 0; u < l.length; ++u) {
            for (
              var p = l[u].element.getParent(), g = !1, h = 0;
              h < l.length;
              ++h
            )
              if (l[h].element === p) {
                (g = !0),
                  d["temp-" + h]
                    ? d["temp-" + h].push(l[u].element)
                    : (d["temp-" + h] = [l[u].element]);
                break;
              }
            g || c.push(l[u]);
          }
        return { elementHits: l, filteredElementHits: c, submenus: d };
      }),
      (V.prototype._createPageMenu = function () {
        var e = new P(null, "g-page-option-menu"),
          t = {
            DUPLICATE: i.GLocale.get(
              new i.GLocaleKey("GContextMenu", "page-panel.text.duplicate")
            ),
            DELETE: i.GLocale.get(
              new i.GLocaleKey("GContextMenu", "page-panel.text.delete")
            ),
            COPY: i.GLocale.get(
              new i.GLocaleKey("GContextMenu", "page-panel.text.copy")
            ),
            EXPORT: i.GLocale.get(
              new i.GLocaleKey("GContextMenu", "page-panel.text.export")
            ),
          },
          n = e.createAddItem(t.DUPLICATE, function () {
            var e = gDesigner.getActiveDocument().getScene();
            o.GEditor.tryRunTransaction(
              e,
              function () {
                var t = e.getActivePage(),
                  n = t.clone({
                    copy: !0,
                    copyIgnoreProperties:
                      o.GEditorOptions.propertiesExcludedFromCopying,
                  });
                e.insertChild(n), e.renameClone(t, n);
                var a = n.getPosition(!0, !0, !0, !0);
                n.setProperty(
                  "off",
                  new i.GTransform(1, 0, 0, 1, a.getX(), a.getY())
                );
              },
              t.DUPLICATE
            ),
              gDesigner.stats("contextmenu_pages_duplicate");
          }),
          a = e.createAddItem(t.DELETE, function () {
            var e = gDesigner.getActiveDocument().getScene(),
              n = e.getActivePage(),
              a = n.getSlavePages().length > 0;
            n.getProperty("plkt") & i.GBlock.ProgramLck.NoDelete ||
              (a
                ? j.confirm(
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GOutlineSidebar",
                        "text.confirm-delete-masterpage"
                      )
                    ),
                    function (t) {
                      t &&
                        o.GEditor.tryRunTransaction(
                          e,
                          function () {
                            e.deleteActivePage();
                          },
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GOutlineSidebar",
                              "action.delete-page"
                            )
                          )
                        );
                    },
                    null,
                    null,
                    !0,
                    !0
                  )
                : o.GEditor.tryRunTransaction(
                    e,
                    function () {
                      e.deleteActivePage();
                    },
                    t.DELETE
                  ),
              gDesigner.stats("contextmenu_pages_delete"));
          }),
          r = e.createAddItem(t.COPY, function () {
            var e = gDesigner.getActiveDocument(),
              n = e.getScene();
            o.GEditor.tryRunTransaction(
              n,
              function () {
                var t =
                    e.isCommercialProductFile() ||
                    !gDesigner.getApplicationManager().isCopyPasteEnabled(),
                  a = n.getActivePage(),
                  r = i.GNode.serialize(a, {
                    copy: !0,
                    copyIgnoreProperties:
                      o.GEditorOptions.propertiesExcludedFromCopying,
                  }),
                  s =
                    '<gravit mimeType="' +
                    i.GNode.MIME_TYPE +
                    '" restricted="' +
                    (!!t && e.getStorageItem().getId()) +
                    '">' +
                    $("<div/>").text(r).html() +
                    "</gravit>";
                gContainer.copyToClipboard(s);
              },
              t.COPY
            ),
              gDesigner.stats("contextmenu_pages_copy");
          }),
          s = e.createAddItem(t.EXPORT, function () {
            var e = gDesigner.getActiveDocument().getScene().getActivePage();
            gDesigner.executeAction(B.ID, [{ element: e }], null, !0),
              gDesigner.stats("contextmenu_pages_export");
          });
        return (
          n.setIcon("gravit-icon-duplicate"),
          a.setIcon("gravit-icon-delete"),
          r.setIcon("gravit-icon-copy"),
          s.setIcon("gravit-icon-export"),
          s.setProFeatureInterruption(!1),
          e.addEventListener(L.EVENT, function (e) {
            gDesigner.isEnabledProFeatures() || s.setPro(!0);
          }),
          (e.__which = "page"),
          e
        );
      }),
      (V.prototype._createFillPropertyMenu = function () {
        var e = new P(null, "fill-context-menu"),
          t = null,
          n = {
            DELETE: i.GLocale.get(
              new i.GLocaleKey(
                "GContextMenu",
                "fill-properties-panel.text.delete-fill"
              )
            ),
            COPY: i.GLocale.get(
              new i.GLocaleKey(
                "GContextMenu",
                "fill-properties-panel.text.copy-fill"
              )
            ),
          },
          r = e.createAddItem(n.DELETE, function () {
            if (t) {
              var e = gDesigner.getActiveDocument().getEditor().getSelection();
              o.GEditor.tryRunTransaction(
                e[0],
                function () {
                  for (var n = 0; n < e.length; n++)
                    for (
                      var o = e[n].getPaintLayers().getFillLayers(), a = 0;
                      a < o.length;
                      a++
                    ) {
                      var r = o[a];
                      if (i.GStylable.FillPaintLayer.equals(r, t)) {
                        r.getParent().removeChild(r);
                        break;
                      }
                    }
                },
                n.DELETE
              );
            }
            gDesigner.stats("contextmenu_fills_delete");
          }),
          s = e.createAddItem(n.COPY, function () {
            if (t) {
              var e = i.GNode.serialize([t], {
                  copy: !0,
                  copyIgnoreProperties:
                    o.GEditorOptions.propertiesExcludedFromCopying,
                }),
                n =
                  '<gravit mimeType="' +
                  i.GNode.MIME_TYPE +
                  '">' +
                  $("<div/>").text(e).html() +
                  "</gravit>";
              gContainer.copyToClipboard(n);
            }
            gDesigner.stats("contextmenu_fills_copy");
          });
        return (
          r.setIcon("gravit-icon-trash"),
          s.setIcon("gravit-icon-copy"),
          r.setShortcutHint([a.GKey.Constant.DELETE]),
          s.setShortcutHint([a.GKey.Constant.META, "C"]),
          e.addEventListener(
            L,
            function () {
              t =
                this._options &&
                this._options.data &&
                this._options.data.paintLayer;
            }.bind(this)
          ),
          (e.__which = "fill"),
          e
        );
      }),
      (V.prototype._createBorderPropertyMenu = function () {
        var e = new P(null, "border-context-menu"),
          t = null,
          n = {
            ADVANCED: i.GLocale.get(
              new i.GLocaleKey(
                "GContextMenu",
                "border-properties-panel.text.advanced-settings"
              )
            ),
            DELETE: i.GLocale.get(
              new i.GLocaleKey(
                "GContextMenu",
                "border-properties-panel.text.delete-border"
              )
            ),
            COPY: i.GLocale.get(
              new i.GLocaleKey(
                "GContextMenu",
                "border-properties-panel.text.copy-border"
              )
            ),
          },
          r = e.createAddItem(
            n.ADVANCED,
            function () {
              this._options &&
                this._options.data &&
                this._options.data.openAdvancedSettings(),
                gDesigner.stats("contextmenu_borders_advanced-settings");
            }.bind(this)
          ),
          s = e.createAddItem(n.DELETE, function () {
            if (t) {
              var e = gDesigner.getActiveDocument().getEditor().getSelection();
              o.GEditor.tryRunTransaction(
                e[0],
                function () {
                  for (var n = 0; n < e.length; n++)
                    for (
                      var o = e[n].getPaintLayers().getBorderLayers(), a = 0;
                      a < o.length;
                      a++
                    ) {
                      var r = o[a];
                      if (i.GStylable.BorderPaintLayer.equals(r, t)) {
                        r.getParent().removeChild(r);
                        break;
                      }
                    }
                },
                n.DELETE
              );
            }
            gDesigner.stats("contextmenu_borders_delete");
          }),
          l = e.createAddItem(n.COPY, function () {
            if (t) {
              var e = i.GNode.serialize([t], {
                  copy: !0,
                  copyIgnoreProperties:
                    o.GEditorOptions.propertiesExcludedFromCopying,
                }),
                n =
                  '<gravit mimeType="' +
                  i.GNode.MIME_TYPE +
                  '">' +
                  $("<div/>").text(e).html() +
                  "</gravit>";
              gContainer.copyToClipboard(n);
            }
            gDesigner.stats("contextmenu_borders_copy");
          });
        return (
          r.setIcon("gravit-icon-settings"),
          s.setIcon("gravit-icon-trash"),
          l.setIcon("gravit-icon-copy"),
          s.setShortcutHint([a.GKey.Constant.DELETE]),
          l.setShortcutHint([a.GKey.Constant.META, "C"]),
          e.addEventListener(
            L,
            function () {
              t =
                this._options &&
                this._options.data &&
                this._options.data.paintLayer;
            }.bind(this)
          ),
          (e.__which = "border"),
          e
        );
      }),
      (V.prototype._createEffectPropertyMenu = function () {
        var e = new P(null, "effect-context-menu"),
          t = null,
          n = {
            COPY: i.GLocale.get(
              new i.GLocaleKey(
                "GContextMenu",
                "effect-properties-panel.text.copy-effect"
              )
            ),
            APPLY_TO_ELEMENT: i.GLocale.get(
              new i.GLocaleKey(
                "GContextMenu",
                "effect-properties-panel.text.apply-to-element"
              )
            ),
            APPLY_TO_FILL: i.GLocale.get(
              new i.GLocaleKey(
                "GContextMenu",
                "effect-properties-panel.text.apply-to-fill"
              )
            ),
            APPLY_TO_BORDER: i.GLocale.get(
              new i.GLocaleKey(
                "GContextMenu",
                "effect-properties-panel.text.apply-to-border"
              )
            ),
          },
          r = new D(D.Type.Menu, P);
        r.getMenu().addClass("effect-context-menu");
        var s = r.getMenu().createAddItem(n.APPLY_TO_ELEMENT, function () {
            u(null, n.APPLY_TO_ELEMENT);
          }),
          l = r.getMenu().createAddItem(n.APPLY_TO_FILL, function () {
            u(i.GStylable.StyleLayer.Fill, n.APPLY_TO_FILL);
          }),
          c = r.getMenu().createAddItem(n.APPLY_TO_BORDER, function () {
            u(i.GStylable.StyleLayer.Border, n.APPLY_TO_BORDER);
          }),
          d = e.createAddItem(n.COPY, function () {
            if (t) {
              var e = i.GNode.serialize([t], {
                  copy: !0,
                  copyIgnoreProperties:
                    o.GEditorOptions.propertiesExcludedFromCopying,
                }),
                n =
                  '<gravit mimeType="' +
                  i.GNode.MIME_TYPE +
                  '">' +
                  $("<div/>").text(e).html() +
                  "</gravit>";
              gContainer.copyToClipboard(n);
            }
            gDesigner.stats("contextmenu_effects_copy");
          }),
          u = function (e, n) {
            o.GEditor.tryRunTransaction(
              t,
              function () {
                t.setProperty("ly", e);
              },
              n
            ),
              gDesigner.stats("contextmenu_effects_change-layer", n);
          };
        return (
          r.setCaption(n.APPLY_TO_ELEMENT),
          d.setIcon("gravit-icon-copy"),
          s.setIcon("gravit-icon-circle"),
          l.setIcon("gravit-icon-fill"),
          c.setIcon("gravit-icon-stroke"),
          d.setShortcutHint([a.GKey.Constant.META, "C"]),
          e.addItem(r),
          e.addEventListener(
            L,
            function () {
              let e = null,
                o = null,
                a = (t =
                  this._options &&
                  this._options.data &&
                  this._options.data.effect).getProperty("ly");
              a === i.GStylable.StyleLayer.Fill
                ? ((e = "gravit-icon-fill"), (o = n.APPLY_TO_FILL))
                : a === i.GStylable.StyleLayer.Border
                ? ((e = "gravit-icon-stroke"), (o = n.APPLY_TO_BORDER))
                : ((e = "gravit-icon-circle"), (o = n.APPLY_TO_ELEMENT)),
                r.setIcon(e),
                r.setCaption(o);
            }.bind(this)
          ),
          (e.__which = "effect"),
          e
        );
      }),
      (V.prototype.close = function () {
        this._contextMenuTouch && this._contextMenuTouch.gOverlay("close"),
          this._contextMenuDesktop && this._contextMenuDesktop.close();
      }),
      (V.prototype.toString = function () {
        return "[Object GContextMenu]";
      }),
      (e.exports = V);
  }