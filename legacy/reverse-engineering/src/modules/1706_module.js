/**
 * Webpack Module #1706
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(19), n(57), n(91), n(4), n(13), n(97), n(26);
    var i = n(53),
      a = n(1),
      r = n(15),
      s = n(40),
      l = n(67),
      c = n(1351),
      d = o(n(565)),
      u = o(n(135)),
      p = n(451).GVirtualTree,
      g = n(451).GVirtualTreeNodeNamed,
      { VTREE_FREE_HEIGHT: h, VTREE_FREE_HEIGHT_TOUCH: f } = n(10),
      m = n(450),
      y = ["name"];
    function v() {}
    function _(e, t, n, o, i) {
      var a = !0,
        r = $(this).data("glayerpanel");
      if (r.options.canDropCallback) {
        for (
          var s = e.id
              ? T.call(this, e.id)
              : r.scene
              ? r.scene.getActivePage()
              : null,
            l = n ? T.call(this, n.id) : null,
            c = [],
            d = 0;
          d < o.length;
          ++d
        )
          c.push(T.call(this, o[d].id));
        var u = [];
        if ((a = r.options.canDropCallback(s, l, c, u)))
          for (d = 0; d < u.length; ++d) {
            var p = u[d];
            i.push(o[p]);
          }
      }
      return a;
    }
    function b(e, t, n, o) {
      if (!n || !n.length || !e) return !1;
      if (!gDesigner.isEnabledProFeatures()) {
        if ((0, s.isSymbolInstance)(e)) return !1;
        if (n.some((e) => e instanceof a.GSymbol) && (0, s.isSymbol)(e))
          return !1;
      }
      for (var r = !0, l = 0; l < n.length && r; ++l)
        (r =
          !e.isLocked() &&
          n[l].validateInsertion(e, t) &&
          i.GEditor.validateBlockInsertion(e, n[l], t)) && o.push[l];
      return r;
    }
    function w(e, t, n, o) {
      var i = $(this).data("glayerpanel");
      if (i.options.moveCallback) {
        for (
          var a = e.id
              ? T.call(this, e.id)
              : i.scene
              ? i.scene.getActivePage()
              : null,
            r = n ? T.call(this, n.id) : null,
            s = [],
            l = 0;
          l < o.length;
          ++l
        )
          s.push(T.call(this, o[l].id));
        i.options.moveCallback(a, r, s);
      }
    }
    function C(e, t, n, o) {
      var i = $(this).data("glayerpanel");
      if (i.options.duplicateCallback) {
        for (
          var a = e.id
              ? T.call(this, e.id)
              : i.scene
              ? i.scene.getActivePage()
              : null,
            r = n ? T.call(this, n.id) : null,
            s = [],
            l = 0;
          l < o.length;
          ++l
        )
          s.push(T.call(this, o[l].id));
        i.options.duplicateCallback(a, r, s);
      }
    }
    function x(e) {
      var t = $(this).data("glayerpanel");
      if (t.options.clickCallback) {
        var n = T.call(this, e.id);
        t.options.clickCallback(n);
      }
    }
    function S(e) {
      var t = T.call(this, e.id);
      t &&
        (e.expanded
          ? t.setFlag(a.GNode.Flag.Expanded)
          : t.removeFlag(a.GNode.Flag.Expanded));
    }
    function E(e, t) {
      var n = $(this).data("glayerpanel");
      n &&
        n.options &&
        n.options.renderer &&
        n.options.renderer(e.id, e.expanded, t),
        Y.call(this);
    }
    function A(e) {
      var t = $(this);
      e.id === p.COLLAPSE_ID
        ? $(e).addClass(t.data("glayerpanel").options.collapseStyle)
        : e.id === p.EXPAND_ID &&
          $(e).addClass(t.data("glayerpanel").options.expandStyle);
    }
    function T(e) {
      var t = $(this).data("glayerpanel").layersTreeNodeMap[e];
      return t ? t.node : null;
    }
    function G(e) {
      return $(this).data("glayerpanel").layersTreeNodeMap[e];
    }
    function P(e) {
      var t = $(this).data("glayerpanel").layersTreeNodeMapByNodes.get(e);
      return t ? t.treeId : null;
    }
    function D(e) {
      var t = $(this).data("glayerpanel").layersTreeNodeMapByNodes.get(e);
      return t ? t.treeNode : null;
    }
    function L(e) {
      var t = $(this).data("glayerpanel").layersTreeNodeMap,
        n = $(this).data("glayerpanel").layersTreeNodeMapByNodes;
      e.accept(
        function (e) {
          if (e instanceof a.GLayer || e instanceof a.GItem) {
            var o = n.get(e);
            o && (n.delete(e), (t[o.treeId] = null));
          }
        }.bind(this)
      );
    }
    function I(e, t, n) {
      var o = $(this).data("glayerpanel"),
        r = G.call(this, e),
        s = r ? r.node : null;
      if (s) {
        var {
            parentHidden: u,
            isHidden: p,
            lockType: g,
            isOutlined: h,
            hasSelection: f,
          } = (0, c.getLayerOrItemStatus)(s),
          {
            container: y,
            title: v,
            titleGroup: _,
          } = (0, c.buildLayerItemContainer)(n, s, f, t);
        r.element = _;
        var b = this;
        if (
          (s.hasFlag(a.GElement.Flag.PartialLocked) ||
            _.attr("draggable", !0)
              .attr("data-drag-mode", d.default.PRESS_AND_HOLD)
              .on("dragstart", function (e) {
                if (o.options.startDraggingCallback) {
                  var t = o.options.startDraggingCallback(s);
                  if (t && t.length) {
                    var n = "",
                      i = t[0].getProperty("name");
                    (i = i || t[0].getNodeNameTranslated()) && (n = i);
                    for (var a = 1; a < t.length; ++a)
                      (i =
                        (i = t[a].getProperty("name")) ||
                        t[a].getNodeNameTranslated()) && (n += ", " + i);
                    n.length && $(v).html(n);
                    var r = o.vtree,
                      l = [];
                    for (a = 0; a < t.length; ++a) {
                      var c = D.call(b, t[a]);
                      c && l.push(c);
                    }
                    r.setDragNodes(l),
                      setTimeout(
                        function () {
                          $(v).html(i);
                        }.bind(this),
                        0
                      );
                  } else $(this).attr("draggable", !1);
                }
              }),
          !o.blockHighlight)
        ) {
          var w = s.hasFlag(a.GNode.Flag.Highlighted);
          w ||
            t ||
            !s.hasMixin(a.GNode.Container) ||
            (w = s.acceptChildren(
              function (e) {
                return e.hasFlag(a.GNode.Flag.Highlighted);
              },
              !1,
              !0
            )),
            y.toggleClass("g-highlighted-row", w);
        }
        !g &&
          gDesigner.getActiveDocument() &&
          gDesigner.getApplicationManager().isEditingEnabled() &&
          $(_).gAutoEdit({
            textSelector: "> .layer-title",
            getContainer: function () {
              return G.call(b, e).element;
            },
            submitCallback: function (e) {
              e &&
                "" !== e.trim() &&
                i.GEditor.tryRunTransaction(
                  s,
                  function () {
                    s.setProperty("name", e);
                  },
                  a.GLocale.get(
                    new a.GLocaleKey("GLayerPanel", "action.rename-layer")
                  )
                );
            },
          });
        var C = R(s);
        C &&
          !C.inSync(s, !0) &&
          $("<span></span>")
            .addClass("layer-action layer-synchronize gravit-icon-refresh")
            .attr(
              "data-title",
              a.GLocale.get(
                new a.GLocaleKey("GLayerPanel", "action.reset-instance")
              )
            )
            .on("click", function (e) {
              gDesigner.stats("layers_click_symbol-reset"),
                e.stopPropagation(),
                i.GEditor.tryRunTransaction(
                  s,
                  function () {
                    C.synchronize(s);
                  },
                  a.GLocale.get(
                    new a.GLocaleKey("GLayerPanel", "action.reset-instance")
                  )
                );
            })
            .appendTo(y);
        var x = g ? "gravit-icon-lock" : "gravit-icon-unlock";
        (x = gDesigner.isTouchEnabled() ? x + "-small" : x),
          $("<span></span>")
            .addClass("layer-action layer-lock " + x)
            .toggleClass("g-active", !!g)
            .attr(
              "data-title",
              a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "action.toggle-lock")
              )
            )
            .on("click", function (e) {
              e.stopPropagation(), J.toggleLockStatusOfLayerOrItem(s);
            })
            .appendTo(y)
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: a.GLocale.get(
                  new a.GLocaleKey(
                    "GCommonNames",
                    "text.layer-toggle-lock-tooltip-title"
                  )
                ),
                description: a.GLocale.get(
                  new a.GLocaleKey(
                    "GCommonNames",
                    "text.layer-toggle-lock-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            ),
          y.toggleClass("layer-hidden", p);
        var S = p ? "gravit-icon-hide" : "gravit-icon-display";
        if (
          ((S = gDesigner.isTouchEnabled() ? S + "-small" : S),
          $("<span></span>")
            .addClass("layer-action layer-visibility " + S)
            .toggleClass("g-active", p)
            .attr(
              "data-title",
              a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "action.toggle-visibility")
              )
            )
            .on("click", function (e) {
              e.stopPropagation(), J.toggleHideStatusOfLayerOrItem(s);
            })
            .appendTo(y)
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: a.GLocale.get(
                  new a.GLocaleKey(
                    "GCommonNames",
                    "text.layer-toggle-visibility-tooltip-title"
                  )
                ),
                description: a.GLocale.get(
                  new a.GLocaleKey(
                    "GCommonNames",
                    "text.layer-toggle-visibility-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            ),
          s instanceof a.GLayer)
        ) {
          $("<span></span>")
            .addClass(
              "layer-action layer-outline gravit-icon-" +
                (h ? "ellipse" : "circle")
            )
            .toggleClass("g-active", h)
            .attr(
              "data-title",
              a.GLocale.get(
                new a.GLocaleKey("GLayerPanel", "action.toggle-outline")
              )
            )
            .on("click", function (e) {
              gDesigner.stats("layers_toggle_outline"), e.stopPropagation();
              var t = $(this);
              u ||
                i.GEditor.tryRunTransaction(
                  s,
                  function () {
                    s.setProperty("otl", !s.getProperty("otl")),
                      t.toggleClass(
                        "gravit-icon-ellipse",
                        s.getProperty("otl")
                      ),
                      t.toggleClass(
                        "gravit-icon-circle",
                        !s.getProperty("otl")
                      );
                  },
                  a.GLocale.get(
                    new a.GLocaleKey("GLayerPanel", "action.toggle-outline")
                  )
                );
            })
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: a.GLocale.get(
                  new a.GLocaleKey(
                    "GCommonNames",
                    "text.layer-toggle-outline-tooltip-title"
                  )
                ),
                learnMore:
                  "",
              })
            )
            .appendTo(y);
          $("<span></span>")
            .addClass("layer-color")
            .gPatternChooser({
              types: [a.GColor],
              hasOpacity: !1,
              asButton: !1,
              simplified: !0,
            })
            .gPatternChooser("value", s.getProperty("cls"))
            .on("patternchange", function (e, t, n, o) {
              o ||
                i.GEditor.tryRunTransaction(
                  s,
                  function () {
                    var e = s.getProperty("cls");
                    s.setProperty("cls", t),
                      s.acceptChildren(function (n) {
                        if (n instanceof a.GLayer) {
                          var o = n.getProperty("cls");
                          a.GUtil.equals(o, e) && n.setProperty("cls", t);
                        }
                      });
                  },
                  a.GLocale.get(
                    new a.GLocaleKey("GLayerPanel", "action.change-layer-color")
                  )
                );
            })
            .on("chooseropen", function () {
              o.options.patternChooserStatusChangeCallBack(!0);
            })
            .on("chooserclose", function (e, t, n) {
              o.options.patternChooserStatusChangeCallBack(!1);
            })
            .appendTo(y);
        }
        y.contextmenu(
          { context: m.LayerPanel },
          function (e) {
            if (
              $.inArray(
                s,
                gDesigner.getActiveDocument().getEditor().getSelection()
              ) < 0
            ) {
              var t = $(this).data("glayerpanel");
              t.options.clickCallback && t.options.clickCallback(s);
            }
            $(gDesigner.getWindows().getHtmlElement()).trigger(
              "contextmenu",
              e
            );
          }.bind(this)
        );
      }
    }
    function k(e, t, n) {
      var o = new g(e);
      return (
        n && (o.expanded = !0),
        $(this).data("glayerpanel").vtree.insertNodeBefore(t, o),
        o
      );
    }
    function O(e, t, n) {
      var o = new g(e);
      return (
        n && (o.expanded = !0),
        $(this).data("glayerpanel").vtree.appendNode(t, o),
        o
      );
    }
    function F(e) {
      $(this).data("glayerpanel").vtree.removeNode(e);
    }
    function R(e) {
      do {
        if (e instanceof a.GSymbol) return e.isMaster() ? null : e;
        e = e.getParent();
      } while (e);
      return null;
    }
    function M(e, t) {
      var n = a.GUtil.uuid(),
        o = $(this).data("glayerpanel"),
        i = o.vtree;
      if (
        !t &&
        e.getParent() &&
        e.getParent().hasMixin(a.GNode.Container) &&
        !(e.getParent() instanceof a.GScene) &&
        !(e.getParent() instanceof a.GPage) &&
        !P.call(this, e.getParent())
      )
        return;
      i.beginUpdate();
      const r = (function (e) {
        let t = e.getPrevious();
        for (; t && !(t instanceof a.GElement); ) t = t.getPrevious();
        return t;
      })(e);
      var s,
        l = r ? D.call(this, r) : null;
      if (l) s = k.call(this, n, l, e.hasFlag(a.GNode.Flag.Expanded));
      else {
        var c = e.getParent(),
          d =
            !c || c instanceof a.GScene || c instanceof a.GPage
              ? null
              : D.call(this, c);
        s = O.call(this, n, d, e.hasFlag(a.GNode.Flag.Expanded));
      }
      if (
        ((o.layersTreeNodeMap[n] = { element: null, node: e, treeNode: s }),
        o.layersTreeNodeMapByNodes.set(e, {
          element: null,
          treeNode: s,
          treeId: n,
        }),
        e.hasMixin(a.GNode.Container))
      )
        for (var u = e.getFirstChild(); null !== u; u = u.getNext())
          (u instanceof a.GLayer || u instanceof a.GItem) && M.call(this, u, t);
      i.endUpdate();
    }
    function N(e) {
      var t = D.call(this, e);
      t && (F.call(this, t), L.call(this, e));
    }
    function B(e, t) {
      return !e.blockHandlers || !(!e.ignoreBlock || e.ignoreBlock !== t);
    }
    function U(e) {
      $(this).data("glayerpanel");
      var t = e.targetNode;
      if (
        t instanceof a.GLayer ||
        (t instanceof a.GItem &&
          !(
            t instanceof a.GPathBase &&
            t.getParent() &&
            (t.getParent() instanceof a.GPGEdge ||
              t.getParent() instanceof a.GCompoundPath.Paths)
          ))
      )
        switch (e.type) {
          case a.GSymbol.AfterSiblingUpdate.INSERT:
            M.call(this, t);
            break;
          case a.GSymbol.AfterSiblingUpdate.REMOVE:
            N.call(this, t);
        }
    }
    function j(e) {
      B($(this).data("glayerpanel"), e.node) &&
        (e.node instanceof a.GLayer ||
          (e.node instanceof a.GItem &&
            !(
              e.node instanceof a.GPathBase &&
              e.node.getParent() &&
              (e.node.getParent() instanceof a.GPGEdge ||
                e.node.getParent() instanceof a.GCompoundPath.Paths)
            ) &&
            !(function (e) {
              var t = e.getScene();
              if (t) {
                var n = e.getPage(),
                  o = t.getActivePage();
                if (o && n && n !== o) return !0;
              }
              return !1;
            })(e.node))) &&
        M.call(this, e.node);
    }
    function K(e) {
      B($(this).data("glayerpanel"), e.node) &&
        (e.node instanceof a.GLayer || e.node instanceof a.GItem) &&
        N.call(this, e.node);
    }
    function V(e) {
      e.temporary ||
        (!$(this).data("glayerpanel").blockHandlers &&
          (e.properties.some((e) => y.indexOf(e) >= 0) || R(e.node)) &&
          (e.node instanceof a.GLayer || e.node instanceof a.GItem) &&
          $(this).data("glayerpanel").vtree.requestInvalidation());
    }
    function H() {
      $(this).data("glayerpanel").vtree.requestInvalidation();
    }
    function W(e) {
      "touch" === e.key && J._updateLayout.call(this);
    }
    function z(e) {
      var t = $(this).data("glayerpanel"),
        n = $(this).data("glayerpanel").vtree;
      let { onlyUpdateStyle: o } = t;
      if (B(t, e.node)) {
        var i = !1;
        if (e.node instanceof a.GLayer || e.node instanceof a.GItem)
          if (
            e.flag === a.GElement.Flag.Hidden ||
            e.flag === a.GElement.Flag.PartialLocked ||
            e.flag === a.GElement.Flag.FullLocked ||
            e.flag === a.GNode.Flag.Selected ||
            e.flag === a.GNode.Flag.Active
          ) {
            var r = e.node.getPage(),
              s = e.node.getScene(),
              l = s && s.getActivePage();
            (l && r && l !== r) ||
              ((i = !0), o || (o = e.flag === a.GNode.Flag.Active));
          } else if (!t.blockHighlight && e.flag === a.GNode.Flag.Highlighted) {
            var c = e.node,
              d = function (e) {
                var t = D.call(this, e);
                return t && t.isVisible();
              }.bind(this);
            (d(c) || c.findParent(d)) && (i = !0);
          }
        if (
          gDesigner.getSetting("auto_expand_layers") &&
          e.flag === a.GNode.Flag.Selected &&
          e.node &&
          e.node.hasFlag(a.GNode.Flag.Selected)
        ) {
          var u = D.call(this, e.node);
          u && (n.expandAndFocus(u, i) ? (t.currentFocus = u) : (i = !0));
        }
        e.node instanceof a.GPage &&
          e.flag === a.GNode.Flag.Active &&
          (X.call(this), q.call(this), (i = !1)),
          i &&
            (o
              ? setTimeout((t) => {
                  Q.call(this, e.node);
                })
              : n.requestInvalidation());
      }
    }
    function q() {
      var e = $(this).data("glayerpanel");
      if ((e.vtree.beginUpdate(), e.scene && e.scene.getActivePage()))
        for (
          var t = e.scene.getActivePage().getFirstChild();
          null !== t;
          t = t.getNext()
        )
          (t instanceof a.GLayer || t instanceof a.GItem) &&
            M.call(this, t, !0);
      e.vtree.endUpdate(), Y.call(this);
    }
    function Y() {
      gDesigner.isTouchEnabled() &&
        $(this)
          .parent()
          .css(
            "height",
            parseInt($(this).find(".vscroller").css("height"), 10) + h + "px"
          );
    }
    function X() {
      var e = $(this).data("glayerpanel");
      e.vtree.clean(),
        (e.layersTreeNodeMap = {}),
        (e.layersTreeNodeMapByNodes = new Map());
    }
    function Q(e) {
      $(this).data("glayerpanel");
      var t = P.call(this, e);
      if (!t) return null;
      var n = G.call(this, t);
      if (!n) return null;
      var o = n.element,
        i = o.parent(),
        r = !1;
      if (e.hasMixin(a.GNode.Container))
        for (var s = e.getFirstChild(); null !== s && !r; s = s.getNext())
          s instanceof a.GItem && s.hasFlag(a.GNode.Flag.Selected) && (r = !0);
      e.getParent() && e instanceof a.GItem && Q.call(this, e.getParent()),
        i
          .toggleClass("g-active", e.hasFlag(a.GNode.Flag.Active))
          .toggleClass("g-selected", e.hasFlag(a.GNode.Flag.Selected))
          .toggleClass("g-has-selection", r),
        o.toggleClass("g-selected", e.hasFlag(a.GNode.Flag.Selected));
    }
    a.GObject.inheritAndMix(v, a.GObject);
    var J = {
      init: function (e) {
        return (
          (e = $.extend(
            {
              nodeStyle: "layer-row",
              expandStyle: "layer-arrow gravit-icon-right",
              collapseStyle: "layer-arrow gravit-icon-down",
              freeHeight: h,
              insertIntoStyle: "g-drop",
              upSeparatorSpan1Style: "g-up-separator-span1",
              upSeparatorSpan2Style: "g-up-separator-span2",
              downSeparatorSpan1Style: "g-down-separator-span1",
              downSeparatorSpan2Style: "g-down-separator-span2",
              renderer: I.bind(this),
              expandRenderer: A.bind(this),
              separatorRenderer: null,
              canDropCallback: b.bind(this),
              moveCallback: null,
              isDuplicateEffectCallback: null,
              duplicateCallback: null,
              clickCallback: null,
              startDraggingCallback: null,
              patternChooserStatusChangeCallBack: null,
            },
            e
          )),
          this.each(function () {
            $(this)
              .addClass("g-layer-panel")
              .data("glayerpanel", {
                vtree: new p(
                  this,
                  E.bind(this),
                  e.nodeStyle,
                  e.expandRenderer ? e.expandRenderer : null,
                  e.expandStyle == e.collapseStyle ? e.expandStyle : null,
                  e.separatorRenderer ? e.separatorRenderer : null,
                  e.freeHeight,
                  e.insertIntoStyle,
                  _.bind(this),
                  w.bind(this),
                  e.isDuplicateEffectCallback,
                  C.bind(this),
                  x.bind(this),
                  S.bind(this),
                  e.upSeparatorSpan1Style,
                  e.upSeparatorSpan2Style,
                  e.downSeparatorSpan1Style,
                  e.downSeparatorSpan2Style,
                  !1,
                  15,
                  21
                ),
                options: e,
                layersTreeNodeMap: {},
                layersTreeNodeMapByNodes: new Map(),
                scene: null,
                currentFocus: null,
              });
          })
        );
      },
      refresh: function () {
        $(this).data("glayerpanel").vtree.refresh();
      },
      relayout: function () {
        var e = $(this).data("glayerpanel"),
          t = e.vtree,
          n = e.currentFocus;
        n && t.expandAndFocus(n), t.requestInvalidation();
      },
      scene: function (e) {
        var t = $(this),
          n = t.data("glayerpanel");
        if (!arguments.length) return n.scene;
        if (e !== n.scene) {
          if (n.scene && n.scene.hasMixin(a.GEventTarget))
            n.scene.removeEventListener(
              a.GNode.AfterInsertEvent,
              n.afterNodeInsertHandler,
              this
            ),
              n.scene.removeEventListener(
                a.GNode.BeforeRemoveEvent,
                n.beforeNodeRemoveHandler,
                this
              ),
              n.scene.removeEventListener(
                a.GNode.AfterPropertiesChangeEvent,
                n.afterPropertiesChangeHandler,
                this
              ),
              n.scene.removeEventListener(
                a.GNode.AfterFlagChangeEvent,
                n.afterFlagChangeHandler,
                this
              ),
              n.scene.removeEventListener(
                a.GSymbol.AfterSiblingUpdate,
                n.afterSiblingUpdate,
                this
              ),
              gDesigner.removeEventListener(
                u.default,
                n.settingChangedEvent,
                this
              ),
              (o = n.scene.getWorkspace()) &&
                o
                  .getFontManager()
                  .removeEventListener(
                    a.GFontManager.FontAvailableEvent,
                    n.fontAvailableEvent,
                    this
                  );
          if ((X.call(this), (n.scene = e), n.scene)) {
            var o;
            if (n.scene.hasMixin(a.GEventTarget))
              (n.afterNodeInsertHandler = j.bind(this)),
                (n.beforeNodeRemoveHandler = K.bind(this)),
                (n.afterPropertiesChangeHandler = V.bind(this)),
                (n.afterFlagChangeHandler = z.bind(this)),
                (n.afterSiblingUpdate = U.bind(this)),
                (n.fontAvailableEvent = H.bind(this)),
                (n.settingChangedEvent = W.bind(this)),
                n.scene.addEventListener(
                  a.GSymbol.AfterSiblingUpdate,
                  n.afterSiblingUpdate,
                  this
                ),
                n.scene.addEventListener(
                  a.GNode.AfterInsertEvent,
                  n.afterNodeInsertHandler,
                  this
                ),
                n.scene.addEventListener(
                  a.GNode.BeforeRemoveEvent,
                  n.beforeNodeRemoveHandler,
                  this
                ),
                n.scene.addEventListener(
                  a.GNode.AfterPropertiesChangeEvent,
                  n.afterPropertiesChangeHandler,
                  this
                ),
                n.scene.addEventListener(
                  a.GNode.AfterFlagChangeEvent,
                  n.afterFlagChangeHandler,
                  this
                ),
                gDesigner.addEventListener(
                  u.default,
                  n.settingChangedEvent,
                  this
                ),
                (o = n.scene.getWorkspace()) &&
                  o
                    .getFontManager()
                    .addEventListener(
                      a.GFontManager.FontAvailableEvent,
                      n.fontAvailableEvent,
                      this
                    );
            q.call(this), J._updateLayout.call(this);
          }
        }
        return this;
      },
      blockHandlers: function (e) {
        $(this).data("glayerpanel").blockHandlers = !!e;
      },
      onlyUpdateStyle: function (e) {
        $(this).data("glayerpanel").onlyUpdateStyle = !!e;
      },
      ignoreBlock: function (e) {
        $(this).data("glayerpanel").ignoreBlock = e;
      },
      setBlockHighlight: function (e) {
        $(this).data("glayerpanel").blockHighlight = !!e;
      },
      getLastVisitedDroppable: function () {
        return $(this).data("glayerpanel").vtree.getLastVisitedDroppable();
      },
      getTreeNode: function (e) {
        var t = null;
        return $(this).data("glayerpanel") && (t = D.call(this, e)), t;
      },
      getItem: function (e) {
        return T.call(this, e.id);
      },
      getTitleOfLayer: function (e) {
        return e.children(".layer-title-group");
      },
      getSelected: function () {
        return $(this).children(".g-selected");
      },
      toggleLockStatusOfLayerOrItem: function (e) {
        gDesigner.stats("layers_change_locktype");
        const { parentLockType: t } = (0, c.getLayerOrItemStatus)(e);
        if (!t || t === a.GBlock.LockType.Partial) {
          let n = e.getProperty("lkt");
          const o = e.getProperty("plkt");
          if (
            (n
              ? o &
                  (a.GBlock.ProgramLck.NoEdit |
                    a.GBlock.ProgramLck.NoMove |
                    a.GBlock.ProgramLck.NoNewChildren |
                    a.GBlock.ProgramLck.NoDelete) || (n = null)
              : (n = a.GBlock.LockType.Full),
            t !== a.GBlock.LockType.Partial || null !== n)
          ) {
            const t = [];
            if (r.GPlatform.modifiers.optionKey) {
              for (
                let o = e.getParent().getFirstChild();
                null != o;
                o = o.getNext()
              ) {
                const e = o.getProperty("lkt");
                n === e ||
                  (e === a.GBlock.LockType.Full &&
                    n === a.GBlock.LockType.Partial) ||
                  t.push(o);
              }
            } else t.push(e);
            t.length &&
              i.GEditor.tryRunTransaction(
                e,
                function () {
                  for (let e = 0; e < t.length; ++e)
                    n === a.GBlock.LockType.Full &&
                      t[e].accept((e) => {
                        e.removeFlag(a.GNode.Flag.Selected);
                      }),
                      t[e].setProperty("lkt", n);
                },
                a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", "action.toggle-lock")
                )
              );
          }
        }
      },
      toggleHideStatusOfLayerOrItem: function (e) {
        gDesigner.stats("layers_toggle_visibility");
        const { parentHidden: t } = (0, c.getLayerOrItemStatus)(e);
        if (!t) {
          const t = !e.getProperty("vis"),
            n = [];
          if (r.GPlatform.modifiers.optionKey) {
            for (
              let o = e.getParent().getFirstChild();
              null != o;
              o = o.getNext()
            ) {
              const e = o.getProperty("vis");
              null !== e && e !== t && n.push(o);
            }
          } else n.push(e);
          i.GEditor.tryRunTransaction(
            e,
            function () {
              for (let e = 0; e < n.length; ++e)
                n[e].removeFlag(a.GNode.Flag.Highlighted),
                  n[e].setProperty("vis", t);
            },
            a.GLocale.get(
              new a.GLocaleKey("GCommonNames", "action.toggle-visibility")
            )
          );
        }
      },
      resetVTreeRowHeight: function (e) {
        $(this).data("glayerpanel").vtree.resetRowHeight(e);
      },
      getCurrentFocusedNode: function () {
        return $(this).data("glayerpanel").currentFocus;
      },
      setCurrentFocusedNode: function (e) {
        $(this).data("glayerpanel").currentFocus = e;
      },
      _updateLayout: function () {
        const e = $(this).data("glayerpanel"),
          t = e && e.vtree;
        if (t) {
          const e = gDesigner.isTouchEnabled();
          t.setFreeHeight(e ? f : h), t.setAnimatedDragEnabled(e);
        }
      },
    };
    (e.exports = v),
      ($.fn.gLayerPanel = function (e) {
        return J[e]
          ? J[e].apply(this, Array.prototype.slice.call(arguments, 1))
          : "object" != typeof e && e
          ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
          : J.init.apply(this, arguments);
      });
  }