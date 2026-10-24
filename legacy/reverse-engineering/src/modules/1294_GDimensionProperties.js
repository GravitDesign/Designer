/**
 * Webpack Module #1294
 * Type: class
 * Name: GDimensionProperties
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(57), n(20), n(107), n(3), n(4), n(13);
    var i = n(53),
      a = n(1),
      r = n(67),
      s = o(n(340)),
      l = n(866),
      c = n(867),
      d = n(123),
      u = (n(173), n(135)),
      p = n(257),
      g = n(1295);
    function h() {
      this._elements = [];
    }
    a.GObject.inherit(h, d),
      (h._keepRatioName = "designer.settings.dimension.preserveratio"),
      (h.prototype._panel = null),
      (h.prototype._toolbar = null),
      (h.prototype._transformButton = null),
      (h.prototype._document = null),
      (h.prototype._elements = null),
      (h.prototype._elementsBBox = null),
      (h.prototype._anchorsPanel = null),
      (h.prototype._firstElementsBBox = null),
      (h.prototype.init = function (e, t) {
        (this._panel = e),
          (this._toolbar = t),
          this._panel.addClass("dimension-panel"),
          this.setTouchTools([
            new s.default({
              id: "dimension.align",
              icon: "gravit-icon-align",
              panelWidth: "370px",
              panel: this._toolbar,
            }),
            new s.default({
              id: "dimension.dimension",
              icon: "gravit-icon-touch-transform",
              toolbar: ".advanced-transform-toolbar",
              panelWidth: "395px",
              panel: [this._panel, ".advanced-transform-properties"],
            }),
          ]);
        var n = function (e, t) {
          var n = this;
          if ("keep-ratio" == e)
            return $("<span></span>")
              .addClass(
                i.GEditorOptions.preserveAspectRatio
                  ? "gravit-icon-linked"
                  : "gravit-icon-unlinked"
              )
              .css("text-align", "center")
              .css("cursor", "pointer")
              .on("click", function (e) {
                var t = $(this);
                "yes" === t.attr("data-ratio")
                  ? (t
                      .attr("data-ratio", "no")
                      .attr("class", "gravit-icon-unlinked"),
                    n._setAspectRatioBehavior(!1),
                    gDesigner.stats(
                      "dimension_toggle_preserveratio",
                      "disabled"
                    ))
                  : (t
                      .attr("data-ratio", "yes")
                      .attr("class", "gravit-icon-linked"),
                    n._setAspectRatioBehavior(!0),
                    gDesigner.stats(
                      "dimension_toggle_preserveratio",
                      "enabled"
                    ));
              })
              .attr(
                "data-title",
                a.GLocale.get(
                  new a.GLocaleKey("GDimensionProperties", "action.keep-ratio")
                )
              )
              .attr(
                "data-ratio",
                i.GEditorOptions.preserveAspectRatio ? "yes" : "no"
              )
              .gRichTooltip(t);
          if ("x" === e || "y" === e || "w" === e || "h" === e) {
            var o = a.GLocale.get(
              new a.GLocaleKey(
                "GCommonNames",
                "property-".concat(e.toLowerCase())
              ),
              e
            );
            return $("<div/>")
              .append(
                $("<input>")
                  .attr("type", "text")
                  .attr("data-dimension", e)
                  .on(
                    "change",
                    function (t) {
                      gDesigner.stats("dimension_set_positionOrSize"),
                        this._assignDimension(
                          e,
                          $(t.target).gInputBox("value")
                        );
                    }.bind(this)
                  )
                  .gInputBox({ minValue: "w" === e || "h" === e ? 0 : null })
              )
              .gInputLabel({ label: o, autoPadding: o.length > 1 })
              .gRichTooltip(t);
          }
          return "rotate" === e
            ? $("<div/>")
                .append(
                  $("<input>")
                    .attr("type", "text")
                    .attr("data-dimension", e)
                    .on(
                      "change",
                      function (t) {
                        gDesigner.stats("dimension_set_rotation"),
                          this._assignDimension(
                            e,
                            $(t.target).gInputBox("value")
                          );
                      }.bind(this)
                    )
                    .gInputBox({ postfix: "°" })
                )
                .gInputLabel({ label: "R" })
                .gRichTooltip(t)
            : void 0;
        }.bind(this);
        function o(e) {
          var t = l.ID + "." + e,
            n = gDesigner.getAction(t);
          const o = n.getTooltipConfig(r.TOOLTIP_AREA.SIDEBAR),
            i = $("<span></span>");
          return (
            p.icon
              ? (i.addClass("icon"), i.addClass(n.getIcon()))
              : i.append(n.getIcon()),
            i.css("stroke", "transparent"),
            o && i.gRichTooltip(o),
            $("<button></button>")
              .attr("data-title", a.GLocale.get(n.getTitle()))
              .attr("data-action", t)
              .addClass("svg-button")
              .append(i.addClass("normal"))
              .append(
                $("<span/>").addClass("gravit-icon-touch-".concat(e, " touch"))
              )
              .on("click", function () {
                gDesigner.executeAction(t, void 0, "dimensionproperties");
              })
          );
        }
        function d(e) {
          var t = c.ID + "." + e,
            n = gDesigner.getAction(t);
          const o = n.getTooltipConfig(r.TOOLTIP_AREA.SIDEBAR),
            i = $("<span></span>").append(n.getIcon());
          return (
            o && i.gRichTooltip(o),
            $("<button></button>")
              .attr("data-title", a.GLocale.get(n.getTitle()))
              .attr("data-action", t)
              .addClass("svg-button")
              .append(i.addClass("normal"))
              .append(
                $("<span/>").addClass("gravit-icon-touch-".concat(e, " touch"))
              )
              .on("click", function () {
                var n = $(".".concat(e, "Input")).find("input").val();
                (n = "Auto" == n ? void 0 : parseInt(n)),
                  gDesigner.executeAction(
                    t,
                    [void 0, void 0, n],
                    "dimensionproperties"
                  );
              })
          );
        }
        function u(e) {
          var t = $("<div></div>")
              .addClass(e + "Input")
              .gInputSelect({ list: ["Auto", "0", 1, 10, 20, 30, 50, 100] }),
            n = /^-?[0-9]+.?[0-9]*$/;
          return (
            t
              .find("input")
              .val("Auto")
              .off("change")
              .on("change", function () {
                n.test($(this).val()) || $(this).val("Auto");
              }),
            t
          );
        }
        t
          .addClass("main-toolbar")
          .append(d(c.Type.Horizontal).addClass("primary normalDistribute"))
          .append(d(c.Type.Vertical).addClass("primary normalDistribute"))
          .append($("<span></span>").addClass("divider"))
          .append(o(i.GEditor.ArrangeAlignType.AlignLeft).addClass("secondary"))
          .append(
            o(i.GEditor.ArrangeAlignType.AlignCenter).addClass("secondary")
          )
          .append(
            o(i.GEditor.ArrangeAlignType.AlignRight).addClass("secondary")
          )
          .append($("<span></span>").addClass("divider"))
          .append($("<p/>").addClass("interval"))
          .append(o(i.GEditor.ArrangeAlignType.AlignTop).addClass("secondary"))
          .append(
            o(i.GEditor.ArrangeAlignType.AlignMiddle).addClass("secondary")
          )
          .append(
            o(i.GEditor.ArrangeAlignType.AlignBottom).addClass("secondary")
          )
          .append($("<p/>").addClass("lineBreak"))
          .append(d(c.Type.Horizontal).addClass("primary touchDistribute"))
          .append(u(c.Type.Horizontal).addClass("touchDistribute"))
          .append($("<p/>").addClass("interval"))
          .append(d(c.Type.Vertical).addClass("primary touchDistribute"))
          .append(u(c.Type.Vertical).addClass("touchDistribute")),
          (this._advancedFillPanel = $("<div></div>").gOverlay({
            releaseOnClose: !1,
          })),
          this._advancedFillPanel.parent().addClass("settingBox"),
          $("<div></div>")
            .addClass("alignSettings")
            .gPropertyRow({
              columns: [
                {
                  width: "100%",
                  content: $("<div></div>")
                    .text(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GDimensionProperties",
                          "text.sameHeight"
                        )
                      )
                    )
                    .prepend(
                      $("<span></span>").addClass("gravit-icon-sameHeight")
                    )
                    .on("click", () => {
                      new l(
                        i.GEditor.ArrangeAlignType.AlignJustifyVertical
                      ).execute(),
                        this._advancedFillPanel.gOverlay("close");
                    }),
                },
              ],
            })
            .gPropertyRow({
              columns: [
                {
                  width: "100%",
                  content: $("<div></div>")
                    .text(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GDimensionProperties",
                          "text.sameWidth"
                        )
                      )
                    )
                    .prepend(
                      $("<span></span>").addClass("gravit-icon-sameWidth")
                    )
                    .on("click", () => {
                      new l(
                        i.GEditor.ArrangeAlignType.AlignJustifyHorizontal
                      ).execute(),
                        this._advancedFillPanel.gOverlay("close");
                    }),
                },
              ],
            })
            .gPropertyRow({
              columns: [
                {
                  width: "100%",
                  content: $("<div></div>")
                    .text(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GDimensionProperties",
                          "text.fullUnit"
                        )
                      )
                    )
                    .prepend(
                      $("<span></span>").addClass("gravit-icon-fullUnit")
                    )
                    .on("click", () => {
                      new g(g.Type.FullUnit).execute(),
                        this._advancedFillPanel.gOverlay("close");
                    }),
                },
              ],
            })
            .gPropertyRow({
              columns: [
                {
                  width: "100%",
                  content: $("<div></div>")
                    .text(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GDimensionProperties",
                          "text.halfUnit"
                        )
                      )
                    )
                    .prepend(
                      $("<span></span>").addClass("gravit-icon-HalfUnit")
                    )
                    .on("click", () => {
                      new g(g.Type.HalfUnit).execute(),
                        this._advancedFillPanel.gOverlay("close");
                    }),
                },
              ],
            })
            .appendTo(this._advancedFillPanel),
          $("<p/>").addClass("lineBreak").prependTo(t),
          $("<button></button>")
            .attr(
              "data-title",
              a.GLocale.get(
                new a.GLocaleKey("GDimensionProperties", "text.setting")
              )
            )
            .addClass("align-settings")
            .append($("<span></span>").addClass("gravit-icon-touch-settings"))
            .on(
              "click",
              function (e) {
                this._advancedFillPanel.gOverlay(
                  "open",
                  $(e.target).closest("button")
                );
              }.bind(this)
            )
            .prependTo(t),
          $("<label></label>")
            .text(
              a.GLocale.get(
                new a.GLocaleKey("GDimensionProperties", "text.alignTitle")
              )
            )
            .prependTo(t);
        const h = r.GRichTooltipConfig.from({
            title: a.GLocale.get(
              new a.GLocaleKey(
                "GDimensionProperties",
                "text.property-x-y-tooltip-title"
              )
            ),
            description: a.GLocale.get(
              new a.GLocaleKey(
                "GDimensionProperties",
                "text.property-x-y-tooltip-description"
              )
            ),
            middle: !1,
            learnMore:
              "",
          }),
          f = r.GRichTooltipConfig.from({
            title: a.GLocale.get(
              new a.GLocaleKey(
                "GDimensionProperties",
                "text.property-w-h-tooltip-title"
              )
            ),
            description: a.GLocale.get(
              new a.GLocaleKey(
                "GDimensionProperties",
                "text.property-w-h-tooltip-description"
              )
            ),
            middle: !1,
            learnMore:
              "",
          }),
          m = r.GRichTooltipConfig.from({
            title: a.GLocale.get(
              new a.GLocaleKey(
                "GDimensionProperties",
                "text.keep-ratio-tooltip-title"
              )
            ),
            description: a.GLocale.get(
              new a.GLocaleKey(
                "GDimensionProperties",
                "text.keep-ratio-tooltip-description"
              )
            ),
          }),
          y = r.GRichTooltipConfig.from({
            title: a.GLocale.get(
              new a.GLocaleKey(
                "GDimensionProperties",
                "text.transform-button-tooltip-title"
              )
            ),
            description: a.GLocale.get(
              new a.GLocaleKey(
                "GDimensionProperties",
                "text.transform-button-tooltip-description"
              )
            ),
            middle: !1,
            learnMore:
              "",
          }),
          v = r.GRichTooltipConfig.from({
            title: a.GLocale.get(
              new a.GLocaleKey(
                "GDimensionProperties",
                "text.rotate-angle-tooltip-title"
              )
            ),
            description: a.GLocale.get(
              new a.GLocaleKey(
                "GDimensionProperties",
                "text.rotate-angle-tooltip-description"
              )
            ),
            middle: !1,
            learnMore:
              "",
          });
        $("<div/>")
          .addClass("transform-titile")
          .text(
            a.GLocale.get(
              new a.GLocaleKey("GDimensionProperties", "text.transform-title")
            )
          )
          .appendTo(this._panel),
          $("<div></div>")
            .gPropertyRow({
              label: a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "text.position")
              ),
              columns: [
                { width: "44%", content: n("x", h) },
                { width: "12%" },
                { width: "44%", content: n("y", h) },
              ],
            })
            .appendTo(e),
          $("<div></div>")
            .gPropertyRow({
              label: a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "text.size")
              ),
              columns: [
                { width: "44%", content: n("w", f) },
                { width: "12%", content: n("keep-ratio", m) },
                { width: "44%", content: n("h", f) },
              ],
            })
            .appendTo(e),
          (this._transformButton = $(
            "<button>" +
              a.GLocale.get(
                new a.GLocaleKey("GDimensionProperties", "text.transform")
              ) +
              "</button>"
          )
            .addClass("transform-button")
            .on("click", this._toggleTransformMode.bind(this))
            .gRichTooltip(y)),
          $("<div></div>")
            .gPropertyRow({
              label: a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "text.angle")
              ),
              columns: [
                { width: "44%", content: n("rotate", v) },
                { width: "12%" },
                { width: "44%", content: this._transformButton },
              ],
            })
            .appendTo(e),
          (this._anchorsPanel = $("<div></div>")
            .gPropertyRow({
              label: a.GLocale.get(
                new a.GLocaleKey("GDimensionProperties", "text.anchors")
              ),
              columns: [
                {
                  width: "44%",
                  content: $("<div/>")
                    .addClass("anchor-buttons")
                    .append(
                      $("<div/>")
                        .append(
                          $("<span/>").addClass("gravit-icon-anchor-left")
                        )
                        .addClass("g-button")
                        .addClass("g-group-start")
                        .addClass("hacr-start")
                        .attr(
                          "data-title",
                          a.GLocale.get(
                            new a.GLocaleKey(
                              "GDimensionProperties",
                              "action.anchor-left"
                            )
                          )
                        )
                        .on(
                          "click",
                          function () {
                            gDesigner.stats(
                              "dimension_set_anchors-horizontalstart"
                            );
                            var e = this._getHorizontalAnchorValue(),
                              t = this._defineAnchorProperty(
                                "hacr",
                                a.GElement.Anchor.AnchorType.Start,
                                e
                              );
                            this._defineAnchorButtonState(null, t);
                          }.bind(this)
                        )
                        .gRichTooltip(
                          r.GRichTooltipConfig.from({
                            title: a.GLocale.get(
                              new a.GLocaleKey(
                                "GDimensionProperties",
                                "text.anchor-left-tooltip-title"
                              )
                            ),
                            description: a.GLocale.get(
                              new a.GLocaleKey(
                                "GDimensionProperties",
                                "text.anchor-left-tooltip-description"
                              )
                            ),
                            learnMore:
                              "",
                          })
                        )
                    )
                    .append(
                      $("<div/>")
                        .append(
                          $("<span/>").addClass("gravit-icon-anchor-center")
                        )
                        .addClass("g-button")
                        .addClass("g-group-element")
                        .addClass("hacr-middle")
                        .attr(
                          "data-title",
                          a.GLocale.get(
                            new a.GLocaleKey(
                              "GDimensionProperties",
                              "action.anchor-center"
                            )
                          )
                        )
                        .on(
                          "click",
                          function () {
                            gDesigner.stats(
                              "dimension_set_anchors-horizontalmiddle"
                            );
                            var e = this._getHorizontalAnchorValue(),
                              t = this._defineAnchorProperty(
                                "hacr",
                                a.GElement.Anchor.AnchorType.Middle,
                                e
                              );
                            this._defineAnchorButtonState(null, t);
                          }.bind(this)
                        )
                        .gRichTooltip(
                          r.GRichTooltipConfig.from({
                            title: a.GLocale.get(
                              new a.GLocaleKey(
                                "GDimensionProperties",
                                "text.anchor-center-tooltip-title"
                              )
                            ),
                            description: a.GLocale.get(
                              new a.GLocaleKey(
                                "GDimensionProperties",
                                "text.anchor-center-tooltip-description"
                              )
                            ),
                            learnMore:
                              "",
                          })
                        )
                    )
                    .append(
                      $("<div/>")
                        .append(
                          $("<span/>").addClass("gravit-icon-anchor-right")
                        )
                        .addClass("g-button")
                        .addClass("g-group-end")
                        .addClass("hacr-end")
                        .attr(
                          "data-title",
                          a.GLocale.get(
                            new a.GLocaleKey(
                              "GDimensionProperties",
                              "action.anchor-right"
                            )
                          )
                        )
                        .on(
                          "click",
                          function () {
                            gDesigner.stats(
                              "dimension_set_anchors-horizontalend"
                            );
                            var e = this._getHorizontalAnchorValue(),
                              t = this._defineAnchorProperty(
                                "hacr",
                                a.GElement.Anchor.AnchorType.End,
                                e
                              );
                            this._defineAnchorButtonState(null, t);
                          }.bind(this)
                        )
                        .gRichTooltip(
                          r.GRichTooltipConfig.from({
                            title: a.GLocale.get(
                              new a.GLocaleKey(
                                "GDimensionProperties",
                                "text.anchor-right-tooltip-title"
                              )
                            ),
                            description: a.GLocale.get(
                              new a.GLocaleKey(
                                "GDimensionProperties",
                                "text.anchor-right-tooltip-description"
                              )
                            ),
                            learnMore:
                              "",
                          })
                        )
                    ),
                },
                { width: "12%" },
                {
                  width: "44%",
                  content: $("<div>")
                    .addClass("anchor-buttons")
                    .append(
                      $("<div/>")
                        .append($("<span/>").addClass("gravit-icon-anchor-top"))
                        .addClass("g-button")
                        .addClass("g-group-start")
                        .addClass("vacr-start")
                        .attr(
                          "data-title",
                          a.GLocale.get(
                            new a.GLocaleKey(
                              "GDimensionProperties",
                              "action.anchor-top"
                            )
                          )
                        )
                        .on(
                          "click",
                          function () {
                            gDesigner.stats(
                              "dimension_set_anchors-verticalstart"
                            );
                            var e = this._getVerticalAnchorValue(),
                              t = this._defineAnchorProperty(
                                "vacr",
                                a.GElement.Anchor.AnchorType.Start,
                                e
                              );
                            this._defineAnchorButtonState(t, null);
                          }.bind(this)
                        )
                        .gRichTooltip(
                          r.GRichTooltipConfig.from({
                            title: a.GLocale.get(
                              new a.GLocaleKey(
                                "GDimensionProperties",
                                "text.anchor-top-tooltip-title"
                              )
                            ),
                            description: a.GLocale.get(
                              new a.GLocaleKey(
                                "GDimensionProperties",
                                "text.anchor-top-tooltip-description"
                              )
                            ),
                            learnMore:
                              "",
                          })
                        )
                    )
                    .append(
                      $("<div/>")
                        .append(
                          $("<span/>").addClass("gravit-icon-anchor-middle")
                        )
                        .addClass("g-button")
                        .addClass("g-group-element")
                        .addClass("vacr-middle")
                        .attr(
                          "data-title",
                          a.GLocale.get(
                            new a.GLocaleKey(
                              "GDimensionProperties",
                              "action.anchor-middle"
                            )
                          )
                        )
                        .on(
                          "click",
                          function () {
                            gDesigner.stats(
                              "dimension_set_anchors-verticalmiddle"
                            );
                            var e = this._getVerticalAnchorValue(),
                              t = this._defineAnchorProperty(
                                "vacr",
                                a.GElement.Anchor.AnchorType.Middle,
                                e
                              );
                            this._defineAnchorButtonState(t, null);
                          }.bind(this)
                        )
                        .gRichTooltip(
                          r.GRichTooltipConfig.from({
                            title: a.GLocale.get(
                              new a.GLocaleKey(
                                "GDimensionProperties",
                                "text.anchor-middle-tooltip-title"
                              )
                            ),
                            description: a.GLocale.get(
                              new a.GLocaleKey(
                                "GDimensionProperties",
                                "text.anchor-middle-tooltip-description"
                              )
                            ),
                            learnMore:
                              "",
                          })
                        )
                    )
                    .append(
                      $("<div/>")
                        .append(
                          $("<span/>").addClass("gravit-icon-anchor-bottom")
                        )
                        .addClass("g-button")
                        .addClass("g-group-end")
                        .addClass("vacr-end")
                        .attr(
                          "data-title",
                          a.GLocale.get(
                            new a.GLocaleKey(
                              "GDimensionProperties",
                              "action.anchor-bottom"
                            )
                          )
                        )
                        .on(
                          "click",
                          function () {
                            gDesigner.stats(
                              "dimension_set_anchors-verticalend"
                            );
                            var e = this._getVerticalAnchorValue(),
                              t = this._defineAnchorProperty(
                                "vacr",
                                a.GElement.Anchor.AnchorType.End,
                                e
                              );
                            this._defineAnchorButtonState(t, null);
                          }.bind(this)
                        )
                        .gRichTooltip(
                          r.GRichTooltipConfig.from({
                            title: a.GLocale.get(
                              new a.GLocaleKey(
                                "GDimensionProperties",
                                "text.anchor-bottom-tooltip-title"
                              )
                            ),
                            description: a.GLocale.get(
                              new a.GLocaleKey(
                                "GDimensionProperties",
                                "text.anchor-bottom-tooltip-description"
                              )
                            ),
                            learnMore:
                              "",
                          })
                        )
                    ),
                },
              ],
            })
            .addClass("anchor-panel")
            .appendTo(e));
      }),
      (h.prototype._setAspectRatioBehavior = function (e) {
        (i.GEditorOptions.preserveAspectRatio = e),
          (i.GEditorOptions.allowTextRatioPreservation = e),
          gContainer.setProperty(h._keepRatioName, e);
      }),
      (h.prototype.isAvailable = function (e) {
        return (
          this._transformButton.toggleClass("g-active", e),
          gDesigner.isTouchEnabled() &&
            (e
              ? (this._transformButton.text(
                  a.GLocale.get(new a.GLocaleKey("GLocale", "close"))
                ),
                $(".advanced-transform-toolbar > label").text(
                  a.GLocale.get(
                    new a.GLocaleKey(
                      "GDimensionProperties",
                      "text.transform-advanced"
                    )
                  )
                ),
                this._anchorsPanel.toggleClass("down", !0),
                this._panel.toggleClass("have-anchor", !1),
                $(".advanced-transform-properties").toggleClass(
                  "have-anchor",
                  !0
                ))
              : (this._transformButton.text(
                  a.GLocale.get(
                    new a.GLocaleKey("GDimensionProperties", "text.transform")
                  )
                ),
                this._anchorsPanel.toggleClass("down", !1),
                this._panel.toggleClass("have-anchor", !0),
                $(".advanced-transform-properties").toggleClass(
                  "have-anchor",
                  !1
                ),
                this._panel.addClass("have-anchor")),
            this._changeSideBarContinerZIndex(e)),
          !0
        );
      }),
      (h.prototype._changeSideBarContinerZIndex = function (e) {
        gDesigner.isTouchEnabled() &&
          (e
            ? gDesigner.getRightSidebars().addClassName("more-z-index")
            : gDesigner.getRightSidebars().removeClassName("more-z-index"));
      }),
      (h.prototype.update = function (e, t) {
        if (
          (this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                a.GElement.GeometryChangeEvent,
                this._geometryChange,
                this
              ),
            this._document
              .getScene()
              .removeEventListener(
                a.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange,
                this
              ),
            this._document
              .getEditor()
              .removeEventListener(
                i.GEditor.EdGeometryChangeEvent,
                this._edGeometryChange,
                this
              ),
            gDesigner.removeEventListener(u, this._settingChanged),
            (this._document = null)),
          (this._elements = []),
          $(this._panel).find(".anchor-panel").css("display", "none"),
          e)
        ) {
          for (var n = 0; n < t.length; ++n)
            !t[n].hasMixin(a.GElement.Transform) ||
              t[n] instanceof a.GPage ||
              this._elements.push(t[n]);
          if (this._elements.length && this._elements.length === t.length)
            return (
              (this._document = e),
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
                  a.GElement.GeometryChangeEvent,
                  this._geometryChange,
                  this
                ),
              this._document
                .getEditor()
                .addEventListener(
                  i.GEditor.EdGeometryChangeEvent,
                  this._edGeometryChange,
                  this
                ),
              gDesigner.addEventListener(u, this._settingChanged, this),
              this._updateDimensions(),
              this._updateToolbar(),
              this._showAnchor() &&
                ($(this._panel).find(".anchor-panel").css("display", ""),
                this._defineAnchorButtonState(
                  this._getVerticalAnchorValue(),
                  this._getHorizontalAnchorValue()
                )),
              !0
            );
        }
        return !1;
      }),
      (h.prototype._toggleTransformMode = function () {
        gDesigner.stats("dimension_change_transform-mode");
        var e = gDesigner.getToolManager();
        (e.getActiveTool() && e.getActiveTool() instanceof i.GSelectTool) ||
          e.activateTool(i.GPointerTool),
          e.getActiveTool() instanceof i.GSelectTool &&
            e
              .getActiveTool()
              .setEditMode(
                e.getActiveTool().getEditMode() ===
                  i.GSelectTool.EditMode.Transform
                  ? i.GSelectTool.EditMode.Select
                  : i.GSelectTool.EditMode.Transform
              );
      }),
      (h.prototype._geometryChange = function (e) {
        (e.type !== a.GElement.GeometryChangeEvent.Type.After &&
          e.type !== a.GElement.GeometryChangeEvent.Type.Child) ||
          (this._elements.indexOf(e.element) >= 0 && this._updateDimensions());
      }),
      (h.prototype._edGeometryChange = function (e) {
        this._updateDimensions(!1, !0);
      }),
      (h.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          this._elements &&
          this._elements.indexOf(e.node) >= 0 &&
          this._showAnchor() &&
          this._defineAnchorButtonState(
            this._getVerticalAnchorValue(),
            this._getHorizontalAnchorValue()
          );
      }),
      (h.prototype._settingChanged = function (e) {
        "decimals_num" === e.key && this._updateDimensions();
      }),
      (h.prototype._getCurrentDimensions = function (e, t) {
        var n = null,
          o = 0;
        if (!e) {
          (this._elementsBBox = null), (this._firstElementsBBox = null);
          for (var r = 0; r < this._elements.length; ++r) {
            var s = this._elements[r];
            if (s.hasMixin(a.GElement.Transform)) {
              var l = null;
              if (t) {
                var c = i.GElementEditor.getEditor(s);
                c && c.getElement() && (l = c.getPEGeometryBBox());
              } else l = s.getGeometryBBox();
              l &&
                ((this._elementsBBox = this._elementsBBox
                  ? this._elementsBBox.united(l)
                  : l),
                this._firstElementsBBox ||
                  ((this._firstElementsBBox = l),
                  (o = t && c ? c.getRotationAngle() : s.getAngle())));
            }
          }
          this._elementsBBox ||
            ((this._elementsBBox = null),
            (this._firstElementsBBox = this._elementsBBox));
        }
        if (this._firstElementsBBox) {
          var d = this._elements.length > 1,
            u = this._getDelta();
          if (d) {
            var p = 0;
            if (t) {
              var g = this._document.getEditor().getSelectionEditor();
              g && (p = g.getRotationAngle());
            }
            n = {
              x: this._elementsBBox.getX() - u.getX(),
              y: this._elementsBBox.getY() - u.getY(),
              w: this._elementsBBox.getWidth(),
              h: this._elementsBBox.getHeight(),
              angle: p,
            };
          } else
            n = {
              x: this._firstElementsBBox.getX() - u.getX(),
              y: this._firstElementsBBox.getY() - u.getY(),
              w: this._firstElementsBBox.getWidth(),
              h: this._firstElementsBBox.getHeight(),
              angle: o,
            };
        }
        return n;
      }),
      (h.prototype._updateDimensions = function (e, t) {
        var n = (e, t) => {
            var n = "";
            if (null !== t)
              switch (e) {
                case "x":
                case "y":
                case "w":
                case "h":
                  n = this._document
                    .getScene()
                    .pointToString(
                      t,
                      this._document.getScene().getOptimalDecimalsCount()
                    );
                  break;
                case "rotate":
                  n = a.GUtil.formatNumber(a.GMath.toDegrees(t), 1);
              }
            this._panel
              .find('input[data-dimension="' + e + '"]')
              .gInputBox("value", n)
              .prop("disabled", null === t);
          },
          o = this._getCurrentDimensions(e, t);
        o
          ? (this._panel.find("[data-ratio]").css("display", ""),
            n("x", o.x),
            n("y", o.y),
            n("w", o.w),
            n("h", o.h),
            n("rotate", o.angle))
          : (this._panel.find("[data-ratio]").css("display", "none"),
            n("x", null),
            n("y", null),
            n("w", null),
            n("h", null),
            n("rotate", 0));
      }),
      (h.prototype._updateToolbar = function () {
        this._toolbar.find("[data-action]").each(
          function (e, t) {
            var n = $(t);
            n.prop(
              "disabled",
              !gDesigner.canExecuteAction(n.attr("data-action"))
            );
          }.bind(this)
        ),
          this._toolbar.find(".touchDistribute>input").each(
            function (e, t) {
              $(t).prop(
                "disabled",
                !gDesigner.canExecuteAction("arrange.distribute.horizontal")
              );
            }.bind(this)
          ),
          this._toolbar.find(".touchDistribute>button").each(
            function (e, t) {
              $(t).prop(
                "disabled",
                !gDesigner.canExecuteAction("arrange.distribute.horizontal")
              );
            }.bind(this)
          );
      }),
      (h.prototype._assignDimension = function (e, t) {
        if (this._document) {
          var n = null,
            o = null,
            r = "",
            s = this._getCurrentDimensions(!1, !1);
          switch (e) {
            case "x":
            case "y":
              (r = "Move"),
                (n = this._document.getScene().stringToPoint(t)),
                (o = s ? ("x" == e ? s.x : s.y) : null);
              break;
            case "w":
            case "h":
              (r = a.GLocale.get(
                new a.GLocaleKey("GDimensionProperties", "action.change-size")
              )),
                (n = this._document.getScene().stringToPoint(t)),
                (o = s ? ("w" == e ? s.w : s.h) : null);
              break;
            case "rotate":
              (r = a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "action.rotate")
              )),
                (n = a.GLength.parseEquationValue(t)),
                (o = s ? s.angle : null);
          }
          if (
            null === n ||
            "number" != typeof n ||
            (("w" == e || "h" == e) && n <= 0) ||
            n === o
          )
            this._updateDimensions();
          else {
            if ("x" === e || "y" === e) {
              var l = this._getDelta();
              switch (e) {
                case "x":
                  n += l.getX();
                  break;
                case "y":
                  n += l.getY();
              }
            }
            var c = function (t, o, i) {
                if ("w" === e || "h" === e) {
                  if (
                    ("w" === e && t.getWidth() <= 0) ||
                    ("h" === e && t.getHeight() <= 0)
                  )
                    return new a.GTransform();
                  var r = 1,
                    s = 1;
                  switch (e) {
                    case "w":
                      (r = n / t.getWidth()), o && (s = r);
                      break;
                    case "h":
                      (s = n / t.getHeight()), o && (r = s);
                  }
                  return new a.GTransform()
                    .translated(-t.getX(), -t.getY())
                    .scaled(r, s)
                    .translated(t.getX(), t.getY());
                }
                if ("x" === e)
                  return new a.GTransform().translated(n - t.getX(), 0);
                if ("y" === e)
                  return new a.GTransform().translated(0, n - t.getY());
                if ("rotate" === e) {
                  var l = t.getSide(a.GRect.Side.CENTER);
                  i = i || 0;
                  return new a.GTransform()
                    .translated(-l.getX(), -l.getY())
                    .rotated(i - a.GMath.toRadians(n))
                    .translated(l.getX(), l.getY());
                }
              },
              d = this._elements.length > 1,
              u = "yes" === this._panel.find("[data-ratio]").attr("data-ratio"),
              p = this._document.getEditor();
            p.beginTransaction();
            try {
              for (
                var g = function (t, n, o, r) {
                    if ((t = o.length && o.indexOf(t) >= 0 ? null : t)) {
                      var s =
                          (t instanceof a.GSymbol &&
                            ("x" === e || "y" === e)) ||
                          "rotate" === e ||
                          (r && r.fullContentTransform),
                        l = i.GElementEditor.openEditor(t);
                      l
                        ? (l._setTransform(n), l.applyTransform(t, s, o))
                        : t.transform(n, s, o);
                    }
                  },
                  h = [],
                  f = 0;
                f < this._elements.length;
                ++f
              ) {
                var m = this._elements[f];
                h = h.concat(p.getLinkedElementsInSelection(m, this._elements));
              }
              if (d) {
                if (this._elementsBBox) {
                  var y = c(this._elementsBBox, u);
                  for (f = 0; f < this._elements.length; ++f)
                    g(this._elements[f], y, h, p.getEdTransformSettings());
                }
              } else
                for (f = 0; f < this._elements.length; ++f) {
                  var v = this._elements[f].getGeometryBBox();
                  if (v)
                    (y = c(
                      v,
                      u,
                      "rotate" === e ? this._elements[f].getAngle() : null
                    )) &&
                      !y.isIdentity() &&
                      g(this._elements[f], y, h, p.getEdTransformSettings());
                }
            } finally {
              p.commitTransaction(r);
            }
          }
        }
      }),
      (h.prototype._showAnchor = function () {
        for (var e = this._elements, t = !0, n = 0; n < e.length; ++n)
          if (
            !e[n].getParent() ||
            !e[n].getParent().hasMixin(a.GElement.Layout)
          ) {
            t = !1;
            break;
          }
        return t;
      }),
      (h.prototype._getHorizontalAnchorValue = function () {
        for (
          var e = this._elements,
            t = e[0].getProperty("hacr") ? e[0].getProperty("hacr") : 0,
            n = 0;
          n < e.length;
          ++n
        )
          if (e[n].getProperty("hacr") !== t) {
            t = 0;
            break;
          }
        return t;
      }),
      (h.prototype._getVerticalAnchorValue = function () {
        for (
          var e = this._elements,
            t = e[0].getProperty("vacr") ? e[0].getProperty("vacr") : 0,
            n = 0;
          n < e.length;
          ++n
        )
          if (e[n].getProperty("vacr") !== t) {
            t = 0;
            break;
          }
        return t;
      }),
      (h.prototype._defineAnchorButtonState = function (e, t) {
        null !== e &&
          ($(this._panel)
            .find(".vacr-middle")
            .addClass(
              e === a.GElement.Anchor.AnchorType.Middle ? "g-active" : ""
            ),
          $(this._panel)
            .find(".vacr-start")
            .addClass(
              e === a.GElement.Anchor.AnchorType.Stretch ||
                e === a.GElement.Anchor.AnchorType.Start
                ? "g-active"
                : ""
            ),
          $(this._panel)
            .find(".vacr-end")
            .addClass(
              e === a.GElement.Anchor.AnchorType.Stretch ||
                e === a.GElement.Anchor.AnchorType.End
                ? "g-active"
                : ""
            ),
          $(this._panel)
            .find(".vacr-middle")
            .removeClass(
              e !== a.GElement.Anchor.AnchorType.Middle ? "g-active" : ""
            ),
          $(this._panel)
            .find(".vacr-start")
            .removeClass(
              e !== a.GElement.Anchor.AnchorType.Start &&
                e !== a.GElement.Anchor.AnchorType.Stretch
                ? "g-active"
                : ""
            ),
          $(this._panel)
            .find(".vacr-end")
            .removeClass(
              e !== a.GElement.Anchor.AnchorType.End &&
                e !== a.GElement.Anchor.AnchorType.Stretch
                ? "g-active"
                : ""
            )),
          null !== t &&
            ($(this._panel)
              .find(".hacr-middle")
              .addClass(
                t === a.GElement.Anchor.AnchorType.Middle ? "g-active" : ""
              ),
            $(this._panel)
              .find(".hacr-start")
              .addClass(
                t === a.GElement.Anchor.AnchorType.Stretch ||
                  t === a.GElement.Anchor.AnchorType.Start
                  ? "g-active"
                  : ""
              ),
            $(this._panel)
              .find(".hacr-end")
              .addClass(
                t === a.GElement.Anchor.AnchorType.Stretch ||
                  t === a.GElement.Anchor.AnchorType.End
                  ? "g-active"
                  : ""
              ),
            $(this._panel)
              .find(".hacr-middle")
              .removeClass(
                t !== a.GElement.Anchor.AnchorType.Middle ? "g-active" : ""
              ),
            $(this._panel)
              .find(".hacr-start")
              .removeClass(
                t !== a.GElement.Anchor.AnchorType.Start &&
                  t !== a.GElement.Anchor.AnchorType.Stretch
                  ? "g-active"
                  : ""
              ),
            $(this._panel)
              .find(".hacr-end")
              .removeClass(
                t !== a.GElement.Anchor.AnchorType.End &&
                  t !== a.GElement.Anchor.AnchorType.Stretch
                  ? "g-active"
                  : ""
              ));
      }),
      (h.prototype._defineAnchorProperty = function (e, t, n) {
        var o = t;
        return (
          t === n
            ? (o = 0)
            : t !== a.GElement.Anchor.AnchorType.Middle &&
              (n === a.GElement.Anchor.AnchorType.Stretch
                ? (o =
                    t === a.GElement.Anchor.AnchorType.End
                      ? a.GElement.Anchor.AnchorType.Start
                      : a.GElement.Anchor.AnchorType.End)
                : n === a.GElement.Anchor.AnchorType.Start
                ? (o =
                    t === a.GElement.Anchor.AnchorType.End
                      ? a.GElement.Anchor.AnchorType.Stretch
                      : 0)
                : n === a.GElement.Anchor.AnchorType.End &&
                  (o =
                    t === a.GElement.Anchor.AnchorType.Start
                      ? a.GElement.Anchor.AnchorType.Stretch
                      : 0)),
          this._assignAnchorProperty([e], [o]),
          o
        );
      }),
      (h.prototype._assignAnchorProperty = function (e, t) {
        if (this._document) {
          var n = this._document.getEditor();
          n.beginTransaction();
          try {
            for (var o = 0; o < this._elements.length; ++o) {
              var r = this._elements[o];
              if (r.getParent().hasMixin(a.GElement.Layout)) {
                var s = i.GElementEditor.getEditor(this._elements[o]);
                (s && s.applyPropertiesToParts(e, t)) ||
                  this._elements[o].setProperties(e, t);
              }
            }
          } finally {
            n.commitTransaction(
              a.GLocale.get(
                new a.GLocaleKey("GDimensionProperties", "action.change-anchor")
              )
            );
          }
        } else console.warn("GDimensionProperties: empty _document property");
      }),
      (h.prototype._getDelta = function () {
        return new a.GPoint(0, 0);
      }),
      (h.prototype.toString = function () {
        return "[Object GDimensionProperties]";
      }),
      (e.exports = h);
  }