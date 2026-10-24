/**
 * GOutlineSidebar
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GOutlineSidebar() {
  // Constructor (reconstructed)
}

// Prototype methods
GOutlineSidebar.prototype._isDuplicateEffectCallback = function (e) {
        return e.altKey;
      }

GOutlineSidebar.prototype._duplicateLayerTreeNodeCallback = function (e, t, n) {
        if (n && e && e.hasMixin(a.GNode.Container) && n.length) {
          this._layerPanel.gLayerPanel("blockHandlers", !1);
          var o = this._document.getScene();
          i.GEditor.tryRunTransaction(
            o,
            function () {
              this._document.getEditor().clearSelection(),
                n.length > 1 && e.beginUpdate();
              for (var o = [], r = 0; r < n.length; ++r) {
                var s = n[r];
                s.validateInsertion(e) &&
                  s.hasMixin(a.GNode.Store) &&
                  i.GEditor.validateBlockInsertion(e, s) &&
                  (s = s.clone()) &&
                  o.push(s);
              }
              if (
                (this._document
                  .getEditor()
                  .insertElements(o, !0, !0, !1, !0, e, t),
                e instanceof a.GCompoundShape)
              )
                for (var l = 0; l < o.length; ++l) o[l].assignStyleFrom(e);
              else if (e instanceof a.GShape) {
                var c = e.getPaintBBox();
                if (c) {
                  var d = c.getX(),
                    u = c.getY();
                  for (r = 0; r < o.length; ++r) {
                    var p = o[r],
                      g = p instanceof a.GElement ? p.getPaintBBox() : null;
                    if (g && !c.intersectsRect(g, !0)) {
                      var h = g.getX(),
                        f = g.getY();
                      null === d ||
                        null === h ||
                        (a.GMath.isEqualEps(d, h) &&
                          a.GMath.isEqualEps(u, f)) ||
                        p.transform(
                          new a.GTransform(1, 0, 0, 1, d - h, u - f),
                          !0
                        );
                    }
                  }
                }
              }
              n.length > 1 && e.endUpdate(),
                this._document.getEditor().updateSelection(!1, o);
            }.bind(this),
            a.GLocale.get(
              new a.GLocaleKey("GOutlineSidebar", "action.move-layer")
            )
          );
        }
      }

GOutlineSidebar.prototype._startLayerDraggingCallback = function (e) {
        var t = null;
        if (e) {
          gDesigner.stats("layers_start_drag"), (t = []);
          var n = this._document.getEditor();
          if (e.hasFlag(a.GNode.Flag.Selected)) {
            var o = n.getSelection();
            (t = this._filterLayerDraggable(o)), (t = a.GNode.order(t, !0));
          } else n.clearSelection(), t.push(e);
        }
        return t;
      }

GOutlineSidebar.prototype._patternChooserStatusChange = function (e) {
        this._layerToolbar.toggleClass("pattern-choose-actived", e);
      }

GOutlineSidebar.prototype._filterLayerDraggable = function (e) {
        var t = [];
        if (e)
          for (var n = 0; n < e.length; ++n) {
            var o = e[n];
            if (!o.hasFlag(a.GElement.Flag.PartialLocked)) {
              for (
                var i = false, r = o.getParent();
                null != r && !i;
                r = r.getParent()
              )
                i = r.hasFlag(a.GNode.Flag.Selected);
              i || t.push(o);
            }
          }
        return t;
      }

GOutlineSidebar.prototype._clickLayerTreeNodeCallback = function (e) {
        if (e) {
          e instanceof a.GCollabText
            ? gDesigner.stats("layers_select_collab-text")
            : gDesigner.stats("layers_select_layer"),
            this._document.getScene().updateActivePageForElem(e),
            this._document.getScene().updateActiveLayerForElem(e);
          var t = this._document.getEditor(),
            n = null,
            o = false;
          if (
            (e instanceof a.GItem
              ? (n = a.GItem)
              : e instanceof a.GLayer && (n = a.GLayer),
            n)
          ) {
            if (
              (jQuery(
                gDesigner
                  .getWindows()
                  .getActiveWindow()
                  .getView()
                  .getHtmlElement()
              )
                .find("> div[tabindex=0]")
                .focus(),
              r.GPlatform.modifiers.metaKey ||
                (!e.hasFlag(a.GNode.Flag.Selected) &&
                  !e.hasFlag(a.GElement.Flag.FullLocked) &&
                  !r.GPlatform.modifiers.shiftKey))
            )
              this._layerPanel.gLayerPanel("onlyUpdateStyle", !0),
                t.updateSelection(r.GPlatform.modifiers.metaKey, [e]),
                this._layerPanel.gLayerPanel("onlyUpdateStyle", !1),
                (o = true);
            else if (r.GPlatform.modifiers.shiftKey) {
              var i = t.getSelection(),
                s = null;
              if (i && i.length) {
                for (var l = i.length - 1; l >= 0 && !s; --l)
                  i[l] instanceof n && (s = i[l]);
                if (s && s !== e) {
                  var c = [];
                  if (
                    (this._document.getScene().accept(
                      function (e) {
                        return e instanceof n && c.push(e), !0;
                      },
                      !1,
                      !0
                    ),
                    c)
                  ) {
                    c = a.GNode.order(c);
                    var d = [],
                      u = false,
                      p = null,
                      g = null;
                    for (l = 0; l < c.length && (null === p || null === g); ++l)
                      c[l] === s || c[l] === e
                        ? ((u = !u),
                          d.push(c[l]),
                          c[l] === s ? (p = l) : (g = l))
                        : u && d.push(c[l]);
                    var m = s.getParent(),
                      y = e.getParent();
                    d = d.filter(
                      function (t) {
                        var n = this._layerPanel.gLayerPanel("getTreeNode", t);
                        if (e === t || s === t) return true;
                        var o = this._layerPanel.gLayerPanel(
                          "getItem",
                          n.parent
                        );
                        return o ? m === o : t !== m && t !== y;
                      }.bind(this)
                    );
                    var v = gDesigner.getSetting("auto_expand_layers");
                    gDesigner.setSetting("auto_expand_layers", !1),
                      d.length &&
                        (p > g && d.reverse(),
                        t.updateSelection(!1, d),
                        (o = true)),
                      setTimeout(function () {
                        gDesigner.setSetting("auto_expand_layers", v);
                      }, 50);
                  }
                } else t.updateSelection(!1, [e]), (o = true);
              }
            } else
              e.hasFlag(a.GNode.Flag.Selected) &&
                (this._layerPanel.gLayerPanel("onlyUpdateStyle", !0),
                t.clearSelection(),
                this._layerPanel.gLayerPanel("onlyUpdateStyle", !1),
                (o = true));
            if (o)
              if (r.GPlatform.modifiers.optionKey)
                t.hasSelection()
                  ? gDesigner.executeAction(f.ID, undefined, "outlinesidebar")
                  : gDesigner.executeAction(h.ID, undefined, "outlinesidebar");
              else if (
                e.hasMixin(a.GNode.Properties) &&
                e.getProperty("collab")
              ) {
                const t = this._document && this._document.getActiveWindow();
                t && t.scrollIntoView(e.getGeometryBBox());
              }
          }
        }
      }

GOutlineSidebar.prototype._deleteLayerOrItem = function () {
        gDesigner.stats("layers_delete_layer-or-item");
        var e = this._document.getEditor(),
          t = this._document.getScene(),
          n = t.getActiveLayer();
        e.hasSelection()
          ? i.GEditor.tryRunTransaction(
              t,
              function () {
                e.deleteSelection(!0);
                var o = t.getActiveLayer();
                n &&
                  n === o &&
                  (n.acceptChildren(
                    function (e) {
                      return e instanceof a.GItem;
                    },
                    !1,
                    !0
                  ) ||
                    t.deleteActiveLayer(n));
              },
              a.GLocale.get(
                new a.GLocaleKey("GOutlineSidebar", "action.delete-layer-item")
              )
            )
          : n &&
            i.GEditor.tryRunTransaction(
              t,
              function () {
                t.deleteActiveLayer(n);
              },
              a.GLocale.get(
                new a.GLocaleKey("GOutlineSidebar", "action.delete-layer-item")
              )
            );
      }

GOutlineSidebar.prototype._updateExport = function () {
        this._exportInstance.update(this._document, this._elements);
      }

GOutlineSidebar.prototype._updateTransformMode = function (e) {
        e !== this._transformMode &&
          ((this._transformMode = e), this._updateExport());
      }

GOutlineSidebar.prototype._afterFlagChangeEvent = function (e) {
        e.node instanceof a.GPage &&
          e.flag === a.GNode.Flag.Active &&
          (this._document.getEditor().hasSelection() || this._updateExport());
      }

GOutlineSidebar.prototype._afterPropertiesChanged = function (e) {
        !e.temporary &&
          (e.node instanceof a.GScene || e.node instanceof a.GPage) &&
          a.GUtil.containsOneOf(e.properties, ["w", "h"]) &&
          this._refreshPageModeSwitch(this._getMultiPageSwitcher());
      }

GOutlineSidebar.prototype._afterInsert = function (e) {
        var t = e.node;
        t instanceof a.GPage &&
          0 === t.getProperty("w") &&
          this._refreshPageModeSwitch(this._getMultiPageSwitcher());
      }

GOutlineSidebar.prototype.toString = function () {
        return "[Object GOutlineSidebar]";
      }

module.exports = GOutlineSidebar;
