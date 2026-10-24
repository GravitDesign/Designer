/**
 * Webpack Module #1160
 * Type: class
 * Name: GAppearanceProperties
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(19), n(30), n(193), n(57), n(3), n(4), n(13), n(26);
    var i = n(53),
      a = n(1),
      r = n(67),
      s = o(n(340)),
      l = n(123),
      c = n(857);
    n(173);
    const d = n(135);
    function u() {
      this._elements = [];
    }
    a.GObject.inherit(u, l),
      (u.prototype._panel = null),
      (u.prototype._document = null),
      (u.prototype._elements = null),
      (u.prototype._getBlendingProperties = function () {
        var e = this;
        return $("<select></select>")
          .attr("data-property", "_sbl")
          .gBlendMode()
          .append(
            $(
              '<optgroup label="' +
                a.GLocale.get(
                  new a.GLocaleKey("GAppearanceProperties", "text.masking")
                ) +
                '"></optgroup>'
            )
              .append(
                $("<option></option>")
                  .attr("value", "m")
                  .text(
                    a.GLocale.get(
                      new a.GLocaleKey("GAppearanceProperties", "blending.mask")
                    )
                  )
              )
              .append(
                $("<option></option>")
                  .attr("value", "!m")
                  .text(
                    a.GLocale.get(
                      new a.GLocaleKey(
                        "GAppearanceProperties",
                        "blending.inverse-mask"
                      )
                    )
                  )
              )
          )
          .gRichTooltip(
            r.GRichTooltipConfig.from({
              title: a.GLocale.get(
                new a.GLocaleKey(
                  "GAppearanceProperties",
                  "text.blend-tooltip-title"
                )
              ),
              description: a.GLocale.get(
                new a.GLocaleKey(
                  "GAppearanceProperties",
                  "text.blend-tooltip-description"
                )
              ),
              middle: !1,
              learnMore:
                "",
            })
          )
          .on("change", function (t) {
            gDesigner.stats("appearance_change_blending", $(t.target).val()),
              e._assignProperty(
                "_sbl",
                $(t.target).val(),
                a.GLocale.get(
                  new a.GLocaleKey(
                    "GCommonNames",
                    "action.change-blending-mode"
                  )
                )
              );
          });
      }),
      (u.prototype.init = function (e, t) {
        (this._panel = e),
          this.setTouchTools([s.default.APPEARANCE_TOUCH_TOOL]);
        var n = function (e) {
          var t = this;
          if ("evenodd" === e)
            return $("<select></select>")
              .attr("data-property", "evenodd")
              .append(
                $("<option></option>")
                  .attr("value", "0")
                  .text(
                    a.GLocale.get(
                      new a.GLocaleKey("GCommonNames", "evenodd.non-zero")
                    )
                  )
              )
              .append(
                $("<option></option>")
                  .attr("value", "1")
                  .text(
                    a.GLocale.get(
                      new a.GLocaleKey("GCommonNames", "evenodd.non-odd")
                    )
                  )
              )
              .on("change", function () {
                gDesigner.stats(
                  "appearance_toggle_evenodd",
                  "1" === $(this).val() ? "activate" : "deactivate"
                ),
                  t._assignProperty(
                    "evenodd",
                    "1" === $(this).val(),
                    a.GLocale.get(
                      new a.GLocaleKey(
                        "GCommonNames",
                        "action.change-fill-rule"
                      )
                    )
                  );
              });
          if ("_sbl" === e) return t._getBlendingProperties();
          if ("opacity-slider" === e)
            return $("<div/>")
              .attr("data-property", "_stop")
              .addClass("gravit-icon-touch-transparency")
              .gInputSlider(
                Object.assign({}, c.prototype.OPACITY_DEFAULT, {
                  richTooltipConfig: r.GRichTooltipConfig.from({
                    title: a.GLocale.get(
                      new a.GLocaleKey(
                        "GAppearanceProperties",
                        "text.opacity-slider-tooltip-title"
                      )
                    ),
                    description: a.GLocale.get(
                      new a.GLocaleKey(
                        "GAppearanceProperties",
                        "text.opacity-slider-tooltip-description"
                      )
                    ),
                  }),
                })
              )
              .on("mousedown", function () {
                t._document.getEditor().hideSelection(),
                  $(document).one("mouseup", function () {
                    t._document.getEditor().resetHideSelection();
                  });
              })
              .on("input", function (e) {
                for (
                  var n = $(e.target),
                    o = n.attr("data-property"),
                    i = parseInt(n.gInputSlider("value")) / 100,
                    r = 0;
                  r < t._elements.length;
                  ++r
                )
                  t._elements[r].setProperty(o, i, !1, !1, !0);
                t._panel
                  .find('[type="text"][data-property="' + o + '"]')
                  .gInputBox("value", a.GUtil.formatOpacity(100 * i));
              })
              .on("change", function (e) {
                gDesigner.stats("appearance_change_opacity"),
                  t._assignProperty(
                    $(this).attr("data-property"),
                    parseFloat($(this).gInputSlider("value")) / 100,
                    "Change opacity"
                  );
              });
          if ("opacity-input" === e)
            return $("<input>")
              .attr("type", "text")
              .attr("data-property", "_stop")
              .on("change", function (e) {
                gDesigner.stats("appearance_change_opacity"),
                  t._assignProperty(
                    $(this).attr("data-property"),
                    a.GLength.parseEquationValue($(this).gInputBox("value")) /
                      100,
                    "Change opacity"
                  );
              })
              .gInputBox({
                minValue: 0,
                maxValue: 100,
                incrementValue: gDesigner.getOpacityIncrement(),
                postfix: "%",
              });
          throw new Error("Unknown input property: " + e);
        }.bind(this);
        $("<div></div>")
          .addClass("appearance-opacity-property")
          .gPropertyRow({
            label: a.GLocale.get(
              new a.GLocaleKey("GCommonNames", "text.opacity")
            ),
            columns: [
              {
                width: "auto",
                clazz: "opacity-slider-col",
                content: n("opacity-slider"),
              },
              { width: "5px" },
              { clazz: "opacity-input-col", content: n("opacity-input") },
            ],
          })
          .appendTo(this._panel),
          $("<div></div>")
            .addClass("appearance-blending-property")
            .gPropertyRow({
              label: a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "text.blending")
              ),
              columns: [{ width: "100%", content: n("_sbl") }],
            })
            .appendTo(this._panel);
        var o = this,
          i = gDesigner.getLicense();
        $("<div/>")
          .addClass("g-property-row appearance-style-property")
          .append(
            $("<label/>")
              .addClass("property-label")
              .append(
                $("<span />")
                  .addClass("vertical-align")
                  .text(
                    a.GLocale.get(
                      new a.GLocaleKey("GAppearanceProperties", "text.style")
                    )
                  )
              )
          )
          .append(
            $("<div/>")
              .addClass("style-selector-container")
              .css("display", "flex")
              .append(
                $("<div/>")
                  .addClass("style-selector-inner-wrapper")
                  .css({ display: "flex", width: "100%", overflow: "hidden" })
                  .append(
                    $("<div/>")
                      .addClass("g-styles-preview")
                      .css("margin-right", "5px")
                      .css("align-self", "center")
                      .css("display", "none")
                  )
                  .append(
                    $("<div/>")
                      .addClass("g-select")
                      .addClass("g-styles-field-container")
                      .css("overflow", "hidden")
                      .css("margin-right", "5px")
                      .append(
                        $("<span/>")
                          .css({
                            width: "95%",
                            alignSelf: "center",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          })
                          .attr("type", "text")
                          .addClass("g-styles-field")
                          .attr("data-property", "_styles")
                      )
                      .gDesignerStyleEditor()
                      .gRichTooltip(
                        r.GRichTooltipConfig.from({
                          title: a.GLocale.get(
                            new a.GLocaleKey(
                              "GAppearanceProperties",
                              "text.shared-styles-tooltip-title"
                            )
                          ),
                          description: a.GLocale.get(
                            new a.GLocaleKey(
                              "GAppearanceProperties",
                              "text.shared-styles-tooltip-description"
                            )
                          ),
                          middle: !1,
                          isPro:
                            !gDesigner.isEnabledProFeatures() ||
                            !(i.isPro() && !i.isExpired()),
                          learnMore:
                            "",
                        })
                      )
                  )
              )
              .append(
                $("<button></button>")
                  .addClass("g-style-sync")
                  .addClass("g-disabled")
                  .on("click", function () {
                    if (
                      (gDesigner.stats("appearance_click_stylebutton"),
                      !$(this).hasClass("g-disabled") &&
                        o._elements &&
                        o._elements.length > 0)
                    ) {
                      var e = o._elements[0].getReferencedStyle();
                      e.assignStyleFrom(o._elements[0]);
                      var t = gDesigner.createNewStylePreview(
                        e,
                        !0,
                        o._elements[0] instanceof a.GText
                      );
                      t && o._addPreview(t), $(this).addClass("g-disabled");
                    }
                  })
              )
          )
          .appendTo(this._panel);
      }),
      (u.prototype.update = function (e, t) {
        if (
          (this._updateUI(),
          this._document &&
            (gDesigner.removeEventListener(d, this._settingChanged, this),
            this._document
              .getScene()
              .removeEventListener(
                a.GNode.AfterInsertEvent,
                this._styleChanged
              ),
            this._document
              .getScene()
              .removeEventListener(
                a.GNode.AfterRemoveEvent,
                this._styleChanged
              ),
            this._document
              .getScene()
              .removeEventListener(
                a.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange
              ),
            this._document
              .getScene()
              .removeEventListener(
                a.GElement.AfterFlagChangeEvent,
                this._afterFlagChange
              ),
            (this._document = null)),
          (this._elements = []),
          e)
        ) {
          gDesigner.addEventListener(d, this._settingChanged, this);
          for (var n = 0; n < t.length; ++n) {
            var o = t[n];
            o.hasMixin(a.GStylable) &&
              o.getStylePropertySets().indexOf(a.GStylable.PropertySet.Style) >=
                0 &&
              this._elements.push(o);
          }
          if (this._elements.length)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  a.GNode.AfterInsertEvent,
                  this._styleChanged,
                  this
                ),
              this._document
                .getScene()
                .addEventListener(
                  a.GNode.AfterRemoveEvent,
                  this._styleChanged,
                  this
                ),
              this._document
                .getScene()
                .addEventListener(
                  a.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              this._document
                .getScene()
                .addEventListener(
                  a.GElement.AfterFlagChangeEvent,
                  this._afterFlagChange,
                  this
                ),
              this._updateProperties(),
              !0
            );
        }
        return !1;
      }),
      (u.prototype._updateUI = function () {
        let e = this._panel.find(".g-style-sync");
        gDesigner.isTouchEnabled()
          ? (e.text(""),
            e.append($("<span></span>").addClass("g-style-sync-refresh-item")))
          : e.text(
              a.GLocale.get(
                new a.GLocaleKey("GAppearanceProperties", "action.sync")
              )
            );
      }),
      (u.prototype._settingChanged = function (e) {
        "touch" === e.key && this._updateUI();
      }),
      (u.prototype._afterFlagChange = function (e) {
        if (
          e.flag === a.GNode.Flag.Selected &&
          (e.node instanceof a.GPGEdge || e.node instanceof a.GPGFacet)
        ) {
          var t = e.node.getParent() ? e.node.getParent().getParent() : null;
          t && this._elements.indexOf(t) >= 0 && this._updateProperties();
        }
      }),
      (u.prototype._afterPropertiesChange = function (e) {
        e.temporary || e.node !== this._elements[0] || this._updateProperties(),
          this._styleChanged();
      }),
      (u.prototype._styleChanged = function () {
        1 === this._elements.length && this._checkSyncState();
      }),
      (u.prototype._updateProperties = function () {
        if (this._elements && this._elements.length) {
          var e = this._elements[0],
            t = i.GElementEditor.getEditor(e),
            n = function (n, o, i) {
              var a = t ? t.getPartsProperty(n) : null;
              if (a) {
                if (a.values.length) {
                  if (1 == a.values.length || o) return a.values[0];
                  for (var r = a.values, s = r[0], l = 1; l < r.length; ++l)
                    if (r[l] !== s) return i;
                  return s;
                }
                return i;
              }
              return e.getProperty(n);
            },
            o = 100 * n("_stop", !1, null);
          this._panel
            .find('.g-input-slider[data-property="_stop"]')
            .gInputSlider("value", null !== o ? o : 100),
            this._panel
              .find('[type="text"][data-property="_stop"]')
              .gInputBox("value", a.GUtil.formatOpacity(o)),
            this._panel.find('[data-property="_sbl"]').val(n("_sbl", !0));
          var r = null,
            s = null;
          if (
            1 === this._elements.length &&
            this._elements[0].hasProperty("sref") &&
            this._elements[0].getReferencedStyle()
          ) {
            var l = this._elements[0].getReferencedStyle();
            (r = gDesigner.getStylePreview(
              l,
              this._elements[0] instanceof a.GText
            )),
              (s = l.getProperty("name"));
          }
          if ((this._checkSyncState(), r))
            this._addPreview(r),
              this._panel.find(".g-styles-field").text(s),
              this._panel.find(".g-styles-field").removeClass("g-disabled");
          else {
            for (var c = !1, d = 0; d < this._elements.length; ++d)
              this._elements[0].hasProperty("sref") &&
                this._elements[d].getReferencedStyle() &&
                (c = !0);
            c && this._elements.length > 1
              ? (this._panel.find(".g-styles-preview").empty(),
                this._panel.find(".g-styles-preview").css("display", "none"),
                this._panel
                  .find(".g-styles-field")
                  .text(
                    a.GLocale.get(
                      new a.GLocaleKey(
                        "GAppearanceProperties",
                        "text.multiple-selection"
                      )
                    )
                  ),
                this._panel.find(".g-styles-field").addClass("g-disabled"))
              : (this._panel.find(".g-styles-preview").empty(),
                this._panel.find(".g-styles-preview").css("display", "none"),
                this._panel
                  .find(".g-styles-field")
                  .text(
                    a.GLocale.get(
                      new a.GLocaleKey("GAppearanceProperties", "text.no-style")
                    )
                  ),
                this._panel.find(".g-styles-field").removeClass("g-disabled"));
          }
        } else console.warn("GAppearanceProperties: empty _elements array");
      }),
      (u.prototype._addPreview = function (e) {
        this._panel.find(".g-styles-preview").empty(),
          this._panel
            .find(".g-styles-preview")
            .css("display", "")
            .append(
              $("<img/>")
                .css({ height: "20px", width: "20px", borderRadius: "3px" })
                .attr("src", e)
            );
      }),
      (u.prototype._assignProperty = function (e, t, n) {
        this._assignProperties([e], [t], n);
      }),
      (u.prototype._assignProperties = function (e, t, n) {
        if (this._document) {
          var o = this._document.getEditor();
          o.beginTransaction();
          try {
            for (var a = 0; a < this._elements.length; ++a) {
              this._elements[a];
              var r = i.GElementEditor.getEditor(this._elements[a]);
              (r && r.applyPropertiesToParts(e, t)) ||
                this._elements[a].setProperties(e, t);
            }
          } finally {
            o.commitTransaction(n);
          }
        } else console.warn("GAppearanceProperties: empty _document property");
      }),
      (u.prototype._checkSyncState = function () {
        this._elements &&
        this._elements.length > 0 &&
        this._elements[0].hasProperty("sref") &&
        !this._elements[0].equalsStyle()
          ? this._panel.find(".g-style-sync").removeClass("g-disabled")
          : this._panel.find(".g-style-sync").addClass("g-disabled");
      }),
      (u.prototype.toString = function () {
        return "[Object GAppearanceProperties]";
      }),
      (e.exports = u);
  }