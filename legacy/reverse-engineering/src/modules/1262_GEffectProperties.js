/**
 * Webpack Module #1262
 * Type: class
 * Name: GEffectProperties
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(328), n(96), n(865), n(193), n(57), n(3), n(4), n(13);
    var i = n(53),
      a = n(1),
      r = n(15),
      s = n(67),
      l = o(n(340)),
      c = o(n(807)),
      d = n(1161),
      u = o(n(565)),
      p = n(123),
      g = n(1263),
      h = n(1526),
      f = n(450);
    const m = n(607),
      { SidebarsIds: y } = n(198);
    var v = null,
      _ = null,
      b = null,
      w = null,
      C = null,
      x = null,
      S = null;
    function E() {
      (this._elements = []),
        (v = a.GLocale.get(
          new a.GLocaleKey("GEffectProperties", "text.most-used")
        )),
        (_ = a.GLocale.get(new a.GLocaleKey("GEffectProperties", "text.blur"))),
        (b = a.GLocale.get(
          new a.GLocaleKey("GEffectProperties", "text.artistic")
        )),
        (w = a.GLocale.get(
          new a.GLocaleKey("GEffectProperties", "text.adjust")
        )),
        (C = a.GLocale.get(
          new a.GLocaleKey("GEffectProperties", "text.distortion")
        )),
        (x = a.GLocale.get(
          new a.GLocaleKey("GEffectProperties", "text.other")
        )),
        (S = a.GLocale.get(
          new a.GLocaleKey("GEffectProperties", "text.shadow")
        )),
        V || (V = H());
    }
    a.GObject.inherit(E, p),
      (E.EngCat = (e) =>
        e === v
          ? "MostUsed"
          : e === _
          ? "Blur"
          : e === b
          ? "Artistic"
          : e === w
          ? "Adjust"
          : e === C
          ? "Distortion"
          : e === x
          ? "Other"
          : "Shadow"),
      (E.prototype._panel = null),
      (E.prototype._toolbar = null),
      (E.prototype._document = null),
      (E.prototype._elements = null),
      (E.prototype._addEffectMenu = null),
      (E.prototype._effectsPanel = null),
      (E.prototype._disableFx = null),
      (E.prototype._defaultEffects = [
        a.GDropShadowEffect,
        a.GInnerShadowEffect,
        a.GBlurEffect,
        a.GGLColorAdjustEffect,
      ]),
      (E.prototype._styleEditorChange = !1),
      (E.prototype._styleEdOn = !1),
      (E.prototype._ownChange = !1),
      (E.prototype._chooserElem = null),
      (E.prototype.init = function (e, t) {
        (this._toolbar = t.addClass("list-toolbar effects-toolbar")),
          this._createAddEffectMenu(),
          (this._panel = e.addClass("effects-properties-panel")),
          this.setTouchTools([
            new l.default({
              id: "effect",
              icon: "gravit-icon-touch-effect-panel",
              panel: this._panel,
              toolbar: this._toolbar,
              panelWidth: "368px",
            }),
          ]);
        var n = this;
        $("<label></label>")
          .text(a.GLocale.get(new a.GLocaleKey("GEffectProperties", "title")))
          .appendTo(this._toolbar),
          this._toolbar.append(
            $("<button></button>")
              .append($("<span></span>").addClass("gravit-icon-plus"))
              .append($("<span></span>").addClass("gravit-icon-touch-plus"))
              .on("click", function () {
                gDesigner.stats("effects_open_effectsmenu", "main"),
                  n._openEffectsMenu(this);
              })
              .gRichTooltip(
                s.GRichTooltipConfig.from({
                  title: a.GLocale.get(
                    new a.GLocaleKey(
                      "GEffectProperties",
                      "text.add-effect-tooltip-title"
                    )
                  ),
                  description: a.GLocale.get(
                    new a.GLocaleKey(
                      "GEffectProperties",
                      "text.add-effect-tooltip-description"
                    )
                  ),
                  learnMore:
                    "",
                })
              )
          ),
          (this._effectsPanel = $("<div></div>")
            .addClass("effects-panel")
            .append($("<div></div>").addClass("effects"))
            .appendTo(this._panel));
        for (
          var o = function (e, t) {
              var o = e;
              (function () {
                gDesigner.stats(
                  "effects_add_effectsmenu",
                  (e &&
                    a.GLocale.getValue(
                      (t && t.i18n) || e,
                      "name",
                      "unknown",
                      0
                    )) ||
                    "unkn"
                ),
                  i.GEditor.tryRunTransaction(
                    this._elements[0],
                    function () {
                      for (var e = 0; e < this._elements.length; ++e) {
                        var t = new o();
                        this._validateInsertation(
                          this._elements[e].getEffects(),
                          t
                        ) && this._elements[e].getEffects().appendChild(t),
                          n._addEffectMenu.close();
                        const i = gDesigner
                          .getRightSidebars()
                          .getSidebar(y.GInspectorSidebar);
                        i.trigger(new c.default(c.default.Type.ChildAdded, i));
                      }
                    }.bind(this),
                    a.GLocale.get(
                      new a.GLocaleKey("GEffectProperties", "action.add")
                    )
                  );
              }).bind(this)();
            }.bind(this),
            r = 0;
          r < V.length;
          ++r
        ) {
          var d = V[r];
          $.inArray(d.clazz, this._defaultEffects) > -1 &&
            this._createDefaultEffect(!1, d, o);
        }
        this._createDefaultEffect(!0),
          gDesigner
            .getWorkspace()
            .getStyleEdManager()
            .addEventListener(
              i.GStyleEdManager.EditorEvent,
              this._styleEditorEventHandler,
              this
            ),
          this._panel.data("contextmenu", !0);
      }),
      (E.prototype._openEffectsMenu = function (e) {
        this._addEffectMenu.open(e);
      }),
      (E.prototype.update = function (e, t, n) {
        if (this._styleEditorChange) return (this._styleEditorChange = !1), !0;
        if (this._ownChange) return !0;
        if (
          (this._chooserElem && this._chooserElem.gPatternChooser("close"),
          this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                a.GNode.AfterInsertEvent,
                this._afterInsert,
                this
              ),
            this._document
              .getScene()
              .removeEventListener(
                a.GNode.BeforeRemoveEvent,
                this._beforeRemove,
                this
              ),
            this._document
              .getScene()
              .removeEventListener(
                a.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange,
                this
              ),
            (this._document = null),
            (this._elements = null),
            this._invalidateEffects()),
          (this._elements = []),
          e && t && t.length)
        ) {
          for (var o = 0; o < t.length; ++o)
            t[o].hasMixin(a.GStylable) &&
              t[o]
                .getStylePropertySets()
                .indexOf(a.GStylable.PropertySet.Effects) >= 0 &&
              this._elements.push(t[o]);
          if (this._elements.length)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  a.GNode.AfterInsertEvent,
                  this._afterInsert,
                  this
                ),
              this._document
                .getScene()
                .addEventListener(
                  a.GNode.BeforeRemoveEvent,
                  this._beforeRemove,
                  this
                ),
              this._document
                .getScene()
                .addEventListener(
                  a.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              this._invalidateEffects(n),
              !0
            );
        }
        return !1;
      }),
      (E.prototype._styleEditorEventHandler = function (e) {
        this._styleEdOn &&
          e.type == i.GStyleEdManager.EditorEventType.PrepareModifiedEvent &&
          (this._styleEditorChange = !0);
      }),
      (E.prototype._afterInsert = function (e) {
        e.node instanceof a.GStylable.Effect &&
          e.node.getOwnerStylable() === this._elements[0] &&
          (this._insertEffect(e.node), this._updateToolbar());
      }),
      (E.prototype._beforeRemove = function (e) {
        e.node instanceof a.GStylable.Effect &&
          e.node.getOwnerStylable() === this._elements[0] &&
          (this._removeEffect(e.node), this._updateToolbar());
      }),
      (E.prototype._afterPropertiesChange = function (e) {
        (!e.temporary || e.node instanceof a.GOverlayEffect) &&
          e.node instanceof a.GStylable.Effect &&
          e.node.getOwnerStylable() === this._elements[0] &&
          this._updateEffect(e.node);
      }),
      (E.prototype._iterateEqualEffects = function (e, t, n) {
        for (
          var o = e.getOwnerStylable(),
            i = e.getParent().getIndexOfChild(e),
            r = 0;
          r < this._elements.length;
          ++r
        )
          if (!o || this._elements[r] !== o || n)
            for (
              var s = this._elements[r].getEffects(), l = s.getFirstChild();
              null !== l;
              l = l.getNext()
            )
              (l !== e || n) &&
                ((a.GUtil.equals(l, e) && !n) ||
                  (l.constructor === e.constructor &&
                    s.getIndexOfChild(l) === i)) &&
                t(l);
      }),
      (E.prototype._insertEffect = function (e, t) {
        var n = this,
          o = null,
          s = null,
          l = null,
          p = 0,
          g = 0,
          h = null,
          v = function () {
            i.GEditor.tryRunTransaction(
              e,
              function () {
                this._iterateEqualEffects(e, function (t) {
                  t.setProperty("cl", !e.getProperty("cl"));
                }),
                  e.setProperty("cl", !e.getProperty("cl"));
              }.bind(this),
              a.GLocale.get(
                new a.GLocaleKey("GEffectProperties", "action.toggle-collapse")
              )
            );
          }.bind(this),
          _ = function (t) {
            t.stopPropagation(),
              i.GEditor.tryRunTransaction(
                e,
                function () {
                  this._iterateEqualEffects(e, function (t) {
                    t.setProperty("vs", !e.getProperty("vs"));
                  }),
                    e.setProperty("vs", !e.getProperty("vs"));
                }.bind(this),
                a.GLocale.get(
                  new a.GLocaleKey(
                    "GEffectProperties",
                    "action.toggle-visibility"
                  )
                )
              );
          }.bind(this),
          b = function (t) {
            var n = V.find((t) => e instanceof t.clazz);
            gDesigner.stats(
              "effects_delete_effect",
              a.GLocale.getValue(
                (n && n.i18n) || e,
                "name",
                e.getNodeName(),
                666
              )
            ),
              t.stopPropagation(),
              i.GEditor.tryRunTransaction(
                e,
                function () {
                  this._iterateEqualEffects(e, function (e) {
                    e.getParent().removeChild(e);
                  }),
                    e.getParent().removeChild(e),
                    gDesigner.setMouseOverContext(null);
                }.bind(this),
                a.GLocale.get(
                  new a.GLocaleKey("GEffectProperties", "action.remove")
                )
              );
            const o = gDesigner
              .getRightSidebars()
              .getSidebar(y.GInspectorSidebar);
            o.trigger(new c.default(c.default.Type.ChildRemoved, o));
          }.bind(this),
          w = null,
          C = e.getPrevious();
        C &&
          this._effectsPanel.find(".effect-block").each(function (e, t) {
            var n = $(t);
            if (n.data("effect") === C) return (w = n), !1;
          });
        var x = U(e),
          S = $("<div/>").addClass("g-drop-indicator"),
          E = $("<div></div>")
            .addClass("effect-header")
            .addClass("g-cursor-hand-open"),
          P = $("<div></div>")
            .addClass("effect-block")
            .attr("data-drag-mode", u.default.PRESS_AND_HOLD)
            .data("effect", e)
            .attr("draggable", "true")
            .on("mousedown", function (e) {
              (A =
                $(e.target).hasClass("effect-title") ||
                $(e.target).hasClass("gravit-icon-drag-indicator") ||
                $(e.target).hasClass("effect-header")),
                $(e.target)
                  .closest(".effect-block")
                  .toggleClass("g-draggable-disabled", !A);
            })
            .on("click", function (e) {
              var t = $(e.target).parents(".effect-block");
              t.children().addClass("selected"),
                t.siblings().children().removeClass("selected");
            })
            .on("mousedown", (e) => {
              h = e.originalEvent.target;
            })
            .on("dragstart", function (e) {
              var t = h || e.target;
              if (
                !A ||
                (gDesigner.isTouchEnabled() &&
                  !$(t).closest(".effect-header").length)
              )
                return e.preventDefault(), void e.stopPropagation();
              var c = $(e.target).closest(".effect-block"),
                d = c.offset(),
                u = e.originalEvent;
              (o = gDragImage()).addClass("drag-delete gravit-icon-trash"),
                (s = n._panel.offset()),
                (l = n._effectsPanel.outerHeight()),
                (p = e.clientX - d.left),
                (g = e.clientY - d.top),
                u.stopPropagation(),
                (T = c.data("effect")),
                (u.dataTransfer.effectAllowed = "move"),
                u.dataTransfer.setData("text/plain", "dummy_data"),
                n._effectsPanel.find(".effect-block").each(function (e, t) {
                  $(t).append(
                    $("<div></div>")
                      .addClass("grid-drag-overlay")
                      .on("dragenter", function () {
                        var e = $(this.parentNode).data("effect");
                        if (G(this.parentNode)) {
                          if (
                            (u.preventDefault(),
                            u.stopPropagation(),
                            (u.dataTransfer.dropEffect = "move"),
                            T && e && T.getParent() === e.getParent())
                          ) {
                            var t = T.getParent(),
                              n = t.getIndexOfChild(T),
                              o = t.getIndexOfChild(e);
                            n !== o &&
                              (n < o
                                ? S.insertBefore(this.parentNode)
                                : S.insertAfter(this.parentNode));
                          }
                        } else S.remove();
                      })
                      .on("dragleave", function () {
                        G(this.parentNode) &&
                          $(this).parent().find(".g-drop-indicator").remove();
                      })
                      .on("dragover", function (e) {
                        var t = e.originalEvent;
                        G(this.parentNode) &&
                          (t.preventDefault(),
                          t.stopPropagation(),
                          (t.dataTransfer.dropEffect = "move"));
                      })
                      .on("drop", function (e) {
                        var t = $(this.parentNode)
                          .closest(".effect-block")
                          .data("effect");
                        if (
                          (n._panel.find(".g-drop-indicator").remove(),
                          n._panel.find(".grid-drag-overlay").remove(),
                          T && t && T.getParent() === t.getParent())
                        ) {
                          var o = T.getParent(),
                            s = o.getIndexOfChild(T),
                            l = o.getIndexOfChild(t);
                          i.GEditor.tryRunTransaction(
                            o,
                            function () {
                              if (r.GPlatform.modifiers.shiftKey) {
                                var e = T.clone();
                                o.insertChild(e, s < l ? t.getNext() : t);
                              } else
                                s !== l &&
                                  (o.removeChild(T),
                                  o.insertChild(T, s < l ? t.getNext() : t));
                            },
                            r.GPlatform.modifiers.shiftKey
                              ? a.GLocale.get(
                                  new a.GLocaleKey(
                                    "GEffectProperties",
                                    "action.duplicate"
                                  )
                                )
                              : a.GLocale.get(
                                  new a.GLocaleKey(
                                    "GEffectProperties",
                                    "action.move"
                                  )
                                )
                          );
                        }
                        T = null;
                      })
                  );
                });
            })
            .on("drag", function (e) {
              (0, d.handleDragForDeleteIcon)(e, o, s, l, p, g);
            })
            .on("dragend", function (e) {
              var t = e.originalEvent;
              $(e.target).closest(".effect-block");
              n._panel.find(".g-drop-indicator").remove(),
                n._panel.find(".grid-drag-overlay").remove(),
                o && o.css("display", "none"),
                (o = null),
                t.stopPropagation(),
                T &&
                  i.GEditor.tryRunTransaction(
                    n._elements[0],
                    function () {
                      var e = [];
                      n._iterateEqualEffects(
                        T,
                        function (t) {
                          e.push(t);
                        },
                        !0
                      ),
                        a.GUtil.each(e, function (e, t) {
                          t.getParent().removeChild(t);
                        });
                    },
                    a.GLocale.get(
                      new a.GLocaleKey("GEffectProperties", "action.remove")
                    )
                  );
            })
            .append(
              E.append(
                $("<div></div>").addClass(
                  "gravit-icon-drag-indicator g-cursor-hand-open gravit-icon-touch-drag-indicator"
                )
              )
                .append(
                  $("<div></div>")
                    .addClass("effect-title g-cursor-hand-open")
                    .append(
                      $("<label></label>").append(
                        $("<span></span>").text(e.getNodeNameTranslated())
                      )
                    )
                )
                .append(
                  $("<div></div>")
                    .addClass("effect-icon effect-visibility normal")
                    .on("click", function (e) {
                      e.stopPropagation();
                      var t = $(this).find("span").hasClass("gravit-icon-hide");
                      gDesigner.stats(
                        "effects_toggle_visibility",
                        t ? "hidden" : "visible"
                      ),
                        $(this)
                          .find("span")
                          .removeClass(
                            "gravit-icon-" + (t ? "hide" : "display")
                          ),
                        $(this)
                          .find("span")
                          .addClass("gravit-icon-" + (t ? "display" : "hide")),
                        _(e);
                    })
                    .append(
                      $("<span></span>").addClass(
                        "gravit-icon-" +
                          (e.getProperty("vs") ? "display" : "hide")
                      )
                    )
                )
                .append(
                  $("<div></div>")
                    .addClass("effect-icon effect-delete normal")
                    .attr(
                      "data-title",
                      a.GLocale.get(
                        new a.GLocaleKey("GEffectProperties", "action.remove")
                      )
                    )
                    .on("click", b)
                    .append($("<span></span>").addClass("gravit-icon-trash"))
                )
                .append(
                  $("<div></div>")
                    .addClass("effect-icon effect-setting touch")
                    .attr("data-action", "stroke-settings")
                    .append(
                      $("<span></span>").addClass("gravit-icon-touch-settings")
                    )
                    .on(
                      "click",
                      function (e) {
                        (e.data = { context: f.EffectPropertyPanel }),
                          P.trigger("contextmenu", [e]);
                      }.bind(this)
                    )
                )
                .append(
                  $("<div></div>")
                    .addClass("effect-icon effect-delete touch")
                    .attr(
                      "data-title",
                      a.GLocale.get(
                        new a.GLocaleKey("GEffectProperties", "action.remove")
                      )
                    )
                    .on("click", b)
                    .append(
                      $("<span></span>").addClass("gravit-icon-touch-trash")
                    )
                )
                .append(
                  $("<div></div>")
                    .addClass("effect-icon effect-visibility touch")
                    .on("click", function (e) {
                      e.stopPropagation();
                      var t = $(this)
                        .find("span")
                        .hasClass("gravit-icon-touch-hide");
                      gDesigner.stats(
                        "effects_toggle_visibility",
                        t ? "hidden" : "visible"
                      ),
                        $(this)
                          .find("span")
                          .removeClass(
                            "gravit-icon-touch-" + (t ? "hide" : "show")
                          ),
                        $(this)
                          .find("span")
                          .addClass(
                            "gravit-icon-touch-" + (t ? "show" : "hide")
                          ),
                        _(e);
                    })
                    .append(
                      $("<span></span>").addClass(
                        "gravit-icon-touch-" +
                          (e.getProperty("vs") ? "show" : "hide")
                      )
                    )
                )
            );
        if (x.createSettings) {
          var D = function (t, n, o, i) {
              if (o)
                this._iterateEqualEffects(e, function (e) {
                  e.setProperties(t, n, !1, !1, !0);
                }),
                  e.setProperties(t, n, !1, !1, !0);
              else {
                if (!this._document) return;
                gDesigner.stats(
                  "effects_assign_effectproperty",
                  a.GLocale.getValue(x.i18n, "name", e.getNodeName(), 666)
                );
                var r = null;
                if (i) {
                  var s = e.getParent().getIndexOfChild(e);
                  r = $.extend({ effectIndex: s }, i);
                }
                this._ownChange = !0;
                var l = this._document.getEditor();
                l.beginTransaction();
                try {
                  this._iterateEqualEffects(e, function (e) {
                    e.setProperties(t, n);
                  }),
                    e.setProperties(t, n);
                } finally {
                  l.commitTransaction(
                    a.GLocale.get(
                      new a.GLocaleKey(
                        "GEffectProperties",
                        "action.change-properties"
                      )
                    ),
                    r
                  ),
                    (this._ownChange = !1);
                }
              }
            }.bind(this),
            L = x.createSettings.call(this, e, D);
          if (L) {
            var I = $("<div></div>").addClass("effect-settings");
            L.addClass("content"), P.append(I.append(L));
          }
        }
        w && w.length > 0
          ? P.insertBefore(w)
          : P.appendTo(this._effectsPanel.find(".effects")),
          E.gAccordion("init", ".effect-settings:last", "label").on(
            "change",
            function () {
              gDesigner.stats("effects_toggle_collapse"), v();
            }
          ),
          P.contextmenu({ context: f.EffectPropertyPanel }, function (e, t) {
            (e = t || e).preventDefault();
            var n = $(this).data("effect");
            $(gDesigner.getWindows().getHtmlElement()).trigger("contextmenu", {
              previousEvent: e,
              data: { effect: n },
            });
          }),
          P.on("mouseenter", (t) => {
            this._document &&
              this._document.updateActiveStylesList("Effect", e),
              gDesigner.setMouseOverContext(
                m.EffectPropertiesPanel,
                t,
                function (e) {
                  var t = this._panel.find(".copy-info-overlay").eq(0),
                    n = e && $(e.target).closest(".effect-block"),
                    o = (n && n.height()) || 0,
                    i = (n && n.position().top) || 0,
                    r = o ? i + o / 2 : i,
                    s = $("<span/>")
                      .addClass("copy-info-overlay")
                      .css({ top: r })
                      .text(
                        a.GLocale.get(
                          new a.GLocaleKey(
                            "GEffectProperties",
                            "text.copy-effect"
                          )
                        )
                      );
                  t && t.remove(),
                    this._panel.append(s),
                    setTimeout(() => {
                      s.animate({ opacity: 0, top: "+=20" }, 500, s.remove);
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
          P.on("mouseleave", () => {
            this._panel.off("mousemove.check-context"),
              this._document &&
                this._document.updateActiveStylesList("Effect", null),
              gDesigner.setMouseOverContext(null, null, null);
          }),
          this._updateEffect(e, t);
      }),
      (E.prototype._updateEffect = function (e, t) {
        this._effectsPanel.find(".effect-block").each(function (n, o) {
          var r = $(o);
          if (r.data("effect") === e) {
            U(e);
            if (
              e instanceof a.GOverlayEffect ||
              e instanceof a.GDropShadowEffect ||
              e instanceof a.GInnerShadowEffect ||
              e instanceof a.GCurvedShadowEffect ||
              e instanceof a.GContactShadowEffect ||
              e instanceof a.GLongShadowEffect
            )
              if (
                (r
                  .find('[data-property="pat"]')
                  .gPatternChooser(
                    "setPattern",
                    e.getProperty("pat", !1, !1, !0)
                  )
                  .gPatternChooser("value", e.getProperty("pat", !1, !1, !0))
                  .gPatternChooser("opacity", e.getProperty("opc", !1, !1, !0)),
                r
                  .find('[data-property="opc"]')
                  .gInputBox(
                    "value",
                    a.GUtil.formatOpacity(
                      100 * e.getProperty("opc", !1, !1, !0)
                    )
                  ),
                t &&
                  (t.evtType == i.GEditor.ModifiedEvent.Type.Undo ||
                    t.evtType == i.GEditor.ModifiedEvent.Type.Redo) &&
                  t.chooserOn &&
                  null != t.effectIndex)
              )
                e.getParent().getIndexOfChild(e) == t.effectIndex &&
                  r
                    .find('[data-property="pat"]')
                    .find(".preview")
                    .trigger(
                      "click",
                      null != t.activeStopIdx ? t.activeStopIdx : null
                    );
            var s = e.getProperty("vs"),
              l = e.getProperty("ly"),
              c = e.getProperty("cl");
            r.toggleClass("g-selected", e.hasFlag(a.GNode.Flag.Selected)),
              r.find(".effect-title input[type=checkbox]").prop("checked", s),
              r.find(".effect-header").gAccordion("toggleOpen", !c);
            var d = r.find(".effect-settings");
            if (
              (d.css("display", c ? "none" : ""),
              e instanceof a.GBlurEffect &&
                d
                  .find('[data-property="r"]:not(.g-input-slider)')
                  .gUnitBox("value", new a.GLength(e.getProperty("r"))),
              e instanceof a.GWebGLEffect)
            ) {
              var u = e.getProperty("shp");
              for (var p in u) {
                var g = u[p];
                if ("number" == typeof g) {
                  var h = d.find(
                    "[data-property=" + p + "]:not(.g-input-slider)"
                  );
                  h.gUnitBox("options").hasOwnProperty("unit") &&
                    h.gUnitBox("value", new a.GLength(g, a.GLength.Unit.PT));
                }
              }
            }
            return (
              e instanceof a.GDropShadowEffect &&
                (d
                  .find('[data-property="r"]')
                  .gUnitBox("value", new a.GLength(e.getProperty("r"))),
                d
                  .find('[data-property="x"]')
                  .gUnitBox("value", new a.GLength(e.getProperty("x"))),
                d
                  .find('[data-property="y"]')
                  .gUnitBox("value", new a.GLength(e.getProperty("y")))),
              r
                .find(".effect-layer")
                .attr(
                  "data-title",
                  a.GLocale.get(
                    new a.GLocaleKey("GEffectProperties", "text.applies-to")
                  ) +
                    " " +
                    a.GLocale.get(a.GStylable.StyleLayerName[l || ""])
                )
                .find("> span")
                .toggleClass("gravit-icon-circle", !l)
                .toggleClass(
                  "gravit-icon-fill",
                  l === a.GStylable.StyleLayer.Fill
                )
                .toggleClass(
                  "gravit-icon-stroke",
                  l === a.GStylable.StyleLayer.Border
                ),
              !1
            );
          }
        });
      }),
      (E.prototype._removeEffect = function (e) {
        this._effectsPanel.find(".effect-block").each(function (t, n) {
          var o = $(n);
          if (o.data("effect") === e) return o.remove(), !1;
        });
      }),
      (E.prototype._invalidateEffects = function (e) {
        if (
          (this._effectsPanel.find(".effects").empty(),
          this._elements && this._elements.length)
        )
          for (
            var t = this._elements[0].getEffects().getFirstChild();
            null !== t;
            t = t.getNext()
          )
            t instanceof a.GStylable.Effect && this._insertEffect(t, e);
        this._updateToolbar();
      }),
      (E.prototype._createAddEffectMenu = function () {
        this._addEffectMenu = new h(E.EngCat);
        var e = this._addEffectMenu,
          t = e.createSelector(),
          n = this,
          o = function (e, t) {
            var o = e;
            this._elements[0].getScene();
            (function () {
              gDesigner.stats(
                "effects_add_panelbutton",
                (e &&
                  a.GLocale.getValue(
                    (t && t.i18n) || e,
                    "name",
                    "unknown",
                    0
                  )) ||
                  "unkn"
              ),
                i.GEditor.tryRunTransaction(
                  this._elements[0],
                  function () {
                    for (var e = 0; e < this._elements.length; ++e) {
                      var t = new o();
                      this._validateInsertation(
                        this._elements[e].getEffects(),
                        t
                      ) && this._elements[e].getEffects().appendChild(t),
                        n._addEffectMenu.close();
                    }
                  }.bind(this),
                  a.GLocale.get(
                    new a.GLocaleKey("GEffectProperties", "action.add")
                  )
                ),
                $(this._toolbar).gAccordion("toggleOpen", !0),
                $(this._toolbar).gAccordion("init", $(this._panel));
              const r = gDesigner
                .getRightSidebars()
                .getSidebar(y.GInspectorSidebar);
              r.trigger(new c.default(c.default.Type.ChildAdded, r));
            }).bind(this)();
          }.bind(this),
          r = {};
        r[v] = new Array();
        var s = $("<option></option>").attr({ value: v }).append(v);
        t.append(s);
        for (var l = [], d = 0; d < V.length; ++d) {
          var u = V[d];
          if (!u.hidden) {
            u.cb = o;
            var p = u.mostUsed,
              g = u.category;
            if (g) {
              if (!r[g]) {
                r[g] = new Array();
                s = $("<option></option>").attr({ value: g }).append(g);
                l.push(s);
              }
              r[g].push(u);
            }
            p && r[v].push(u);
          }
        }
        l.sort(function (e, t) {
          return $(e).attr("value") ===
            a.GLocale.get(
              new a.GLocaleKey("GEffectProperties", "text.other")
            ) || $(e).attr("value") > $(t).attr("value")
            ? 1
            : $(t).attr("value") ===
                a.GLocale.get(
                  new a.GLocaleKey("GEffectProperties", "text.other")
                ) || $(t).attr("value") > $(e).attr("value")
            ? -1
            : 0;
        });
        for (d = 0; d < l.length; ++d) t.append(l[d]);
        t.on("change", function (t) {
          gDesigner.stats("effects_choose_type", E.EngCat(this.value)),
            e.addItems(r[this.value]);
        }),
          e.addItems(r[v]);
      }),
      (E.prototype._validateInsertation = function (e, t) {
        if (t.isSingleton())
          for (
            var n = a.GObject.getTypeId(t), o = e.getFirstChild();
            null !== o;
            o = o.getNext()
          )
            if (a.GObject.getTypeId(o) === n) return !1;
        return !0;
      }),
      (E.prototype._createDefaultEffect = function (e, t, n) {
        var o = function (o) {
            e
              ? (gDesigner.stats("effects_open_effectsmenu", "more"),
                this._openEffectsMenu(o))
              : n(t.clazz, t);
          }.bind(this),
          i = $("<span></span>")
            .text(
              e
                ? a.GLocale.get(
                    new a.GLocaleKey("GEffectProperties", "text.more")
                  )
                : a.GLocale.getValue(t.i18n, "name")
            )
            .addClass("effects-default-label"),
          r = $("<span>+</span>");
        $("<div></div>")
          .addClass("effects-default")
          .append(i)
          .append(r)
          .on("click", function () {
            o(this);
          })
          .appendTo(this._panel);
      }),
      (E.prototype._updateToolbar = function () {
        var e =
          this._panel.find(".effect-block").length > 0 ||
          this._panel.find(".effects-default").length > 0;
        this._toolbar.toggleClass("empty-list", !e);
      }),
      (E.prototype.toString = function () {
        return "[Object GEffectProperties]";
      });
    var A = !1,
      T = null;
    function G(e) {
      if (T) {
        var t = $(e).data("effect");
        if (t && (t !== T || r.GPlatform.modifiers.shiftKey))
          return T.getParent() === t.getParent();
      }
      return !1;
    }
    function P(e, t, n) {
      var o = n || e,
        i = o.getProperty.bind(o),
        r = (this._document.getScene(), this._document.getEditor()),
        s = i("shp"),
        l = a.GNode.getClassFromId(a.GObject.getTypeId(o)).RANGES || fxRanges,
        c = this,
        d = $("<div></div>");
      for (var u in s) {
        var p = s[u];
        if (-1 !== ["contrast", "brightness", "hue", "saturation"].indexOf(u)) {
          var h = l[u],
            f = 100 * p;
          isNaN(f) || (f = a.GUtil.formatNumber(f, 0));
          var m = 100 * h[0],
            y = 100 * h[1],
            v = g.DefaultStops.Hue;
          if ("hue" === u)
            o instanceof a.GGLRecolourEffect
              ? ((m = 0), (y = 360))
              : ((m = -180), (y = 180)),
              (v = g.DefaultStops.Hue),
              (f = a.GMath.normalizeValue(p, h[0], h[1], m, y));
          else if (-1 !== ["contrast", "brightness"].indexOf(u))
            v = g.DefaultStops.Luminosity;
          else if (
            "saturation" === u &&
            ((v = g.DefaultStops.Saturation(0)),
            o instanceof a.GGLRecolourEffect)
          ) {
            var _ = a.GMath.normalizeValue(s.hue, h[0], h[1], 0, 360);
            v = g.DefaultStops.Saturation(_);
          }
          var b = function (e, t, n) {
            if ("hue" === t && o instanceof a.GGLRecolourEffect) {
              var i = $(n)
                  .closest(".effect-settings")
                  .find('.g-input-slider[data-property="saturation"]'),
                r = i.gColorSlider("value");
              i.empty()
                .gColorSlider({
                  min: 100 * h[0],
                  max: 100 * h[1],
                  stops: g.DefaultStops.Saturation(e),
                })
                .gColorSlider("value", r)
                .trigger("input");
            }
          };
          $("<div></div>")
            .gPropertyRow({
              label: a.GLocale.get(new a.GLocaleKey("GWebGLEffect", u)),
              columns: [
                {
                  width: "75%",
                  content: $("<div>")
                    .attr("data-property", u)
                    .gColorSlider({ min: m, max: y, stops: v, maxDecimal: 0 })
                    .gColorSlider("value", f)
                    .on("input", function (e) {
                      var n = $(e.target).data().property,
                        o = $(e.target).gColorSlider("value"),
                        r = o,
                        s = $(e.target).gColorSlider("minValue"),
                        l = $(e.target).gColorSlider("maxValue");
                      (o = a.GMath.normalizeValue(o, s, l, h[0], h[1])),
                        b(r, n, e.target);
                      var c = i("shp");
                      if (c[n] !== o) {
                        var d = JSON.parse(JSON.stringify(c));
                        (d[n] = o), t(["shp"], [d]);
                      }
                      $(e.target)
                        .closest(".effect-settings")
                        .find("[data-property=" + n + "]:not(.g-input-slider)")
                        .val(r)
                        .trigger("change");
                    }),
                },
                {
                  width: "40px",
                  content: $("<input>")
                    .attr("type", "text")
                    .attr("data-property", u)
                    .val(f)
                    .on("change", function (e) {
                      var n = $(e.target).data().property,
                        r = Number(
                          o
                            .propertyInverseTransform(
                              n,
                              parseFloat($(e.target).gInputBox("value"))
                            )
                            .toFixed(3)
                        ),
                        s = i("shp"),
                        l = $(this)
                          .parents(".effect-settings")
                          .find(".g-input-slider[data-property=" + n + "]");
                      l.gColorSlider("value") != r &&
                        l.gColorSlider("value", r),
                        b(r, n, e.target);
                      var c = l.gColorSlider("minValue"),
                        d = l.gColorSlider("maxValue");
                      if (
                        ((r = a.GMath.normalizeValue(r, c, d, h[0], h[1])),
                        s && s[n] !== r)
                      ) {
                        var u = JSON.parse(JSON.stringify(s));
                        (u[n] = r), t(["shp"], [u]);
                      }
                    })
                    .gInputBox({
                      minValue: m,
                      maxValue: y,
                      postfix: "hue" === u ? "°" : "%",
                      incrementValue: 1,
                    }),
                },
              ],
            })
            .appendTo(d);
        } else if ("number" == typeof p) {
          f = new a.GLength(p, a.GLength.Unit.PT);
          h = l[u];
          $("<div></div>")
            .gPropertyRow({
              label: a.GLocale.get(new a.GLocaleKey("GWebGLEffect", u)),
              columns: [
                {
                  width: "75%",
                  content: $("<div/>")
                    .gInputSlider({
                      min: h[0],
                      max: h[1],
                      step: 0.002 * Math.abs(h[1] - h[0]),
                    })
                    .attr("data-property", u)
                    .on("mousedown", function () {
                      r.hideSelection(),
                        $(document).one("mouseup", function () {
                          r.resetHideSelection();
                        });
                    })
                    .gInputSlider(
                      "value",
                      Number(o.propertyInverseTransform(u, p).toFixed(3))
                    )
                    .on("input", function (e) {
                      var n = $(e.target),
                        r = n.data().property,
                        s = a.GLength.parseEquation(
                          $(this).gInputSlider("value")
                        ),
                        l = 0;
                      s && (l = s.toPoint()),
                        (l = Number(o.propertyTransform(r, l).toFixed(3)));
                      var c = i("shp");
                      if (null !== l && "number" == typeof l && c[r] !== l) {
                        var d = JSON.parse(JSON.stringify(c));
                        (d[r] = l), t(["shp"], [d], !0);
                      }
                      n.closest(".effect-settings")
                        .find("[data-property=" + r + "]:not(.g-input-slider)")
                        .val(l)
                        .trigger("change");
                    })
                    .on("change", function (e) {
                      var t = $(e.target),
                        n = t.data().property,
                        i = a.GLength.parseEquation(
                          $(this).gInputSlider("value")
                        ),
                        r = 0;
                      i && (r = i.toPoint()),
                        (r = Number(o.propertyTransform(n, r).toFixed(3))),
                        t
                          .closest(".effect-settings")
                          .find(
                            "[data-property=" + n + "]:not(.g-input-slider)"
                          )
                          .val(r)
                          .trigger("change");
                    }),
                },
                {
                  width: "40px",
                  content: $("<input>")
                    .attr("data-property", u)
                    .on("change", function (e) {
                      var n = $(e.target).data().property,
                        a = $(this).gUnitBox("value"),
                        r = 0;
                      a && (r = a.toPoint());
                      var s = Number(
                          o.propertyInverseTransform(n, r).toFixed(3)
                        ),
                        l = i("shp"),
                        c = $(this)
                          .parents(".effect-settings")
                          .find("[data-property=" + n + "].g-input-slider");
                      if (
                        (c.gInputSlider("value") != s &&
                          c.gInputSlider("value", s),
                        null !== r && "number" == typeof r && l[n] !== r)
                      ) {
                        var d = JSON.parse(JSON.stringify(l));
                        (d[n] = r), t(["shp"], [d]);
                      }
                    })
                    .gUnitBox({
                      minValue: h[0],
                      maxValue: h[1],
                      incrementValue: 0.002 * Math.abs(h[1] - h[0]),
                      source: "effects",
                    })
                    .gUnitBox("value", f),
                },
              ],
            })
            .appendTo(d);
        } else if (p instanceof Array && 3 === p.length) {
          var w = void 0,
            C = [a.GColor];
          s.opacity &&
            "object" == typeof s.opacity &&
            "opacity" === s.opacity.type &&
            ((w = s.opacity.value), C.push()),
            $("<div></div>")
              .gPropertyRow({
                label: a.GLocale.get(new a.GLocaleKey("GWebGLEffect", u)),
                columns: [
                  {
                    width: "50px",
                    content: $("<div></div>")
                      .gPatternChooser({ types: C })
                      .gPatternChooser("value", new a.GRGBColor(p))
                      .gPatternChooser("opacity", w)
                      .on("chooseropen", function () {
                        c._document.getEditor().hideSelection(),
                          (c._chooserElem = $(this));
                      })
                      .on("chooserclose", function (e, t, n) {
                        c._document &&
                          c._document.getEditor().resetHideSelection(),
                          (c._chooserElem = null);
                      })
                      .on("patternchange", function (e, n, o, a, r) {
                        var s = i("shp"),
                          l = JSON.parse(JSON.stringify(s));
                        void 0 !== n && (l.color = n.getValue()),
                          "number" == typeof o &&
                            s.opacity &&
                            "object" == typeof s.opacity &&
                            "opacity" === s.opacity.type &&
                            (l.opacity.value = o);
                        var c = null;
                        r && (c = { chooserOn: !0 }), t(["shp"], [l], a, c);
                      }),
                  },
                ],
              })
              .appendTo(d);
        } else if ("object" == typeof p && "dropdown" === p.type) {
          h = l[u];
          for (
            var x = $("<select></select>")
                .attr("data-property", u)
                .on("change", function (e) {
                  var n = $(e.target).data().property,
                    o = $(e.target).val(),
                    a = i("shp");
                  if (a && (!a[n] || a[n].value !== o)) {
                    var r = JSON.parse(JSON.stringify(a));
                    (r[n].value = o), t(["shp"], [r]);
                  }
                }),
              S = 0;
            S < h.length;
            S++
          )
            $("<option></option>")
              .attr("value", S)
              .text(h[S] instanceof a.GLocaleKey ? a.GLocale.get(h[S]) : h[S])
              .appendTo(x);
          x.val(p.value),
            $("<div></div>")
              .gPropertyRow({
                label: a.GLocale.get(new a.GLocaleKey("GWebGLEffect", u)),
                columns: [{ width: "100%", content: x }],
              })
              .appendTo(d);
        } else
          "boolean" == typeof p &&
            $("<div></div>")
              .gPropertyRow({
                label: a.GLocale.get(new a.GLocaleKey("GWebGLEffect", u)),
                columns: [
                  {
                    width: "20px",
                    content: $("<label></label>")
                      .addClass("g-switch")
                      .append(
                        $("<input>")
                          .attr("type", "checkbox")
                          .attr("data-property", u)
                          .prop("checked", p)
                          .on("change", function (e) {
                            var n = $(e.target).data().property,
                              o = $(this).is(":checked"),
                              a = i("shp");
                            if (a[n] !== o) {
                              var r = JSON.parse(JSON.stringify(a));
                              (r[n] = o), t(["shp"], [r]);
                            }
                          })
                      )
                      .append($("<div></div>")),
                  },
                ],
              })
              .appendTo(d);
      }
      return d;
    }
    function D(e, t, n) {
      this._document.getScene();
      var o = n ? n.getProperty.bind(n) : e.getProperty.bind(e),
        i = o("x"),
        r = o("y"),
        s = new a.GLength(o("r"), a.GLength.Unit.PT),
        l = o("pat"),
        c = o("opc"),
        d = this,
        u = [0, 200],
        p = e.RANGES;
      return (
        p && p.r && (u = p.r),
        $("<div></div>").append(
          $("<div></div>")
            .addClass("touch-effects-shadow")
            .gPropertyRow({
              columns: [
                {
                  width: "20%",
                  label: "X",
                  content: $("<input>")
                    .attr("type", "text")
                    .attr("data-property", "x")
                    .gUnitBox({ source: "effects" })
                    .gUnitBox("value", new a.GLength(i, a.GLength.Unit.PT))
                    .on("change", function () {
                      var e = $(this).gUnitBox("value"),
                        n = e ? e.toUnit(a.GLength.Unit.PT) : null;
                      null !== n && "number" == typeof n && t(["x"], [n]);
                    }),
                },
                {
                  width: "20%",
                  label: "Y",
                  content: $("<input>")
                    .attr("type", "text")
                    .attr("data-property", "y")
                    .gUnitBox({ source: "effects" })
                    .gUnitBox("value", new a.GLength(r, a.GLength.Unit.PT))
                    .on("change", function () {
                      var e = $(this).gUnitBox("value"),
                        n = e ? e.toUnit(a.GLength.Unit.PT) : null;
                      null !== n && "number" == typeof n && t(["y"], [n]);
                    }),
                },
                {
                  width: "20%",
                  label: a.GLocale.get(
                    new a.GLocaleKey("GEffectProperties", "text.blur")
                  ),
                  content: $("<input>")
                    .attr("type", "text")
                    .attr("data-property", "r")
                    .gUnitBox({
                      minValue: u[0],
                      maxValue: u[1],
                      source: "effects",
                    })
                    .gUnitBox("value", s)
                    .on("change", function (e) {
                      var n = $(this).gUnitBox("value"),
                        o = n ? n.toUnit(a.GLength.Unit.PT) : null;
                      null !== o && t(["r"], [o]);
                    }),
                },
                {
                  width: "20%",
                  label: a.GLocale.get(
                    new a.GLocaleKey("GCommonNames", "text.opacity")
                  ),
                  content: $("<input>")
                    .attr("type", "text")
                    .attr("data-property", "opc")
                    .on("change", function (e) {
                      var n =
                        a.GLength.parseEquationValue(
                          $(e.target).gInputBox("value")
                        ) / 100;
                      t(["opc"], [n]),
                        $(e.target)
                          .parents(".effect-settings")
                          .find('[data-property="pat"]')
                          .gPatternChooser("opacity", n);
                    })
                    .gInputBox({
                      minValue: 0,
                      maxValue: 100,
                      incrementValue: gDesigner.getOpacityIncrement(),
                      postfix: "%",
                    })
                    .gInputBox("value", a.GUtil.formatOpacity(100 * c)),
                },
                {
                  width: "20%",
                  label: a.GLocale.get(
                    new a.GLocaleKey("GCommonNames", "text.color")
                  ),
                  content: $("<div></div>")
                    .attr("data-property", "pat")
                    .gPatternChooser({ types: [a.GColor, a.GGradient] })
                    .gPatternChooser("value", l)
                    .gPatternChooser("opacity", c)
                    .on("chooseropen", function () {
                      d._document.getEditor().hideSelection(),
                        (d._chooserElem = $(this));
                    })
                    .on("chooserclose", function (e, t, n) {
                      d._document &&
                        d._document.getEditor().resetHideSelection(),
                        (d._chooserElem = null);
                    })
                    .on("patternchange", function (e, n, o, i, r, s) {
                      var l = [],
                        c = [];
                      void 0 !== n && (l.push("pat"), c.push(n)),
                        "number" == typeof o &&
                          (l.push("opc"),
                          c.push(o),
                          $(e.target)
                            .parents(".effect-settings")
                            .find('[data-property="opc"]')
                            .gInputBox(
                              "value",
                              a.GUtil.formatOpacity(100 * o)
                            ));
                      var d = null;
                      r &&
                        ((d = { chooserOn: !0 }),
                        null != s && (d.activeStopIdx = s)),
                        t(l, c, i, d);
                    }),
                },
              ],
            })
        )
      );
    }
    function L(e, t, n) {
      this._document.getScene();
      var o = n ? n.getProperty.bind(n) : e.getProperty.bind(e),
        i = o("a"),
        r = o("s"),
        s = o("l"),
        l = o("b"),
        c = o("c"),
        d = o("pat"),
        u = o("opc"),
        p = this._document.getEditor(),
        g = $("<div></div>"),
        h = this;
      function f(e, n, o, i, r, s, l, c, d) {
        var u,
          g = $("<input>")
            .attr("type", "text")
            .attr("data-property", n)
            .val(o)
            .on("change", function (e) {
              var o = a.GLength.parseEquationValue(
                $(e.target).gInputBox("value")
              );
              i && (o = $(this).gUnitBox("value").toUnit(a.GLength.Unit.PT));
              var l = $(this)
                .parents(".effect-settings")
                .find('[data-property="' + n + '"].g-input-slider');
              l.gInputSlider("value") != o && l.gInputSlider("value", o),
                null !== o &&
                  "number" == typeof o &&
                  o >= r &&
                  o <= s &&
                  t([n], [o]);
            });
        return (
          i
            ? ((u = new a.GLength(o, a.GLength.Unit.PT)),
              g
                .gUnitBox({ minValue: r, maxValue: s, source: "effects" })
                .gUnitBox("value", u))
            : g
                .gInputBox({
                  minValue: r,
                  maxValue: s,
                  postfix: c || "",
                  incrementValue: (s - r) / 100,
                })
                .gInputBox("value", o),
          $("<div></div>").gPropertyRow({
            columns: [
              {
                label: e,
                width: "75%",
                content: $("<div>")
                  .gInputSlider({
                    type: "range",
                    maxDecimal: d,
                    min: r,
                    max: s,
                    step: l || (s - r) / 100,
                  })
                  .gInputSlider("value", o)
                  .attr("data-property", n)
                  .on("mousedown", function () {
                    p.hideSelection(),
                      $(document).one("mouseup", function () {
                        p.resetHideSelection();
                      });
                  })
                  .on("input", function (e) {
                    var o = $(this),
                      i = parseFloat(o.gInputSlider("value"));
                    t([n], [i], !0),
                      o
                        .parents(".effect-settings")
                        .find(
                          '[data-property="' + n + '"]:not(.g-input-slider)'
                        )
                        .val(o.gInputSlider("value"));
                  })
                  .on("change", function (e) {
                    var t = $(this),
                      o = t.gInputSlider("value");
                    t.parents(".effect-settings")
                      .find('[data-property="' + n + '"]:not(.g-input-slider)')
                      .val(o)
                      .trigger("change");
                  }),
              },
              { width: "25%", content: g },
            ],
          })
        );
      }
      return (
        g.append(
          f(
            a.GLocale.get(new a.GLocaleKey("GEffectProperties", "text.bend")),
            "b",
            l,
            !0,
            -60,
            60,
            null,
            "",
            1
          )
        ),
        g.append(
          f(
            a.GLocale.get(
              new a.GLocaleKey("GEffectProperties", "text.softness")
            ),
            "s",
            r,
            !1,
            0,
            1,
            null,
            "",
            2
          )
        ),
        g.append(
          f(
            a.GLocale.get(new a.GLocaleKey("GCommonNames", "text.radius")),
            "l",
            s,
            !1,
            0,
            50,
            null,
            "",
            1
          )
        ),
        g.append(
          f(
            a.GLocale.get(
              new a.GLocaleKey("GEffectProperties", "text.coverage")
            ),
            "c",
            c,
            !1,
            0,
            1,
            null,
            "",
            2
          )
        ),
        g.append(
          f(
            a.GLocale.get(new a.GLocaleKey("GCommonNames", "text.angle")),
            "a",
            i,
            !1,
            0,
            360,
            1,
            "°"
          )
        ),
        $("<div></div>")
          .addClass("touch-effects-shadow")
          .gPropertyRow({
            columns: [
              {
                width: "50%",
                label: a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", "text.opacity")
                ),
                content: $("<input>")
                  .attr("type", "text")
                  .attr("data-property", "opc")
                  .on("change", function (e) {
                    var n =
                      a.GLength.parseEquationValue(
                        $(e.target).gInputBox("value")
                      ) / 100;
                    t(["opc"], [n]),
                      $(e.target)
                        .parents(".effect-settings")
                        .find('[data-property="pat"]')
                        .gPatternChooser("opacity", n);
                  })
                  .gInputBox({
                    minValue: 0,
                    maxValue: 100,
                    incrementValue: gDesigner.getOpacityIncrement(),
                    postfix: "%",
                  })
                  .gInputBox("value", a.GUtil.formatOpacity(100 * u)),
              },
              {
                width: "20%",
                label: a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", "text.color")
                ),
                content: $("<div></div>")
                  .attr("data-property", "pat")
                  .gPatternChooser({ types: [a.GColor, a.GGradient] })
                  .gPatternChooser("value", d)
                  .gPatternChooser("opacity", u)
                  .on("chooseropen", function () {
                    h._document.getEditor().hideSelection(),
                      (h._chooserElem = $(this));
                  })
                  .on("chooserclose", function (e, t, n) {
                    h._document && h._document.getEditor().resetHideSelection(),
                      (h._chooserElem = null);
                  })
                  .on("patternchange", function (e, n, o, i, r, s) {
                    var l = [],
                      c = [];
                    void 0 !== n && (l.push("pat"), c.push(n)),
                      "number" == typeof o &&
                        (l.push("opc"),
                        c.push(o),
                        $(e.target)
                          .parents(".effect-settings")
                          .find('[data-property="opc"]')
                          .gInputBox("value", a.GUtil.formatOpacity(100 * o)));
                    var d = null;
                    r &&
                      ((d = { chooserOn: !0 }),
                      null != s && (d.activeStopIdx = s)),
                      t(l, c, i, d);
                  }),
              },
            ],
          })
          .appendTo(g),
        g
      );
    }
    function I(e, t, n) {
      this._document.getScene();
      var o = n ? n.getProperty.bind(n) : e.getProperty.bind(e),
        i = o("a"),
        r = new a.GLength(o("r"), a.GLength.Unit.PT),
        s = new a.GLength(o("o"), a.GLength.Unit.PT),
        l = o("pat"),
        c = o("opc"),
        d = this,
        u = [5, 200],
        p = e.RANGES;
      p && p.r && (u = p.r);
      var g = function (e) {
        return "r" === e
          ? $("<input>")
              .attr("type", "text")
              .gUnitBox({ minValue: u[0], maxValue: u[1], source: "effects" })
              .gUnitBox("value", r)
              .on("change", function (e) {
                t(["r"], [$(this).gUnitBox("value").toUnit(a.GLength.Unit.PT)]);
              })
          : "a" === e
          ? $("<input>")
              .attr("type", "text")
              .gInputBox({ minValue: 5, maxValue: 35, postfix: "°" })
              .gInputBox("value", i)
              .on("change", function (e) {
                t(
                  ["a"],
                  [a.GLength.parseEquationValue($(e.target).gInputBox("value"))]
                );
              })
          : "o" === e
          ? $("<input>")
              .attr("type", "text")
              .gUnitBox({ source: "effects" })
              .gUnitBox("value", s)
              .on("change", function (e) {
                t(["o"], [$(this).gUnitBox("value").toUnit(a.GLength.Unit.PT)]);
              })
          : "opc" === e
          ? $("<input>")
              .attr("type", "text")
              .attr("data-property", "opc")
              .on("change", function (e) {
                var n =
                  a.GLength.parseEquationValue($(e.target).gInputBox("value")) /
                  100;
                t(["opc"], [n]),
                  $(e.target)
                    .parents(".effect-settings")
                    .find('[data-property="pat"]')
                    .gPatternChooser("opacity", n);
              })
              .gInputBox({
                minValue: 0,
                maxValue: 100,
                incrementValue: gDesigner.getOpacityIncrement(),
                postfix: "%",
              })
              .gInputBox("value", a.GUtil.formatOpacity(100 * c))
          : "pat" === e
          ? $("<div></div>")
              .attr("data-property", "pat")
              .gPatternChooser({ types: [a.GColor] })
              .gPatternChooser("value", l)
              .gPatternChooser("opacity", c)
              .on("chooseropen", function () {
                d._document.getEditor().hideSelection(),
                  (d._chooserElem = $(this));
              })
              .on("chooserclose", function (e, t, n) {
                d._document && d._document.getEditor().resetHideSelection(),
                  (d._chooserElem = null);
              })
              .on("patternchange", function (e, n, o, i, r) {
                var s = [],
                  l = [];
                void 0 !== n && (s.push("pat"), l.push(n)),
                  "number" == typeof o &&
                    (s.push("opc"),
                    l.push(o),
                    $(e.target)
                      .parents(".effect-settings")
                      .find('[data-property="opc"]')
                      .gInputBox("value", a.GUtil.formatOpacity(100 * o)));
                var c = null;
                r && (c = { chooserOn: !0 }), t(s, l, i, c);
              })
          : void 0;
      };
      return $("<div></div>").append(
        $("<div></div>").gPropertyRow({
          columns: [
            {
              width: "20%",
              label: a.GLocale.get(
                new a.GLocaleKey("GEffectProperties", "text.offset")
              ),
              content: g("o"),
            },
            {
              width: "20%",
              label: a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "text.angle")
              ),
              content: g("a"),
            },
            {
              width: "20%",
              label: a.GLocale.get(
                new a.GLocaleKey("GEffectProperties", "text.blur")
              ),
              content: g("r"),
            },
            {
              width: "20%",
              label: a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "text.opacity")
              ),
              content: g("opc"),
            },
            {
              width: "20%",
              label: a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "text.color")
              ),
              content: g("pat"),
            },
          ],
        })
      );
    }
    function k(e, t, n) {
      this._document.getScene();
      var o = n ? n.getProperty.bind(n) : e.getProperty.bind(e),
        i = o("a"),
        r = new a.GLength(o("l"), a.GLength.Unit.PT),
        s = o("pat"),
        l = o("opc"),
        c = o("den"),
        d = o("fdm"),
        u = this,
        p = function (e) {
          return "l" === e
            ? $("<input>")
                .attr("type", "text")
                .gUnitBox({ minValue: 0, source: "effects" })
                .gUnitBox("value", r)
                .on("change", function (e) {
                  t(
                    ["l"],
                    [$(this).gUnitBox("value").toUnit(a.GLength.Unit.PT)]
                  );
                })
            : "a" === e
            ? $("<input>")
                .attr("type", "text")
                .gInputBox({ minValue: -180, maxValue: 180, postfix: "°" })
                .gInputBox(
                  "value",
                  a.GUtil.formatNumber(Math.round(a.GMath.toDegrees(i)), 1)
                )
                .on("change", function (e) {
                  t(
                    ["a"],
                    [
                      a.GMath.toRadians(
                        a.GLength.parseEquationValue(
                          $(e.target).gInputBox("value")
                        )
                      ),
                    ]
                  );
                })
            : "opc" === e
            ? $("<input>")
                .attr("type", "text")
                .attr("data-property", "opc")
                .on("change", function (e) {
                  var n =
                    a.GLength.parseEquationValue(
                      $(e.target).gInputBox("value")
                    ) / 100;
                  t(["opc"], [n]),
                    $(e.target)
                      .parents(".effect-settings")
                      .find('[data-property="pat"]')
                      .gPatternChooser("opacity", n);
                })
                .gInputBox({ minValue: 0, maxValue: 100, postfix: "%" })
                .gInputBox("value", a.GUtil.formatOpacity(100 * l))
            : "den" === e
            ? $("<input>")
                .attr("type", "text")
                .on("change", function (e) {
                  var n = $(e.target).gInputBox("value") / 100;
                  t(["den"], [n]);
                })
                .gInputBox({
                  minValue: 5,
                  maxValue: 100,
                  incrementValue: 1,
                  postfix: "%",
                })
                .gInputBox("value", a.GUtil.formatNumber(100 * c))
            : "fdm" === e
            ? $("<label></label>")
                .addClass("g-switch")
                .append(
                  $("<input>")
                    .attr("type", "checkbox")
                    .prop("checked", d)
                    .on("change", function (e) {
                      t(["fdm"], [$(this).is(":checked")]);
                    })
                )
                .append($("<div></div>"))
            : "pat" === e
            ? $("<div></div>")
                .attr("data-property", "pat")
                .gPatternChooser({ types: [a.GColor, a.GGradient] })
                .gPatternChooser("value", s)
                .gPatternChooser("opacity", l)
                .on("chooseropen", function () {
                  u._document.getEditor().hideSelection(),
                    (u._chooserElem = $(this));
                })
                .on("chooserclose", function (e, t, n) {
                  u._document && u._document.getEditor().resetHideSelection(),
                    (u._chooserElem = null);
                })
                .on("patternchange", function (e, n, o, i, r, s) {
                  var l = [],
                    c = [];
                  void 0 !== n && (l.push("pat"), c.push(n)),
                    "number" == typeof o &&
                      (l.push("opc"),
                      c.push(o),
                      $(e.target)
                        .parents(".effect-settings")
                        .find('[data-property="opc"]')
                        .gInputBox("value", a.GUtil.formatOpacity(100 * o)));
                  var d = null;
                  r &&
                    ((d = { chooserOn: !0 }),
                    null != s && (d.activeStopIdx = s)),
                    t(l, c, i, d);
                })
            : void 0;
        };
      return $("<div></div>")
        .append(
          $("<div></div>").gPropertyRow({
            columns: [
              {
                width: "33%",
                label: a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", "text.angle")
                ),
                content: p("a"),
              },
              {
                width: "33%",
                label: a.GLocale.get(
                  new a.GLocaleKey("GEffectProperties", "text.length")
                ),
                content: p("l"),
              },
              {
                width: "33%",
                label: a.GLocale.get(
                  new a.GLocaleKey("GEffectProperties", "text.density")
                ),
                content: p("den"),
              },
            ],
          })
        )
        .append(
          $("<div></div>").gPropertyRow({
            columns: [
              {
                width: "33%",
                label: a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", "text.color")
                ),
                content: p("pat"),
              },
              {
                width: "33%",
                label: a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", "text.opacity")
                ),
                content: p("opc"),
              },
              {
                width: "33%",
                label: a.GLocale.get(
                  new a.GLocaleKey("GEffectProperties", "text.fade")
                ),
                content: p("fdm"),
              },
            ],
          })
        );
    }
    function O(e, t, n) {
      this._document.getScene();
      var o = n ? n.getProperty.bind(n) : e.getProperty.bind(e),
        i = this._document.getEditor(),
        r = new a.GLength(o("r"), a.GLength.Unit.PT),
        s = o("b"),
        l = $("<div></div>");
      return (
        $("<div></div>")
          .gPropertyRow({
            columns: [
              {
                label: a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", "text.radius")
                ),
                width: "75%",
                content: $("<div>")
                  .gInputSlider({
                    maxDecimal: 1,
                    min: "0",
                    max: new a.GLength(K ? 50 : 10, a.GLength.Unit.PT).toUnit(
                      a.GLength.Unit.PX
                    ),
                    step: "0.1",
                  })
                  .gInputSlider("value", o("r"))
                  .attr("data-property", "r")
                  .on("mousedown", function () {
                    i.hideSelection(),
                      $(document).one("mouseup", function () {
                        i.resetHideSelection();
                      });
                  })
                  .on("input", function (e) {
                    var n = $(this),
                      o = parseFloat(n.gInputSlider("value"));
                    t(["r"], [o], !0),
                      n
                        .parents(".effect-settings")
                        .find('[data-property="r"]:not(.g-input-slider)')
                        .val(n.gInputSlider("value"));
                  })
                  .on("change", function (e) {
                    var t = $(this),
                      n = parseFloat(t.gInputSlider("value"));
                    t.parents(".effect-settings")
                      .find('[data-property="r"]:not(.g-input-slider)')
                      .val(n)
                      .trigger("change");
                  }),
              },
              {
                width: "25%",
                content: $("<input>")
                  .attr("data-property", "r")
                  .gUnitBox({ source: "effects" })
                  .gUnitBox("value", r)
                  .on("change", function (e) {
                    var n = $(this).gUnitBox("value"),
                      o = n ? n.toUnit(a.GLength.Unit.PT) : null,
                      i = $(this)
                        .parents(".effect-settings")
                        .find('[data-property="r"].g-input-slider');
                    parseFloat(i.gInputSlider("value")) != o &&
                      i.gInputSlider("value", o),
                      null !== o &&
                        "number" == typeof o &&
                        o >= 0 &&
                        o <= 254 &&
                        t(["r"], [o]);
                  }),
              },
            ],
          })
          .appendTo(l),
        $("<div></div>")
          .gPropertyRow({
            columns: [
              {
                label: a.GLocale.get(new a.GLocaleKey("GWebGLEffect", "clip")),
                width: "25%",
                content: $("<label></label>")
                  .addClass("g-switch")
                  .append(
                    $("<input>")
                      .attr("type", "checkbox")
                      .prop("checked", s)
                      .on("change", function (e) {
                        t(["b"], [$(this).is(":checked")]);
                      })
                  )
                  .append($("<div></div>")),
              },
            ],
          })
          .appendTo(l),
        l
      );
    }
    function F(e, t, n) {
      var o = this._document.getEditor(),
        i = n ? n.getProperty.bind(n) : e.getProperty.bind(e),
        r = i("pat"),
        s = i("opc"),
        l = i("alm"),
        c = this;
      return $("<div></div>").append(
        $("<div></div>")
          .addClass("touch-effects-overlay")
          .gPropertyRow({
            columns: [
              {
                width: "20%",
                label: a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", "text.color")
                ),
                content: $("<div></div>")
                  .attr("data-property", "pat")
                  .gPatternChooser({ types: [a.GColor, a.GGradient] })
                  .gPatternChooser("value", r)
                  .gPatternChooser("opacity", s)
                  .on("chooseropen", function () {
                    o.hideSelection(),
                      gDesigner
                        .getWorkspace()
                        .getStyleEdManager()
                        .updateEditor(e, "pat", !1),
                      (c._styleEdOn = !0),
                      (c._chooserElem = $(this));
                  })
                  .on("chooserclose", function (e, t, n) {
                    gDesigner
                      .getWorkspace()
                      .getStyleEdManager()
                      .getOverlayLock(n)
                      ? t()
                      : ((c._styleEdOn = !1),
                        gDesigner
                          .getWorkspace()
                          .getStyleEdManager()
                          .deactivateEditor(),
                        o.resetHideSelection()),
                      (c._chooserElem = null);
                  })
                  .on("patternchange", function (e, n, o, i, a, r) {
                    var s = [],
                      l = [];
                    void 0 !== n && (s.push("pat"), l.push(n)),
                      "number" == typeof o && (s.push("opc"), l.push(o));
                    var c = null;
                    a &&
                      ((c = { chooserOn: !0 }),
                      null != r && (c.activeStopIdx = r)),
                      t(s, l, i, c);
                  }),
              },
              { width: "20%" },
              {
                width: "20%",
                label: a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", "text.opacity")
                ),
                content: $("<input>")
                  .attr("type", "text")
                  .attr("data-property", "opc")
                  .on("change", function (e) {
                    var n = $(e.target).gInputBox("value") / 100;
                    t(["opc"], [n]);
                  })
                  .gInputBox({
                    minValue: 0,
                    maxValue: 100,
                    incrementValue: gDesigner.getOpacityIncrement(),
                    postfix: "%",
                  })
                  .gInputBox("value", a.GUtil.formatOpacity(100 * s)),
              },
              { width: "20%" },
              {
                width: "20%",
                label: a.GLocale.get(
                  new a.GLocaleKey("GEffectProperties", "text.blend")
                ),
                content: $("<div/>")
                  .css({ display: "flex", justifyContent: "center" })
                  .append(
                    $("<label></label>")
                      .addClass("g-switch")
                      .css({ width: "20px", alignSelf: "center" })
                      .append(
                        $("<input>")
                          .attr("type", "checkbox")
                          .prop("checked", l)
                          .on("change", function (e) {
                            if ($(this).is(":checked")) {
                              var n = new a.GLinearGradient([
                                {
                                  color: a.GRGBColor.BLACK,
                                  position: 0,
                                  opacity: 1,
                                },
                                {
                                  color: a.GRGBColor.WHITE,
                                  position: 1,
                                  opacity: 0,
                                },
                              ]);
                              t(["alm", "opc", "pat"], [!0, 1, n]);
                            } else t(["alm"], [!1]);
                          })
                      )
                      .append($("<div></div>"))
                  ),
              },
            ],
          })
      );
    }
    function R(e, t) {
      return $("<div></div>")
        .append(
          $("<input>")
            .attr("type", "file")
            .attr("accept", ".acv")
            .css({ position: "absolute", left: "-10000px" })
            .on("change", function (e) {
              gDesigner.stats("effects_change_colorgrading");
              var n = $(e.target)[0].files;
              if (
                n &&
                n.length &&
                (n[0] instanceof File || n[0] instanceof Blob)
              ) {
                var o = new FileReader();
                (o.onload = function () {
                  var e = a.GUtil.readACVFile(o.result);
                  e && t(["cp"], [e]);
                }),
                  o.readAsArrayBuffer(n[0]);
              }
            })
        )
        .append(
          $("<select></select>")
            .append(
              $("<option></option>")
                .attr("value", "")
                .text(
                  a.GLocale.get(new a.GLocaleKey("GCommonNames", "text.none"))
                )
            )
            .append(
              $(
                '<optgroup label="'.concat(
                  a.GLocale.get(
                    new a.GLocaleKey(
                      "GEffectProperties",
                      "text.color.gradient.grp.instagram"
                    )
                  ),
                  '"></optgroup>'
                )
              )
                .append(
                  $("<option></option>")
                    .attr("value", "1977")
                    .text(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GEffectProperties",
                          "text.color.gradient.opt.1977"
                        )
                      )
                    )
                )
                .append(
                  $("<option></option>")
                    .attr(
                      "value",
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GEffectProperties",
                          "text.color.gradient.opt.brannan"
                        )
                      )
                    )
                    .text("Brannan")
                )
                .append(
                  $("<option></option>")
                    .attr("value", "Gotham")
                    .text(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GEffectProperties",
                          "text.color.gradient.opt.gotham"
                        )
                      )
                    )
                )
                .append(
                  $("<option></option>")
                    .attr("value", "Hefe")
                    .text(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GEffectProperties",
                          "text.color.gradient.opt.hefe"
                        )
                      )
                    )
                )
                .append(
                  $("<option></option>")
                    .attr("value", "Lord Kelvin")
                    .text(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GEffectProperties",
                          "text.color.gradient.opt.lord-kelvin"
                        )
                      )
                    )
                )
                .append(
                  $("<option></option>")
                    .attr("value", "Nashville")
                    .text(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GEffectProperties",
                          "text.color.gradient.opt.nashville"
                        )
                      )
                    )
                )
                .append(
                  $("<option></option>")
                    .attr("value", "X-PRO II")
                    .text(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GEffectProperties",
                          "text.color.gradient.opt.x-pro-ii"
                        )
                      )
                    )
                )
            )
            .on("change", function (e) {
              var n = $(e.target).val();
              if ((gDesigner.stats("effects_change_grading", n || "none"), n)) {
                var o = new XMLHttpRequest();
                o.addEventListener("load", function () {
                  if (200 == o.status && o.response) {
                    var e = a.GUtil.readACVFile(o.response);
                    e && t(["cp"], [e]);
                  }
                }),
                  o.open("GET", "assets/data/acv/" + n + ".acv"),
                  (o.responseType = "arraybuffer"),
                  o.send(null);
              } else t(["cp"], [null]);
            })
        )
        .append(
          $("<button></button>")
            .text(
              a.GLocale.get(
                new a.GLocaleKey("GEffectProperties", "text.load-acv")
              ) + "..."
            )
            .on("click", function (e) {
              gDesigner.stats("effects_choose_acv"),
                $(e.target)
                  .parents(".effect-settings")
                  .find('input[type="file"]')
                  .focus()
                  .trigger("click");
            })
        );
    }
    function M(e, t) {
      for (
        var n = a.GObject.getTypeId(e),
          o = (a.GNode.getClassFromId(n), e.getFXArray()),
          i = $("<div></div>"),
          r = 0;
        r < o.length;
        r++
      )
        for (
          var s = o[r],
            l = a.GNode.getClassFromId(a.GObject.getTypeId(o[r])),
            c = a.GNode.getName(l),
            d = 0;
          d < V.length;
          d++
        )
          if (V[d].clazz === l) {
            i.append(
              V[d].createSettings
                .call(this, e, B(c, t), s)
                .css("margin-top", "7px")
            );
            break;
          }
      return i;
    }
    function N(e, t, n) {
      var o = this._document.getEditor(),
        i = n ? n.getProperty.bind(n) : e.getProperty.bind(e),
        r = i("opc"),
        s = new a.GLength(i("pad")),
        l = i("rfh"),
        c = function (e) {
          return "rfh" === e
            ? $("<input>")
                .attr("data-property", e)
                .attr("type", "text")
                .on("change", function (n) {
                  var o =
                    a.GLength.parseEquationValue(
                      $(n.target).gInputBox("value")
                    ) / 100;
                  t([e], [o]);
                })
                .gInputBox({
                  minValue: 0,
                  maxValue: 100,
                  incrementValue: 10,
                  slowIncrementValue: 1,
                  postfix: "%",
                })
                .gInputBox("value", 100 * l)
            : "pad" === e
            ? $("<input>")
                .attr("data-property", e)
                .attr("type", "text")
                .on("change", function (n) {
                  var o = $(n.target).gUnitBox("value").getValue();
                  t([e], [o]);
                })
                .gUnitBox({ minValue: 0, incrementValue: 1, source: "effects" })
                .gUnitBox("value", s)
            : "opacity-slider" === e
            ? $("<div/>")
                .attr("data-property", "opc")
                .gInputSlider({ type: "range", min: 0, max: 100 })
                .on("mousedown", function () {
                  o.hideSelection(),
                    $(document).one("mouseup", function () {
                      o.resetHideSelection();
                    });
                })
                .on("input", function (e) {
                  var n = $(e.target),
                    o = parseInt(n.gInputSlider("value")) / 100;
                  t(["opc"], [o]),
                    $(e.target)
                      .parents(".effect-settings")
                      .find('[type="text"][data-property="opc"]')
                      .gInputBox("value", a.GUtil.formatOpacity(100 * o));
                })
                .on("change", function (e) {
                  t(["opc"], [parseFloat($(this).gInputSlider("value")) / 100]);
                })
                .gInputSlider("value", 100 * r)
            : "opacity-input" === e
            ? $("<input>")
                .attr("type", "text")
                .attr("data-property", "opc")
                .on("change", function (e) {
                  var n = $(this).gInputBox("value");
                  $(this)
                    .parents(".effect-settings")
                    .find('[data-property="opc"].g-input-slider')
                    .gInputSlider("value", n),
                    t(
                      ["opc"],
                      [
                        a.GLength.parseEquationValue(
                          $(this).gInputBox("value")
                        ) / 100,
                      ]
                    );
                })
                .gInputBox({
                  minValue: 0,
                  maxValue: 100,
                  incrementValue: 5,
                  postfix: "%",
                })
                .gInputBox("value", a.GUtil.formatOpacity(100 * r))
            : void 0;
        };
      return $("<div></div>").gPropertyRow({
        columns: [
          {
            width: "auto",
            label: a.GLocale.get(
              new a.GLocaleKey("GCommonNames", "text.opacity")
            ),
            content: $("<div></div>").gPropertyRow({
              columns: [
                { width: "auto", content: c("opacity-slider") },
                {
                  width: $("body").hasClass("g-touch") ? "60px" : "40px",
                  content: c("opacity-input"),
                },
              ],
            }),
          },
          {
            width: $("body").hasClass("g-touch") ? "60px" : "40px",
            label: a.GLocale.get(
              new a.GLocaleKey("GEffectProperties", "text.padding")
            ),
            content: c("pad"),
          },
          {
            width: $("body").hasClass("g-touch") ? "60px" : "40px",
            label: a.GLocale.get(
              new a.GLocaleKey("GEffectProperties", "text.height")
            ),
            content: c("rfh"),
          },
        ],
      });
    }
    function B(e, t) {
      return function (n, o, i) {
        for (var a = n.slice(), r = o.slice(), s = 0; s < a.length; s++)
          (a[s] = e + "&" + a[s]), (r[s] = o[s]);
        t(a, r, i);
      };
    }
    function U(e) {
      var t = null;
      t = e instanceof a.GStylable.Effect ? e.constructor : e;
      for (var n = 0; n < V.length; ++n) if (V[n].clazz === t) return V[n];
      throw new Error("Invalid effect/class");
    }
    var j = document.createElement("canvas"),
      K = null;
    try {
      K =
        j.getContext("webgl", { premultipliedAlpha: !1 }) ||
        j.getContext("experimental-webgl");
    } catch (e) {
      K = null;
    }
    var V = null,
      H = function () {
        return [
          {
            clazz: a.GGLBlurEffect,
            i18n: "GGLBlurEffect",
            group: "raster",
            createSettings: P,
            icon: "gravit-icon-blur-effect",
          },
          {
            clazz: a.GBlurEffect,
            i18n: "GBlurEffect",
            group: "raster",
            category: _,
            createSettings: O,
            icon: "gravit-icon-blur-effect",
            mostUsed: !0,
          },
          {
            clazz: a.GGLVignetteEffect,
            i18n: "GGLVignetteEffect",
            group: "webgl",
            category: b,
            createSettings: P,
            icon: "gravit-icon-vignette-effect",
            mostUsed: !0,
          },
          {
            clazz: a.GGLColorAdjustEffect,
            i18n: "GGLColorAdjustEffect",
            group: "webgl",
            category: w,
            createSettings: P,
            icon: "gravit-icon-adjust-effect",
            mostUsed: !0,
          },
          {
            clazz: a.GGLRecolourEffect,
            i18n: "GGLRecolourEffect",
            group: "webgl",
            category: w,
            createSettings: P,
            icon: "gravit-icon-recolour-effect",
            mostUsed: !0,
          },
          {
            clazz: a.GOverlayEffect,
            i18n: "GOverlayEffect",
            group: "filter",
            category: w,
            createSettings: F,
            icon: "gravit-icon-overlay-effect",
            mostUsed: !0,
          },
          {
            clazz: a.GMirrorEffect,
            i18n: "GMirrorEffect",
            group: "mirror",
            category: x,
            createSettings: N,
            icon: "gravit-icon-mirror-effect",
            mostUsed: !0,
          },
          {
            clazz: a.GCurvedShadowEffect,
            i18n: "GCurvedShadowEffect",
            group: "raster",
            category: S,
            createSettings: L,
            icon: "gravit-icon-curved-shadow-effect",
            mostUsed: !0,
          },
          {
            clazz: a.GDropShadowEffect,
            i18n: "GDropShadowEffect",
            group: "raster",
            category: S,
            createSettings: D,
            icon: "gravit-icon-drop-shadow-effect",
            mostUsed: !0,
          },
          {
            clazz: a.GInnerShadowEffect,
            i18n: "GInnerShadowEffect",
            group: "raster",
            category: S,
            createSettings: D,
            icon: "gravit-icon-inner-shadow-effect",
            mostUsed: !0,
          },
          {
            clazz: a.GGLBulgePinchEffect,
            i18n: "GGLBulgePinchEffect",
            group: "webgl",
            category: C,
            createSettings: P,
            icon: "gravit-icon-bulge-effect",
          },
          {
            clazz: a.GGLColorHalfToneEffect,
            i18n: "GGLColorHalfToneEffect",
            group: "webgl",
            category: w,
            createSettings: P,
            icon: "gravit-icon-half-tone-effect",
          },
          {
            clazz: a.GGLDotScreenEffect,
            i18n: "GGLDotScreenEffect",
            group: "webgl",
            category: b,
            createSettings: P,
            icon: "gravit-icon-dotscreen-effect",
          },
          {
            clazz: a.GGLBrightnessContrastEffect,
            i18n: "GGLBrightnessContrastEffect",
            group: "webgl",
            category: w,
            hidden: !0,
            createSettings: P,
          },
          {
            clazz: a.GGLFisheyeEffect,
            i18n: "GGLFisheyeEffect",
            group: "webgl",
            category: C,
            createSettings: P,
            icon: "gravit-icon-fisheye-effect",
          },
          {
            clazz: a.GGLBendEffect,
            i18n: "GGLBendEffect",
            group: "webgl",
            category: C,
            createSettings: P,
            icon: "gravit-icon-bend-effect",
          },
          {
            clazz: a.GGLDenoiseEffect,
            i18n: "GGLDenoiseEffect",
            group: "webgl",
            category: w,
            createSettings: P,
            icon: "gravit-icon-denoise-effect",
          },
          {
            clazz: a.GGLEdgeWorkEffect,
            i18n: "GGLEdgeWorkEffect",
            group: "webgl",
            category: b,
            createSettings: P,
            icon: "gravit-icon-edge-work-effect",
          },
          {
            clazz: a.GGLHexagonalEffect,
            i18n: "GGLHexagonalEffect",
            group: "webgl",
            category: b,
            createSettings: P,
            icon: "gravit-icon-hexagonal-effect",
          },
          {
            clazz: a.GGLHueSaturationEffect,
            i18n: "GGLHueSaturationEffect",
            group: "webgl",
            category: w,
            hidden: !0,
            createSettings: P,
          },
          {
            clazz: a.GColorAdjustMultiEffect,
            i18n: "GColorAdjustMultiEffect",
            group: "webgl",
            category: w,
            createSettings: M,
            hidden: !0,
          },
          {
            clazz: a.GGLInkEffect,
            i18n: "GGLInkEffect",
            group: "webgl",
            category: b,
            createSettings: P,
            icon: "gravit-icon-ink-effect",
          },
          {
            clazz: a.GGLLensBlurEffect,
            i18n: "GGLLensBlurEffect",
            group: "webgl",
            category: _,
            createSettings: P,
            icon: "gravit-icon-lens-blur-effect",
          },
          {
            clazz: a.GGLNoiseEffect,
            i18n: "GGLNoiseEffect",
            group: "webgl",
            category: w,
            createSettings: P,
            icon: "gravit-icon-noise-effect",
          },
          {
            clazz: a.GGLSepiaEffect,
            i18n: "GGLSepiaEffect",
            group: "webgl",
            category: w,
            createSettings: P,
            icon: "gravit-icon-sepia-effect",
          },
          {
            clazz: a.GGLSwirlEffect,
            i18n: "GGLSwirlEffect",
            group: "webgl",
            category: C,
            createSettings: P,
            icon: "gravit-icon-swirl-effect",
          },
          {
            clazz: a.GGLTiltShiftEffect,
            i18n: "GGLTiltShiftEffect",
            group: "webgl",
            category: _,
            createSettings: P,
            icon: "gravit-icon-tilt-shift-effect",
          },
          {
            clazz: a.GGLDrunkEffect,
            i18n: "GGLDrunkEffect",
            group: "webgl",
            category: b,
            createSettings: P,
            icon: "gravit-icon-alcohol-effect",
          },
          {
            clazz: a.GGLUnsharpMaskEffect,
            i18n: "GGLUnsharpMaskEffect",
            group: "webgl",
            category: w,
            createSettings: P,
            icon: "gravit-icon-unsharp-mask-effect",
          },
          {
            clazz: a.GGLVibranceEffect,
            i18n: "GGLVibranceEffect",
            group: "webgl",
            category: w,
            createSettings: P,
            icon: "gravit-icon-vibrance-effect",
          },
          {
            clazz: a.GGLBloomEffect,
            i18n: "GGLBloomEffect",
            group: "webgl",
            category: w,
            createSettings: P,
            icon: "gravit-icon-bloom-effect",
          },
          {
            clazz: a.GGLSketchEffect,
            i18n: "GGLSketchEffect",
            group: "webgl",
            category: b,
            createSettings: P,
            icon: "gravit-icon-sketch-effect",
          },
          {
            clazz: a.GGLToonEffect,
            i18n: "GGLToonEffect",
            group: "webgl",
            category: b,
            createSettings: P,
            icon: "gravit-icon-toon-effect",
          },
          {
            clazz: a.GGLZoomBlurEffect,
            i18n: "GGLZoomBlurEffect",
            group: "webgl",
            category: _,
            createSettings: P,
            icon: "gravit-icon-zoom-blur-effect",
          },
          {
            clazz: a.GGLStrokeLayerEffect,
            i18n: "GGLStrokeLayerEffect",
            group: "raster",
            category: x,
            createSettings: P,
            icon: "gravit-icon-stroke-effect",
          },
          {
            clazz: a.GGLInnerGlowEffect,
            i18n: "GGLInnerGlowEffect",
            group: "raster",
            category: x,
            createSettings: P,
            icon: "gravit-icon-inner-glow-effect",
          },
          {
            clazz: a.GGLOuterGlowEffect,
            i18n: "GGLOuterGlowEffect",
            group: "raster",
            category: x,
            createSettings: P,
            icon: "gravit-icon-outer-glow-effect",
          },
          {
            clazz: a.GContactShadowEffect,
            i18n: "GContactShadowEffect",
            group: "raster",
            category: S,
            createSettings: I,
            icon: "gravit-icon-contact-shadow-effect",
          },
          {
            clazz: a.GLongShadowEffect,
            i18n: "GLongShadowEffect",
            group: "raster",
            category: S,
            createSettings: k,
            icon: "gravit-icon-long-shadow-effect",
          },
          {
            clazz: a.GColorGradingEffect,
            i18n: "GColorGradingEffect",
            group: "filter",
            category: w,
            createSettings: R,
            icon: "gravit-icon-color-grading-effect",
          },
        ];
      };
    e.exports = E;
  }