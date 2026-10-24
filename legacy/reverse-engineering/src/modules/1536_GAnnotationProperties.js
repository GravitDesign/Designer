/**
 * Webpack Module #1536
 * Type: class
 * Name: GAnnotationProperties
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58), n(19), n(8), n(3), n(71), n(4), n(13), n(32), n(97), n(33), n(26);
    var i = n(53),
      a = n(1),
      r = o(n(358)),
      s = n(123);
    const l = n(393),
      c = n(392),
      d = n(1165),
      u = n(135);
    function p(e, t, n, o, i, a, r, s) {
      (this._elements = []),
        (this._availableProperties = e || []),
        (this._propertyClass = t),
        (this._propertyTool = n),
        (this._toolbarIcon = o),
        (this._toolbarTooltip = i),
        (this._tooltips = a),
        (this._pendingUpdates = new Map()),
        (this._statType = r),
        (this._panelClass = s);
    }
    a.GObject.inherit(p, s),
      (p.PropertySet = {
        BorderHeadMarker: "_bhm",
        BorderTailMarker: "_btm",
        FillLayer: "_ptf",
        BorderLayer: "_ptb",
        BorderWidth: "_bw",
      }),
      (p.PropertyTarget = {
        FillLayer: p.PropertySet.FillLayer,
        BorderLayer: p.PropertySet.BorderLayer,
        Element: null,
      }),
      (p.prototype._panel = null),
      (p.prototype._pendingUpdates = null),
      (p.prototype._document = null),
      (p.prototype._elements = null),
      (p.prototype._availableProperties = null),
      (p.prototype._propertyClass = null),
      (p.prototype._propertyTool = null),
      (p.prototype._toolbarIcon = null),
      (p.prototype._toolbarTooltip = null),
      (p.prototype._tooltips = null),
      (p.prototype._isEditing = !1),
      (p.prototype.init = function (e, t) {
        (this._panel = e), this._panel.addClass(this._panelClass);
        var n = function (e) {
            var t = this;
            if (
              e === p.PropertySet.BorderLayer ||
              e === p.PropertySet.FillLayer
            ) {
              let n,
                o = () =>
                  e === p.PropertySet.FillLayer
                    ? t._statType + "/FillColor"
                    : e === p.PropertySet.BorderLayer
                    ? t._statType + "/OutlineColor"
                    : void 0,
                i = $("<div></div>")
                  .attr("data-property", e)
                  .toggleClass(
                    "g-disabled",
                    !this._getAppManager().isCommentingEditingEnabled()
                  )
                  .gPatternChooser({
                    types: [a.GColor],
                    singleOption: !0,
                    onOpen: function () {
                      gDesigner.stats("annotations_open_patternchooser", o());
                    },
                    onClickEyedropper: function () {
                      gDesigner.stats("annotations_click_eyedropper", o());
                    },
                  })
                  .on("chooseropen", function () {
                    try {
                      t._document.getEditor().hideSelection(),
                        (t._chooserElem = $(this));
                    } finally {
                      t.setIsEditing(!0);
                    }
                  })
                  .on("chooserclose", function (e, n, o) {
                    try {
                      gDesigner
                        .getWorkspace()
                        .getStyleEdManager()
                        .getOverlayLock(o)
                        ? n()
                        : ((t._styleEdOn = !1),
                          gDesigner
                            .getWorkspace()
                            .getStyleEdManager()
                            .deactivateEditor(),
                          t._document &&
                            t._document.getEditor().resetHideSelection()),
                        (t._chooserElem = null);
                    } finally {
                      t.setIsEditing(!1);
                    }
                  })
                  .on("patternchange", function (n, o, i, r, s, l) {
                    if (t._getAppManager().isCommentingEditingEnabled()) {
                      var c = ["_vs"],
                        d = [!0];
                      void 0 !== o && (c.push("_pt"), d.push(o)),
                        "number" == typeof i && (c.push("_op"), d.push(i));
                      var u = null;
                      s &&
                        ((u = { chooserOn: !0 }),
                        null != l && (u.activeStopIdx = l)),
                        t._assignProperties(
                          c,
                          d,
                          a.GLocale.get(
                            new a.GLocaleKey(
                              "GAnnotationProperties",
                              "text.change-annotation-style"
                            )
                          ),
                          r,
                          e,
                          u
                        );
                    }
                  })
                  .prepend(
                    this._availableProperties.includes(
                      p.PropertySet.BorderLayer
                    ) &&
                      this._availableProperties.includes(
                        p.PropertySet.FillLayer
                      )
                      ? $("<span>")
                          .addClass("gravit-icon")
                          .addClass("patternchooser-icon")
                          .addClass(
                            e === p.PropertySet.BorderLayer
                              ? "gravit-icon-pen"
                              : "gravit-icon-annotation-fill"
                          )
                      : null
                  );
              return (
                i
                  .find("span.preview.g-button")
                  .attr(
                    "data-title",
                    a.GLocale.get(
                      new a.GLocaleKey(
                        "GAnnotationProperties",
                        this._tooltips[e]
                      )
                    )
                  ),
                i
                  .find("div.eyedropper")
                  .attr(
                    "data-title",
                    a.GLocale.get(
                      new a.GLocaleKey(
                        "GAnnotationProperties",
                        this._tooltips[e + "dropper"]
                      )
                    )
                  ),
                (n =
                  e === p.PropertySet.BorderLayer
                    ? new a.GLocaleKey("GStylable", "layer.border")
                    : new a.GLocaleKey("GStylable", "layer.fill")),
                i.append(
                  $("<span/>").addClass("layer-title").text(a.GLocale.get(n))
                ),
                i
              );
            }
            if (e === p.PropertySet.BorderWidth) {
              var n = (n, o) => {
                if (this._getAppManager().isCommentingEditingEnabled()) {
                  gDesigner.stats("annotations_line-width", this._statType);
                  var i = $(n).gUnitBox("value"),
                    r = i ? i.toUnit(a.GLength.Unit.PX) : null;
                  if (null !== r && r >= 0) {
                    const n = ["_vs", e],
                      i = [!0, r],
                      a = void 0,
                      s = p.PropertyTarget.BorderLayer;
                    o
                      ? this._recordPendingUpdateForSelection(e, n, i, a, s)
                      : this._cleanPendingUpdateForSelection(e),
                      t._assignProperties(n, i, a, o, s);
                  } else t._updateProperties();
                }
              };
              return $("<input>")
                .attr("data-property", e)
                .attr(
                  "data-title",
                  a.GLocale.get(
                    new a.GLocaleKey("GAnnotationProperties", this._tooltips[e])
                  )
                )
                .toggleClass(
                  "g-disabled",
                  !this._getAppManager().isCommentingEditingEnabled()
                )
                .prop(
                  "disabled",
                  !this._getAppManager().isCommentingEditingEnabled()
                )
                .on("change", function () {
                  n(this, !0);
                })
                .blur(function () {
                  n(this);
                })
                .gUnitBox({ minValue: 0, source: "border" });
            }
            if (
              e === p.PropertySet.BorderHeadMarker ||
              e === p.PropertySet.BorderTailMarker
            ) {
              const n = (n) => {
                  if (!this._getAppManager().isCommentingEditingEnabled())
                    return;
                  const o = $(n.target).prop("checked"),
                    i = e === p.PropertySet.BorderHeadMarker ? "head" : "tail";
                  gDesigner.stats(
                    "annotations_border-marker_".concat(i),
                    o ? "on" : "off"
                  ),
                    t._assignProperty(
                      e,
                      o ? a.GStylable.BorderMarker.Arrow : null,
                      void 0,
                      void 0,
                      p.PropertyTarget.BorderLayer
                    );
                },
                o = $("<input>")
                  .attr("data-property", e)
                  .addClass("custom-checkbox-mode")
                  .attr("type", "checkbox")
                  .toggleClass(
                    "g-disabled",
                    !this._getAppManager().isCommentingEditingEnabled()
                  )
                  .prop(
                    "disabled",
                    !this._getAppManager().isCommentingEditingEnabled()
                  )
                  .on("change", n);
              return (
                gDesigner.isTouchEnabled() && o.gCheckboxSlider(),
                $("<label>")
                  .append(o)
                  .append(
                    $("<span>").text(
                      e === p.PropertySet.BorderTailMarker
                        ? a.GLocale.get(
                            new a.GLocaleKey(
                              "GAnnotationProperties",
                              "text.end-arrow"
                            )
                          )
                        : a.GLocale.get(
                            new a.GLocaleKey(
                              "GAnnotationProperties",
                              "text.start-arrow"
                            )
                          )
                    )
                  )
              );
            }
            throw new Error("Unknown input property: " + e);
          }.bind(this),
          o = [];
        this._availableProperties.indexOf(p.PropertySet.BorderHeadMarker) >=
          0 &&
          this._availableProperties.indexOf(p.PropertySet.BorderTailMarker) >=
            0 &&
          (this._availableProperties.splice(
            this._availableProperties.indexOf(p.PropertySet.BorderHeadMarker),
            1
          ),
          this._availableProperties.splice(
            this._availableProperties.indexOf(p.PropertySet.BorderTailMarker),
            1
          ),
          this._availableProperties.push("arrows"));
        for (var r = 0; r < this._availableProperties.length; r++) {
          let e = this._availableProperties[r];
          o.push({
            clazz:
              this._availableProperties.includes(p.PropertySet.BorderLayer) &&
              this._availableProperties.includes(p.PropertySet.FillLayer)
                ? "larger"
                : "arrows" === e
                ? "auto-grow"
                : "medium",
            content:
              "arrows" === e
                ? $("<div>")
                    .append(n(p.PropertySet.BorderHeadMarker))
                    .append(n(p.PropertySet.BorderTailMarker))
                    .addClass("arrows")
                : n(e),
          });
        }
        $("<div></div>").gPropertyRow({ columns: o }).appendTo(this._panel),
          this._availableProperties.indexOf(p.PropertySet.FillLayer) >= 0 &&
            this._availableProperties.indexOf(p.PropertySet.BorderLayer) >= 0 &&
            this._panel
              .find('[data-property="'.concat(p.PropertySet.FillLayer, '"]'))
              .closest(".column")
              .css("margin-right", "40px"),
          this._availableProperties.indexOf(p.PropertySet.BorderWidth) >= 0 &&
            this._panel
              .find('[data-property="'.concat(p.PropertySet.BorderWidth, '"]'))
              .closest(".column")
              .css("margin-right", "10px"),
          (this._toolbarButton = $("<button>")
            .attr("class", "toolbar-button icon " + this._toolbarIcon)
            .toggleClass(
              "g-disabled",
              !this._getAppManager().isCommentingEditingEnabled()
            )
            .attr(
              "data-title",
              a.GLocale.get(
                new a.GLocaleKey("GAnnotationProperties", this._toolbarTooltip)
              )
            )
            .on("click", () => {
              if (
                (gDesigner.stats(
                  "annotations_click_toolbar-btn",
                  this._statType
                ),
                this._getAppManager().isCommentingEditingEnabled())
              ) {
                var e = gDesigner.getToolManager().getTool(this._propertyTool);
                e === gDesigner.getToolManager().getActiveTool()
                  ? gDesigner
                      .getToolManager()
                      .activateTool(i.GPointerTool, null, !0)
                  : gDesigner.getToolManager().activateTool(e, null, !0);
              }
            })
            .data("toolClass", this._propertyTool)
            .prependTo(t));
      }),
      (p.prototype._settingChanged = function (e) {
        "touch" === e.key && this._updateTouchComponents();
      }),
      (p.prototype._updateTouchComponents = function (e) {
        const t = this._panel.find(".custom-checkbox-mode");
        gDesigner.isTouchEnabled()
          ? t.gCheckboxSlider()
          : t.gCheckboxSlider("unmount");
      }),
      (p.prototype.update = function (e, t, n) {
        if (
          (this._document &&
            (this._applyPendingUpdateForSelection(),
            gDesigner.removeEventListener(c, this._stateChangedEvent, this),
            gDesigner
              .getFileReviewManager()
              .removeEventListener(
                d.UpdateEvent,
                this._handleReviewUpdate,
                this
              ),
            gDesigner.removeEventListener(u, this._settingChanged, this),
            this._document.getScene() &&
              this._document
                .getScene()
                .removeEventListener(
                  a.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange
                ),
            this._document.removeEventListener(
              l,
              this._collaborationEvent,
              this
            ),
            (this._document = null)),
          (this._elements = []),
          e && t && e.getScene())
        ) {
          if (
            (gDesigner.addEventListener(c, this._stateChangedEvent, this),
            gDesigner
              .getFileReviewManager()
              .addEventListener(d.UpdateEvent, this._handleReviewUpdate, this),
            gDesigner.addEventListener(u, this._settingChanged, this),
            t)
          )
            for (var o = 0; o < t.length; ++o) {
              var i = t[o];
              ((i instanceof a.GStyle &&
                n &&
                n instanceof this._propertyTool) ||
                (i instanceof this._propertyClass &&
                  i.hasMixin(a.GAnnotation))) &&
                this._elements.push(i);
            }
          if (this._elements.length)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  a.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              this._document.addEventListener(
                l,
                this._collaborationEvent,
                this
              ),
              this._updateProperties(),
              this._updateTouchComponents(),
              !0
            );
        }
        return !1;
      }),
      (p.prototype._collaborationEvent = async function (e) {
        switch (e.type) {
          case l.Type.ReviewStatusChanged:
            this._updateToolbar(),
              this._elements.length && this._updateProperties();
        }
      }),
      (p.prototype._handleReviewUpdate = async function (e) {
        this._updateToolbar(),
          this._elements.length && this._updateProperties();
      }),
      (p.prototype._stateChangedEvent = async function (e) {
        this._updateToolbar(),
          this._document &&
            e.document === this._document &&
            this._updateProperties();
      }),
      (p.prototype._getAppManager = function () {
        return (
          this._appManager ||
            (this._appManager = gDesigner.getApplicationManager()),
          this._appManager
        );
      }),
      (p.prototype._updateToolbar = function () {
        this._toolbarButton.toggleClass(
          "g-disabled",
          !this._getAppManager().isCommentingEditingEnabled()
        );
      }),
      (p.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          e.node === this._elements[0] &&
          this._availableProperties.some((t) => e.properties.indexOf(t) >= 0) &&
          this._updateProperties();
      }),
      (p.prototype._recordPendingUpdateForSelection = function (e, t, n, o, i) {
        this._pendingUpdates.set(e, {
          props: t,
          values: n,
          title: o,
          target: i,
        });
      }),
      (p.prototype._cleanPendingUpdateForSelection = function (e) {
        this._pendingUpdates.delete(e);
      }),
      (p.prototype._applyPendingUpdateForSelection = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : null;
        function t(e) {
          const t = this._pendingUpdates.get(e);
          t && this._assignProperties(t.props, t.values, t.title, !1, t.target);
        }
        e
          ? t.call(this, e)
          : this._pendingUpdates.forEach((e, n) => {
              t.call(this, n), this._cleanPendingUpdateForSelection(n);
            });
      }),
      (p.prototype._updateProperties = function () {
        if (!this._elements || !this._elements.length)
          return void console.warn(
            "GAnnotationProperties: empty _elements array"
          );
        if (!this._document.getScene())
          return void console.warn("Scene is null");
        var e = this._elements[0];
        i.GElementEditor.getEditor(e);
        const t =
            !e.hasMixin(a.GAnnotation) ||
            r.default.isOwner(gDesigner.getSyncUser(), e),
          n = this._getAppManager().isCommentingEditingEnabled();
        if (this._availableProperties.indexOf(p.PropertySet.FillLayer) >= 0) {
          var o = e.getPaintLayers().getFillLayers()[0];
          this._panel
            .find('[data-property="'.concat(p.PropertySet.FillLayer, '"]'))
            .gPatternChooser(
              "setPattern",
              o ? o.getProperty("_pt", !1, !1, !0) : null
            )
            .gPatternChooser(
              "value",
              o ? o.getProperty("_pt", !1, !1, !0) : null
            )
            .gPatternChooser(
              "opacity",
              o ? o.getProperty("_op", !1, !1, !0) : null
            ),
            t && n
              ? this._panel
                  .find(
                    '[data-property="'.concat(p.PropertySet.FillLayer, '"]')
                  )
                  .removeClass("g-disabled")
              : this._panel
                  .find(
                    '[data-property="'.concat(p.PropertySet.FillLayer, '"]')
                  )
                  .addClass("g-disabled");
        }
        if (this._availableProperties.indexOf(p.PropertySet.BorderLayer) >= 0) {
          o = e.getPaintLayers().getBorderLayers()[0];
          this._panel
            .find('[data-property="'.concat(p.PropertySet.BorderLayer, '"]'))
            .gPatternChooser(
              "setPattern",
              o ? o.getProperty("_pt", !1, !1, !0) : null
            )
            .gPatternChooser(
              "value",
              o ? o.getProperty("_pt", !1, !1, !0) : null
            )
            .gPatternChooser(
              "opacity",
              o ? o.getProperty("_op", !1, !1, !0) : null
            ),
            t && n
              ? this._panel
                  .find(
                    '[data-property="'.concat(p.PropertySet.BorderLayer, '"]')
                  )
                  .removeClass("g-disabled")
              : this._panel
                  .find(
                    '[data-property="'.concat(p.PropertySet.BorderLayer, '"]')
                  )
                  .addClass("g-disabled");
        }
        if (this._availableProperties.indexOf(p.PropertySet.BorderWidth) >= 0) {
          var s = (o = e.getPaintLayers().getBorderLayers()[0])
              .getProperty(p.PropertySet.BorderWidth)
              .toString(),
            l = this._panel.find(
              '[data-property="'.concat(p.PropertySet.BorderWidth, '"]')
            );
          l
            .gUnitBox({
              unit:
                this._document.getScene().$ut === a.GLength.Unit.PX
                  ? a.GLength.Unit.PX
                  : a.GLength.Unit.PT,
              minValue: 0,
            })
            .gUnitBox(
              "value",
              null !== s
                ? new a.GLength.parseLength(s, a.GLength.Unit.PT)
                : null
            ),
            t && n
              ? l.removeClass("g-disabled").attr("disabled", !1)
              : l.addClass("g-disabled").attr("disabled", !0);
        }
        [p.PropertySet.BorderHeadMarker, p.PropertySet.BorderTailMarker]
          .filter(
            (e) =>
              this._availableProperties.indexOf(e) >= 0 ||
              this._availableProperties.includes("arrows")
          )
          .forEach((o) => {
            var i = e.getPaintLayers().getBorderLayers()[0].getProperty(o),
              a = this._panel.find('[data-property="' + o + '"]');
            a.prop("checked", !!i),
              t && n
                ? (a.removeClass("g-disabled"), a.attr("disabled", !1))
                : (a.addClass("g-disabled"), a.attr("disabled", !0));
          });
      }),
      (p.prototype._assignProperty = function (e, t, n, o, i, a) {
        this._assignProperties([e], [t], n, o, i, a);
      }),
      (p.prototype._assignProperties = function (e, t, n, o, i, r) {
        if (this._document) {
          var s = this._document.getEditor();
          o || s.beginTransaction();
          try {
            for (var l = null, c = 0; c < this._elements.length; ++c) {
              var d;
              i === p.PropertyTarget.FillLayer
                ? ((d = this._elements[c]
                    .getPaintLayers()
                    .getFillLayers()[0]) ||
                    ((d = new a.GStylable.FillPaintLayer()),
                    this._elements[c].getPaintLayers().appendChild(d)),
                  (l = $.extend(
                    { fillLayerIndex: d.getParent().getIndexOfChild(d) },
                    l || r
                  )))
                : i === p.PropertyTarget.BorderLayer
                ? ((d = this._elements[c]
                    .getPaintLayers()
                    .getBorderLayers()[0]) ||
                    ((d = new a.GStylable.BorderPaintLayer()),
                    this._elements[c].getPaintLayers().appendChild(d)),
                  (l = $.extend(
                    { borderLayerIndex: d.getParent().getIndexOfChild(d) },
                    l || r
                  )))
                : (d = this._elements[c]),
                d && d.setProperties(e, t, !1, !1, o);
            }
          } finally {
            o || s.commitTransaction(n, l);
          }
        } else console.warn("GAnnotationProperties: empty _document property");
      }),
      (p.prototype.isEditing = function () {
        return this._isEditing;
      }),
      (p.prototype.setIsEditing = function (e) {
        this._isEditing = e;
      }),
      (p.prototype.toString = function () {
        return "[Object GAnnotationProperties]";
      }),
      (e.exports = p);
  }