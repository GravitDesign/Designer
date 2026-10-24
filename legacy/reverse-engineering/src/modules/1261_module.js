/**
 * Webpack Module #1261
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(57), n(4), n(13);
    var i = n(15),
      a = n(53),
      r = n(1),
      s = n(10),
      l = n(67),
      c = o(n(340)),
      d = o(n(807)),
      u = o(n(198)),
      p = n(1161),
      g = o(n(565)),
      h = n(123),
      f = n(450);
    const m = n(607),
      y = n(44);
    function v() {}
    r.GObject.inherit(v, h),
      (v.prototype._panel = null),
      (v.prototype._advancedFillPanel = null),
      (v.prototype._toolbar = null),
      (v.prototype._elements = null),
      (v.prototype._document = null),
      (v.prototype._styleEditorChange = !1),
      (v.prototype._styleEdOn = !1),
      (v.prototype._ownChange = !1),
      (v.prototype._chooserElem = null),
      (v.prototype.init = function (e, t) {
        (this._panel = e.addClass("fill-properties-panel")),
          (this._toolbar = t),
          this.setTouchTools([
            new c.default({
              id: "fill",
              icon: "gravit-icon-touch-fill",
              panel: this._panel,
              toolbar: this._toolbar,
              panelWidth: "368px",
            }),
          ]);
        var n = this;
        this._advancedFillPanel = $("<div></div>").gOverlay({
          releaseOnClose: !1,
        });
        var o = function (e) {
          if ("evenodd" === e)
            return $("<select></select>")
              .attr("data-property", "evenodd")
              .append(
                $("<option></option>")
                  .attr("value", "0")
                  .text(
                    r.GLocale.get(
                      new r.GLocaleKey("GCommonNames", "evenodd.non-zero")
                    )
                  )
              )
              .append(
                $("<option></option>")
                  .attr("value", "1")
                  .text(
                    r.GLocale.get(
                      new r.GLocaleKey("GCommonNames", "evenodd.even-odd")
                    )
                  )
              )
              .on("change", function () {
                gDesigner.stats(
                  "fill_toggle_fill-rule",
                  "1" === $(this).val() ? "enable" : "disable"
                ),
                  n._assignProperty(
                    "evenodd",
                    "1" === $(this).val(),
                    r.GLocale.get(
                      new r.GLocaleKey(
                        "GCommonNames",
                        "action.change-fill-rule"
                      )
                    )
                  );
              });
          throw new Error("Unknown input property: " + e);
        }.bind(this);
        this._toolbar.addClass("list-toolbar fill-toolbar"),
          $("<label></label>")
            .text(
              r.GLocale.get(
                new r.GLocaleKey("GFillPaintLayerProperties", "title")
              )
            )
            .appendTo(this._toolbar),
          $("<button></button>")
            .attr(
              "data-title",
              r.GLocale.get(
                new r.GLocaleKey(
                  "GFillPaintLayerProperties",
                  "action.advanced-settings"
                )
              )
            )
            .addClass("fill completely-fill g-active")
            .append(
              $("<span></span>").addClass("gravit-icon-touch-completely-fill")
            )
            .on(
              "click",
              function (e) {
                $(".completely-fill").addClass("g-active"),
                  $(".winding-fill").removeClass("g-active"),
                  n._assignProperty(
                    "evenodd",
                    !1,
                    r.GLocale.get(
                      new r.GLocaleKey(
                        "GCommonNames",
                        "action.change-fill-rule"
                      )
                    )
                  );
              }.bind(this)
            )
            .appendTo(this._toolbar),
          $("<button></button>")
            .attr(
              "data-title",
              r.GLocale.get(
                new r.GLocaleKey(
                  "GFillPaintLayerProperties",
                  "action.advanced-settings"
                )
              )
            )
            .addClass("fill winding-fill")
            .append(
              $("<span></span>").addClass("gravit-icon-touch-winding-fill")
            )
            .on(
              "click",
              function (e) {
                $(".winding-fill").addClass("g-active"),
                  $(".completely-fill").removeClass("g-active"),
                  n._assignProperty(
                    "evenodd",
                    !0,
                    r.GLocale.get(
                      new r.GLocaleKey(
                        "GCommonNames",
                        "action.change-fill-rule"
                      )
                    )
                  );
              }.bind(this)
            )
            .appendTo(this._toolbar),
          $("<button></button>")
            .attr(
              "data-title",
              r.GLocale.get(
                new r.GLocaleKey(
                  "GFillPaintLayerProperties",
                  "action.advanced-settings"
                )
              )
            )
            .attr("data-action", "settings")
            .addClass("fill-settings")
            .append($("<span></span>").addClass("gravit-icon-settings"))
            .on(
              "click",
              function (e) {
                gDesigner.stats("fill_open_advancedfillpanel"),
                  this._advancedFillPanel.gOverlay(
                    "open",
                    $(e.target).closest("button")
                  );
              }.bind(this)
            )
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: r.GLocale.get(
                  new r.GLocaleKey(
                    "GFillPaintLayerProperties",
                    "text.fill-rule-tooltip-title"
                  )
                ),
                description: r.GLocale.get(
                  new r.GLocaleKey(
                    "GFillPaintLayerProperties",
                    "text.fill-rule-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            )
            .appendTo(this._toolbar),
          $("<button></button>")
            .attr("data-action", "remove")
            .attr(
              "data-title",
              r.GLocale.get(
                new r.GLocaleKey(
                  "GFillPaintLayerProperties",
                  "action.remove-selected"
                )
              )
            )
            .append($("<span></span>").addClass("gravit-icon-trash"))
            .append($("<span></span>").addClass("gravit-icon-touch-trash"))
            .on("click", function (e) {
              gDesigner.stats("fill_remove_fill"), e.stopPropagation();
              var t = n._getSelectedPaintLayer();
              t &&
                a.GEditor.tryRunTransaction(
                  n._elements[0],
                  function () {
                    var e = [];
                    n._iterateEqualPaintLayer(t, function (t) {
                      e.push(t);
                    }),
                      r.GUtil.each(e, function (e, t) {
                        t.getParent().removeChild(t);
                      });
                  },
                  r.GLocale.get(
                    new r.GLocaleKey(
                      "GFillPaintLayerProperties",
                      "action.remove"
                    )
                  )
                );
              const o = gDesigner
                .getRightSidebars()
                .getSidebar(u.default.SidebarsIds.GInspectorSidebar);
              o.trigger(new d.default(d.default.Type.ChildRemoved, o));
            })
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: r.GLocale.get(
                  new r.GLocaleKey(
                    "GFillPaintLayerProperties",
                    "text.remove-layer-tooltip-title"
                  )
                ),
                description: r.GLocale.get(
                  new r.GLocaleKey(
                    "GFillPaintLayerProperties",
                    "text.remove-layer-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            )
            .appendTo(this._toolbar),
          $("<button></button>")
            .attr("data-action", "add")
            .attr(
              "data-title",
              r.GLocale.get(
                new r.GLocaleKey("GFillPaintLayerProperties", "action.add")
              )
            )
            .append($("<span></span>").addClass("gravit-icon-plus"))
            .append($("<span></span>").addClass("gravit-icon-touch-plus"))
            .on(
              "click",
              function (e) {
                gDesigner.stats("fill_add_fill"),
                  a.GEditor.tryRunTransaction(
                    n._elements[0],
                    function () {
                      const e = n._document && n._document.getScene(),
                        t = e && e.getProperty("cm"),
                        o = r.GColorHelper.convertColor(
                          r.GRGBColor.BLACK,
                          t || r.GColor.ColorModes.RGB
                        );
                      for (var i = 0; i < n._elements.length; ++i) {
                        var a = new r.GStylable.FillPaintLayer();
                        a.setProperty("_pt", o),
                          n._elements[i].getPaintLayers().appendChild(a);
                      }
                    },
                    r.GLocale.get(
                      new r.GLocaleKey(
                        "GFillPaintLayerProperties",
                        "action.add"
                      )
                    )
                  ),
                  $(this._toolbar).gAccordion("toggleOpen", !0),
                  $(this._toolbar).gAccordion("init", $(this._panel));
                const t = gDesigner
                  .getRightSidebars()
                  .getSidebar(u.default.SidebarsIds.GInspectorSidebar);
                t.trigger(new d.default(d.default.Type.ChildAdded, t));
              }.bind(this)
            )
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: r.GLocale.get(
                  new r.GLocaleKey(
                    "GFillPaintLayerProperties",
                    "text.add-layer-tooltip-title"
                  )
                ),
                description: r.GLocale.get(
                  new r.GLocaleKey(
                    "GFillPaintLayerProperties",
                    "text.add-layer-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            )
            .appendTo(this._toolbar),
          $("<div></div>")
            .gPropertyRow({
              label: r.GLocale.get(
                new r.GLocaleKey("GFillPaintLayerProperties", "text.fill-rule")
              ),
              columns: [{ width: "100%", content: o("evenodd") }],
            })
            .appendTo(this._advancedFillPanel),
          gDesigner
            .getWorkspace()
            .getStyleEdManager()
            .addEventListener(
              a.GStyleEdManager.EditorEvent,
              this._styleEditorEventHandler,
              this
            ),
          this._panel.data("contextmenu", !0),
          this._panel.on("mouseenter", (e) => {
            gDesigner.setMouseOverContext(
              m.FillPropertiesPanel,
              e,
              function (e) {
                var t = this._panel.find(".copy-info-overlay").eq(0),
                  n = this._panel.find(".fill-block.g-selected") || null,
                  o = (n && n.position().top) || 0,
                  i = $("<span/>")
                    .addClass("copy-info-overlay")
                    .css({ top: o })
                    .text(
                      r.GLocale.get(
                        new r.GLocaleKey(
                          "GFillPaintLayerProperties",
                          "text.copy-fill"
                        )
                      )
                    );
                t && t.remove(),
                  this._panel.append(i),
                  setTimeout(() => {
                    i.animate({ opacity: 0, top: "+=20" }, 500, i.remove);
                  }, 1e3);
              }.bind(this)
            ),
              this._panel.on("mousemove.check-context", (e) => {
                var t = this._panel.outerHeight(),
                  n = this._panel.offset();
                e.clientY > n.top + t - 2 &&
                  (gDesigner.setMouseOverContext(null, null, null),
                  this._panel.off("mousemove.check-context"));
              });
          }),
          this._panel.on("mouseleave", () => {
            this._panel.off("mousemove.check-context"),
              gDesigner.setMouseOverContext(null, null, null);
          });
      }),
      (v.prototype.update = function (e, t, n) {
        const o = this._styleEditorChange;
        if (
          (this._styleEditorChange && (this._styleEditorChange = !1),
          this._ownChange)
        )
          return !0;
        if (
          (this._chooserElem && this._chooserElem.gPatternChooser("close"),
          this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                r.GNode.AfterInsertEvent,
                this._afterInsert,
                this
              ),
            this._document
              .getScene()
              .removeEventListener(
                r.GNode.BeforeRemoveEvent,
                this._beforeRemove,
                this
              ),
            this._document
              .getScene()
              .removeEventListener(
                r.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange,
                this
              ),
            (this._document = null)),
          (this._elements = []),
          e)
        ) {
          e.getEditor();
          for (var i = 0; i < t.length; ++i) {
            var s = t[i],
              l = function (e, t) {
                t.hasMixin(r.GStylable) &&
                  t
                    .getStylePropertySets()
                    .indexOf(r.GStylable.PropertySet.FillPaintLayers) >= 0 &&
                  this._elements.push(t);
              }.bind(this),
              c = a.GElementEditor.getEditor(s);
            c && c.getStylableParts()
              ? r.GUtil.each(c.getStylableParts(), l)
              : l(null, s);
          }
          if (this._elements.length)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  r.GNode.AfterInsertEvent,
                  this._afterInsert,
                  this
                ),
              this._document
                .getScene()
                .addEventListener(
                  r.GNode.BeforeRemoveEvent,
                  this._beforeRemove,
                  this
                ),
              this._document
                .getScene()
                .addEventListener(
                  r.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              o || this._updateProperties(n),
              !0
            );
        }
        return !1;
      }),
      (v.prototype._styleEditorEventHandler = function (e) {
        this._styleEdOn &&
          e.type == a.GStyleEdManager.EditorEventType.PrepareModifiedEvent &&
          (this._styleEditorChange = !0);
      }),
      (v.prototype._updateProperties = function (e) {
        if (this._elements && this._elements.length) {
          var t = this._elements[0];
          this._panel.find(".fill-block").remove();
          var n = t.getPaintLayers().getFillLayers();
          r.GUtil.each(
            n,
            function (t, n) {
              n && this._insertPaintLayer(n, e);
            }.bind(this)
          ),
            this._advancedFillPanel
              .find('[data-property="evenodd"]')
              .prop("disabled", !t.hasProperty("evenodd"))
              .val(t.getProperty("evenodd") ? "1" : "0"),
            this._updateToolbar();
        } else console.warn("GFillPaintLayerProperties: empty _elements array");
      }),
      (v.prototype._assignProperty = function (e, t, n) {
        this._assignProperties([e], [t], n);
      }),
      (v.prototype._assignProperties = function (e, t, n) {
        if (this._document) {
          this._ownChange = !0;
          var o = this._document.getEditor();
          o.beginTransaction();
          try {
            for (var i = 0; i < this._elements.length; ++i)
              this._elements[i].setProperties(e, t);
          } finally {
            o.commitTransaction(
              n ||
                r.GLocale.get(
                  new r.GLocaleKey("GFillPaintLayerProperties", "action.modify")
                )
            ),
              (this._ownChange = !1);
          }
        } else
          console.warn("GFillPaintLayerProperties: empty _document property");
      }),
      (v.prototype._updateToolbar = function () {
        var e = this._panel.find(".fill-block").length > 0;
        this._toolbar.toggleClass("empty-list", !e),
          this._toolbar
            .find("[data-action=settings]")
            .css("display", e ? "" : "none"),
          this._toolbar
            .find("[data-action=remove]")
            .css("display", e ? "" : "none");
      }),
      (v.prototype._insertPaintLayer = function (e, t) {
        var n = this,
          o = !1,
          c = null,
          d = null,
          u = null,
          h = null,
          m = null,
          v = 0,
          _ = 0,
          b = function (t, n, o, i) {
            if (o)
              this._iterateEqualPaintLayer(e, function (e) {
                e.setProperties(t, n, !1, !1, !0);
              });
            else {
              if (!this._document) return;
              var s = null;
              if (i) {
                var l = e.getParent().getIndexOfChild(e);
                s = $.extend({ fillLayerIndex: l }, i);
              }
              this._ownChange = !0;
              var c = this._document.getEditor();
              c.beginTransaction();
              try {
                this._iterateEqualPaintLayer(e, function (e, o) {
                  var i = a.GElementEditor.getEditor(o);
                  (i && i.applyPropertiesToParts(t, n)) ||
                    e.setProperties(t, n);
                });
              } finally {
                c.commitTransaction(
                  r.GLocale.get(
                    new r.GLocaleKey(
                      "GFillPaintLayerProperties",
                      "action.change-properties"
                    )
                  ),
                  s
                ),
                  (this._ownChange = !1);
              }
            }
          }.bind(this),
          w = function (e) {
            if (c) {
              var t = $(e).data("paintLayer");
              if (t && (t !== c || i.GPlatform.modifiers.shiftKey))
                return c.getParent() === t.getParent();
            }
            return !1;
          },
          C = $("<div/>").addClass("g-drop-indicator"),
          x = function (e) {
            return "_bl" === e
              ? $("<select></select>")
                  .gBlendMode()
                  .gRichTooltip(
                    l.GRichTooltipConfig.from({
                      title: r.GLocale.get(
                        new r.GLocaleKey(
                          "GAppearanceProperties",
                          "text.blend-tooltip-title"
                        )
                      ),
                      description: r.GLocale.get(
                        new r.GLocaleKey(
                          "GAppearanceProperties",
                          "text.blend-tooltip-description"
                        )
                      ),
                      middle: !1,
                      forceShow: !0,
                      learnMore: s.LINKS.BLENDING_MODES_DOCUMENTATION_URL,
                    })
                  )
                  .attr("data-property", "_bl")
                  .on("change", function (e) {
                    gDesigner.stats(
                      "fill_change_blend-mode",
                      $(e.target).val()
                    ),
                      b(["_bl"], [$(e.target).val()]);
                  })
              : "_op" === e
              ? $("<input>")
                  .addClass("fill-op")
                  .attr("data-property", "_op")
                  .attr("type", "text")
                  .on("change", function (e, t) {
                    gDesigner.stats("fill_change_opacity"),
                      b(
                        ["_vs", "_op"],
                        [
                          !0,
                          (t ||
                            r.GLength.parseEquationValue(
                              $(this).gInputBox("value")
                            )) / 100,
                        ]
                      ),
                      $(e.target)
                        .parents(".touch")
                        .find(".transparency")
                        .gInputSlider(
                          "value",
                          r.GLength.parseEquationValue(
                            $(this).gInputBox("value")
                          )
                        );
                  })
                  .gInputBox({
                    minValue: 0,
                    maxValue: 100,
                    incrementValue: gDesigner.getOpacityIncrement(),
                    postfix: "%",
                  })
              : "_vs" === e
              ? $("<span></span>")
                  .attr("data-property", "_vs")
                  .addClass(
                    "fill-action fill-visibility gravit-icon-touch-show"
                  )
                  .attr(
                    "data-title",
                    r.GLocale.get(
                      new r.GLocaleKey(
                        "GCommonNames",
                        "action.toggle-visibility"
                      )
                    )
                  )
                  .on("click", function (e) {
                    gDesigner.stats("fill_hide_show"), e.stopPropagation();
                    var t = $(this).hasClass("gravit-icon-touch-hide");
                    $(this).removeClass(
                      "gravit-icon-touch-" + (t ? "hide" : "show")
                    ),
                      $(this).addClass(
                        "gravit-icon-touch-" + (t ? "show" : "hide")
                      ),
                      b(["_vs"], [t]);
                  })
              : "_ra" === e
              ? $("<div/>")
                  .addClass("transparency gravit-icon-touch-rectangle")
                  .gInputSlider({ type: "range", min: 0, max: 100, step: 1 })
                  .on("input", function (e) {
                    var t = $(e.target),
                      n = parseInt(t.gInputSlider("value"));
                    t.parents(".touch").find(".fill-op").trigger("change", [n]);
                  })
              : void 0;
          },
          S = $("<div></div>")
            .addClass("fill-block")
            .addClass("g-cursor-hand-open")
            .attr("data-drag-mode", g.default.PRESS_AND_HOLD)
            .data("paintLayer", e)
            .attr("draggable", "true")
            .on("mousedown", function (e) {
              (o =
                gDesigner.isTouchEnabled() &&
                e.originalEvent &&
                e.originalEvent.target
                  ? !!$(e.originalEvent.target).closest(".drag-indicator")
                      .length
                  : $(e.target).hasClass("fill-block") ||
                    $(e.target).hasClass("gravit-icon-drag-indicator") ||
                    $(e.target).hasClass("columns") ||
                    $(e.target).hasClass("column")),
                $(e.target)
                  .closest(".fill-block")
                  .toggleClass("g-draggable-disabled", !o);
            })
            .on("dragstart", function (e) {
              if (!o) return e.preventDefault(), void e.stopPropagation();
              var t = $(e.target).closest(".fill-block"),
                s = t.offset(),
                l = e.originalEvent;
              (d = window.gDragImage()).addClass(
                "drag-delete gravit-icon-trash"
              ),
                (h = n._panel.offset()),
                (m = n._panel.outerHeight()),
                (v = e.clientX - s.left),
                (_ = e.clientY - s.top),
                l.stopPropagation(),
                (c = t.data("paintLayer")),
                (l.dataTransfer.effectAllowed = "move"),
                l.dataTransfer.setData("text/plain", "dummy_data"),
                n._panel.find(".fill-block").each(function (e, t) {
                  $(t).append(
                    $("<div></div>")
                      .addClass("grid-drag-overlay")
                      .on("dragenter", function () {
                        var e = $(this.parentNode).data("paintLayer");
                        if (w(this.parentNode)) {
                          if (c && e && c.getParent() === e.getParent()) {
                            var t = c.getParent(),
                              n = t.getIndexOfChild(c),
                              o = t.getIndexOfChild(e);
                            n !== o &&
                              (n < o
                                ? C.insertBefore(this.parentNode)
                                : C.insertAfter(this.parentNode));
                          }
                        } else C.remove();
                      })
                      .on("dragleave", function () {
                        w(this.parentNode) &&
                          $(this).parent().find(".g-drop-indicator").remove();
                      })
                      .on("dragover", function (e) {
                        var t = e.originalEvent;
                        w(this.parentNode) &&
                          (t.preventDefault(),
                          t.stopPropagation(),
                          (t.dataTransfer.dropEffect = "move"));
                      })
                      .on("drop", function (e) {
                        var t = $(this.parentNode)
                          .closest(".fill-block")
                          .data("paintLayer");
                        if (
                          (n._panel.find(".g-drop-indicator").remove(),
                          n._panel.find(".grid-drag-overlay").remove(),
                          c && t && c.getParent() === t.getParent())
                        ) {
                          var o = c.getParent(),
                            s = o.getIndexOfChild(c),
                            l = o.getIndexOfChild(t);
                          a.GEditor.tryRunTransaction(
                            o,
                            function () {
                              if (i.GPlatform.modifiers.shiftKey) {
                                var e = c.clone();
                                o.insertChild(e, s < l ? t.getNext() : t);
                              } else
                                s !== l &&
                                  (o.removeChild(c),
                                  o.insertChild(c, s < l ? t.getNext() : t));
                            },
                            i.GPlatform.modifiers.shiftKey
                              ? r.GLocale.get(
                                  new r.GLocaleKey(
                                    "GFillPaintLayerProperties",
                                    "action.duplicate"
                                  )
                                )
                              : r.GLocale.get(
                                  new r.GLocaleKey(
                                    "GFillPaintLayerProperties",
                                    "action.move"
                                  )
                                )
                          ),
                            n._updateProperties(),
                            n._setSelectedPaintLayer(c);
                        }
                        c = null;
                      })
                  );
                });
            })
            .on("drag", function (e) {
              u = (0, p.handleDragForDeleteIcon)(e, d, h, m, v, _);
            })
            .on("dragend", function (e) {
              var t = e.originalEvent,
                o = $(e.target)
                  .closest(".fill-block")
                  .closest(".fill-block")
                  .data("paintLayer");
              if (
                (n._panel.find(".g-drop-indicator").remove(),
                n._panel.find(".grid-drag-overlay").remove(),
                c && o && c.getParent() === o.getParent())
              ) {
                var s = c.getParent(),
                  l = s.getIndexOfChild(c),
                  p = s.getIndexOfChild(o);
                a.GEditor.tryRunTransaction(
                  s,
                  function () {
                    if (i.GPlatform.modifiers.shiftKey) {
                      var e = c.clone();
                      s.insertChild(e, l < p ? o.getNext() : o);
                    } else
                      l !== p &&
                        (s.removeChild(c),
                        s.insertChild(
                          c,
                          l < p ? o.getNext() : o.getPrevious()
                        ));
                  },
                  i.GPlatform.modifiers.shiftKey
                    ? r.GLocale.get(
                        new r.GLocaleKey(
                          "GFillPaintLayerProperties",
                          "action.duplicate"
                        )
                      )
                    : r.GLocale.get(
                        new r.GLocaleKey(
                          "GFillPaintLayerProperties",
                          "action.move"
                        )
                      )
                ),
                  n._updateProperties(),
                  n._setSelectedPaintLayer(c);
              }
              c &&
                u &&
                a.GEditor.tryRunTransaction(
                  n._elements[0],
                  function () {
                    var e = [];
                    n._iterateEqualPaintLayer(c, function (t) {
                      e.push(t);
                    }),
                      r.GUtil.each(e, function (e, t) {
                        t.getParent().removeChild(t);
                      });
                  },
                  r.GLocale.get(
                    new r.GLocaleKey(
                      "GFillPaintLayerProperties",
                      "action.remove"
                    )
                  )
                ),
                d && d.css("display", "none"),
                (d = null),
                t.stopPropagation(),
                (c = null);
            })
            .on("click", function () {
              n._setSelectedPaintLayer(e);
            })
            .gPropertyRow({
              columns: [
                {
                  clazz: "drag-indicator",
                  content: $("<div></div>").addClass(
                    "gravit-icon-drag-indicator g-cursor-hand-open gravit-icon-touch-drag-indicator"
                  ),
                },
                {
                  width: "40px",
                  clazz: "color-preview",
                  content: $("<div></div>")
                    .attr("data-property", "_pt")
                    .gPatternChooser({
                      types: [
                        r.GColor,
                        r.GLinearGradient,
                        r.GRadialGradient,
                        r.GAngularGradient,
                        r.GBackground,
                        r.GTexturePattern,
                        r.GNoisePattern,
                      ],
                      hasMask: !0,
                    })
                    .on("chooseropen", function () {
                      n._document.getEditor().hideSelection(),
                        gDesigner
                          .getWorkspace()
                          .getStyleEdManager()
                          .updateEditor(e, "_pt", !1),
                        n._setSelectedPaintLayer(e),
                        (n._styleEdOn = !0),
                        (n._chooserElem = $(this));
                    })
                    .on("chooserclose", function (e, t, o) {
                      if (
                        gDesigner
                          .getWorkspace()
                          .getStyleEdManager()
                          .getOverlayLock(o)
                      )
                        t();
                      else if (
                        ((n._styleEdOn = !1),
                        gDesigner
                          .getWorkspace()
                          .getStyleEdManager()
                          .deactivateEditor(),
                        n._document &&
                          (n._document.getEditor().resetHideSelection(),
                          n._document.hasCDR()))
                      ) {
                        var i = gPatternChooser.getPattern();
                        !i ||
                          i instanceof r.GRGBColor ||
                          y.showCDRUnsupportedObjectWarning();
                      }
                      n._chooserElem = null;
                    })
                    .on("patternchange", function (e, t, n, o, i, a) {
                      var r = ["_vs"],
                        s = [!0];
                      void 0 !== t && (r.push("_pt"), s.push(t)),
                        "number" == typeof n && (r.push("_op"), s.push(n));
                      var l = null;
                      i &&
                        ((l = { chooserOn: !0 }),
                        null != a && (l.activeStopIdx = a)),
                        b(r, s, o, l);
                    }),
                },
                {
                  width: "auto",
                  content: $("<select></select>")
                    .addClass("normal")
                    .gBlendMode()
                    .gRichTooltip(
                      l.GRichTooltipConfig.from({
                        title: r.GLocale.get(
                          new r.GLocaleKey(
                            "GAppearanceProperties",
                            "text.blend-tooltip-title"
                          )
                        ),
                        description: r.GLocale.get(
                          new r.GLocaleKey(
                            "GAppearanceProperties",
                            "text.blend-tooltip-description"
                          )
                        ),
                        middle: !1,
                        forceShow: !0,
                        learnMore: s.LINKS.BLENDING_MODES_DOCUMENTATION_URL,
                      })
                    )
                    .attr("data-property", "_bl")
                    .on("change", function (e) {
                      gDesigner.stats(
                        "fill_change_blend-mode",
                        $(e.target).val()
                      ),
                        b(["_bl"], [$(e.target).val()]);
                    }),
                },
                {
                  width: "45px",
                  content: $("<input>")
                    .addClass("normal")
                    .attr("data-property", "_op")
                    .attr("type", "text")
                    .on("change", function (e) {
                      gDesigner.stats("fill_change_opacity"),
                        b(
                          ["_vs", "_op"],
                          [
                            !0,
                            r.GLength.parseEquationValue(
                              $(this).gInputBox("value")
                            ) / 100,
                          ]
                        );
                    })
                    .gInputBox({
                      minValue: 0,
                      maxValue: 100,
                      incrementValue: gDesigner.getOpacityIncrement(),
                      postfix: "%",
                    }),
                },
                {
                  width: "20px",
                  content: $("<span></span>")
                    .attr("data-property", "_vs")
                    .addClass(
                      "fill-action fill-visibility gravit-icon-display normal"
                    )
                    .attr(
                      "data-title",
                      r.GLocale.get(
                        new r.GLocaleKey(
                          "GCommonNames",
                          "action.toggle-visibility"
                        )
                      )
                    )
                    .on("click", function (e) {
                      gDesigner.stats("fill_hide_show"), e.stopPropagation();
                      var t = $(this).hasClass("gravit-icon-hide");
                      $(this).removeClass(
                        "gravit-icon-" + (t ? "hide" : "display")
                      ),
                        $(this).addClass(
                          "gravit-icon-" + (t ? "display" : "hide")
                        ),
                        b(["_vs"], [t]);
                    }),
                },
                {
                  width: "auto",
                  content: $("<div/>")
                    .addClass("touch")
                    .gPropertyRow({
                      columns: [
                        { width: "auto", content: x("_bl") },
                        { width: "60px", content: x("_vs") },
                      ],
                    })
                    .gPropertyRow({
                      columns: [
                        { width: "auto", content: x("_ra") },
                        { width: "60px", content: x("_op") },
                      ],
                    }),
                },
              ],
            })
            .prependTo(this._panel);
        S.find(".columns").addClass("g-cursor-hand-open"),
          S.find(".column").addClass("g-cursor-hand-open"),
          S.find(".touch").parents(".column").addClass("g-touch"),
          S.find(".normal").parents(".column").addClass("g-normal"),
          S.find('[data-property="_pt"]')
            .parents(".column")
            .addClass("g-color"),
          S.find(".transparency")
            .parents(".touch div:last-child>div")
            .addClass("g-transparency"),
          S.find(".touch")
            .find("select")
            .addClass("g-select")
            .parent()
            .append($("<span/>").addClass("gravit-icon-touch-arrowDown")),
          S.contextmenu({ context: f.FillPropertyPanel }, function (e) {
            e.preventDefault();
            var t = $(this).data("paintLayer");
            n._setSelectedPaintLayer(t),
              $(gDesigner.getWindows().getHtmlElement()).trigger(
                "contextmenu",
                { previousEvent: e, data: { paintLayer: t } }
              );
          }),
          this._setSelectedPaintLayer(e),
          this._updatePaintLayer(e, t),
          S.find(".transparency").each(function (e, t) {
            $(t).gInputSlider(
              "value",
              parseInt($(this).parents(".touch").find(".fill-op").val())
            );
          });
      }),
      (v.prototype.openPatternChooser = function () {
        this._panel
          .find(".fill-block:first-child")
          .find('[data-property="_pt"]')
          .find(".g-button")
          .click();
      }),
      (v.prototype.openEyeDropper = function (e, t) {
        this._panel
          .find(".fill-block:first-child")
          .find('[data-property="_pt"]')
          .gPatternChooser("openEyeDropper", e, t);
      }),
      (v.prototype._setSelectedPaintLayer = function (e) {
        this._panel.find(".fill-block").each(function (t, n) {
          var o = $(n);
          o.toggleClass("g-selected", o.data("paintLayer") === e);
        }),
          this._document && this._document.updateActiveStylesList("Fill", e);
      }),
      (v.prototype._getSelectedPaintLayer = function () {
        return this._panel.find(".fill-block.g-selected").data("paintLayer");
      }),
      (v.prototype._removePaintLayer = function (e) {
        this._panel.find(".fill-block").each(function (t, n) {
          var o = $(n);
          if (o.data("paintLayer") === e) return o.remove(), !1;
        });
      }),
      (v.prototype._updatePaintLayer = function (e, t) {
        e &&
          this._panel.find(".fill-block").each(function (n, o) {
            var i = $(o);
            if (i.data("paintLayer") === e) {
              i
                .find('[data-property="_pt"]')
                .gPatternChooser("setPattern", e.getProperty("_pt", !1, !1, !0))
                .gPatternChooser("value", e.getProperty("_pt", !1, !1, !0))
                .gPatternChooser("opacity", e.getProperty("_op", !1, !1, !0)),
                i.find('[data-property="_op"]').each(function (t, n) {
                  $(n).gInputBox(
                    "value",
                    r.GUtil.formatOpacity(
                      100 * e.getProperty("_op", !1, !1, !0)
                    )
                  );
                }),
                i.find('[data-property="_bl"]').val(e.getProperty("_bl"));
              var s = e.getProperty("_vs");
              if (
                (i
                  .find('[data-property="_vs"]')
                  .removeClass("gravit-icon-" + (s ? "hide" : "display"))
                  .addClass("gravit-icon-" + (s ? "display" : "hide")),
                t &&
                  (t.evtType == a.GEditor.ModifiedEvent.Type.Undo ||
                    t.evtType == a.GEditor.ModifiedEvent.Type.Redo) &&
                  t.chooserOn &&
                  null != t.fillLayerIndex)
              )
                e.getParent().getIndexOfChild(e) == t.fillLayerIndex &&
                  i
                    .find(".preview")
                    .trigger(
                      "click",
                      null != t.activeStopIdx ? t.activeStopIdx : null
                    );
            }
          });
      }),
      (v.prototype._afterInsert = function (e) {
        e.node instanceof r.GStylable.FillPaintLayer &&
          e.node.getOwnerStylable() === this._elements[0] &&
          (this._insertPaintLayer(e.node), this._updateToolbar());
      }),
      (v.prototype._beforeRemove = function (e) {
        if (
          e.node instanceof r.GStylable.FillPaintLayer &&
          e.node.getOwnerStylable() === this._elements[0]
        ) {
          this._removePaintLayer(e.node);
          for (
            var t = e.node.getPrevious();
            t && !(t instanceof r.GStylable.FillPaintLayer);

          )
            t = t.getPrevious();
          if (!(t instanceof r.GStylable.FillPaintLayer))
            for (
              t = e.node.getNext();
              t && !(t instanceof r.GStylable.FillPaintLayer);

            )
              t = t.getNext();
          this._setSelectedPaintLayer(t), this._updateToolbar();
        }
      }),
      (v.prototype._afterPropertiesChange = function (e) {
        e.node instanceof r.GStylable.FillPaintLayer &&
          e.node.getOwnerStylable() === this._elements[0] &&
          this._updatePaintLayer(e.node);
      }),
      (v.prototype._iterateEqualPaintLayer = function (e, t) {
        if (e)
          for (
            var n = e.getParent().getIndexOfChild(e), o = 0;
            o < this._elements.length;
            ++o
          ) {
            var i = this._elements[o].getPaintLayers();
            r.GUtil.each(
              i.getFillLayers(),
              function (a, r) {
                ((r && r === e) ||
                  (r.constructor === e.constructor &&
                    i.getIndexOfChild(r) === n)) &&
                  t(r, this._elements[o]);
              }.bind(this)
            );
          }
      }),
      (e.exports = v);
  }